/**
 * 同步进度指示 —— 真实页面端到端探针（2026-11-10）
 *
 * 用法：node tests/manual/probe-sync-status.js
 * 生成 tests/manual/timer-craft-sync.html（由当前 计时器.html 生成）。
 *
 * 检查四件事（fetch 全部 stub 掉，不打真实服务端）：
 *   1. pull 进行中：状态条「同步中…」+ 按钮转圈（sync-spin）
 *   2. pull 成功：状态条「✓ 已同步 · 收到 N 条 + 时间」
 *   3. pull 失败（网络错误）：状态条「✗ 同步失败」
 *   4. 本地改动：先「有改动 · 待同步…」，1.5s 防抖后自动 push→pull → ✓
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9930 + Math.floor(Math.random() * 20);
const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');

{
    let h = fs.readFileSync(path.join(ROOT, '计时器.html'), 'utf8');
    h = h.replace(/(src|href)="([^"/]+\.(?:js|css))"/g, (m, attr, file) => `${attr}="../../${file}"`);
    fs.writeFileSync(path.join(HERE, 'timer-craft-sync.html'), h, 'utf8');
}
const url = 'file:///' + path.join(HERE, 'timer-craft-sync.html').replace(/\\/g, '/');

const get = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

const EXPR = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const out = {};

    // 假登录态（createSync 读取 localStorage 里的 sync_meta）
    localStorage.setItem('sync_meta', JSON.stringify({ token: 'test-token' }));

    // stub fetch：pull 返回 1 条变更、push 无冲突；mode='fail' 时全部拒绝
    let mode = 'ok';
    window.fetch = function (url2) {
        const u = String(url2);
        if (mode === 'fail') return new Promise((res, rej) => setTimeout(() => rej(new TypeError('Failed to fetch')), 300));
        const body = u.indexOf('/sync/pull') >= 0
            ? { changes: [{ op: 'upsert', taskId: 1, version: 3, task: { id: 1, content: '来自远端的任务' } }], cursor: 42 }
            : { conflicts: [] };
        return new Promise(res => setTimeout(() => res({
            ok: true, status: 200,
            json: () => Promise.resolve(body)
        }), 350));
    };

    // 干掉 renderer.js 已建的同步浮层，建一个自己的实例（ui 绑定验证也靠它）
    const old = document.getElementById('sync-fab');
    if (old) old.remove();
    let applied = 0;
    const s = window.createSync({
        getLocalTasks: () => [{ id: 1, content: '本地任务', done: false, p: 3, type: 'short' }],
        applyRemote: () => { applied++; },
        toast: () => {}
    });
    s.init();
    // init 里会自动发起首轮 pull，先等它收尾，避免与探针的用例互斥早退
    await sleep(900);
    await sleep(100);

    const fab = document.getElementById('sync-fab');
    const status = fab.querySelector('.sync-status');
    const btn = fab.querySelector('button');
    const txt = () => status.textContent || '';

    // 1+2) pull：进行中 → 成功
    const pullP = s.pull();
    await sleep(120);
    out.busyDuringPull = {
        text: txt(),
        spinning: !!btn.querySelector('.sync-spin'),
        color: status.style.color
    };
    await pullP;
    await sleep(60);
    out.afterPull = { text: txt(), color: status.style.color };

    // 3) 失败路径
    mode = 'fail';
    const failP = s.pull();
    await sleep(120);
    out.busyDuringFail = { text: txt(), spinning: !!btn.querySelector('.sync-spin') };
    await failP;
    await sleep(60);
    out.afterFail = { text: txt(), color: status.style.color };
    mode = 'ok';

    // 4) 本地改动：待同步 →（1.5s 防抖）自动 push+pull → ✓
    s.notifyLocalChange();
    await sleep(60);
    out.pendingChange = { text: txt() };
    await sleep(2300);
    out.afterAutoSync = { text: txt(), appliedCount: applied };

    return JSON.stringify(out, null, 1);
})()`;

(async () => {
    const child = spawn(EDGE, [
        '--headless=new', '--disable-gpu',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(os.tmpdir(), 'edge-sync-' + PORT),
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
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url: url });
    await new Promise(r => setTimeout(r, 5000));

    const res = await send('Runtime.evaluate', { expression: EXPR, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails));
    const out = JSON.parse(res.result.value);
    console.log(JSON.stringify(out, null, 1));

    const pass =
        out.busyDuringPull && out.busyDuringPull.text === '同步中…' && out.busyDuringPull.spinning &&
        out.afterPull && out.afterPull.text.indexOf('✓ 已同步') === 0 && out.afterPull.text.indexOf('收到 1 条') > 0 &&
        out.busyDuringFail && out.busyDuringFail.spinning &&
        out.afterFail && out.afterFail.text.indexOf('✗ 同步失败') === 0 &&
        out.pendingChange && out.pendingChange.text === '有改动 · 待同步…' &&
        out.afterAutoSync && out.afterAutoSync.text.indexOf('✓ 已同步') === 0 && out.afterAutoSync.appliedCount >= 1;

    console.log(pass ? '\nALL PASS ✓' : '\nFAIL ✗');
    ws.close();
    child.kill();
    process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e.message); child && child.kill(); process.exit(1); });
