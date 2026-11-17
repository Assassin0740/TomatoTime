'use strict';

/**
 * build-update.js —— 生成「无感更新」要上传的东西
 *
 * 【产出结构】
 *   dist/update/latest.json               ← 上传到 <feed>/latest.json（覆盖）
 *   dist/update/<version>/app.asar        ← 上传到 <feed>/<version>/app.asar
 *   dist/update/<version>/timer-cli.js    ← 同上（三个 CLI 一起）
 *
 * 【为什么只有这些】
 *   无感更新只替换 resources 下的 app.asar 与三个 CLI 文件，Electron 运行时不动，
 *   所以整包 8MB 左右，而不是 NSIS 的 85MB。
 *
 * 【用法】
 *   node scripts/build-update.js                 # 先 electron-builder --dir，再打包更新
 *   node scripts/build-update.js --skip-build    # 复用 dist/win-unpacked
 *   node scripts/build-update.js --notes "修复xxx；新增yyy"
 *   node scripts/build-update.js --feed https://example.com/timer/release
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_FEED = 'https://www.gdpudev.cn/timer/release';
const BUILT_RESOURCES = path.join(ROOT, 'dist', 'win-unpacked', 'resources');
const OUT_ROOT = path.join(ROOT, 'dist', 'update');

/** 与 updater.js 的 ALLOWED_FILES 保持一致，多一个少一个都会导致客户端拒收 */
const FILES = ['app.asar', 'timer-cli.js', 'timer-cli.py', 'timer.cmd'];

function die(msg) {
    console.error('\n[build-update] ✗ ' + msg + '\n');
    process.exit(1);
}

function human(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
}

function sha256(file) {
    const h = crypto.createHash('sha256');
    h.update(fs.readFileSync(file));
    return h.digest('hex');
}

function parseArgs(argv) {
    const out = { build: true, notes: '', feed: DEFAULT_FEED };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--skip-build' || a === '--no-build') out.build = false;
        else if (a === '--notes') out.notes = argv[++i] || '';
        else if (a === '--feed') out.feed = String(argv[++i] || '').replace(/\/+$/, '');
        else if (a === '--help' || a === '-h') out.help = true;
        else die('未知参数：' + a);
    }
    return out;
}

/** 没显式给 notes 就用最近的提交标题，省得每次手写 */
function defaultNotes() {
    const r = spawnSync('git log --pretty=format:%s -8', { cwd: ROOT, encoding: 'utf8', shell: true });
    if (r.status !== 0 || !r.stdout) return '';
    return r.stdout.split('\n').map(s => s.trim()).filter(Boolean).join('\n');
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log([
            '用法：node scripts/build-update.js [选项]',
            '',
            '  --skip-build   跳过 electron-builder，直接用 dist/win-unpacked 里的产物',
            '  --notes <文本> 更新说明（缺省用最近 8 条 git 提交标题）',
            '  --feed <url>   下载根地址（默认 https://www.gdpudev.cn/timer/release）',
            '  -h, --help     显示本帮助'
        ].join('\n'));
        return;
    }

    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const version = String(pkg.version || '');
    if (!/^\d+(\.\d+){1,3}$/.test(version)) die('package.json 里的 version 不合法：' + version);

    if (args.build) {
        console.log('[build-update] ① 构建：electron-builder --dir ...');
        const r = spawnSync('npx electron-builder --dir', { cwd: ROOT, shell: true, stdio: 'inherit' });
        if (r.status !== 0) die('构建失败（exit=' + r.status + '）');
    } else {
        console.log('[build-update] ① 跳过构建（--skip-build）');
    }

    if (!fs.existsSync(BUILT_RESOURCES)) {
        die('找不到构建产物：' + BUILT_RESOURCES + '\n（先跑 npm run build:dir，或去掉 --skip-build）');
    }

    const outDir = path.join(OUT_ROOT, version);
    fs.mkdirSync(outDir, { recursive: true });

    const files = [];
    let total = 0;
    console.log('\n[build-update] ② 收集文件');
    for (const name of FILES) {
        const src = path.join(BUILT_RESOURCES, name);
        if (!fs.existsSync(src)) {
            // CLI 三个文件是 extraResources，理论上都在；缺了不致命，跳过并提示
            console.log('  - 跳过（产物里没有）：' + name);
            continue;
        }
        const dst = path.join(outDir, name);
        fs.copyFileSync(src, dst);
        const size = fs.statSync(dst).size;
        const digest = sha256(dst);
        total += size;
        files.push({ path: 'resources/' + name, base: name, url: args.feed + '/' + version + '/' + encodeURIComponent(name), size: size, sha256: digest });
        console.log('  - %s  %s  %s', name.padEnd(14), human(size).padStart(10), digest.slice(0, 16) + '…');
    }
    if (!files.length) die('一个文件都没收集到，检查构建产物');

    const notes = args.notes || defaultNotes();
    const manifest = {
        version: version,
        date: new Date().toISOString().slice(0, 10),
        notes: notes,
        // 低于这个版本的客户端没有 updater.js，只能走手动安装，不参与增量
        minVersion: '1.1.1',
        files: files,
        // 下面几个字段是给 1.1.x 老客户端用的（它只会读 version/url，然后拿浏览器打开）。
        // 指向版本目录而不是具体文件：想手动装的人进去自己挑。
        url: args.feed + '/' + version + '/',
        file: '',
        size: 0,
        // 兜底：自动更新不可用时让用户下全量包
        full: args.feed + '/' + version + '/'
    };
    const manifestPath = path.join(OUT_ROOT, 'latest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    console.log('\n[build-update] ✓ 完成：v%s，共 %d 个文件，合计 %s', version, files.length, human(total));
    console.log('\n需要上传到 ' + args.feed + ' ：');
    console.log('  ① 覆盖  ' + path.relative(ROOT, manifestPath) + '  →  ' + args.feed + '/latest.json');
    files.forEach(f => {
        console.log('  ② 新建  ' + path.relative(ROOT, path.join(outDir, f.base)) + '  →  ' + args.feed + '/' + version + '/' + f.base);
    });
    console.log('\n更新说明：\n' + (notes ? notes.split('\n').map(s => '  · ' + s).join('\n') : '  （空）'));
    console.log('\n注意：minVersion=' + manifest.minVersion + '，低于它的安装只能手动装一次全量包。');
}

main();
