/**
 * 用 Edge + CDP 跑真实页面的探针
 *
 * 为什么不用 `--dump-dom`：计时器页面里有常驻定时器，headless 的
 * --virtual-time-budget 会被它们拖住，命令直接挂死。走 CDP 可以自己控制
 * 何时求值、何时退出。
 *
 * 用法：node tests/manual/cdp-probe.js <页面路径> <表达式>
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333 + Math.floor(Math.random() * 200);

const page = process.argv[2] || 'tests/manual/timer-paste.html';
const expr = process.argv[3] || 'window.__probe || "no probe"';
const waitMs = Number(process.argv[4] || 5000);
const shotPath = process.argv[5] || '';

const url = 'file:///' + path.resolve(page).replace(/\\/g, '/');

const get = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

(async () => {
    const child = spawn(EDGE, [
        '--headless=new',
        '--disable-gpu',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(require('os').tmpdir(), 'edge-probe-' + PORT),
        '--window-size=1200,900',
        url
    ], { stdio: 'ignore' });

    const started = Date.now();
    let targets = null;
    while (Date.now() - started < 20000) {
        try {
            targets = await get('/json');
            if (Array.isArray(targets) && targets.length) break;
        } catch (e) { /* 还没起来 */ }
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
    await new Promise(r => setTimeout(r, waitMs));

    const res = await send('Runtime.evaluate', {
        expression: expr,
        awaitPromise: true,
        returnByValue: true
    });

    const val = res && res.result ? res.result.value : null;
    console.log(typeof val === 'string' ? val : JSON.stringify(val, null, 1));
    if (res.exceptionDetails) console.log('EXC ' + JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails));

    // 可选：求值完顺手截屏，用来固定菜单 / 弹层的实际观感
    if (shotPath) {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        require('fs').writeFileSync(path.resolve(shotPath), Buffer.from(shot.data, 'base64'));
        console.log('shot ->', path.resolve(shotPath));
    }

    ws.close();
    child.kill();
    process.exit(0);
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
