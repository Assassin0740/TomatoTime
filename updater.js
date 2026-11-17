'use strict';

/**
 * updater.js —— 应用内「无感更新」
 *
 * ==================== 为什么不用 electron-updater + NSIS ====================
 * 本机 makensis 3.04 在编译期无法创建临时文件（`!tempfile: Unable to create temporary file!`，
 * 连 `!system` 写文件都「拒绝访问」），NSIS 打包链路在这台机器上跑不通；
 * 而且 NSIS 全量包 85MB，实际上每次改动只落在 resources 下的 app.asar 与三个 CLI 文件上（合计约 8MB）。
 * 自己做一个「只换 asar」的增量通道，包小一个数量级，也不需要管理员权限。
 *
 * ==================== 通道 ====================
 *   <feed>/latest.json           更新清单（同时保留老的 version/url 字段给旧客户端）
 *   <feed>/<version>/app.asar    等 实际文件
 *
 * ==================== 无感的边界 ====================
 *   ① 启动后静默检查，有新版就后台下载（不打断用户、不弹窗）
 *   ② 下完只提示「下次启动自动生效」
 *   ③ 用户正常退出应用时，由独立进程（apply-update.js）等主进程退出后替换文件
 *   ④ 用户也可以点「立即重启更新」，替换完自动拉起来
 *   替换期间主进程必须已经退出 —— 这是 Windows 文件锁决定的，绕不过去，
 *   但「用户不需要手动下载、解压、覆盖」这件事已经做到了。
 *
 * ==================== 安全 ====================
 *   清单里的路径只允许 resources/ 下那四个文件，且拒绝绝对路径、盘符、`..`；
 *   每个文件都要对 size 与 sha256，任何一个对不上就整批丢弃。防止被投毒的清单写系统目录。
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

/** 默认更新源；latest.json 就在这个目录下 */
const DEFAULT_FEED = 'https://www.gdpudev.cn/timer/release';
/** 只允许替换安装目录下这一层 */
const ALLOWED_PREFIX = 'resources/';
/** 允许被替换的具体文件 —— 想扩必须同步改 apply-update.js 的清理逻辑与测试 */
const ALLOWED_FILES = ['app.asar', 'timer-cli.js', 'timer-cli.py', 'timer.cmd'];
/** 单次更新最多等多久 */
const DEFAULT_TIMEOUT = 120000;

// ==================== 纯函数（导出以便单测） ====================

function parseVerParts(v) {
    return String(v == null ? '' : v)
        .replace(/^v/i, '')
        .split(/[.+-]/)
        .slice(0, 4)
        .map(n => parseInt(n, 10) || 0);
}

/** a>b 返回 1，a<b 返回 -1，相等 0 */
function cmpVersion(a, b) {
    const A = parseVerParts(a);
    const B = parseVerParts(b);
    const len = Math.max(A.length, B.length, 3);
    for (let i = 0; i < len; i++) {
        const x = A[i] || 0;
        const y = B[i] || 0;
        if (x !== y) return x > y ? 1 : -1;
    }
    return 0;
}

/**
 * 规范化清单里的相对路径。
 * 返回空串表示「不合法」——绝对路径、盘符、`..`、空段、NUL 全部拒绝。
 */
function sanitizeRelPath(rel) {
    const raw = String(rel == null ? '' : rel).trim().replace(/\\/g, '/');
    if (!raw) return '';
    if (raw.indexOf('\0') >= 0) return '';
    if (raw.startsWith('/')) return '';
    if (/^[a-zA-Z]:/.test(raw)) return '';
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return '';   // file: / http: 之类
    const parts = raw.split('/');
    for (const p of parts) {
        if (!p || p === '.' || p === '..') return '';
    }
    return parts.join('/');
}

function sha256File(file) {
    return new Promise((resolve, reject) => {
        const h = crypto.createHash('sha256');
        const rs = fs.createReadStream(file);
        rs.on('error', reject);
        rs.on('data', c => h.update(c));
        rs.on('end', () => resolve(h.digest('hex')));
    });
}

/**
 * 校验并规整更新清单。
 * @returns {{ok:boolean, error?:string, manifest?:object}}
 */
function verifyManifest(m) {
    if (!m || typeof m !== 'object' || Array.isArray(m)) {
        return { ok: false, error: '清单不是对象' };
    }
    const version = String(m.version == null ? '' : m.version).replace(/^v/i, '').trim();
    if (!/^\d+(\.\d+){1,3}$/.test(version)) {
        return { ok: false, error: '版本号不合法：' + version };
    }
    const rawFiles = Array.isArray(m.files) ? m.files : [];
    if (!rawFiles.length) {
        return { ok: false, error: '清单里没有 files' };
    }
    const files = [];
    const seen = new Set();
    for (const f of rawFiles) {
        if (!f || typeof f !== 'object') return { ok: false, error: 'files 项不是对象' };
        const rel = sanitizeRelPath(f.path);
        if (!rel) return { ok: false, error: '文件路径不合法：' + String(f.path) };
        if (!rel.startsWith(ALLOWED_PREFIX)) {
            return { ok: false, error: '只允许更新 resources 下的文件：' + rel };
        }
        const base = rel.slice(ALLOWED_PREFIX.length);
        if (base.indexOf('/') >= 0) {
            return { ok: false, error: '不支持子目录：' + rel };
        }
        if (ALLOWED_FILES.indexOf(base) < 0) {
            return { ok: false, error: '不在允许清单内：' + rel };
        }
        if (seen.has(rel)) return { ok: false, error: '重复文件：' + rel };
        seen.add(rel);

        const url = String(f.url == null ? '' : f.url).trim();
        if (!/^https?:\/\//i.test(url)) {
            return { ok: false, error: '下载地址不合法：' + rel };
        }
        const sha = String(f.sha256 == null ? '' : f.sha256).trim().toLowerCase();
        if (!/^[0-9a-f]{64}$/.test(sha)) {
            return { ok: false, error: 'sha256 不合法：' + rel };
        }
        const size = Number(f.size);
        if (!Number.isFinite(size) || size <= 0) {
            return { ok: false, error: '文件大小不合法：' + rel };
        }
        files.push({ path: rel, base: base, url: url, sha256: sha, size: size });
    }
    return {
        ok: true,
        manifest: {
            version: version,
            notes: String(m.notes == null ? '' : m.notes),
            date: String(m.date == null ? '' : m.date),
            minVersion: String(m.minVersion == null ? '' : m.minVersion),
            full: String(m.full == null ? '' : m.full),
            files: files,
            totalSize: files.reduce((s, f) => s + f.size, 0)
        }
    };
}

/** 简易 GET 到字符串（跟随重定向），给清单下载用 */
function httpGetText(url, timeoutMs, redirectsLeft) {
    const left = redirectsLeft == null ? 5 : redirectsLeft;
    return new Promise((resolve, reject) => {
        let settled = false;
        const done = (err, data) => {
            if (settled) return;
            settled = true;
            if (err) reject(err); else resolve(data);
        };
        const mod = /^https:/i.test(url) ? https : http;
        const req = mod.get(url, {
            timeout: timeoutMs || 15000,
            headers: {
                'Accept': 'application/json,*/*',
                'Accept-Encoding': 'identity',
                'Cache-Control': 'no-cache',
                'User-Agent': 'timer-app-updater'
            }
        }, res => {
            const code = res.statusCode || 0;
            if (code >= 300 && code < 400 && res.headers.location) {
                res.resume();
                if (left <= 0) return done(new Error('重定向次数过多'));
                const next = new URL(res.headers.location, url).href;
                return httpGetText(next, timeoutMs, left - 1).then(d => done(null, d), e => done(e));
            }
            if (code !== 200) {
                res.resume();
                return done(new Error('HTTP ' + code));
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => done(null, Buffer.concat(chunks).toString('utf8')));
            res.on('error', e => done(e));
        });
        req.on('timeout', () => req.destroy(new Error('请求超时')));
        req.on('error', e => done(e));
    });
}

/** 下载到文件，带进度回调；跟随重定向 */
function httpDownload(url, dest, opts) {
    const o = opts || {};
    const left = o.redirectsLeft == null ? 5 : o.redirectsLeft;
    return new Promise((resolve, reject) => {
        let settled = false;
        const done = (err, val) => {
            if (settled) return;
            settled = true;
            if (err) reject(err); else resolve(val);
        };
        const mod = /^https:/i.test(url) ? https : http;
        const req = mod.get(url, {
            timeout: o.timeout || DEFAULT_TIMEOUT,
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'identity',
                'User-Agent': 'timer-app-updater'
            }
        }, res => {
            const code = res.statusCode || 0;
            if (code >= 300 && code < 400 && res.headers.location) {
                res.resume();
                if (left <= 0) return done(new Error('重定向次数过多'));
                const next = new URL(res.headers.location, url).href;
                return httpDownload(next, dest, Object.assign({}, o, { redirectsLeft: left - 1 }))
                    .then(v => done(null, v), e => done(e));
            }
            if (code !== 200) {
                res.resume();
                return done(new Error('HTTP ' + code));
            }
            const totalFromHeader = Number(res.headers['content-length']) || 0;
            let got = 0;
            const ws = fs.createWriteStream(dest);
            ws.on('error', e => {
                res.destroy();
                done(e);
            });
            res.on('data', c => {
                got += c.length;
                if (typeof o.onProgress === 'function') {
                    try { o.onProgress(got, totalFromHeader); } catch (e) { /* 回调异常不影响下载 */ }
                }
            });
            res.on('error', e => {
                ws.destroy();
                done(e);
            });
            res.pipe(ws);
            // 用 close 而不是 finish：finish 只表示数据交给了 OS，句柄可能还没释放，
            // 紧接着 rename 在 Windows 上会被拒绝（EPERM）
            ws.on('close', () => done(null, { bytes: got, total: totalFromHeader }));
        });
        req.on('timeout', () => req.destroy(new Error('下载超时')));
        req.on('error', e => done(e));
    });
}

/** 把版本号变成安全的目录名 */
function versionDirName(version) {
    return String(version || '').replace(/[^\dA-Za-z._-]/g, '') || 'unknown';
}

/**
 * 把 .part 挪到最终位置。
 * Windows 上刚写完的文件常被杀软实时扫描短暂占用，rename 会 EPERM，
 * 所以这里带重试；实在挪不动才报错（调用方会作废整批下载）。
 */
async function moveIntoPlace(from, to) {
    const tries = 8;
    for (let i = 0; i < tries; i++) {
        try {
            if (fs.existsSync(to)) {
                try { fs.unlinkSync(to); } catch (e) { /* 目标被占用就交给下面的重试 */ }
            }
            fs.renameSync(from, to);
            return;
        } catch (e) {
            if (i === tries - 1) throw e;
            await new Promise(r => setTimeout(r, 150));
        }
    }
}

// ==================== 更新器 ====================

/**
 * @param {object} options
 * @param {string} options.currentVersion  当前版本（app.getVersion()）
 * @param {string} options.installDir      安装目录（含 resources/ 与 exe）
 * @param {string} options.cacheDir        暂存目录（LOCALAPPDATA 下）
 * @param {string} [options.feedUrl]       更新源
 * @param {string} [options.exeName]       可执行文件名
 * @param {function} [options.onState]     状态变化回调
 * @param {function} [options.log]
 * @param {boolean} [options.autoDownload] 有新版是否立刻后台下载
 * @param {boolean} [options.enabled]      是否启用（未打包 / 无权限时关掉）
 */
function createUpdater(options) {
    const o = options || {};
    const feedUrl = String(o.feedUrl || DEFAULT_FEED).replace(/\/+$/, '');
    const installDir = o.installDir || '';
    const cacheDir = o.cacheDir || '';
    const exeName = o.exeName || '';
    const currentVersion = String(o.currentVersion || '0.0.0');
    const autoDownload = o.autoDownload !== false;
    const enabled = o.enabled !== false;
    const log = typeof o.log === 'function' ? o.log : () => {};

    const pendingRoot = cacheDir ? path.join(cacheDir, 'pending') : '';
    const stateFile = cacheDir ? path.join(cacheDir, 'state.json') : '';

    const state = {
        enabled: enabled,
        phase: 'idle',        // idle | checking | up-to-date | available | downloading | downloaded | installing | error
        current: currentVersion,
        latest: '',
        notes: '',
        date: '',
        percent: 0,
        transferred: 0,
        total: 0,
        bytesPerSecond: 0,
        error: '',
        canInstall: false,
        auto: autoDownload,
        fullUrl: ''
    };

    let onStateCb = typeof o.onState === 'function' ? o.onState : null;
    let checking = null;      // 正在进行的检查 Promise
    let downloading = null;   // 正在进行的下载 Promise
    let manifest = null;      // 当前可用清单
    let appliedOnQuit = false;
    let lastEmitAt = 0;
    let startedAt = 0;
    let startBytes = 0;

    function snapshot() {
        return Object.assign({}, state);
    }

    function emit(force) {
        if (!onStateCb) return;
        const now = Date.now();
        if (!force && now - lastEmitAt < 200) return;
        lastEmitAt = now;
        try { onStateCb(snapshot()); } catch (e) { log('[updater] onState 回调异常：' + e.message); }
    }

    function set(patch, force) {
        Object.assign(state, patch);
        emit(force !== false);
    }

    function persist() {
        if (!stateFile) return;
        try {
            fs.mkdirSync(path.dirname(stateFile), { recursive: true });
            fs.writeFileSync(stateFile, JSON.stringify({
                version: manifest ? manifest.version : '',
                phase: state.phase,
                latest: state.latest,
                date: state.date,
                notes: state.notes
            }, null, 2), 'utf8');
        } catch (e) { /* 记不住状态只影响下次提示，不影响更新 */ }
    }

    function pendingDirFor(version) {
        return path.join(pendingRoot, versionDirName(version));
    }

    /** 暂存目录里是否已经有一份校验过的完整包 */
    function pendingReady(version) {
        const dir = pendingDirFor(version);
        const mf = path.join(dir, 'manifest.json');
        if (!fs.existsSync(mf)) return null;
        try {
            const saved = JSON.parse(fs.readFileSync(mf, 'utf8'));
            const v = verifyManifest(saved);
            if (!v.ok) return null;
            for (const f of v.manifest.files) {
                const p = path.join(dir, f.base);
                if (!fs.existsSync(p)) return null;
                if (fs.statSync(p).size !== f.size) return null;
            }
            return v.manifest;
        } catch (e) {
            return null;
        }
    }

    function cleanupPending(keepVersion) {
        if (!pendingRoot || !fs.existsSync(pendingRoot)) return;
        for (const name of fs.readdirSync(pendingRoot)) {
            if (keepVersion && name === versionDirName(keepVersion)) continue;
            try {
                fs.rmSync(path.join(pendingRoot, name), { recursive: true, force: true });
            } catch (e) { /* 删不掉就算了 */ }
        }
    }

    /**
     * 启动时对账：上次是不是已经装上了？还是装了但没成功？
     */
    function reconcile() {
        if (!stateFile || !fs.existsSync(stateFile)) {
            emit(true);
            return snapshot();
        }
        let saved = null;
        try { saved = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch (e) { saved = null; }
        if (!saved || !saved.version) {
            emit(true);
            return snapshot();
        }
        const cmp = cmpVersion(saved.version, currentVersion);
        if (cmp <= 0) {
            // 已经生效（或更旧），清掉暂存区
            cleanupPending('');
            try { fs.unlinkSync(stateFile); } catch (e) { /* ignore */ }
            log('[updater] 暂存区已清理，当前 ' + currentVersion + ' 已是最新');
            emit(true);
            return snapshot();
        }
        // 清单里的版本仍高于当前 → 上次没装上（多半是被占用或用户没重启）
        const ready = pendingReady(saved.version);
        if (ready) {
            manifest = ready;
            set({
                phase: 'downloaded',
                latest: ready.version,
                date: ready.date || saved.date || '',
                notes: ready.notes || saved.notes || '',
                total: ready.totalSize,
                transferred: ready.totalSize,
                percent: 100,
                canInstall: true,
                error: ''
            }, true);
            log('[updater] 发现已下载未安装的 ' + ready.version + '，可再次安装');
        } else {
            cleanupPending('');
            try { fs.unlinkSync(stateFile); } catch (e) { /* ignore */ }
            emit(true);
        }
        return snapshot();
    }

    /** 检查更新（只读，不产生副作用，所以开发态也允许跑） */
    function check(opt) {
        if (checking) return checking;
        const manual = !!(opt && opt.manual);
        set({ phase: 'checking', error: '', percent: 0, transferred: 0 }, true);
        log('[updater] 检查更新 → ' + feedUrl + '/latest.json');

        checking = httpGetText(feedUrl + '/latest.json?t=' + Date.now(), 15000)
            .then(txt => {
                let raw;
                try {
                    raw = JSON.parse(txt);
                } catch (e) {
                    throw new Error('清单不是合法 JSON');
                }
                const v = verifyManifest(raw);
                if (!v.ok) throw new Error('清单校验失败：' + v.error);
                manifest = v.manifest;

                if (cmpVersion(manifest.version, currentVersion) <= 0) {
                    set({
                        phase: 'up-to-date',
                        latest: manifest.version,
                        error: '',
                        canInstall: false
                    }, true);
                    cleanupPending('');
                    try { if (stateFile && fs.existsSync(stateFile)) fs.unlinkSync(stateFile); } catch (e) { /* ignore */ }
                    return snapshot();
                }

                // 已经下过一份被校验过的，直接复用
                const ready = pendingReady(manifest.version);
                if (ready) {
                    manifest = ready;
                    set({
                        phase: 'downloaded',
                        latest: ready.version,
                        date: ready.date,
                        notes: ready.notes,
                        total: ready.totalSize,
                        transferred: ready.totalSize,
                        percent: 100,
                        canInstall: true,
                        error: ''
                    }, true);
                    return snapshot();
                }

                set({
                    phase: 'available',
                    latest: manifest.version,
                    date: manifest.date,
                    notes: manifest.notes,
                    fullUrl: manifest.full,
                    total: manifest.totalSize,
                    percent: 0,
                    transferred: 0,
                    canInstall: false,
                    error: ''
                }, true);

                if (autoDownload && enabled) {
                    download().catch(e => log('[updater] 后台下载失败：' + e.message));
                }
                return snapshot();
            })
            .catch(e => {
                const msg = (e && e.message) || String(e);
                log('[updater] 检查失败：' + msg);
                set({ phase: 'error', error: msg, canInstall: false }, true);
                return snapshot();
            })
            .then(res => {
                checking = null;
                return res;
            });

        return checking;
    }

    /** 下载（可从 available 状态手动触发） */
    function download() {
        if (downloading) return downloading;
        if (!enabled) return Promise.reject(new Error('开发模式下不下载更新包'));
        if (!manifest) return Promise.reject(new Error('还没有可用的更新清单'));
        if (!pendingRoot) return Promise.reject(new Error('没有暂存目录'));

        const dir = pendingDirFor(manifest.version);
        const totalAll = manifest.files.reduce((s, f) => s + f.size, 0);

        startedAt = Date.now();
        startBytes = 0;
        set({
            phase: 'downloading',
            percent: 0,
            transferred: 0,
            total: totalAll,
            bytesPerSecond: 0,
            error: '',
            canInstall: false
        }, true);

        downloading = (async () => {
            fs.mkdirSync(dir, { recursive: true });
            cleanupPending(manifest.version);

            let base = 0;
            for (const f of manifest.files) {
                const dest = path.join(dir, f.base);
                const part = dest + '.part';
                try { if (fs.existsSync(part)) fs.unlinkSync(part); } catch (e) { /* ignore */ }
                log('[updater] 下载 ' + f.path + '（' + f.size + ' 字节）→ ' + part);

                const before = base;
                await httpDownload(f.url, part, {
                    timeout: DEFAULT_TIMEOUT,
                    onProgress: (got) => {
                        const transferred = before + got;
                        const elapsed = Math.max((Date.now() - startedAt) / 1000, 0.001);
                        const bps = Math.round(transferred / elapsed);
                        const percent = totalAll > 0 ? Math.min(100, Math.round((transferred / totalAll) * 1000) / 10) : 0;
                        set({ transferred: transferred, percent: percent, bytesPerSecond: bps }, false);
                    }
                });

                // 校验体积与摘要；不一致就整批作废，避免把半包写进安装目录
                const st = fs.statSync(part);
                if (st.size !== f.size) {
                    throw new Error(f.base + ' 体积不符：期望 ' + f.size + '，实际 ' + st.size);
                }
                const digest = await sha256File(part);
                if (digest !== f.sha256) {
                    throw new Error(f.base + ' 摘要不符：期望 ' + f.sha256 + '，实际 ' + digest);
                }
                try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch (e) { /* ignore */ }
                await moveIntoPlace(part, dest);
                base += f.size;
            }

            // 保存清单副本，apply-update.js 与下次启动对账都靠它
            fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

            set({
                phase: 'downloaded',
                percent: 100,
                transferred: totalAll,
                total: totalAll,
                canInstall: true,
                error: ''
            }, true);
            persist();
            log('[updater] 已下载完成 v' + manifest.version + '，等待安装');
            return snapshot();
        })()
            .catch(e => {
                const msg = (e && e.message) || String(e);
                log('[updater] 下载失败：' + msg);
                set({ phase: 'error', error: msg, canInstall: false }, true);
                cleanupPending('');
                throw e;
            })
            .then(res => {
                downloading = null;
                return res;
            }, err => {
                downloading = null;
                throw err;
            });

        return downloading;
    }

    /**
     * 拉起落地脚本。
     * 注意：调用方负责让主进程退出（applyAndQuit / before-quit）。
     */
    function spawnApplier(restart) {
        if (!enabled) return { ok: false, error: '开发模式下不执行安装' };
        if (!state.canInstall || !manifest) return { ok: false, error: '还没有下载完成的更新包' };
        if (!installDir || !cacheDir) return { ok: false, error: '安装目录未知' };
        if (!exeName) return { ok: false, error: '找不到可执行文件名' };

        const exePath = path.join(installDir, exeName);
        const srcDir = pendingDirFor(manifest.version);
        const scriptSrc = path.join(__dirname, 'apply-update.js');
        const scriptDst = path.join(cacheDir, 'apply-update.js');

        try {
            fs.mkdirSync(cacheDir, { recursive: true });
            // 注意：脚本源在 asar 里，copyFileSync 不支持 asar 源路径，必须读出内容再写
            fs.writeFileSync(scriptDst, fs.readFileSync(scriptSrc));
        } catch (e) {
            return { ok: false, error: '无法准备更新脚本：' + e.message };
        }
        if (!fs.existsSync(exePath)) {
            return { ok: false, error: '找不到可执行文件：' + exePath };
        }

        try {
            const child = spawn(exePath, [
                scriptDst,
                '--pid', String(process.pid),
                '--app', installDir,
                '--src', srcDir,
                '--exe', exeName,
                '--restart', restart ? '1' : '0'
            ], {
                cwd: installDir,
                detached: true,
                stdio: 'ignore',
                windowsHide: true,
                // 让更新器以纯 Node 模式跑：不建窗口、不碰单实例锁
                // ELECTRON_NO_ASAR 必须加：否则 Electron 的 fs 补丁会把 resources\app.asar
                // 当成「asar 归档目录」，往它写文件直接报 "not found in ...app.asar"
                env: Object.assign({}, process.env, {
                    ELECTRON_RUN_AS_NODE: '1',
                    ELECTRON_NO_ASAR: '1'
                })
            });
            child.unref();
            log('[updater] 已拉起落地脚本 pid=' + child.pid + ' restart=' + restart);
            return { ok: true, pid: child.pid };
        } catch (e) {
            return { ok: false, error: '拉起更新脚本失败：' + e.message };
        }
    }

    /** 退出时自动安装（装了等下次启动生效，不重启） */
    function applyOnQuit() {
        if (appliedOnQuit) return { ok: false, error: '已经安排过安装' };
        if (!state.canInstall || state.phase !== 'downloaded') return { ok: false, error: '没有待安装的更新' };
        const r = spawnApplier(false);
        if (r.ok) appliedOnQuit = true;
        return r;
    }

    /** 立即安装并要求重启（调用方随后 app.quit()） */
    function applyAndRestart() {
        if (appliedOnQuit) return { ok: false, error: '已经安排过安装' };
        const r = spawnApplier(true);
        if (r.ok) {
            appliedOnQuit = true;
            set({ phase: 'installing', canInstall: false }, true);
        }
        return r;
    }

    function reset() {
        cleanupPending('');
        try { if (stateFile && fs.existsSync(stateFile)) fs.unlinkSync(stateFile); } catch (e) { /* ignore */ }
        manifest = null;
        appliedOnQuit = false;
        set({
            phase: 'idle', latest: '', notes: '', date: '', percent: 0,
            transferred: 0, total: 0, bytesPerSecond: 0, error: '', canInstall: false, fullUrl: ''
        }, true);
    }

    return {
        state: snapshot,
        onState(fn) { onStateCb = typeof fn === 'function' ? fn : null; },
        reconcile: reconcile,
        check: check,
        download: download,
        applyOnQuit: applyOnQuit,
        applyAndRestart: applyAndRestart,
        reset: reset,
        get pendingVersion() { return manifest ? manifest.version : ''; },
        get feed() { return feedUrl; }
    };
}

module.exports = {
    DEFAULT_FEED,
    ALLOWED_PREFIX,
    ALLOWED_FILES,
    parseVerParts,
    cmpVersion,
    sanitizeRelPath,
    verifyManifest,
    versionDirName,
    sha256File,
    httpGetText,
    httpDownload,
    createUpdater
};
