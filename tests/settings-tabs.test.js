/**
 * CR-030 设置标签栏横向滚动的防漂移检查。
 *
 * 这个 bug 的成因很隐蔽：容器本来就有 overflow-x:auto，但 CSS 里
 * `scrollbar-width:none` + `::-webkit-scrollbar{height:0}` 把滚动条藏了，
 * 于是「能滚但看不见也拖不动」。这条用例钉住两件事：滚动条必须可见、
 * 左右箭头 / 滚轮 / 激活项归位的代码必须两端都在。
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const html = read('计时器.html');
const webHtml = read('web/index.html');
const css = read('style.css');
const webCss = read('web/style.css');
const js = read('renderer.js');
const webJs = read('web/renderer.js');

test('标签栏包裹层与左右箭头在两端 HTML 都存在', () => {
    [['主版本', html], ['web 副本', webHtml]].forEach(([label, h]) => {
        assert.ok(h.includes('class="settings-tabs-wrap"'), `${label} 缺包裹层`);
        assert.ok(h.includes('id="settingsTabsPrev"'), `${label} 缺左箭头`);
        assert.ok(h.includes('id="settingsTabsNext"'), `${label} 缺右箭头`);
        assert.ok(h.includes('id="settingsTabs"'), `${label} 缺标签容器`);
        assert.equal((h.match(/class="settings-tab(?: active)?"/g) || []).length, 7,
            `${label} 应有 7 个分类标签`);
    });
});

test('CSS 不再隐藏横向滚动条，且 flex item 可收缩', () => {
    [['主版本', css], ['web 副本', webCss]].forEach(([label, c]) => {
        // 只检查 .settings-tabs 规则块，别被其它元素的 scrollbar-width 误伤
        const block = c.slice(c.indexOf('.settings-tabs {'), c.indexOf('.settings-tab {'));
        assert.ok(block.includes('overflow-x: auto'), `${label} 必须可横向滚动`);
        assert.ok(block.includes('min-width: 0'), `${label} 缺 min-width:0，flex item 不收缩就滚不动`);
        assert.ok(!block.includes('scrollbar-width: none'), `${label} 仍在隐藏滚动条`);
        assert.ok(block.includes('scrollbar-width: thin'), `${label} 应声明细滚动条`);
        // 只查 .settings-tabs 自己的滚动条块：body / 折叠面板另有 height:0 的规则，
        // 而且上面注释里也提到了这个字符串，用全文匹配会误报。
        const barBlock = c.slice(
            c.indexOf('.settings-tabs::-webkit-scrollbar {'),
            c.indexOf('.settings-tabs::-webkit-scrollbar-track {')
        );
        assert.ok(/height:\s*[1-9]/.test(barBlock), `${label} 仍把标签栏滚动条高度压成 0`);
        assert.ok(c.includes('.settings-tabs::-webkit-scrollbar-thumb'), `${label} 缺可见滑块`);
        assert.ok(c.includes('.settings-tabs-wrap.no-overflow'), `${label} 缺排得下时隐藏箭头`);
    });
});

test('renderer 的箭头 / 滚轮 / 归位逻辑齐全，web 副本同源', () => {
    [['主版本', js], ['web 副本', webJs]].forEach(([label, r]) => {
        ['settingsTabsMaxScroll', 'updateSettingsTabsArrows', 'scrollSettingsTabs',
         'scrollActiveSettingsTabIntoView'].forEach(fn => {
            assert.ok(r.includes('function ' + fn), `${label} 缺 ${fn}`);
        });
        assert.ok(r.includes("addEventListener('wheel'"), `${label} 缺垂直滚轮转横向`);
        assert.ok(r.includes("addEventListener('resize'"), `${label} 缺窗口尺寸变化后刷新箭头`);
        assert.ok(/scrollActiveSettingsTabIntoView\(\);\s*updateSettingsTabsArrows\(\);/.test(r),
            `${label} 切换分类后要把激活项滚进视野`);
    });
    assert.equal(webJs, js, 'web/renderer.js 必须与 renderer.js 同源');
    assert.equal(webCss, css, 'web/style.css 必须与 style.css 同源');
});
