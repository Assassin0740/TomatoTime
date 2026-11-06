/**
 * 探针：图片在便签编辑器里的实际排版
 *
 * 用户反馈「编辑时图片异常放大、有偏移」。这里不看代码猜，直接造出真实 DOM 结构
 * （.note-card > .note-content-editable），塞进不同来源的图片，量它们的 rect：
 *   A. 干净 img（只有 src，无内联样式）—— 老数据 / 渲染回来的样子
 *   B. 带 width/height 属性的 img —— 从网页、Word 粘贴常见
 *   C. 带内联 style="width:1600px" 的 img —— 腾讯文档 / 富文本编辑器常见
 *   D. 插入路径实际产出的 img（maxWidth:100%, maxHeight:200px）
 * 以及「粘贴到光标处」的位置是否准。
 */
(async () => {
    const out = {};
    const list = document.querySelector('#notesList');
    if (!list) return { error: '找不到 #notesList' };

    // 造一张 2000x1500 的图
    const cv = document.createElement('canvas');
    cv.width = 2000;
    cv.height = 1500;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#4f8cff';
    ctx.fillRect(0, 0, 2000, 1500);
    ctx.fillStyle = '#fff';
    ctx.font = '120px sans-serif';
    ctx.fillText('2000x1500', 120, 200);
    const dataUrl = cv.toDataURL('image/png');

    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = '<div class="note-date">probe</div>' +
        '<div class="note-content-editable" contenteditable="true"></div>';
    list.appendChild(card);
    const ed = card.querySelector('.note-content-editable');

    const measure = (img) => {
        const r = img.getBoundingClientRect();
        const er = ed.getBoundingClientRect();
        return {
            // 显示尺寸
            w: Math.round(r.width),
            h: Math.round(r.height),
            // 相对编辑器的水平偏移（左边缘应贴住文本起点）
            leftGap: Math.round(r.left - er.left),
            // 自然尺寸 vs 显示尺寸
            natural: img.naturalWidth + 'x' + img.naturalHeight,
            cssMaxW: getComputedStyle(img).maxWidth,
            cssMaxH: getComputedStyle(img).maxHeight
        };
    };

    // 编辑器可用宽度（后面判断是否被撑破）
    out.editorWidth = Math.round(ed.getBoundingClientRect().width);

    // A. 干净 img
    let img = document.createElement('img');
    img.src = dataUrl;
    ed.appendChild(img);
    await new Promise(r => img.complete ? r() : img.addEventListener('load', r));
    out.cleanImg = measure(img);
    img.remove();

    // B. 带 width/height 属性
    img = document.createElement('img');
    img.src = dataUrl;
    img.setAttribute('width', '2000');
    img.setAttribute('height', '1500');
    ed.appendChild(img);
    await new Promise(r => setTimeout(r, 120));
    out.attrImg = measure(img);
    img.remove();

    // C. 带内联 style width
    img = document.createElement('img');
    img.src = dataUrl;
    img.setAttribute('style', 'width:1600px;height:1200px');
    ed.appendChild(img);
    await new Promise(r => setTimeout(r, 120));
    out.styleImg = measure(img);
    img.remove();

    // D. 插入路径实际产出（与 insertRichClipboardContent 一致）
    img = document.createElement('img');
    img.src = dataUrl;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '200px';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '8px';
    img.style.margin = '4px 0';
    ed.appendChild(img);
    await new Promise(r => setTimeout(r, 120));
    out.insertedImg = measure(img);
    img.remove();

    // E. 图文混排后的落点：先文字再图片，看图片有没有跑到奇怪的位置
    ed.innerHTML = '第一行文字<br>';
    const rg = document.createRange();
    rg.selectNodeContents(ed);
    rg.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rg);
    const img2 = document.createElement('img');
    img2.src = dataUrl;
    img2.style.maxWidth = '100%';
    img2.style.maxHeight = '200px';
    rg.insertNode(img2);
    await new Promise(r => setTimeout(r, 150));
    out.mixed = measure(img2);
    out.editorHtmlSample = ed.innerHTML.slice(0, 160);

    // F. 表格单元格里的图片（另一条路径）
    ed.innerHTML = '<table class="pasted-table"><tbody><tr><td class="pasted-cell-img">' +
        '<img class="pasted-cell-img" src="' + dataUrl + '"></td></tr></tbody></table>';
    await new Promise(r => setTimeout(r, 150));
    const timg = ed.querySelector('td img');
    if (timg) {
        const tr = timg.getBoundingClientRect();
        out.tableImg = { w: Math.round(tr.width), h: Math.round(tr.height) };
    }

    // 清理
    card.remove();
    return out;
})();
