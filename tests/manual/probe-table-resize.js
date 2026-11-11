/**
 * 表格自由调宽高 —— 真实页面端到端探针（2026-11-10）
 *
 * 用法：node tests/manual/probe-table-resize.js
 * 生成 tests/manual/timer-craft-resize.html（由当前 计时器.html 生成，避免用过期 DOM）。
 *
 * 检查六件事：
 *   1. TableResize 模块已加载，边缘热区光标反馈正常
 *   2. 任务表格视图：拖表头右边框 → 整列变宽 + localStorage 落盘
 *   3. 任务表格视图：拖行下边框 → 行变高 + localStorage 落盘
 *   4. applyTaskTableLayout 能把清掉内联样式的表格回放出保存的宽高
 *   5. 笔记里的粘贴表格：拖列宽 / 行高写进内联 style（随 serializeEditable 持久化）
 *   6. 双击边缘恢复默认（内联样式清空 + localStorage 条目删除）
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9950 + Math.floor(Math.random() * 40);
const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');

// 由当前主版本 HTML 生成测试页
{
    let h = fs.readFileSync(path.join(ROOT, '计时器.html'), 'utf8');
    h = h.replace(/(src|href)="([^"/]+\.(?:js|css))"/g, (m, attr, file) => `${attr}="../../${file}"`);
    fs.writeFileSync(path.join(HERE, 'timer-craft-resize.html'), h, 'utf8');
}
const url = 'file:///' + path.join(HERE, 'timer-craft-resize.html').replace(/\\/g, '/');

const get = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

const EXPR = `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const out = { checks: {} };
    const C = out.checks;

    // 1) 模块加载（附带原始诊断值）
    C.diagModule = {
        w: String(typeof window.TableResize),
        hit: window.TableResize ? String(typeof window.TableResize.hitTest) : 'n/a',
        apply: window.TableResize ? String(typeof window.TableResize.applyTaskTableLayout) : 'n/a'
    };
    C.moduleLoaded = typeof window.TableResize === 'object' &&
        typeof window.TableResize.hitTest === 'function' &&
        typeof window.TableResize.applyTaskTableLayout === 'function';

    // 切到表格视图（默认卡片视图，容器 display:none 拿不到坐标）
    try {
        if (typeof toggleView === 'function') { toggleView('table'); C.toggleCalled = true; }
        else C.toggleType = String(typeof toggleView);
    } catch (e) { C.toggleErr = String(e && e.message); }
    await sleep(400);

    const table = document.querySelector('table.task-table');
    const th = table.querySelector('thead th');
    // 表格可能在视口外 / 容器内滚动位置不为 0，先滚到可见再量坐标
    table.scrollIntoView({ block: 'center' });
    await sleep(150);
    C.tableViewShown = getComputedStyle(table.closest('.table-view-container')).display !== 'none';
    const r = th.getBoundingClientRect();
    C.thRect = [Math.round(r.width), Math.round(r.height), Math.round(r.top), Math.round(r.left)];

    /** 在真实坐标上派发鼠标序列（直接派发到目标元素，冒泡到 document 即可触发委托监听） */
    async function drag(targetEl, from, to) {
        const mk = (t, x, y) => new MouseEvent(t, {
            bubbles: true, cancelable: true, button: 0,
            buttons: t === 'mouseup' ? 0 : 1, clientX: x, clientY: y
        });
        targetEl.dispatchEvent(mk('mousedown', from.x, from.y));
        await sleep(30);
        document.dispatchEvent(mk('mousemove', to.x, to.y));
        await sleep(30);
        document.dispatchEvent(mk('mouseup', to.x, to.y));
        await sleep(50);
    }

    // 光标反馈：悬停在右边框热区
    th.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.right - 2, clientY: r.top + 5 }));
    await sleep(80);
    C.cursorOnEdge = document.body.style.cursor === 'col-resize';
    document.body.style.cursor = '';

    // 2) 拖表头第 1 列右边框 +90px
    const wBefore = th.getBoundingClientRect().width;
    const th2 = table.querySelectorAll('thead th')[1];
    const w2Before = th2.getBoundingClientRect().width;
    await drag(th, { x: r.right - 2, y: r.top + 8 }, { x: r.right + 88, y: r.top + 8 });
    const wAfter = th.getBoundingClientRect().width;
    const thCells = [th, ...table.querySelectorAll('tbody tr td:first-child')];
    C.colDrag = {
        widthChanged: Math.abs(wAfter - (wBefore + 90)) < 6,
        allCellsTagged: thCells.every(c => c.style.width && c.style.width.endsWith('px')),
        saved: (() => { try { return JSON.parse(localStorage.getItem('taskTableLayout.v1') || '{}'); } catch (e) { return {}; } })()
    };
    C.colDrag.savedCol0 = C.colDrag.saved.colWidths && C.colDrag.saved.colWidths['0'] > 0;

    // 3) 注入一行任务，拖行下边框 +50px
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr data-note-id="888"><td>测试任务A</td><td>中</td><td>短期</td><td></td><td>未完成</td><td>x</td><td>-</td><td>b</td></tr>';
    const tr = tbody.querySelector('tr');
    const rr = tr.getBoundingClientRect();
    // mousedown 必须落在单元格上（委托用 closest('th,td') 只向上找，tr 自身不算）
    await drag(tr.children[0], { x: rr.left + 20, y: rr.bottom - 2 }, { x: rr.left + 20, y: rr.bottom + 48 });
    const hAfter = tr.getBoundingClientRect().height;
    C.rowDrag = {
        heightChanged: hAfter > rr.height + 30,
        overflowHidden: tr.children[0].style.overflow === 'hidden',
        savedRow: (() => { const s = C.colDrag.saved; const now = (() => { try { return JSON.parse(localStorage.getItem('taskTableLayout.v1') || '{}'); } catch (e) { return {}; } })(); return now.rowHeights && now.rowHeights['888'] > 0; })()
    };

    // 4) 清掉内联样式后 applyTaskTableLayout 回放
    tr.style.height = '';
    [...tr.children].forEach(td => { td.style.height = ''; td.style.overflow = ''; });
    th.style.width = '';
    [...table.querySelectorAll('tbody tr td:first-child')].forEach(td => { td.style.width = ''; });
    window.TableResize.applyTaskTableLayout(table);
    await sleep(30);
    C.replay = {
        colRestored: Math.abs(th.getBoundingClientRect().width - wAfter) < 6,
        rowRestored: tr.getBoundingClientRect().height > rr.height + 30
    };

    // 5) 笔记里的粘贴表格：拖列宽 / 行高 → 内联 style（serializeEditable 持久化路径）
    const ed = document.createElement('div');
    ed.className = 'note-content-editable';
    ed.setAttribute('contenteditable', 'true');
    ed.setAttribute('data-note-id', '999999');
    const data = { rows: [['列一', '列二', '列三'], ['a', 'b', 'c'], ['d', 'e', 'f']], cols: 3, hasHeader: true };
    ed.innerHTML = window.ClipboardTable.rowsToTableHtml(data);
    document.body.appendChild(ed);
    // 第一格里塞一张高图（模拟腾讯文档整格图片），验证「行拖多高图片长多大」
    const ptImgTd = ed.querySelectorAll('tbody tr')[0].children[0];
    ptImgTd.innerHTML = '<img class="pasted-cell-img" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNjAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzQ0NSIvPjwvc3ZnPg==">';
    const pt = ed.querySelector('table.pasted-table');
    await sleep(50);
    const pth = pt.querySelectorAll('thead th')[1];
    const pr = pth.getBoundingClientRect();
    await drag(pth, { x: pr.right - 2, y: pr.top + 8 }, { x: pr.right + 60, y: pr.top + 8 });
    const ptr = pt.querySelectorAll('tbody tr')[0];
    const prr = ptr.getBoundingClientRect();
    const imgBefore = parseFloat(ptImgTd.querySelector('img').style.maxHeight) || 110;
    await drag(ptr.children[1], { x: prr.left + 30, y: prr.bottom - 2 }, { x: prr.left + 30, y: prr.bottom + 40 });
    const imgAfter = parseFloat(ptImgTd.querySelector('img').style.maxHeight) || 0;
    C.pastedTable = {
        colInline: pth.style.width.endsWith('px') && parseFloat(pth.style.width) > pr.width,
        rowInline: ptr.style.height.endsWith('px'),
        cellHeightInline: ptr.children[1].style.height.endsWith('px') && ptr.children[1].style.overflow === 'hidden',
        imgGrewWithRow: imgAfter >= imgBefore + 30,
        imgMaxHeightAfter: imgAfter,
        persistedInHtml: ed.innerHTML.includes('style=') && ed.innerHTML.includes('width:')
    };

    // 7) 真实场景：任务内容里的长 URL 表格（截图复现）——拖列必须让「渲染宽度」变宽，
    //    而不只是内联 style 变了（auto 布局下表格宽度被 min-width:100% 锁死时会「拉不动」）
    const narrow = document.createElement('div');
    narrow.className = 'note-content-editable';
    narrow.setAttribute('contenteditable', 'true');
    narrow.style.width = '520px';
    const longRows = [
        ['渠道', '链接', '账号', '密码', '输入链接指引'],
        ['oppo', 'http://open.oppomobile.com/new/developmentDoc/mobile', 'Shjyg uo 音,', 'Myjg 2502', 'OPPO小游戏开发者文档'],
        ['vivo', 'https://dev.vivo.com.cn/documentCenter/doc/251', 'Yiguo @13k', 'Myjg 2502', 'https://dev.vivo.com.cn/documentCenter/doc/251'],
        ['华为', 'https://developer.huawei.com/consumer/cn/doc/quickgame-rev', 'Shjyg uo 音,', 'Myjg 2502', 'https://developer.huawei.com/consumer/cn/doc']
    ];
    narrow.innerHTML = window.ClipboardTable.rowsToTableHtml({ rows: longRows, cols: 5, hasHeader: true });
    document.body.appendChild(narrow);
    await sleep(80);
    const nt = narrow.querySelector('table.pasted-table');
    const linkTh = nt.querySelectorAll('thead th')[1];
    const linkTd = nt.querySelectorAll('tbody tr td')[1];
    const linkWBefore = linkTh.getBoundingClientRect().width;
    const ntr = linkTh.getBoundingClientRect();
    await drag(linkTh, { x: ntr.right - 2, y: ntr.top + 6 }, { x: ntr.right + 118, y: ntr.top + 6 });
    const linkWAfter = linkTh.getBoundingClientRect().width;
    C.narrowTable = {
        renderedGrew: linkWAfter - linkWBefore >= 50,
        widthBefore: Math.round(linkWBefore),
        widthAfter: Math.round(linkWAfter),
        tableLayout: getComputedStyle(nt).tableLayout
    };

    // 7b) 完全复刻截图场景：表格视图里的一条任务，第一个 td 里有 .table-content + 长 URL 粘贴表
    const taskTr = document.createElement('tr');
    taskTr.setAttribute('data-note-id', '666');
    const tcTd = document.createElement('td');
    tcTd.setAttribute('style', 'text-align: left; vertical-align: top;');
    const tcDiv = document.createElement('div');
    tcDiv.className = 'table-content';
    tcDiv.setAttribute('contenteditable', 'true');
    tcDiv.innerHTML = window.ClipboardTable.rowsToTableHtml({ rows: longRows, cols: 5, hasHeader: true });
    tcTd.appendChild(tcDiv);
    taskTr.appendChild(tcTd);
    tbody.appendChild(taskTr);
    await sleep(100);
    const it = tcDiv.querySelector('table.pasted-table');
    const ith = it.querySelectorAll('thead th')[1];
    const ib = ith.getBoundingClientRect();
    await drag(ith, { x: ib.right - 2, y: ib.top + 4 }, { x: ib.right + 118, y: ib.top + 4 });
    const ia = ith.getBoundingClientRect();
    C.taskViewInnerTable = {
        renderedGrew: (ia.width - ib.width) >= 50,
        widthBefore: Math.round(ib.width),
        widthAfter: Math.round(ia.width),
        inlineWidth: ith.style.width || '(none)',
        tableLayout: getComputedStyle(it).tableLayout,
        tableWidthStyle: it.style.width || '(none)',
        wrapClientW: it.parentElement.clientWidth,
        tableScrollW: it.scrollWidth,
        tdOverflow: getComputedStyle(tcTd).overflow,
        tcOverflow: getComputedStyle(tcDiv).overflow
    };

    // 6) 双击边缘恢复默认（列已变宽，必须重新量 rect）
    //    任务表格第 1 列
    await sleep(30);
    const r2 = th.getBoundingClientRect();
    const edge = { x: r2.right - 2, y: r2.top + 8 };
    const mk2 = (t, x, y) => new MouseEvent(t, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
    th.dispatchEvent(mk2('mousedown', edge.x, edge.y));
    await sleep(20);
    document.dispatchEvent(mk2('mouseup', edge.x, edge.y));
    await sleep(20);
    th.dispatchEvent(mk2('mousedown', edge.x, edge.y));
    await sleep(20);
    document.dispatchEvent(mk2('mouseup', edge.x, edge.y));
    await sleep(20);
    th.dispatchEvent(mk2('dblclick', edge.x, edge.y));
    await sleep(50);    const savedNow = (() => { try { return JSON.parse(localStorage.getItem('taskTableLayout.v1') || '{}'); } catch (e) { return {}; } })();
    C.resetCol = {
        inlineCleared: !th.style.width,
        storageCleared: !(savedNow.colWidths && savedNow.colWidths['0'])
    };

    return JSON.stringify(out, null, 1);
})()`;

(async () => {
    const child = spawn(EDGE, [
        '--headless=new', '--disable-gpu',
        '--remote-debugging-port=' + PORT,
        '--user-data-dir=' + path.join(os.tmpdir(), 'edge-rs-' + PORT),
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

    // 截一张拖拽后的表格视图
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(HERE, 'shot-table-resize.png'), Buffer.from(shot.data, 'base64'));

    console.log(JSON.stringify(out, null, 1));

    const C = out.checks;
    const pass =
        C.moduleLoaded && C.cursorOnEdge &&
        C.colDrag && C.colDrag.widthChanged && C.colDrag.allCellsTagged && C.colDrag.savedCol0 &&
        C.rowDrag && C.rowDrag.heightChanged && C.rowDrag.overflowHidden && C.rowDrag.savedRow &&
        C.replay && C.replay.colRestored && C.replay.rowRestored &&
        C.pastedTable && C.pastedTable.colInline && C.pastedTable.rowInline &&
        C.pastedTable.cellHeightInline && C.pastedTable.persistedInHtml && C.pastedTable.imgGrewWithRow &&
        C.narrowTable && C.narrowTable.renderedGrew &&
        C.resetCol && C.resetCol.inlineCleared && C.resetCol.storageCleared;

    console.log(pass ? '\nALL PASS ✓' : '\nFAIL ✗');
    ws.close();
    child.kill();
    process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
