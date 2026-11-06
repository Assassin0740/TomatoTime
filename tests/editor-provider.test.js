const test = require('node:test');
const assert = require('node:assert');
const EP = require('../editor-provider.js');

/* ==================== 扩展名提取 ==================== */

test('extOf：普通路径 / Windows 反斜杠 / file:// URL', () => {
    assert.equal(EP.extOf('C:\\Users\\a\\图.PNG'), 'png');
    assert.equal(EP.extOf('/home/a/report.PDF'), 'pdf');
    assert.equal(EP.extOf('file:///C:/NoteFiles/f_abc123.docx'), 'docx');
});

test('extOf：带 query / hash 的地址不会把参数当扩展名', () => {
    assert.equal(EP.extOf('https://e.com/a.png?v=2'), 'png');
    assert.equal(EP.extOf('https://e.com/a.png#frag'), 'png');
});

test('extOf：没有扩展名、以点结尾、隐藏文件都返回空串', () => {
    assert.equal(EP.extOf('README'), '');
    assert.equal(EP.extOf('file.'), '');
    assert.equal(EP.extOf('.gitignore'), '');
    assert.equal(EP.extOf(''), '');
    assert.equal(EP.extOf(null), '');
});

test('extOf：超长后缀不当扩展名', () => {
    assert.equal(EP.extOf('a.abcdefghijklmnop'), '');
});

/* ==================== 类型判定 ==================== */

test('压缩包判定：apk / docx / pptx 都算 ZIP 容器', () => {
    assert.equal(EP.isArchiveName('setup.apk'), true);
    assert.equal(EP.isArchiveName('报告.docx'), true);
    assert.equal(EP.isArchiveName('演示.pptx'), true);
    assert.equal(EP.isArchiveName('a.zip'), true);
    assert.equal(EP.isArchiveName('a.png'), false);
    assert.equal(EP.isArchiveName('a.pdf'), false);
});

test('图片判定', () => {
    assert.equal(EP.isImageName('a.webp'), true);
    assert.equal(EP.isImageName('a.svg'), true);
    assert.equal(EP.isImageName('a.mp4'), false);
});

/* ==================== 路由顺序（点击默认走哪个） ==================== */

test('图片：标注排第一（保持原有行为，点图出大图）', () => {
    const first = EP.primaryProvider('cat.png');
    assert.equal(first.id, 'annotator');
});

test('压缩包：查看内容排第一（保持原有行为）', () => {
    assert.equal(EP.primaryProvider('pkg.zip').id, 'archive');
});

test('docx：压缩包预览仍是默认，WordCraft 作为第二候选', () => {
    const list = EP.providersFor('报告.docx');
    assert.equal(list[0].id, 'archive');
    assert.equal(list[1].id, 'wordcraft');
});

test('pdf：PdfCraft 排第一，系统默认程序作兜底', () => {
    const list = EP.providersFor('a.pdf');
    assert.equal(list[0].id, 'pdfcraft');
    assert.equal(list[list.length - 2].id, 'system');
    assert.equal(list[list.length - 1].id, 'workbench', '创作台排在最后，不影响点击默认行为');
});

test('psd：PhotoCraft 排第一', () => {
    assert.equal(EP.primaryProvider('图层.psd').id, 'photocraft');
});

test('未知扩展名：系统默认程序是第一个，创作台作为附加入口', () => {
    const list = EP.providersFor('a.xyz123');
    assert.equal(list.length, 2);
    assert.equal(list[0].id, 'system', '点击仍然走系统默认程序');
    assert.equal(list[1].id, 'workbench');
});

test('workbench 永远排在 system 之后（点击默认行为零变化）', () => {
    ['a.png', 'a.pdf', 'a.docx', 'a.zip', 'a.xyz'].forEach(name => {
        const list = EP.providersFor(name);
        const iSys = list.findIndex(p => p.id === 'system');
        const iWb = list.findIndex(p => p.id === 'workbench');
        assert.ok(iSys >= 0 && iWb > iSys, name + ' 的顺序不对');
    });
});

test('providersFor 的结果按 rank 升序，且不含不匹配的项', () => {
    const list = EP.providersFor('a.svg');
    const ids = list.map(p => p.id);
    assert.ok(ids.includes('annotator'));
    assert.ok(ids.includes('vectorcraft'));
    assert.ok(ids.includes('system'));
    assert.ok(!ids.includes('pdfcraft'));
    for (let i = 1; i < list.length; i++) {
        assert.ok(list[i - 1].rank <= list[i].rank, 'rank 必须递增');
    }
});

/* ==================== 菜单生成 ==================== */

test('buildMenu：没装的外部程序显示「未安装」且 disabled', () => {
    const menu = EP.buildMenu('a.pdf', { pdfcraft: false });
    const item = menu.find(m => m.provider.id === 'pdfcraft');
    assert.equal(item.disabled, true);
    assert.match(item.label, /未安装/);
});

test('buildMenu：装了的显示原名，内置项永远可用', () => {
    const menu = EP.buildMenu('a.png', {});
    const anno = menu.find(m => m.provider.id === 'annotator');
    assert.equal(anno.disabled, false);
    assert.equal(anno.label, '标注');
    const sys = menu.find(m => m.provider.id === 'system');
    assert.equal(sys.disabled, false);
});

test('buildMenu：installed 里没出现的外部项算未安装（不是默认可用）', () => {
    const menu = EP.buildMenu('a.pdf', { photocraft: true });
    const pdf = menu.find(m => m.provider.id === 'pdfcraft');
    assert.equal(pdf.disabled, true);

    const ok = EP.buildMenu('a.pdf', { pdfcraft: 'C:\\Apps\\pdfcraft.exe' });
    const pdf2 = ok.find(m => m.provider.id === 'pdfcraft');
    assert.equal(pdf2.disabled, false);
    assert.equal(pdf2.label, 'PdfCraft');
});

test('buildMenu：每个扩展名都能拿到至少一个可用项（兜底保证）', () => {
    ['a.qwerty', 'b', 'c.', ''].forEach(name => {
        const menu = EP.buildMenu(name, {});
        assert.ok(menu.some(m => !m.disabled), name + ' 没有可用的打开方式');
    });
});

/* ==================== 表自身的一致性 ==================== */

test('表一致性：id 唯一、rank 是数字、外部项都有 exe', () => {
    const seen = Object.create(null);
    EP.PROVIDERS.forEach(p => {
        assert.ok(!seen[p.id], '重复 id: ' + p.id);
        seen[p.id] = true;
        assert.equal(typeof p.rank, 'number', p.id + ' rank 必须是数字');
        assert.ok(Array.isArray(p.exts) && p.exts.length > 0, p.id + ' exts 不能为空');
        if (p.kind === 'external') assert.ok(p.exe, p.id + ' 外部程序必须有 exe');
    });
});

test('externalProviders：返回全部外部项，且不含内置', () => {
    const ext = EP.externalProviders();
    assert.ok(ext.length >= 13);
    assert.ok(ext.every(p => p.kind === 'external'));
    assert.ok(!ext.some(p => p.id === 'annotator' || p.id === 'system'));
});

test('getById：命中与未命中', () => {
    assert.equal(EP.getById('pdfcraft').name, 'PdfCraft');
    assert.equal(EP.getById('nope'), null);
});
