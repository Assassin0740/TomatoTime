/**
 * CR-029「任务信息显示」防漂移检查。
 *
 * 这一功能横跨 HTML（表头 + 7 个开关）、CSS（6 组隐藏规则）、
 * renderer.js（行的 td class + 设置读写）、以及 web/ 的一整套副本。
 * 任何一处漏改都表现为「开关拨了没反应」或「列头还在但数据列没了」，
 * 而且只在特定视图下才看得出来。用静态一致性把这些约定钉死。
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const FIELDS = [
    { key: 'priority', cls: 'col-priority', toggle: 'colPriorityToggle' },
    { key: 'type', cls: 'col-type', toggle: 'colTypeToggle' },
    { key: 'project', cls: 'col-project', toggle: 'colProjectToggle' },
    { key: 'status', cls: 'col-status', toggle: 'colStatusToggle' },
    { key: 'created', cls: 'col-created', toggle: 'colCreatedToggle' },
    { key: 'doneTime', cls: 'col-done-time', toggle: 'colDoneTimeToggle' }
];

const html = read('计时器.html');
const webHtml = read('web/index.html');
const css = read('style.css');
const webCss = read('web/style.css');
const js = read('renderer.js');
const webJs = read('web/renderer.js');

test('表头与数据行的列 class 一一对应（含 web 副本）', () => {
    [['主版本', html, js], ['web 副本', webHtml, webJs]].forEach(([label, h, r]) => {
        FIELDS.forEach(f => {
            assert.ok(h.includes(`<th class="${f.cls}">`), `${label} 表头缺 ${f.cls}`);
            assert.ok(r.includes(`<td class="${f.cls}"`), `${label} 数据行缺 ${f.cls}`);
        });
        assert.ok(h.includes('<th>任务内容</th>'), `${label} 任务内容列必须常驻`);
        assert.ok(h.includes('<th>操作</th>'), `${label} 操作列必须常驻`);
    });
});

test('7 个开关在 HTML 与 renderer.js 两端都存在', () => {
    const toggles = ['pureTaskModeToggle', ...FIELDS.map(f => f.toggle)];
    [['主版本', html, js], ['web 副本', webHtml, webJs]].forEach(([label, h, r]) => {
        toggles.forEach(id => {
            assert.ok(h.includes(`id="${id}"`), `${label} HTML 缺开关 ${id}`);
            assert.ok(r.includes(`'${id}'`) || r.includes(`"${id}"`), `${label} renderer 缺开关 ${id}`);
        });
        assert.ok(h.includes('id="taskInfoFineTune"'), `${label} 缺细项容器`);
        assert.ok(h.includes('id="taskInfoHint"'), `${label} 缺说明文字`);
    });
});

test('CSS 每条隐藏规则同时覆盖「单项关闭」和「纯任务模式」', () => {
    [['主版本', css], ['web 副本', webCss]].forEach(([label, c]) => {
        FIELDS.forEach(f => {
            const hideCls = 'hide-' + f.key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
            assert.ok(c.includes(`.${f.cls}`), `${label} CSS 缺 ${f.cls} 选择器`);
            assert.ok(c.includes(`body:is(.${hideCls}, .pure-task-mode)`),
                `${label} ${hideCls} 规则必须带 pure-task-mode 分支`);
        });
        assert.ok(c.includes('body.hide-note-date .note-date'), `${label} 缺日期行整行隐藏`);
        assert.ok(c.includes('.task-info-locked'), `${label} 缺纯任务模式下细项置灰`);
    });
});

test('renderer 的配置读写与列数计算齐全，且 web 副本同源', () => {
    [['主版本', js], ['web 副本', webJs]].forEach(([label, r]) => {
        ['readTaskInfoSettings', 'saveTaskInfoSettings', 'visibleColumnCount',
         'applyTaskInfoSettings', 'initTaskInfoSettings'].forEach(fn => {
            assert.ok(r.includes('function ' + fn), `${label} 缺 ${fn}`);
        });
        assert.ok(r.includes('colspan="${visibleColumnCount()}"'), `${label} 空行 colspan 要跟着可见列数走`);
        assert.ok(r.includes("'pure-task-mode'"), `${label} 缺 pure-task-mode class 切换`);
    });
    // web/renderer.js 是主版本副本，功能代码必须完全一致
    assert.equal(webJs, js, 'web/renderer.js 必须与 renderer.js 同源');
    assert.equal(webCss, css, 'web/style.css 必须与 style.css 同源');
});

test('可见列数：全显示 8 列，纯任务模式 2 列', () => {
    // 与 renderer.js 的 visibleColumnCount 同构的纯计算，防止有人改了表头却忘了改这里
    const count = (pure, cols) => (pure ? 8 - FIELDS.length : 8 - FIELDS.filter(f => !cols[f.key]).length);
    assert.equal(count(false, Object.fromEntries(FIELDS.map(f => [f.key, true]))), 8);
    assert.equal(count(true, Object.fromEntries(FIELDS.map(f => [f.key, true]))), 2);
    assert.equal(count(false, Object.fromEntries(FIELDS.map(f => [f.key, f.key !== 'priority']))), 7);
});
