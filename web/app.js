'use strict';

/**
 * app.js —— 专注计时器 · 网页版
 *
 * 【数据都存在用户自己电脑上】
 *   - 设置：localStorage（小、同步、够用）
 *   - 任务：IndexedDB（容量大、异步、可放很多条）
 *   - 图片：IndexedDB 里存 Blob（不塞 base64，避免把存储撑爆）
 *   浏览器清空浏览数据 / 换浏览器 / 隐私模式都会丢，所以「设置 → 数据与备份」
 *   提供了导出 JSON 与「申请持久化存储」（navigator.storage.persist）。
 *
 * 【与桌面版的关系】
 *   任务字段名沿用桌面版（content/p/type/done/ts/doneTime/remindAt/comments），
 *   导出的 JSON 尽量做到两边能互相导入（桌面版的 storage.notes 也能读进来）。
 *
 * 【刻意不做的事】不做任何网络请求、不埋点、不依赖任何第三方库。
 */

/* ============================== 常量与状态 ============================== */

const DB_NAME = 'timer-web';
const DB_VERSION = 1;
const STORE_TASKS = 'tasks';
const STORE_IMAGES = 'images';
const SETTINGS_KEY = 'timerweb:settings';

const DEFAULT_SETTINGS = {
    theme: 'dark',
    fontSize: 15,
    containerWidth: 1000,
    showYear: true,
    timeFormat: 'full',          // full = HH:mm:ss，hm = HH:mm
    workMinutes: 25,
    restMinutes: 5,
    autoNext: false,
    sound: true,
    notify: true,
    defaultView: 'card',
    defaultSort: 'time-desc',
    autoArchive: false
};

let settings = Object.assign({}, DEFAULT_SETTINGS);
let tasks = [];
let view = 'card';
let filters = { keyword: '', status: 'all', priority: 'all', sort: 'time-desc' };
let pendingImages = [];          // 新增任务时待附上的图片 id
let openComments = new Set();    // 展开了评论区的任务 id
const imageUrlCache = new Map(); // imageId → objectURL（渲染用，免得反复读库）
let archiveExpanded = false;
let editingId = null;

/* ============================== 小工具 ============================== */

const $ = id => document.getElementById(id);

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2200);
}

/** 时间显示：年份 / 秒 都跟着设置走 */
function formatDate(ts, forceSeconds) {
    if (!ts) return '';
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    const datePart = settings.showYear
        ? `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
        : `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const timePart = (forceSeconds || settings.timeFormat === 'full')
        ? `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
        : `${p(d.getHours())}:${p(d.getMinutes())}`;
    return `${datePart} ${timePart}`;
}

/** 表格里的日期：日期与时间各自不可断行，只在两者之间换行（沿用桌面版经验） */
function formatDatePair(ts) {
    const full = formatDate(ts);
    const i = full.indexOf(' ');
    if (i === -1) return esc(full);
    return `<span class="dt-date">${esc(full.slice(0, i))}</span> <span class="dt-time">${esc(full.slice(i + 1))}</span>`;
}

function priorityText(p) {
    return p === 3 ? '高' : p === 2 ? '中' : '低';
}

/* ============================== IndexedDB ============================== */

let dbPromise = null;

function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_TASKS)) {
                db.createObjectStore(STORE_TASKS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_IMAGES)) {
                db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

function idb(store, mode, fn) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const os = tx.objectStore(store);
        let out;
        try {
            out = fn(os);
        } catch (e) {
            reject(e);
            return;
        }
        tx.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    }));
}

const idbGetAll = store => idb(store, 'readonly', os => os.getAll());
const idbPut = (store, value) => idb(store, 'readwrite', os => os.put(value));
const idbDelete = (store, key) => idb(store, 'readwrite', os => os.delete(key));
const idbClear = store => idb(store, 'readwrite', os => os.clear());

/* ============================== 图片 Blob 展示 ============================== */

async function imageUrl(imageId) {
    if (imageUrlCache.has(imageId)) return imageUrlCache.get(imageId);
    const rec = await idb(STORE_IMAGES, 'readonly', os => os.get(imageId));
    if (!rec || !rec.blob) return '';
    const url = URL.createObjectURL(rec.blob);
    imageUrlCache.set(imageId, url);
    return url;
}

/** 把任务内容里的 [图片] 占位换成真实 URL（异步、按需） */
async function hydrateImages(container) {
    const nodes = container.querySelectorAll('[data-image-id]');
    for (const node of nodes) {
        const id = node.getAttribute('data-image-id');
        const url = await imageUrl(id);
        if (url) {
            const img = document.createElement('img');
            img.src = url;
            img.alt = '任务图片';
            img.style.cursor = 'zoom-in';
            img.onclick = () => showImage(url);
            node.replaceWith(img);
        } else {
            node.textContent = '[图片缺失]';
        }
    }
}

function showImage(url) {
    $('imgViewerImg').src = url;
    $('imgViewer').hidden = false;
}

/* ============================== 计时器 ============================== */

const timer = { running: false, working: true, left: 25 * 60, lastTick: 0 };

function totalSeconds(working) {
    return (working ? settings.workMinutes : settings.restMinutes) * 60;
}

function renderTimer() {
    const m = Math.floor(Math.max(0, timer.left) / 60);
    const s = Math.floor(Math.max(0, timer.left) % 60);
    $('timeText').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    $('modeText').textContent = timer.working ? '工作时间' : '休息时间';
    $('startBtn').textContent = timer.running ? '暂停' : '开始';
    document.title = `${timer.running ? '▶ ' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} · 专注计时器`;
}

function tick() {
    const now = Date.now();
    const delta = (now - timer.lastTick) / 1000;
    timer.lastTick = now;
    if (!timer.running) return;
    timer.left -= delta;
    if (timer.left <= 0) {
        const wasWorking = timer.working;
        playChime(wasWorking ? 'work-end' : 'rest-end');
        notify(wasWorking ? '专注结束' : '休息结束',
            wasWorking ? '休息一下吧，起来走两步' : '回来继续专注');
        timer.working = !timer.working;
        timer.left = totalSeconds(timer.working);
        if (!settings.autoNext) timer.running = false;
    }
    renderTimer();
}

function startTimer() {
    if (!timer.running) {
        timer.lastTick = Date.now();
        timer.running = true;
        ensureNotifyPermission();
    } else {
        timer.running = false;
    }
    renderTimer();
}

function resetTimer() {
    timer.running = false;
    timer.left = totalSeconds(timer.working);
    renderTimer();
}

function switchMode() {
    timer.working = !timer.working;
    timer.left = totalSeconds(timer.working);
    renderTimer();
}

/* 提示音：用 WebAudio 现场合成，不依赖任何音频文件 */
let audioCtx = null;

function playChime(kind) {
    if (!settings.sound) return;
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        const notes = kind === 'work-end' ? [880, 660, 520] : [520, 660, 880];
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, now + i * 0.22);
            gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.22 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.22 + 0.4);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(now + i * 0.22);
            osc.stop(now + i * 0.22 + 0.45);
        });
    } catch (e) { /* 浏览器不允许就直接静默 */ }
}

function ensureNotifyPermission() {
    if (!settings.notify) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') Notification.requestPermission();
}

function notify(title, body) {
    if (!settings.notify) return;
    try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(title, { body: body });
        }
    } catch (e) { /* ignore */ }
}

/** 任务提醒：每 30 秒扫一遍（超过 24 小时的不再补发，和桌面版一致） */
function checkReminders() {
    const now = Date.now();
    let changed = false;
    tasks.forEach(t => {
        if (t.done || !t.remindAt || t.remindFired) return;
        if (t.remindAt <= now) {
            if (now - t.remindAt < 24 * 3600 * 1000) {
                notify('任务提醒', t.content.replace(/<[^>]+>/g, ' ').slice(0, 60));
            }
            t.remindFired = true;
            changed = true;
        }
    });
    if (changed) saveAll();
}

/* ============================== 任务读写 ============================== */

async function loadAll() {
    tasks = (await idbGetAll(STORE_TASKS)).sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

async function saveAll() {
    // 全量写回（任务量级不大，简单可靠；量大了再改增量）
    await idbClear(STORE_TASKS);
    for (const t of tasks) await idbPut(STORE_TASKS, t);
    render();
}

function plainText(html) {
    return String(html || '')
        .replace(/<img[^>]*data-image-id="([^"]+)"[^>]*>/g, ' [图片] ')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/** 内容里带图片时用 HTML 渲染，否则按纯文本（保留换行） */
function contentToHtml(content) {
    const raw = String(content || '');
    if (raw.indexOf('data-image-id') !== -1 || /<br\s*\/?>/.test(raw)) return raw;
    return esc(raw);
}

function filteredTasks() {
    const kw = filters.keyword.trim().toLowerCase();
    let list = tasks.filter(t => {
        if (filters.status === 'active' && t.done) return false;
        if (filters.status === 'done' && !t.done) return false;
        if (filters.priority !== 'all' && String(t.p) !== filters.priority) return false;
        if (kw) {
            const hay = (plainText(t.content) + ' ' + (t.comments || []).map(c => c.text).join(' ')).toLowerCase();
            if (hay.indexOf(kw) === -1) return false;
        }
        return true;
    });
    const byTime = (a, b) => (a.ts || 0) - (b.ts || 0);
    if (filters.sort === 'time-asc') list.sort(byTime);
    else if (filters.sort === 'priority') list.sort((a, b) => (b.p || 0) - (a.p || 0) || byTime(b, a));
    else if (filters.sort === 'remind') list.sort((a, b) => (a.remindAt || Infinity) - (b.remindAt || Infinity));
    else list.sort((a, b) => byTime(b, a));
    return list;
}

/* ============================== 渲染 ============================== */

function render() {
    const list = filteredTasks();
    $('emptyHint').hidden = list.length > 0;
    if (view === 'table') renderTable(list);
    else renderCards(list);
    renderArchive();
    renderFooter();
    if ($('settingsPanel').hidden === false) renderDataStats();
}

function renderCards(list) {
    const box = $('notesList');
    box.innerHTML = list.map(t => cardHtml(t)).join('');
    list.forEach(t => {
        const el = box.querySelector(`.note-content[data-id="${t.id}"]`);
        if (el) hydrateImages(el);
        const imgs = box.querySelector(`.note-images[data-id="${t.id}"]`);
        if (imgs) hydrateImages(imgs);
    });
}

function cardHtml(t) {
    const comments = t.comments || [];
    const showComments = openComments.has(t.id);
    return `
    <article class="note-card ${t.done ? 'done' : ''}" data-id="${t.id}">
        <div class="note-head">
            <span class="badge badge-p${t.p}" data-act="priority" title="点击切换优先级">${priorityText(t.p)}</span>
            <span class="badge badge-type" data-act="type" title="点击切换短期/长期">${t.type === 'long' ? '长期' : '短期'}</span>
            ${t.done ? '<span class="badge badge-done">已完成</span>' : ''}
            ${t.remindAt ? `<span class="badge badge-remind" title="点击修改提醒">⏰ ${esc(formatDate(t.remindAt))}</span>` : ''}
            <span class="note-time">${esc(formatDate(t.ts))}</span>
            ${t.done && t.doneTime ? `<span class="note-time">完成于 ${esc(formatDate(t.doneTime))}</span>` : ''}
        </div>
        <div class="note-content" contenteditable="true" data-id="${t.id}" spellcheck="false">${contentToHtml(t.content)}</div>
        <div class="note-images" data-id="${t.id}"></div>
        <div class="note-actions">
            <button class="btn btn-small" data-act="done" type="button">${t.done ? '撤销完成' : '完成'}</button>
            <button class="btn btn-small" data-act="comment" type="button">💬 评论 ${comments.length || ''}</button>
            <button class="btn btn-small" data-act="remind" type="button">提醒</button>
            <button class="btn btn-small btn-danger" data-act="delete" type="button">删除</button>
        </div>
        ${showComments ? commentsHtml(t) : ''}
    </article>`;
}

function commentsHtml(t) {
    const comments = t.comments || [];
    const rows = comments.map(c =>
        `<div class="comment">${esc(c.text)}<span class="comment-time">${esc(formatDate(c.time))}</span></div>`
    ).join('') || '<div class="comment muted">暂无评论</div>';
    return `<div class="comments">
        ${rows}
        <div class="comment-form">
            <input class="input" data-id="${t.id}" placeholder="写条评论，Enter 发送">
            <button class="btn btn-small btn-primary" data-act="sendComment" type="button">发送</button>
        </div>
    </div>`;
}

function renderTable(list) {
    const body = $('tableBody');
    body.innerHTML = list.map(t => `
        <tr data-id="${t.id}">
            <td>
                <div class="table-content" contenteditable="true" data-id="${t.id}">${contentToHtml(t.content)}</div>
            </td>
            <td><span class="badge badge-p${t.p}" data-act="priority">${priorityText(t.p)}</span></td>
            <td><span class="badge badge-type" data-act="type">${t.type === 'long' ? '长期' : '短期'}</span></td>
            <td><span class="badge ${t.done ? 'badge-done' : 'badge-type'}" data-act="done">${t.done ? '已完成' : '进行中'}</span></td>
            <td class="table-time">${formatDatePair(t.ts)}</td>
            <td class="table-time">${t.done && t.doneTime ? formatDatePair(t.doneTime) : '<span class="muted">-</span>'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-small" data-act="done" type="button">${t.done ? '撤销' : '完成'}</button>
                    <button class="btn btn-small btn-danger" data-act="delete" type="button">删除</button>
                </div>
            </td>
        </tr>`).join('');
    list.forEach(t => {
        const el = body.querySelector(`.table-content[data-id="${t.id}"]`);
        if (el) hydrateImages(el);
    });
}

function renderArchive() {
    const done = tasks.filter(t => t.done);
    $('archiveCount').textContent = done.length;
    if (!archiveExpanded) {
        $('archiveBody').hidden = true;
        $('archiveArrow').textContent = '▶';
        return;
    }
    $('archiveBody').hidden = false;
    $('archiveArrow').textContent = '▼';

    const groups = {};
    done.forEach(t => {
        const d = new Date(t.doneTime || t.ts || Date.now());
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        (groups[key] = groups[key] || []).push(t);
    });
    const keys = Object.keys(groups).sort().reverse();
    $('archiveList').innerHTML = keys.map(k => `
        <div class="archive-group">
            <div class="archive-group-title">${esc(k)} · ${groups[k].length} 条</div>
            ${groups[k].map(t => `
                <div class="archive-item" data-id="${t.id}">
                    <span class="content">${esc(plainText(t.content)) || '(空)'}</span>
                    <button class="btn btn-small" data-act="unarchive" type="button">恢复</button>
                    <button class="btn btn-small btn-danger" data-act="delete" type="button">删除</button>
                </div>`).join('')}
        </div>`).join('') || '<div class="muted">暂无归档</div>';
}

function renderFooter() {
    const active = tasks.filter(t => !t.done).length;
    const high = tasks.filter(t => !t.done && t.p === 3).length;
    $('footStats').textContent = `未完成 ${active} 条（高优 ${high}）· 共 ${tasks.length} 条`;
}

/* ============================== 任务操作 ============================== */

function addTask() {
    const raw = $('input').value.trim();
    if (!raw && pendingImages.length === 0) {
        toast('先写点内容或粘张图片');
        return;
    }
    const p = Number(document.querySelector('#prioritySeg .seg-btn.active').getAttribute('data-p'));
    const t = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        content: raw,
        p: p,
        type: $('newTaskLong').checked ? 'long' : 'short',
        done: false,
        ts: Date.now(),
        comments: [],
        images: pendingImages.slice(),
        remindAt: $('remindEnable').checked && $('remindAt').value
            ? new Date($('remindAt').value).getTime() : 0
    };
    tasks.unshift(t);
    pendingImages = [];
    $('input').value = '';
    $('remindAt').value = '';
    $('remindEnable').checked = false;
    renderPreview();
    saveAll().then(() => toast('已添加'));
}

async function mutate(id, fn) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    fn(t);
    await saveAll();
}

function updateContent(id, html) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const next = String(html || '').trim();
    if (next === (t.content || '').trim()) return;
    t.content = next;
    saveAll();
}

async function deleteTask(id) {
    if (!confirm('删除这条任务？')) return;
    tasks = tasks.filter(t => t.id !== id);
    await saveAll();
}

function unarchive(id) {
    mutate(id, t => { t.done = false; t.doneTime = 0; t.archived = false; });
}

function setReminder(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const current = t.remindAt ? new Date(t.remindAt) : new Date(Date.now() + 3600 * 1000);
    const pad = n => String(n).padStart(2, '0');
    const preset = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}T${pad(current.getHours())}:${pad(current.getMinutes())}`;
    const input = prompt('提醒时间（格式 2026-09-30T18:00，留空 = 取消提醒）', preset);
    if (input === null) return;
    if (!input.trim()) {
        mutate(id, x => { x.remindAt = 0; x.remindFired = false; });
        return;
    }
    const ts = Date.parse(input.trim().replace(' ', 'T'));
    if (isNaN(ts)) { toast('时间格式看不懂'); return; }
    mutate(id, x => { x.remindAt = ts; x.remindFired = false; });
}

function sendComment(id, text) {
    const body = String(text || '').trim();
    if (!body) return;
    mutate(id, t => {
        t.comments = t.comments || [];
        t.comments.push({ text: body, time: Date.now() });
    });
}

/* ============================== 图片粘贴 / 选择 ============================== */

async function addImageFile(file) {
    if (!file || file.type.indexOf('image/') !== 0) return;
    const id = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    await idbPut(STORE_IMAGES, { id, name: file.name || 'paste.png', type: file.type, blob: file });
    pendingImages.push(id);
    renderPreview();
    toast('已加图片（保存后写进任务）');
}

async function renderPreview() {
    const box = $('preview');
    box.innerHTML = '';
    for (const id of pendingImages) {
        const url = await imageUrl(id);
        const wrap = document.createElement('div');
        wrap.className = 'preview-item';
        wrap.innerHTML = `<img src="${url}" alt="待添加"><button type="button" title="移除">✕</button>`;
        wrap.querySelector('button').onclick = () => {
            pendingImages = pendingImages.filter(x => x !== id);
            renderPreview();
        };
        box.appendChild(wrap);
    }
}

/* ============================== 设置 ============================== */

function loadSettings() {
    try {
        settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
    } catch (e) {
        settings = Object.assign({}, DEFAULT_SETTINGS);
    }
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applySettings();
}

function applySettings() {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty('--font-size', settings.fontSize + 'px');
    document.documentElement.style.setProperty('--container', settings.containerWidth + 'px');
    view = settings.defaultView === 'table' ? 'table' : 'card';
    filters.sort = settings.defaultSort;
    $('sortBy').value = settings.defaultSort;
    $('viewCardBtn').classList.toggle('active', view === 'card');
    $('viewTableBtn').classList.toggle('active', view === 'table');
    $('cardsView').hidden = view !== 'card';
    $('tableView').hidden = view !== 'table';
    if (!timer.running) timer.left = totalSeconds(timer.working);
    renderTimer();
}

/** 把设置回填到面板控件（打开设置时调用） */
function fillSettingsForm() {
    $('set-theme').value = settings.theme;
    $('set-fontSize').value = settings.fontSize;
    $('set-fontSizeValue').textContent = settings.fontSize + 'px';
    $('set-containerWidth').value = settings.containerWidth;
    $('set-containerWidthValue').textContent = settings.containerWidth + 'px';
    $('set-showYear').checked = settings.showYear;
    $('set-timeFormat').value = settings.timeFormat;
    $('set-work').value = settings.workMinutes;
    $('set-workValue').textContent = settings.workMinutes + ' 分';
    $('set-rest').value = settings.restMinutes;
    $('set-restValue').textContent = settings.restMinutes + ' 分';
    $('set-autoNext').checked = settings.autoNext;
    $('set-sound').checked = settings.sound;
    $('set-notify').checked = settings.notify;
    $('set-defaultView').value = settings.defaultView;
    $('set-defaultSort').value = settings.defaultSort;
    $('set-autoArchive').checked = settings.autoArchive;
    renderDataStats();
}

function bindSettings() {
    const bind = (id, key, parse, after) => {
        const el = $(id);
        if (!el) return;
        el.addEventListener('change', () => {
            settings[key] = parse(el);
            saveSettings();
            if (after) after();
        });
        el.addEventListener('input', () => {
            if (el.type === 'range') {
                settings[key] = parse(el);
                saveSettings();
                if (after) after();
            }
        });
    };

    bind('set-theme', 'theme', el => el.value);
    bind('set-fontSize', 'fontSize', el => Number(el.value), () => { $('set-fontSizeValue').textContent = settings.fontSize + 'px'; });
    bind('set-containerWidth', 'containerWidth', el => Number(el.value), () => { $('set-containerWidthValue').textContent = settings.containerWidth + 'px'; });
    bind('set-showYear', 'showYear', el => el.checked, () => render());
    bind('set-timeFormat', 'timeFormat', el => el.value, () => render());
    bind('set-work', 'workMinutes', el => Number(el.value), () => { $('set-workValue').textContent = settings.workMinutes + ' 分'; if (!timer.running) { timer.left = totalSeconds(timer.working); renderTimer(); } });
    bind('set-rest', 'restMinutes', el => Number(el.value), () => { $('set-restValue').textContent = settings.restMinutes + ' 分'; });
    bind('set-autoNext', 'autoNext', el => el.checked);
    bind('set-sound', 'sound', el => el.checked);
    bind('set-notify', 'notify', el => el.checked);
    bind('set-defaultView', 'defaultView', el => el.value);
    bind('set-defaultSort', 'defaultSort', el => el.value, () => { filters.sort = settings.defaultSort; $('sortBy').value = settings.defaultSort; render(); });
    bind('set-autoArchive', 'autoArchive', el => el.checked);

    // 分栏切换
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const name = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.toggle('active', t === tab));
            document.querySelectorAll('.settings-pane').forEach(p =>
                p.classList.toggle('active', p.getAttribute('data-pane') === name));
            $('settingsPanes').scrollTop = 0;
            if (name === 'data') renderDataStats();
        });
    });

    // 数据与备份
    $('exportDataBtn').onclick = exportData;
    $('importDataBtn').onclick = () => $('importDataFile').click();
    $('importDataFile').onchange = () => {
        const f = $('importDataFile').files[0];
        if (f) importData(f);
        $('importDataFile').value = '';
    };
    $('clearDataBtn').onclick = clearAllData;
    $('persistBtn').onclick = requestPersist;
}

/* ============================== 数据与备份 ============================== */

async function renderDataStats() {
    const el = $('dataStats');
    if (!el) return;
    try {
        let quota = '';
        if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            quota = ` · 浏览器配额约 ${(est.quota / 1048576).toFixed(0)} MB`;
        }
        const imgs = await idbGetAll(STORE_IMAGES);
        const bytes = imgs.reduce((n, r) => n + (r.blob ? r.blob.size : 0), 0);
        el.textContent = `任务 ${tasks.length} 条（未完成 ${tasks.filter(t => !t.done).length}）· 图片 ${imgs.length} 张（${(bytes / 1048576).toFixed(1)} MB）${quota}`;
    } catch (e) {
        el.textContent = '统计失败：' + e.message;
    }
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
    });
}

/** 导出：任务 + 图片（转 dataURL）+ 设置，做成一个自包含的 JSON */
async function exportData() {
    try {
        const imgs = await idbGetAll(STORE_IMAGES);
        const images = {};
        for (const r of imgs) {
            images[r.id] = { name: r.name, type: r.type, dataUrl: await blobToDataUrl(r.blob) };
        }
        const payload = {
            app: '专注计时器',
            version: 'web-1.0',
            exportedAt: new Date().toISOString(),
            settings: settings,
            tasks: tasks,
            images: images
        };
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'timer-web-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        toast('已导出备份');
    } catch (e) {
        toast('导出失败：' + e.message);
    }
}

function dataUrlToBlob(dataUrl) {
    const [head, body] = String(dataUrl).split(',');
    const type = (head.match(/data:([^;]+)/) || [])[1] || 'image/png';
    const bin = atob(body || '');
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type });
}

/** 导入：优先认本页导出的格式；也兼容桌面版导出的 { storage: { notes, archived_notes } } */
async function importData(file) {
    try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!confirm('导入会覆盖当前全部任务与设置，确定继续吗？')) return;

        if (parsed.tasks) {
            await idbClear(STORE_TASKS);
            await idbClear(STORE_IMAGES);
            for (const [id, rec] of Object.entries(parsed.images || {})) {
                if (rec && rec.dataUrl) {
                    await idbPut(STORE_IMAGES, { id: id, name: rec.name || 'image.png', type: rec.type || 'image/png', blob: dataUrlToBlob(rec.dataUrl) });
                }
            }
            for (const t of parsed.tasks) {
                await idbPut(STORE_TASKS, Object.assign({ comments: [], images: [] }, t));
            }
            if (parsed.settings) {
                settings = Object.assign({}, DEFAULT_SETTINGS, parsed.settings);
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            }
        } else if (parsed.storage && (parsed.storage.notes || parsed.storage.archived_notes)) {
            // 桌面版备份：notes 是 HTML 字符串数组，图片以 file:// 引用（网页里可能加载不出来）
            const active = JSON.parse(parsed.storage.notes || '[]');
            const archive = JSON.parse(parsed.storage.archived_notes || '[]');
            await idbClear(STORE_TASKS);
            for (const n of active.concat(archive)) {
                await idbPut(STORE_TASKS, {
                    id: n.id || Date.now() + Math.floor(Math.random() * 1000),
                    content: n.content || '',
                    p: n.p || 2,
                    type: n.type || 'short',
                    done: !!n.done,
                    ts: n.ts || Date.now(),
                    doneTime: n.doneTime || 0,
                    remindAt: n.remindAt || 0,
                    comments: n.comments || [],
                    images: []
                });
            }
        } else {
            throw new Error('认不出这个文件（既没有 tasks 也没有 storage.notes）');
        }
        toast('导入完成，正在重新加载…');
        setTimeout(() => location.reload(), 600);
    } catch (e) {
        toast('导入失败：' + e.message);
    }
}

async function clearAllData() {
    if (!confirm('确定清空本机保存的全部任务与设置？不可撤销（建议先导出备份）。')) return;
    if (!confirm('再确认一次：清空后无法恢复。')) return;
    await idbClear(STORE_TASKS);
    await idbClear(STORE_IMAGES);
    localStorage.removeItem(SETTINGS_KEY);
    toast('已清空，正在重新加载…');
    setTimeout(() => location.reload(), 500);
}

async function requestPersist() {
    try {
        if (!navigator.storage || !navigator.storage.persist) {
            toast('这个浏览器不支持持久化存储申请');
            return;
        }
        const granted = await navigator.storage.persisted();
        if (granted) { toast('已经是持久化存储了'); updatePersistState(); return; }
        const ok = await navigator.storage.persist();
        toast(ok ? '已获得持久化存储 ✓（仍建议定期导出备份）' : '浏览器拒绝了申请：可以先把本站加入书签/安装为 PWA 再试');
        updatePersistState();
    } catch (e) {
        toast('申请失败：' + e.message);
    }
}

async function updatePersistState() {
    const el = $('persistState');
    const about = $('aboutStorage');
    let text = '存储状态未知';
    try {
        if (navigator.storage && navigator.storage.persisted) {
            text = (await navigator.storage.persisted()) ? '已持久化 ✓' : '未持久化（可能被浏览器自动清理）';
        }
    } catch (e) { /* ignore */ }
    if (el) el.textContent = text;
    if (about) about.textContent = '当前存储：IndexedDB（任务/图片）+ localStorage（设置）· ' + text;
}

/* ============================== 事件绑定 ============================== */

function bindEvents() {
    $('startBtn').onclick = startTimer;
    $('resetBtn').onclick = resetTimer;
    $('switchBtn').onclick = switchMode;
    $('addBtn').onclick = addTask;

    $('input').addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addTask(); }
    });

    $('input').addEventListener('paste', e => {
        const items = (e.clipboardData && e.clipboardData.items) || [];
        let got = false;
        for (const it of items) {
            if (it.kind === 'file' && it.type.indexOf('image/') === 0) {
                addImageFile(it.getAsFile());
                got = true;
            }
        }
        if (got) e.preventDefault();
    });

    document.querySelectorAll('#prioritySeg .seg-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('#prioritySeg .seg-btn').forEach(b => b.classList.toggle('active', b === btn));
        };
    });

    $('remindEnable').onchange = () => {
        if ($('remindEnable').checked && !$('remindAt').value) {
            const d = new Date(Date.now() + 3600 * 1000);
            const p = n => String(n).padStart(2, '0');
            $('remindAt').value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
        }
    };

    $('search').oninput = () => { filters.keyword = $('search').value; render(); };
    $('filterStatus').onchange = () => { filters.status = $('filterStatus').value; render(); };
    $('filterPriority').onchange = () => { filters.priority = $('filterPriority').value; render(); };
    $('sortBy').onchange = () => { filters.sort = $('sortBy').value; render(); };

    $('viewCardBtn').onclick = () => setView('card');
    $('viewTableBtn').onclick = () => setView('table');

    $('archiveToggle').onclick = () => { archiveExpanded = !archiveExpanded; renderArchive(); };
    $('archiveDoneBtn').onclick = () => {
        const done = tasks.filter(t => t.done);
        if (!done.length) { toast('没有已完成的任务'); return; }
        done.forEach(t => { t.archived = true; });
        toast(`已归档 ${done.length} 条（它们仍在归档区）`);
        render();
    };
    $('archiveClearBtn').onclick = () => {
        if (!tasks.some(t => t.done)) { toast('归档是空的'); return; }
        if (!confirm('清空归档（删除所有已完成任务）？')) return;
        tasks = tasks.filter(t => !t.done);
        saveAll();
    };

    // 设置面板开关
    const openSettings = () => {
        fillSettingsForm();
        $('settingsPanel').hidden = false;
        $('settingsMask').hidden = false;
    };
    const closeSettings = () => {
        $('settingsPanel').hidden = true;
        $('settingsMask').hidden = true;
    };
    $('settingsBtn').onclick = openSettings;
    $('settingsClose').onclick = closeSettings;
    $('settingsMask').onclick = closeSettings;

    $('imgViewer').onclick = () => { $('imgViewer').hidden = true; };

    // 卡片 / 表格内的交互（事件委托）
    document.addEventListener('click', async e => {
        const actEl = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!actEl) return;
        const card = actEl.closest('.note-card, .archive-item, tr[data-id]');
        if (!card) return;
        const id = Number(card.getAttribute('data-id'));
        const act = actEl.getAttribute('data-act');

        if (act === 'priority') {
            mutate(id, t => { t.p = t.p === 3 ? 2 : t.p === 2 ? 1 : 3; });
        } else if (act === 'type') {
            mutate(id, t => { t.type = t.type === 'long' ? 'short' : 'long'; });
        } else if (act === 'done') {
            mutate(id, t => {
                t.done = !t.done;
                t.doneTime = t.done ? Date.now() : 0;
            }).then(() => {
                if (settings.autoArchive) toast('已完成（自动归档开启，可在归档区查看）');
            });
        } else if (act === 'delete') {
            deleteTask(id);
        } else if (act === 'unarchive') {
            unarchive(id);
        } else if (act === 'remind') {
            setReminder(id);
        } else if (act === 'comment') {
            if (openComments.has(id)) openComments.delete(id); else openComments.add(id);
            render();
        } else if (act === 'sendComment') {
            const input = card.querySelector('.comment-form .input');
            sendComment(id, input ? input.value : '');
        }
    });

    // 评论输入框回车发送
    document.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const input = e.target.closest ? e.target.closest('.comment-form .input') : null;
        if (!input) return;
        const card = input.closest('.note-card');
        if (!card) return;
        sendComment(Number(card.getAttribute('data-id')), input.value);
    });

    // 内容编辑：失焦保存
    document.addEventListener('focusout', e => {
        const el = e.target;
        if (!el.classList) return;
        if (el.classList.contains('note-content') || el.classList.contains('table-content')) {
            updateContent(Number(el.getAttribute('data-id')), el.innerHTML);
        }
    });
}

function setView(next) {
    view = next;
    settings.defaultView = next;
    saveSettings();
    $('viewCardBtn').classList.toggle('active', next === 'card');
    $('viewTableBtn').classList.toggle('active', next === 'table');
    $('cardsView').hidden = next !== 'card';
    $('tableView').hidden = next !== 'table';
    render();
}

/* ============================== 启动 ============================== */

async function boot() {
    loadSettings();
    bindEvents();
    bindSettings();
    applySettings();
    await loadAll();
    fillSettingsForm();
    render();
    updatePersistState();

    timer.left = totalSeconds(true);
    renderTimer();
    setInterval(tick, 250);
    setInterval(checkReminders, 30000);

    // PWA：可选，装到桌面/手机上更像原生
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        navigator.serviceWorker.register('sw.js').catch(() => { /* 离线缓存失败不影响使用 */ });
    }
}

boot();
