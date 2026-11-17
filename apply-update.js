'use strict';

/**
 * apply-update.js —— 更新落地脚本（由主进程用「计时器.exe + ELECTRON_RUN_AS_NODE」拉起）
 *
 * 【为什么单独一个文件】
 *   它要负责替换 app.asar，而它自己必须活过主进程 —— 所以不能待在 asar 里被一起换掉。
 *   打包时它随 asar 一起发布，运行时由 updater.js 复制到缓存目录（LOCALAPPDATA），
 *   从那里以「纯 Node 模式」执行，不加载界面、不触发单实例锁。
 *
 * 【为什么用 Node 而不是 .cmd 批处理】
 *   安装目录可能含中文，批处理文件只能按系统代码页（936）解析，编码一旦对不上就乱码。
 *   Node 走 UTF-16 系统 API，中文路径天然正确；也省掉 tasklist/find 那套脆弱的等待逻辑。
 *
 * 【流程】
 *   等主进程 PID 消失（最长 120s）→ 再等 1.5s 让文件句柄释放
 *   → 逐个「备份 → 覆盖」，任一失败立即用备份回滚
 *   → 需要时重新拉起应用 → 把过程写进 apply.log
 *
 * 【参数】
 *   --pid <主进程PID>   --app <安装目录>   --src <下载暂存目录>   --exe <可执行文件名>   --restart <0|1>
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function arg(name, def) {
    const i = process.argv.indexOf('--' + name);
    return i >= 0 && typeof process.argv[i + 1] === 'string' ? process.argv[i + 1] : def;
}

const PID = parseInt(arg('pid', '0'), 10) || 0;
const APP_DIR = arg('app', '');
const SRC_DIR = arg('src', '');
const EXE_NAME = arg('exe', '');
const RESTART = arg('restart', '0') === '1';

const LOG_FILE = SRC_DIR ? path.join(SRC_DIR, 'apply.log') : '';
const lines = [];

function say(msg) {
    const t = new Date().toISOString().replace('T', ' ').slice(0, 19);
    lines.push('[' + t + '] ' + msg);
    try {
        if (LOG_FILE) fs.writeFileSync(LOG_FILE, lines.join('\r\n') + '\r\n', 'utf8');
    } catch (e) { /* 日志写不进去不影响更新本身 */ }
}

/** 同步 sleep：更新器是单线程短命进程，用 Atomics.wait 比空转省 CPU */
function sleep(ms) {
    try {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    } catch (e) {
        const end = Date.now() + ms;
        while (Date.now() < end) { /* 退化为忙等 */ }
    }
}

/** 进程还活着吗（EPERM 表示存在但没权限，同样算活着） */
function isAlive(pid) {
    if (!pid) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return e.code === 'EPERM';
    }
}

function copyReplace(src, dst) {
    // 目标只读时先去掉只读位，否则 copyFileSync 会 EPERM
    try {
        if (fs.existsSync(dst)) {
            const st = fs.statSync(dst);
            if (!(st.mode & 0o200)) fs.chmodSync(dst, st.mode | 0o200);
        }
    } catch (e) { /* 忽略，交给下面的 copy 报错 */ }
    fs.copyFileSync(src, dst);
}

function main() {
    if (!APP_DIR || !SRC_DIR) {
        say('参数不完整，放弃：app=' + APP_DIR + ' src=' + SRC_DIR);
        return 1;
    }

    say('更新器启动 pid=' + PID + ' app=' + APP_DIR + ' src=' + SRC_DIR + ' restart=' + RESTART);

    // ① 等主进程退出
    const deadline = Date.now() + 120000;
    let waited = 0;
    while (isAlive(PID) && Date.now() < deadline) {
        sleep(500);
        waited += 500;
    }
    if (isAlive(PID)) {
        say('等待超时（' + waited + 'ms），主进程仍存活，放弃本次替换，下次启动再试');
        return 2;
    }
    say('主进程已退出（等待 ' + waited + 'ms）');

    // ② 再给系统一点时间释放 asar 映射与文件句柄
    sleep(1500);

    // ③ 读 manifest
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'manifest.json'), 'utf8'));
    } catch (e) {
        say('manifest 读取失败：' + e.message);
        return 3;
    }
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    if (!files.length) {
        say('manifest 里没有文件');
        return 3;
    }

    // ④ 逐个替换，任一失败整体回滚
    const done = [];
    let failedAt = '';
    for (const f of files) {
        const dst = path.join(APP_DIR, f.path);
        const src = path.join(SRC_DIR, f.base);
        const bak = dst + '.bak-update-' + manifest.version;
        try {
            if (!fs.existsSync(src)) throw new Error('暂存文件缺失：' + src);
            if (fs.existsSync(dst)) copyReplace(dst, bak);
            copyReplace(src, dst);
            done.push({ dst: dst, bak: bak });
            say('已替换 ' + f.path + '（' + (fs.statSync(dst).size) + ' 字节）');
        } catch (e) {
            failedAt = f.path + '：' + e.message;
            say('替换失败 ' + failedAt);
            break;
        }
    }

    if (failedAt) {
        for (let i = done.length - 1; i >= 0; i--) {
            try {
                if (fs.existsSync(done[i].bak)) copyReplace(done[i].bak, done[i].dst);
                say('已回滚 ' + done[i].dst);
            } catch (e) {
                say('回滚失败 ' + done[i].dst + '：' + e.message);
            }
        }
        say('本次更新失败，已回滚到旧版本');
        return 4;
    }

    // ⑤ 清理暂存区里的可执行副本（manifest/日志留着排查）
    try {
        for (const f of files) {
            const p = path.join(SRC_DIR, f.base);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
    } catch (e) { say('清理暂存文件失败（不影响更新）：' + e.message); }

    say('更新完成：' + manifest.version);

    // ⑥ 按需重启
    if (RESTART && EXE_NAME) {
        const exe = path.join(APP_DIR, EXE_NAME);
        try {
            if (fs.existsSync(exe)) {
                const child = cp.spawn(exe, [], { cwd: APP_DIR, detached: true, stdio: 'ignore' });
                child.unref();
                say('已重新启动应用：' + exe);
            } else {
                say('找不到可执行文件，未重启：' + exe);
            }
        } catch (e) {
            say('重启失败：' + e.message);
        }
    }
    return 0;
}

let code = 0;
try {
    code = main();
} catch (e) {
    say('更新器异常：' + ((e && e.stack) || e));
    code = 9;
}
process.exit(code);
