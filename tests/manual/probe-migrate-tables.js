/**
 * 历史表格一次性修复探针（2026-11-12，CR-035）
 *
 * 用法：node tests/manual/probe-migrate-tables.js
 *
 * 步骤：先往 localStorage 种一条「拖过列宽、被冻结成 2400px 的坏表」→ 重载页面
 *       → 迁移应该跑一次，把表解冻成自适应布局，并且标记落地。
 * 检查：
 *   1. 迁移后 content 里没有 data-rsz-frozen / width:NNpx
 *   2. 标志位 pastedTableLayoutReset.v1 已写入（不会重复跑）
 *   3. 渲染出来的表不超出窗口右边界
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9970 + Math.floor(Math.random() * 20);
const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');

{
    let h = fs.readFileSync(path.join(ROOT, '计时器.html'), 'utf8');
    h = h.replace(/(src|href)="([^"/]+\.(?:js|css))"/g, (m, attr, file) => `${attr}="../../${file}"`);
    fs.writeFileSync(path.join(HERE, 'timer-craft-migrate.html'), h, 'utf8');
}
const url = 'file:///' + path.join(HERE, 'timer-craft-migrate.html').replace(/\\/g, '/');

const get = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

const SEED = `(() => {
    const rows = [['项目', '说明'], ['1、RPK 包体', '2、游戏背景：600 字内文字；配图 2-10 张'], ['3、角色', '4、NPC']];
    const html = window.ClipboardTable.rowsToTableHtml({ rows: rows, cols: 2, hasHeader: true });
    const box = document.createElement('div');
    box.innerHTML = html;
    const t = box.querySelector('table.pasted-table');
    t.style.tableLayout = 'fixed';
    t.style.width = '2400px';
    t.setAttribute('data-rsz-frozen', '1');
    t.querySelectorAll('th, td').forEach((c, i) => { c.style.width = (i % 2 ? 1800 : 600) + 'px'; c.style.boxSizing = 'border-box'; });

    const notes = [{
        id: 900001, content: box.innerHTML, done: false, p: 2, type: 'short',
        ts: Date.now(), project: '', comments: []
    }];
    localStorage.setItem('notes', JSON.stringify(notes));
    localStorage.setItem('archived_notes', '[]');
    localStorage.removeItem('pastedTableLayoutReset.v1');
    return JSON.stringify({ seeded: box.innerHTML.length });
})()`;

const CHECK = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(300);
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const content = (notes[0] && notes[0].content) || '';
    const flag = localStorage.getItem('pastedTableLayoutReset.v1');

    // 找到页面上渲染出来的那张表（笔记卡片）
    const t = document.querySelector('table.pasted-table');
    let overflow = null;
    if (t) {
        const r = t.getBoundingClientRect();
        overflow = Math.round(r.right - window.innerWidth);
    }
    return JSON.stringify({
        noteKept: notes.length === 1,
        noFrozenAttr: content.indexOf('data-rsz-frozen') === -1,
        noPxWidthInCells: !/width:\\s*\\d{3,}px/.test(content),
        tableLayoutCleared: content.indexOf('table-layout') === -1,
        flagSet: flag === '1',
        renderedFound: !!t,
        renderedOverflowPx: overflow,
        contentLen: content.length
    }, null, 1);
})()`;

(async () => {
    const child = spawn(EDGE, [
        '--headless=new', '--disable-gpu',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(os.tmpdir(), 'edge-mig-' + PORT),
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

    // 1) 种数据（防御：等 ClipboardTable 就绪）
    for (let i = 0; i < 20; i++) {
        const probe = await send('Runtime.evaluate', { expression: "typeof window.ClipboardTable + '|' + document.readyState", returnByValue: true });
        console.log('wait:', probe.result.value);
        if (probe.result.value.startsWith('object')) break;
        await new Promise(r => setTimeout(r, 500));
    }
    const seed = await send('Runtime.evaluate', { expression: SEED, returnByValue: true });
    if (seed.exceptionDetails) throw new Error(JSON.stringify(seed.exceptionDetails.exception || seed.exceptionDetails));
    console.log('seed:', seed.result.value);

    // 2) 重载，让迁移跑
    await send('Page.reload');
    await new Promise(r => setTimeout(r, 4500));

    // 3) 检查
    const res = await send('Runtime.evaluate', { expression: CHECK, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails));
    const out = JSON.parse(res.result.value);
    console.log(JSON.stringify(out, null, 1));

    const pass = out.noteKept && out.noFrozenAttr && out.noPxWidthInCells &&
        out.tableLayoutCleared && out.flagSet && out.renderedFound &&
        (out.renderedOverflowPx === null || out.renderedOverflowPx <= 0);

    console.log(pass ? '\nALL PASS ✓' : '\nFAIL ✗');
    ws.close(); child.kill();
    process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
