'use strict';

/**
 * media-format.js —— 媒体格式判定（2026-11-06）
 *
 * 【为什么单独一个模块】
 *   以前入库只认图片，扩展名靠 `data:image/(\w+);base64` 正则硬取：
 *     · `data:image/svg+xml;base64,…` 匹配不上 → 整段 dataURL 被当 base64 解，存成坏 PNG；
 *     · 视频（mp4/webm/mov…）根本没有入口。
 *   现在图片 / SVG / 视频统一在这里决定 MIME 与扩展名，纯函数、可单元测试。
 */

/** 单个媒体文件上限：超过就不入库，避免把内存和磁盘打爆 */
const MAX_MEDIA_BYTES = 300 * 1024 * 1024;

const EXT_WHITELIST = {
    png: 1, jpg: 1, jpeg: 1, gif: 1, webp: 1, bmp: 1, svg: 1, ico: 1, avif: 1,
    mp4: 1, webm: 1, mov: 1, m4v: 1, ogv: 1, ogg: 1, mkv: 1, avi: 1,
    mp3: 1, m4a: 1, wav: 1
};

/** 各种 MIME 子类型 → 文件扩展名 */
function normalizeExt(ext) {
    let e = String(ext == null ? '' : ext).toLowerCase().trim();
    if (e === 'jpeg') return 'jpg';
    if (e === 'svg+xml') return 'svg';
    if (e === 'x-icon' || e === 'vnd.microsoft.icon') return 'ico';
    if (e === 'quicktime') return 'mov';
    if (e === 'x-matroska') return 'mkv';
    if (e === 'x-msvideo') return 'avi';
    if (e === 'mpeg') return 'mp3';
    if (e === 'x-wav' || e === 'wave') return 'wav';
    e = e.replace(/[^a-z0-9]/g, '');
    return EXT_WHITELIST[e] ? e : '';
}

function isMediaExt(ext) {
    return !!EXT_WHITELIST[String(ext || '').toLowerCase()];
}

/**
 * dataURL / 裸 base64 → { mime, ext, buffer }
 *   data:image/svg+xml;base64,…         → svg（base64）
 *   data:image/svg+xml;charset=utf-8,…  → svg（URL 编码的内联 SVG）
 *   data:video/mp4;base64,…             → mp4
 *   裸 base64                            → 按 png 处理（兼容旧调用）
 */
function parseDataUrl(input) {
    const raw = String(input == null ? '' : input);
    const m = /^data:([a-z]+\/[\w.+-]+)((?:;[^,]*)?),([\s\S]*)$/i.exec(raw);
    if (!m) {
        const buffer = Buffer.from(raw.replace(/\s/g, ''), 'base64');
        return { mime: 'image/png', ext: 'png', buffer: buffer };
    }
    const mime = m[1].toLowerCase();
    const meta = m[2] || '';
    const payload = m[3] || '';
    let ext = normalizeExt(mime.split('/')[1] || '');
    if (!ext && mime.startsWith('image/')) ext = 'png';
    if (!ext) throw new Error('不支持的媒体类型：' + mime);
    const buffer = /;\s*base64/i.test(meta)
        ? Buffer.from(payload, 'base64')
        : Buffer.from(decodeURIComponent(payload), 'utf8');
    return { mime: mime, ext: ext, buffer: buffer };
}

/** Content-Type → 扩展名（下载网络媒体时用） */
function extFromContentType(type) {
    const t = String(type || '').toLowerCase();
    if (!t) return '';
    if (t.indexOf('jpeg') !== -1) return 'jpg';
    if (t.indexOf('png') !== -1) return 'png';
    if (t.indexOf('gif') !== -1) return 'gif';
    if (t.indexOf('webp') !== -1) return 'webp';
    if (t.indexOf('bmp') !== -1) return 'bmp';
    if (t.indexOf('svg') !== -1) return 'svg';
    if (t.indexOf('icon') !== -1) return 'ico';
    if (t.indexOf('mp4') !== -1) return 'mp4';
    if (t.indexOf('webm') !== -1) return 'webm';
    if (t.indexOf('quicktime') !== -1) return 'mov';
    if (t.indexOf('matroska') !== -1) return 'mkv';
    if (t.indexOf('ogg') !== -1) return 'ogg';
    if (t.indexOf('mpeg') !== -1) return 'mp3';
    if (t.indexOf('wav') !== -1) return 'wav';
    return '';
}

/** URL 路径扩展名兜底（Content-Type 是 octet-stream 时） */
function extFromUrl(url) {
    try {
        const pathname = new URL(String(url)).pathname;
        const m = /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(pathname);
        if (!m) return '';
        const ext = m[1].toLowerCase();
        return isMediaExt(ext) ? ext : '';
    } catch (e) {
        return '';
    }
}

/** 判断一个地址是不是视频（渲染层插入 <video> 用） */
function isVideoLike(src) {
    const s = String(src || '');
    if (/^data:video\//i.test(s)) return true;
    return /\.(mp4|webm|mov|m4v|ogv|ogg|mkv|avi)(?:[?#]|$)/i.test(s);
}

module.exports = {
    MAX_MEDIA_BYTES: MAX_MEDIA_BYTES,
    normalizeExt: normalizeExt,
    isMediaExt: isMediaExt,
    isVideoLike: isVideoLike,
    parseDataUrl: parseDataUrl,
    extFromContentType: extFromContentType,
    extFromUrl: extFromUrl
};
