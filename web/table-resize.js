'use strict';

/**
 * table-resize.js —— 表格自由调整列宽 / 行高（2026-11-10）
 *
 * 【解决什么问题】
 *   应用里有两类表格，宽度/行高都是死的：
 *     · 任务表格视图（table.task-table）：列宽被 CSS nth-child 写死，内容长就挤成一坨；
 *     · 笔记里粘贴的表格（table.pasted-table / markdown 表）：列宽全看浏览器自动分配。
 *   现在把鼠标移到单元格右边框 / 下边框附近（7px 内），光标变 col-resize / row-resize，
 *   按住拖动即可自由调整列宽 / 行高；双击边缘恢复默认。
 *
 * 【职责边界】
 *   事件全部委托在 document 上，动态渲染出来的表格（renderTable / 粘贴插入）自动生效，
 *   不需要在每次渲染后重新 attach。
 *
 * 【持久化策略】
 *   · 任务表格视图：列宽按列号、行高按 noteId 存 localStorage（taskTableLayout.v1），
 *     renderTable 每次渲染后调 applyTaskTableLayout() 回放；
 *   · 笔记内容里的表格：直接写内联 style，serializeEditable 存 innerHTML 时自然带上，
 *     无需额外存储。
 *
 * 【2026-11-12 新增】命令行 / API 操控
 *   拖拽只解决「人手动调」。AI 与脚本要能说「把这张表压到 900px」「第三列 240」，
 *   于是把尺寸的读 / 写抽成 describeTable / applyTableOps 等函数，
 *   renderer 的 api:task-request 暴露成 op 'table' / 'table-view'，
 *   CLI 侧对应 `timer-cli.js table info|set|auto|view`。
 *   这些函数要能在离屏文档（createHTMLDocument）里跑 —— 那里没有布局，
 *   所以写入列宽时必须显式给值（freezeWithWidths），不能靠测量。
 */

(function (root, factory) {
    const api = factory();
    if (typeof window !== 'undefined') window.TableResize = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    // ---------- 常量 ----------
    const EDGE = 7;        // 距边框多少像素内判定命中
    const MIN_COL = 40;    // 列宽下限（手动拖拽）
    const MIN_ROW = 24;    // 行高下限
    // 【2026-11-16】自动缩放（fitTableToWidth）时的可读下限。
    // 起因：一张 12 列的表因为某列装了 16000px 宽的 Base64，整表 18250px。
    // 按比例硬压到容器 884px 后，另外 11 列只剩 40px —— 2000 字的文本竖成一列字，
    // 比溢出更难读。缩放的目的是「看得见」，不是「必须塞进去」：
    // 宁可让表格比容器宽、交给 .pasted-table-wrap 横向滚动，也不能把列压死。
    const MIN_READABLE = 110;
    const DEFAULT_COL = 120; // 自动列在没有历史宽度时的兜底宽度
    const STORAGE_KEY = 'taskTableLayout.v1';

    // ---------- 纯函数（可单测） ----------

    /** 命中检测：光标是否落在单元格右边框 / 下边框的可拖拽热区 */
    function hitTest(rect, x, y) {
        if (!rect) return null;
        // 右边框热区略微向内侧收、外侧放宽，避免和相邻列的左边缘互相打架
        const nearRight = x >= rect.right - EDGE && x <= rect.right + EDGE / 2;
        const nearBottom = y >= rect.bottom - EDGE && y <= rect.bottom + EDGE / 2;
        if (nearRight) return 'col';
        if (nearBottom) return 'row';
        return null;
    }

    /** 拖出来的尺寸夹在下限以内 */
    function clampSize(v, min) {
        if (!isFinite(v)) return min;
        return Math.max(min, Math.round(v));
    }

    /** 持久化数据清洗：非法键值直接丢弃，防止脏数据污染 localStorage */
    function sanitizeLayout(raw) {
        const out = { colWidths: {}, rowHeights: {} };
        if (!raw || typeof raw !== 'object') return out;
        if (raw.colWidths && typeof raw.colWidths === 'object') {
            Object.keys(raw.colWidths).forEach(k => {
                const w = Number(raw.colWidths[k]);
                if (/^\d+$/.test(String(k)) && isFinite(w) && w >= MIN_COL) out.colWidths[k] = w;
            });
        }
        if (raw.rowHeights && typeof raw.rowHeights === 'object') {
            Object.keys(raw.rowHeights).forEach(k => {
                const h = Number(raw.rowHeights[k]);
                if (/^\d+$/.test(String(k)) && isFinite(h) && h >= MIN_ROW) out.rowHeights[k] = h;
            });
        }
        return out;
    }

    // ---------- DOM 工具（浏览器侧） ----------

    /** 单元格在其所在行内的逻辑列号（正确累计 colspan） */
    function logicalColIndex(cell) {
        let idx = 0;
        let sib = cell.previousElementSibling;
        while (sib) {
            idx += (sib.colSpan && sib.colSpan > 1) ? sib.colSpan : 1;
            sib = sib.previousElementSibling;
        }
        return idx;
    }

    /** 取表格某一列的全部单元格（含表头；跳过被上方 rowspan 覆盖的行） */
    function columnCells(table, colIdx) {
        const out = [];
        if (!table) return out;
        const rows = table.querySelectorAll('tr');
        for (let i = 0; i < rows.length; i++) {
            const tr = rows[i];
            let c = 0;
            for (let j = 0; j < tr.children.length; j++) {
                const cell = tr.children[j];
                if (c === colIdx) { out.push(cell); break; }
                if (c > colIdx) break;
                c += (cell.colSpan && cell.colSpan > 1) ? cell.colSpan : 1;
            }
        }
        return out;
    }

    function setColWidth(cells, w) {
        cells.forEach(cell => {
            cell.style.width = w + 'px';
            cell.style.boxSizing = 'border-box';
        });
    }

    function clearColWidth(table, colIdx) {
        columnCells(table, colIdx).forEach(cell => {
            cell.style.width = '';
            cell.style.boxSizing = '';
            if (!cell.getAttribute('style')) cell.removeAttribute('style');
        });
    }

    /**
     * 【2026-11-10】行内图片自适应行高：拖行拖多大，图片就跟着长多大。
     * CSS 把 .pasted-cell-img 钉死在 110px / 80px 上限，单元格拖大后图片不动；
     * 这里给行内图片写内联 max-height = 单元格内容区高度（内联压过样式表，且随
     * innerHTML 持久化），宽度仍受 max-width:100% 约束、等比缩放。
     */
    function updateRowImages(tr, h) {
        if (!tr) return;
        const imgs = tr.querySelectorAll('img');
        for (let i = 0; i < imgs.length; i++) {
            const img = imgs[i];
            const cell = img.closest('td, th') || tr;
            let padV = 12;
            try {
                const cs = getComputedStyle(cell);
                padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) || 12;
            } catch (e) { /* 非 DOM 环境兜底 */ }
            img.style.maxHeight = Math.max(MIN_ROW, Math.round(h - padV)) + 'px';
            img.style.maxWidth = '100%';
        }
    }

    function clearRowImages(tr) {
        if (!tr) return;
        const imgs = tr.querySelectorAll('img');
        for (let i = 0; i < imgs.length; i++) {
            const img = imgs[i];
            img.style.maxHeight = '';
            img.style.maxWidth = '';
            if (!img.getAttribute('style')) img.removeAttribute('style');
        }
    }

    function setRowHeight(tr, h) {
        if (!tr) return;
        tr.style.height = h + 'px';
        for (let i = 0; i < tr.children.length; i++) {
            const cell = tr.children[i];
            cell.style.height = h + 'px';
            cell.style.boxSizing = 'border-box';
            // 行高作为硬约束：内容超高就裁掉（不然 tr 的 height 只是下限，拖不矮）
            cell.style.overflow = 'hidden';
        }
        updateRowImages(tr, h);
    }

    function clearRowHeight(tr) {
        if (!tr) return;
        tr.style.height = '';
        for (let i = 0; i < tr.children.length; i++) {
            const cell = tr.children[i];
            cell.style.height = '';
            cell.style.overflow = '';
            cell.style.boxSizing = '';
            if (!cell.getAttribute('style')) cell.removeAttribute('style');
        }
        clearRowImages(tr);
    }

    /** 哪些表格允许调：任务表格视图 + 笔记/输入框/批注里的表格 */
    function isResizable(table) {
        if (!table || !table.matches) return false;
        if (table.matches('table.task-table')) return true;
        if (table.matches('.note-content-editable table, .table-content table, ' +
            '.note-input table, .comment-text table')) return true;
        return false;
    }

    /**
     * 【2026-11-11】把表格几何「冻结」成显式像素。
     * 起因：auto 布局 + `.pasted-table { min-width:100% }` 下，给某一列写 width 只是
     * 「偏好」，浏览器会在容器内重新分配——实测拖了 +118px，内联宽度写进去了，
     * 但渲染宽度纹丝不动（用户说的「左右拉不动」）。
     * 首次拖列时：量出每列当前渲染宽度 → 全部写成内联像素 + table-layout:fixed +
     * 表宽=各列之和，之后拖哪列就真的变哪列（超宽由 .pasted-table-wrap 横向滚动兜底）。
     */
    function freezeTableLayout(table) {
        if (!table || table.getAttribute('data-rsz-frozen')) return false;
        if (!table.rows || !table.rows.length) return false;
        // 只处理规整表（无 colspan/rowspan），合并单元格的表格不冻结，避免错列
        for (let r = 0; r < table.rows.length; r++) {
            const cells = table.rows[r].children;
            for (let i = 0; i < cells.length; i++) {
                if ((cells[i].colSpan || 1) > 1 || (cells[i].rowSpan || 1) > 1) return false;
            }
        }
        const widths = [];
        let total = 0;
        const firstRow = table.rows[0];
        for (let i = 0; i < firstRow.children.length; i++) {
            const w = Math.round(firstRow.children[i].getBoundingClientRect().width);
            widths.push(w);
            total += w;
        }
        for (let r = 0; r < table.rows.length; r++) {
            const cells = table.rows[r].children;
            for (let i = 0; i < cells.length; i++) {
                cells[i].style.width = (widths[i] || 60) + 'px';
                cells[i].style.boxSizing = 'border-box';
            }
        }
        table.style.tableLayout = 'fixed';
        table.style.width = total + 'px';
        table.style.minWidth = '0';
        table.setAttribute('data-rsz-frozen', '1');
        return true;
    }

    /** 双击恢复：把冻结的几何整体解开，交还给 CSS 默认布局 */
    function unfreezeTableLayout(table) {
        if (!table) return;
        const cells = table.querySelectorAll('th, td');
        for (let i = 0; i < cells.length; i++) {
            cells[i].style.width = '';
            cells[i].style.boxSizing = '';
            if (!cells[i].getAttribute('style')) cells[i].removeAttribute('style');
        }
        table.style.tableLayout = '';
        table.style.width = '';
        table.style.minWidth = '';
        table.removeAttribute('data-rsz-frozen');
    }

    /**
     * 【2026-11-12】把冻结表格的宽度夹回容器：按比例缩放所有列。
     * 起因：拖过列宽的表格记住的是绝对像素宽度，窗口变窄 / 拖得太宽时会直接
     * 顶出屏幕右边界（max-width 对表格不生效），内容看不见。
     * 缩放保持各列比例，拖拽仍然是有效的（列宽是比例份额，拖大就挤窄其他列）。
     */
    function fitTableToWidth(table) {
        if (!table || !table.getAttribute('data-rsz-frozen')) return false;
        // 命令行 / API 明确设过的宽度就是用户要的宽度，别自作聪明缩放
        if (table.getAttribute('data-rsz-manual')) return false;
        const wrap = table.parentElement;
        if (!wrap) return false;
        const avail = wrap.clientWidth;
        if (!avail) return false;
        const firstRow = table.rows && table.rows[0];
        if (!firstRow || !firstRow.children.length) return false;

        const current = [];
        let total = 0;
        for (let i = 0; i < firstRow.children.length; i++) {
            const w = Math.round(firstRow.children[i].getBoundingClientRect().width);
            current.push(w);
            total += w;
        }
        if (!total || total <= avail) return false; // 没超，保持用户拖出来的宽度

        const ratio = avail / total;
        // 【2026-11-16】每列的缩放下限 = min(它原本的宽度, 可读宽度)。
        //   · 原本就宽（368px）的列 → 最多压到下限，保住可读性；
        //   · 原本就窄（40px）的列 → 不因为缩放反而被抬高，保持原样。
        // 下限按列数分档：12 列的长表用 MIN_READABLE（否则压成「一列字」）；
        // 5 列以内的表用 MIN_COL，否则 5×110=550 会把 420px 的表格视图顶出滚动条。
        const floor = current.length >= 8 ? MIN_READABLE : MIN_COL;
        const widths = current.map(w => Math.max(Math.min(w, floor), Math.round(w * ratio)));
        let sum = widths.reduce((a, b) => a + b, 0);
        // 【2026-11-16】关键：压不进容器时**不要**硬扣。
        // 老版本为了「永远不超容器」，从最宽列一路扣到 MIN_COL，结果就是
        // 「1 列 444px + 11 列 40px」。可读性比「不溢出一条像素」重要得多 ——
        // 溢出的部分外层 wrap 能横向滚动，压死的列却再也救不回来。
        // 只做取整级别的微调（超出量小于列数时，每列匀掉 1px）。
        if (sum > avail && sum - avail <= widths.length) {
            while (sum > avail) {
                const i = widths.indexOf(Math.max.apply(null, widths));
                if (widths[i] <= MIN_COL) break;
                widths[i] -= 1;
                sum -= 1;
            }
        }
        for (let r = 0; r < table.rows.length; r++) {
            const cells = table.rows[r].children;
            for (let i = 0; i < cells.length; i++) {
                cells[i].style.width = (widths[i] || MIN_COL) + 'px';
                cells[i].style.boxSizing = 'border-box';
            }
        }
        table.style.width = widths.reduce((a, b) => a + b, 0) + 'px';
        return true;
    }

    /**
     * 【2026-11-16】给「列多到均分也不可读」的表格打标记。
     *
     * 判据只看「容器宽 ÷ 列数」，不看表格自己有多宽 —— 因为加了标记后表格会变宽，
     * 若按表格宽度判定就会「加标记 → 变宽 → 撤标记 → 变窄」来回抖动。
     * 容器宽和列数都是稳定的，所以判定稳定。
     *
     * CSS 里会给 data-rsz-squeezed 的单元格一个可读的 min-width，
     * 表格因此比容器宽，由 .pasted-table-wrap 的 overflow-x:auto 横向滚动。
     */
    function markReadableFloor(table) {
        if (!table || table.getAttribute('data-rsz-frozen')) return false;
        const wrap = table.parentElement;
        const firstRow = table.rows && table.rows[0];
        if (!wrap || !firstRow) return false;
        const cols = firstRow.children.length;
        const avail = wrap.clientWidth;
        if (!cols || !avail) return false;
        // 【2026-11-16】只处理「列多到一屏塞不下」的长表。
        // 5 列表在 420px 的表格视图里均分只有 84px，但那是这个视图本来的样子，
        // 强行抬到 110 会让所有表都出现横向滚动，还干扰列宽拖拽（探针实测：
        // 拖宽的表被 min-width 顶回来，用户会觉得「又拖不动了」）。
        if (cols < 8) {
            table.removeAttribute('data-rsz-squeezed');
            return false;
        }
        const squeezed = avail / cols < MIN_READABLE;
        if (squeezed) table.setAttribute('data-rsz-squeezed', '1');
        else table.removeAttribute('data-rsz-squeezed');
        return squeezed;
    }

    /** 冻结表是否已经被压坏：超过 1/3 的列窄到装不下可读文本 */
    function isSqueezedFrozen(table) {
        if (!table || !table.getAttribute('data-rsz-frozen')) return false;
        // 命令行 / API 明确设过的尺寸是有意为之，不参与自动修复
        if (table.getAttribute('data-rsz-manual')) return false;
        const firstRow = table.rows && table.rows[0];
        // 列太少的表不存在「被超长内容带偏」这回事，窄就是用户自己拖窄的
        if (!firstRow || firstRow.children.length < 6) return false;
        let narrow = 0;
        for (let i = 0; i < firstRow.children.length; i++) {
            if (Math.round(firstRow.children[i].getBoundingClientRect().width) < MIN_READABLE) narrow++;
        }
        // 阈值取 1/3 而不是 1/2：12 列表里 6 列被历史坏值压成 46px 时，
        // 「一半」判不出来，但用户的观感已经是「字全竖着」。
        // 解冻只会发生一次（解冻后就没有 data-rsz-frozen 了），不会反复重置。
        return narrow > firstRow.children.length / 3;
    }

    /** 页面里所有冻结表格贴合容器（重开应用读到旧内容 / 窗口缩放时统一兜住） */
    function fitAllFrozenTables(root) {
        const scope = root && root.querySelectorAll ? root : document;
        const tables = Array.prototype.slice.call(scope.querySelectorAll('table[data-rsz-frozen]'));
        let n = 0;
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            // 【2026-11-16】先治「已经压坏」的表。冻结记录下来的是像素列宽，一旦
            // 被某一列的超长内容（Base64 / URL）带偏成上万像素，再按比例压回来就是
            // 「11 列 40px + 1 列 444px」，字竖着排、比溢出更难读，而且原始比例在
            // 第一次压缩时就永久丢了，反复 fit 只会在坏值上来回打转。
            // 这种记录没有保留价值 —— 解冻交还 auto 布局，再按可读下限横向滚动。
            if (isSqueezedFrozen(table)) {
                unfreezeTableLayout(table);
                markReadableFloor(table);
                n++;
                continue;
            }
            if (fitTableToWidth(table)) n++;
        }
        // 没冻结但被列数挤扁的表也一并处理
        const plain = scope.querySelectorAll('table.pasted-table:not([data-rsz-frozen])');
        for (let i = 0; i < plain.length; i++) markReadableFloor(plain[i]);
        return n;
    }

    function isTaskTable(table) {
        return !!(table && table.matches && table.matches('table.task-table'));
    }

    // ---------- localStorage（仅任务表格视图用） ----------

    function loadLayout() {
        try {
            if (typeof localStorage === 'undefined') return {};
            return sanitizeLayout(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
        } catch (e) {
            return { colWidths: {}, rowHeights: {} };
        }
    }

    function saveLayout(layout) {
        try {
            if (typeof localStorage === 'undefined') return;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeLayout(layout)));
        } catch (e) { /* 隐私模式等场景写不进去就放弃，不影响使用 */ }
    }

    /** renderTable 每次渲染后调用：回放保存的列宽 / 行高 */
    function applyTaskTableLayout(table) {
        if (!table) return null;
        const layout = loadLayout();
        Object.keys(layout.colWidths).forEach(k => {
            const cells = columnCells(table, parseInt(k, 10));
            if (cells.length) setColWidth(cells, layout.colWidths[k]);
        });
        Object.keys(layout.rowHeights).forEach(noteId => {
            const tr = table.querySelector('tr[data-note-id="' + noteId + '"]');
            if (tr) setRowHeight(tr, layout.rowHeights[noteId]);
        });
        return layout;
    }

    // ---------- 命令行 / API 操控表格尺寸（2026-11-12） ----------
    //
    // 【为什么要有这一段】
    //   拖拽只解决「人手动调」，AI 和脚本没法可靠地模拟鼠标：说「把这张表压到 900px」
    //   或者「第三列加宽到 240」，之前只能靠人。这里把「读尺寸 / 写尺寸」抽成模块函数，
    //   renderer 的 api:task-request 直接调用，CLI（timer-cli.js table …）再走 HTTP 进来。
    //
    // 【关键约束】
    //   这些函数要在「离屏文档」里跑（document.implementation.createHTMLDocument），
    //   那里没有布局，getBoundingClientRect / getComputedStyle 全是 0 ——
    //   所以写入时必须由调用方给出显式列宽（freezeWithWidths），不能依赖测量。

    /** 表格单元格文本转义（只转义会破坏 DOM 结构的字符，&#10; 留给换行） */
    function escapeCell(s) {
        return String(s === null || s === undefined ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/\r?\n/g, '<br>');
    }

    /**
     * 造一张能直接塞进笔记内容的表格 HTML。
     * 【为什么放这儿】renderer 里手拼字符串容易被单测漏掉，放模块里可以离屏验证：
     *   给 { head:['渠道','账号'], data:[['oppo','cat']] } 必须得到
     *   <div class="pasted-table-wrap"><table class="pasted-table" data-rows data-cols>…
     *   —— 和「从 Excel / 腾讯文档粘贴」出来的结构完全一致，
     *   这样已有的列宽逻辑、图片自适应、导出逻辑都不用改。
     *
     * spec = { head:[…], data:[[…]], cols:4, rows:3 }
     *   · 列数取 head / 各行 / spec.cols 的最大值，短行补空单元格（表格必须是矩形）
     *   · 没有任何 head/data 时，用 cols × rows 造空格子（默认 3×3）
     *   · 返回 { html, rows, cols, hasHeader }
     */
    function buildTableHtml(spec) {
        const s = spec || {};
        const head = Array.isArray(s.head) ? s.head.map(x => String(x === null || x === undefined ? '' : x)) : [];
        const data = (Array.isArray(s.data) ? s.data : []).map(r => Array.isArray(r) ? r.slice() : [r]);
        const hasHeader = !!(s.hasHeader !== false && head.length);

        let cols = Math.max(head.length, Number(s.cols) || 0);
        data.forEach(r => { cols = Math.max(cols, r.length); });
        if (!cols) cols = 3;
        let rowCount = data.length + (hasHeader ? 1 : 0);
        if (!rowCount) rowCount = Math.max(1, Number(s.rows) || 3);

        const pad = arr => {
            const out = arr.slice(0, cols);
            while (out.length < cols) out.push('');
            return out;
        };

        let thead = '';
        if (hasHeader) {
            thead = '<thead><tr>' + pad(head).map(c => '<th>' + escapeCell(c) + '</th>').join('') + '</tr></thead>';
        }
        const bodyRows = data.length ? data.map(pad) : Array.from({ length: rowCount - (hasHeader ? 1 : 0) }, () => new Array(cols).fill(''));
        const tbody = '<tbody>' + bodyRows.map(r =>
            '<tr>' + pad(r).map(c => '<td>' + escapeCell(c) + '</td>').join('') + '</tr>').join('') + '</tbody>';

        const html = '<div class="pasted-table-wrap"><table class="pasted-table" data-rows="' +
            (rowCount) + '" data-cols="' + cols + '">' + thead + tbody + '</table></div>';
        return { html: html, rows: rowCount, cols: cols, hasHeader: hasHeader };
    }

    /** '900' / '900px' / '80%' → {kind:'px'|'pct', value}；非法返回 null */
    function parseSize(input) {
        if (input === undefined || input === null || input === '') return null;
        const s = String(input).trim().toLowerCase();
        if (/^\d+(?:\.\d+)?%$/.test(s)) {
            const v = parseFloat(s);
            if (!isFinite(v) || v <= 0) return null;
            return { kind: 'pct', value: Math.min(100, Math.round(v * 10) / 10) };
        }
        if (/^\d+(?:\.\d+)?(?:px)?$/.test(s)) {
            const v = Math.round(parseFloat(s));
            if (!isFinite(v) || v < 1) return null;
            return { kind: 'px', value: v };
        }
        return null;
    }

    /** '120,240,*' → [120, 240, null]（null = 该列自动）；格式错返回 null */
    function parseColSpec(input) {
        if (input === undefined || input === null) return null;
        const raw = Array.isArray(input) ? input : String(input).split(',');
        const out = [];
        for (let i = 0; i < raw.length; i++) {
            const s = String(raw[i] === null || raw[i] === undefined ? '' : raw[i]).trim().toLowerCase();
            if (s === '' || s === '*' || s === 'auto' || s === '-' || s === 'null') { out.push(null); continue; }
            const n = Math.round(Number(s.replace(/px$/, '')));
            if (!isFinite(n) || n < MIN_COL) return null;
            out.push(n);
        }
        return out.length ? out : null;
    }

    /**
     * 算出最终列宽（纯函数）。
     *   spec    [120, null, 240]  null = 自动
     *   current [100, 100, 100]   当前各列宽（可含 null）
     *   total   目标总宽（px，可空）
     * 规则：指定列用指定值；自动列先沿用当前值（没有就用 DEFAULT_COL），
     *       若给了 total 就把差额逐列 ±1 摊到自动列上，保证总和精确等于 total。
     *       全部列都指定时忽略 total（以用户给的具体宽度为准）。
     */
    function planColWidths(spec, current, total) {
        const n = spec ? spec.length : 0;
        const widths = new Array(n);
        const auto = [];
        for (let i = 0; i < n; i++) {
            const v = spec[i];
            if (v === null || v === undefined) { auto.push(i); widths[i] = 0; }
            else widths[i] = Math.max(MIN_COL, Math.round(v));
        }
        for (let k = 0; k < auto.length; k++) {
            const i = auto[k];
            const cur = current && isFinite(current[i]) && current[i] > 0 ? Math.round(current[i]) : 0;
            widths[i] = Math.max(MIN_COL, cur || DEFAULT_COL);
        }
        let sum = 0;
        for (let i = 0; i < n; i++) sum += widths[i];

        if (auto.length && isFinite(total) && total > 0) {
            let delta = Math.round(total) - sum;
            let guard = 0;
            while (delta !== 0 && guard++ < 20000) {
                let moved = false;
                for (let k = 0; k < auto.length && delta !== 0; k++) {
                    const i = auto[k];
                    if (delta > 0) { widths[i] += 1; delta -= 1; moved = true; }
                    else if (widths[i] > MIN_COL) { widths[i] -= 1; delta -= 1; moved = true; }
                }
                if (!moved) break; // 自动列全部压到下限还不够窄，只能到此为止
            }
            sum = 0;
            for (let i = 0; i < n; i++) sum += widths[i];
        }
        return { widths: widths, total: sum };
    }

    /** 把 '240px' / '240' 解析成数字，空 / 非数字 → null */
    function parsePx(value) {
        if (value === undefined || value === null || value === '') return null;
        const n = Math.round(parseFloat(value));
        return isFinite(n) ? n : null;
    }

    /**
     * 读出一张表的尺寸信息（离屏文档里也能用 —— 只读内联样式，不看布局）。
     * colWidths 只取首行（表头/首行就是列定义），合并单元格的列取各 cell 宽度之和。
     */
    function describeTable(table) {
        if (!table || !table.rows) return null;
        const rows = table.rows.length;
        let cols = 0;
        let hasSpan = false;
        const rowHeights = [];
        const first = table.rows[0];
        const colWidths = [];
        for (let r = 0; r < rows; r++) {
            const tr = table.rows[r];
            let logical = 0;
            for (let i = 0; i < tr.children.length; i++) {
                const cell = tr.children[i];
                const cs = Math.max(1, cell.colSpan || 1);
                const rs = Math.max(1, cell.rowSpan || 1);
                if (cs > 1 || rs > 1) hasSpan = true;
                if (tr === first) {
                    // 首行的单元格：占几列就把宽度平均摊到这几列上
                    const w = parsePx(cell.style.width);
                    for (let k = 0; k < cs; k++) {
                        colWidths.push(w === null ? null : Math.round(w / cs));
                    }
                }
                logical += cs;
            }
            if (logical > cols) cols = logical;
            rowHeights.push(parsePx(tr.style.height));
        }
        return {
            rows: rows,
            cols: cols,
            hasSpan: hasSpan,
            frozen: !!table.getAttribute('data-rsz-frozen'),
            width: table.style.width || '',
            tableLayout: table.style.tableLayout || '',
            hasHead: !!(table.tHead || table.querySelector('th')),
            colWidths: colWidths,
            rowHeights: rowHeights
        };
    }

    /**
     * 用显式列宽把表格冻结成固定布局 —— 离屏文档专用版本（不测量，纯写入）。
     * 与 freezeTableLayout 的差别：那个靠 getBoundingClientRect 量现状，这里由调用方给值。
     */
    function freezeWithWidths(table, widths) {
        if (!table || !table.rows || !table.rows.length || !widths || !widths.length) return 0;
        for (let r = 0; r < table.rows.length; r++) {
            const cells = table.rows[r].children;
            let c = 0;
            for (let i = 0; i < cells.length; i++) {
                const span = Math.max(1, cells[i].colSpan || 1);
                let w = 0;
                for (let k = 0; k < span; k++) w += widths[c + k] || DEFAULT_COL;
                cells[i].style.width = Math.round(w) + 'px';
                cells[i].style.boxSizing = 'border-box';
                c += span;
            }
        }
        const total = widths.reduce(function (a, b) { return a + b; }, 0);
        table.style.tableLayout = 'fixed';
        table.style.width = total + 'px';
        // .pasted-table 的 min-width:100% 会让「设窄」失效，必须压掉
        table.style.minWidth = '0';
        table.setAttribute('data-rsz-frozen', '1');
        // 【2026-11-16】命令行 / API 明确指定的尺寸要保护起来：
        // `table set --cols 60,60,60,60` 是用户想要 4 列各 60px，
        // 但 fitAllFrozenTables 看到「过半列窄于可读宽度」会当成坏表解冻，
        // 结果命令执行了却看不到效果。打上 manual 标记，自动修复就绕开它。
        table.setAttribute('data-rsz-manual', '1');
        return total;
    }

    /** 百分比宽度：保持当前列宽比例缩放（没有显式列宽时交给 auto 布局按内容分配） */
    function setTableWidthPercent(table, pct) {
        if (!table) return;
        table.style.width = pct + '%';
        table.style.minWidth = '0';
    }

    /**
     * 一次性套用一组尺寸改动，返回改动后的 describeTable。
     * ops = { width:'900'|'80%', cols:'120,240,*', rows:[{row:2,height:60}], auto:true }
     *   行号从 1 开始（和表格里看到的一致）
     *   给了 cols 就一定会冻结成固定布局（否则 auto 布局会把宽度当「偏好」重排）
     */
    function applyTableOps(table, ops) {
        if (!table) throw new Error('表格不存在');
        const o = ops || {};
        const before = describeTable(table);

        if (o.auto) {
            unfreezeTableLayout(table);
            table.removeAttribute('data-rsz-size'); // 清理曾由命令行设置过的宽度标记
            return describeTable(table);
        }

        const size = parseSize(o.width);
        if (o.width !== undefined && o.width !== null && o.width !== '' && !size) {
            throw new Error('宽度格式不正确：' + o.width + '（可用 900 / 900px / 80%）');
        }

        if (o.cols !== undefined && o.cols !== null && o.cols !== '') {
            const spec = parseColSpec(o.cols);
            if (!spec) throw new Error('列宽格式不正确：' + o.cols + '（用逗号分隔，* 表示自动）');
            if (spec.length !== before.cols) {
                throw new Error('列数不匹配：表格有 ' + before.cols + ' 列，给了 ' + spec.length + ' 个宽度');
            }
            if (before.hasSpan) throw new Error('表格含合并单元格（colspan/rowspan），请先用 --width 调整整体宽度');
            const plan = planColWidths(spec, before.colWidths, size && size.kind === 'px' ? size.value : null);
            freezeWithWidths(table, plan.widths);
        } else if (size) {
            if (size.kind === 'pct') {
                setTableWidthPercent(table, size.value);
            } else if (before.frozen && before.colWidths.length) {
                // 已冻结：按比例缩放列宽，保持外观不变
                const plan = planColWidths(before.colWidths, before.colWidths, size.value);
                freezeWithWidths(table, plan.widths);
            } else {
                // 未冻结：只给表宽，列宽交给 auto 布局按内容比例分配
                table.style.width = size.value + 'px';
                table.style.minWidth = '0';
            }
        }

        if (o.rows) {
            const list = Array.isArray(o.rows) ? o.rows : [];
            for (let i = 0; i < list.length; i++) {
                const item = list[i] || {};
                const idx = Math.round(Number(item.row));
                const h = Math.round(Number(item.height));
                if (!isFinite(idx) || idx < 1 || idx > table.rows.length) {
                    throw new Error('行号超出范围：' + item.row + '（共 ' + table.rows.length + ' 行，从 1 开始）');
                }
                if (!isFinite(h) || h < MIN_ROW) {
                    throw new Error('行高不正确：' + item.height + '（最小 ' + MIN_ROW + 'px）');
                }
                setRowHeight(table.rows[idx - 1], h);
            }
        }

        return describeTable(table);
    }

    // ---------- 事件委托 ----------

    function init() {
        if (typeof document === 'undefined' || !document.addEventListener) return;
        let drag = null;
        let raf = 0;
        let lastEvt = null;

        /** 光标落在哪个可拖拽热区上（null = 不在任何表格边缘） */
        function pick(e) {
            const t = e.target;
            const cell = t && t.closest ? t.closest('th, td') : null;
            if (!cell) return null;
            const table = cell.closest('table');
            if (!table || !isResizable(table)) return null;
            return hitTest(cell.getBoundingClientRect(), e.clientX, e.clientY);
        }

        function startDrag(e, kind) {
            const cell = e.target.closest('th, td');
            const table = cell.closest('table');
            e.preventDefault();
            e.stopPropagation();
            if (kind === 'col') {
                // 内容表（笔记/粘贴表）先冻结几何，否则 auto 布局会把 width 当偏好、视觉上拖不动
                if (!isTaskTable(table)) freezeTableLayout(table);
                const startW = cell.getBoundingClientRect().width;
                drag = {
                    kind: 'col',
                    table: table,
                    colIdx: logicalColIndex(cell),
                    cells: columnCells(table, logicalColIndex(cell)),
                    startX: e.clientX,
                    startW: startW,
                    startTableW: table.getBoundingClientRect().width,
                    lastW: 0
                };
            } else {
                const tr = cell.closest('tr');
                drag = {
                    kind: 'row',
                    table: table,
                    tr: tr,
                    noteId: tr ? tr.getAttribute('data-note-id') : null,
                    startY: e.clientY,
                    startH: tr ? tr.getBoundingClientRect().height : 0,
                    lastH: 0
                };
            }
            document.body.classList.add('table-resizing');
            document.body.style.cursor = kind === 'col' ? 'col-resize' : 'row-resize';
        }

        function doDrag(e) {
            if (!drag) return;
            if (drag.kind === 'col') {
                drag.lastW = clampSize(drag.startW + (e.clientX - drag.startX), MIN_COL);
                setColWidth(drag.cells, drag.lastW);
                // 冻结表：表宽跟着列宽同步增减，否则 fixed 布局会按比例缩放、列宽看起来又变了
                if (drag.table.getAttribute('data-rsz-frozen')) {
                    const nextTotal = drag.startTableW + (drag.lastW - drag.startW);
                    drag.table.style.width = Math.round(nextTotal) + 'px';
                }
            } else {
                drag.lastH = clampSize(drag.startH + (e.clientY - drag.startY), MIN_ROW);
                setRowHeight(drag.tr, drag.lastH);
            }
        }

        function endDrag() {
            if (!drag) return;
            // 任务表格视图的尺寸落 localStorage；笔记里的表格尺寸已经写进内联 style，随内容自动保存
            if (isTaskTable(drag.table)) {
                const layout = loadLayout();
                if (drag.kind === 'col' && drag.lastW) {
                    layout.colWidths[drag.colIdx] = drag.lastW;
                } else if (drag.kind === 'row' && drag.lastH && drag.noteId) {
                    layout.rowHeights[drag.noteId] = drag.lastH;
                }
                saveLayout(layout);
            } else if (drag.kind === 'col') {
                // 拖太宽就按比例缩回容器，绝不让内容跑到屏幕外
                fitTableToWidth(drag.table);
            }
            document.body.classList.remove('table-resizing');
            document.body.style.cursor = '';
            drag = null;
        }

        document.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            if (drag) return;
            const hit = pick(e);
            if (hit) startDrag(e, hit);
        }, true);

        document.addEventListener('mousemove', e => {
            if (drag) { doDrag(e); return; }
            lastEvt = e;
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                if (!lastEvt || drag) return;
                const hit = pick(lastEvt);
                document.body.style.cursor =
                    hit === 'col' ? 'col-resize' : hit === 'row' ? 'row-resize' : '';
            });
        });

        document.addEventListener('mouseup', () => { if (drag) endDrag(); }, true);

        // 双击边缘 = 恢复该列 / 该行默认尺寸
        document.addEventListener('dblclick', e => {
            const hit = pick(e);
            if (!hit) return;
            const cell = e.target.closest('th, td');
            const table = cell.closest('table');
            e.preventDefault();
            if (hit === 'col') {
                const colIdx = logicalColIndex(cell);
                if (isTaskTable(table)) {
                    clearColWidth(table, colIdx);
                    const layout = loadLayout();
                    delete layout.colWidths[colIdx];
                    saveLayout(layout);
                } else {
                    // 内容表：整体解冻，交还给 CSS 默认布局（auto + min-width:100%）
                    unfreezeTableLayout(table);
                }
            } else {
                const tr = cell.closest('tr');
                clearRowHeight(tr);
                if (isTaskTable(table) && tr) {
                    const noteId = tr.getAttribute('data-note-id');
                    if (noteId) {
                        const layout = loadLayout();
                        delete layout.rowHeights[noteId];
                        saveLayout(layout);
                    }
                }
            }
        }, true);

        // 拖拽中途切窗口 / 失焦，别让拖拽状态卡死
        window.addEventListener('blur', () => { if (drag) endDrag(); });

        // 【2026-11-12】冻结表格宽度兜底：重开应用读到旧内容、窗口缩放、
        // 新渲染出来的笔记/任务内容，都可能带来「比容器宽」的冻结表 —— 统一夹回来
        let fitTimer = 0;
        const scheduleFit = () => {
            if (fitTimer) return;
            fitTimer = setTimeout(() => { fitTimer = 0; fitAllFrozenTables(document); }, 150);
        };
        window.addEventListener('resize', scheduleFit);
        try {
            new MutationObserver(scheduleFit).observe(document.body, { childList: true, subtree: true });
        } catch (e) { /* 老环境没有 MutationObserver 就只靠 resize */ }
        scheduleFit();
    }

    init();

    return {
        hitTest: hitTest,
        clampSize: clampSize,
        sanitizeLayout: sanitizeLayout,
        logicalColIndex: logicalColIndex,
        columnCells: columnCells,
        setColWidth: setColWidth,
        clearColWidth: clearColWidth,
        setRowHeight: setRowHeight,
        clearRowHeight: clearRowHeight,
        updateRowImages: updateRowImages,
        clearRowImages: clearRowImages,
        isResizable: isResizable,
        freezeTableLayout: freezeTableLayout,
        unfreezeTableLayout: unfreezeTableLayout,
        fitTableToWidth: fitTableToWidth,
        fitAllFrozenTables: fitAllFrozenTables,
        applyTaskTableLayout: applyTaskTableLayout,
        // 命令行 / API 操控（2026-11-12）
        parseSize: parseSize,
        parseColSpec: parseColSpec,
        parsePx: parsePx,
        planColWidths: planColWidths,
        describeTable: describeTable,
        freezeWithWidths: freezeWithWidths,
        setTableWidthPercent: setTableWidthPercent,
        applyTableOps: applyTableOps,
        buildTableHtml: buildTableHtml,
        loadTaskLayout: loadLayout,
        saveTaskLayout: saveLayout,
        MIN_COL: MIN_COL,
        MIN_ROW: MIN_ROW,
        MIN_READABLE: MIN_READABLE,
        DEFAULT_COL: DEFAULT_COL
    };
});
