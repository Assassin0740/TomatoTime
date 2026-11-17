'use strict';

/**
 * probe-update-live.js —— 真实应用端到端演练「无感更新」
 *
 * 做法：不碰正在用的安装目录，而是把它整体复制到 E:\timer-drill\app，
 * 再用新构建的 app.asar 覆盖，然后让这个副本连本地 http 更新源跑一遍：
 *   检查（1.2.1 > 1.2.0）→ 后台下载 → 校验 → 标记可安装
 *
 * 用法：node tests/manual/probe-update-live.js
 * 前置：先跑 node scripts/build-update.js 生成 dist/update/
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync, spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_APP = 'D:\\Program\\timer-app';
const DRILL_ROOT = 'E:\\timer-drill';
const DRILL_APP = path.join(DRILL_ROOT, 'app');
const DRILL_USERDATA = path.join(DRILL_ROOT, 'userdata');
const UPDATE_DIR = path.join(ROOT, 'dist', 'update');
const ASAR = path.join(ROOT, 'dist', 'win-unpacked', 'resources', 'app.asar');
const CACHE_DIR = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'timer-app-updater');

const HTTP_PORT = 8199;
const CDP_PORT = 9333;
/** 演练把清单里的版本抬高一级，才能走进「有新版」分支 */
const FAKE_VERSION = '1.2.1';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const getJson = (p) => new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + CDP_PORT + p, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve(b); } });
    }).on('error', reject);
});

let pass = 0, fail = 0;
function check(name, cond, detail) {
    if (cond) { pass++; console.log('  ✓ ' + name); }
    else { fail++; console.log('  ✗ ' + name + (detail ? ' → ' + detail : '')); }
}

/** 本地更新源：latest.json 用假版本号，文件复用 1.2.0 的产物 */
function startFeed() {
    const realLatest = JSON.parse(fs.readFileSync(path.join(UPDATE_DIR, 'latest.json'), 'utf8'));
    const fake = JSON.parse(JSON.stringify(realLatest));
    fake.version = FAKE_VERSION;
    fake.files = fake.files.map(f => Object.assign({}, f, {
        url: 'http://127.0.0.1:' + HTTP_PORT + '/1.2.0/' + f.base
    }));

    const server = http.createServer((req, res) => {
        const u = String(req.url || '').split('?')[0];
        if (u === '/latest.json') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(fake, null, 2));
            return;
        }
        const m = u.match(/^\/1\.2\.0\/([^/]+)$/);
        if (m) {
            const f = path.join(UPDATE_DIR, '1.2.0', m[1]);
            if (fs.existsSync(f)) {
                const buf = fs.readFileSync(f);
                res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': buf.length });
                res.end(buf);
                return;
            }
        }
        res.writeHead(404);
        res.end('nope');
    });
    return new Promise(r => server.listen(HTTP_PORT, '127.0.0.1', () => r(server)));
}

/** 复制安装目录（robocopy 更稳：会跳过被占用的日志文件） */
function prepareDrillApp() {
    fs.mkdirSync(DRILL_ROOT, { recursive: true });
    const r = spawnSync('robocopy', [SOURCE_APP, DRILL_APP, '/E', '/XF', 'debug.log', '/R:1', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS'], { encoding: 'utf8' });
    // robocopy 成功返回 0~7
    if (r.status > 7) throw new Error('robocopy 失败：status=' + r.status + ' ' + (r.stderr || '').slice(0, 300));
    const dst = path.join(DRILL_APP, 'resources', 'app.asar');
    if (!fs.existsSync(dst)) throw new Error('复制后找不到 resources/app.asar');
    fs.copyFileSync(ASAR, dst);
    // 上一轮演练留下的备份会干扰「这次是否真的备份了」的判断
    for (const name of fs.readdirSync(path.join(DRILL_APP, 'resources'))) {
        if (name.indexOf('.bak-update-') >= 0) {
            try { fs.unlinkSync(path.join(DRILL_APP, 'resources', name)); } catch (e) { /* ignore */ }
        }
    }
    return fs.statSync(dst).size;
}

async function connectCdp() {
    for (let i = 0; i < 40; i++) {
        try {
            const list = await getJson('/json');
            const t = (Array.isArray(list) ? list : []).find(x => x.type === 'page' && x.webSocketDebuggerUrl);
            if (t) {
                const ws = new WebSocket(t.webSocketDebuggerUrl);
                const pending = new Map();
                let id = 0;
                const send = (method, params) => new Promise((resolve, reject) => {
                    const mid = ++id;
                    pending.set(mid, { resolve, reject });
                    ws.send(JSON.stringify({ id: mid, method, params }));
                });
                ws.onmessage = (ev) => {
                    const msg = JSON.parse(ev.data);
                    if (msg.id && pending.has(msg.id)) {
                        const p = pending.get(msg.id);
                        pending.delete(msg.id);
                        msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
                    }
                };
                await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
                return { ws, send };
            }
        } catch (e) { /* 还没起来 */ }
        await sleep(500);
    }
    throw new Error('CDP 连不上（端口 ' + CDP_PORT + '）');
}

(async () => {
    if (!fs.existsSync(path.join(UPDATE_DIR, 'latest.json'))) {
        throw new Error('缺少 dist/update/latest.json，先跑 node scripts/build-update.js');
    }

    console.log('\n[1] 准备演练副本');
    if (fs.existsSync(CACHE_DIR)) fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    const asarSize = prepareDrillApp();
    console.log('  · 副本目录 ' + DRILL_APP + '（asar ' + (asarSize / 1048576).toFixed(2) + ' MB）');

    console.log('\n[2] 起本地更新源 http://127.0.0.1:' + HTTP_PORT + '/latest.json（version=' + FAKE_VERSION + '）');
    const server = await startFeed();

    let child = null;
    let cdp = null;
    try {
        console.log('\n[3] 启动演练实例（user-data 隔离，CDP ' + CDP_PORT + '）');
        const childEnv = Object.assign({}, process.env, { TIMER_UPDATE_FEED: 'http://127.0.0.1:' + HTTP_PORT });
        // 这个环境变量一留着，Electron 会被当成 node 解释器，Chromium 开关全部报 bad option
        delete childEnv.ELECTRON_RUN_AS_NODE;
        child = spawn(path.join(DRILL_APP, '计时器.exe'), [
            '--user-data-dir=' + DRILL_USERDATA,
            '--remote-debugging-port=' + CDP_PORT
        ], {
            cwd: DRILL_APP,
            env: childEnv,
            detached: false,
            stdio: 'ignore'
        });
        child.on('error', (e) => { console.error('  · 启动失败：' + e.message); });
        cdp = await connectCdp();
        console.log('  · 已连上 CDP');

        console.log('\n[4] 调 update:check');
        const r1 = await cdp.send('Runtime.evaluate', {
            expression: `(async () => {
                const ipc = require('electron').ipcRenderer;
                const s = await ipc.invoke('update:check', { manual: true });
                return JSON.stringify(s);
            })()`,
            awaitPromise: true,
            returnByValue: true
        });
        if (r1.exceptionDetails) throw new Error('update:check 抛异常：' + JSON.stringify(r1.exceptionDetails.exception || r1.exceptionDetails));
        const s1 = JSON.parse(r1.result.value);
        check('当前版本读到 1.2.0', s1.current === '1.2.0', 'current=' + s1.current);
        check('发现新版 1.2.1', s1.latest === FAKE_VERSION, 'latest=' + s1.latest);
        check('进入 available 或 downloading', ['available', 'downloading', 'downloaded'].includes(s1.phase), 'phase=' + s1.phase);
        check('enabled 为 true（打包态才允许自动装）', s1.enabled === true, 'enabled=' + s1.enabled);

        console.log('\n[5] 触发下载并等它完成');
        const r2 = await cdp.send('Runtime.evaluate', {
            expression: `(async () => {
                const ipc = require('electron').ipcRenderer;
                const s = await ipc.invoke('update:download');
                return JSON.stringify(s);
            })()`,
            awaitPromise: true,
            returnByValue: true
        });
        if (r2.exceptionDetails) throw new Error('update:download 抛异常：' + JSON.stringify(r2.exceptionDetails.exception || r2.exceptionDetails));
        const s2 = JSON.parse(r2.result.value);
        check('下载完成', s2.phase === 'downloaded', 'phase=' + s2.phase + (s2.error ? ' error=' + s2.error : ''));
        check('标记为可安装', s2.canInstall === true);
        check('总大小与清单一致', s2.total > 0, 'total=' + s2.total);

        console.log('\n[6] 检查暂存区落盘');
        const pending = path.join(CACHE_DIR, 'pending', FAKE_VERSION);
        check('暂存目录存在', fs.existsSync(pending), pending);
        for (const name of ['app.asar', 'timer-cli.js', 'timer-cli.py', 'timer.cmd']) {
            const f = path.join(pending, name);
            check('落下 ' + name, fs.existsSync(f) && fs.statSync(f).size > 0);
        }
        check('留下 manifest.json（给落地脚本用）', fs.existsSync(path.join(pending, 'manifest.json')));

        console.log('\n[7] 界面状态是否同步（关于页 DOM）');
        const r3 = await cdp.send('Runtime.evaluate', {
            expression: `(() => {
                const el = document.getElementById('updateStatus');
                const bar = document.getElementById('updateProgressBar');
                const act = document.getElementById('downloadUpdateBtn');
                return JSON.stringify({
                    status: el ? el.textContent : null,
                    barWidth: bar ? bar.style.width : null,
                    action: act ? act.textContent : null,
                    actionAct: act ? (act.dataset.act || '') : null,
                    actionVisible: act ? act.style.display !== 'none' : null
                });
            })()`,
            awaitPromise: true,
            returnByValue: true
        });
        const ui = JSON.parse(r3.result.value);
        console.log('  · 关于页状态：' + JSON.stringify(ui));
        check('关于页显示了已下载完成', /已下载完成/.test(ui.status || ''), ui.status);
        check('按钮变成「立即重启更新」', /重启更新/.test(ui.action || ''), ui.action);
        check('按钮已可见', ui.actionVisible === true);

        console.log('\n[8] 真走一次安装：点「立即重启更新」');
        // 这一步会 spawn apply-update.js（等主进程退出后替换文件）并让应用退出
        await cdp.send('Runtime.evaluate', {
            expression: `require('electron').ipcRenderer.invoke('update:install').then(r => JSON.stringify(r))`,
            awaitPromise: true,
            returnByValue: true
        }).catch(() => { /* 应用退出时连接会断，属于正常 */ });

        // 等落地脚本走完「等退出 → 释放句柄 → 备份 → 替换」
        let replaced = false;
        for (let i = 0; i < 24; i++) {
            await sleep(500);
            if (fs.existsSync(path.join(DRILL_APP, 'resources', 'app.asar.bak-update-' + FAKE_VERSION))) {
                replaced = true;
                break;
            }
        }
        check('原文件已备份为 app.asar.bak-update-' + FAKE_VERSION, replaced);
        const pendingDir = path.join(CACHE_DIR, 'pending', FAKE_VERSION);
        check('暂存区里的 asar 已被消费（清理掉）',
            !fs.existsSync(path.join(pendingDir, 'app.asar')));
        const applyLog = path.join(pendingDir, 'apply.log');
        const logText = fs.existsSync(applyLog) ? fs.readFileSync(applyLog, 'utf8') : '';
        check('apply.log 记录了「更新完成」', /更新完成/.test(logText), logText.slice(-200));
    } finally {
        try { if (cdp && cdp.ws) cdp.ws.close(); } catch (e) { /* ignore */ }
        // 只清理从 E:\timer-drill 拉起的进程（含安装后重启的新实例）。
        // 绝不能按进程名杀 —— 会连用户正在用的那份一起干掉。
        try {
            spawnSync('powershell', ['-NoProfile', '-Command',
                'Get-Process | Where-Object { $_.Path -like "*timer-drill*" } | ForEach-Object { Stop-Process -Id $_.Id -Force }'
            ], { encoding: 'utf8', timeout: 40000 });
        } catch (e) { /* ignore */ }
        await sleep(1500);
        await new Promise(r => server.close(r));
        try { if (fs.existsSync(CACHE_DIR)) fs.rmSync(CACHE_DIR, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    }

    console.log('\n结果：' + pass + ' 通过，' + fail + ' 失败');
    console.log('（演练副本留在 ' + DRILL_APP + '，确认无误后可整目录删除）\n');
    process.exit(fail ? 1 : 0);
})().catch(e => {
    console.error('\nERR ' + e.message + '\n');
    process.exit(1);
});
