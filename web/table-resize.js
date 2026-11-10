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
 */

(function (root, factory) {
    const api = factory();
    if (typeof window !== 'undefined') window.TableResize = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    // ---------- 常量 ----------
    const EDGE = 7;        // 距边框多少像素内判定命中
    const MIN_COL = 40;    // 列宽下限
    const MIN_ROW = 24;    // 行高下限
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
                drag = {
                    kind: 'col',
                    table: table,
                    colIdx: logicalColIndex(cell),
                    cells: columnCells(table, logicalColIndex(cell)),
                    startX: e.clientX,
                    startW: cell.getBoundingClientRect().width,
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
                clearColWidth(table, colIdx);
                if (isTaskTable(table)) {
                    const layout = loadLayout();
                    delete layout.colWidths[colIdx];
                    saveLayout(layout);
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
        applyTaskTableLayout: applyTaskTableLayout,
        MIN_COL: MIN_COL,
        MIN_ROW: MIN_ROW
    };
});
