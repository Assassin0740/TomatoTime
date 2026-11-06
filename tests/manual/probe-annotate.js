/**
 * 标注器（大图编辑）探针：量 canvas 内部像素尺寸与屏幕显示尺寸是否一致，
 * 并在「点 A 拖到 B」之后，检查画出来的线是否真的落在 A→B 上。
 *
 * 用法：node tests/manual/probe-annotate.js
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9600 + Math.floor(Math.random() * 200);
const page = path.resolve(__dirname, 'timer-paste.html');
const url = 'file:///' + page.replace(/\\/g, '/');

const get = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

const EXPR = `(async () => {
    const esc = s => s;
    const c = document.createElement('canvas');
    c.width = 2000; c.height = 1500;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 2000, 1500);
    g.fillStyle = '#0088ff'; g.font = 'bold 240px sans-serif';
    g.fillText('TEST', 150, 800);
    const src = c.toDataURL('image/png');

    window.zoomImage(null, src);
    await new Promise(r => setTimeout(r, 700));
    document.getElementById('wechatEditBtn').click();
    await new Promise(r => setTimeout(r, 400));

    const img = document.getElementById('modalImg');
    const cv = document.getElementById('wechatPainterCanvas');
    const cont = document.getElementById('wechatImgContainer');
    const vp = document.getElementById('wechatViewport');
    const box = el => { const b = el.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height), Math.round(b.left), Math.round(b.top)]; };
    const rect = cv.getBoundingClientRect();

    // 在屏幕坐标 (rect.left+200, rect.top+150) 按下，拖到 +400/+300
    const A = { x: 200, y: 150 }, B = { x: 400, y: 300 };
    const mk = (type, x, y) => new MouseEvent(type, {
        bubbles: true, cancelable: true, button: 0, buttons: 1,
        clientX: rect.left + x, clientY: rect.top + y
    });
    cv.dispatchEvent(mk('mousedown', A.x, A.y));
    await new Promise(r => setTimeout(r, 30));
    cv.dispatchEvent(mk('mousemove', B.x, B.y));
    await new Promise(r => setTimeout(r, 30));
    cv.dispatchEvent(mk('mouseup', B.x, B.y));
    await new Promise(r => setTimeout(r, 60));

    // 量红线实际画在哪：扫 canvas 像素找非白点（跳过底图本身的蓝色字）
    const ctx2 = cv.getContext('2d');
    const data = ctx2.getImageData(0, 0, cv.width, cv.height).data;
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, n = 0;
    for (let y = 0; y < cv.height; y += 2) {
        for (let x = 0; x < cv.width; x += 2) {
            const i = (y * cv.width + x) * 4;
            const a = data[i + 3];
            if (a > 120) { // 画笔像素（底图不画在 canvas 上，canvas 是独立层）
                n++;
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
        }
    }
    return JSON.stringify({
        natural: [img.naturalWidth, img.naturalHeight],
        imgClient: [img.clientWidth, img.clientHeight],
        imgRect: box(img),
        contRect: box(cont),
        viewport: [vp.clientWidth, vp.clientHeight],
        canvasAttr: [cv.width, cv.height],
        canvasRect: box(cv),
        ratio_canvasPerCss: [+(cv.width / rect.width).toFixed(3), +(cv.height / rect.height).toFixed(3)],
        drawnBox: n ? [minX, minY, maxX, maxY, n] : null,
        expectBox: [A.x, A.y, B.x, B.y]
    }, null, 1);
})()`;

(async () => {
    const child = spawn(EDGE, [
        '--headless=new', '--disable-gpu',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(os.tmpdir(), 'edge-annot-' + PORT),
        '--window-size=1200,900',
        url
    ], { stdio: 'ignore' });

    const started = Date.now();
    let targets = null;
    while (Date.now() - started < 20000) {
        try {
            targets = await get('/json');
            if (Array.isArray(targets) && targets.length) break;
        } catch (e) { /* not up yet */ }
        await new Promise(r => setTimeout(r, 400));
    }
    if (!targets) { console.log('ERR 无法连接调试端口'); child.kill(); process.exit(1); }

    const t = targets.find(x => x.type === 'page' && x.webSocketDebuggerUrl) || targets[0];
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    const send = (method, params) => new Promise((resolve, reject) => {
        const mid = ++id;
        pending.set(mid, { resolve, reject });
        ws.send(JSON.stringify({ id: mid, method, params }));
    });
    ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
        }
    };
    await new Promise(r => ws.onopen = r);
    await new Promise(r => setTimeout(r, 5000));

    const res = await send('Runtime.evaluate', {
        expression: EXPR, awaitPromise: true, returnByValue: true
    });
    if (res.exceptionDetails) {
        console.log('ERR ' + JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails));
    } else {
        console.log(res.result.value);
    }
    ws.close();
    child.kill();
    process.exit(0);
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
