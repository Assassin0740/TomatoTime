'use strict';

/**
 * clipboard-table.js —— 剪贴板表格解析（2026-11-05）
 *
 * 【解决什么问题】
 *   腾讯文档 / 在线表格 / Excel / 网页复制一块表格时，剪贴板里通常是：
 *     · text/html：带 <table> 的富文本（腾讯文档还会塞 <meta>、<style>、CF_HTML 注释、内联样式）
 *     · text/plain：制表符分隔的 TSV（有时干脆是空的）
 *   旧粘贴逻辑只处理「图片」和「纯文本」，HTML 被整段丢掉；text/plain 为空时直接 return，
 *   于是表格内容既读不到、更变不成表格。
 *
 * 【职责边界】
 *   这里只做纯字符串处理，不碰 DOM：浏览器用 <script> 加载（window.ClipboardTable），
 *   Node 里 require() 后可单元测试。DOM 插入、光标、落盘仍由 renderer.js 负责。
 *   生成的 HTML 对所有单元格文本做转义，外部剪贴板里的 <script> / on* 属性一律不会带进应用。
 *
 * 【用法】
 *   const data = ClipboardTable.extract(html, plain);   // null 表示这次粘贴不是表格
 *   const html = ClipboardTable.rowsToTableHtml(data);  // 可插入 contenteditable 的表格
 */
(function (root, factory) {
    const api = factory();
    // 【2026-11-06 修复】窗口开了 nodeIntegration，渲染进程里 `module` 是存在的：
    // 旧写法走 CommonJS 分支，window.ClipboardTable 根本没挂上，表格粘贴一直空转。
    // 现在两边都挂：浏览器 / Electron 渲染进程用 window，Node 单测用 module.exports。
    if (typeof window !== 'undefined') window.ClipboardTable = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const NAMED_ENTITIES = {
        amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
        ensp: ' ', emsp: ' ', thinsp: ' ', zwj: '', zwnj: '',
        hellip: '…', mdash: '—', ndash: '–', bull: '•', middot: '·'
    };

    function codePoint(n) {
        if (!isFinite(n) || n < 0 || n > 0x10FFFF) return '';
        try { return String.fromCodePoint(n); } catch (e) { return ''; }
    }

    /** HTML 实体还原：&nbsp; &#160; &#xA0; &amp; 等 */
    function decodeEntities(s) {
        return String(s == null ? '' : s)
            .replace(/&#x([0-9a-f]+);/gi, (m, h) => codePoint(parseInt(h, 16)))
            .replace(/&#(\d+);/g, (m, d) => codePoint(parseInt(d, 10)))
            .replace(/&([a-z]+);/gi, (m, name) => {
                const key = name.toLowerCase();
                return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key)
                    ? NAMED_ENTITIES[key] : m;
            })
            .replace(/\u00a0/g, ' ');
    }

    function escapeHtmlText(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** 取标签里的属性值（双引号 / 单引号 / 无引号都认），并做实体还原 */
    function attrValue(tagHtml, name) {
        const re = new RegExp(name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i');
        const m = re.exec(String(tagHtml == null ? '' : tagHtml));
        if (!m) return '';
        const raw = m[1] != null ? m[1] : (m[2] != null ? m[2] : (m[3] || ''));
        return decodeEntities(raw).trim();
    }

    /** 行内空白 / 连续空行清理（cellText 与 cellParts 共用同一套规则） */
    function tidyText(text) {
        return String(text == null ? '' : text)
            .replace(/\r/g, '')
            .replace(/\u200b/g, '')
            .split('\n')
            .map(line => line.replace(/[ \t]+$/g, '').replace(/^[ \t]+/g, ''))
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^\n+|\n+$/g, '');
    }

    /** 单元格 innerHTML → 纯文本：<br> 和块级结束标签转换行，其余标签剥掉 */
    function cellText(raw) {
        return tidyText(decodeEntities(String(raw == null ? '' : raw)
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|li|h[1-6]|ul|ol|section|blockquote)>/gi, '\n')
            .replace(/<[^>]*>/g, '')));
    }

    /**
     * 【2026-11-06】单元格内容拆成「文字 + 图片」有序片段。
     * 腾讯文档的表格里经常整格都是图片（产品图、Icon、缩略图），旧实现只取 textContent，
     * 图片被整体丢掉，粘进来就是一格空白。这里把 <img> 抠成占位符，剥完标签后再按原顺序还原。
     * 返回 [{t:'text',v} | {t:'img',v:src}]，图片地址优先取 data-src（懒加载站点真实地址）。
     */
    const IMG_MARK = '\u0001';

    function cellParts(raw) {
        const parts = [];
        if (raw == null || raw === '') return parts;
        const imgs = [];
        const marked = String(raw)
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
            .replace(/<img\b[^>]*>/gi, tag => {
                const src = attrValue(tag, 'data-src') || attrValue(tag, 'src');
                if (!src) return '';
                imgs.push(src);
                return IMG_MARK + (imgs.length - 1) + IMG_MARK;
            })
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|li|h[1-6]|ul|ol|section|blockquote)>/gi, '\n')
            .replace(/<[^>]*>/g, '');
        const tokens = decodeEntities(marked).split(/\u0001(\d+)\u0001/);
        tokens.forEach((chunk, i) => {
            if (i % 2 === 1) {
                const src = imgs[parseInt(chunk, 10)];
                if (src) parts.push({ t: 'img', v: src });
                return;
            }
            const text = tidyText(chunk);
            if (text) parts.push({ t: 'text', v: text });
        });
        return parts;
    }

    function attrInt(attrs, name) {
        const m = new RegExp(name + '\\s*=\\s*["\']?(\\d+)', 'i').exec(attrs || '');
        const n = m ? parseInt(m[1], 10) : 1;
        return Math.max(1, Math.min(50, isNaN(n) ? 1 : n));
    }

    /**
     * 展开 colspan / rowspan，返回规整的二维矩阵。
     * 合并单元格的值会填满它覆盖的所有格子：拆成普通表格后每一行都还能看到归属，不丢信息。
     * 有图片的单元格输出 { text, imgs, parts } 对象，纯文字单元格仍是字符串（保持向后兼容）。
     */
    function expandCells(rawRows) {
        const grid = [];
        const occupied = Object.create(null);
        rawRows.forEach((cells, ri) => {
            if (!grid[ri]) grid[ri] = [];
            let col = 0;
            cells.forEach(cell => {
                while (occupied[ri + ':' + col]) col++;
                for (let dr = 0; dr < cell.rowspan; dr++) {
                    const r = ri + dr;
                    if (!grid[r]) grid[r] = [];
                    for (let dc = 0; dc < cell.colspan; dc++) {
                        const c = col + dc;
                        grid[r][c] = cell;
                        occupied[r + ':' + c] = true;
                    }
                }
                col += cell.colspan;
            });
        });
        const cols = grid.reduce((mx, row) => Math.max(mx, row.length), 0);
        return grid.map(row => {
            const out = [];
            for (let i = 0; i < cols; i++) {
                const cell = row[i];
                if (!cell) { out.push(''); continue; }
                if (cell.imgs && cell.imgs.length) {
                    out.push({ text: cell.text, imgs: cell.imgs, parts: cell.parts });
                } else {
                    out.push(cell.text);
                }
            }
            return out;
        });
    }

    /** 单元格是否有内容：纯文字、只有图片、图文都算 */
    function isFilled(c) {
        if (c && typeof c === 'object') {
            if (c.imgs && c.imgs.length) return true;
            return String(c.text == null ? '' : c.text).trim() !== '';
        }
        return String(c == null ? '' : c).trim() !== '';
    }

    /** 从 text/html 里解析第一张数据表；非表格返回 null */
    function parseHtmlTable(html) {
        if (typeof html !== 'string' || !/<table\b/i.test(html)) return null;
        const cleaned = html.replace(/<!--[\s\S]*?-->/g, '');
        const table = /<table\b[^>]*>([\s\S]*?)<\/table\s*>/i.exec(cleaned);
        if (!table) return null;

        const body = table[1];
        const hasHeader = /<th\b/i.test(body) || /<thead\b/i.test(body);
        const rawRows = [];
        const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi;
        let tr;
        while ((tr = trRe.exec(body))) {
            const cells = [];
            const cellRe = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
            let td;
            while ((td = cellRe.exec(tr[1]))) {
                // 【2026-11-06】单元格里的图片不再被丢弃：解析成有序「文字 + 图片」片段
                const parts = cellParts(td[3]);
                const imgs = parts.filter(p => p.t === 'img').map(p => p.v);
                cells.push({
                    text: parts.filter(p => p.t === 'text').map(p => p.v).join('\n'),
                    imgs: imgs,
                    parts: imgs.length ? parts : null,
                    colspan: attrInt(td[2], 'colspan'),
                    rowspan: attrInt(td[2], 'rowspan')
                });
            }
            if (cells.length) rawRows.push(cells);
        }
        if (!rawRows.length) return null;

        const rows = expandCells(rawRows);
        const cols = rows.reduce((mx, row) => Math.max(mx, row.length), 0);
        const nonEmpty = rows.reduce((n, row) => n + row.filter(isFilled).length, 0);
        // 网页布局用的单列 <table> / 空壳表格不当成数据表格
        if (cols < 2 || nonEmpty < 2) return null;
        return { rows: rows, rowCount: rows.length, cols: cols, source: 'html', hasHeader: hasHeader };
    }

    /**
     * 解析 TSV（Excel / 腾讯文档复制时的 text/plain）。
     * 支持双引号包裹的字段、字段内换行、"" 转义；要求至少两行带制表符，避免把普通缩进行误判成表格。
     */
    function parseTsv(plain) {
        if (typeof plain !== 'string' || plain.indexOf('\t') === -1) return null;
        const s = plain.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const rows = [];
        let row = [], field = '', quoted = false;
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (quoted) {
                if (ch === '"') {
                    if (s[i + 1] === '"') { field += '"'; i++; }
                    else quoted = false;
                } else field += ch;
            } else if (ch === '"' && field === '') {
                quoted = true;
            } else if (ch === '\t') {
                row.push(field); field = '';
            } else if (ch === '\n') {
                row.push(field); rows.push(row); row = []; field = '';
            } else {
                field += ch;
            }
        }
        row.push(field);
        rows.push(row);
        while (rows.length && rows[rows.length - 1].every(c => !String(c).trim())) rows.pop();

        const cols = rows.reduce((mx, r) => Math.max(mx, r.length), 0);
        const withTab = rows.filter(r => r.length > 1).length;
        const nonEmpty = rows.reduce((n, r) => n + r.filter(c => String(c).trim()).length, 0);
        if (rows.length < 1 || cols < 2 || withTab < 2 || nonEmpty < 2) return null;

        const normalized = rows.map(r => {
            const out = r.map(c => String(c).replace(/\u00a0/g, ' ').trim());
            while (out.length < cols) out.push('');
            return out;
        });
        return { rows: normalized, rowCount: normalized.length, cols: cols, source: 'tsv', hasHeader: true };
    }

    /** HTML 优先（信息最全，能识别合并单元格），其次 TSV */
    function extract(html, plain) {
        return parseHtmlTable(html) || parseTsv(plain) || null;
    }

    /** 单元格 → 可插入的 innerHTML：文字转义、换行转 <br>、图片保留为 <img> */
    function cellHtml(cell) {
        if (cell && typeof cell === 'object') {
            if (cell.parts && cell.parts.length) {
                return cell.parts.map(p => p.t === 'img'
                    ? '<img class="pasted-cell-img" src="' + escapeHtmlText(p.v) + '" alt="">'
                    : escapeHtmlText(p.v).replace(/\n/g, '<br>')
                ).join('<br>');
            }
            return escapeHtmlText(cell.text == null ? '' : cell.text).replace(/\n/g, '<br>');
        }
        return escapeHtmlText(cell == null ? '' : cell).replace(/\n/g, '<br>');
    }

    /** 行列数据 → 应用内可编辑表格；外层 div 负责窄容器（表格视图单元格）的横向滚动 */
    function rowsToTableHtml(data) {
        if (!data || !data.rows || !data.rows.length) return '';
        const rows = data.rows;
        const cols = data.cols || rows.reduce((mx, r) => Math.max(mx, r.length), 0);
        const hasHeader = data.hasHeader !== false;
        const headRows = hasHeader ? rows.slice(0, 1) : [];
        const bodyRows = hasHeader ? rows.slice(1) : rows;
        const thead = headRows.length
            ? '<thead>' + headRows.map(r => '<tr>' + r.map(c => '<th>' + cellHtml(c) + '</th>').join('') + '</tr>').join('') + '</thead>'
            : '';
        const tbody = bodyRows.length
            ? '<tbody>' + bodyRows.map(r => '<tr>' + r.map(c => '<td>' + cellHtml(c) + '</td>').join('') + '</tr>').join('') + '</tbody>'
            : '';
        return '<div class="pasted-table-wrap"><table class="pasted-table" data-rows="' +
            rows.length + '" data-cols="' + cols + '">' + thead + tbody + '</table></div>';
    }

    return {
        decodeEntities: decodeEntities,
        escapeHtml: escapeHtmlText,
        cellText: cellText,
        cellParts: cellParts,
        parseHtmlTable: parseHtmlTable,
        parseTsv: parseTsv,
        extract: extract,
        rowsToTableHtml: rowsToTableHtml
    };
});
