/**
 * 标注器截图：进入编辑态后画一个框，截整窗。
 * 用法：node tests/manual/shot-annotate.js <页面路径> <输出png> [标注:x,y,w,h]
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 10000 + Math.floor(Math.random() * 200);
const page = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3]);
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
    g.fillStyle = '#f4f6fa'; g.fillRect(0, 0, 2000, 1500);
    g.fillStyle = '#0088ff'; g.font = 'bold 240px sans-serif';
    g.fillText('TEST', 150, 800);
    // 底部与右下角小块色标，方便肉眼判断有没有被裁掉
    g.fillStyle = '#ff9800'; g.fillRect(0, 1440, 2000, 60);
    g.fillStyle = '#4caf50'; g.fillRect(1900, 1200, 100, 240);

    window.zoomImage(null, c.toDataURL('image/png'));
    await new Promise(r => setTimeout(r, 700));
    document.getElementById('wechatRectBtn').click();
    document.getElementById('wechatEditBtn').click();
    await new Promise(r => setTimeout(r, 400));

    const cv = document.getElementById('wechatPainterCanvas');
    const ir = document.getElementById('modalImg').getBoundingClientRect();
    // 按图片比例定位框：左上 (15%,20%) → 右下 (55%,55%)，两种尺寸下都好对照
    const A = { x: ir.width * 0.15, y: ir.height * 0.20 };
    const B = { x: ir.width * 0.55, y: ir.height * 0.55 };
    const mk = (t, x, y) => new MouseEvent(t, { bubbles: true, cancelable: true, button: 0, buttons: 1,
        clientX: ir.left + x, clientY: ir.top + y });
    cv.dispatchEvent(mk('mousedown', A.x, A.y));
    await new Promise(r => setTimeout(r, 30));
    cv.dispatchEvent(mk('mousemove', B.x, B.y));
    await new Promise(r => setTimeout(r, 30));
    cv.dispatchEvent(mk('mouseup', B.x, B.y));
    await new Promise(r => setTimeout(r, 300));
    return JSON.stringify({ img: [Math.round(ir.width), Math.round(ir.height)], box: [A, B] });
})()`;

(async () => {
    const child = spawn(EDGE, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(os.tmpdir(), 'edge-shot-' + PORT),
        '--window-size=1200,800', url
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
    if (res.exceptionDetails) { console.log('ERR ' + JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails)); }
    else { console.log(res.result.value); }

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log('已保存 ' + out);

    ws.close(); child.kill(); process.exit(0);
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
