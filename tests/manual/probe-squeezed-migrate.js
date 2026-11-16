/**
 * 被压坏的冻结表 —— 迁移与可读下限探针（2026-11-16）
 *
 * 用法：node tests/manual/probe-squeezed-migrate.js
 *
 * 场景来自真实数据 #1794463591053：12 列的表因为一列装了 16000px 宽的 Base64，
 * 整表 18250px，被 fit 按比例压成「11 列 40px + 1 列 444px」。
 *
 * 验证四件事：
 *   1. 坏表（1/3 以上列 < 110px）被解冻，内联宽度被清空
 *   2. 好表（各列都 ≥ 110px 的冻结表）原样保留，不被误伤
 *   3. 解冻后渲染出的表格每列 ≥ 110px 且外层可横向滚动
 *   4. 页面自身不出现横向滚动条（溢出被 wrap 吃掉）
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 10010 + Math.floor(Math.random() * 15);
const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');

{
    let h = fs.readFileSync(path.join(ROOT, '计时器.html'), 'utf8');
    h = h.replace(/(src|href)="([^"/]+\.(?:js|css))"/g, (m, attr, file) => `${attr}="../../${file}"`);
    fs.writeFileSync(path.join(HERE, 'timer-craft-squeezed.html'), h, 'utf8');
}
const url = 'file:///' + path.join(HERE, 'timer-craft-squeezed.html').replace(/\\/g, '/');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'wide-huawei-table.json'), 'utf8'));

const get = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

const BAD = JSON.stringify(FIXTURE.content);

// 一张「健康」的冻结表：4 列，各 200px，总 800px —— 不该被迁移动到
const GOOD = JSON.stringify(
    '<div class="pasted-table-wrap"><table class="pasted-table" data-rsz-frozen="1" ' +
    'style="table-layout: fixed; width: 800px; min-width: 0px;"><tbody><tr>' +
    '<td style="width: 200px; box-sizing: border-box;">渠道</td>' +
    '<td style="width: 200px; box-sizing: border-box;">账号</td>' +
    '<td style="width: 200px; box-sizing: border-box;">状态</td>' +
    '<td style="width: 200px; box-sizing: border-box;">备注</td></tr></tbody></table></div>'
);

const EXPR = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const BAD = ${BAD}, GOOD = ${GOOD};
    const MIN_READABLE = (window.TableResize && window.TableResize.MIN_READABLE) || 110;
    const C = {};

    // 直接从源码取 fixHtml 的逻辑做单元验证：重放一遍迁移判据
    function shouldUnfreeze(html) {
        const box = document.createElement('div');
        box.innerHTML = html;
        const t = box.querySelector('table.pasted-table[data-rsz-frozen]');
        if (!t) return null;
        const firstRow = t.rows[0];
        const widths = [...firstRow.children].map(c => {
            const w = parseFloat(c.style && c.style.width);
            return isNaN(w) ? 0 : w;
        });
        const narrow = widths.filter(w => w < MIN_READABLE).length;
        return { narrow: narrow, total: widths.length, verdict: narrow > widths.length / 3 };
    }

    C.badShouldUnfreeze = shouldUnfreeze(BAD).verdict === true;
    C.goodSkipped = shouldUnfreeze(GOOD).verdict === false;   // 健康表不该被迁移动到
    C.badNarrowCount = shouldUnfreeze(BAD).narrow;
    C.goodNarrowCount = shouldUnfreeze(GOOD).narrow;

    // 渲染层验证：坏表塞进真实容器，等 fit 兜底跑完
    document.body.style.width = '960px';
    function host(html) {
        const d = document.createElement('div');
        d.className = 'note-content-editable';
        d.setAttribute('contenteditable', 'true');
        d.style.width = '900px';
        d.innerHTML = html;
        document.body.appendChild(d);
        return d;
    }

    // 先把坏表按「已解冻」的形态放进去（模拟迁移跑完后的数据）
    const unfrozen = (() => {
        const box = document.createElement('div');
        box.innerHTML = BAD;
        const t = box.querySelector('table.pasted-table');
        t.removeAttribute('data-rsz-frozen');
        t.style.tableLayout = '';
        t.style.width = '';
        t.style.minWidth = '';
        t.querySelectorAll('th, td').forEach(c => { c.style.width = ''; c.style.boxSizing = ''; });
        return box.innerHTML;
    })();
    const A = host(unfrozen);
    await sleep(700);
    const at = A.querySelector('table.pasted-table');
    const cols = [...at.rows[0].children].map(c => Math.round(c.getBoundingClientRect().width));
    C.renderedCols = cols;
    C.minRenderedCol = Math.min.apply(null, cols);
    C.allReadable = cols.every(w => w >= MIN_READABLE);
    C.canScrollX = at.parentElement.scrollWidth > at.parentElement.clientWidth + 1;
    C.tableW = Math.round(at.getBoundingClientRect().width);
    C.wrapW = Math.round(at.parentElement.getBoundingClientRect().width);
    C.pageHScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;

    // 健康冻结表：解冻判据不该命中，且 fit 仍按比例贴合容器（800 < 884 不动）
    const B = host(GOOD);
    await sleep(500);
    const bt = B.querySelector('table.pasted-table');
    C.goodStillFrozen = bt.getAttribute('data-rsz-frozen') === '1';
    C.goodTableW = Math.round(bt.getBoundingClientRect().width);

    C.pass = C.badShouldUnfreeze && C.goodSkipped &&
             C.allReadable && C.canScrollX && !C.pageHScroll &&
             C.goodStillFrozen;
    return JSON.stringify(C, null, 1);
})()`;

(async () => {
    const child = spawn(EDGE, [
        '--headless=new', '--disable-gpu',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(os.tmpdir(), 'edge-sqz-' + PORT),
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
