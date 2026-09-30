/* eslint-disable */
'use strict';

/**
 * bridge.js —— 网页版「主进程垫片」（v2 · 复刻桌面版界面方案）
 *
 * 【设计思想】
 *   网页版直接复用桌面版的 renderer.js（界面、交互 100% 一致），renderer 里所有
 *   原本由 Electron 主进程承担的职责，由本文件在浏览器里模拟：
 *
 *     1. window.require / window.process 垫片 —— 让 renderer.js 的
 *        `isElectron = typeof require !== 'undefined' && typeof process !== 'undefined'`
 *        判定为 true，从而走与桌面版完全相同的代码路径；
 *     2. ipcRenderer 垫片 —— 按通道名模拟主进程行为：
 *          · 计时器：100ms 漂移补偿计时状态机（与 main.js 逐行对齐），
 *            含 timer-end / timer-status 广播、自动开始下一阶段、默认时长保存；
 *          · 任务图片：base64 / 网络图存进 IndexedDB，内容里仍写
 *            `NoteImages/img_xxx.png` 相对路径（与桌面版同一约定），
 *            由 sw.js 拦截 fetch 从 IndexedDB 出图 —— renderer 的图片
 *            代码（含 GC 正则）一行不用改；
 *          · 背景图：内置清单（web/Draws/）+ 用户自定义（IndexedDB）；
 *          · 设置：main-settings:get/set 存 localStorage；
 *          · 剪贴板：navigator.clipboard 读写位图；
 *          · 提醒：30s 轮询 localStorage 里的 notes（与 main.js 相同的
 *            24 小时窗口与去重键），弹系统通知 + renderer 内提示；
 *          · 悬浮窗 / 全局快捷键 / AI 接口 / 表格同步：桌面版专属，
 *            全部安全空转（相关设置栏由 overrides.css 隐藏）。
 *
 * 【与桌面版的数据关系】
 *   任务数据同在 localStorage 的 notes / archived_notes 键，导出 JSON
 *   两边互通；图片桌面版是 file:// 引用（浏览器加载不出），网页版是
 *   NoteImages/ 相对路径（桌面版显示为裂图）——文字与结构不受影响。
 */

(function () {
    if (window.__timerWebBridge) return;
    window.__timerWebBridge = true;

    var VERSION = '1.1.0 (网页版)';

    // ============ 内置背景清单（与 web/Draws/ 内容一致；加图后需同步） ============
    var DEFAULT_BGS = ["ScreenShot_2026-04-10_135349_495.webp","ScreenShot_2026-04-10_135420_338.webp","ScreenShot_2026-04-10_135439_396.webp","ScreenShot_2026-04-10_135453_497.webp","ScreenShot_2026-04-10_135524_248.webp","ScreenShot_2026-04-10_135548_159.webp","ScreenShot_2026-04-10_135616_941.webp","ScreenShot_2026-04-10_135633_904.webp","ScreenShot_2026-04-10_135656_092.webp","ScreenShot_2026-04-10_135729_925.webp","ScreenShot_2026-04-10_140042_612.webp","ScreenShot_2026-04-10_140106_661.webp","ScreenShot_2026-04-10_140131_164.webp","ScreenShot_2026-04-10_140151_164.webp","ScreenShot_2026-04-10_140209_583.webp","ScreenShot_2026-04-10_140244_786.webp","ScreenShot_2026-04-10_140316_299.webp","ScreenShot_2026-04-10_140344_264.webp","ScreenShot_2026-04-10_141036_424.webp","ScreenShot_2026-04-10_141114_384.webp","ScreenShot_2026-04-10_141143_256.webp","ScreenShot_2026-04-10_141313_025.webp"];

    // ==================== IndexedDB ====================
    var DB_NAME = 'timer-web', DB_VERSION = 1;
    var _dbPromise = null;
    function db() {
        if (_dbPromise) return _dbPromise;
        _dbPromise = new Promise(function (resolve, reject) {
            var req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (e) {
                var d = e.target.result;
                if (!d.objectStoreNames.contains('images')) d.createObjectStore('images');
                if (!d.objectStoreNames.contains('custombg')) d.createObjectStore('custombg');
            };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
        return _dbPromise;
    }
    function idbReq(store, mode, fn) {
        return db().then(function (d) {
            return new Promise(function (resolve, reject) {
                var tx = d.transaction(store, mode);
                var st = tx.objectStore(store);
                var out = fn(st);
                tx.oncomplete = function () { resolve(out && 'result' in out ? out.result : undefined); };
                tx.onerror = function () { reject(tx.error); };
            });
        });
    }
    function idbGet(store, key) { return idbReq(store, 'readonly', function (s) { return s.get(key); }); }
    function idbPut(store, key, val) { return idbReq(store, 'readwrite', function (s) { return s.put(val, key); }); }
    function idbDel(store, key) { return idbReq(store, 'readwrite', function (s) { return s.delete(key); }); }
    function idbKeys(store) { return idbReq(store, 'readonly', function (s) { return s.getAllKeys(); }); }

    function dataUrlToBlob(dataUrl) {
        var parts = String(dataUrl).split(',');
        var mime = (parts[0].match(/data:([^;]+)/) || [, 'image/png'])[1];
        var bin = atob(parts[1]);
        var buf = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return new Blob([buf], { type: mime });
    }
    function blobToDataUrl(blob) {
        return new Promise(function (resolve, reject) {
            var r = new FileReader();
            r.onload = function () { resolve(r.result); };
            r.onerror = function () { reject(r.error); };
            r.readAsDataURL(blob);
        });
    }

    // ==================== 主设置（main-settings 的网页镜像） ====================
    var SETTINGS_KEY = 'webMainSettings';
    var settingsDefaults = {
        api: { enabled: false, port: 17890, token: '' },
        autolaunch: false,
        globalShortcuts: false,
        reminders: true
    };
    function loadSettings() {
        try {
            var raw = localStorage.getItem(SETTINGS_KEY);
            var s = raw ? JSON.parse(raw) : {};
            var out = {};
            Object.keys(settingsDefaults).forEach(function (k) { out[k] = settingsDefaults[k]; });
            Object.keys(s).forEach(function (k) {
                if (k === 'api') { out.api = Object.assign({}, settingsDefaults.api, s.api || {}); }
                else out[k] = s[k];
            });
            return out;
        } catch (e) { return JSON.parse(JSON.stringify(settingsDefaults)); }
    }
    function saveSettings(patch) {
        var s = loadSettings();
        Object.keys(patch || {}).forEach(function (k) {
            if (k === 'api') s.api = Object.assign({}, s.api, patch.api || {});
            else s[k] = patch[k];
        });
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
        return s;
    }

    // ==================== 计时器状态机（复刻 main.js） ====================
    var timerInterval = null;
    var currentTime = 25 * 60;
    var isWorking = true;
    var WORK_TIME = 25 * 60;
    var REST_TIME = 10 * 60;
    var autoStartNext = (function () {
        try { return localStorage.getItem('autoStartNext') === 'true'; } catch (e) { return false; }
    })();

    function timerStatus() {
        return { isRunning: timerInterval !== null, isWorking: isWorking, currentTime: currentTime };
    }
    function systemNotify(title, body) {
        try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification(title, { body: body || '', silent: false });
            }
        } catch (e) { /* 通知权限被拒不影响页内提示 */ }
    }

    var listeners = {};
    function on(channel, cb) {
        (listeners[channel] = listeners[channel] || []).push(cb);
    }
    function once(channel, cb) {
        function wrapped(ev, data) {
            var arr = listeners[channel] || [];
            var i = arr.indexOf(wrapped);
            if (i !== -1) arr.splice(i, 1);
            cb(ev, data);
        }
        wrapped.__original = cb;
        on(channel, wrapped);
    }
    function emit(channel, data) {
        var arr = (listeners[channel] || []).slice();
        var fakeEvent = { sender: null, reply: function () {} };
        for (var i = 0; i < arr.length; i++) {
            try { arr[i](fakeEvent, data); } catch (e) { console.error('[bridge] 事件处理失败 ' + channel, e); }
        }
    }
    function broadcastTimerStatus() { emit('timer-status', timerStatus()); }

    function toggleTimerMain() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            broadcastTimerStatus();
            return;
        }
        var lastTime = Date.now();
        timerInterval = setInterval(function () {
            var elapsed = Math.floor((Date.now() - lastTime) / 1000);
            if (elapsed >= 1) {
                currentTime -= elapsed;
                lastTime += elapsed * 1000; // 漂移补偿，与 main.js 相同
                if (currentTime <= 0) {
                    emit('timer-end', { isWorking: isWorking }); // 先发结束（保持翻转前的状态），与 main.js 一致
                    systemNotify(isWorking ? '工作结束啦' : '休息结束啦', isWorking ? '休息一下吧' : '回去工作吧');
                    isWorking = !isWorking;
                    currentTime = isWorking ? WORK_TIME : REST_TIME;
                    if (!autoStartNext) {
                        clearInterval(timerInterval);
                        timerInterval = null;
                    }
                }
                broadcastTimerStatus();
            }
        }, 100);
    }
    function setTimerTime(minutes, seconds) {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        currentTime = (minutes || 0) * 60 + (seconds || 0);
        broadcastTimerStatus();
    }
    function switchMode() {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        isWorking = !isWorking;
        currentTime = isWorking ? WORK_TIME : REST_TIME;
        broadcastTimerStatus();
    }
    function saveDefaultTime(data) {
        if (data.isWorking) WORK_TIME = data.time; else REST_TIME = data.time;
        if (isWorking === data.isWorking && !timerInterval) {
            currentTime = data.time;
            broadcastTimerStatus();
        }
    }

    // ==================== 任务提醒轮询（复刻 main.js checkReminders） ====================
    var remindedKeys = new Set();
    function checkReminders() {
        if (!loadSettings().reminders) return;
        var raw; var notes;
        try { raw = localStorage.getItem('notes'); } catch (e) { return; }
        if (!raw) return;
        try { notes = JSON.parse(raw); } catch (e) { return; }
        if (!Array.isArray(notes)) return;
        var now = Date.now();
        for (var i = 0; i < notes.length; i++) {
            var n = notes[i];
            var at = n && (n.remindAt || n.remind_at);
            if (!at || typeof at !== 'number') continue;
            if (at > now) continue;
            if (now - at > 24 * 3600 * 1000) continue; // 过期超 24h 不补打扰
            var key = n.id + ':' + at;
            if (remindedKeys.has(key)) continue;
            remindedKeys.add(key);
            var text = String(n.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
            systemNotify('⏰ 任务提醒', text || '（无内容）');
            emit('task-reminder', { id: n.id, text: text });
        }
    }
    setTimeout(checkReminders, 8000);
    setInterval(checkReminders, 30000);

    // ==================== 任务图片库（NoteImages 约定 + SW 出图） ====================
    function newImageName(ext) {
        var rand = Math.random().toString(36).slice(2, 6);
        return 'img_' + Date.now() + '_' + rand + '.' + (ext || 'png');
    }
    function saveNoteImage(dataUrl) {
        try {
            var blob = dataUrlToBlob(dataUrl);
            var ext = (String(dataUrl).match(/data:image\/(\w+)/) || [, 'png'])[1];
            if (ext === 'jpeg') ext = 'jpg';
            var name = newImageName(ext);
            return idbPut('images', name, blob).then(function () {
                return 'NoteImages/' + name; // 相对路径：页面在 /timer/ 下也成立，SW 拦截出图
            });
        } catch (e) { return Promise.resolve(null); }
    }
    function saveNoteImageSource(spec) {
        var url = spec && (spec.url || spec.path);
        if (!url) return Promise.resolve(null);
        if (/^file:/i.test(url) || /^[a-zA-Z]:[\\/]/.test(url)) return Promise.resolve(null); // 浏览器读不了本地盘
        return fetch(url, { mode: 'cors' }).then(function (r) {
            if (!r.ok) return null;
            return r.blob();
        }).then(function (blob) {
            if (!blob || blob.size > 20 * 1024 * 1024) return null;
            var ext = (String(blob.type).split('/')[1] || 'png').replace('jpeg', 'jpg');
            var name = newImageName(ext);
            return idbPut('images', name, blob).then(function () { return 'NoteImages/' + name; });
        }).catch(function () { return null; });
    }
    function cleanupUnusedImages(referenced) {
        var keep = {};
        (referenced || []).forEach(function (f) { keep[f] = true; });
        return idbKeys('images').then(function (keys) {
            var deleted = 0;
            var chain = Promise.resolve();
            (keys || []).forEach(function (k) {
                if (!keep[k]) {
                    chain = chain.then(function () { return idbDel('images', k).then(function () { deleted++; }); });
                }
            });
            return chain.then(function () { return { success: true, deletedCount: deleted }; });
        }).catch(function (e) { return { success: false, error: e && e.message }; });
    }
    function resolveImageSource(target) {
        // target 可能是：NoteImages/img_x.png（库内）/ dataURL / 其它
        if (typeof target !== 'string' || !target) return Promise.resolve(null);
        if (/^data:image/.test(target)) return Promise.resolve(dataUrlToBlob(target));
        var m = target.match(/NoteImages\/(img_[\w.\-]+)/);
        if (m) return idbGet('images', m[1]).then(function (b) { return b || null; });
        return Promise.resolve(null);
    }

    // ==================== 背景 ====================
    function listBackgrounds() {
        var list = DEFAULT_BGS.map(function (name) {
            return { name: name, path: 'Draws/' + name, isCustom: false, isLocal: true };
        });
        return idbKeys('custombg').then(function (keys) {
            var chain = Promise.resolve();
            (keys || []).forEach(function (k) {
                chain = chain.then(function () {
                    return idbGet('custombg', k).then(function (v) {
                        if (v && v.dataUrl) list.push({ name: k, dataUrl: v.dataUrl, isCustom: true, isLocal: false });
                    });
                });
            });
            return chain.then(function () { return list; });
        }).catch(function () { return list; });
    }

    // ==================== ipcRenderer 垫片 ====================
    var WEBHOOK_DISABLED = {
        enabled: false, mode: 'wecom', url: '',
        events: { created: true, completed: true, updated: false, deleted: false, archived: false },
        history: []
    };
    var API_EXAMPLE = [
        '# 专注计时器（网页版没有本地 HTTP 接口，以下示例需在桌面版使用）',
        'curl http://127.0.0.1:17890/api/health',
        'curl -X POST http://127.0.0.1:17890/api/tasks -H "Content-Type: application/json" \\',
        '  -d \'{"content":"写周报","priority":"high"}\''
    ].join('\n');

    function invokeHandler(channel, args) {
        switch (channel) {
            case 'app:version':
                return Promise.resolve(VERSION);
            case 'main-settings:get':
                return Promise.resolve({ settings: loadSettings() });
            case 'main-settings:set':
                saveSettings(args[0] || {});
                return Promise.resolve({ ok: true });
            case 'save-note-image':
                return saveNoteImage(args[0]);
            case 'save-note-image-source':
                return saveNoteImageSource(args[0]);
            case 'cleanup-unused-images':
                return cleanupUnusedImages(args[0]);
            case 'get-background-images':
                return listBackgrounds();
            case 'clipboard:read-image':
                return navigator.clipboard.read().then(function (items) {
                    for (var i = 0; i < items.length; i++) {
                        var t = items[i].types.find(function (x) { return x.indexOf('image') === 0; });
                        if (t) {
                            return items[i].getType(t).then(function (b) {
                                return blobToDataUrl(b).then(function (dataUrl) {
                                    return { ok: true, dataUrl: dataUrl, formats: items[i].types };
                                });
                            });
                        }
                    }
                    return { ok: false, formats: [] };
                }).catch(function (e) { return { ok: false, error: e && e.message }; });
            case 'clipboard:write-image': {
                var src = args[0]; var mode = args[1] || 'bitmap';
                return resolveImageSource(src).then(function (blob) {
                    if (!blob) return { ok: false, error: '找不到图片数据' };
                    if (mode === 'file') return { ok: false, error: '网页版仅支持位图复制（微信同样可粘贴）' };
                    return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () {
                        return { ok: true, mode: 'bitmap' };
                    }).catch(function (e) { return { ok: false, error: e && e.message }; });
                });
            }
            case 'api:example':
                return Promise.resolve(API_EXAMPLE);
            case 'api:regenerate-token':
                var s = loadSettings();
                s.api = s.api || {};
                s.api.token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
                saveSettings({ api: { token: s.api.token } });
                return Promise.resolve(Object.assign({ ok: true }, s.api, { enabled: false, running: false }));
            case 'webhook:get':
                return Promise.resolve({ ok: true, webhook: WEBHOOK_DISABLED });
            case 'webhook:set':
                return Promise.resolve({ ok: false, error: '表格同步是桌面版专属（浏览器有跨域限制），请在桌面版里配置' });
            case 'webhook:push':
            case 'webhook:test':
                return Promise.resolve({ ok: false, error: '表格同步是桌面版专属（浏览器有跨域限制），请在桌面版里配置' });
            default:
                console.warn('[bridge] 未实现的 IPC 通道：', channel);
                return Promise.resolve(null);
        }
    }

    function sendHandler(channel, args) {
        switch (channel) {
            // —— 计时器（有真实状态机） ——
            case 'toggle-timer': toggleTimerMain(); return;
            case 'toggle-mode': switchMode(); return;
            case 'set-timer-time': setTimerTime(args[0] && args[0].minutes, args[0] && args[0].seconds); return;
            case 'get-timer-status': broadcastTimerStatus(); return;
            case 'save-default-time': saveDefaultTime(args[0] || {}); return;
            case 'set-auto-start-next': autoStartNext = !!(args[0] && args[0].enabled || args[0]); return;
            // —— 背景 ——
            case 'save-background-image': {
                var data = args[0] || {};
                idbPut('custombg', data.fileName, { dataUrl: data.base64Data }).then(function () {
                    emit('save-background-image-result', { success: true, filePath: '(IndexedDB)', fileName: data.fileName });
                }).catch(function (e) {
                    emit('save-background-image-result', { success: false, error: e && e.message });
                });
                return;
            }
            case 'delete-background-image': {
                var fileName = args[0];
                idbDel('custombg', fileName).then(function () {
                    emit('delete-background-image-result', { success: true });
                }).catch(function (e) {
                    emit('delete-background-image-result', { success: false, error: e && e.message });
                });
                return;
            }
            // —— 悬浮窗 / 快捷键 / AI / API：桌面版专属，安全空转 ——
            case 'update-float-time':
            case 'sync-notes-to-float':
            case 'update-float-content-settings':
            case 'update-float-glow-color':
            case 'update-float-glow-enabled':
            case 'update-float-glow-intensity':
            case 'update-float-shadow-color':
            case 'update-float-shadow-size':
            case 'update-float-timer-color':
            case 'toggle-float-window':
            case 'toggle-float-lock':
            case 'get-float-locked':
            case 'api:task-reply':
                return;
            default:
                // 未知 send 通道静默忽略（与悬浮窗相关的广播天然不会发生）
                return;
        }
    }

    var ipcShim = {
        on: function (ch, cb) { on(ch, cb); return ipcShim; },
        once: function (ch, cb) { once(ch, cb); return ipcShim; },
        send: function (ch) { sendHandler(ch, [].slice.call(arguments, 1)); },
        sendSync: function () { return null; },
        invoke: function (ch) { return invokeHandler(ch, [].slice.call(arguments, 1)); },
        removeListener: function (ch, cb) {
            var arr = listeners[ch] || [];
            var i = arr.indexOf(cb);
            if (i !== -1) arr.splice(i, 1);
            else { // once 包装过的
                for (var j = 0; j < arr.length; j++) {
                    if (arr[j].__original === cb) { arr.splice(j, 1); break; }
                }
            }
        },
        removeAllListeners: function (ch) { if (ch) delete listeners[ch]; else listeners = {}; }
    };

    // ==================== require / process 垫片 ====================
    window.require = function (module) {
        if (module === 'electron') {
            return {
                ipcRenderer: ipcShim,
                clipboard: {
                    writeText: function (t) { return navigator.clipboard.writeText(String(t)); },
                    readText: function () { return navigator.clipboard.readText(); }
                }
            };
        }
        throw new Error('[bridge] 网页版不支持模块：' + module);
    };
    window.process = { platform: 'web', env: {}, version: '', versions: {} };

    // ==================== 启动：初始状态广播 + Service Worker ====================
    function boot() {
        // renderer.js 的监听器在同步脚本阶段已注册完毕，这里补发一次当前状态
        setTimeout(broadcastTimerStatus, 200);
        try {
            if (loadSettings().reminders && typeof Notification !== 'undefined' &&
                Notification.permission === 'default') {
                Notification.requestPermission();
            }
        } catch (e) { /* ignore */ }
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(function (e) {
                console.warn('[bridge] Service Worker 注册失败（任务图片将无法显示）：', e.message);
            });
        }
    }
    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot);
})();
