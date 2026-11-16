/**
 * 超宽表格（含超长 Base64 / URL 列）—— 复现探针（2026-11-16）
 *
 * 用法：node tests/manual/probe-wide-table.js
 *
 * 用户反馈第二轮「宽度还是有问题」，截图里 12 列表格被压成一列一列的字，
 * 右侧仍被切掉。夹具是真实任务 #1794463591053 的 content
 * （tests/manual/fixtures/wide-huawei-table.json，18250px / 单列 16420px）。
 *
 * 量化四件事：
 *   1. 现状：fit 兜底跑完后表宽 / 各列宽 / 可读性（列宽 < 60px 即不可读）
 *   2. 解冻后 auto 布局下浏览器自然宽度（会不会撑破容器、能否横向滚动）
 *   3. 给单元格加 overflow-wrap:anywhere 之后，auto 布局宽度（长 token 能否断行）
 *   4. 极端比例 fit（把 16420 那列按比例压）后每列还剩多少 —— 解释「字竖成一列」
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9980 + Math.floor(Math.random() * 15);
const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');

{
    let h = fs.readFileSync(path.join(ROOT, '计时器.html'), 'utf8');
    h = h.replace(/(src|href)="([^"/]+\.(?:js|css))"/g, (m, attr, file) => `${attr}="../../${file}"`);
    fs.writeFileSync(path.join(HERE, 'timer-craft-wide.html'), h, 'utf8');
}
const url = 'file:///' + path.join(HERE, 'timer-craft-wide.html').replace(/\\/g, '/');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'wide-huawei-table.json'), 'utf8'));

const get = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

const html = JSON.stringify(FIXTURE.content);

const EXPR = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const HTML = ${html};
    const READABLE = 60;   // 列宽低于此值，长文本就竖成一列字

    function snap(host, label) {
        const t = host.querySelector('table.pasted-table');
        const wrap = t.parentElement;
        const tr = t.getBoundingClientRect();
        const firstRow = t.rows[0];
        const widths = [...firstRow.children].map(c => Math.round(c.getBoundingClientRect().width));
        return {
            label: label,
            tableW: Math.round(tr.width),
            tableRight: Math.round(tr.right),
            windowW: window.innerWidth,
            beyondWindow: Math.round(tr.right - window.innerWidth),
            wrapW: Math.round(wrap.getBoundingClientRect().width),
            wrapScrollW: wrap.scrollWidth,
            canScrollX: wrap.scrollWidth > wrap.clientWidth + 1,
            frozen: t.getAttribute('data-rsz-frozen') === '1',
            cols: widths,
            narrowCols: widths.filter(w => w < READABLE).length,
            layout: t.style.tableLayout || getComputedStyle(t).tableLayout
        };
    }

    function host(extraCss) {
        const d = document.createElement('div');
        d.className = 'note-content-editable';
        d.setAttribute('contenteditable', 'true');
        d.style.width = '900px';          // 模拟真实笔记列宽
        d.innerHTML = HTML;
        if (extraCss) {
            const s = document.createElement('style');
            s.textContent = extraCss;
            d.appendChild(s);
        }
        document.body.appendChild(d);
        return d;
    }

    const out = {};
    document.body.style.width = '960px';

    // 1) 现状：原样塞进去，等 MutationObserver 的 150ms fit 兜底
    const A = host();
    await sleep(600);
    out['1_现状_fit兜底后'] = snap(A, '现状');

    // 2) 解冻：交还 auto 布局，看浏览器自然宽度
    const B = host();
    const bt = B.querySelector('table.pasted-table');
    bt.removeAttribute('data-rsz-frozen');
    bt.style.tableLayout = '';
    bt.style.width = '';
    bt.querySelectorAll('th,td').forEach(c => { c.style.width = ''; c.style.boxSizing = ''; });
    await sleep(400);
    out['2_解冻_auto布局'] = snap(B, '解冻');

    // 3) 解冻 + 长 token 可断行
    const C = host('.note-content-editable .pasted-table td, .note-content-editable .pasted-table th { overflow-wrap: anywhere; word-break: break-word; }');
    const ct = C.querySelector('table.pasted-table');
    ct.removeAttribute('data-rsz-frozen');
    ct.style.tableLayout = '';
    ct.style.width = '';
    ct.querySelectorAll('th,td').forEach(c => { c.style.width = ''; c.style.boxSizing = ''; });
    await sleep(400);
    out['3_解冻_可断行'] = snap(C, '断行');


    // 5) 去掉 max-width:100%，表格用 max-content 自然宽 + min-width 铺满
    const D = host('.note-content-editable .pasted-table { max-width: none !important; width: max-content !important; min-width: 100%; }');
    const dt = D.querySelector('table.pasted-table');
    dt.removeAttribute('data-rsz-frozen');
    dt.style.tableLayout = '';
    dt.style.maxWidth = 'none';
    dt.style.width = 'max-content';
    dt.querySelectorAll('th,td').forEach(c => { c.style.width = ''; c.style.boxSizing = ''; });
    await sleep(400);
    out['5_maxcontent自然宽'] = snap(D, '自然宽');

    // 6) 冻结表 fit 后出现大量窄列 -> 应解冻（候选修法的效果预演）
    const E = host();
    const et = E.querySelector('table.pasted-table');
    et.removeAttribute('data-rsz-frozen');
    et.style.tableLayout = '';
    et.style.width = '';
    et.style.maxWidth = 'none';
    et.querySelectorAll('th,td').forEach(c => { c.style.width = ''; c.style.boxSizing = ''; });
    await sleep(400);
    out['6_解冻加natural'] = snap(E, '解冻+natural');

    // 4) 极端比例：16420 那列占 90% 时按比例 fit 的后果
    const total = 18250, avail = 900;
    const ratio = avail / total;
    const raw = [368, 435, 250, 132, 16420, 46, 46, 370, 46, 46, 46, 46];
    const scaled = raw.map(w => Math.max(40, Math.round(w * ratio)));
    out['4_极端比例缩放后'] = {
        scaled: scaled,
        narrow: scaled.filter(w => w < READABLE).length,
        widest: Math.max(...scaled)
    };

    // 页面本身是否被撑出横向滚动条（wrap 的 overflow-x:auto 应该兜住）
    out.pageOverflow = {
        docScrollW: document.documentElement.scrollWidth,
        docClientW: document.documentElement.clientWidth,
        bodyScrollW: document.body.scrollWidth,
        hasPageHScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };

    out.verdict = {
        fittedStillHasNarrowCols: out['1_现状_fit兜底后'].narrowCols,
        unfrozenTableW: out['2_解冻_auto布局'].tableW,
        unfrozenBeyondWindow: out['2_解冻_auto布局'].beyondWindow,
        unfrozenCanScroll: out['2_解冻_auto布局'].canScrollX,
        brokeLineTableW: out['3_解冻_可断行'].tableW,
        brokeLineBeyondWindow: out['3_解冻_可断行'].beyondWindow,
        brokeLineNarrowCols: out['3_解冻_可断行'].narrowCols,
        naturalTableW: out['5_maxcontent自然宽'].tableW,
        naturalCanScroll: out['5_maxcontent自然宽'].canScrollX,
        naturalNarrowCols: out['5_maxcontent自然宽'].narrowCols
    };
    return JSON.stringify(out, null, 1);
})()`;

(async () => {
    const child = spawn(EDGE, [
        '--headless=new', '--disable-gpu',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(os.tmpdir(), 'edge-wide-' + PORT),
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
    await new Promise(r => setTimeout(r, 6000));

    const res = await send('Runtime.evaluate', { expression: EXPR, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails));
    console.log(res.result.value);
    ws.close(); child.kill();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
