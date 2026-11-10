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

test('sw.js：版本升到 v2.2.6 且预缓存清单含 table-resize.js', () => {
    const sw = read('web/sw.js');
    assert.ok(sw.includes("const CACHE_VERSION = 'v2.2.6';"));
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

test('两版 CSS 都有拖拽期防选中规则', () => {
    ['style.css', 'web/style.css'].forEach(f => {
        assert.ok(read(f).includes('body.table-resizing'), f + ' 缺少 table-resizing 规则');
    });
});
