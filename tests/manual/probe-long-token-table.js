/**
 * 长 Base64 公钥表格溢出 —— 复现/回归探针（2026-11-12）
 *
 * 用法：node tests/manual/probe-long-token-table.js
 * 数据：tests/manual/fixtures/long-key-tables.json（从用户真实任务里抽的表格）
 *
 * 机理：单元格 `word-break: break-word` 不影响固有尺寸计算，近 400 字符无空格的
 * Base64 公钥被当「一个不可拆的词」，列 min-content 撑到几千 px → 整表顶出窗口。
 * 断言：两张真实表在笔记卡片 & 表格视图内容格里都不超出容器/窗口。
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9985 + Math.floor(Math.random() * 10);
const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'long-key-tables.json'), 'utf8'));

{
    let h = fs.readFileSync(path.join(ROOT, '计时器.html'), 'utf8');
    h = h.replace(/(src|href)="([^"/]+\.(?:js|css))"/g, (m, attr, file) => `${attr}="../../${file}"`);
    fs.writeFileSync(path.join(HERE, 'timer-craft-longkey.html'), h, 'utf8');
}
const url = 'file:///' + path.join(HERE, 'timer-craft-longkey.html').replace(/\\/g, '/');

const get = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

const EXPR = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const fixtures = ${JSON.stringify(FIXTURE)};
    const out = { cases: [] };

    // 造两个真实容器：笔记卡片 / 表格视图内容格
    const card = document.createElement('div');
    card.className = 'note-card';
    document.getElementById('notesList') ? document.getElementById('notesList').appendChild(card) : document.body.appendChild(card);

    const host = document.createElement('div');
    host.style.cssText = 'width: 420px;';
    const tc = document.createElement('div');
    tc.className = 'table-content';
    tc.setAttribute('contenteditable', 'true');
    host.appendChild(tc);
    document.body.appendChild(host);

    for (const f of fixtures) {
        const ed = document.createElement('div');
        ed.className = 'note-content-editable';
        ed.setAttribute('contenteditable', 'true');
        ed.innerHTML = f.content;
        card.appendChild(ed);

        const tcBox = document.createElement('div');
        tcBox.className = 'table-content';
        tcBox.setAttribute('contenteditable', 'true');
        tcBox.innerHTML = f.content;
        host.appendChild(tcBox);

        await sleep(150);

        for (const [name, box] of [['note', ed], ['tableCell', tcBox]]) {
            const t = box.querySelector('table.pasted-table');
            if (!t) { out.cases.push({ id: f.id, name, missing: true }); continue; }
            const wrap = t.parentElement;
            const r = t.getBoundingClientRect();
            const wr = wrap.getBoundingClientRect();
            out.cases.push({
                id: f.id,
                name: name,
                tableW: Math.round(r.width),
                wrapW: Math.round(wr.width),
                overflowWrap: Math.round(r.right - wr.right),
                overflowWindow: Math.round(r.right - window.innerWidth),
                canScrollX: wrap.scrollWidth > wrap.clientWidth + 1
            });
        }
    }
    // 外层任务表格：把真实表塞进一条任务行（同步量，避免被列表重渲染清掉）
    const tv = document.getElementById('tableView');
    if (tv) { tv.classList.add('active'); tv.style.display = 'block'; }
    const tbody = document.getElementById('tableBody');
    if (tbody) {
        tbody.innerHTML = '';
        const rowHtml = fixtures.map(f => '<tr data-note-id="x' + f.id + '"><td style="text-align:left;vertical-align:top">' +
            '<div class="table-content" contenteditable="true">' + f.content + '</div></td>' +
            '<td>中</td><td>短期</td><td></td><td>未完成</td><td>x</td><td>-</td><td>b</td></tr>').join('');
        tbody.innerHTML = rowHtml;
        const outer = document.querySelector('table.task-table');
        const cont = document.getElementById('tableView');
        const or = outer.getBoundingClientRect();
        out.taskTable = {
            outerW: Math.round(or.width),
            outerRight: Math.round(or.right),
            windowW: window.innerWidth,
            containerClientW: cont ? cont.clientWidth : null,
            containerScrollW: cont ? cont.scrollWidth : null,
            canScrollX: cont ? cont.scrollWidth > cont.clientWidth + 1 : null
        };
    }

    out.bad = out.cases.filter(c => c.missing || c.overflowWindow > 1 || c.overflowWrap > 1);
    return JSON.stringify(out, null, 1);
})()`;

(async () => {
    const child = spawn(EDGE, [
        '--headless=new', '--disable-gpu',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(os.tmpdir(), 'edge-lk-' + PORT),
        '--window-size=820,900', url
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

    const res = await send('Runtime.evaluate', { expression: EXPR, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails));
    const out = JSON.parse(res.result.value);
    console.log(JSON.stringify(out, null, 1));

    const pass = out.bad.length === 0;
    console.log(pass ? '\nALL PASS ✓' : '\nFAIL ✗');
    ws.close(); child.kill();
    process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
