'use strict';

/**
 * archive.js 单元测试（2026-11-06）
 * 用最小 ZIP 构造器生成测试用压缩包（stored / deflate / 中文名 / 目录 / 加密标志），
 * 覆盖「列条目 → 按需解单个条目」的完整链路。
 */
const test = require('node:test');
const assert = require('node:assert');
const zlib = require('node:zlib');
const ARC = require('../archive');

/* ---------------- 最小 ZIP 构造器 ---------------- */

const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return t;
})();

function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
}

function buildZip(files, opts) {
    const options = opts || {};
    const chunks = [];
    const central = [];
    let offset = 0;
    files.forEach(f => {
        const raw = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data), 'utf8');
        const useDeflate = !!f.deflate;
        const comp = useDeflate ? zlib.deflateRawSync(raw) : raw;
        const nameBuf = Buffer.from(f.name, 'utf8');
        const crc = crc32(raw);
        const flags = 0x800 | (f.encrypted ? 0x1 : 0);

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(flags, 6);
        local.writeUInt16LE(useDeflate ? 8 : 0, 8);
        local.writeUInt32LE(0, 10);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(comp.length, 18);
        local.writeUInt32LE(raw.length, 22);
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28);
        chunks.push(local, nameBuf, comp);

        const cen = Buffer.alloc(46);
        cen.writeUInt32LE(0x02014b50, 0);
        cen.writeUInt16LE(20, 4);
        cen.writeUInt16LE(20, 6);
        cen.writeUInt16LE(flags, 8);
        cen.writeUInt16LE(useDeflate ? 8 : 0, 10);
        cen.writeUInt32LE(0, 12);
        cen.writeUInt32LE(crc, 16);
        cen.writeUInt32LE(comp.length, 20);
        cen.writeUInt32LE(raw.length, 24);
        cen.writeUInt16LE(nameBuf.length, 28);
        cen.writeUInt16LE(0, 30);
        cen.writeUInt16LE(0, 32);
        cen.writeUInt16LE(0, 34);
        cen.writeUInt16LE(0, 36);
        cen.writeUInt32LE(0, 38);
        cen.writeUInt32LE(offset, 42);
        central.push(Buffer.concat([cen, nameBuf]));
        offset += 30 + nameBuf.length + comp.length;
    });

    const cd = Buffer.concat(central);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(cd.length, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(options.comment ? options.comment.length : 0, 20);
    const tail = Buffer.concat([cd, eocd]);
    if (options.comment) {
        return Buffer.concat([...chunks, tail, Buffer.from(options.comment, 'utf8')]);
    }
    return Buffer.concat([...chunks, tail]);
}

/* ---------------- 用例 ---------------- */

test('isZip：ZIP / APK / DOCX 都能认出，普通文件与空 Buffer 不算', () => {
    assert.equal(ARC.isZip(buildZip([{ name: 'a.txt', data: 'x' }])), true);
    assert.equal(ARC.isZip(Buffer.from([0x50, 0x4b, 0x03, 0x04])), true);
    assert.equal(ARC.isZip(Buffer.from('hello world', 'utf8')), false);
    assert.equal(ARC.isZip(Buffer.alloc(0)), false);
    assert.equal(ARC.isZip(null), false);
});

test('listEntries：文件名、目录标记、大小都对', () => {
    const zip = buildZip([
        { name: 'docs/', data: '' },
        { name: 'docs/需求.docx', data: 'hello' },
        { name: 'images/cat.png', data: 'PNGDATA', deflate: true }
    ]);
    const entries = ARC.listEntries(zip);
    assert.equal(entries.length, 3);
    assert.equal(entries[0].name, 'docs/');
    assert.equal(entries[0].dir, true);
    assert.equal(entries[1].name, 'docs/需求.docx', 'UTF-8 标志位下中文名不乱码');
    assert.equal(entries[1].dir, false);
    assert.equal(entries[1].size, 5);
    assert.equal(entries[2].deflate, undefined);
    assert.equal(entries[2].method, 8);
    assert.equal(entries[2].size, 7);
});

test('extractEntry：stored 与 deflate 都能还原原始内容', () => {
    const zip = buildZip([
        { name: 'raw.txt', data: '不压缩的内容' },
        { name: 'packed.txt', data: '压缩后的内容'.repeat(20), deflate: true }
    ]);
    const entries = ARC.listEntries(zip);
    assert.equal(ARC.extractEntry(zip, entries[0]).toString('utf8'), '不压缩的内容');
    assert.equal(ARC.extractEntry(zip, entries[1]).toString('utf8'), '压缩后的内容'.repeat(20));
});

test('extractEntry：目录条目返回空 Buffer', () => {
    const zip = buildZip([{ name: 'folder/', data: '' }, { name: 'folder/a.txt', data: 'a' }]);
    const entries = ARC.listEntries(zip);
    assert.equal(ARC.extractEntry(zip, entries[0]).length, 0);
});

test('加密条目：能列出来但不尝试解压', () => {
    const zip = buildZip([{ name: 'secret.txt', data: 'x', encrypted: true }]);
    const entries = ARC.listEntries(zip);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].encrypted, true);
    assert.throws(() => ARC.extractEntry(zip, entries[0]), /加密/);
});

test('summarize：文件数 / 目录数 / 总大小', () => {
    const zip = buildZip([
        { name: 'a/', data: '' },
        { name: 'a/1.txt', data: '12345' },
        { name: 'a/2.txt', data: '1234567890' }
    ]);
    const s = ARC.summarize(ARC.listEntries(zip));
    assert.equal(s.files, 2);
    assert.equal(s.dirs, 1);
    assert.equal(s.totalSize, 15);
    assert.equal(s.truncated, false);
});

test('带注释的 ZIP：EOCD 能从尾部正确找到', () => {
    const zip = buildZip([{ name: 'a.txt', data: 'x' }], { comment: '这是压缩包注释' });
    assert.ok(ARC.findEocd(zip) > 0);
    assert.equal(ARC.listEntries(zip).length, 1);
});

test('异常输入：非 ZIP / 结构损坏都明确报错', () => {
    assert.throws(() => ARC.listEntries(Buffer.from('not a zip', 'utf8')), /不是 ZIP/);
    const zip = buildZip([{ name: 'a.txt', data: 'x' }]);
    const broken = zip.subarray(0, zip.length - 30);
    assert.throws(() => ARC.listEntries(broken), /ZIP 结构损坏|目录/);
    assert.throws(() => ARC.extractEntry(zip, null), /条目不存在/);
});

test('中文名 GBK 回退：UTF-8 标志位没置位也不崩', () => {
    // 手工造一个 flags 不含 0x800 的条目；名字用 utf8 字节，解出来必须仍是字符串
    const zip = buildZip([{ name: '说明.txt', data: 'x' }]);
    // 清掉中央目录里的 UTF-8 标志位
    const eocd = ARC.findEocd(zip);
    const cdOffset = zip.readUInt32LE(eocd + 16);
    zip.writeUInt16LE(0, cdOffset + 8);
    const entries = ARC.listEntries(zip);
    assert.equal(typeof entries[0].name, 'string');
    assert.ok(entries[0].name.length > 0);
});
