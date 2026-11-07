'use strict';

/**
 * deploy-local.js —— 把「当前源码」构建出来的包就地部署到本机安装目录
 *
 * 【解决什么问题】
 *   改完源码后要验证，只有两条路：
 *     ① 每次都打完整安装包（dist\计时器 Setup x.x.x.exe）再装一遍 —— 慢，还要点安装向导；
 *     ② 手动把 dist\win-unpacked\resources\app.asar 拷进安装目录 —— 容易漏文件、忘了备份。
 *   本脚本把 ② 自动化，并且**先走构建管线**（electron-builder --dir），
 *   保证部署的包一定来自源码，而不是手工拼出来的 asar。
 *
 * 【用法】
 *   npm run deploy:local                     # 构建 + 部署到默认安装目录
 *   npm run deploy:local -- --to "D:\Other\timer-app"
 *   npm run deploy:local -- --skip-build     # 只重新部署上次构建的产物（改完 CLI 之类）
 *   npm run deploy:local -- --no-backup      # 不生成 app.asar.bak-*（不推荐）
 *
 * 安装目录也可以走环境变量：TIMER_INSTALL_DIR
 *
 * 【为什么必须先关应用】
 *   应用运行时 app.asar 被进程占用（Windows 文件锁），覆盖会失败/写坏。
 *   脚本会在动手前探测锁，被占用就直接退出并提示。
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_INSTALL_DIR = 'D:\\Program\\timer-app';
/** extraResources：这些文件在 asar 之外，必须单独拷 */
const EXTRA_RESOURCES = ['timer-cli.js', 'timer-cli.py', 'timer.cmd'];
/** 构建产物里 asar 的位置（electron-builder win target=dir 的固定布局） */
const BUILT_ASAR = path.join('dist', 'win-unpacked', 'resources', 'app.asar');
/**
 * 【CR-031 瘦身】回滚备份只保留最近 2 份。
 * 以前每次部署都留一个 ~7.4MB 的 app.asar.bak-*，实测攒到 40 个 / 290MB，
 * 比 app.asar 本身大 40 倍。多余的不删，移到工程目录下的归档区，随时能取回。
 */
const MAX_BACKUPS = 2;
const ARCHIVE_DIR = path.join(ROOT, '.deploy-archive');

function parseArgs(argv) {
    const out = {
        to: process.env.TIMER_INSTALL_DIR || DEFAULT_INSTALL_DIR,
        build: true, backup: true, pruneOnly: false
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--to') out.to = argv[++i];
        else if (a === '--skip-build' || a === '--no-build') out.build = false;
        else if (a === '--no-backup') out.backup = false;
        else if (a === '--prune-only') out.pruneOnly = true;
        else if (a === '--help' || a === '-h') out.help = true;
        else die('未知参数：' + a + '（--to <目录> / --skip-build / --no-backup / --prune-only）');
    }
    return out;
}

function die(msg) {
    console.error('\n[deploy-local] ✗ ' + msg + '\n');
    process.exit(1);
}

function human(bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function stamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** 把文件搬到归档区（跨盘符 rename 会 EXDEV，所以 copy + unlink 兜底） */
function archiveFile(from, to) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    try {
        fs.renameSync(from, to);
    } catch (e) {
        fs.copyFileSync(from, to);
        fs.unlinkSync(from);
    }
}

/**
 * 只保留最近 MAX_BACKUPS 份 app.asar.bak-*，其余移到工程内的 .deploy-archive/。
 * 用「移动」而不是删除：这些是回滚用备份，用户以后想找回某一版仍然找得到。
 */
function pruneBackups(resourcesDir) {
    const all = fs.readdirSync(resourcesDir)
        .filter(n => /^app\.asar\.bak-/.test(n))
        .map(n => {
            const p = path.join(resourcesDir, n);
            return { name: n, path: p, mtime: fs.statSync(p).mtimeMs, size: fs.statSync(p).size };
        })
        .sort((a, b) => b.mtime - a.mtime);
    if (all.length <= MAX_BACKUPS) return { moved: 0, bytes: 0, kept: all.length };
    const old = all.slice(MAX_BACKUPS);
    let bytes = 0;
    old.forEach(f => {
        archiveFile(f.path, path.join(ARCHIVE_DIR, f.name));
        bytes += f.size;
    });
    return { moved: old.length, bytes: bytes, kept: MAX_BACKUPS };
}

/** 文件被别的进程占用时抛异常；这里用它来判断应用是否在运行 */
function assertNotLocked(file) {
    if (!fs.existsSync(file)) return;
    try {
        const fd = fs.openSync(file, 'r+');
        fs.closeSync(fd);
    } catch (e) {
        if (e.code === 'EBUSY' || e.code === 'EPERM' || e.code === 'EACCES') {
            die('安装目录里的 app.asar 正被占用 —— 请先退出「计时器」（托盘右键退出）再重试。');
        }
        throw e;
    }
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log([
            '用法：node scripts/deploy-local.js [选项]',
            '',
            '  --to <目录>    安装目录（默认 D:\\Program\\timer-app，可用环境变量 TIMER_INSTALL_DIR）',
            '  --skip-build   跳过 electron-builder，直接部署上次的构建产物',
            '  --no-backup    不生成 app.asar.bak-* 备份（不推荐）',
            '  --prune-only   只把多余的旧备份移到工程内 .deploy-archive/，不构建不部署',
            '  -h, --help     显示本帮助',
            '',
            '备份最多保留 ' + MAX_BACKUPS + ' 份，多余的移入 ' + ARCHIVE_DIR + '（可随时取回，不删除）。',
            '',
            '注意：部署前必须先退出「计时器」，否则 app.asar 被占用会失败。'
        ].join('\n'));
        return;
    }

    const installDir = path.resolve(args.to);
    const resourcesDir = path.join(installDir, 'resources');
    const targetAsar = path.join(resourcesDir, 'app.asar');

    console.log('[deploy-local] 源工程   : ' + ROOT);
    console.log('[deploy-local] 安装目录 : ' + installDir);

    if (!fs.existsSync(resourcesDir)) {
        die('安装目录里找不到 resources\\ 子目录：' + resourcesDir + '\n（用 --to 指定正确目录，或先安装一次应用）');
    }
    assertNotLocked(targetAsar);

    if (args.pruneOnly) {
        const r = pruneBackups(resourcesDir);
        console.log(`[deploy-local] 归档旧备份 ${r.moved} 份（${human(r.bytes)}），保留 ${r.kept} 份。`);
        console.log('[deploy-local] 归档位置：' + ARCHIVE_DIR);
        return;
    }

    // ① 构建（走 electron-builder，保证包来自源码）
    if (args.build) {
        console.log('\n[deploy-local] ① 构建：npx electron-builder --dir ...');
        const res = spawnSync('npx electron-builder --dir', {
            cwd: ROOT, shell: true, stdio: 'inherit'
        });
        if (res.status !== 0) die('构建失败（exit=' + res.status + '），未部署任何文件。');
    } else {
        console.log('\n[deploy-local] ① 跳过构建（--skip-build）');
    }

    const builtAsar = path.join(ROOT, BUILT_ASAR);
    if (!fs.existsSync(builtAsar)) {
        die('找不到构建产物：' + builtAsar + '\n（先跑 npm run build:dir，或去掉 --skip-build）');
    }

    // ② 部署 asar（先备份）
    if (args.backup && fs.existsSync(targetAsar)) {
        const backup = targetAsar + '.bak-' + stamp();
        fs.copyFileSync(targetAsar, backup);
        console.log('[deploy-local] ② 已备份原包 → ' + backup);
    }
    const before = fs.existsSync(targetAsar) ? fs.statSync(targetAsar).size : 0;
    fs.copyFileSync(builtAsar, targetAsar);
    console.log('[deploy-local] ② 已部署 app.asar：%s → %s（%s）',
        human(before), human(fs.statSync(targetAsar).size), path.relative(ROOT, builtAsar));

    // ③ 部署 asar 之外的文件（CLI 等 extraResources）
    EXTRA_RESOURCES.forEach(name => {
        const from = path.join(ROOT, name);
        const to = path.join(resourcesDir, name);
        if (!fs.existsSync(from)) {
            console.log('[deploy-local] ③ 跳过（源码里没有）：' + name);
            return;
        }
        const same = fs.existsSync(to) && fs.readFileSync(from).equals(fs.readFileSync(to));
        fs.copyFileSync(from, to);
        console.log('[deploy-local] ③ %s %s', same ? '内容未变' : '已更新  ', name);
    });

    // ④ 备份保留策略：只留最近 MAX_BACKUPS 份，其余归档（不删除）
    const pruned = pruneBackups(resourcesDir);
    if (pruned.moved) {
        console.log('[deploy-local] ④ 已归档 %d 份旧备份（%s）→ %s',
            pruned.moved, human(pruned.bytes), ARCHIVE_DIR);
    }

    console.log('\n[deploy-local] ✓ 完成。重新打开「计时器」即可生效。');
    console.log('              回滚：把 resources\\app.asar.bak-* 改回 app.asar 即可。');
}

main();
