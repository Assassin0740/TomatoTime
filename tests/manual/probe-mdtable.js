// 从 renderer.js 抽出真实的 mdTableHtml 做隔离验证（不复制实现，避免与源码漂移）
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'renderer.js'), 'utf8');
const start = src.indexOf('function mdTableHtml(text) {');
if (start < 0) { console.error('未找到 mdTableHtml'); process.exit(1); }

// 大括号配平截取函数体
let i = src.indexOf('{', start), depth = 0, end = -1;
for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const fnSrc = src.slice(start, end);

// stub 依赖：只保留最简语义，验证结构而不验证行内样式
const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mdInline = s => String(s).replace(/\*\*(.+?)\*\*/g, '<span class="md-b">$1</span>');

const mdTableHtml = new Function('escapeHtml', 'mdInline', fnSrc + '\nreturn mdTableHtml;')(escapeHtml, mdInline);

let pass = 0, fail = 0;
function check(name, cond, detail) {
    if (cond) { pass++; console.log('  OK   ' + name); }
    else { fail++; console.log('  FAIL ' + name + (detail ? '\n       ' + detail : '')); }
}

console.log('--- 1. 标准表头表格（<br> 分隔）---');
let r = mdTableHtml('| 渠道 | 卡点 |<br>|---|---|<br>| 荣耀 | appId |<br>| vivo | secret |');
console.log(r);
check('生成 pasted-table-wrap', r.includes('class="pasted-table-wrap"'));
check('有 thead', r.includes('<thead><tr><th>渠道</th><th>卡点</th></tr></thead>'));
check('两行 tbody', (r.match(/<tr><td>/g) || []).length === 2);
check('无残留竖线', !r.includes('|'));

console.log('\n--- 2. 真实换行分隔 ---');
r = mdTableHtml('| a | b |\n| 1 | 2 |\n| 3 | 4 |');
console.log(r);
check('三行无表头', (r.match(/<tr><td>/g) || []).length === 3 && !r.includes('<th>'));

console.log('\n--- 3. 单行不转表 ---');
const single = '| a | b |';
r = mdTableHtml(single);
check('原样返回', r === single, r);

console.log('\n--- 4. 正文里的零散竖线不动 ---');
const prose = '条件是 a | b，另一个 c|d 也不该动';
r = mdTableHtml(prose);
check('原样返回', r === prose, r);

console.log('\n--- 5. 粗体在单元格里被渲染 ---');
r = mdTableHtml('| 名称 | 状态 |<br>|---|---|<br>| **荣耀** | 待发 |');
check('粗体转 span', r.includes('<span class="md-b">荣耀</span>'), r);

console.log('\n--- 6. 与前后文本共存 ---');
r = mdTableHtml('前面一行<br>| a | b |<br>|---|---|<br>| 1 | 2 |<br>后面一行');
console.log(r);
check('保留前文', r.startsWith('前面一行'));
check('保留后文', r.endsWith('后面一行'));
check('表格在中间', r.includes('pasted-table-wrap'));

console.log('\n--- 7. 无竖线快速返回 ---');
const plain = '普通文本没有表格';
check('返回自身', mdTableHtml(plain) === plain);

console.log('\n=== ' + pass + ' 通过 / ' + fail + ' 失败 ===');
process.exit(fail ? 1 : 0);
