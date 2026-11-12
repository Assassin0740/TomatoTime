/**
 * 表格尺寸命令行 —— 端到端探针（2026-11-12）
 *
 * 用一个假 API（零依赖 http）模拟主进程，真实调用 `node timer-cli.js table …`，
 * 验证三件事：
 *   1. CLI 打出的请求体正是渲染进程要的形状（action / index / width / cols / rows）
 *   2. CLI 的输出文本能把「行数 × 列数 / 列宽 / 行高」讲清楚
 *   3. table view 的三个动作（读 / 写 / 重置）都打到 /api/table-view
 *
 * 用法：node tests/manual/probe-table-cli.js
 */
const http = require('http');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(ROOT, 'timer-cli.js');
const PORT = 17880 + Math.floor(Math.random() * 8);

const received = [];
const TABLE = {
    rows: 3, cols: 4, hasSpan: false, frozen: true, width: '900px', tableLayout: 'fixed',
    hasHead: true, colWidths: [120, 270, 240, 270], rowHeights: [null, 60, null]
};

const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => {
        const body = raw ? JSON.parse(raw) : {};
        received.push({ method: req.method, url: req.url, body: body });
        const json = obj => {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(obj));
        };
        if (req.url.indexOf('/api/table-view') === 0) {
            if (req.method === 'GET') return json({ ok: true, action: 'info', layout: { colWidths: { '2': 300 }, rowHeights: {} } });
            const layout = { colWidths: body.colWidths || {}, rowHeights: body.rowHeights || {} };
            return json({ ok: true, action: body.action || 'set', layout: layout });
        }
        const m = req.url.match(/^\/api\/tasks\/(\d+)\/table/);
        if (m) {
            if (req.method === 'GET') return json({ ok: true, id: Number(m[1]), action: 'info', count: 1, tables: [TABLE] });
            return json({ ok: true, id: Number(m[1]), action: body.action, count: 1, tables: [TABLE],
                at: body.at, rows: 3, cols: 2, hasHeader: !!body.head });
        }
        if (req.url.indexOf('/api/tasks?') === 0) {
            const tasks = [
                { id: 1792651868602, content: '带表的任务 <table><tr><td>a</td></tr></table>', p: 3, type: 'short' },
                { id: 1792651859171, content: '普通任务', p: 1, type: 'short' }
            ];
            return json({ ok: true, total: 7, count: tasks.length, tasks: tasks });
        }
        if (req.url.indexOf('/api/health') === 0) {
            return json({ ok: true, version: '0.0.0', timer: { isRunning: false, isWorking: true, currentTime: 0 }, floatWindowOpen: false });
        }
        json({ ok: true });
    });
});

function run(args) {
    return new Promise(resolve => {
        execFile(process.execPath, [CLI].concat(args, ['--port', String(PORT), '--token', '']),
            { cwd: ROOT, env: Object.assign({}, process.env) }, (err, stdout, stderr) => {
                resolve({ out: (stdout || '') + (stderr || ''), code: err ? err.code : 0 });
            });
    });
}

(async () => {
    await new Promise(r => server.listen(PORT, '127.0.0.1', r));
    const checks = {}, diag = {};

    // 1) table info
    const info = await run(['table', 'info', '1792651868602']);
    diag.infoOut = info.out.trim();
    checks.infoShowsShape = info.out.indexOf('3 行 × 4 列') !== -1;
    checks.infoShowsCols = info.out.indexOf('120px / 270px / 240px / 270px') !== -1;
    checks.infoShowsRows = info.out.indexOf('行高：- / 60px / -') !== -1;
    checks.infoShowsFrozen = info.out.indexOf('固定布局') !== -1;

    // 2) table set
    const set = await run(['table', 'set', '1792651868602', '--width', '900',
        '--cols', '120,240,*', '--rows', '2=60,3=80', '--index', '0']);
    const setReq = received.filter(r => r.method === 'POST' && /\/table$/.test(r.url)).pop();
    diag.setBody = setReq && setReq.body;
    checks.setUrlId = !!(setReq && setReq.url === '/api/tasks/1792651868602/table');
    checks.setAction = !!(setReq && setReq.body.action === 'set');
    checks.setWidth = !!(setReq && setReq.body.width === '900');
    checks.setCols = !!(setReq && setReq.body.cols === '120,240,*');
    checks.setRows = !!(setReq && JSON.stringify(setReq.body.rows) === JSON.stringify([{ row: 2, height: 60 }, { row: 3, height: 80 }]));
    checks.setPrintsResult = set.out.indexOf('已更新任务 #1792651868602') !== -1;

    // 3) table auto
    const auto = await run(['table', 'auto', '1792651868602']);
    const autoReq = received.filter(r => r.method === 'POST' && /\/table$/.test(r.url)).pop();
    diag.autoBody = autoReq && autoReq.body;
    checks.autoAction = !!(autoReq && autoReq.body.action === 'auto' && autoReq.body.auto === true && autoReq.body.width === undefined);

    // 4) table view 读 / 写 / 重置
    const view = await run(['table', 'view']);
    diag.viewOut = view.out.trim();
    checks.viewReads = view.out.indexOf('列号从 0 开始') !== -1 && view.out.indexOf('2=300px') !== -1;

    const viewSet = await run(['table', 'view', '--col', '3=200', '--row', '1792651868602=80']);
    const viewReq = received.filter(r => r.url.indexOf('/api/table-view') === 0 && r.method === 'POST').pop();
    diag.viewSetBody = viewReq && viewReq.body;
    checks.viewSetCols = !!(viewReq && viewReq.body.colWidths && viewReq.body.colWidths['3'] === '200');
    checks.viewSetRows = !!(viewReq && viewReq.body.rowHeights && viewReq.body.rowHeights['1792651868602'] === '80');
    checks.viewSetPrinted = viewSet.out.indexOf('列宽') !== -1 || viewSet.out.indexOf('行高') !== -1;

    const viewReset = await run(['table', 'view', '--reset']);
    const resetReq = received.filter(r => r.url.indexOf('/api/table-view') === 0 && r.method === 'POST').pop();
    checks.viewReset = !!(resetReq && resetReq.body.action === 'reset');
    checks.viewResetPrinted = viewReset.out.indexOf('已恢复默认') !== -1;

    // 5) 报错要说人话
    const bad = await run(['table', 'info']);
    checks.missingIdHint = bad.out.indexOf('缺少任务 id') !== -1;

    // 6) table add —— 插一张新表
    const add = await run(['table', 'add', '1792651868602', '--head', '渠道,账号',
        '--data', 'oppo|cat;vivo|cat2', '--at', 'start', '--width', '900']);
    const addReq = received.filter(r => r.method === 'POST' && /\/table$/.test(r.url)).pop();
    diag.addBody = addReq && addReq.body;
    checks.addAction = !!(addReq && addReq.body.action === 'insert');
    checks.addHead = !!(addReq && JSON.stringify(addReq.body.head) === JSON.stringify(['渠道', '账号']));
    checks.addData = !!(addReq && JSON.stringify(addReq.body.data) === JSON.stringify([['oppo', 'cat'], ['vivo', 'cat2']]));
    checks.addAt = !!(addReq && addReq.body.at === 'start');
    checks.addWidth = !!(addReq && addReq.body.width === '900');
    checks.addPrinted = add.out.indexOf('开头插入 3 行 × 2 列') !== -1;

    // --cols 纯数字 = 列数；--cols 120,240,* = 列宽（同一个参数不能既当数量又当尺寸）
    const addCount = await run(['table', 'add', '1', '--cols', '3', '--rows', '2']);
    const countBody = received.filter(r => r.method === 'POST' && /\/table$/.test(r.url)).pop().body;
    diag.addCountBody = countBody;
    checks.addColsAsCount = countBody.cols === 3 && countBody.colWidths === undefined;
    checks.addRowsAsCount = countBody.rows === 2;

    const addWidths = await run(['table', 'add', '1', '--cols', '120,240,*']);
    const widthsBody = received.filter(r => r.method === 'POST' && /\/table$/.test(r.url)).pop().body;
    checks.addColsAsWidths = widthsBody.colWidths === '120,240,*' && widthsBody.cols === undefined;

    const addRowsBad = await run(['table', 'add', '1', '--rows', '2=60']);
    checks.addRowsRejected = addRowsBad.out.indexOf('只能给行数') !== -1;

    // 7) query —— 只看打出去的 URL 参数对不对
    const q = await run(['query', '--project', '拯救小猫', '-p', 'high', '--has-table',
        '--from', '2026-11-01', '--to', '2026-11-12', '--sort', 'priority', '--order', 'desc', '--limit', '5']);
    const qUrl = received.filter(r => r.url.indexOf('/api/tasks?') === 0).pop().url;
    const qp = new URL(qUrl, 'http://x').searchParams;
    diag.queryUrl = qUrl;
    checks.queryProject = qp.get('project') === '拯救小猫';
    checks.queryPriority = qp.get('priority') === 'high';
    checks.queryHasTable = qp.get('hasTable') === 'true';
    checks.queryFrom = qp.get('from') === '2026-11-01' && qp.get('to') === '2026-11-12';
    checks.querySort = qp.get('sort') === 'priority' && qp.get('order') === 'desc';
    checks.queryLimit = qp.get('limit') === '5';
    checks.queryPrinted = q.out.indexOf('#1792651868602') !== -1 && q.out.indexOf('共 2 条') !== -1;

    const qDone = await run(['query', '--done', '--no-table']);
    const dp = new URL(received.filter(r => r.url.indexOf('/api/tasks?') === 0).pop().url, 'http://x').searchParams;
    checks.queryDoneFlag = dp.get('done') === 'true' && dp.get('hasTable') === 'false';

    const qCount = await run(['query', '--count']);
    checks.queryCount = qCount.out.trim() === '7';

    const qIds = await run(['query', '--only-ids']);
    checks.queryIds = qIds.out.trim() === '1792651868602,1792651859171';

    // 8) doctor —— 对假 API 也能跑通（读的是真实数据文件，只读）
    const doc = await run(['doctor']);
    diag.doctorOut = doc.out.trim().split('\n').slice(-3).join(' | ');
    checks.doctorApiOk = doc.out.indexOf('API 在线') !== -1;
    checks.doctorHasData = /任务 \d+ 条（归档 \d+/.test(doc.out) && /结论：/.test(doc.out);
    checks.doctorExitOk = doc.code === 0;

    const failed = Object.keys(checks).filter(k => checks[k] !== true);
    console.log(JSON.stringify({ pass: failed.length === 0, failed: failed, checks: checks, diag: diag }, null, 1));
    server.close();
    process.exit(failed.length ? 1 : 0);
})();
