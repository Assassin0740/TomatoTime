'use strict';

/**
 * probe-update-apply.js —— 实测 apply-update.js 的落地逻辑（不启动真实应用）
 *
 * 覆盖三件事：
 *   ① 正常替换：新内容写进去，旧内容进了 .bak-update-<版本>
 *   ② 只读文件：也能被替换（Windows 上常见）
 *   ③ 源文件缺失：整体回滚，安装目录保持原样
 *
 * 用法：node tests/manual/probe-update-apply.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'apply-update.js');
/** 不存在的 PID：落地脚本会立刻认为「主进程已退出」，不用真的等 */
const DEAD_PID = '999999';

let pass = 0;
let fail = 0;

function check(name, cond, detail) {
    if (cond) {
        pass++;
        console.log('  ✓ ' + name);
    } else {
        fail++;
        console.log('  ✗ ' + name + (detail ? ' → ' + detail : ''));
    }
}

function mkTmp(tag) {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'probe-apply-' + tag + '-'));
}

function setup(appDir, srcDir, files, opts) {
    const o = opts || {};
    fs.mkdirSync(path.join(appDir, 'resources'), { recursive: true });
    fs.mkdirSync(srcDir, { recursive: true });

    const manifest = { version: o.version || '1.2.0', files: [] };
    for (const name of files) {
        const oldContent = 'OLD-' + name;
        const newContent = 'NEW-' + name;
        const dst = path.join(appDir, 'resources', name);
        const src = path.join(srcDir, name);

        if (!o.skipOld) fs.writeFileSync(dst, oldContent, 'utf8');
        if (!o.missSource || o.missSource !== name) fs.writeFileSync(src, newContent, 'utf8');
        // missSource 时其他文件的 sha 无所谓，落地脚本不校验（校验在下载阶段做完了）
        manifest.files.push({ path: 'resources/' + name, base: name, size: newContent.length });
    }
    fs.writeFileSync(path.join(srcDir, 'manifest.json'), JSON.stringify(manifest), 'utf8');
    return manifest;
}

function runApply(appDir, srcDir, restart) {
    return spawnSync(process.execPath, [
        SCRIPT,
        '--pid', DEAD_PID,
        '--app', appDir,
        '--src', srcDir,
        '--exe', '计时器.exe',
        '--restart', restart ? '1' : '0'
    ], { encoding: 'utf8', timeout: 60000 });
}

// ==================== ① 正常替换 ====================
console.log('\n[1] 正常替换 + 备份');
{
    const appDir = mkTmp('ok-app');
    const srcDir = mkTmp('ok-src');
    setup(appDir, srcDir, ['app.asar', 'timer-cli.js']);
    const r = runApply(appDir, srcDir, false);

    check('退出码为 0', r.status === 0, 'status=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 200));
    check('app.asar 已换成新内容',
        fs.readFileSync(path.join(appDir, 'resources', 'app.asar'), 'utf8') === 'NEW-app.asar');
    check('timer-cli.js 已换成新内容',
        fs.readFileSync(path.join(appDir, 'resources', 'timer-cli.js'), 'utf8') === 'NEW-timer-cli.js');
    check('旧 app.asar 备份在 .bak-update-1.2.0',
        fs.existsSync(path.join(appDir, 'resources', 'app.asar.bak-update-1.2.0')));
    check('备份内容是旧版本',
        fs.readFileSync(path.join(appDir, 'resources', 'app.asar.bak-update-1.2.0'), 'utf8') === 'OLD-app.asar');
    check('暂存区里的文件已清理',
        !fs.existsSync(path.join(srcDir, 'app.asar')));
    check('留下了 apply.log',
        fs.existsSync(path.join(srcDir, 'apply.log')));
    fs.rmSync(appDir, { recursive: true, force: true });
    fs.rmSync(srcDir, { recursive: true, force: true });
}

// ==================== ② 只读文件 ====================
console.log('\n[2] 目标文件只读时仍能替换');
{
    const appDir = mkTmp('ro-app');
    const srcDir = mkTmp('ro-src');
    setup(appDir, srcDir, ['app.asar']);
    const dst = path.join(appDir, 'resources', 'app.asar');
    fs.chmodSync(dst, 0o444);   // 去掉写位
    const r = runApply(appDir, srcDir, false);

    check('退出码为 0', r.status === 0, 'status=' + r.status);
    check('只读文件已被替换',
        fs.readFileSync(dst, 'utf8') === 'NEW-app.asar');
    fs.rmSync(appDir, { recursive: true, force: true });
    fs.rmSync(srcDir, { recursive: true, force: true });
}

// ==================== ③ 源文件缺失 → 回滚 ====================
console.log('\n[3] 中途失败要整体回滚');
{
    const appDir = mkTmp('rb-app');
    const srcDir = mkTmp('rb-src');
    // app.asar 正常，timer-cli.js 故意不给源文件
    setup(appDir, srcDir, ['app.asar', 'timer-cli.js'], { missSource: 'timer-cli.js' });
    const r = runApply(appDir, srcDir, false);

    check('退出码为 4（失败）', r.status === 4, 'status=' + r.status);
    check('先换掉的 app.asar 已回滚成旧内容',
        fs.readFileSync(path.join(appDir, 'resources', 'app.asar'), 'utf8') === 'OLD-app.asar');
    check('未受影响的文件保持原样',
        fs.readFileSync(path.join(appDir, 'resources', 'timer-cli.js'), 'utf8') === 'OLD-timer-cli.js');
    const log = fs.existsSync(path.join(srcDir, 'apply.log'))
        ? fs.readFileSync(path.join(srcDir, 'apply.log'), 'utf8') : '';
    check('日志里记了回滚', /回滚/.test(log), log.slice(0, 200));
    fs.rmSync(appDir, { recursive: true, force: true });
    fs.rmSync(srcDir, { recursive: true, force: true });
}

// ==================== ④ 参数缺失要安全退出 ====================
console.log('\n[4] 参数缺失时不能乱动文件');
{
    const r = spawnSync(process.execPath, [SCRIPT, '--pid', DEAD_PID], { encoding: 'utf8', timeout: 30000 });
    check('退出码为 1', r.status === 1, 'status=' + r.status);
}

console.log('\n结果：' + pass + ' 通过，' + fail + ' 失败\n');
process.exit(fail ? 1 : 0);
