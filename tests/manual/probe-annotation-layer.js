/**
 * CR-031 真实页面端到端：标注保存后原件必须还在，且能单独删掉标注层。
 *
 * 用法：node tests/manual/probe-annotation-layer.js
 * 依赖 tests/manual/timer-craft.html（由当前 计时器.html 生成，见 npm 里的说明）。
 *
 * 检查四件事：
 *   1. 点「完成」后，底图 <img src> 一字节都没变（非破坏化）
 *   2. 生成的是独立透明 PNG 图层（不是合成图；除笔迹外 alpha=0）
 *   3. 便签里出现 .note-img-stack 且叠加层尺寸与底图一致
 *   4. 「恢复原图」后叠层被拆掉，原件仍是同一张
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9900 + Math.floor(Math.random() * 90);
const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');

// 由当前主版本 HTML 生成测试页，避免探针用的是过期 DOM
{
    let h = fs.readFileSync(path.join(ROOT, '计时器.html'), 'utf8');
    h = h.replace(/(src|href)="([^"/]+\.(?:js|css))"/g, (m, attr, file) => `${attr}="../../${file}"`);
    fs.writeFileSync(path.join(HERE, 'timer-craft.html'), h, 'utf8');
}
const page = path.join(HERE, 'timer-craft.html');
const url = 'file:///' + page.replace(/\\/g, '/');

const get = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

const EXPR = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const c = document.createElement('canvas');
    c.width = 800; c.height = 600;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 800, 600);
    g.fillStyle = '#0088ff'; g.font = 'bold 100px sans-serif'; g.fillText('ORIGINAL', 30, 320);
    const originalSrc = c.toDataURL('image/png');
    window.__annOriginal = originalSrc;

    const ed = document.createElement('div');
    ed.className = 'note-content-editable';
    ed.setAttribute('contenteditable', 'true');
    ed.setAttribute('data-note-id', '999999');
    ed.innerHTML = '<img src="' + originalSrc + '">';
    document.body.appendChild(ed);
    const base = ed.querySelector('img');

    window.zoomImage({ target: base, stopPropagation() {} }, base.src);
    await sleep(700);

    document.getElementById('wechatRectBtn').click();
    document.getElementById('wechatEditBtn').click();
    await sleep(350);

    const modalImg = document.getElementById('modalImg');
    const cv = document.getElementById('wechatPainterCanvas');
    const ir = modalImg.getBoundingClientRect();
    const A = { x: 100, y: 80 }, B = { x: 300, y: 220 };
    const mk = (t, x, y) => new MouseEvent(t, {
        bubbles: true, cancelable: true, button: 0, buttons: 1,
        clientX: ir.left + x, clientY: ir.top + y
    });
    cv.dispatchEvent(mk('mousedown', A.x, A.y));
    await sleep(30);
    cv.dispatchEvent(mk('mousemove', B.x, B.y));
    await sleep(30);
    cv.dispatchEvent(mk('mouseup', B.x, B.y));
    await sleep(60);

    const modalSrcBefore = modalImg.getAttribute('src');
    document.getElementById('wechatDoneBtn').click();
    await sleep(900);

    const stack = ed.querySelector('.note-img-stack');
    const overlay = stack && stack.querySelector('.note-annotation-layer');
    const annUrl = base.getAttribute('data-annotation') || '';
    const baseSrcKept = base.getAttribute('src') === originalSrc;
    const modalSrcKept = modalImg.getAttribute('src') === modalSrcBefore;

    // 图层本身必须是「透明 PNG」：只有红色笔迹不透明，其余 alpha=0
    let layerInfo = { ok: false };
    if (annUrl) {
        const im = new Image();
        await new Promise(res => { im.onload = res; im.onerror = res; im.src = annUrl; });
        if (im.naturalWidth) {
            const lc = document.createElement('canvas');
            lc.width = im.naturalWidth; lc.height = im.naturalHeight;
            const lg = lc.getContext('2d'); lg.drawImage(im, 0, 0);
            const d = lg.getImageData(0, 0, lc.width, lc.height).data;
            let opaque = 0, red = 0;
            for (let i = 3; i < d.length; i += 4) {
                if (d[i] > 8) opaque++;
                if (d[i] > 8 && d[i - 3] > 180 && d[i - 2] < 120) red++;
            }
            layerInfo = { ok: true, size: [lc.width, lc.height], opaquePixels: opaque, redPixels: red,
                          transparentRatio: +(1 - opaque / (d.length / 4)).toFixed(3) };
        }
    }

    const br = base.getBoundingClientRect();
    const or = overlay ? overlay.getBoundingClientRect() : null;
    const overlayAligned = !!or && Math.abs(br.width - or.width) < 1.5 && Math.abs(br.height - or.height) < 1.5;
    const modalOverlayShown = getComputedStyle(document.getElementById('modalOverlayImg')).display !== 'none';

    // 关掉大图，让截图拍到「便签里那张盖了标注的图」
    window.__annEd = ed;
    window.closeImgModal();
    await sleep(350);
    ed.scrollIntoView({ block: 'center' });

    return JSON.stringify({
        baseSrcKept, modalSrcKept,
        stackCreated: !!stack, overlayExists: !!overlay,
        annotationIsSeparateUrl: annUrl.length > 0 && annUrl !== originalSrc,
        annotationUrlPrefix: annUrl.slice(0, 32),
        layerInfo, overlayAligned, modalOverlayShown,
        baseRect: [Math.round(br.width), Math.round(br.height)],
        overlayRect: or ? [Math.round(or.width), Math.round(or.height)] : null
    }, null, 1);
})()`;

// 走真实用户路径：在图片上右键 → 点「恢复原图（删除标注）」
const EXPR_RESTORE = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const ed = window.__annEd;
    const base = ed.querySelector('img');
    const before = { stack: !!ed.querySelector('.note-img-stack'), ann: !!base.getAttribute('data-annotation') };
    base.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
    const item = document.getElementById('restoreImageItem');
    const menuShown = getComputedStyle(item).display !== 'none';
    item.click();
    await sleep(250);
    return JSON.stringify({
        menuShown,
        stackGone: !ed.querySelector('.note-img-stack'),
        annGone: !base.getAttribute('data-annotation'),
        restoredSameSrc: base.getAttribute('src') === window.__annOriginal,
        overlayHiddenAfter: getComputedStyle(document.getElementById('modalOverlayImg')).display === 'none',
        hadStackBefore: before.stack
    });
})()`;

(async () => {
    const child = spawn(EDGE, [
        '--headless=new', '--disable-gpu',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(os.tmpdir(), 'edge-ann-' + PORT),
        '--window-size=1200,900', url
    ], { stdio: 'ignore' });

    const started = Date.now();
    let targets = null;
    while (Date.now() - started < 20000) {
        try { targets = await get('/json'); if (Array.isArray(targets) && targets.length) break; }
        catch (e) { /* not up */ }
        await new Promise(r => setTimeout(r, 400));
    }
    if (!targets) { console.log('ERR 无法连接调试端口'); child.kill(); process.exit(1); }

    const t = targets.find(x => x.type === 'page' && x.webSocketDebuggerUrl) || targets[0];
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 0; const pending = new Map();
    const send = (method, params) => new Promise((resolve, reject) => {
        const mid = ++id; pending.set(mid, { resolve, reject });
        ws.send(JSON.stringify({ id: mid, method, params }));
    });
    ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
            msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
        }
    };
    await new Promise(r => ws.onopen = r);
    // 附着时可能还挂在旧上下文，显式导航一次（同 probe-brotli 的坑）
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url: url });
    await new Promise(r => setTimeout(r, 5000));

    const res = await send('Runtime.evaluate', { expression: EXPR, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails));
    const saveInfo = JSON.parse(res.result.value);

    // 保存后、恢复前拍一张：便签里的原图上盖着独立的标注层
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const shotPath = path.join(HERE, 'shot-annotation-layer.png');
    fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));

    const res2 = await send('Runtime.evaluate', { expression: EXPR_RESTORE, awaitPromise: true, returnByValue: true });
    if (res2.exceptionDetails) throw new Error(JSON.stringify(res2.exceptionDetails.exception || res2.exceptionDetails));
    const restoreInfo = JSON.parse(res2.result.value);

    const li = saveInfo.layerInfo || {};
    const PASS = saveInfo.baseSrcKept && saveInfo.modalSrcKept && saveInfo.stackCreated &&
        li.ok && li.transparentRatio > 0.9 && li.redPixels > 0 && saveInfo.overlayAligned &&
        restoreInfo.menuShown && restoreInfo.stackGone && restoreInfo.annGone &&
        restoreInfo.restoredSameSrc && restoreInfo.overlayHiddenAfter;
    console.log(JSON.stringify(Object.assign({}, saveInfo, restoreInfo, { PASS: PASS }), null, 1));
    console.log('screenshot -> ' + shotPath);
    if (!PASS) process.exitCode = 1;

    ws.close(); child.kill(); process.exit(process.exitCode || 0);
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
