/**
 * 表格超出右边界 —— 复现探针（2026-11-12）
 *
 * 用法：node tests/manual/probe-table-overflow.js
 *
 * 用户反馈：粘贴表格后「直接超出右边界界限，导致看不见」。
 * 这里在两种真实容器里各建一张宽表，量化：
 *   · 表格右边缘是否超出窗口 / 容器
 *   · 外层 .pasted-table-wrap 是否可横向滚动（scrollWidth vs clientWidth）
 *   · 是否有祖先把横向溢出裁掉（overflow hidden）
 * 场景：
 *   A. 任务表格视图里的一条任务（.table-content[contenteditable]）
 *   B. 卡片视图的笔记（.note-card > .note-content-editable）
 *   C. 任务视图里「拖过行高」的单元格（td 带 overflow:hidden）
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9960 + Math.floor(Math.random() * 20);
const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');

{
    let h = fs.readFileSync(path.join(ROOT, '计时器.html'), 'utf8');
    h = h.replace(/(src|href)="([^"/]+\.(?:js|css))"/g, (m, attr, file) => `${attr}="../../${file}"`);
    fs.writeFileSync(path.join(HERE, 'timer-craft-overflow.html'), h, 'utf8');
}
const url = 'file:///' + path.join(HERE, 'timer-craft-overflow.html').replace(/\\/g, '/');

const get = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

const EXPR = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    if (typeof toggleView === 'function') toggleView('table');
    // 强制显示表格视图容器（fresh profile 下 toggleView 可能因 currentView 早退）
    const tv = document.getElementById('tableView');
    if (tv) { tv.classList.add('active'); tv.style.display = 'block'; }
    await sleep(300);

    // 截图同款：两列表，左列是长文案，右列被挤出屏幕
    const rows = [
        ['立项清单', '说明'],
        ['1、RPK 包体', '2、游戏背景：600 字内文字；配图 2-10 张（jpg/png，单张 ≤2M，必须有游戏签名的主界面、带健康忠告、送审提示截图）'],
        ['3、玩家扮演的角色：600 字内文字；配图 2-10 张', ''],
        ['4、游戏角色 NPC：600 字内文字；配图 2-10 张，每张图皆有 NPC', ''],
        ['10、游戏使用/联动方法：600 字内文字；配图 1-10 张', '所有图片统一：jpg/png，单张不超过 2M。']
    ];
    const tableHtml = window.ClipboardTable.rowsToTableHtml({ rows: rows, cols: 2, hasHeader: false });

    function measure(name, host) {
        const t = host.querySelector('table.pasted-table');
        const wrap = t.parentElement;
        const tr = t.getBoundingClientRect();
        const wr = wrap.getBoundingClientRect();
        let clippedBy = null;
        for (let el = wrap.parentElement; el && el !== document.body; el = el.parentElement) {
            const cs = getComputedStyle(el);
            if (cs.overflowX === 'hidden' || cs.overflow === 'hidden') { clippedBy = el.className || el.tagName; break; }
        }
        return {
            name: name,
            tableW: Math.round(tr.width),
            tableRight: Math.round(tr.right),
            windowW: window.innerWidth,
            overflowBeyondWindow: Math.round(tr.right - window.innerWidth),
            wrapW: Math.round(wr.width),
            wrapScrollW: wrap.scrollWidth,
            wrapCanScrollX: wrap.scrollWidth > wrap.clientWidth + 1,
            wrapOverflowX: getComputedStyle(wrap).overflowX,
            clippedBy: clippedBy
        };
    }

    const out = {};

    // A. 任务视图内容格
    const tbody = document.getElementById('tableBody');
    const tr = document.createElement('tr');
    tr.setAttribute('data-note-id', '555');
    const td = document.createElement('td');
    td.setAttribute('style', 'text-align: left; vertical-align: top;');
    const tc = document.createElement('div');
    tc.className = 'table-content';
    tc.setAttribute('contenteditable', 'true');
    tc.innerHTML = tableHtml;
    td.appendChild(tc); tr.appendChild(td); tbody.appendChild(tr);
    await sleep(120);
    out.A_taskView = measure('A 任务视图内容格', tc);

    // B. 笔记卡片
    const list = document.getElementById('notesList');
    const card = document.createElement('div');
    card.className = 'note-card';
    const ed = document.createElement('div');
    ed.className = 'note-content-editable';
    ed.setAttribute('contenteditable', 'true');
    ed.innerHTML = tableHtml;
    card.appendChild(ed);
    (list || document.body).appendChild(card);
    await sleep(120);
    out.B_noteCard = measure('B 笔记卡片', ed);

    // C. 同上 A，但对 td 模拟「行高拖过」后的 overflow:hidden
    td.style.overflow = 'hidden';
    td.style.height = '120px';
    await sleep(80);
    out.C_taskViewRowResized = measure('C 任务视图(拖过行高)', tc);

    // D. 拖过列宽、记录成固定像素宽度（可能远超容器）——溢出重灾区
    const wide = document.createElement('div');
    wide.className = 'note-content-editable';
    wide.setAttribute('contenteditable', 'true');
    wide.innerHTML = tableHtml;
    document.body.appendChild(wide);
    const wt = wide.querySelector('table.pasted-table');
    wt.style.tableLayout = 'fixed';
    wt.style.width = '2400px';
    wt.setAttribute('data-rsz-frozen', '1');
    wt.querySelectorAll('th, td').forEach((c, i) => { c.style.width = (i % 2 ? 1800 : 600) + 'px'; });
    // 等 MutationObserver 的 150ms 兜底调度跑完
    await sleep(450);
    out.D_frozenWide = measure('D 拖宽后冻结表', wide);

    out.anyOverflowBeyondWindow = [out.A_taskView, out.B_noteCard, out.C_taskViewRowResized, out.D_frozenWide]
        .filter(x => x.overflowBeyondWindow > 0).map(x => x.name);

    return JSON.stringify(out, null, 1);
})()`;

(async () => {
    const child = spawn(EDGE, [
        '--headless=new', '--disable-gpu',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(os.tmpdir(), 'edge-ovf-' + PORT),
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
    await new Promise(r => setTimeout(r, 5000));

    const res = await send('Runtime.evaluate', { expression: EXPR, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails));
    console.log(res.result.value);
    ws.close(); child.kill();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
