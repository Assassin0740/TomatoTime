'use strict';

/**
 * media-format.test.js —— 媒体格式判定（2026-11-06）
 * 覆盖：SVG（base64 / URL 编码）、视频（mp4 / webm / mov）、JPEG 别名、裸 base64、网络类型与 URL 兜底。
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../media-format.js');

test('SVG base64：识别为 svg，字节原样保留', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';
    const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64');
    const r = M.parseDataUrl(dataUrl);
    assert.equal(r.ext, 'svg');
    assert.equal(r.mime, 'image/svg+xml');
    assert.equal(r.buffer.toString('utf8'), svg);
});

test('SVG URL 编码（非 base64）：解码后按 UTF-8 存', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>测试 #1</text></svg>';
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const r = M.parseDataUrl(dataUrl);
    assert.equal(r.ext, 'svg');
    assert.equal(r.buffer.toString('utf8'), svg);
});

test('视频：mp4 / webm / quicktime 都能落到正确扩展名', () => {
    assert.equal(M.parseDataUrl('data:video/mp4;base64,AAAA').ext, 'mp4');
    assert.equal(M.parseDataUrl('data:video/webm;base64,AAAA').ext, 'webm');
    assert.equal(M.parseDataUrl('data:video/quicktime;base64,AAAA').ext, 'mov');
});

test('图片别名：jpeg→jpg、svg+xml→svg、x-icon→ico', () => {
    assert.equal(M.parseDataUrl('data:image/jpeg;base64,AAAA').ext, 'jpg');
    assert.equal(M.parseDataUrl('data:image/svg+xml;base64,AAAA').ext, 'svg');
    assert.equal(M.parseDataUrl('data:image/x-icon;base64,AAAA').ext, 'ico');
});

test('裸 base64 保持旧行为：按 png 处理', () => {
    const r = M.parseDataUrl(Buffer.from('abc').toString('base64'));
    assert.equal(r.ext, 'png');
    assert.equal(r.buffer.toString('utf8'), 'abc');
});

test('不支持的媒体类型要报错，而不是存成坏文件', () => {
    assert.throws(() => M.parseDataUrl('data:application/pdf;base64,AAAA'), /不支持的媒体类型/);
});

test('Content-Type → 扩展名', () => {
    assert.equal(M.extFromContentType('image/svg+xml'), 'svg');
    assert.equal(M.extFromContentType('video/mp4'), 'mp4');
    assert.equal(M.extFromContentType('video/quicktime'), 'mov');
    assert.equal(M.extFromContentType('image/jpeg'), 'jpg');
    assert.equal(M.extFromContentType('application/octet-stream'), '');
});

test('URL 扩展名兜底：大小写与 query 都要认', () => {
    assert.equal(M.extFromUrl('https://a.com/v/CLIP.MP4?token=1'), 'mp4');
    assert.equal(M.extFromUrl('https://a.com/a.svg#x'), 'svg');
    assert.equal(M.extFromUrl('https://a.com/noext'), '');
    assert.equal(M.extFromUrl('not a url'), '');
});

test('isVideoLike：dataURL 与常见扩展名', () => {
    assert.equal(M.isVideoLike('data:video/mp4;base64,AAAA'), true);
    assert.equal(M.isVideoLike('file:///C:/a/b.MP4'), true);
    assert.equal(M.isVideoLike('https://a.com/b.webm?v=1'), true);
    assert.equal(M.isVideoLike('file:///C:/a/b.png'), false);
});

test('上限是 300MB', () => {
    assert.equal(M.MAX_MEDIA_BYTES, 300 * 1024 * 1024);
});
