'use strict';

/**
 * webhook.js —— 把任务变化推送到外部表格
 *
 * 主要目标：企业微信「智能表格」的 Webhook（接收外部数据）
 *   POST https://qyapi.weixin.qq.com/cgi-bin/wedoc/smartsheet/webhook?key=XXXX
 *   body: { "add_records": [ { "values": { "fABCD1": "文本值" } } ] }
 *         { "update_records": [ { "record_id": "REC_xxx", "values": { ... } } ] }
 *
 * 三个关键约定（踩过的坑，别改）：
 *   ① values 的 key 必须是表格里真实的「字段 ID」（形如 fABCD1），不是列名；
 *   ② 载荷必须是 add_records / update_records 结构，否则直接 40058 invalid Request Parameter；
 *   ③ 字段值要按列类型给：日期给毫秒时间戳字符串、单选给 [{text}]、图片给纯 base64 数组。
 *
 * 另外兼容几种通用模式（records / flat / text / custom），方便推给自建服务或群机器人。
 * 本文件不依赖 Electron，可直接在 node --test 下跑（见 tests/webhook.test.js）。
 */

const DEFAULT_WEBHOOK_CONFIG = {
    enabled: false,
    url: '',
    /**
     * wecom   —— 企业微信智能表格（默认，使用 add_records / update_records）
     * records —— 通用 { action, records: [ {...} ] }
     * flat    —— 通用 { action, 列名: 值 }
     * text    —— 企业微信群机器人 { msgtype: 'text', text: { content } }
     * custom  —— 自定义 JSON 模板
     */
    mode: 'wecom',
    events: {
        created: true,
        completed: true,
        updated: false,
        deleted: false,
        archived: false
    },
    template: '',
    /** 用户从「接收外部数据」页面粘贴的示例 JSON，用于解析出字段 ID 与列类型 */
    schemaJson: '',
    /** 解析结果：[{ id, name, type, enum? }]；enum = 单/多选列的预设选项，写入前会自动对齐（见 coerceSelectText） */
    schemaFields: [],
    /** 字段 ID → 内部数据来源：{ 'fABCD1': 'content' } */
    mapping: {},
    /**
     * 字段 ID → 固定文本：mapping 选 'const' 时写入该列。
     * 例如「所属项目」= 拯救小猫、「所属部门」= 研发部 —— 内部数据源里没有的常量靠它补。
     */
    constants: {},
    /** 任务 id → 表格 record_id（用于把「完成/修改」变成更新而不是新增） */
    recordIds: {},
    /** 通用模式下的列名映射 */
    fields: {
        '任务内容': 'content',
        '优先级': 'priority',
        '状态': 'status',
        '类型': 'type',
        '创建时间': 'createdAt',
        '完成时间': 'doneAt',
        '提醒时间': 'remindAt',
        '评论': 'comments',
        '图片数': 'imageCount',
        '图片地址': 'images',
        '任务ID': 'id'
    }
};

/** 展示用：只留 webhook key 的前 8 位，避免整串密钥被截图/接口带出去 */
function maskWebhookUrl(url) {
    const s = String(url || '');
    const i = s.indexOf('key=');
    if (i === -1) return s;
    const key = s.slice(i + 4);
    return s.slice(0, i + 4) + (key.length > 8 ? key.slice(0, 8) + '…（共 ' + key.length + ' 位）' : key);
}

const EVENT_LABELS = {
    created: '新增任务',
    completed: '完成任务',
    updated: '修改任务',
    deleted: '删除任务',
    archived: '归档任务'
};

/** 可映射的内部数据源：给设置面板下拉框用 */
const SOURCES = [
    { key: '', label: '（不写入）' },
    { key: 'content', label: '任务内容' },
    { key: 'priority', label: '优先级' },
    { key: 'status', label: '状态' },
    { key: 'done', label: '是否完成（复选框）' },
    { key: 'type', label: '类型' },
    { key: 'createdAt', label: '创建时间' },
    { key: 'doneAt', label: '完成时间' },
    { key: 'remindAt', label: '提醒时间' },
    { key: 'comments', label: '评论' },
    { key: 'const', label: '固定文本（右侧填写内容）' },
    { key: 'commentCount', label: '评论数' },
    { key: 'imageCount', label: '图片数' },
    { key: 'image', label: '图片（base64）' },
    { key: 'images', label: '图片地址（文本）' },
    { key: 'id', label: '任务 ID' },
    { key: 'event', label: '事件类型' }
];

const MAX_BATCH = 500;

function pad2(n) {
    return String(n).padStart(2, '0');
}

function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function plainText(html) {
    return String(html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function imageUrls(html) {
    const out = [];
    const re = /<img\b[^>]*?src\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(String(html || ''))) !== null) out.push(m[1]);
    return out;
}

function priorityLabel(p) {
    const n = Number(p) || 1;
    return n >= 3 ? '高' : (n === 2 ? '中' : '低');
}

/** 把一条内部任务整理成一组「数据源 → 值」，供字段映射取值 */
function taskFields(task) {
    const content = task.content || '';
    const imgs = imageUrls(content);
    const comments = Array.isArray(task.comments) ? task.comments : [];
    const ts = task.ts || (typeof task.id === 'number' ? task.id : 0);
    return {
        id: task.id === undefined ? '' : String(task.id),
        content: plainText(content),
        priority: priorityLabel(task.p),
        priorityRaw: Number(task.p) || 1,
        status: task.done ? '已完成' : '未完成',
        done: !!task.done,
        type: task.type === 'long' ? '长期' : '短期',
        createdAt: formatTime(ts),
        createdAtTs: ts,
        doneAt: formatTime(task.doneTime),
        doneAtTs: task.doneTime || 0,
        remindAt: formatTime(task.remindAt || task.remind_at),
        remindAtTs: task.remindAt || task.remind_at || 0,
        comments: comments.map(c => (c && c.text) || '').join('\n'),
        commentCount: comments.length,
        imageCount: imgs.length,
        images: imgs.join(','),
        imageUrl: imgs[0] || '',
        event: ''
    };
}

/** 快照指纹：内容/完成状态/提醒/评论任一变化都算更新 */
function fingerprint(task) {
    const f = taskFields(task);
    return [f.content, f.status, f.priorityRaw, f.type, f.remindAt, f.commentCount, f.imageCount].join(' ');
}

/** 取单选/多选列的预设选项：可能是 ['A','B']，也可能是 [{ text: 'A' }] */
function pickOptions(node, optionKeys) {
    for (const k of optionKeys) {
        const v = node[k];
        if (!Array.isArray(v) || !v.length) continue;
        const out = v.map(item => {
            if (typeof item === 'string') return item.trim();
            if (item && typeof item === 'object') {
                return String(item.text || item.name || item.title || item.label || item.value || '').trim();
            }
            return '';
        }).filter(Boolean);
        if (out.length) return out;
    }
    return [];
}

/**
 * 把内部文本对齐到表格单/多选列的预设选项。
 *
 * 为什么需要它：应用内部的「优先级」只有 高/中/低，「状态」只有 已完成/未完成，
 * 而表格里的枚举常常是 最高优/高优/低优、已完成/进行中/未启动/已逾期 ——
 * 直接写进去会被企业微信以 2023010（选项值不合法）拒收**整批**。
 * 所以这里做一次「就近对齐」：完全一致 > 包含关系 > 关键词规则；
 * 实在对不上返回空串，调用方会跳过该列（宁可少写一列，也不要整批失败）。
 */
function coerceSelectText(raw, options) {
    const text = String(raw === undefined || raw === null ? '' : raw).trim();
    if (!text) return '';
    const list = (Array.isArray(options) ? options : []).map(o => String(o).trim()).filter(Boolean);
    if (!list.length) return text;                       // 没解析到选项：保持原样，交服务端判断
    if (list.indexOf(text) !== -1) return text;          // 完全一致

    // ① 选项包含内部值：「高」→「高优」（多个命中时取最短的，避免误选「最高优」）
    const contains = list.filter(o => o.indexOf(text) !== -1);
    if (contains.length) return contains.slice().sort((a, b) => a.length - b.length)[0];

    // ② 内部值包含选项：「最高优」→「高优」（取最长的，信息量最大）
    const reversed = list.filter(o => text.indexOf(o) !== -1);
    if (reversed.length) return reversed.slice().sort((a, b) => b.length - a.length)[0];

    // ③ 关键词规则：完成状态
    const stateRules = [
        [/^(已完成|完成|done)$/i, ['已完成', '完成', '已结束']],
        [/^(未完成|未完|进行中|doing)$/i, ['进行中', '未启动', '未完成', '进行']],
        [/^(未启动|未开始|todo)$/i, ['未启动', '未开始', '进行中']],
        [/^(已逾期|逾期|超期)$/i, ['已逾期', '已超期']]
    ];
    for (const [re, prefer] of stateRules) {
        if (re.test(text)) {
            for (const p of prefer) if (list.indexOf(p) !== -1) return p;
        }
    }

    // ④ 关键词规则：优先级
    const priorityRules = [
        [/最高|紧急|urgent/i, ['最高优', '高优', '紧急']],
        [/高|high/i, ['高优', '最高优', '高']],
        [/中|medium|normal/i, ['中优', '中', '一般']],
        [/低|low/i, ['低优', '低', '不紧急']]
    ];
    for (const [re, prefer] of priorityRules) {
        if (re.test(text)) {
            for (const p of prefer) if (list.indexOf(p) !== -1) return p;
        }
    }
    return '';
}

/**
 * 从用户粘贴的示例 JSON 里挖出字段定义。
 *
 * 结构在不同页面版本里叫法不一，所以做「宽容解析」，两种形态都要认：
 *   ① 数组 + 字段自带 id：  schema: [ { field_id: 'fA1', field_name: '任务内容', field_type: 'text' } ]
 *   ② 对象 map（**企业微信现行示例 JSON 就是这种**）：
 *        schema: { fqmfGP: { title: '任务名称', type: 'text' },
 *                  f04uVx: { title: '优先级', type: 'single_select', enum: ['最高优','高优','低优'] } }
 *      —— 这里字段 ID 是**对象的 key**，定义里只有 title/type。
 *      【2026-09-30 修复】此前只认形态 ①，用户按文档粘形态 ② 会解析出 0 个字段。
 */
function parseSchema(input) {
    let json = input;
    if (typeof input === 'string') {
        if (!input.trim()) return [];
        try {
            json = JSON.parse(input);
        } catch (e) {
            return [];
        }
    }
    const found = [];
    const seen = new Set();
    const idKeys = ['field_id', 'fieldId', 'id', 'key', 'field_key'];
    const nameKeys = ['field_name', 'fieldName', 'name', 'title', 'label', 'column_name'];
    const typeKeys = ['field_type', 'fieldType', 'type', 'value_type', 'valueType'];
    // 单/多选列的预设选项：不同版本叫法不一，全捞一遍（对齐枚举时要用）
    const optionKeys = ['enum', 'options', 'choices', 'items', 'option_list', 'optionList'];

    const pick = (obj, keys) => {
        for (const k of keys) {
            if (typeof obj[k] === 'string' && obj[k]) return obj[k];
        }
        return '';
    };

    /** 字段 ID 长得像 f 开头的一串（fqmfGP / f8o4LT / f04uVx…），用于形态 ② 的 key 判定 */
    const looksLikeFieldId = k => /^f[a-z0-9_-]{3,}$/i.test(String(k || ''));

    /** keyHint：对象形态下把父级 key 传下来当候选字段 ID（企微示例 JSON 的字段 ID 就是 key） */
    const walk = (node, keyHint) => {
        if (!node) return;
        if (Array.isArray(node)) {
            node.forEach(item => walk(item, keyHint));
            return;
        }
        if (typeof node !== 'object') return;

        const id = pick(node, idKeys) || (looksLikeFieldId(keyHint) ? String(keyHint) : '');
        const name = pick(node, nameKeys);
        if (id && name && !seen.has(id)) {
            seen.add(id);
            const field = { id: id, name: name, type: pick(node, typeKeys) || 'text' };
            const options = pickOptions(node, optionKeys);
            if (options.length) field.enum = options;
            found.push(field);
        }
        for (const k of Object.keys(node)) walk(node[k], k);
    };
    walk(json, '');
    return found;
}

/**
 * 按列名猜一个默认映射，省得用户一个个手动选。
 *
 * 【2026-09-30 修复】规则顺序必须「具体在前、笼统在后」：
 * 旧顺序把「内容/任务/标题」放在最前，导致「任务状态」「任务描述（含状态）」这类列
 * 被 content 抢走（实测 任务状态 → content）。现在把 图片数/图片/优先级/状态/类型/
 * 时间/评论/ID 等具体规则全部前置，content 只做最后的兜底。
 */
function guessSource(fieldName) {
    const n = String(fieldName || '');
    if (/图片数|附件数|图片数量/.test(n)) return 'imageCount';
    if (/评论数/.test(n)) return 'commentCount';
    if (/图片|截图|photo|image/i.test(n)) return 'image';
    if (/优先级|重要程度|紧急/.test(n)) return 'priority';
    // 复选框列（是否完成 / 已完成 / done）比「状态」文本列更常见，放前面判
    if (/是否完成|是否已|已完成|done/i.test(n)) return 'done';
    if (/状态|完成情况|进度状态|status/i.test(n)) return 'status';
    if (/类型|分类|category/i.test(n)) return 'type';
    if (/完成时间|结束时间|完成于|归档时间/.test(n)) return 'doneAt';
    if (/创建|提交|建立|登记|启动时间|开始时间/.test(n)) return 'createdAt';
    if (/提醒|截止|到期|due|deadline/i.test(n)) return 'remindAt';
    if (/评论|备注|说明|详情/.test(n)) return 'comments';
    if (/ID|编号|序号/i.test(n)) return 'id';
    // 兜底：名字里带「内容/标题/任务/待办/事项/描述」的当任务内容
    if (/内容|标题|任务|待办|事项|描述|name|title|content|task/i.test(n)) return 'content';
    return '';
}

/** 列类型 → 目标值形态 */
function isDateType(type) {
    const t = String(type || '').toLowerCase();
    return t.indexOf('date') !== -1 || t.indexOf('time') !== -1;
}
function isSelectType(type) {
    const t = String(type || '').toLowerCase();
    return t.indexOf('select') !== -1 || t.indexOf('option') !== -1 || t === 'radio' || t === 'checkboxs';
}
function isNumberType(type) {
    const t = String(type || '').toLowerCase();
    return t === 'number' || t === 'progress' || t === 'percent' || t === 'currency' || t === 'rating';
}
function isCheckboxType(type) {
    return String(type || '').toLowerCase() === 'checkbox';
}
function isImageType(type) {
    const t = String(type || '').toLowerCase();
    return t.indexOf('image') !== -1 || t.indexOf('attachment') !== -1;
}

function createWebhook(options) {
    const opts = options || {};
    const getConfig = opts.getConfig || (() => DEFAULT_WEBHOOK_CONFIG);
    const saveConfig = opts.saveConfig || (() => {});
    const notify = opts.notify || (() => {});
    const loadImage = opts.loadImage || (() => null);   // (fileUrl) => base64 字符串
    const historyLimit = opts.historyLimit || 30;

    const history = [];
    let queue = Promise.resolve();
    let snapshot = null;         // Map<id, fingerprint>
    let snapshotDone = null;     // Map<id, boolean>
    let snapshotArchived = null; // Set<id>

    function config() {
        const c = getConfig() || {};
        return {
            enabled: !!c.enabled,
            url: c.url || '',
            mode: c.mode || DEFAULT_WEBHOOK_CONFIG.mode,
            events: Object.assign({}, DEFAULT_WEBHOOK_CONFIG.events, c.events || {}),
            template: c.template || '',
            schemaJson: c.schemaJson || '',
            schemaFields: Array.isArray(c.schemaFields) ? c.schemaFields : [],
            mapping: Object.assign({}, c.mapping || {}),
            constants: Object.assign({}, c.constants || {}),
            recordIds: Object.assign({}, c.recordIds || {}),
            fields: Object.assign({}, DEFAULT_WEBHOOK_CONFIG.fields, c.fields || {})
        };
    }

    function pushHistory(entry) {
        history.unshift(entry);
        if (history.length > historyLimit) history.length = historyLimit;
        try {
            notify(entry);
        } catch (e) { /* 界面通知失败不影响推送 */ }
        return entry;
    }

    // ---------- 通用模式的映射（按列名） ----------

    function mapRecord(task, action) {
        const f = taskFields(task);
        f.event = EVENT_LABELS[action] || action;
        f.action = action;
        const fields = config().fields;
        const row = {};
        for (const column of Object.keys(fields)) {
            const key = fields[column];
            row[column] = f[key] === undefined ? '' : f[key];
        }
        return row;
    }

    // ---------- 智能表格模式的映射（按字段 ID + 字段类型） ----------

    function sourceValue(source, task, action) {
        const f = taskFields(task);
        switch (source) {
            case 'content': return f.content;
            case 'priority': return f.priority;
            case 'status': return f.status;
            case 'done': return f.done;
            case 'type': return f.type;
            case 'createdAt': return f.createdAtTs;
            case 'createdAtText': return f.createdAt;
            case 'doneAt': return f.doneAtTs;
            case 'doneAtText': return f.doneAt;
            case 'remindAt': return f.remindAtTs;
            case 'remindAtText': return f.remindAt;
            case 'comments': return f.comments;
            case 'commentCount': return f.commentCount;
            case 'imageCount': return f.imageCount;
            case 'images': return f.images;
            case 'image': return f.imageUrl;
            case 'id': return f.id;
            case 'event': return EVENT_LABELS[action] || action;
            default: return undefined;
        }
    }

    /**
     * 「固定文本」列（mapping = 'const'）：把配置里写死的文本按列类型包装成企业微信要的形态。
     * 用于内部数据源没有的常量列，例如 所属项目 = 拯救小猫、所属部门 = 研发部。
     */
    function constValue(field, text) {
        const t = String(text === undefined || text === null ? '' : text).trim();
        if (!t) return undefined;
        const type = field.type;
        if (isSelectType(type)) {
            const aligned = (Array.isArray(field.enum) && field.enum.length) ? coerceSelectText(t, field.enum) : t;
            if (!aligned) return undefined;
            return [{ text: aligned }];
        }
        if (isCheckboxType(type)) return t === 'true' || t === '1';
        if (isDateType(type)) {
            const ts = Number(t);
            return ts ? String(ts) : undefined;
        }
        if (isNumberType(type)) {
            const n = Number(t);
            return isNaN(n) ? undefined : n;
        }
        return t;
    }

    /** 按列类型把数据源的值整理成企业微信要的形态 */
    function toWecomValue(source, field, task, action) {
        const raw = sourceValue(source, task, action);
        if (raw === undefined || raw === null || raw === '') return undefined;
        const type = field.type;

        if (isImageType(type)) {
            if (!raw) return undefined;
            const base64 = loadImage(raw);
            if (!base64) return undefined;
            const name = String(raw).split('/').pop().split('?')[0] || 'image.png';
            // 企业微信要求纯 base64，不能带 data:image/...;base64, 前缀
            return [{ title: name, image_base64: String(base64).replace(/^data:image\/\w+;base64,/, '') }];
        }
        if (isCheckboxType(type)) {
            if (source === 'done') return !!raw;
            return String(raw) === 'true' || raw === true;
        }
        if (isDateType(type)) {
            const ts = typeof raw === 'number' ? raw : (source.endsWith('Text') ? 0 : Number(raw) || 0);
            if (ts) return String(ts);
            // 【2026-09-30 修复】没有这个时间（如任务没设截止/完成时间）时必须跳过该列：
            // 旧实现会掉进下面的文本解析分支，把 0 解析成 2000-01-01 写进表格。
            if (typeof raw === 'number' || /^\s*-?\d+\s*$/.test(String(raw))) return undefined;
            // 数据源是文本，但目标列是日期：尝试把 "2026-09-28 18:00" 解析回去
            const parsed = Date.parse(String(raw).replace(' ', 'T'));
            if (isNaN(parsed)) return undefined;
            return String(parsed);
        }
        if (isSelectType(type)) {
            // 【2026-09-30】有预设选项时先做枚举对齐（避免 2023010 选项不合法把整批拒掉）；
            // 对不上就返回 undefined = 跳过这一列，宁可少写一列也别整批失败。
            let text = String(raw).slice(0, 100);
            if (Array.isArray(field.enum) && field.enum.length) {
                text = coerceSelectText(text, field.enum);
                if (!text) return undefined;
            }
            return [{ text: text }];
        }
        if (isNumberType(type)) {
            const n = Number(raw);
            if (isNaN(n)) return undefined;
            // 进度类列要 0-100 的整数
            if (String(type).toLowerCase() === 'progress' || String(type).toLowerCase() === 'percent') {
                return Math.round(n * 100);
            }
            return n;
        }
        return String(raw);
    }

    function buildWecomRecords(action, tasks, cfg) {
        const add = [];
        const update = [];
        for (const task of tasks) {
            const values = {};
            for (const field of cfg.schemaFields) {
                const source = cfg.mapping[field.id];
                if (!source) continue;
                let v;
                try {
                    v = source === 'const'
                        ? constValue(field, (cfg.constants || {})[field.id])
                        : toWecomValue(source, field, task, action);
                } catch (e) {
                    v = undefined;
                }
                if (v !== undefined) values[field.id] = v;
            }
            if (!Object.keys(values).length) continue;
            const recordId = cfg.recordIds[String(task.id)];
            // 只有「新增」才强制插入；其余事件如果之前存过 record_id 就走更新
            if (recordId && action !== 'created') update.push({ record_id: recordId, values: values });
            else add.push({ values: values });
        }
        const payload = {};
        if (add.length) payload.add_records = add;
        if (update.length) payload.update_records = update;
        return payload;
    }

    /** 组装最终请求体（任务可能被分批，这里返回一批） */
    function buildPayload(action, tasks, batch) {
        const cfg = config();
        const list = batch || tasks || [];

        if (cfg.mode === 'wecom') {
            return buildWecomRecords(action, list, cfg);
        }

        const rows = list.map(t => mapRecord(t, action));
        const base = {
            action: action,
            event: EVENT_LABELS[action] || action,
            timestamp: Date.now(),
            time: formatTime(Date.now()),
            count: rows.length
        };

        if (cfg.mode === 'flat') return Object.assign({}, base, rows[0] || {});
        if (cfg.mode === 'text') {
            const lines = rows.map(r => Object.keys(r).map(k => `${k}：${r[k]}`).join('\n'));
            return { msgtype: 'text', text: { content: `[${EVENT_LABELS[action] || action}]\n` + lines.join('\n\n') } };
        }
        if (cfg.mode === 'custom') {
            const tpl = cfg.template || '{}';
            const first = rows[0] || {};
            let out = tpl;
            for (const k of Object.keys(first)) {
                const escaped = JSON.stringify(String(first[k] === undefined ? '' : first[k])).slice(1, -1);
                out = out.split('{{' + k + '}}').join(escaped);
            }
            out = out.split('{{json}}').join(JSON.stringify(base))
                     .split('{{records}}').join(JSON.stringify(rows))
                     .split('{{action}}').join(action)
                     .split('{{time}}').join(formatTime(Date.now()));
            try {
                return JSON.parse(out);
            } catch (e) {
                return { action: action, event: EVENT_LABELS[action] || action, text: out };
            }
        }
        return Object.assign({}, base, { records: rows });
    }

    function splitBatches(tasks) {
        const out = [];
        for (let i = 0; i < tasks.length; i += MAX_BATCH) out.push(tasks.slice(i, i + MAX_BATCH));
        return out.length ? out : [[]];
    }

    /** 从响应里挖出 record_id，用于后续更新同一条记录 */
    function extractRecordIds(response) {
        const ids = [];
        const walk = node => {
            if (!node) return;
            if (typeof node === 'string') {
                if (/^REC[_-]/i.test(node)) ids.push(node);
                return;
            }
            if (Array.isArray(node)) {
                node.forEach(walk);
                return;
            }
            if (typeof node === 'object') {
                for (const k of Object.keys(node)) {
                    if (/record_?ids?$/i.test(k)) {
                        const v = node[k];
                        if (Array.isArray(v)) v.forEach(x => { if (typeof x === 'string') ids.push(x); });
                        else if (typeof v === 'string') ids.push(v);
                    } else {
                        walk(node[k]);
                    }
                }
            }
        };
        walk(response);
        return ids;
    }

    /** 真正发一次请求；网络类失败按 1s / 3s 退避重试，共 3 次 */
    async function post(payload, url) {
        let lastErr = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000);
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                const text = await res.text();
                clearTimeout(timer);
                let json = null;
                try {
                    json = JSON.parse(text);
                } catch (e) { /* 非 JSON 响应（比如网关 HTML） */ }
                // 企业微信用 HTTP 200 + errcode 表示业务失败
                const errcode = json && typeof json.errcode === 'number' ? json.errcode : 0;
                const ok = res.ok && errcode === 0;
                return {
                    ok: ok,
                    status: res.status,
                    errcode: errcode,
                    body: text.slice(0, 500),
                    json: json
                };
            } catch (e) {
                clearTimeout(timer);
                lastErr = e;
                if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
            }
        }
        return { ok: false, status: 0, errcode: 0, body: (lastErr && lastErr.message) || '请求失败', json: null };
    }

    /** 串行发送，避免并发把表格顺序打乱 */
    function enqueue(action, tasks, opts2) {
        const options2 = opts2 || {};
        queue = queue.then(async () => {
            const c = config();
            const list = tasks || [];
            if (!c.enabled && !options2.force) {
                return pushHistory({
                    time: Date.now(), action: action, ok: false, status: 0,
                    error: 'WebHook 未启用', count: list.length
                });
            }
            if (!c.url) {
                return pushHistory({
                    time: Date.now(), action: action, ok: false, status: 0,
                    error: '未填写 WebHook 地址', count: list.length
                });
            }
            if (c.mode === 'wecom' && list.length && !c.schemaFields.length) {
                return pushHistory({
                    time: Date.now(), action: action, ok: false, status: 0,
                    error: '还没解析表格字段：请把「接收外部数据」页面的示例 JSON 粘到设置里',
                    count: list.length
                });
            }

            const batches = c.mode === 'wecom' ? splitBatches(list) : [list];
            let lastResult = null;
            for (const batch of batches) {
                const payload = buildPayload(action, list, batch);
                if (c.mode === 'wecom' && !Object.keys(payload).length) {
                    lastResult = { ok: false, status: 0, body: '这一批没有可写入的字段（检查字段映射）', json: null };
                    break;
                }
                lastResult = await post(payload, c.url);
                pushHistory({
                    time: Date.now(),
                    action: action,
                    ok: !!lastResult.ok,
                    status: lastResult.status,
                    errcode: lastResult.errcode,
                    error: lastResult.ok ? '' : (lastResult.json && lastResult.json.errmsg) || lastResult.body,
                    count: batch.length,
                    preview: JSON.stringify(payload).slice(0, 300)
                });
                if (!lastResult.ok) break;

                // 记下 record_id，下次「完成 / 修改」就能改成同一条记录
                if (c.mode === 'wecom' && payload.add_records) {
                    const ids = extractRecordIds(lastResult.json);
                    if (ids.length) {
                        const next = config();
                        ids.forEach((rid, i) => {
                            const task = batch[i];
                            if (task && task.id !== undefined) next.recordIds[String(task.id)] = rid;
                        });
                        // 只保留最近 500 条，避免配置无限膨胀
                        const keys = Object.keys(next.recordIds);
                        if (keys.length > 500) {
                            for (const k of keys.slice(0, keys.length - 500)) delete next.recordIds[k];
                        }
                        delete next.schemaJson;
                        delete next.schemaFields;
                        delete next.mapping;
                        saveConfig(Object.assign({}, getConfig(), { recordIds: next.recordIds }));
                    }
                }
            }
            return lastResult;
        }).catch(e => pushHistory({
            time: Date.now(), action: action, ok: false, status: 0,
            error: e.message || String(e), count: (tasks || []).length
        }));
        return queue;
    }

    /** 主动推送：右键「推送到表格」、API 调用都走这里，忽略事件订阅开关 */
    function push(action, tasks, opts2) {
        const list = (Array.isArray(tasks) ? tasks : [tasks]).filter(Boolean);
        if (!list.length) return Promise.resolve(null);
        return enqueue(action, list, opts2);
    }

    /**
     * 差分推送：和上一轮快照比对，得出 created / completed / updated / archived / deleted。
     * 第一次调用只建快照、不推送（否则一启动就会把历史任务全推一遍）。
     */
    function diffAndEmit(activeNotes, archivedNotes) {
        const active = Array.isArray(activeNotes) ? activeNotes : [];
        const archived = Array.isArray(archivedNotes) ? archivedNotes : [];
        const c = config();
        const all = active.concat(archived);

        const nowMap = new Map();
        const doneMap = new Map();
        const archivedSet = new Set();
        for (const t of all) {
            if (!t || t.id === undefined) continue;
            nowMap.set(t.id, fingerprint(t));
            doneMap.set(t.id, !!t.done);
        }
        for (const t of archived) {
            if (t && t.id !== undefined) archivedSet.add(t.id);
        }

        if (snapshot === null) {
            snapshot = nowMap;
            snapshotDone = doneMap;
            snapshotArchived = archivedSet;
            return [];
        }

        const created = [];
        const completed = [];
        const updated = [];
        const archivedList = [];
        const deletedIds = [];

        for (const t of all) {
            if (!t || t.id === undefined) continue;
            const prev = snapshot.get(t.id);
            const wasDone = snapshotDone.get(t.id);
            if (prev === undefined) {
                if (archived.indexOf(t) !== -1) archivedList.push(t);
                else created.push(t);
            } else if (prev !== nowMap.get(t.id)) {
                if (!wasDone && t.done) completed.push(t);
                else updated.push(t);
            } else if (archived.indexOf(t) !== -1 && !snapshotArchived.has(t.id)) {
                archivedList.push(t);
            }
        }
        for (const id of snapshot.keys()) {
            if (!nowMap.has(id)) deletedIds.push(id);
        }

        snapshot = nowMap;
        snapshotDone = doneMap;
        snapshotArchived = archivedSet;

        const emitted = [];
        if (c.events.created && created.length) { enqueue('created', created); emitted.push('created'); }
        if (c.events.completed && completed.length) { enqueue('completed', completed); emitted.push('completed'); }
        if (c.events.updated && updated.length) { enqueue('updated', updated); emitted.push('updated'); }
        if (c.events.archived && archivedList.length) { enqueue('archived', archivedList); emitted.push('archived'); }
        if (c.events.deleted && deletedIds.length) {
            enqueue('deleted', deletedIds.map(id => ({ id: id, content: '（已删除）', ts: typeof id === 'number' ? id : Date.now() })));
            emitted.push('deleted');
        }
        return emitted;
    }

    /** 测试发送：不管启用开关，发一条样例，返回服务端响应 */
    function test() {
        const c = config();
        if (!c.url) return Promise.resolve({ ok: false, status: 0, body: '未填写 WebHook 地址', payload: null });
        const sample = {
            id: 0,
            content: '这是一条来自「专注计时器」的测试任务',
            p: 3,
            type: 'short',
            done: false,
            ts: Date.now(),
            remindAt: Date.now() + 3600 * 1000,
            comments: [{ text: 'WebHook 连通性测试', time: Date.now() }]
        };
        const payload = buildPayload('created', [sample]);
        if (c.mode === 'wecom' && !Object.keys(payload).length) {
            return Promise.resolve({
                ok: false, status: 0,
                body: '还没有字段映射：请先粘贴示例 JSON，并给列指定数据来源',
                payload: payload
            });
        }
        return post(payload, c.url).then(res => Object.assign({}, res, { payload: payload }));
    }

    /**
     * 配置快照（给 API / 设置面板读）。
     * url 会打码（只留 key 前 8 位）—— 它是这张表的写入密钥，不能被截图带走。
     */
    function info() {
        const c = config();
        return {
            enabled: c.enabled,
            url: maskWebhookUrl(c.url),
            hasUrl: !!c.url,
            mode: c.mode,
            events: Object.assign({}, c.events),
            schemaFieldCount: c.schemaFields.length,
            schemaFields: c.schemaFields.map(f => Object.assign({}, f)),
            mapping: Object.assign({}, c.mapping),
            constants: Object.assign({}, c.constants),
            recordCount: Object.keys(c.recordIds).length,
            sources: SOURCES,
            history: history.slice()
        };
    }

    /** 更新配置片段（由设置面板调用） */
    function updateConfig(patch) {
        const current = getConfig() || {};
        const next = Object.assign({}, current);
        if (patch && typeof patch === 'object') {
            if (typeof patch.enabled === 'boolean') next.enabled = patch.enabled;
            if (typeof patch.url === 'string') next.url = patch.url.trim();
            if (typeof patch.mode === 'string') next.mode = patch.mode;
            if (typeof patch.template === 'string') next.template = patch.template;
            if (patch.events && typeof patch.events === 'object') {
                next.events = Object.assign({}, DEFAULT_WEBHOOK_CONFIG.events, current.events, patch.events);
            }
            if (patch.fields && typeof patch.fields === 'object') next.fields = patch.fields;
            if (typeof patch.schemaJson === 'string') {
                const incoming = patch.schemaJson.trim();
                // 重新解析 + 自动猜测映射（用户手改过的映射会被覆盖，所以只在初次或明确重解析时用）
                const fields = parseSchema(incoming);
                next.schemaJson = incoming;
                if (fields.length) {
                    next.schemaFields = fields;
                    const mapping = {};
                    for (const f of fields) mapping[f.id] = guessSource(f.name);
                    next.mapping = mapping;
                }
            }
            // 允许调用方直接给字段定义（脚本 / API 里更省事）
            if (Array.isArray(patch.schemaFields)) {
                next.schemaFields = patch.schemaFields
                    .map(f => {
                        const field = {
                            id: String((f && (f.id || f.field_id || f.fieldId)) || ''),
                            name: String((f && (f.name || f.field_name || f.fieldName)) || ''),
                            type: String((f && (f.type || f.field_type || f.fieldType)) || 'text')
                        };
                        // 选项列表：可以给 enum，也可以给 options / choices（与示例 JSON 里的叫法对齐）
                        const options = pickOptions(f || {}, optionKeys);
                        if (options.length) field.enum = options;
                        return field;
                    })
                    .filter(f => f.id);
            }
            if (patch.parseSchemaOnly) {
                const fields = parseSchema(patch.parseSchemaOnly);
                if (fields.length) {
                    next.schemaFields = fields;
                    const mapping = {};
                    for (const f of fields) mapping[f.id] = guessSource(f.name);
                    next.mapping = mapping;
                    next.schemaJson = patch.parseSchemaOnly;
                }
            }
            // 手改的映射优先级最高，必须放在自动猜测之后
            if (patch.mapping && typeof patch.mapping === 'object') {
                next.mapping = Object.assign({}, next.mapping || {}, patch.mapping);
            }
            // 固定文本列（例如 所属项目=拯救小猫）：只做合并，不动已有键
            if (patch.constants && typeof patch.constants === 'object') {
                next.constants = Object.assign({}, next.constants || {}, patch.constants);
            }
            // record_id 缓存：允许外部（脚本/API）回填，保证「完成/修改」走更新而不是重复新增
            if (patch.recordIds && typeof patch.recordIds === 'object') {
                next.recordIds = Object.assign({}, next.recordIds || {}, patch.recordIds);
            }
        }
        saveConfig(next);
        return next;
    }

    return {
        DEFAULT_WEBHOOK_CONFIG: DEFAULT_WEBHOOK_CONFIG,
        EVENT_LABELS: EVENT_LABELS,
        SOURCES: SOURCES,
        config: config,
        info: info,
        updateConfig: updateConfig,
        parseSchema: parseSchema,
        coerceSelectText: coerceSelectText,
        push: push,
        diffAndEmit: diffAndEmit,
        test: test,
        history: () => history.slice(),
        buildPayload: buildPayload,
        splitBatches: splitBatches,
        resetSnapshot: () => { snapshot = null; snapshotDone = null; snapshotArchived = null; }
    };
}

module.exports = {
    createWebhook,
    DEFAULT_WEBHOOK_CONFIG,
    EVENT_LABELS,
    SOURCES,
    parseSchema,
    guessSource,
    pickOptions,
    coerceSelectText,
    maskWebhookUrl,
    taskFields,
    fingerprint,
    formatTime
};
