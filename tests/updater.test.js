'use strict';

/**
 * updater.test.js —— 无感更新的核心逻辑钉子
 *
 * 重点盯三件事：
 *   ① 清单校验必须能挡住「往 resources 之外写文件」的投毒清单
 *   ② 版本比较不能把 1.2.0 和 1.10.0 搞反
 *   ③ 检查 → 下载 → 校验 → 标记可安装，这条链要真的跑通（用本地 http 当更新源）
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const U = require('../updater');

function tmpDir(tag) {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'timer-updater-' + tag + '-'));
}

function sha256(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

// ==================== 版本比较 ====================

test('cmpVersion：按数字段比较，1.10.0 > 1.9.9', () => {
    assert.equal(U.cmpVersion('1.10.0', '1.9.9'), 1);
    assert.equal(U.cmpVersion('1.9.9', '1.10.0'), -1);
    assert.equal(U.cmpVersion('1.2.0', '1.2.0'), 0);
    assert.equal(U.cmpVersion('v1.2.1', '1.2.0'), 1);
    assert.equal(U.cmpVersion('1.2', '1.2.0'), 0);
    assert.equal(U.cmpVersion('2.0.0', '1.99.99'), 1);
});

// ==================== 路径白名单 ====================

test('sanitizeRelPath：挡住绝对路径 / 盘符 / 上跳 / 空段', () => {
    assert.equal(U.sanitizeRelPath('resources/app.asar'), 'resources/app.asar');
    assert.equal(U.sanitizeRelPath('resources\\app.asar'), 'resources/app.asar');
    assert.equal(U.sanitizeRelPath('resources/./app.asar'), '');
    assert.equal(U.sanitizeRelPath('../Windows/System32/x.dll'), '');
    assert.equal(U.sanitizeRelPath('resources/../../x'), '');
    assert.equal(U.sanitizeRelPath('/etc/passwd'), '');
    assert.equal(U.sanitizeRelPath('C:/Windows/x.dll'), '');
    assert.equal(U.sanitizeRelPath('c:\\windows\\x.dll'), '');
    assert.equal(U.sanitizeRelPath('file:///etc/passwd'), '');
    assert.equal(U.sanitizeRelPath(''), '');
    assert.equal(U.sanitizeRelPath('resources//app.asar'), '');
});

function goodFile(over) {
    const buf = Buffer.from('x');
    return Object.assign({
        path: 'resources/app.asar',
        url: 'https://example.com/1.2.0/app.asar',
        size: buf.length,
        sha256: sha256(buf)
    }, over || {});
}

function goodManifest(over) {
    return Object.assign({
        version: '1.2.0',
        date: '2026-11-17',
        notes: 'test',
        files: [goodFile()]
    }, over || {});
}

test('verifyManifest：正常清单通过，并算出总大小', () => {
    const r = U.verifyManifest(goodManifest());
    assert.equal(r.ok, true, r.error);
    assert.equal(r.manifest.version, '1.2.0');
    assert.equal(r.manifest.files.length, 1);
    assert.equal(r.manifest.files[0].base, 'app.asar');
    assert.equal(r.manifest.totalSize, 1);
});

test('verifyManifest：拒绝 resources 之外的路径（防投毒）', () => {
    ['Windows/System32/x.dll', 'resources2/app.asar', 'app.asar', 'resources/sub/app.asar'].forEach(p => {
        const r = U.verifyManifest(goodManifest({ files: [goodFile({ path: p })] }));
        assert.equal(r.ok, false, '应当拒绝：' + p);
    });
});

test('verifyManifest：拒绝上跳与绝对路径', () => {
    ['resources/../evil.js', '../resources/app.asar', 'C:/resources/app.asar', '/resources/app.asar'].forEach(p => {
        const r = U.verifyManifest(goodManifest({ files: [goodFile({ path: p })] }));
        assert.equal(r.ok, false, '应当拒绝：' + p);
    });
});

test('verifyManifest：拒绝白名单外的文件名', () => {
    const r = U.verifyManifest(goodManifest({ files: [goodFile({ path: 'resources/evil.dll' })] }));
    assert.equal(r.ok, false);
    assert.match(r.error, /不在允许清单内/);
});

test('verifyManifest：sha256 / size / url 不合法都要拒', () => {
    assert.equal(U.verifyManifest(goodManifest({ files: [goodFile({ sha256: 'abc' })] })).ok, false);
    assert.equal(U.verifyManifest(goodManifest({ files: [goodFile({ sha256: 'z'.repeat(64) })] })).ok, false);
    assert.equal(U.verifyManifest(goodManifest({ files: [goodFile({ size: 0 })] })).ok, false);
    assert.equal(U.verifyManifest(goodManifest({ files: [goodFile({ size: -5 })] })).ok, false);
    assert.equal(U.verifyManifest(goodManifest({ files: [goodFile({ url: 'ftp://x/y' })] })).ok, false);
    assert.equal(U.verifyManifest(goodManifest({ files: [goodFile({ url: '/relative/app.asar' })] })).ok, false);
});

test('verifyManifest：版本号与 files 缺失要拒', () => {
    assert.equal(U.verifyManifest(null).ok, false);
    assert.equal(U.verifyManifest([]).ok, false);
    assert.equal(U.verifyManifest(goodManifest({ version: 'abc' })).ok, false);
    assert.equal(U.verifyManifest(goodManifest({ files: [] })).ok, false);
    assert.equal(U.verifyManifest(goodManifest({ files: [goodFile(), goodFile()] })).ok, false, '重复文件要拒');
});

test('versionDirName：版本号变成安全的目录名', () => {
    assert.equal(U.versionDirName('1.2.0'), '1.2.0');
    assert.equal(U.versionDirName('1.2.0/../../x'), '1.2.0....x');
    assert.equal(U.versionDirName(''), 'unknown');
});

// ==================== 落地脚本 ====================

test('apply-update.js：语法合法，且包含备份 / 回滚 / 等待退出三件事', () => {
    const file = path.join(__dirname, '..', 'apply-update.js');
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);

    const src = fs.readFileSync(file, 'utf8');
    assert.match(src, /isAlive/, '必须等主进程退出后再替换');
    assert.match(src, /\.bak-update-/, '必须备份原文件');
    assert.match(src, /回滚/, '失败要能回滚');
    assert.match(src, /ELECTRON_RUN_AS_NODE|process\.exit/, '要能作为独立进程收尾');
});

// ==================== 端到端：检查 → 下载 → 校验 ====================

test('端到端：检查到新版本 → 下载 → 校验通过 → 标记可安装', async () => {
    const payloads = {
        'app.asar': Buffer.from('fake-asar-content-'.repeat(100)),
        'timer-cli.js': Buffer.from('#!/usr/bin/env node\nconsole.log(1)\n')
    };
    const cacheDir = tmpDir('e2e');

    let manifest = null;
    const server = http.createServer((req, res) => {
        const u = String(req.url || '').split('?')[0];
        if (u === '/latest.json') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(manifest));
            return;
        }
        const m = u.match(/^\/1\.2\.0\/([^/]+)$/);
        if (m && payloads[m[1]]) {
            const buf = payloads[m[1]];
            res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': buf.length });
            res.end(buf);
            return;
        }
        res.writeHead(404);
        res.end('nope');
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;
    const base = 'http://127.0.0.1:' + port;

    manifest = {
        version: '1.2.0',
        date: '2026-11-17',
        notes: '测试版本',
        files: Object.keys(payloads).map(name => ({
            path: 'resources/' + name,
            url: base + '/1.2.0/' + name,
            size: payloads[name].length,
            sha256: sha256(payloads[name])
        }))
    };

    try {
        const u = U.createUpdater({
            currentVersion: '1.1.1',
            feedUrl: base,
            cacheDir: cacheDir,
            installDir: tmpDir('e2e-install'),
            exeName: '计时器.exe',
            autoDownload: false,
            log: () => {}
        });

        const s1 = await u.check({ manual: true });
        assert.equal(s1.phase, 'available');
        assert.equal(s1.latest, '1.2.0');
        assert.equal(s1.canInstall, false);

        const s2 = await u.download();
        assert.equal(s2.phase, 'downloaded');
        assert.equal(s2.canInstall, true);
        assert.equal(s2.percent, 100);

        const got = path.join(cacheDir, 'pending', '1.2.0');
        Object.keys(payloads).forEach(name => {
            const f = path.join(got, name);
            assert.ok(fs.existsSync(f), '应该落下 ' + name);
            assert.equal(fs.readFileSync(f).toString(), payloads[name].toString());
        });
        assert.ok(fs.existsSync(path.join(got, 'manifest.json')), '要留下清单副本给落地脚本');

        // 再查一次：应直接复用已下载的包，不再重复下载
        const s3 = await u.check({ manual: true });
        assert.equal(s3.phase, 'downloaded');
        assert.equal(s3.canInstall, true);
    } finally {
        await new Promise(r => server.close(r));
        fs.rmSync(cacheDir, { recursive: true, force: true });
    }
});

test('端到端：摘要对不上时整批作废，不留半包', async () => {
    const good = Buffer.from('real-content');
    const cacheDir = tmpDir('bad');
    const manifest = {
        version: '1.2.0',
        files: [{
            path: 'resources/app.asar',
            url: '',       // 下面回填
            size: good.length,
            sha256: sha256(Buffer.from('something-else'))   // 故意写错
        }]
    };
    const server = http.createServer((req, res) => {
        const u = String(req.url || '').split('?')[0];
        if (u === '/latest.json') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(manifest));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': good.length });
        res.end(good);
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const base = 'http://127.0.0.1:' + server.address().port;
    manifest.files[0].url = base + '/1.2.0/app.asar';

    try {
        const u = U.createUpdater({
            currentVersion: '1.1.1',
            feedUrl: base,
            cacheDir: cacheDir,
            installDir: tmpDir('bad-install'),
            exeName: '计时器.exe',
            autoDownload: false,
            log: () => {}
        });
        await u.check({ manual: true });
        await assert.rejects(() => u.download(), /摘要不符/);
        assert.equal(u.state().phase, 'error');
        assert.equal(u.state().canInstall, false);
        assert.ok(!fs.existsSync(path.join(cacheDir, 'pending', '1.2.0', 'app.asar')), '不能留下半包');
    } finally {
        await new Promise(r => server.close(r));
        fs.rmSync(cacheDir, { recursive: true, force: true });
    }
});

test('端到端：已是最新版本时进入 up-to-date，不下载', async () => {
    const cacheDir = tmpDir('same');
    const buf = Buffer.from('x');
    const manifest = {
        version: '1.1.1',
        files: [{ path: 'resources/app.asar', url: 'https://example.com/a.asar', size: buf.length, sha256: sha256(buf) }]
    };
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(manifest));
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const base = 'http://127.0.0.1:' + server.address().port;
    try {
        const u = U.createUpdater({
            currentVersion: '1.1.1',
            feedUrl: base,
            cacheDir: cacheDir,
            installDir: tmpDir('same-install'),
            exeName: '计时器.exe',
            autoDownload: true,
            log: () => {}
        });
        const s = await u.check({ manual: false });
        assert.equal(s.phase, 'up-to-date');
        assert.equal(s.canInstall, false);
    } finally {
        await new Promise(r => server.close(r));
        fs.rmSync(cacheDir, { recursive: true, force: true });
    }
});

// ==================== 启动对账 ====================

test('reconcile：暂存区里是更高版本 → 标记为可安装（上次没装上）', () => {
    const cacheDir = tmpDir('reconcile');
    const ver = '1.2.0';
    const dir = path.join(cacheDir, 'pending', ver);
    fs.mkdirSync(dir, { recursive: true });
    const buf = Buffer.from('asar-bytes');
    fs.writeFileSync(path.join(dir, 'app.asar'), buf);
    const manifest = {
        version: ver,
        notes: 'n',
        files: [{ path: 'resources/app.asar', base: 'app.asar', url: 'https://e.com/a', size: buf.length, sha256: sha256(buf) }]
    };
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest), 'utf8');
    fs.writeFileSync(path.join(cacheDir, 'state.json'), JSON.stringify({ version: ver, phase: 'downloaded' }), 'utf8');

    const u = U.createUpdater({
        currentVersion: '1.1.1',
        feedUrl: 'https://example.com',
        cacheDir: cacheDir,
        installDir: tmpDir('reconcile-install'),
        exeName: '计时器.exe',
        enabled: true,
        log: () => {}
    });
    const s = u.reconcile();
    assert.equal(s.phase, 'downloaded');
    assert.equal(s.canInstall, true);
    assert.equal(s.latest, ver);
    fs.rmSync(cacheDir, { recursive: true, force: true });
});

test('reconcile：暂存区版本等于当前版本 → 认为已生效并清理', () => {
    const cacheDir = tmpDir('reconcile2');
    const ver = '1.2.0';
    const dir = path.join(cacheDir, 'pending', ver);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ version: ver }), 'utf8');
    fs.writeFileSync(path.join(cacheDir, 'state.json'), JSON.stringify({ version: ver }), 'utf8');

    const u = U.createUpdater({
        currentVersion: '1.2.0',
        feedUrl: 'https://example.com',
        cacheDir: cacheDir,
        installDir: tmpDir('reconcile2-install'),
        exeName: '计时器.exe',
        log: () => {}
    });
    const s = u.reconcile();
    assert.equal(s.phase, 'idle');
    assert.ok(!fs.existsSync(path.join(cacheDir, 'pending', ver)), '应清掉已生效的暂存包');
    fs.rmSync(cacheDir, { recursive: true, force: true });
});
