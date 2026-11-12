/**
 * table-resize.test.js —— 表格自由调宽高（2026-11-10）
 *
 * 可单测的纯函数（hitTest / clampSize / sanitizeLayout）+ 两版 HTML /
 * SW / renderer.js 的同步钉子（web 版漏同步的教训见 web-dom.test.js）。
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const TableResize = require('../table-resize.js');

// ---------- 纯函数 ----------

test('hitTest：右边框热区内命中 col', () => {
    const rect = { right: 200, bottom: 100 };
    assert.strictEqual(TableResize.hitTest(rect, 196, 50), 'col');
    assert.strictEqual(TableResize.hitTest(rect, 194, 50), 'col');  // 内侧 7px
    assert.strictEqual(TableResize.hitTest(rect, 203, 50), 'col');  // 外侧 3px
});

test('hitTest：下边框热区内命中 row', () => {
    const rect = { right: 200, bottom: 100 };
    assert.strictEqual(TableResize.hitTest(rect, 100, 96), 'row');
    assert.strictEqual(TableResize.hitTest(rect, 100, 94), 'row');
    assert.strictEqual(TableResize.hitTest(rect, 100, 103), 'row');
});

test('hitTest：远离边缘返回 null；右下角 col 优先', () => {
    const rect = { right: 200, bottom: 100 };
    assert.strictEqual(TableResize.hitTest(rect, 100, 50), null);
    assert.strictEqual(TableResize.hitTest(rect, 180, 50), null);   // 距右边 20px
    assert.strictEqual(TableResize.hitTest(rect, 196, 96), 'col');  // 角落：列优先
});

test('hitTest：空 rect 返回 null', () => {
    assert.strictEqual(TableResize.hitTest(null, 10, 10), null);
});

test('clampSize：取整并压到下限', () => {
    assert.strictEqual(TableResize.clampSize(120.7, 40), 121);
    assert.strictEqual(TableResize.clampSize(3, 40), 40);
    assert.strictEqual(TableResize.clampSize(NaN, 40), 40);
});

test('sanitizeLayout：丢弃非法键值', () => {
    const out = TableResize.sanitizeLayout({
        colWidths: { '0': 150, 'x': 99, '2': 5, '-1': 200, '1': NaN },
        rowHeights: { '42': 80, 'bad': 30, '43': 0 }
    });
    assert.deepStrictEqual(out.colWidths, { '0': 150 });
    assert.deepStrictEqual(out.rowHeights, { '42': 80 });
});

test('sanitizeLayout：垃圾输入返回空结构', () => {
    assert.deepStrictEqual(TableResize.sanitizeLayout(null), { colWidths: {}, rowHeights: {} });
    assert.deepStrictEqual(TableResize.sanitizeLayout('x'), { colWidths: {}, rowHeights: {} });
});

// ---------- 同步钉子 ----------

test('两版 HTML 都引入了 table-resize.js（且紧跟 clipboard-table.js）', () => {
    ['计时器.html', 'web/index.html'].forEach(f => {
        const html = read(f);
        assert.ok(
            html.includes('<script src="clipboard-table.js"></script>') &&
            /clipboard-table\.js"><\/script>\s*<script src="table-resize\.js"><\/script>/.test(html),
            f + ' 缺少 table-resize.js 引入'
        );
    });
});

test('web/table-resize.js 与主版本完全一致', () => {
    assert.strictEqual(read('table-resize.js'), read('web/table-resize.js'));
});

test('sw.js：版本升到 v2.3.3 且预缓存清单含 table-resize.js', () => {
    const sw = read('web/sw.js');
    assert.ok(sw.includes("const CACHE_VERSION = 'v2.3.3';"));
    assert.ok(sw.includes("'./table-resize.js'"));
});

test('两版 renderer.js 的 renderTable 都回放表格布局', () => {
    ['renderer.js', 'web/renderer.js'].forEach(f => {
        const src = read(f);
        assert.ok(
            src.includes('TableResize.applyTaskTableLayout(document.querySelector(\'table.task-table\'))'),
            f + ' 缺少 applyTaskTableLayout 回放调用'
        );
    });
});

/**
 * 【2026-11-11】内容表「左右拉不动」钉子：
 * auto 布局 + .pasted-table{min-width:100%} 下，给某列写 width 只是偏好，浏览器
 * 重新分配后视觉纹丝不动（实测内联 164px、渲染仍 44px）。拖列前必须冻结几何。
 */
test('内容表拖列前冻结几何（table-layout:fixed）', () => {
    const src = read('table-resize.js');
    assert.ok(src.includes('function freezeTableLayout'), '缺少 freezeTableLayout');
    assert.ok(/if \(!isTaskTable\(table\)\) freezeTableLayout\(table\);/.test(src),
        '拖列起点没有对内容表调用 freezeTableLayout');
    assert.ok(src.includes("table.style.tableLayout = 'fixed'"));
    assert.ok(src.includes("table.style.width = total + 'px'"));
    assert.ok(src.includes('data-rsz-frozen'), '缺少冻结标记');
    // 冻结后表宽必须跟着列宽同步增减，否则 fixed 布局会按比例缩放
    assert.ok(/data-rsz-frozen'\)\) \{[\s\S]{0,200}table\.style\.width/.test(src),
        '拖列时表宽没有随列宽同步更新');
});

/**
 * 【2026-11-12】溢出钉子：拖过的表格记住绝对像素宽度，窗口变窄/拖太宽会顶出右边界
 * （max-width 对 table 不生效，实测 2400px 的表直接伸出屏幕 1395px）。必须有 JS 兜底贴合。
 */
test('冻结表格宽度会夹回容器（fitTableToWidth）', () => {
    const src = read('table-resize.js');
    assert.ok(src.includes('function fitTableToWidth'), '缺少 fitTableToWidth');
    assert.ok(src.includes('function fitAllFrozenTables'), '缺少 fitAllFrozenTables');
    assert.ok(/if \(!isTaskTable\(table\)\) freezeTableLayout\(table\);/.test(src));
    // 拖拽结束要贴合
    assert.ok(/else if \(drag\.kind === 'col'\) \{[\s\S]{0,120}fitTableToWidth/.test(src),
        '拖拽结束后没有贴合容器');
    // 窗口缩放 + 新内容渲染要贴合
    assert.ok(src.includes("addEventListener('resize', scheduleFit)"), '窗口缩放没有触发贴合');
    assert.ok(src.includes('new MutationObserver(scheduleFit)'), '新渲染的内容没有兜底贴合');
});

/**
 * 【2026-11-12】历史表格一次性修复钉子：老数据里被冻结成绝对像素的表格，
 * 启动时要解冻回自适应布局（否则用户升级后旧表还是超出右边界看不见）。
 */
test('两版 renderer 都有历史表格解冻迁移（只跑一次）', () => {
    ['renderer.js', 'web/renderer.js'].forEach(f => {
        const src = read(f);
        assert.ok(src.includes('migratePastedTableLayouts'), f + ' 缺少历史表格迁移');
        assert.ok(src.includes("'pastedTableLayoutReset.v1'"), f + ' 缺少一次性标志位');
        assert.ok(src.includes("querySelectorAll('table.pasted-table[data-rsz-frozen]')"),
            f + ' 迁移没有挑选冻结表格');
        assert.ok(src.includes('walk(notes)') && src.includes('walk(archivedNotes)'),
            f + ' 迁移没有覆盖 notes / archivedNotes');
    });
});

/**
 * 【2026-11-12】界面宽度溢出钉子（CR-036）：
 * 用户把「整体界面宽度」设成 1700px 而窗口只有 ~1090px，容器按 1700 铺开，
 * 右侧跑出窗口且无横向滚动 → 内容连表格一起被切掉看不见。
 * 修复：maxWidth = min(设置值, 100%)，窗口缩放时重算。
 */
test('界面宽度被夹在窗口内（min(设置值, 100%)）', () => {
    ['renderer.js', 'web/renderer.js'].forEach(f => {
        const src = read(f);
        assert.ok(src.includes('applyContainerWidth'), f + ' 缺少 applyContainerWidth');
        assert.ok(src.includes("maxWidth = 'min(' + w + 'px, 100%)'"), f + ' 宽度没有夹在 100% 内');
        assert.ok(src.includes("addEventListener('resize', () => applyContainerWidth"),
            f + ' 窗口缩放没有重算宽度');
    });
});

/**
 * 【2026-11-12】命令行 / API 操控表格尺寸（CR-037）的纯函数。
 * 拖拽只能人手动调，AI 与脚本要能说「把这张表压到 900px」「第三列 240」。
 */
test('parseSize：px / 百分比 / 非法', () => {
    assert.deepStrictEqual(TableResize.parseSize('900'), { kind: 'px', value: 900 });
    assert.deepStrictEqual(TableResize.parseSize('900px'), { kind: 'px', value: 900 });
    assert.deepStrictEqual(TableResize.parseSize('80%'), { kind: 'pct', value: 80 });
    assert.deepStrictEqual(TableResize.parseSize('150%'), { kind: 'pct', value: 100 }); // 压到 100%
    assert.strictEqual(TableResize.parseSize('abc'), null);
    assert.strictEqual(TableResize.parseSize(''), null);
    assert.strictEqual(TableResize.parseSize(undefined), null);
});

test('parseColSpec：* 表示自动，低于下限整条作废', () => {
    assert.deepStrictEqual(TableResize.parseColSpec('120,240,*'), [120, 240, null]);
    assert.deepStrictEqual(TableResize.parseColSpec(['120', 'auto', '240px']), [120, null, 240]);
    assert.strictEqual(TableResize.parseColSpec('10,20'), null);  // 都低于 MIN_COL
    assert.strictEqual(TableResize.parseColSpec(null), null);
});

test('planColWidths：差额摊给自动列，总和精确等于目标宽度', () => {
    const p = TableResize.planColWidths([120, null, 240], [100, null, null], 900);
    assert.deepStrictEqual(p.widths, [120, 540, 240]);
    assert.strictEqual(p.total, 900);
});

test('planColWidths：全部列都指定时以指定值为准', () => {
    const p = TableResize.planColWidths([80, 80], [null, null], 900);
    assert.deepStrictEqual(p.widths, [80, 80]);
    assert.strictEqual(p.total, 160);
});

test('planColWidths：目标比下限还小时不越界', () => {
    const p = TableResize.planColWidths([120, null], [null, null], 60);
    assert.strictEqual(p.widths[1], TableResize.MIN_COL);
    assert.strictEqual(p.total, 120 + TableResize.MIN_COL);
});

test('parsePx：读内联宽度', () => {
    assert.strictEqual(TableResize.parsePx('240px'), 240);
    assert.strictEqual(TableResize.parsePx('240'), 240);
    assert.strictEqual(TableResize.parsePx(''), null);
});

test('describeTable / applyTableOps / freezeWithWidths 已导出（离屏文档要用）', () => {
    ['describeTable', 'applyTableOps', 'freezeWithWidths', 'parseSize', 'parseColSpec',
        'planColWidths', 'loadTaskLayout', 'saveTaskLayout'].forEach(fn => {
            assert.strictEqual(typeof TableResize[fn], 'function', '缺少导出：' + fn);
        });
});

// ---------- 同步钉子 ----------

test('renderer 暴露 table / table-view 两个 API 操作（双副本一致）', () => {
    ['renderer.js', 'web/renderer.js'].forEach(f => {
        const src = read(f);
        assert.ok(/case 'table': \{/.test(src), f + ' 缺少 table 操作');
        assert.ok(/case 'table-view': \{/.test(src), f + ' 缺少 table-view 操作');
        assert.ok(src.includes('TableResize.applyTableOps'), f + ' 没有调用 applyTableOps');
        assert.ok(src.includes('createHTMLDocument'), f + ' 没有用离屏文档解析内容');
    });
});

test('api-server 暴露 /api/tasks/:id/table 与 /api/table-view', () => {
    const src = read('api-server.js');
    assert.ok(src.includes('(comments|table)'), '任务子路径没有 table');
    assert.ok(src.includes("'GET /api/table-view'") && src.includes("'POST /api/table-view'"),
        '缺少 table-view 路由');
    assert.ok(src.includes('调整表格尺寸'), '缺少表格尺寸的处理分支');
});

test('CLI 有 table 子命令与帮助文本', () => {
    const src = read('timer-cli.js');
    assert.ok(/async table\(args\) \{/.test(src), '缺少 table 命令');
    assert.ok(src.includes("'/api/tasks/' + id + '/table'"), 'CLI 没有调用表格接口');
    assert.ok(src.includes("table <info|set|auto|view>"), '帮助文本缺少 table');
    assert.ok(src.includes('function rowSpecs'), '缺少行高参数解析');
    assert.ok(/table: \['action', 'id', 'value'\]/.test(src), '缺少 table 的位置参数映射');
});

test('两版 CSS 都有拖拽期防选中规则', () => {
    ['style.css', 'web/style.css'].forEach(f => {
        assert.ok(read(f).includes('body.table-resizing'), f + ' 缺少 table-resizing 规则');
    });
});

/**
 * 【2026-11-10 部署事故钉子】table-resize.js 忘加 electron-builder files 白名单，
 * asar 里没有这个文件 → 应用内 404 → 拖拽完全不生效（本地源码和 web 版都正常，
 * 只有装好的应用坏，和 web-dom 漏同步是同一类「本地永远踩不到」的坑）。
 * 这里钉死：计时器.html 引用的每个本地脚本都必须在打包白名单里。
 */
test('计时器.html 引用的本地脚本全部在 electron-builder files 白名单里', () => {
    const pkg = JSON.parse(read('package.json'));
    const whitelist = JSON.stringify(pkg.build.files);
    const html = read('计时器.html');
    const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
        .map(m => m[1])
        .filter(src => !/^https?:/.test(src));
    assert.ok(srcs.length > 0, '计时器.html 里没找到本地脚本引用');
    srcs.forEach(src => {
        assert.ok(whitelist.includes('"' + src + '"'),
            '计时器.html 引用了 ' + src + '，但 package.json build.files 白名单里没有它 —— asar 打包会 404');
    });
});
