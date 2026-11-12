'use strict';

/**
 * api-server.js —— 本地 AI 接入 API（M15）
 *
 * 【要解决的问题】
 *   以前只有「人」能往这个计时器里加任务：打开窗口、打字、回车。
 *   AI 助手（或任何脚本）想帮忙规划 / 拆解 / 记录时完全没有入口，
 *   只能让人当中转站，把 AI 的输出再手工抄一遍。
 *
 * 【本模块做什么】
 *   在主进程内起一个**只监听本机**的 HTTP 服务（Node 原生 http，零依赖），
 *   把「任务、图片、计时器、剪贴板」四类能力暴露成 JSON 接口：
 *
 *     任务     GET/POST/PATCH/DELETE  /api/tasks
 *     图片     任务体内嵌 images（base64 / 网络 URL / 本地路径）、POST /api/clipboard/image
 *     计时器   GET/POST               /api/timer
 *     剪贴板   GET/POST               /api/clipboard/image
 *
 *   任务的真实数据仍然由渲染进程持有（notes / archivedNotes），本模块通过
 *   hooks.invokeRenderer 走 IPC 请求渲染进程执行，保证与界面同一份数据、
 *   同一套保存逻辑（含图片落盘与回收），不会出现「API 写了一份、界面显示另一份」。
 *
 * 【安全边界】
 *   1. 默认只绑定 127.0.0.1，局域网监听需显式打开 allowLAN（且强制要求令牌）；
 *   2. 可配置令牌（X-Api-Token / Authorization: Bearer / ?token=），为空时不校验；
 *   3. 不执行任何传入的代码，图片只做「下载 → 转成本地文件 URL」这一步；
 *   4. 请求体上限 24MB，超限直接拒绝，避免大文件拖垮主进程。
 */

const http = require('http');
const { clipboard, nativeImage } = require('electron');

const DEFAULT_PORT = 17890;
const MAX_BODY_BYTES = 24 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10000;

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function textToHtml(text) {
    return escapeHtml(text).replace(/\r?\n/g, '<br>');
}

/** 优先级：支持 'high' / '高' / '紧急' / 3 等多种写法，无法识别时不紧急 */
function parsePriority(v) {
    if (v === undefined || v === null || v === '') return 1;
    if (typeof v === 'number') {
        if (v === 3 || v === 2 || v === 1) return v;
        return v >= 3 ? 3 : v <= 1 ? 1 : 2;
    }
    const s = String(v).trim().toLowerCase();
    if (['high', 'h', 'urgent', 'p3', '3', '高', '紧急'].indexOf(s) !== -1) return 3;
    if (['medium', 'mid', 'normal', 'm', 'p2', '2', '中', '中等'].indexOf(s) !== -1) return 2;
    return 1;
}

function parseType(v) {
    if (!v) return 'short';
    const s = String(v).trim().toLowerCase();
    if (['long', 'l', '长期', '长'].indexOf(s) !== -1) return 'long';
    return 'short';
}

/**
 * 提醒时间：支持时间戳（毫秒 / 秒）、ISO 字符串、"YYYY-MM-DD HH:mm"
 * 解析失败返回 null（调用方据此忽略该字段，而不是塞一个 NaN 进数据里）
 */
function parseRemindAt(v) {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'number' && isFinite(v)) {
        // 小于 1e12 视为秒级时间戳
        return v < 1e12 ? v * 1000 : v;
    }
    const s = String(v).trim();
    if (/^\d+$/.test(s)) {
        const n = Number(s);
        return n < 1e12 ? n * 1000 : n;
    }
    // "2026-09-28 14:30" 在部分环境下 new Date 解析不稳定，手工补 T
    const normalized = s.replace(' ', 'T');
    const t = new Date(normalized).getTime();
    return isNaN(t) ? null : t;
}

/** sendJson(res, obj[, status])：状态码省略时为 200 */
function sendJson(res, obj, status) {
    if (typeof status !== 'number') status = 200;
    const body = JSON.stringify(obj);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        // 允许浏览器里的 AI 工具（如本地网页）跨域直接调用
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Api-Token,Authorization'
    });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', c => {
            size += c.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('请求体超过 ' + Math.round(MAX_BODY_BYTES / 1024 / 1024) + 'MB 上限'));
                req.destroy();
                return;
            }
            chunks.push(c);
        });
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (!raw) return resolve({});
            try {
                resolve(JSON.parse(raw));
            } catch (e) {
                reject(new Error('JSON 解析失败：' + e.message));
            }
        });
        req.on('error', reject);
    });
}

function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(label + ' 超时（' + ms + 'ms）')), ms))
    ]);
}

function createApiServer(hooks) {
    let server = null;
    let listening = false;

    const config = {
        enabled: false,
        port: DEFAULT_PORT,
        token: '',
        requireToken: true,
        allowLAN: false
    };

    function baseUrl() {
        const host = config.allowLAN ? '0.0.0.0' : '127.0.0.1';
        return 'http://' + (config.allowLAN ? '<本机IP>' : '127.0.0.1') + ':' + config.port;
    }

    function tokenRequired() {
        return config.requireToken && !!config.token;
    }

    function checkAuth(req, url) {
        if (!tokenRequired()) return true;
        const header = req.headers['x-api-token'] || '';
        let bearer = '';
        const auth = req.headers['authorization'] || '';
        if (auth.indexOf('Bearer ') === 0) bearer = auth.slice(7);
        const query = url.searchParams.get('token') || '';
        const provided = (header || bearer || query || '').trim();
        return provided === config.token;
    }

    /** 把 AI 传来的图片规格统一转成任务 HTML 里可用的 <img> 片段 */
    async function imageToHtml(spec) {
        if (!spec) return '';
        let input = spec;
        if (typeof spec === 'string') input = { data: spec };
        const fileUrl = await hooks.saveImage(input);
        if (!fileUrl) return '';
        return '<img src="' + fileUrl + '" style="max-width:100%;max-height:200px;object-fit:contain;border-radius:8px;margin:4px 0;">';
    }

    /**
     * 构造一条任务的 HTML 正文：
     *   html 字段优先（AI 可以自己写富文本）；否则 content 按纯文本处理（换行转 <br>）
     *   之后把 images / imageUrls 追加在正文后面
     *   最后统一本地化：正文里的 http(s) 图片与 base64 图片都会落盘成文件 URL
     */
    async function buildContent(spec) {
        let html = '';
        if (spec.html !== undefined && spec.html !== null) {
            html = String(spec.html);
        } else if (spec.content !== undefined && spec.content !== null) {
            const raw = String(spec.content);
            html = /<[a-z][\s\S]*>/i.test(raw) ? raw : textToHtml(raw);
        }

        const extra = [];
        const images = [].concat(spec.images || []);
        for (const img of images) {
            extra.push(await imageToHtml(img));
        }
        const urls = [].concat(spec.imageUrls || spec.images_urls || []);
        for (const u of urls) {
            if (typeof u === 'string' && u) extra.push(await imageToHtml({ url: u }));
        }
        if (extra.length) html += extra.join('');

        // 正文里夹带的远程 / base64 图片也一并本地化，避免将来链接失效
        if (html) html = await hooks.localizeHtml(html);
        return html;
    }

    async function normalizeTask(spec) {
        if (!spec || typeof spec !== 'object') throw new Error('任务格式不正确');
        const content = await buildContent(spec);
        if (!content || !content.trim()) throw new Error('任务内容为空');
        const task = {
            content: content,
            p: parsePriority(spec.priority !== undefined ? spec.priority : spec.p),
            type: parseType(spec.type),
            done: !!spec.done
        };
        const remindAt = parseRemindAt(spec.remindAt !== undefined ? spec.remindAt : spec.remind_at);
        if (remindAt) task.remindAt = remindAt;
        if (Array.isArray(spec.comments)) {
            task.comments = spec.comments
                .filter(c => c !== undefined && c !== null && String(c).trim() !== '')
                .map(c => (typeof c === 'string' ? { text: c, time: Date.now() } : c));
        }
        if (spec.top === false) task.top = false;
        if (Array.isArray(spec.tags)) task.tags = spec.tags.map(String);
        if (spec.project !== undefined && spec.project !== null) {
            const project = String(spec.project).trim();
            if (project) task.project = project;
        }
        return task;
    }

    /**
     * 【2026-11-12 CR-038】结构化检索。
     * 以前只有 scope + keyword + limit，「找出本周高优未完成带提醒的任务」说不出来。
     * 现在过滤条件都在服务端做（数据本来就全量在内存里，比让脚本自己遍历省事）：
     *   project / priority / type / done / hasTable / remind / from / to / dateField
     *   sort / order / offset / limit
     * 返回里额外给 total（过滤后、分页前的条数），方便脚本判断要不要翻页。
     */
    async function handleTasksGet(url) {
        const q = url.searchParams;
        const scope = q.get('scope') || 'active';
        const limit = parseInt(q.get('limit') || '0', 10) || 0;
        const offset = parseInt(q.get('offset') || '0', 10) || 0;
        const keyword = q.get('keyword') || '';
        const res = await withTimeout(hooks.invokeRenderer('list', {}), REQUEST_TIMEOUT_MS, '读取任务');
        let items = res.notes || [];
        if (scope === 'archive') items = res.archived || [];
        else if (scope === 'all') items = (res.notes || []).concat(res.archived || []);

        if (keyword) {
            const k = keyword.toLowerCase();
            items = items.filter(n => {
                const text = String(n.content || '').replace(/<[^>]*>/g, ' ');
                // 评论也一起搜，否则「记在评论里的结论」永远找不到
                const cm = (n.comments || []).map(c => (typeof c === 'string' ? c : c && c.text) || '').join(' ');
                return (text + ' ' + cm).toLowerCase().indexOf(k) !== -1;
            });
        }

        const project = q.get('project');
        if (project !== null && project !== '') {
            items = project === '-' || project === 'null'
                ? items.filter(n => !n.project)                     // 未归项目
                : items.filter(n => String(n.project || '') === project);
        }

        const priority = q.get('priority') !== null ? q.get('priority') : q.get('p');
        if (priority !== null && priority !== '') {
            const want = parsePriority(priority);
            items = items.filter(n => parsePriority(n.p) === want);
        }

        const type = q.get('type');
        if (type) {
            const want = parseType(type);
            items = items.filter(n => parseType(n.type) === want);
        }

        const done = q.get('done');
        if (done !== null && done !== '') {
            const want = !/^(0|false|no|未完成|否)$/i.test(String(done));
            items = items.filter(n => !!n.done === want);
        }
        if (q.get('todo') === '1' || q.get('todo') === 'true') items = items.filter(n => !n.done);

        const hasTable = q.get('hasTable');
        if (hasTable !== null && hasTable !== '') {
            const want = !/^(0|false|no)$/i.test(String(hasTable));
            items = items.filter(n => /<table[\s>]/i.test(String(n.content || '')) === want);
        }

        const remind = q.get('remind');
        if (remind === 'pending' || remind === '1') items = items.filter(n => Number(n.remindAt) > 0);
        else if (remind === 'none' || remind === '0') items = items.filter(n => !Number(n.remindAt));

        // 时间区间：默认按创建时间（id 就是创建毫秒时间戳），也可用 dateField=remind 按提醒时间
        const from = parseBound(q.get('from'), false);
        const to = parseBound(q.get('to'), true);
        if (from !== null || to !== null) {
            const field = (q.get('dateField') || 'created').toLowerCase();
            items = items.filter(n => {
                const v = Number(field === 'remind' ? n.remindAt : n.id);
                if (!v) return false;
                if (from !== null && v < from) return false;
                if (to !== null && v > to) return false;
                return true;
            });
        }

        const sortKey = (q.get('sort') || '').toLowerCase();
        if (sortKey) {
            const dir = (q.get('order') || 'desc').toLowerCase() === 'asc' ? 1 : -1;
            const val = n => {
                switch (sortKey) {
                    case 'priority': case 'p': return parsePriority(n.p);
                    case 'remind': case 'remindat': return Number(n.remindAt) || 0;
                    case 'done': return n.done ? 1 : 0;
                    case 'len': case 'size': return String(n.content || '').length;
                    case 'created': case 'id': case 'ts': default: return Number(n.id) || 0;
                }
            };
            items = items.slice().sort((a, b) => (val(a) - val(b)) * dir);
        }

        const total = items.length;
        if (offset > 0) items = items.slice(offset);
        if (limit > 0) items = items.slice(0, limit);
        return { ok: true, total: total, count: items.length, tasks: items };
    }

    /** '2026-11-01' → 当天 00:00；'2026-11-01 18:00' → 该时刻；数字当时间戳。to=true 且只给日期时取当天 23:59:59.999 */
    function parseBound(v, isEnd) {
        if (v === null || v === undefined || v === '') return null;
        const s = String(v).trim();
        if (/^\d+$/.test(s)) {
            const n = Number(s);
            if (n > 1e12) return n;
            const asDate = /^\d{8}$/.test(s)
                ? new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))
                : null;
            if (asDate) return isEnd ? asDate.setHours(23, 59, 59, 999) : asDate.setHours(0, 0, 0, 0);
            return n * 1000;                                       // 秒级时间戳
        }
        const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m) {
            const d = new Date(+m[1], m[2] - 1, +m[3]);
            return isEnd ? d.setHours(23, 59, 59, 999) : d.setHours(0, 0, 0, 0);
        }
        const t = new Date(s.replace(' ', 'T')).getTime();
        return isNaN(t) ? null : t;
    }

    async function handleTasksPost(body) {
        const specs = Array.isArray(body.tasks) ? body.tasks : [body];
        const created = [];
        for (const spec of specs) {
            const task = await normalizeTask(spec);
            const note = await withTimeout(
                hooks.invokeRenderer('add', { task }), REQUEST_TIMEOUT_MS, '写入任务');
            created.push(note);
        }
        return { ok: true, created: created, count: created.length };
    }

    async function handleTaskPatch(id, body) {
        const patch = {};
        if (body.content !== undefined || body.html !== undefined || body.images || body.imageUrls) {
            patch.content = await buildContent(body);
        }
        if (body.priority !== undefined || body.p !== undefined) {
            patch.p = parsePriority(body.priority !== undefined ? body.priority : body.p);
        }
        if (body.type !== undefined) patch.type = parseType(body.type);
        if (body.project !== undefined) patch.project = String(body.project || '').trim();
        if (body.done !== undefined) patch.done = !!body.done;
        if (body.remindAt !== undefined || body.remind_at !== undefined) {
            const r = parseRemindAt(body.remindAt !== undefined ? body.remindAt : body.remind_at);
            patch.remindAt = r; // 传空表示清除提醒
        }
        if (body.appendText || body.append) {
            patch.appendText = String(body.appendText || body.append);
        }
        const note = await withTimeout(
            hooks.invokeRenderer('update', { id, patch }), REQUEST_TIMEOUT_MS, '更新任务');
        return { ok: true, task: note };
    }

    const routes = {
        'GET /api/health': async () => ({
            ok: true,
            service: '专注计时器 AI 接入 API',
            version: hooks.version(),
            timer: hooks.timer.status(),
            floatWindowOpen: hooks.isFloatOpen(),
            tokenRequired: tokenRequired()
        }),

        'GET /api/schema': async () => ({
            ok: true,
            base: baseUrl(),
            auth: tokenRequired()
                ? { header: 'X-Api-Token: <token>', alt: 'Authorization: Bearer <token>', query: '?token=<token>' }
                : null,
            endpoints: [
                { method: 'GET', path: '/api/health', desc: '健康检查与当前计时状态' },
                { method: 'GET', path: '/api/schema', desc: '本接口说明（给你自描述用）' },
                {
                    method: 'GET',
                    path: '/api/tasks?scope=active|archive|all&keyword=&limit=',
                    desc: '列出任务；过滤参数 project / priority / type / done / hasTable / remind=pending|none / ' +
                        'from / to（2026-11-01 或时间戳）/ dateField=created|remind / sort=created|priority|remind|len / ' +
                        'order=asc|desc / offset / limit；返回 {total,count,tasks}'
                },
                { method: 'POST', path: '/api/tasks', desc: '新增任务；body 也支持 {tasks:[...]} 批量' },
                { method: 'GET', path: '/api/tasks/:id', desc: '查询单条任务' },
                { method: 'PATCH', path: '/api/tasks/:id', desc: '修改任务（内容/优先级/类型/项目/完成/提醒）' },
                { method: 'DELETE', path: '/api/tasks/:id', desc: '删除任务' },
                { method: 'POST', path: '/api/tasks/:id/comments', desc: '给任务追加评论 {text}' },
                { method: 'GET', path: '/api/tasks/:id/table', desc: '读取任务内容里每张表格的尺寸（行数/列数/列宽/行高/是否冻结）' },
                { method: 'POST', path: '/api/tasks/:id/table', desc: '改表格尺寸 {action:"set"|"auto"|"insert", index, width:"900"|"80%", cols:"120,240,*", rows:[{row,height}]}；insert 支持 {head:[…], data:[[…]], at:"end"|"start"}' },
                { method: 'GET', path: '/api/table-view', desc: '读取任务表格视图的列宽 / 行高（localStorage）' },
                { method: 'POST', path: '/api/table-view', desc: '改表格视图 {colWidths:{"0":200}, rowHeights:{"<noteId>":80}}；{action:"reset"} 恢复默认' },
                { method: 'GET', path: '/api/timer', desc: '计时器状态' },
                { method: 'POST', path: '/api/timer', desc: '{action:start|pause|toggle|reset|mode|set, minutes, seconds}' },
                { method: 'GET', path: '/api/clipboard/image', desc: '读取系统剪贴板里的图片（微信复制的截图也能读）' },
                { method: 'POST', path: '/api/clipboard/image', desc: '把图片写入剪贴板 {data|url|path}，可直接粘进微信' },
                { method: 'GET', path: '/api/settings', desc: '读取设置（可带 ?key=）' },
                { method: 'POST', path: '/api/settings', desc: '写入设置 {key,value}' },
                { method: 'POST', path: '/api/notify', desc: '弹一条系统通知 {title,body}' },
                { method: 'POST', path: '/api/window', desc: '{action:show|hide|float}' },
                { method: 'GET', path: '/api/webhook', desc: '查看 WebHook 完整配置（字段+选项+映射+固定文本）与最近推送记录' },
                { method: 'POST', path: '/api/webhook', desc: '推送 {action:"created", ids|tasks, force}；改配置 {action:"config", config}；只解析 {action:"parse", schemaJson}；发测试 {action:"test"}' }
            ],
            contentFormat: {
                note: 'content 与 comments 支持轻量 markdown，也接受常见 HTML 标签，渲染后是排版而不是字面量',
                markdown: {
                    heading: '# ~ ####（如 "## 进度更新"）',
                    list: '- 甲\\n- 乙（无序）｜1. 第一步\\n2. 第二步（有序）',
                    emphasis: '**粗体** *斜体* ~~删除线~~ `代码`',
                    link: '[文字](https://example.com)（只认 http/https）',
                    quote: '> 引用',
                    hr: '---'
                },
                html: 'h1~h6 / ul / ol / li / blockquote / a[href] / pre / hr / br 会被转成同样的样式；<br> 会变成换行',
                tips: '写 \\n 或真正的换行都行；纯文本不受影响，不会被误渲染'
            },
            taskExample: {
                content: '## 季度总结\n- 完成 A 模块\n- 待办 B 模块\n\n**重点**：本周五前必须收尾',
                priority: 'high',
                type: 'short',
                project: '官网改版',
                remindAt: '2026-09-28 18:00',
                comments: ['由 AI 生成，支持 **粗体** 和 [链接](https://example.com)'],
                images: [{ url: 'https://example.com/a.png' }, { data: 'data:image/png;base64,iVBOR...' }]
            }
        }),

        'GET /api/tasks': async (req, url) => handleTasksGet(url),

        'GET /api/timer': async () => ({ ok: true, timer: hooks.timer.status() }),

        'POST /api/timer': async (req, url, body) => {
            const action = String(body.action || body.op || '').toLowerCase();
            switch (action) {
                case 'start': hooks.timer.start(); break;
                case 'pause':
                case 'stop': hooks.timer.pause(); break;
                case 'toggle': hooks.timer.toggle(); break;
                case 'reset': hooks.timer.reset(); break;
                case 'mode':
                case 'switch': hooks.timer.switchMode(); break;
                case 'set': {
                    const minutes = parseInt(body.minutes !== undefined ? body.minutes : 25, 10);
                    const seconds = parseInt(body.seconds !== undefined ? body.seconds : 0, 10);
                    hooks.timer.setTime(minutes, seconds);
                    break;
                }
                default:
                    return { ok: false, error: '未知动作：' + action + '（可选 start/pause/toggle/reset/mode/set）' };
            }
            return { ok: true, timer: hooks.timer.status() };
        },

        'GET /api/clipboard/image': async () => {
            const img = clipboard.readImage();
            if (!img || img.isEmpty()) {
                return { ok: false, error: '剪贴板里没有图片' };
            }
            return { ok: true, dataUrl: img.toDataURL(), size: img.getSize() };
        },

        'POST /api/clipboard/image': async (req, url, body) => {
            const fileUrl = await hooks.saveImage(body);
            if (!fileUrl) return { ok: false, error: '没有可用的图片数据（需要 data / url / path 之一）' };
            const buffer = await hooks.readImageFile(fileUrl);
            if (!buffer) return { ok: false, error: '图片读取失败' };
            const image = nativeImage.createFromBuffer(buffer);
            if (image.isEmpty()) return { ok: false, error: '图片解析失败' };
            clipboard.writeImage(image);
            return { ok: true, written: true, fileUrl: fileUrl, size: image.getSize() };
        },

        'GET /api/settings': async (req, url) => {
            const key = url.searchParams.get('key');
            if (key) return { ok: true, key: key, value: hooks.getSetting(key) };
            return { ok: true, settings: hooks.getAllSettings() };
        },

        'POST /api/settings': async (req, url, body) => {
            if (body && typeof body === 'object' && body.settings && typeof body.settings === 'object') {
                const keys = Object.keys(body.settings);
                for (const k of keys) hooks.setSetting(k, String(body.settings[k]));
                return { ok: true, updated: keys };
            }
            if (!body || body.key === undefined) return { ok: false, error: '缺少 key' };
            hooks.setSetting(String(body.key), String(body.value));
            return { ok: true, key: String(body.key), value: String(body.value) };
        },

        'POST /api/notify': async (req, url, body) => {
            hooks.notify(String(body.title || '计时器'), String(body.body || body.text || ''));
            return { ok: true };
        },

        'POST /api/window': async (req, url, body) => {
            const action = String(body.action || '').toLowerCase();
            if (action === 'show') hooks.showWindow();
            else if (action === 'hide') hooks.hideWindow();
            else if (action === 'float') hooks.toggleFloat();
            else return { ok: false, error: '未知动作（show / hide / float）' };
            return { ok: true, floatWindowOpen: hooks.isFloatOpen() };
        },

        'GET /api/webhook': async () => {
            const info = hooks.webhook ? hooks.webhook.info() : null;
            return { ok: true, webhook: info };
        },

        // 【2026-11-12】任务表格视图（table.task-table）的列宽 / 行高存在渲染进程的 localStorage
        'GET /api/table-view': async () => {
            const r = await withTimeout(
                hooks.invokeRenderer('table-view', { action: 'info' }), REQUEST_TIMEOUT_MS, '读取表格视图布局');
            return Object.assign({ ok: true }, r || {});
        },

        'POST /api/table-view': async (req, url, body) => {
            const payload = Object.assign({}, body || {});
            const r = await withTimeout(
                hooks.invokeRenderer('table-view', payload), REQUEST_TIMEOUT_MS, '调整表格视图列宽');
            return Object.assign({ ok: true }, r || {});
        },

        /**
         * 【2026-09-30 增加】WebHook 一个端点干四件事，靠 action 区分：
         *   push   （默认）推送任务：{action:'created', ids:[...] | tasks:[...], force?}
         *   config 改配置：{action:'config', config:{ enabled/url/mode/events/mapping/constants/recordIds/schemaJson/parseSchemaOnly }}
         *   parse  只解析示例 JSON 不保存：{action:'parse', schemaJson}
         *   test   发一条测试记录：{action:'test'}
         * config / parse 是为了让 AI 与脚本能远程把映射配好（此前只能人点设置面板）。
         */
        'POST /api/webhook': async (req, url, body) => {
            if (!hooks.webhook) return { ok: false, error: 'WebHook 未启用' };
            const action = String((body && body.action) || 'created').toLowerCase();
            const b = body || {};

            if (action === 'config' || action === 'set' || action === 'update') {
                const patch = b.config || b.patch || b.data;
                if (!patch || typeof patch !== 'object') {
                    return { ok: false, error: '缺少 config（要改的配置片段）' };
                }
                hooks.webhook.setConfig(patch);
                return { ok: true, action: 'config', webhook: hooks.webhook.info() };
            }

            if (action === 'parse') {
                const text = String(b.schemaJson || b.schema || '');
                if (!text.trim()) return { ok: false, error: '缺少 schemaJson（示例 JSON 原文）' };
                const fields = hooks.webhook.parse(text);
                if (!fields.length) return { ok: false, error: '没解析出字段，确认粘的是示例 JSON' };
                return { ok: true, action: 'parse', count: fields.length, fields: fields };
            }

            if (action === 'test') {
                const result = await hooks.webhook.test();
                return { ok: !!result.ok, action: 'test', result: result };
            }

            // 指定 id 时先查任务，否则直接推送 body 里带的 tasks
            let tasks = b.tasks || [];
            if (b.ids && Array.isArray(b.ids) && b.ids.length) {
                for (const id of b.ids) {
                    const t = await hooks.invokeRenderer('get', { id: parseInt(id, 10) });
                    if (t) tasks.push(t);
                }
            }
            if (!tasks.length) return { ok: false, error: '没有可推送的任务（给 tasks 或 ids）' };
            await hooks.webhook.push(action, tasks, b.force ? { force: true } : undefined);
            const info = hooks.webhook.info();
            const last = info.history && info.history[0];
            return {
                ok: !last || !!last.ok,
                action: action,
                count: tasks.length,
                result: last || null
            };
        }
    };

    async function dispatch(req, res, url, body) {
        const pathname = url.pathname.replace(/\/+$/, '') || '/';
        const method = req.method.toUpperCase();

        // 新增任务需要读 body，单独走一条分支
        if (method === 'POST' && pathname === '/api/tasks') {
            return sendJson(res, await handleTasksPost(body));
        }

        // /api/tasks/:id 及其子路径
        const taskMatch = pathname.match(/^\/api\/tasks\/(\d+)(?:\/(comments|table))?$/);
        if (taskMatch) {
            const id = parseInt(taskMatch[1], 10);
            const sub = taskMatch[2];
            if (method === 'GET' && !sub) {
                const r = await withTimeout(hooks.invokeRenderer('get', { id }), REQUEST_TIMEOUT_MS, '查询任务');
                return sendJson(res, r ? { ok: true, task: r } : { ok: false, error: '任务不存在' }, r ? 200 : 404);
            }
            if (method === 'PATCH' || method === 'PUT') return sendJson(res, await handleTaskPatch(id, body));
            if (method === 'DELETE') {
                const result = await withTimeout(hooks.invokeRenderer('remove', { id }), REQUEST_TIMEOUT_MS, '删除任务');
                return sendJson(res, Object.assign({ ok: true, id: id }, result || {}));
            }
            if (method === 'POST' && sub === 'comments') {
                const text = String((body && body.text) || '');
                if (!text) return sendJson(res, { ok: false, error: '缺少 text' });
                const note = await withTimeout(
                    hooks.invokeRenderer('comment', { id, text }), REQUEST_TIMEOUT_MS, '添加评论');
                return sendJson(res, { ok: true, task: note });
            }
            /*
             * 【2026-11-12】表格尺寸：GET 读 / POST 改。
             * body = { action:'set'|'auto', index:0, width:'900'|'80%',
             *          cols:'120,240,*', rows:[{row:2,height:60}], tables:[…] }
             * 真正干活的是渲染进程（那边有 DOM，且改动直接落进 note.content 的保存链路）。
             */
            if (sub === 'table') {
                // 路径里的 id 是准的，body 里再带 id 也不许覆盖
                const payload = Object.assign({}, body && typeof body === 'object' ? body : {}, { id: id });
                if (method === 'GET') payload.action = payload.action || 'info';
                const r = await withTimeout(
                    hooks.invokeRenderer('table', payload), REQUEST_TIMEOUT_MS, '调整表格尺寸');
                return sendJson(res, Object.assign({ ok: true }, r || {}));
            }
        }

        const key = method + ' ' + pathname;
        const handler = routes[key];
        if (!handler) {
            return sendJson(res, { ok: false, error: '接口不存在：' + key, tip: 'GET /api/schema 查看全部接口' }, 404);
        }
        return sendJson(res, await handler(req, url, body));
    }

    const server_handler = (req, res) => {
        let url;
        try {
            url = new URL(req.url, 'http://127.0.0.1');
        } catch (e) {
            return sendJson(res, { ok: false, error: 'URL 解析失败' }, 400);
        }

        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,X-Api-Token,Authorization'
            });
            return res.end();
        }

        if (tokenRequired() && !checkAuth(req, url)) {
            return sendJson(res, { ok: false, error: '令牌无效（X-Api-Token）' }, 401);
        }

        readBody(req).then(body => {
            // 业务异常统一兜底为 500，避免请求挂住不返回
            return dispatch(req, res, url, body).catch(e => {
                console.error('[api] 处理请求失败：', e);
                sendJson(res, { ok: false, error: e.message || String(e) }, 500);
            });
        }).catch(e => {
            sendJson(res, { ok: false, error: e.message }, 400);
        });
    };

    function start() {
        if (server) return Promise.resolve(info());
        server = http.createServer(server_handler);
        return new Promise(resolve => {
            server.on('error', err => {
                listening = false;
                console.error('[api] 启动失败：', err.message);
                resolve(info(err.message));
            });
            server.listen(config.port, config.allowLAN ? '0.0.0.0' : '127.0.0.1', () => {
                listening = true;
                console.log('[api] 已启动：' + baseUrl() + '/api/health');
                resolve(info());
            });
        });
    }

    function stop() {
        return new Promise(resolve => {
            if (!server) return resolve(info());
            try {
                // 先断开 keep-alive 连接，否则 close() 会一直等，端口也就迟迟不释放
                if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
                server.close(() => {
                    server = null;
                    listening = false;
                    resolve(info());
                });
            } catch (e) {
                server = null;
                listening = false;
                resolve(info());
            }
        });
    }

    function info(error) {
        return {
            enabled: !!config.enabled,
            running: listening,
            port: config.port,
            token: config.token,
            requireToken: !!config.requireToken,
            allowLAN: !!config.allowLAN,
            tokenRequired: tokenRequired(),
            url: baseUrl(),
            error: error || null
        };
    }

    /** 应用配置（会按需重启监听） */
    async function applyConfig(next) {
        if (!next || typeof next !== 'object') return info();
        const prev = Object.assign({}, config);
        Object.assign(config, next);
        if (config.allowLAN) config.requireToken = true;
        const needRestart = listening &&
            (prev.port !== config.port || prev.allowLAN !== config.allowLAN);
        const shouldRun = !!config.enabled;

        if (shouldRun && !listening) await start();
        else if (shouldRun && needRestart) { await stop(); await start(); }
        else if (!shouldRun && listening) await stop();
        return info();
    }

    return {
        start,
        stop,
        applyConfig,
        info,
        getConfig: () => Object.assign({}, config)
    };
}

module.exports = { createApiServer, DEFAULT_PORT, escapeHtml, textToHtml, parsePriority, parseType, parseRemindAt };
