'use strict';
/**
 * slim-runtime.js —— 把 Electron 运行时里用不到的多语言包移出安装目录。
 *
 * 【为什么】
 *   electron-builder 默认把 55 个 locales/*.pak 全塞进包里（约 37MB）。
 *   本机是中文 Windows，Electron 只需要 zh-CN.pak，其余语言包从不被加载。
 *   保留 zh-CN / zh-TW / en-US / en-GB 四份足以覆盖系统与回退。
 *
 * 【安全】
 *   只「移动」，不删除：文件进工程内 .slim-archive/<安装目录名>/locales/，
 *   并写 manifest.json 记录原始位置。`node scripts/slim-runtime.js --restore`
 *   可以原样放回去。--dry 只报告不动手。
 *
 * 用法：
 *   node scripts/slim-runtime.js --to "D:\Program\timer-app" --to "E:\Programs\创作台\dist\win-unpacked"
 *   node scripts/slim-runtime.js --to "D:\Program\timer-app" --dry
 *   node scripts/slim-runtime.js --restore
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARCHIVE = path.join(ROOT, '.slim-archive');
/** 中文系统 + 英文回退，四份足够 */
const KEEP = new Set(['zh-CN.pak', 'zh-TW.pak', 'en-US.pak', 'en-GB.pak']);

function human(n) { return (n / 1024 / 1024).toFixed(1) + ' MB'; }
function slug(p) { return path.resolve(p).replace(/[\\/:]/g, '_').replace(/^_+/, '').slice(-90); }
function manifestPath(p) { return path.join(ARCHIVE, slug(p), 'manifest.json'); }

function move(from, to) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    try { fs.renameSync(from, to); }
    catch (e) { fs.copyFileSync(from, to); fs.unlinkSync(from); }
}

function dirSize(dir) {
    if (!fs.existsSync(dir)) return 0;
    let n = 0;
    (function walk(d) {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) walk(p);
            else n += fs.statSync(p).size;
        }
    })(dir);
    return n;
}

function slimOne(installDir, dry) {
    const locales = path.join(installDir, 'locales');
    if (!fs.existsSync(locales)) {
        console.log('[slim] 跳过（没有 locales/）：' + installDir);
        return 0;
    }
    const before = dirSize(installDir);
    const entries = [];
    fs.readdirSync(locales).forEach(name => {
        if (!name.endsWith('.pak') || KEEP.has(name)) return;
        const from = path.join(locales, name);
        const st = fs.statSync(from);
        if (!st.isFile()) return;
        entries.push({ name: name, from: from, to: path.join(ARCHIVE, slug(installDir), 'locales', name), size: st.size });
    });
    const bytes = entries.reduce((n, e) => n + e.size, 0);
    console.log(`[slim] ${installDir}`);
    console.log(`       移出 ${entries.length} 个语言包（${human(bytes)}），保留 ${KEEP.size} 个：${[...KEEP].join(', ')}`);
    if (!dry) {
        entries.forEach(e => move(e.from, e.to));
        const mf = manifestPath(installDir);
        fs.mkdirSync(path.dirname(mf), { recursive: true });
        const old = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : [];
        fs.writeFileSync(mf, JSON.stringify(old.concat(entries.map(e => ({
            name: e.name, from: e.from, to: e.to, size: e.size
        }))), null, 2), 'utf8');
    }
    const after = before - bytes;
    console.log(`       ${human(before)} -> ${human(after)}${dry ? '（试算，未改动）' : ''}`);
    return bytes;
}

function restore() {
    if (!fs.existsSync(ARCHIVE)) { console.log('没有归档，无需恢复'); return; }
    let count = 0, bytes = 0;
    fs.readdirSync(ARCHIVE).forEach(d => {
        const mf = path.join(ARCHIVE, d, 'manifest.json');
        if (!fs.existsSync(mf)) return;
        const entries = JSON.parse(fs.readFileSync(mf, 'utf8'));
        entries.forEach(e => {
            if (!fs.existsSync(e.to) || fs.existsSync(e.from)) return;
            move(e.to, e.from);
            count++; bytes += e.size;
        });
    });
    console.log(`[slim] 已恢复 ${count} 个文件（${human(bytes)}）到原安装目录。`);
}

function main() {
    const argv = process.argv.slice(2);
    const targets = [];
    let dry = false;
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--to') targets.push(path.resolve(argv[++i]));
        else if (argv[i] === '--dry') dry = true;
        else if (argv[i] === '--restore') { restore(); return; }
        else if (argv[i] === '-h' || argv[i] === '--help') {
            console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
            return;
        } else { console.error('未知参数：' + argv[i]); process.exit(1); }
    }
    if (!targets.length) {
        console.error('请至少指定一个 --to <安装目录>，或 --restore / --dry');
        process.exit(1);
    }
    let total = 0;
    targets.forEach(t => { total += slimOne(t, dry); });
    console.log(`\n[slim] 合计移出 ${human(total)}${dry ? '（试算）' : ''}，归档于 ${ARCHIVE}`);
}
main();
