'use strict';

/**
 * archive.js —— 零依赖 ZIP 读取（2026-11-06）
 *
 * 【解决什么问题】
 *   任务里要能放任意文件（Word / PPT / APK / ZIP…），并且 ZIP 类文件点开要能
 *   看到里面有什么、里面的图片还要能预览。Electron 没有内置解压能力，
 *   引一个解压库又会把安装包体积和依赖链拖大，所以这里直接读 ZIP 结构：
 *   中央目录 → 条目列表；预览时按需解单个条目（stored / deflate 两种压缩方式）。
 *
 * 【为什么连 APK / DOCX 也能当压缩包看】
 *   它们本来就是 ZIP（PK\x03\x04 开头），走同一套解析即可，
 *   只是预览面板里显示的是内部文件列表。
 *
 * 【边界】
 *   - 只支持单卷 ZIP；ZIP64（>4GB 或条目数 >65535）明确报错，不猜。
 *   - 加密条目（flag bit0）不尝试破解，列出来但标 encrypted。
 *   - 不写盘、不递归解压，纯 Buffer 处理，方便单测。
 */
const zlib = require('zlib');

const SIG_EOCD = 0x06054b50;
const SIG_EOCD64_LOCATOR = 0x07064b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

/** 单个条目解压后的上限：预览用，不解大文件 */
const MAX_ENTRY_BYTES = 40 * 1024 * 1024;
/** 最多列出多少条目，防止有人塞几十万个小文件把界面拖死 */
const MAX_ENTRIES = 4000;

function isZip(buffer) {
    if (!buffer || buffer.length < 4) return false;
    return buffer[0] === 0x50 && buffer[1] === 0x4b &&
        (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
        (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);
}

/** 从尾部往前找 EOCD（注释长度最多 65535，所以只回溯这么远） */
function findEocd(buffer) {
    const minPos = Math.max(0, buffer.length - 22 - 0xffff);
    for (let i = buffer.length - 22; i >= minPos; i--) {
        if (buffer.readUInt32LE(i) === SIG_EOCD) return i;
    }
    return -1;
}

/** 条目名编码：UTF-8 标志位没置位的中文 ZIP 多是 GBK，尽力而为 */
function decodeName(raw, isUtf8) {
    if (isUtf8) return raw.toString('utf8');
    try {
        return new TextDecoder('gbk').decode(raw);
    } catch (e) {
        return raw.toString('utf8');
    }
}

/**
 * 解析中央目录，返回所有条目。
 * 返回 [{ name, dir, size, compressedSize, method, encrypted, offset, nameLength, extraLength }]
 */
function listEntries(buffer) {
    if (!isZip(buffer)) throw new Error('不是 ZIP 格式的文件');
    const eocd = findEocd(buffer);
    if (eocd < 0) throw new Error('ZIP 结构损坏：找不到目录尾');
    if (buffer.readUInt32LE(Math.max(0, eocd - 20)) === SIG_EOCD64_LOCATOR) {
        throw new Error('暂不支持 ZIP64（超过 4GB 或条目数过多）');
    }

    const total = buffer.readUInt16LE(eocd + 10);
    const cdOffset = buffer.readUInt32LE(eocd + 16);
    if (total === 0xffff) throw new Error('暂不支持 ZIP64（条目数超过 65535）');
    if (cdOffset >= buffer.length) throw new Error('ZIP 结构损坏：目录偏移越界');

    const entries = [];
    let p = cdOffset;
    for (let i = 0; i < total && p + 46 <= buffer.length; i++) {
        if (buffer.readUInt32LE(p) !== SIG_CENTRAL) break;
        const flags = buffer.readUInt16LE(p + 8);
        const method = buffer.readUInt16LE(p + 10);
        const compressedSize = buffer.readUInt32LE(p + 20);
        const size = buffer.readUInt32LE(p + 24);
        const nameLength = buffer.readUInt16LE(p + 28);
        const extraLength = buffer.readUInt16LE(p + 30);
        const commentLength = buffer.readUInt16LE(p + 32);
        const localOffset = buffer.readUInt32LE(p + 42);
        const rawName = buffer.subarray(p + 46, p + 46 + nameLength);
        const name = decodeName(rawName, (flags & 0x800) !== 0);
        entries.push({
            name: name,
            dir: name.endsWith('/') || name.endsWith('\\'),
            size: size,
            compressedSize: compressedSize,
            method: method,
            encrypted: (flags & 0x1) !== 0,
            offset: localOffset
        });
        p += 46 + nameLength + extraLength + commentLength;
        if (entries.length >= MAX_ENTRIES) break;
    }
    return entries;
}

/** 取单个条目的原始数据（未解压） */
function readEntryData(buffer, entry) {
    const p = entry.offset;
    if (p + 30 > buffer.length || buffer.readUInt32LE(p) !== SIG_LOCAL) {
        throw new Error('ZIP 结构损坏：条目位置无效');
    }
    const nameLength = buffer.readUInt16LE(p + 26);
    const extraLength = buffer.readUInt16LE(p + 28);
    const start = p + 30 + nameLength + extraLength;
    const end = start + entry.compressedSize;
    if (end > buffer.length) throw new Error('ZIP 结构损坏：条目数据越界');
    return buffer.subarray(start, end);
}

/** 解一个条目，返回 Buffer */
function extractEntry(buffer, entry) {
    if (!entry || typeof entry !== 'object') throw new Error('条目不存在');
    if (entry.encrypted) throw new Error('该文件已加密，无法预览');
    if (entry.dir) return Buffer.alloc(0);
    if (entry.size > MAX_ENTRY_BYTES) {
        throw new Error('文件超过 ' + Math.round(MAX_ENTRY_BYTES / 1024 / 1024) + 'MB，过大无法预览');
    }
    const data = readEntryData(buffer, entry);
    if (entry.method === 0) return Buffer.from(data);
    if (entry.method === 8) {
        const out = zlib.inflateRawSync(data, { maxOutputLength: MAX_ENTRY_BYTES });
        return out;
    }
    throw new Error('不支持的压缩方式（method=' + entry.method + '）');
}

/** 压缩包摘要：给界面上「共 N 个文件 · 原始大小 X」用 */
function summarize(entries) {
    let files = 0;
    let dirs = 0;
    let totalSize = 0;
    entries.forEach(e => {
        if (e.dir) dirs++;
        else { files++; totalSize += e.size; }
    });
    return { files: files, dirs: dirs, totalSize: totalSize, truncated: entries.length >= MAX_ENTRIES };
}

module.exports = {
    MAX_ENTRY_BYTES: MAX_ENTRY_BYTES,
    MAX_ENTRIES: MAX_ENTRIES,
    isZip: isZip,
    findEocd: findEocd,
    listEntries: listEntries,
    readEntryData: readEntryData,
    extractEntry: extractEntry,
    summarize: summarize
};
