/**
 * CR-031 图片标注非破坏化的防漂移检查。
 *
 * 旧行为：finishEditing() 把底图 + 涂鸦合成成一张 PNG，然后
 *     modalImg.src = finalDataUrl; triggerSourceImg.src = finalDataUrl;
 * 便签保存时原图引用被覆盖 —— 原件找不回来，标注也没法单独删。
 *
 * 新行为：底图 <img src> 全程不动，涂鸦单独导出成透明 PNG 落到 NoteImages/，
 * 便签里用 .note-img-stack 叠一层；复制 / 导出时才按需合成。
 * 这条用例钉住「不再有破坏性回写」和「两端副本同源」。
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

test('两端 HTML：大图标注层 / 删除标注 / 恢复原图入口都在', () => {
    [['主版本', html], ['web 副本', webHtml]].forEach(([label, h]) => {
        ['modalOverlayImg', 'wechatClearBtn', 'wechatRestoreBtn', 'restoreImageItem'].forEach(id => {
            assert.ok(h.includes('id="' + id + '"'), `${label} 缺 #${id}`);
        });
        assert.ok(h.includes('复制图片（含标注）'), `${label} 复制按钮应说明含标注`);
        assert.ok(h.includes('恢复原图（删除标注）'), `${label} 缺恢复原图文案`);
    });
});

test('CSS：叠加层铺满底图、排除 CR-026 尺寸归一化、编辑态不重影', () => {
    [['主版本', css], ['web 副本', webCss]].forEach(([label, c]) => {
        assert.ok(c.includes('.note-img-stack {'), `${label} 缺叠层容器`);
        assert.ok(c.includes('.note-img-stack > .note-annotation-layer'), `${label} 缺叠层规则`);
        assert.ok(c.includes('position: absolute !important'), `${label} 叠层必须绝对定位`);
        assert.ok(c.includes('#modalOverlayImg {'), `${label} 缺大图叠层`);
        assert.ok(c.includes('.wechat-img-viewport.is-editing #modalOverlayImg'),
            `${label} 编辑态必须藏掉叠层，否则和画布重影`);
        assert.equal((c.match(/:not\(\.note-annotation-layer\)/g) || []).length, 5,
            `${label} 5 处 CR-026 auto 尺寸规则都要排除叠层`);
    });
});

test('renderer：finishEditing 只产透明图层，绝不回写底图 src', () => {
    [['主版本', js], ['web 副本', webJs]].forEach(([label, r]) => {
        assert.ok(!r.includes('triggerSourceImg.src = finalDataUrl'),
            `${label} 仍在破坏性覆盖原图引用`);
        assert.ok(!r.includes('mergeCtx.drawImage(modalImg, 0, 0)'),
            `${label} 仍在合成底图`);
        assert.ok(!r.includes('modalImg.src = finalDataUrl'),
            `${label} 仍在把大图替换成合成图`);
        assert.ok(r.includes('layerCtx.drawImage(canvas, 0, 0, naturalW, naturalH)'),
            `${label} 应把涂鸦单独映射到原图分辨率`);
        assert.ok(r.includes("ipc.invoke('save-note-image', layerDataUrl)"),
            `${label} 图层应落盘到 NoteImages，不塞进 localStorage`);
        assert.ok(r.includes('标注已保存为独立图层'), `${label} 应有非破坏化保存提示`);
    });
});

test('renderer：分层数据模型与三处恢复入口齐全', () => {
    [['主版本', js], ['web 副本', webJs]].forEach(([label, r]) => {
        ['applyAnnotationStack', 'restoreOriginalImage', 'commitImageChange',
         'syncModalOverlay', 'compositeCurrentImage', 'loadExistingAnnotationIntoCanvas'
        ].forEach(fn => {
            assert.ok(r.includes('function ' + fn), `${label} 缺 ${fn}`);
        });
        assert.ok(r.includes("baseImg.setAttribute('data-annotation', overlayUrl)"),
            `${label} 底图应记录图层引用`);
        assert.ok(r.includes("stack.replaceWith(base)"), `${label} 恢复原件要拆掉叠层`);
        assert.ok(r.includes("getAttribute('data-annotation')) || ''"),
            `${label} 打开大图要带上已有标注`);
        assert.ok(r.includes("img.classList.contains('note-annotation-layer')"),
            `${label} 懒加载必须跳过标注层`);
        assert.ok(r.includes("child.classList.contains('note-img-stack')"),
            `${label} markdown 增强必须跳过叠层原子块`);
        assert.ok(r.includes('updateTableNote(noteId, editable)'),
            `${label} 改完图片要把内容写回 note.content`);
    });
});

test('web 副本同源、缓存版本已递增、测试清单已纳入', () => {
    assert.strictEqual(js, webJs, 'web/renderer.js 必须与 renderer.js 同源');
    assert.strictEqual(css, webCss, 'web/style.css 必须与 style.css 同源');
    assert.ok(read('web/sw.js').includes("const CACHE_VERSION = 'v2.2.7';"),
        '改了前端 JS/CSS 必须递增 CACHE_VERSION');
    assert.ok(read('package.json').includes('tests/annotation-layer.test.js'),
        'npm test 必须纳入本用例');
});
