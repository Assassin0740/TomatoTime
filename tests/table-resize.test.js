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

test('sw.js：版本升到 v2.3.6 且预缓存清单含 table-resize.js', () => {
    const sw = read('web/sw.js');
    assert.ok(sw.includes("const CACHE_VERSION = 'v2.3.6';"));
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
    assert.ok(src.includes("table <info|add|set|auto|view>"), '帮助文本缺少 table');
    assert.ok(src.includes('function rowSpecs'), '缺少行高参数解析');
    assert.ok(/table: \['action', 'id', 'value'\]/.test(src), '缺少 table 的位置参数映射');
});

// ---------- 新建表格（CR-038） ----------

test('buildTableHtml：表头 + 参差不齐的行会被补成矩形', () => {
    const r = TableResize.buildTableHtml({ head: ['渠道', '账号'], data: [['oppo', 'cat'], ['vivo']] });
    assert.strictEqual(r.rows, 3);
    assert.strictEqual(r.cols, 2);
    assert.ok(r.hasHeader);
    assert.ok(r.html.includes('<thead><tr><th>渠道</th><th>账号</th></tr></thead>'));
    assert.ok(r.html.includes('<td>vivo</td><td></td>'), '短行没有补空单元格');
});

test('buildTableHtml：结构和粘贴出来的表格一致（.pasted-table-wrap > table.pasted-table）', () => {
    const r = TableResize.buildTableHtml({ data: [['a', 'b']] });
    // 结构一致 = 已有的列宽 / 图片自适应 / 导出逻辑都不用另写一套
    assert.ok(/^<div class="pasted-table-wrap"><table class="pasted-table" data-rows="1" data-cols="2">/.test(r.html));
    assert.ok(!r.hasHeader, '没给 head 就不该有 thead');
});

test('buildTableHtml：只给行列数 → 空网格；单元格会被转义', () => {
    const grid = TableResize.buildTableHtml({ cols: 2, rows: 3 });
    assert.strictEqual(grid.rows, 3);
    assert.strictEqual((grid.html.match(/<tr>/g) || []).length, 3);
    const esc = TableResize.buildTableHtml({ data: [['a<b', 'c&d"e']] });
    assert.ok(esc.html.includes('a&lt;b'));
    assert.ok(esc.html.includes('c&amp;d&quot;e'));
    assert.ok(!esc.html.includes('<b>'));
});

test('buildTableHtml：列数取各行最大值；hasHeader:false 时不加表头', () => {
    const r = TableResize.buildTableHtml({ head: ['h'], data: [['a', 'b', 'c']], hasHeader: false });
    assert.strictEqual(r.cols, 3);
    assert.ok(!r.html.includes('<thead'));
    assert.strictEqual(r.rows, 1);
});

test('renderer 在 case \'table\' 里处理 insert（双副本一致）', () => {
    // 【2026-11-12 教训】api-server 把 /api/tasks/:id/table 统一映射成 op 'table'，
    // 一开始写成独立的 case 'table-insert' 永远走不到；而且插入场景本来就没有表，
    // 必须放在「没有表格就报错」那句之前。
    ['renderer.js', 'web/renderer.js'].forEach(f => {
        const src = read(f);
        assert.ok(src.includes("action === 'insert'"), f + ' 缺少 insert 分支');
        assert.ok(src.includes('TableResize.buildTableHtml'), f + ' 没有调用 buildTableHtml');
        const insertAt = src.indexOf("action === 'insert'");
        const noTableAt = src.indexOf('这条任务里没有表格');
        assert.ok(insertAt !== -1 && noTableAt !== -1 && insertAt < noTableAt,
            f + ' insert 分支必须在「没有表格」判断之前');
    });
});

test('CLI 有 table add 与 query / doctor 命令', () => {
    const src = read('timer-cli.js');
    assert.ok(src.includes("action: 'insert'"), 'CLI 没有支持插入表格');
    assert.ok(src.includes('function tableRows'), '缺少 --data 解析');
    assert.ok(/async query\(args\) \{/.test(src), '缺少 query 命令');
    assert.ok(/async doctor\(args\) \{/.test(src), '缺少 doctor 命令');
    assert.ok(src.includes("qs.set('hasTable'"), 'query 没有传 hasTable');
    assert.ok(src.includes('ELECTRON_RUN_AS_NODE'), 'doctor 没有检查那个坑人的环境变量');
});

test('api-server 的 GET /api/tasks 支持结构化过滤', () => {
    const src = read('api-server.js');
    ['project', 'priority', 'hasTable', 'dateField', 'offset'].forEach(k => {
        assert.ok(src.includes("q.get('" + k + "')") || src.includes("'" + k + "'"), '缺少过滤参数 ' + k);
    });
    assert.ok(src.includes('function parseBound'), '缺少日期边界解析');
    assert.ok(src.includes('total: total'), '返回里没有 total');
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

/**
 * 【2026-11-16】「宽度还是有问题」真凶：缩放的破坏性。
 *
 * 一张 12 列的表因为某列装了 16000px 宽的 Base64，整表 18250px。
 * fitTableToWidth 为了「塞进容器」，按比例一路扣到 MIN_COL=40 ——
 * 结果是 11 列 40px + 1 列 444px，2000 字的单元格竖成一列字。
 * 修法是给缩放加可读下限，宁可让表格比容器宽、交给外层横向滚动。
 */
test('自动缩放有可读下限，不再把列压到竖排', () => {
    const src = read('table-resize.js');
    assert.ok(/const MIN_READABLE = \d+/.test(src), '缺少 MIN_READABLE 常量');
    assert.ok(/Math\.max\(Math\.min\(w, floor\)/.test(src),
        'fitTableToWidth 的下限没有用「min(原宽, 可读宽度)」');
    // 下限按列数分档：少于 8 列用 MIN_COL，否则 5×110 会把窄容器顶出滚动条
    assert.ok(/current\.length >= 8 \? MIN_READABLE : MIN_COL/.test(src),
        '下限没有按列数分档');
    assert.ok(src.includes('MIN_READABLE: MIN_READABLE'), 'MIN_READABLE 没有导出（迁移要用）');
    // 老版本那句「无条件扣到 avail 以内」必须删掉，否则等于没修
    assert.ok(!/while \(sum > avail\) \{\s*const i = widths\.indexOf/.test(
        src.slice(0, src.indexOf('function fitTableToWidth') + 4000).replace(/\s+/g, ' ')
            .replace(/if \(sum > avail && sum - avail <= widths\.length\) \{ /, '')
    ) || src.includes('if (sum > avail && sum - avail <= widths.length)'),
        '仍然存在无条件把总和扣到容器宽的收尾逻辑');
});

test('被压坏的冻结表会被解冻并标记可读下限', () => {
    const src = read('table-resize.js');
    assert.ok(src.includes('function isSqueezedFrozen'), '缺少 isSqueezedFrozen');
    assert.ok(src.includes('function markReadableFloor'), '缺少 markReadableFloor');
    assert.ok(/if \(isSqueezedFrozen\(table\)\) \{[\s\S]{0,200}unfreezeTableLayout\(table\)/.test(src),
        'fitAllFrozenTables 没有对压坏的表解冻');
    // 判据必须只看「容器宽 ÷ 列数」，否则加标记→变宽→撤标记会抖
    assert.ok(src.includes('avail / cols < MIN_READABLE'), 'markReadableFloor 判据不是容器宽÷列数');
    assert.ok(src.includes("setAttribute('data-rsz-squeezed', '1')"), '没有打 squeezed 标记');
});

test('两版 CSS 都给 squeezed 表格可读下限，且不再用 max-width 钉死表格', () => {
    ['style.css', 'web/style.css'].forEach(f => {
        const css = read(f);
        assert.ok(css.includes('data-rsz-squeezed'), f + ' 缺少 data-rsz-squeezed 规则');
        // 先剥掉注释，否则「这里原来有 max-width:100%」这句说明会被当成规则本身
        const noComment = css.replace(/\/\*[\s\S]*?\*\//g, '');
        const start = noComment.indexOf('.pasted-table {');
        assert.ok(start !== -1, f + ' 找不到 .pasted-table 规则');
        const block = noComment.slice(start, noComment.indexOf('}', start) + 1);
        assert.ok(!/max-width:\s*100%/.test(block),
            f + ' 的 .pasted-table 仍有 max-width:100% —— 会把表格钉死在容器宽，12 列只能均分');
    });
});

test('renderer 有 v2 迁移：只解冻被压坏的表，不误伤健康冻结表', () => {
    ['renderer.js', 'web/renderer.js'].forEach(f => {
        const src = read(f);
        assert.ok(src.includes('pastedTableLayoutReset.v2'), f + ' 缺少 v2 迁移标志');
        assert.ok(src.includes('migrateSqueezedTables'), f + ' 缺少 migrateSqueezedTables');
        // 判据必须基于内联 width（离屏 DOM 量不到布局）
        assert.ok(/parseFloat\(cell\.style && cell\.style\.width\)/.test(src),
            f + ' v2 迁移没有用内联 width 判断');
        assert.ok(src.includes('narrow <= widths.length / 3'), f + ' v2 迁移阈值不是 1/3');
    });
});

test('Markdown 管道表会渲染成 .pasted-table（复用列宽拖拽与横向滚动）', () => {
    ['renderer.js', 'web/renderer.js'].forEach(f => {
        const src = read(f);
        assert.ok(src.includes('function mdTableHtml'), f + ' 缺少 mdTableHtml');
        assert.ok(src.includes('mdTableHtml(html)'), f + ' mdEnhanceHtml 没有调用 mdTableHtml');
        assert.ok(src.includes('pasted-table-wrap"><table class="pasted-table"'),
            f + ' Markdown 表格没有复用 .pasted-table 结构');
    });
});

/**
 * 【2026-11-16】CLI 明确设过的尺寸不能被自动修复吃掉。
 * `table set --cols 60,60,60,60` 是用户要的 4 列 60px，但如果自动解冻
 * 把它当「被压坏的表」处理，命令执行了却看不到效果 —— 最难查的那类 bug。
 */
test('命令行设置过的表格打 manual 标记，自动修复绕开它', () => {
    const src = read('table-resize.js');
    assert.ok(src.includes("setAttribute('data-rsz-manual', '1')"), 'freezeWithWidths 没有打 manual 标记');
    const fit = src.slice(src.indexOf('function fitTableToWidth'));
    assert.ok(fit.slice(0, 600).includes("getAttribute('data-rsz-manual')"),
        'fitTableToWidth 没有跳过 manual 表');
    const sq = src.slice(src.indexOf('function isSqueezedFrozen'));
    assert.ok(sq.slice(0, 500).includes("getAttribute('data-rsz-manual')"),
        'isSqueezedFrozen 没有跳过 manual 表');
    ['renderer.js', 'web/renderer.js'].forEach(f => {
        const r = read(f);
        const seg = r.slice(r.indexOf('migrateSqueezedTables'));
        assert.ok(seg.slice(0, 1200).includes("getAttribute('data-rsz-manual')"),
            f + ' 的 v2 迁移没有跳过 manual 表');
    });
});

/**
 * 【2026-11-16 第二次「宽度还是有问题」】表格视图里的长表会把整列撑到 3 万像素。
 *
 * 三个条件缺一不可，这里逐条钉死：
 *   ① white-space: normal —— .task-table 的 nowrap 会被继承进单元格，不换行；
 *   ② overflow-wrap: anywhere —— 只有它能压低 min-content（break-word 不能）；
 *   ③ .table-content .pasted-table { min-width: 0 } —— 否则
 *      「td 宽 ← 内容 min-content ← 表 min-width:100% ← td 宽」死锁，缩不回来。
 */
test('表格单元格必须可换行、长 token 可断、表格视图里不锁 min-width', () => {
    ['style.css', 'web/style.css'].forEach(f => {
        const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
        const start = css.indexOf('.pasted-table th,');
        assert.ok(start !== -1, f + ' 找不到 .pasted-table th/td 规则');
        const block = css.slice(start, css.indexOf('}', start) + 1);
        assert.ok(/white-space:\s*normal/.test(block),
            f + '：单元格没有 white-space:normal —— 会继承 .task-table 的 nowrap，内容不换行');
        assert.ok(/overflow-wrap:\s*anywhere/.test(block),
            f + '：缺少 overflow-wrap:anywhere —— word-break:break-word 压不低 min-content');
        assert.ok(/\.table-content \.pasted-table \{[^}]*min-width:\s*0/.test(css),
            f + '：缺少 .table-content .pasted-table{min-width:0} —— 会和 td 宽度互相锁死');
    });
});

/**
 * 【2026-11-16 第三轮】任务表格的列规则污染了嵌套的粘贴表格。
 *
 * `.task-table td:nth-child(8) { white-space: nowrap }` 没限定直接子代，
 * 于是匹配到 `.task-table` 里**任意深度**的第 8 个 td —— 包括粘贴表格的第 8 列。
 * 那一列被 nowrap 后不换行，内容把整表撑到 32273px，任务内容列跟着 32301px，
 * 整个表格视图横向滚 3 万像素。specificity (0,2,1) 还压过了 `.pasted-table td`。
 *
 * 这里钉死：所有针对任务表格单元格的属性规则必须写成
 * `.task-table > thead > tr > th` / `.task-table > tbody > tr > td`。
 */
test('任务表格的列规则必须限定直接子代，不得污染嵌套表格', () => {
    ['style.css', 'web/style.css'].forEach(f => {
        const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
        const loose = [...css.matchAll(/\.task-table\s+(?:th|td)(?::nth-child\(\d+\))?\s*[,{]/g)]
            .map(m => m[0]);
        assert.deepStrictEqual(loose, [],
            f + ' 里还有未限定直接子代的 .task-table th/td 规则：' + loose.join(' / ') +
            ' —— 会匹配嵌套的 .pasted-table 单元格');
        assert.ok(/\.task-table > tbody > tr > td:nth-child\(8\)/.test(css),
            f + ' 第 8 列规则没有改成直接子代形式');
    });
});
