'use strict';

/**
 * store.js —— 主进程侧的集中数据存储（P2-3）
 *
 * 【要解决的问题】
 *   原先所有任务与设置都只存在于主窗口的 localStorage 里。主进程要读一个设置，
 *   必须执行 `mainWindow.webContents.executeJavaScript('localStorage.getItem(...)')`
 *   —— 异步、依赖主窗口存活、时序脆弱，且主进程在其它场景（数据备份、后续的
 *   移动端/局域网服务）根本拿不到数据。
 *
 * 【本模块做什么】
 *   在 `<userData>/app-data.json` 维护一份和 localStorage 始终保持同步的全量副本。
 *   渲染进程由 preload.js 负责把每一次写入镜像过来，主进程这边通过同步读接口
 *   （getItem/getAll）随时可用。
 *
 * 【为什么不会丢数据】
 *   渲染进程仍以 localStorage 为工作副本：写入总是「先落 localStorage，再镜像过来」。
 *   本模块即使整个失效，localStorage 里的数据也毫发无损；而 preload.js 会在下一次
 *   启动时用 localStorage 重新刷新这里的副本（自愈）。
 *
 * 【已知边界】
 *   - 超过 MAX_VALUE_BYTES 的单个值不进入集中存储（目前只有悬浮窗配图 floatImageData
 *     会命中，它是 data URL，可能有几 MB）。这类值继续只存在于 localStorage。
 *   - 只有主窗口允许「导入 / 回填」，悬浮窗不参与，避免两个窗口互相覆盖。
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/** 数据结构版本号，将来格式变化时用于迁移 */
const SCHEMA_VERSION = 1;

/** 单个值的大小上限：超过则跳过集中存储，避免把几 MB 的图片塞进 JSON */
const MAX_VALUE_BYTES = 512 * 1024;

let dataFile = null;
let backupFile = null;
let cache = {};
let hasStore = false;
let dirty = false;
let flushTimer = null;
let flushScheduled = false;
const skippedKeys = [];

function bytesOf(str) {
    return Buffer.byteLength(str, 'utf8');
}

/**
 * 初始化：定位文件、载入已有数据。
 * 必须在 app ready 之后调用（此时 userData 路径才是最终值）。
 */
function init() {
    const dir = app.getPath('userData');
    dataFile = path.join(dir, 'app-data.json');
    backupFile = path.join(dir, 'app-data.backup.json');
    loadFromDisk();
    return { file: dataFile, hasStore: hasStore, keys: Object.keys(cache).length };
}

function loadFromDisk() {
    if (!fs.existsSync(dataFile)) {
        hasStore = false;
        return;
    }
    try {
        const raw = fs.readFileSync(dataFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object') {
            cache = parsed.data;
            hasStore = true;
            // 留一份「本次会话开始前」的快照，作为误操作或损坏时的兜底还原点
            try {
                fs.copyFileSync(dataFile, backupFile);
            } catch (e) { /* 备份失败不影响主流程 */ }
            return;
        }
        throw new Error('文件结构不符合预期');
    } catch (e) {
        // 文件损坏：留档取证，然后当作「没有存储」处理。
        // 不用担心数据丢失 —— 渲染进程会用完整的 localStorage 重新导入。
        console.error('[store] app-data.json 解析失败，已留档备查：', e.message);
        try {
            fs.renameSync(dataFile, dataFile + '.corrupt-' + Date.now());
        } catch (e2) { /* ignore */ }
        cache = {};
        hasStore = false;
    }
}

/** 合并短时间内的多次写入，避免频繁落盘 */
function schedule() {
    dirty = true;
    if (flushScheduled) return;
    flushScheduled = true;
    flushTimer = setTimeout(function () {
        flushTimer = null;
        flushScheduled = false;
        flush();
    }, 180);
}

/** 原子写入：先写临时文件再改名，避免断电/崩溃时留下半截 JSON */
function flush() {
    if (!dataFile || !dirty) return;
    const payload = JSON.stringify({
        __v: SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        data: cache
    });
    const tmp = dataFile + '.tmp';
    try {
        fs.writeFileSync(tmp, payload, 'utf8');
        fs.renameSync(tmp, dataFile);
        dirty = false;
    } catch (e) {
        console.error('[store] 写入失败：', e);
        try {
            fs.unlinkSync(tmp);
        } catch (e2) { /* ignore */ }
    }
}

/** 退出前强制落盘，确保最后一批写入不丢 */
function flushSync() {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
        flushScheduled = false;
    }
    flush();
}

// ---------------- 读写接口（供主进程各模块直接调用） ----------------

/** 读取一个键，语义与 localStorage.getItem 一致（不存在返回 null） */
function getItem(key) {
    const k = String(key);
    return Object.prototype.hasOwnProperty.call(cache, k) ? cache[k] : null;
}

/** 返回全量数据的浅拷贝 */
function getAll() {
    return Object.assign({}, cache);
}

/**
 * 由渲染进程镜像过来的一次写入。
 * @param {string} key
 * @param {string} value
 * @param {number} [rev] 渲染进程侧的单调写入序号，用于双方判断新旧
 */
function setItem(key, value, rev) {
    const k = String(key);
    const v = String(value);
    // 先记序号再判断大小：即使这个值因过大被跳过，序号也要跟上，
    // 否则渲染进程会一直「领先」，每次启动都白白触发一次全量导入。
    if (rev) cache.__store_rev = String(rev);
    if (bytesOf(v) > MAX_VALUE_BYTES) {
        if (skippedKeys.indexOf(k) === -1) {
            skippedKeys.push(k);
            console.log('[store] 值过大，已跳过集中存储：' + k +
                '（' + Math.round(bytesOf(v) / 1024) + ' KB）');
        }
        schedule();
        return false;
    }
    cache[k] = v;
    schedule();
    return true;
}

/** 由渲染进程镜像过来的一次删除 */
function removeItem(key, rev) {
    const k = String(key);
    delete cache[k];
    if (rev) cache.__store_rev = String(rev);
    schedule();
}

/** 渲染进程清空 localStorage */
function clear() {
    cache = {};
    schedule();
}

/**
 * 用渲染进程的完整快照刷新本存储（首次迁移与每次启动的自愈路径）。
 * @param {object} obj localStorage 的全量 dump
 * @param {number} [rev]
 */
function importAll(obj, rev) {
    const next = {};
    if (obj && typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
            const v = obj[k];
            if (typeof v !== 'string') continue;
            if (bytesOf(v) > MAX_VALUE_BYTES) {
                if (skippedKeys.indexOf(k) === -1) skippedKeys.push(k);
                continue;
            }
            next[k] = v;
        }
    }
    if (rev) next.__store_rev = String(rev);
    cache = next;
    hasStore = true;
    dirty = true;
    flushSync();
    return Object.keys(cache).length;
}

/**
 * 供 preload 在启动时做新旧判断。
 * hasData 以「当前是否真的持有数据」为准，而不是「文件是否存在」——
 * 空文件与不存在的文件对调用方而言应当等效。
 */
function snapshot() {
    const data = Object.assign({}, cache);
    return { hasData: Object.keys(data).length > 0, data: data };
}

/** 诊断信息 */
function stats() {
    let bytes = 0;
    const keys = Object.keys(cache);
    for (const k of keys) bytes += bytesOf(cache[k] || '');
    return {
        file: dataFile,
        backupFile: backupFile,
        hasStore: hasStore,
        keys: keys.length,
        bytes: bytes,
        skipped: skippedKeys.slice()
    };
}

module.exports = {
    init,
    getItem,
    getAll,
    setItem,
    removeItem,
    clear,
    importAll,
    snapshot,
    stats,
    flushSync,
    MAX_VALUE_BYTES,
    SCHEMA_VERSION
};
