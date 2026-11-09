/**
 * web 版 DOM 同步防漂移——起因：CR-028 给主版本右键菜单加了
 * 「归入项目…」(setProjectItem)，web/index.html 漏同步，renderer.js
 * 对它无保护地 .onclick 赋值，整个初始化链在 web 版上直接抛
 * TypeError 断掉（PoC 用 WebView2 加载 web 版时暴露）。
 *
 * 这类错误的可怕之处：本地 Electron 版永远踩不到（元素都在），
 * 只有浏览器/WebView2 打开 web 版才炸。所以必须静态钉死。
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const renderer = read('renderer.js');
const mainHtml = read('计时器.html');
const webHtml = read('web/index.html');

/** renderer.js 里所有「无空值保护」的 DOM 挂载点 */
function unguardedTargets(src) {
    const ids = new Set();
    for (const m of src.matchAll(/getElementById\('([^']+)'\)\.(onclick|addEventListener|value|checked)/g)) {
        ids.add(m[1]);
    }
    return [...ids].sort();
}

test('renderer.js 无保护挂载的元素必须同时存在于主版本与 web 版 HTML', () => {
    const targets = unguardedTargets(renderer);
    assert.ok(targets.length >= 25, `应至少扫到 25 个挂载点，实际 ${targets.length}——正则失配说明 renderer.js 写法变了，请同步本测试`);

    const missMain = targets.filter(id => !mainHtml.includes(`id="${id}"`));
    const missWeb = targets.filter(id => !webHtml.includes(`id="${id}"`));
    assert.deepStrictEqual(missMain, [], `计时器.html 缺失挂载点: ${missMain.join(', ')}`);
    assert.deepStrictEqual(missWeb, [], `web/index.html 缺失挂载点（web 版会 TypeError 断初始化）: ${missWeb.join(', ')}`);
});

test('有挂载点的前提：renderer.js 与 web 副本必须同源', () => {
    assert.strictEqual(renderer, read('web/renderer.js'), 'web/renderer.js 必须与 renderer.js 同源');
    assert.strictEqual(read('style.css'), read('web/style.css'), 'web/style.css 必须与 style.css 同源');
});
