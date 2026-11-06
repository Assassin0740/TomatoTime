'use strict';

/**
 * clipboard-table.test.js —— 剪贴板表格解析（2026-11-05）
 *
 * 覆盖：腾讯文档 / Excel 复制出来的 HTML（CF_HTML 注释、内联样式、span、&nbsp;、br）、
 * 合并单元格、只有 TSV 的剪贴板、HTML 优先、XSS 转义、普通文本误判防护。
 * 运行：node --test tests/clipboard-table.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const CT = require('../clipboard-table.js');

/** 典型腾讯文档 / 在线表格复制出来的 text/html */
const TENCENT_HTML = `<html><head><meta charset="utf-8"><style>td{mso-number-format:"\\@"}</style></head>
<body><!--StartFragment--><table border="1" style="border-collapse:collapse"><tbody>
<tr><th style="font-weight:bold">任务</th><th>负责人</th><th>状态</th></tr>
<tr><td><span style="color:#333">接入 API&nbsp;网关</span></td><td>廖中钰</td><td>进行中<br>预计周五</td></tr>
<tr><td>写文档</td><td>张三</td><td>完成</td></tr>
</tbody></table><!--EndFragment--></body></html>`;

test('腾讯文档 HTML：解析出 3 行 × 3 列，保留换行与实体', () => {
    const data = CT.extract(TENCENT_HTML, '');
    assert.ok(data, '应当识别出表格');
    assert.equal(data.source, 'html');
    assert.equal(data.rowCount, 3);
    assert.equal(data.cols, 3);
    assert.equal(data.hasHeader, true);
    assert.deepEqual(data.rows, [
        ['任务', '负责人', '状态'],
        ['接入 API 网关', '廖中钰', '进行中\n预计周五'],
        ['写文档', '张三', '完成']
    ]);
});

test('腾讯文档 HTML：text/plain 为空也照样能取到全部单元格文字', () => {
    const data = CT.extract(TENCENT_HTML, '');
    const plain = data.rows.map(r => r.join('\t')).join('\n');
    assert.match(plain, /接入 API 网关/);
    assert.match(plain, /预计周五/);
    assert.equal(data.rows.flat().filter(Boolean).length, 9, '9 个单元格一个都不能丢');
});

test('只有 TSV 的剪贴板：解析出表格，支持引号内换行与 "" 转义', () => {
    const tsv = '姓名\t备注\t进度\n"张三"\t"第一行\n第二行"\t80%\n李四\t"他说""好的"""\t50%\n';
    const data = CT.extract('', tsv);
    assert.ok(data, 'TSV 应当被识别成表格');
    assert.equal(data.source, 'tsv');
    assert.equal(data.cols, 3);
    assert.deepEqual(data.rows, [
        ['姓名', '备注', '进度'],
        ['张三', '第一行\n第二行', '80%'],
        ['李四', '他说"好的"', '50%']
    ]);
});

test('HTML 与 TSV 同时存在时以 HTML 为准（信息最全）', () => {
    const data = CT.extract(TENCENT_HTML, 'A\tB\nC\tD\n');
    assert.equal(data.source, 'html');
    assert.deepEqual(data.rows[0], ['任务', '负责人', '状态']);
});

test('colspan / rowspan 展开：合并单元格的值填满覆盖的格子', () => {
    const html = '<table><tr><th colspan="2">合计</th><th>备注</th></tr>' +
        '<tr><td rowspan="2">A组</td><td>任务1</td><td>ok</td></tr>' +
        '<tr><td>任务2</td><td>ok</td></tr></table>';
    const data = CT.extract(html, '');
    assert.deepEqual(data.rows, [
        ['合计', '合计', '备注'],
        ['A组', '任务1', 'ok'],
        ['A组', '任务2', 'ok']
    ]);
});

test('生成表格 HTML：thead/tbody 结构、行列标记、换行转 <br>', () => {
    const data = CT.extract(TENCENT_HTML, '');
    const out = CT.rowsToTableHtml(data);
    assert.match(out, /<div class="pasted-table-wrap">/);
    assert.match(out, /<table class="pasted-table" data-rows="3" data-cols="3">/);
    assert.match(out, /<thead><tr><th>任务<\/th><th>负责人<\/th><th>状态<\/th><\/tr><\/thead>/);
    assert.equal((out.match(/<tbody>/g) || []).length, 1);
    assert.equal((out.match(/<td>/g) || []).length, 6, '2 行 × 3 列共 6 个 td');
    assert.match(out, /进行中<br>预计周五/);
});

test('无 th 的纯数据表：不强行把第一行当表头', () => {
    const data = CT.extract('<table><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>', '');
    assert.equal(data.hasHeader, false);
    const out = CT.rowsToTableHtml(data);
    assert.doesNotMatch(out, /<thead>/);
    assert.equal((out.match(/<td>/g) || []).length, 4);
});

test('XSS：剪贴板里的 script / 事件属性不会进入应用', () => {
    const evil = '<table><tr><td><script>alert(1)</script><img src=x onerror="alert(2)"></td><td><b>ok</b></td></tr>' +
        '<tr><td>2</td><td>3</td></tr></table>';
    const out = CT.rowsToTableHtml(CT.extract(evil, ''));
    assert.doesNotMatch(out, /<script/i);
    assert.doesNotMatch(out, /onerror=/i, '事件属性必须剥掉（图片本身要保留）');
    assert.doesNotMatch(out, /alert\(/);
    assert.match(out, /<td>ok<\/td>/);
    // 【2026-11-06】单元格图片改成保留，但只留 src，且必须转义
    assert.match(out, /<img class="pasted-cell-img" src="x" alt="">/);
});

test('XSS：单元格里的尖括号与 & 被转义', () => {
    const data = CT.extract('<table><tr><td>a &lt;b&gt; &amp; c</td><td>x</td></tr><tr><td>y</td><td>z</td></tr></table>', '');
    const out = CT.rowsToTableHtml(data);
    assert.match(out, /a &lt;b&gt; &amp; c/, '原文本实体解码后应重新转义成同样字符');
    assert.doesNotMatch(out, /<b>/);
});

test('误判防护：普通文字 / 单行 TSV / 单列布局 table 都不当表格', () => {
    assert.equal(CT.extract('', '第一行文字\n第二行文字\n第三行'), null);
    assert.equal(CT.extract('', '只有一行\ta\tb'), null, '只有一行带 tab 不算表格');
    assert.equal(CT.extract('', 'a\tb'), null);
    assert.equal(CT.extract('<table><tr><td>菜单</td></tr><tr><td>设置</td></tr></table>', ''), null,
        '网页布局用的单列 table 不当成数据表');
    assert.equal(CT.extract('<table><tr><td></td><td></td></tr></table>', ''), null,
        '空壳表格不当成数据表');
});

test('空输入与实体解码', () => {
    assert.equal(CT.extract('', ''), null);
    assert.equal(CT.extract(null, undefined), null);
    assert.equal(CT.decodeEntities('A&#160;B&#xA0;C&amp;D'), 'A B C&D');
    assert.equal(CT.rowsToTableHtml(null), '');
});

test('单列多行但带 TSV 的剪贴板仍能按 TSV 还原', () => {
    const data = CT.extract('<table><tr><td>布局</td></tr></table>', '列A\t列B\n1\t2\n3\t4\n');
    assert.equal(data.source, 'tsv', 'HTML 不是数据表时应回退到 TSV');
    assert.equal(data.rowCount, 3);
    assert.deepEqual(data.rows[2], ['3', '4']);
});

/* ==================== 单元格图片（2026-11-06） ==================== */

test('单元格图片：整格是图的表头不再变成空格子', () => {
    const html = '<table>' +
        '<tr><th><img src="https://cdn.example.com/logo.png"></th>' +
        '<th><img src="https://cdn.example.com/cat1.png"></th>' +
        '<th>UI/角色动画</th></tr>' +
        '<tr><td>大金库</td><td>入场动画</td><td>已更新</td></tr>' +
        '</table>';
    const data = CT.extract(html, '');
    assert.ok(data, '只有图片的表也应该被识别');
    const head = data.rows[0][0];
    assert.equal(typeof head, 'object', '有图片的单元格是对象');
    assert.deepEqual(head.imgs, ['https://cdn.example.com/logo.png']);
    assert.equal(head.text, '');

    const out = CT.rowsToTableHtml(data);
    assert.match(out, /<img class="pasted-cell-img" src="https:\/\/cdn\.example\.com\/logo\.png" alt="">/);
    assert.match(out, /<img class="pasted-cell-img" src="https:\/\/cdn\.example\.com\/cat1\.png" alt="">/);
    assert.match(out, /<th>UI\/角色动画<\/th>/, '纯文字格子仍是普通文本');
});

test('单元格图片：data-src 优先于 src（懒加载站点）', () => {
    const html = '<table><tr><td><img src="data:image/gif;base64,R0lGOD" data-src="https://real.example.com/a.png"></td></tr>' +
        '<tr><td>x</td><td>y</td></tr></table>';
    const data = CT.extract(html, '');
    assert.deepEqual(data.rows[0][0].imgs, ['https://real.example.com/a.png']);
});

test('单元格图文混排：按原文顺序输出文字和图片', () => {
    const html = '<table><tr><td>文字A<img src="https://e.com/1.png">文字B</td><td>右</td></tr>' +
        '<tr><td>下面</td><td>右2</td></tr></table>';
    const cell = CT.extract(html, '').rows[0][0];
    assert.deepEqual(cell.parts.map(p => p.t), ['text', 'img', 'text']);
    assert.equal(cell.parts[0].v, '文字A');
    assert.equal(cell.parts[2].v, '文字B');
    const out = CT.rowsToTableHtml(CT.extract(html, ''));
    assert.match(out, /文字A<br><img class="pasted-cell-img" src="https:\/\/e\.com\/1\.png" alt=""><br>文字B/);
});

test('单元格图片：多张图与属性里的引号都被安全处理', () => {
    const html = '<table><tr><td><img alt="a" src="https://e.com/x.png"><img src="https://e.com/y.png"></td><td>c</td></tr>' +
        '<tr><td>d</td><td>e</td></tr></table>';
    const cell = CT.extract(html, '').rows[0][0];
    assert.deepEqual(cell.imgs, ['https://e.com/x.png', 'https://e.com/y.png']);
    assert.equal((CT.rowsToTableHtml(CT.extract(html, '')).match(/pasted-cell-img/g) || []).length, 2);
});

test('单元格图片：合并单元格里的图片会跟着铺满（不丢不叠）', () => {
    const html = '<table><tr><td rowspan="2"><img src="https://e.com/m.png"></td><td>b</td></tr>' +
        '<tr><td>c</td></tr></table>';
    const data = CT.extract(html, '');
    assert.deepEqual(data.rows[0][0].imgs, ['https://e.com/m.png']);
    assert.deepEqual(data.rows[1][0].imgs, ['https://e.com/m.png']);
});

test('cellParts：纯文字单元格不会产出图片片段', () => {
    assert.deepEqual(CT.cellParts('普通文字'), [{ t: 'text', v: '普通文字' }]);
    assert.deepEqual(CT.cellParts(''), []);
    assert.deepEqual(CT.cellParts(null), []);
});
