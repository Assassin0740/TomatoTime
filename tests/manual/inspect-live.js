/**
 * 连上运行中的计时器，量真实渲染状态 + 截图（2026-11-16）
 *
 * 用法：先带 --remote-debugging-port=9222 启动应用，再
 *   node tests/manual/inspect-live.js [taskId]
 *
 * 为什么必须这样：后台探针用的是自己搭的 HTML，样式上下文未必和真实窗口一致；
 * 用户看到的是「右边超出窗口」，只有在真窗口里量 .pasted-table-wrap 的
 * clientWidth / scrollWidth / 祖先 overflow 才能定位到底是哪一层没兜住。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9222;
const TASK_ID = process.argv[2] || '1794463591053';
const SHOT = path.join(__dirname, 'live-shot.png');

const get = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

const EXPR = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const TASK_ID = ${JSON.stringify(TASK_ID)};
    const out = {};

    out.window = { innerW: window.innerWidth, innerH: window.innerHeight };
    out.doc = {
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        bodyScrollW: document.body.scrollWidth
    };

    // 找到承载这条任务的元素（卡片视图的 .note-card 或表格视图的 tr）
    const all = [...document.querySelectorAll('[data-id], [data-note-id]')];
    const hit = all.filter(el => String(el.getAttribute('data-id') || el.getAttribute('data-note-id')) === String(TASK_ID));
    out.taskNodes = hit.map(el => el.className || el.tagName);

    // 不管哪条，量页面里所有 pasted-table（通常刚好一条任务在视口里）
    // 只关心真正渲染出来的（归档 tab 里的表宽是 0，会干扰判断）
    const tables = [...document.querySelectorAll('table.pasted-table')]
        .filter(t => t.getBoundingClientRect().width > 0);
    out.tableCount = tables.length;
    out.tables = tables.map((t, i) => {
        const wrap = t.parentElement;
        const tr = t.getBoundingClientRect();
        const wr = wrap ? wrap.getBoundingClientRect() : null;
        const cs = wrap ? getComputedStyle(wrap) : null;
        const firstRow = t.rows && t.rows[0];
        const cols = firstRow ? [...firstRow.children].map(c => Math.round(c.getBoundingClientRect().width)) : [];
        // 往上找哪一层真的裁掉/没裁
        let ancestors = [];
        for (let el = wrap; el && el !== document.documentElement; el = el.parentElement) {
            const s = getComputedStyle(el);
            ancestors.push({
                tag: el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
                w: Math.round(el.getBoundingClientRect().width),
                scrollW: el.scrollWidth,
                overflowX: s.overflowX,
                display: s.display
            });
            if (ancestors.length >= 6) break;
        }
        return {
            idx: i,
            tableW: Math.round(tr.width),
            tableRight: Math.round(tr.right),
            beyondWindow: Math.round(tr.right - window.innerWidth),
            wrapTag: wrap ? wrap.tagName + '.' + String(wrap.className).split(' ').join('.') : null,
            wrapW: wr ? Math.round(wr.width) : null,
            wrapClientW: wrap ? wrap.clientWidth : null,
            wrapScrollW: wrap ? wrap.scrollWidth : null,
            wrapOverflowX: cs ? cs.overflowX : null,
            wrapMaxWidth: cs ? cs.maxWidth : null,
            canScrollX: wrap ? wrap.scrollWidth > wrap.clientWidth + 1 : null,
            frozen: t.getAttribute('data-rsz-frozen'),
            squeezed: t.getAttribute('data-rsz-squeezed'),
            tableLayout: getComputedStyle(t).tableLayout,
            tableMinWidth: getComputedStyle(t).minWidth,
            cols: cols,
            narrowCols: cols.filter(w => w < 60).length,
            ancestors: ancestors
        };
    });

    // 滚动条是否真的显示（wrap 可滚动时 scrollbar 宽度）
    const firstWrap = tables[0] && tables[0].parentElement;
    out.scrollbar = firstWrap ? {
        offsetH: firstWrap.offsetHeight,
        clientH: firstWrap.clientHeight,
        scrollbarH: firstWrap.offsetHeight - firstWrap.clientHeight
    } : null;

    return JSON.stringify(out, null, 1);
})()`;

(async () => {
    const list = await get('/json');
    const t = (Array.isArray(list) ? list : []).find(x => x.type === 'page' && x.webSocketDebuggerUrl);
    if (!t) { console.log('ERR 没有可调试页面'); process.exit(1); }

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
    await send('Runtime.enable');
    await send('Page.enable');

    const res = await send('Runtime.evaluate', { expression: EXPR, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails.exception || res.exceptionDetails));
    console.log(res.result.value);

    try {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(SHOT, Buffer.from(shot.data, 'base64'));
        console.log('\nshot -> ' + SHOT);
    } catch (e) { console.log('截图失败: ' + e.message); }

    ws.close();
    process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
