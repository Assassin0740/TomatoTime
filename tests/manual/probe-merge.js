/**
 * 端到端：在标注器里画一个框 → 点完成 → 检查合成到 2000x1500 原图上的框
 * 是否落在正确的位置和尺寸上。
 *
 * 期望：屏幕点 (200,150)→(400,300)（相对图片左上角），图片显示尺寸 W，
 * 那么合成图上的框应落在 (200/W*2000, 150/H*1500) → (400/W*2000, 300/H*1500)。
 *
 * 用法：node tests/manual/probe-merge.js
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9800 + Math.floor(Math.random() * 150);
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
    const c = document.createElement('canvas');
    c.width = 2000; c.height = 1500;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 2000, 1500);
    g.fillStyle = '#0088ff'; g.font = 'bold 240px sans-serif';
    g.fillText('TEST', 150, 800);
    window.zoomImage(null, c.toDataURL('image/png'));
    await new Promise(r => setTimeout(r, 700));

    document.getElementById('wechatRectBtn').click();
    document.getElementById('wechatEditBtn').click();
    await new Promise(r => setTimeout(r, 400));

    const img = document.getElementById('modalImg');
    const cv = document.getElementById('wechatPainterCanvas');
    const ir = img.getBoundingClientRect();
    const dispW = ir.width, dispH = ir.height;

    // 画框：屏幕坐标相对图片左上角 (200,150) → (400,300)
    const A = { x: 200, y: 150 }, B = { x: 400, y: 300 };
    const mk = (t, x, y) => new MouseEvent(t, { bubbles: true, cancelable: true, button: 0, buttons: 1,
        clientX: ir.left + x, clientY: ir.top + y });
    cv.dispatchEvent(mk('mousedown', A.x, A.y));
    await new Promise(r => setTimeout(r, 30));
    cv.dispatchEvent(mk('mousemove', B.x, B.y));
    await new Promise(r => setTimeout(r, 30));
    cv.dispatchEvent(mk('mouseup', B.x, B.y));
    await new Promise(r => setTimeout(r, 50));

    // 点完成 → 合成
    document.getElementById('wechatDoneBtn').click();
    await new Promise(r => setTimeout(r, 500));

    // 解合成图，扫红色像素
    const merged = new Image();
    await new Promise((res, rej) => { merged.onload = res; merged.onerror = rej; merged.src = img.src; });
    const m = document.createElement('canvas');
    m.width = merged.naturalWidth; m.height = merged.naturalHeight;
    const mg = m.getContext('2d');
    mg.drawImage(merged, 0, 0);
    const d = mg.getImageData(0, 0, m.width, m.height).data;
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, n = 0;
    for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
            const i = (y * m.width + x) * 4;
            // #ff4444 附近，且明显偏红
            if (d[i] > 180 && d[i + 1] < 120 && d[i + 2] < 120) {
                n++;
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
        }
    }
    const k = 2000 / dispW;
    return JSON.stringify({
        displaySize: [Math.round(dispW), Math.round(dispH)],
        mergedSize: [m.width, m.height],
        redBoxInMerged: n ? [minX, minY, maxX, maxY] : null,
        expectedBox: [Math.round(A.x * k), Math.round(A.y * 1500 / dispH),
                      Math.round(B.x * k), Math.round(B.y * 1500 / dispH)],
        redPixels: n
    }, null, 1);
})()`;

(async () => {
    const child = spawn(EDGE, [
        '--headless=new', '--disable-gpu',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(os.tmpdir(), 'edge-merge-' + PORT),
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
    await new Promise(r => setTimeout(r, 5000));

    const res = await send('Runtime.evaluate', { expression: EXPR, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) console.log('ERR ' + JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails));
    else console.log(res.result.value);

    ws.close(); child.kill(); process.exit(0);
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
