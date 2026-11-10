// sync-client.js —— 专注计时器 多端同步客户端（渲染进程）
// 与 sync-server 配套：账号登录 + pull/push + 冲突询问（保留我的/保留对方的/都保留）
// 纯前端模块，通过 window.createSync(deps) 注入渲染端依赖，不改变原有任务逻辑。
(function () {
    'use strict';

    const SYNC_BASE = (function () {
        try { return localStorage.getItem('sync_base') || 'https://www.gdpudev.cn/sync'; }
        catch (e) { return 'https://www.gdpudev.cn/sync'; }
    })();
    const META_KEY = 'sync_meta';
    const PUSH_DEBOUNCE = 1500;
    const PULL_INTERVAL = 90000;
    const SYNC_FIELDS = ['id', 'content', 'done', 'p', 'type', 'project', 'comments', 'ts', 'doneTime', 'images', 'remindAt'];

    function meta() { try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch (e) { return {}; } }
    function setMeta(m) { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {} }

    function stripTask(t) {
        const o = {};
        for (const f of SYNC_FIELDS) {
            if (f === 'id') { o.id = t.id; continue; }
            if (f === 'comments') { o.comments = Array.isArray(t.comments) ? t.comments : []; continue; }
            if (f === 'done') { o.done = !!t.done; continue; }
            o[f] = (t[f] === undefined || t[f] === null) ? '' : t[f];
        }
        if (typeof o.p !== 'number') o.p = 3;
        if (!o.type) o.type = 'short';
        return o;
    }

    function authHeaders() {
        const m = meta();
        const h = { 'Content-Type': 'application/json' };
        if (m.token) h['Authorization'] = 'Bearer ' + m.token;
        return h;
    }

    function api(path, opts) {
        return fetch(SYNC_BASE + path, opts);
    }

    function createSync(deps) {
        const state = { token: null, cursor: 0, versions: {}, knownIds: {}, email: null, userId: null };
        let pushTimer = null, pulling = false, pushing = false, pullTimer = null;
        const m0 = meta();
        state.token = m0.token || null; state.cursor = m0.cursor || 0;
        state.versions = m0.versions || {}; state.knownIds = m0.knownIds || {};
        state.email = m0.email || null; state.userId = m0.userId || null;
        let ui = null;

        function saveMeta() {
            setMeta({ token: state.token, cursor: state.cursor, versions: state.versions, knownIds: state.knownIds, email: state.email, userId: state.userId });
        }

        function toast(msg) {
            if (deps && typeof deps.toast === 'function') deps.toast(msg);
            else console.log('[sync] ' + msg);
            if (ui && ui.status) ui.status.textContent = msg;
        }

        // ---- 同步进度指示（2026-11-10）----
        // 以前只有登录/登出才碰状态条，自动 push/pull 全程无感知。
        // 现在：有改动待同步 → 同步中…（按钮转圈）→ ✓ 已同步 / ✗ 同步失败。
        let busyCount = 0;
        const TONE_COLOR = { idle: '#9aa0a6', busy: '#ffd54f', ok: '#81c784', err: '#ef5350' };

        function nowTime() {
            try { return new Date().toLocaleTimeString('zh-CN', { hour12: false }); }
            catch (e) { return ''; }
        }

        function setStatus(text, tone) {
            if (!ui || !ui.status) return;
            ui.status.textContent = text;
            ui.status.style.color = TONE_COLOR[tone] || TONE_COLOR.idle;
        }

        function begin() {
            busyCount++;
            setStatus('同步中…', 'busy');
            if (ui && ui.btn) ui.btn.innerHTML = '<span class="sync-spin">⟳</span> 同步中';
        }

        function end(ok, got) {
            busyCount = Math.max(0, busyCount - 1);
            if (busyCount > 0) return; // 还有另一个方向的请求在跑，保持「同步中」
            if (ui && ui.btn) ui.btn.textContent = '🔄 同步';
            if (ok) {
                setStatus(got ? ('✓ 已同步 · 收到 ' + got + ' 条 ' + nowTime()) : ('✓ 已同步 ' + nowTime()), 'ok');
            } else {
                setStatus('✗ 同步失败 ' + nowTime(), 'err');
            }
        }

        // ---- push ----
        function computePush() {
            const tasks = (deps.getLocalTasks ? deps.getLocalTasks() : []) || [];
            const changes = [];
            const currentIds = {};
            for (const t of tasks) {
                const id = String(t.id);
                currentIds[id] = true;
                changes.push({ op: 'upsert', taskId: t.id, baseVersion: state.versions[id] || 0, task: stripTask(t) });
            }
            for (const id in state.knownIds) {
                if (!currentIds[id]) changes.push({ op: 'delete', taskId: Number(id), baseVersion: state.versions[id] || 0 });
            }
            state.knownIds = currentIds;
            return changes;
        }

        async function doPush() {
            if (!state.token || pushing) return;
            pushing = true;
            begin();
            let ok = true;
            try {
                const changes = computePush();
                const res = await api('/api/sync/push', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ changes }) });
                if (!res.ok) { ok = false; if (res.status === 401) handleUnauthorized(); return; }
                const data = await res.json();
                if (data.conflicts && data.conflicts.length) await handleConflicts(data.conflicts);
            } catch (e) { ok = false; console.error('[sync] push error', e); }
            finally { pushing = false; end(ok, 0); saveMeta(); }
            if (ok) await doPull();
        }

        function notifyLocalChange() {
            if (!state.token) return;
            if (pushTimer) return;
            setStatus('有改动 · 待同步…', 'busy');
            pushTimer = setTimeout(function () { pushTimer = null; doPush(); }, PUSH_DEBOUNCE);
        }

        // ---- pull ----
        async function doPull() {
            if (!state.token || pulling) return;
            pulling = true;
            begin();
            let ok = true, got = 0;
            try {
                const res = await api('/api/sync/pull?since=' + state.cursor, { headers: authHeaders() });
                if (!res.ok) { ok = false; if (res.status === 401) handleUnauthorized(); return; }
                const data = await res.json();
                got = (data.changes || []).length;
                applyChanges(data.changes || []);
                state.cursor = data.cursor || state.cursor;
            } catch (e) { ok = false; console.error('[sync] pull error', e); }
            finally { pulling = false; end(ok, got); saveMeta(); }
        }

        function applyChanges(changes) {
            const upserts = [], deletes = [];
            for (const c of changes) { if (c.op === 'delete') deletes.push(c); else upserts.push(c); }
            if (deps.applyRemote) deps.applyRemote(upserts, deletes);
            for (const c of changes) {
                const k = String(c.taskId);
                state.versions[k] = c.version;
                if (c.op === 'delete') delete state.knownIds[k];
                else state.knownIds[k] = true;
            }
        }

        // ---- conflicts ----
        function handleConflicts(conflicts) {
            return showConflictModal(conflicts).then(function (resolutions) {
                return resolveConflicts(conflicts, resolutions);
            });
        }

        async function resolveConflicts(conflicts, resolutions) {
            for (const c of conflicts) {
                const r = resolutions[String(c.taskId)] || resolutions[c.taskId] || 'theirs';
                if (r === 'mine') {
                    await api('/api/sync/push', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ changes: [{ op: 'upsert', taskId: c.taskId, baseVersion: c.serverVersion, task: stripTask(c.clientTask) }] }) });
                } else if (r === 'both') {
                    if (deps.applyRemote) deps.applyRemote([{ op: 'upsert', task: c.serverTask }], []);
                    state.versions[String(c.taskId)] = c.serverVersion; state.knownIds[String(c.taskId)] = true;
                    if (!(c.clientTask && c.clientTask.deleted)) {
                        const newId = c.taskId + '_both_' + Date.now();
                        const nt = Object.assign({}, stripTask(c.clientTask), { id: newId });
                        if (deps.applyRemote) deps.applyRemote([{ op: 'upsert', task: nt }], []);
                        await api('/api/sync/push', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ changes: [{ op: 'upsert', taskId: newId, baseVersion: 0, task: stripTask(nt) }] }) });
                    }
                } else {
                    if (deps.applyRemote) deps.applyRemote([{ op: 'upsert', task: c.serverTask }], []);
                    state.versions[String(c.taskId)] = c.serverVersion; state.knownIds[String(c.taskId)] = true;
                }
            }
            saveMeta();
        }

        // ---- auth ----
        async function auth(mode, email, password) {
            const res = await api('/api/auth/' + mode, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: password }) });
            if (!res.ok) { const e = await res.json().catch(function () { return { error: '请求失败' }; }); throw new Error(e.message || e.error || ('认证失败 ' + res.status)); }
            const d = await res.json();
            state.token = d.token; state.email = email; state.userId = d.user && d.user.id;
            saveMeta();
            startInterval();
            doPull();
            toast('已登录 ' + email);
            return d;
        }
        function login(email, password) { return auth('login', email, password); }
        function register(email, password) { return auth('register', email, password); }
        function logout() {
            state.token = null; state.cursor = 0; state.versions = {}; state.knownIds = {};
            saveMeta(); stopInterval(); toast('已退出登录');
            setStatus('未登录', 'idle');
        }
        function handleUnauthorized() { state.token = null; saveMeta(); stopInterval(); setStatus('登录已失效', 'err'); toast('登录已失效，请重新登录'); }

        function startInterval() {
            if (pullTimer) return;
            pullTimer = setInterval(function () { doPull(); doPush(); }, PULL_INTERVAL);
        }
        function stopInterval() { if (pullTimer) { clearInterval(pullTimer); pullTimer = null; } }

        function init() {
            buildUI();
            if (state.token) { startInterval(); doPull(); }
        }

        // ---- UI ----
        function buildUI() {
            if (document.getElementById('sync-fab')) {
                const f = document.getElementById('sync-fab');
                ui = { fab: f, btn: f.querySelector('button'), status: f.querySelector('.sync-status') };
                return;
            }
            if (!document.getElementById('sync-progress-style')) {
                const st = document.createElement('style');
                st.id = 'sync-progress-style';
                st.textContent = '@keyframes syncSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
                    '.sync-spin{display:inline-block;animation:syncSpin .9s linear infinite;}';
                document.head.appendChild(st);
            }
            const fab = document.createElement('div');
            fab.id = 'sync-fab';
            // 【2026-10-22】原来是 top:8/right:10 的浮层，正好压在右上角的 ⚙ 设置按钮上，
            // 「未登录」几个字直接盖住了齿轮。改成停在齿轮左边、与齿轮同一水平线。
            fab.style.cssText = 'position:fixed;top:16px;right:64px;z-index:1001;display:flex;gap:6px;align-items:center;font-size:12px;font-family:system-ui,sans-serif;';
            const btn = document.createElement('button');
            btn.textContent = '🔄 同步';
            btn.style.cssText = 'height:34px;cursor:pointer;border:1px solid rgba(255,255,255,0.18);background:rgba(30,30,30,0.8);color:#eaeaea;padding:0 12px;border-radius:8px;font-size:12px;';
            const status = document.createElement('span');
            status.className = 'sync-status';
            status.style.cssText = 'height:34px;display:inline-flex;align-items:center;padding:0 10px;border-radius:8px;background:rgba(30,30,30,0.55);color:#9aa0a6;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            status.textContent = state.token ? ('已登录 ' + (state.email || '')) : '未登录';
            btn.onclick = function () {
                if (!state.token) { showLogin(); return; }
                toast('同步中…'); doPush(); doPull();
            };
            fab.appendChild(btn); fab.appendChild(status);
            document.body.appendChild(fab);
            ui = { fab: fab, btn: btn, status: status };
        }

        function showLogin() {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99998;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;';
            const box = document.createElement('div');
            box.style.cssText = 'background:#1e1e1e;color:#eaeaea;border:1px solid #3a3a3a;border-radius:12px;padding:20px;width:300px;';
            box.innerHTML =
                '<div style="font-size:15px;margin-bottom:12px;font-weight:600;">账号同步</div>' +
                '<div style="font-size:12px;color:#9aa0a6;margin:-6px 0 10px;line-height:1.5;">注册需要白名单：只有管理员开通过的邮箱才能注册，已有账号直接登录即可。</div>' +
                '<input id="syncEmail" placeholder="邮箱" style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:8px;border-radius:8px;border:1px solid #3a3a3a;background:#121212;color:#eaeaea;">' +
                '<input id="syncPw" type="password" placeholder="密码（≥6位）" style="width:100%;box-sizing:border-box;margin-bottom:12px;padding:8px;border-radius:8px;border:1px solid #3a3a3a;background:#121212;color:#eaeaea;">' +
                '<div id="syncMsg" style="color:#ff8a80;font-size:12px;min-height:16px;margin-bottom:10px;"></div>' +
                '<div style="display:flex;gap:8px;">' +
                '<button id="syncLoginBtn" style="flex:1;padding:8px;border-radius:8px;border:1px solid #3a3a3a;background:#2d6cdf;color:#fff;cursor:pointer;">登录</button>' +
                '<button id="syncRegBtn" style="flex:1;padding:8px;border-radius:8px;border:1px solid #3a3a3a;background:#2a2a2a;color:#eaeaea;cursor:pointer;">注册</button>' +
                '</div>';
            overlay.appendChild(box);
            overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
            document.body.appendChild(overlay);
            const msg = box.querySelector('#syncMsg');
            function submit(mode) {
                const email = box.querySelector('#syncEmail').value.trim();
                const pw = box.querySelector('#syncPw').value;
                msg.textContent = '处理中…';
                (mode === 'login' ? login(email, pw) : register(email, pw)).then(function () { overlay.remove(); }).catch(function (e) { msg.textContent = e.message; });
            }
            box.querySelector('#syncLoginBtn').onclick = function () { submit('login'); };
            box.querySelector('#syncRegBtn').onclick = function () { submit('register'); };
        }

        function showConflictModal(conflicts) {
            return new Promise(function (resolve) {
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;';
                const box = document.createElement('div');
                box.style.cssText = 'background:#1e1e1e;color:#eaeaea;border:1px solid #3a3a3a;border-radius:12px;padding:18px;width:420px;max-height:80vh;overflow:auto;';
                let html = '<div style="font-size:15px;margin-bottom:6px;font-weight:600;">同步冲突（同一任务两端都改过）</div>' +
                    '<div style="font-size:12px;color:#9aa0a6;margin-bottom:12px;">请为每条选择：保留我的 / 保留对方的 / 都保留（各存一份）</div>';
                const choices = {};
                conflicts.forEach(function (c) {
                    const id = String(c.taskId); choices[id] = 'theirs';
                    const mine = (c.clientTask && c.clientTask.content) || '(无内容)';
                    const theirs = (c.serverTask && c.serverTask.content) || '(无内容)';
                    html += '<div style="border:1px solid #333;border-radius:8px;padding:8px;margin-bottom:10px;">' +
                        '<div style="font-size:12px;color:#9aa0a6;margin-bottom:4px;">任务 #' + id + '</div>' +
                        '<div style="font-size:12px;margin-bottom:2px;">我的：' + escapeText(mine) + '</div>' +
                        '<div style="font-size:12px;margin-bottom:6px;">对方的：' + escapeText(theirs) + '</div>' +
                        '<select data-id="' + id + '" style="width:100%;padding:6px;border-radius:6px;background:#121212;color:#eaeaea;border:1px solid #3a3a3a;">' +
                        '<option value="theirs">保留对方的</option>' +
                        '<option value="mine">保留我的</option>' +
                        '<option value="both">都保留</option>' +
                        '</select></div>';
                });
                html += '<div style="display:flex;gap:8px;margin-top:4px;">' +
                    '<button id="cfCancel" style="flex:1;padding:8px;border-radius:8px;border:1px solid #3a3a3a;background:#2a2a2a;color:#eaeaea;cursor:pointer;">全部保留对方的</button>' +
                    '<button id="cfOk" style="flex:1;padding:8px;border-radius:8px;border:1px solid #3a3a3a;background:#2d6cdf;color:#fff;cursor:pointer;">确认</button>' +
                    '</div>';
                box.innerHTML = html;
                overlay.appendChild(box);
                overlay.addEventListener('click', function (e) { if (e.target === overlay) { resolve(choices); overlay.remove(); } });
                document.body.appendChild(overlay);
                box.querySelectorAll('select[data-id]').forEach(function (sel) {
                    sel.onchange = function () { choices[sel.getAttribute('data-id')] = sel.value; };
                });
                box.querySelector('#cfCancel').onclick = function () { for (const k in choices) choices[k] = 'theirs'; overlay.remove(); resolve(choices); };
                box.querySelector('#cfOk').onclick = function () { overlay.remove(); resolve(choices); };
            });
        }

        function escapeText(s) {
            return String(s).replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; });
        }

        // 网络恢复后自动追平
        window.addEventListener('online', function () { if (state.token) { doPull(); doPush(); } });

        return {
            init: init, login: login, register: register, logout: logout,
            notifyLocalChange: notifyLocalChange, pushLocal: function () { notifyLocalChange(); }, pull: doPull,
            showLogin: showLogin, getStatus: function () { return { email: state.email, cursor: state.cursor }; }
        };
    }

    window.createSync = createSync;
})();
