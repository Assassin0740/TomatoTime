/**
 * 界面宽度夹紧 —— 复现/回归探针（2026-11-12，CR-036）
 *
 * 用法：node tests/manual/probe-container-width.js
 *
 * 场景：用户把「整体界面宽度」设成 1700px，但窗口只有 ~1090px。
 * 修复前：.container 按 1700 铺开，右侧跑出窗口且无横向滚动 → 内容连表格一起被切掉。
 * 断言：
 *   1. 容器宽度 ≤ 窗口宽度
 *   2. 页面没有横向溢出（documentElement.scrollWidth ≤ innerWidth + 1）
 *   3. 容器内的真实长公钥表格不超出容器和窗口
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9995 + Math.floor(Math.random() * 5);
const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'long-key-tables.json'), 'utf8'));

{
    let h = fs.readFileSync(path.join(ROOT, '计时器.html'), 'utf8');
    h = h.replace(/(src|href)="([^"/]+\.(?:js|css))"/g, (m, attr, file) => `${attr}="../../${file}"`);
    fs.writeFileSync(path.join(HERE, 'timer-craft-width.html'), h, 'utf8');
}
const url = 'file:///' + path.join(HERE, 'timer-craft-width.html').replace(/\\/g, '/');

const get = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

const SEED = `(() => {
    localStorage.setItem('containerWidth', '1700');
    const notes = [{
        id: 900002, content: ${JSON.stringify(FIXTURE[0].content)}, done: false, p: 2, type: 'short',
        ts: Date.now(), project: '', comments: []
    }];
    localStorage.setItem('notes', JSON.stringify(notes));
    localStorage.setItem('archived_notes', '[]');
    return 'seeded';
})()`;

const CHECK = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(400);
    if (typeof toggleView === 'function') toggleView('card');
    await sleep(300);

    const c = document.querySelector('.container');
    const cr = c ? c.getBoundingClientRect() : null;
    const t = document.querySelector('table.pasted-table');
    const tr = t ? t.getBoundingClientRect() : null;

    return JSON.stringify({
        windowW: window.innerWidth,
        containerW: cr ? Math.round(cr.width) : null,
        containerRight: cr ? Math.round(cr.right) : null,
        containerOverflowPx: cr ? Math.round(cr.right - window.innerWidth) : null,
        pageScrollW: document.documentElement.scrollWidth,
        pageOverflowPx: document.documentElement.scrollWidth - window.innerWidth,
        tableW: tr ? Math.round(tr.width) : null,
        tableOverflowPx: tr ? Math.round(tr.right - window.innerWidth) : null,
        sliderLabel: (document.getElementById('containerWidthValue') || {}).textContent || null
    }, null, 1);
})()`;

(async () => {
    const child = spawn(EDGE, [
        '--headless=new', '--disable-gpu',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(os.tmpdir(), 'edge-cw-' + PORT),
        '--window-size=1060,900', url
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
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url: url });
    await new Promise(r => setTimeout(r, 4500));

    for (let i = 0; i < 20; i++) {
        const probe = await send('Runtime.evaluate', { expression: "typeof window.toggleView + '|' + document.readyState", returnByValue: true });
        if (probe.result.value.startsWith('function') && probe.result.value.endsWith('complete')) break;
        await new Promise(r => setTimeout(r, 500));
    }
    const seed = await send('Runtime.evaluate', { expression: SEED, returnByValue: true });
    if (seed.exceptionDetails) throw new Error(JSON.stringify(seed.exceptionDetails.exception || seed.exceptionDetails));

    await send('Page.reload');
    await new Promise(r => setTimeout(r, 4500));

    const res = await send('Runtime.evaluate', { expression: CHECK, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails));
    const out = JSON.parse(res.result.value);
    console.log(JSON.stringify(out, null, 1));

    const pass = out.containerW !== null && out.containerW <= out.windowW + 1 &&
        out.pageOverflowPx <= 1 &&
        (out.tableOverflowPx === null || out.tableOverflowPx <= 1);
    console.log(pass ? '\nALL PASS ✓' : '\nFAIL ✗');
    ws.close(); child.kill();
    process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
