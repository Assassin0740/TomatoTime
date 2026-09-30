#!/usr/bin/env node
'use strict';
/**
 * 专注计时器 CLI（timer-cli.js）
 * ================================
 * 让 AI / 脚本用一条命令直接操控「专注计时器」，类似 Unity 的命令行工具。
 * 零第三方依赖，通过本机 HTTP API 与应用通信（Node 18+ 自带 fetch）。
 *
 * 用法示例：
 *   node timer-cli.js status
 *   node timer-cli.js add "写周报" -p high --remind "2026-09-29 18:00"
 *   node timer-cli.js list --keyword 周报
 *   node timer-cli.js done 1759000000000
 *   node timer-cli.js timer start
 *
 * 端口与令牌自动从 %APPDATA%\计时器\main-settings.json（或 timer-app）读取，
 * 也可用 --port / --token 或环境变量 TIMER_API_PORT / TIMER_API_TOKEN 覆盖。
 * 所有命令加 --json 输出原始 JSON。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// ---------------------------------------------------------------- 配置发现

function findConfigFile() {
    const candidates = [];
    if (process.env.TIMER_CLI_CONFIG) candidates.push(process.env.TIMER_CLI_CONFIG);
    const appdata = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    candidates.push(path.join(appdata, '计时器', 'main-settings.json'));
    candidates.push(path.join(appdata, 'timer-app', 'main-settings.json'));
    const found = candidates.filter(c => fs.existsSync(c));
    if (!found.length) return null;
    return found.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
}

let cfgCache = null;
function loadConfig(args) {
    if (!cfgCache) {
        const file = findConfigFile();
        if (!file) {
            fail('找不到配置文件 main-settings.json。\n' +
                '请先启动「专注计时器」应用至少一次；或用环境变量 TIMER_CLI_CONFIG 指定配置路径。');
        }
        try {
            cfgCache = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (e) {
            fail('读取配置失败：' + e.message);
        }
        cfgCache.__path = file;
    }
    const api = cfgCache.api || {};
    const port = (args && args.port) || Number(process.env.TIMER_API_PORT) || Number(api.port) || 17890;
    const token = (args && args.token) || process.env.TIMER_API_TOKEN || api.token || '';
    const requireToken = api.requireToken !== false;
    return { port, token, requireToken, file: cfgCache.__path };
}

// ---------------------------------------------------------------- 输出

function fail(msg, code = 1) {
    process.stderr.write('[x] ' + msg + '\n');
    process.exit(code);
}

function stripHtml(html) {
    return String(html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .trim();
}

function fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return String(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function priorityLabel(p) {
    const n = Number(p) || 1;
    return n >= 3 ? '高' : (n === 2 ? '中' : '低');
}

function mmss(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const p = n => String(n).padStart(2, '0');
    return p(Math.floor(sec / 60)) + ':' + p(sec % 60);
}

function printTask(t, prefix = '') {
    const done = t.done ? '[x]' : '[ ]';
    const remind = (t.remindAt || t.remind_at) ? '  ⏰' + fmtTime(t.remindAt || t.remind_at) : '';
    const comments = t.comments || [];
    const extra = comments.length ? `  💬${comments.length}` : '';
    let content = stripHtml(t.content).replace(/\n/g, ' / ');
    if (content.length > 80) content = content.slice(0, 80) + '…';
    console.log(`${prefix}${done} #${t.id} [${priorityLabel(t.p)}|${t.type === 'long' ? '长期' : '短期'}] ${content}${remind}${extra}`);
}

// ---------------------------------------------------------------- HTTP

async function call(args, method, apiPath, body, timeout = 30000) {
    const { port, token, requireToken, file } = loadConfig(args);
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (token && requireToken) headers['X-Api-Token'] = token;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    let payload;
    try {
        const res = await fetch('http://127.0.0.1:' + port + apiPath, {
            method: method,
            headers: headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: controller.signal
        });
        payload = await res.json().catch(() => ({ ok: false, error: 'HTTP ' + res.status }));
    } catch (e) {
        fail(`连不上 API（127.0.0.1:${port}）：${e.message}\n\n` +
            '排查步骤：\n' +
            '  1. 「专注计时器」应用是否在运行（托盘里有图标）？\n' +
            '  2. 设置面板 →「AI 接入 · 系统集成」→「AI 接口」是否已开启？\n' +
            '  3. 端口是否和配置一致（' + file + '）？');
    } finally {
        clearTimeout(timer);
    }
    if (args && args.json) {
        console.log(JSON.stringify(payload, null, 2));
        process.exit(payload.ok ? 0 : 1);
    }
    return payload;
}

function needOk(data, what) {
    if (!data || !data.ok) fail((what || '操作') + '失败：' + ((data && data.error) || JSON.stringify(data)));
    return data;
}

// ---------------------------------------------------------------- 参数工具

function parsePriority(v) {
    const table = {
        high: 'high', h: 'high', '紧急': 'high', '高': 'high', '3': 'high',
        medium: 'medium', m: 'medium', mid: 'medium', '中': 'medium', '中等': 'medium', '2': 'medium',
        low: 'low', l: 'low', '低': 'low', '不紧急': 'low', '1': 'low'
    };
    const key = String(v || '').trim().toLowerCase();
    if (!(key in table)) fail('优先级必须是 high / medium / low（或 紧急/中/低、1-3），收到：' + v);
    return table[key];
}

function parseRemind(v) {
    if (v === undefined) return undefined;
    const s = String(v).trim();
    if (!s) return '';                      // 空串 = 清除提醒
    if (/^\d+$/.test(s)) {
        const n = Number(s);
        return n > 1e12 ? n : n * 1000;
    }
    const now = new Date();
    const formats = [
        { re: /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2})$/, f: (m) => new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) },
        { re: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, f: (m) => new Date(+m[1], m[2] - 1, +m[3], 9, 0) },
        { re: /^(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2})$/, f: (m) => new Date(now.getFullYear(), m[1] - 1, +m[2], +m[3], +m[4]) },
        { re: /^(\d{1,2}):(\d{1,2})$/, f: (m) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), +m[1], +m[2]) }
    ];
    for (const { re, f } of formats) {
        const m = s.match(re);
        if (m) return f(m).getTime();
    }
    const parsed = Date.parse(s);           // ISO 等标准格式兜底
    if (!isNaN(parsed)) return parsed;
    fail('提醒时间格式看不懂：' + s + '（示例：2026-09-29 18:00 / 09-29 18:00 / 18:00）');
}

function splitIds(v) {
    return String(v).split(/[,，]/).map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
}

function imageSpecs(list) {
    return (list || []).map(i => fs.existsSync(i) ? { path: path.resolve(i) } : { url: i });
}

/** 读示例 JSON：优先 --schema-json，其次 --schema-file（返回空串表示没给） */
function schemaText(args) {
    if (args['schema-json']) return args['schema-json'];
    if (args['schema-file']) return fs.readFileSync(args['schema-file'], 'utf8');
    return '';
}

/** 把 ['fA=content', 'fB=priority'] 解析成对象；格式不对直接报错 */
function kvPairs(list, what) {
    if (!list || !list.length) return null;
    const out = {};
    list.forEach(item => {
        const i = String(item).indexOf('=');
        if (i === -1) fail(what + ' 的格式应为 字段ID=值，收到：' + item);
        out[String(item).slice(0, i).trim()] = String(item).slice(i + 1).trim();
    });
    return out;
}

// ---------------------------------------------------------------- 子命令

const commands = {
    async status(args) {
        const data = needOk(await call(args, 'GET', '/api/health'), '状态查询');
        const t = data.timer || {};
        const sec = Number(t.currentTime) || 0;
        console.log('应用在线  版本 ' + (data.version || '?'));
        console.log('计时器：%s · %s · 剩余 %s',
            t.isRunning ? '运行中' : '已暂停',
            t.isWorking ? '工作时间' : '休息时间',
            mmss(sec));
        console.log('悬浮窗：%s', data.floatWindowOpen ? '开' : '关');
        const { port } = loadConfig(args);
        console.log('API  ：http://127.0.0.1:%d（令牌%s）', port, data.tokenRequired ? '必需' : '关闭');
    },

    async add(args) {
        const body = { content: args.content, priority: parsePriority(args.priority), type: args.type };
        const remind = parseRemind(args.remind);
        if (remind !== undefined) body.remindAt = remind;
        if (args.comment) body.comments = String(args.comment).split(/[|；;]/).filter(Boolean);
        if (args.image) body.images = imageSpecs(args.image);
        if (args.base64) body.images = (body.images || []).concat([{ data: args.base64 }]);
        if (args.top) body.top = true;
        const data = needOk(await call(args, 'POST', '/api/tasks', body), '添加任务');
        console.log('已添加：');
        (data.created || []).forEach(t => printTask(t, '  '));
        console.log('共 %d 条', data.count || 0);
    },

    async list(args) {
        let q = '/api/tasks?scope=' + (args.scope || 'active');
        if (args.keyword) q += '&keyword=' + encodeURIComponent(args.keyword);
        if (args.limit) q += '&limit=' + args.limit;
        const data = needOk(await call(args, 'GET', q), '读取任务');
        (data.tasks || []).forEach(t => printTask(t));
        console.log('共 %d 条（%s）', (data.tasks || []).length, args.scope || 'active');
    },

    async get(args) {
        const data = needOk(await call(args, 'GET', '/api/tasks/' + args.id), '查询任务');
        const t = data.task || {};
        printTask(t);
        (t.comments || []).forEach(c => {
            const text = stripHtml(typeof c === 'object' ? c.text : c).replace(/\n/g, ' / ');
            console.log('   · ' + text);
        });
        const imgs = [...String(t.content || '').matchAll(/<img[^>]*?src=["']([^"']+)["']/gi)];
        if (imgs.length) {
            console.log('  图片：%d 张', imgs.length);
            imgs.forEach(m => console.log('   · ' + m[1]));
        }
    },

    async update(args) {
        const body = {};
        if (args.content !== undefined) body.content = args.content;
        if (args.append !== undefined) body.appendText = args.append;
        if (args.priority !== undefined) body.priority = parsePriority(args.priority);
        if (args.type !== undefined) body.type = args.type;
        if (args.remind !== undefined) body.remindAt = parseRemind(args.remind);
        if (args.image) body.images = imageSpecs(args.image);
        if (!Object.keys(body).length) {
            fail('没有要修改的内容（用 --content / --append / --priority / --type / --remind / --image）');
        }
        const data = needOk(await call(args, 'PATCH', '/api/tasks/' + args.id, body), '修改任务');
        console.log('已更新：');
        printTask(data.task || {}, '  ');
    },

    async done(args) {
        for (const id of splitIds(args.ids)) {
            const data = needOk(await call(args, 'PATCH', '/api/tasks/' + id, { done: !args.undone }), '完成任务');
            console.log('%s #%s', args.undone ? '已标记未完成' : '已完成', (data.task || {}).id || id);
        }
    },

    async delete(args) {
        for (const id of splitIds(args.ids)) {
            needOk(await call(args, 'DELETE', '/api/tasks/' + id), '删除任务');
            console.log('已删除 #' + id);
        }
    },

    async comment(args) {
        const data = needOk(await call(args, 'POST', `/api/tasks/${args.id}/comments`, { text: args.text }), '添加评论');
        console.log('已评论 #%s，现有 %d 条评论', args.id, ((data.task || {}).comments || []).length);
    },

    async timer(args) {
        const body = args.action === 'set'
            ? { action: 'set', minutes: args.minutes || 0, seconds: args.seconds || 0 }
            : { action: args.action };
        const data = needOk(await call(args, 'POST', '/api/timer', body), '计时器操作');
        const t = data.timer || {};
        console.log('计时器：%s · %s · %s',
            t.isRunning ? '运行中' : '已暂停',
            t.isWorking ? '工作时间' : '休息时间',
            mmss(t.currentTime));
    },

    async notify(args) {
        needOk(await call(args, 'POST', '/api/notify', { title: args.title, body: args.body || '' }), '发送通知');
        console.log('已发送系统通知');
    },

    async window(args) {
        needOk(await call(args, 'POST', '/api/window', { action: args.action }), '窗口操作');
        console.log('已执行窗口操作：%s', args.action);
    },

    async clipboard(args) {
        if (args.action === 'get') {
            const data = needOk(await call(args, 'GET', '/api/clipboard/image'), '读取剪贴板');
            const size = data.size || {};
            console.log('剪贴板里有图片：%dx%d', size.width || 0, size.height || 0);
            if (args.save) {
                const b64 = String(data.dataUrl || '').split(',')[1] || '';
                fs.writeFileSync(args.save, Buffer.from(b64, 'base64'));
                console.log('已保存到 ' + path.resolve(args.save));
            }
        } else {
            let body;
            if (args.path) body = { path: path.resolve(args.path) };
            else if (args.url) body = { url: args.url };
            else fail('需要 --path 图片路径 或 --url 图片链接');
            needOk(await call(args, 'POST', '/api/clipboard/image', body), '写入剪贴板');
            console.log('图片已写入系统剪贴板（可直接到微信里 Ctrl+V）');
        }
    },

    async webhook(args) {
        const action = args.action || 'info';
        const flag = name => args[name];
        if (action === 'info' || action === 'config') {
            const data = needOk(await call(args, 'GET', '/api/webhook'), '读取 WebHook');
            const w = data.webhook || {};
            if (args.json) { console.log(JSON.stringify(w, null, 2)); return; }
            console.log('WebHook：%s · 模式 %s', w.enabled ? '启用' : '关闭', w.mode);
            console.log('地址：%s', w.url || '(未填写)');
            Object.entries(w.events || {}).forEach(([e, on]) => console.log('  事件 ' + String(e).padEnd(10) + (on ? '✓' : '✗')));
            const fields = w.schemaFields || [];
            const mapping = w.mapping || {};
            const constants = w.constants || {};
            console.log('字段：%d 列 · 已映射 %d 列 · record_id 缓存 %d 条', fields.length, Object.keys(mapping).length, w.recordCount || 0);
            fields.forEach(f => {
                let src = mapping[f.id] || '（不写入）';
                let extra = src === 'const' ? ' = ' + (constants[f.id] || '') : '';
                if (Array.isArray(f.enum) && f.enum.length) extra += '  [选项: ' + f.enum.join('/') + ']';
                console.log('  %s %s → %s%s', String(f.id).padEnd(10), String(f.name || '').padEnd(16), src, extra);
            });
            const hist = w.history || [];
            console.log('最近 %d 条推送：', Math.min(hist.length, 5));
            hist.slice(0, 5).forEach(h => {
                console.log('  %s %s %s', h.ok ? '✓' : '✗', h.action, h.ok ? '' : (h.error || h.status));
            });
            return;
        }
        if (action === 'test') {
            const data = needOk(await call(args, 'POST', '/api/webhook', { action: 'test' }), '发送测试');
            const result = data.result || {};
            if (args.json) { console.log(JSON.stringify(result, null, 2)); return; }
            if (data.ok) console.log('测试推送成功 ✓（表格里应出现一条测试记录）');
            else {
                console.log('测试推送失败：%s', result.error || result.body || result.status || '未知原因');
                if (result.payload) console.log('载荷预览：%s', JSON.stringify(result.payload).slice(0, 400));
            }
            return;
        }
        if (action === 'parse') {
            const text = schemaText(args);
            if (!text) fail('用 --schema-file 或 --schema-json 提供「接收外部数据」页面的示例 JSON');
            const data = needOk(await call(args, 'POST', '/api/webhook', { action: 'parse', schemaJson: text }), '解析示例 JSON');
            const fields = data.fields || [];
            if (args.json) { console.log(JSON.stringify(fields, null, 2)); return; }
            console.log('解析到 %d 列：', fields.length);
            fields.forEach(f => {
                const enumText = (f.enum && f.enum.length) ? ('  选项: ' + f.enum.join('/')) : '';
                console.log('  %s %s %s%s', String(f.id).padEnd(10), String(f.name || '').padEnd(16), String(f.type || '').padEnd(14), enumText);
            });
            return;
        }
        if (action === 'set') {
            const patch = {};
            if (flag('enable')) patch.enabled = true;
            if (flag('disable')) patch.enabled = false;
            if (args.url) patch.url = args.url;
            const text = schemaText(args);
            if (text) patch.schemaJson = text;
            if (args['json-file']) Object.assign(patch, JSON.parse(fs.readFileSync(args['json-file'], 'utf8')));
            const map = kvPairs(args.map, '--map');
            if (map) patch.mapping = map;
            const constants = kvPairs(args.const, '--const');
            if (constants) patch.constants = constants;
            if (args['record-ids-file']) {
                const raw = JSON.parse(fs.readFileSync(args['record-ids-file'], 'utf8'));
                const ids = {};
                if (Array.isArray(raw)) {
                    raw.forEach(item => { if (item && item.taskId !== undefined) ids[String(item.taskId)] = String(item.recordId || ''); });
                } else {
                    Object.keys(raw || {}).forEach(k => { ids[String(k)] = String(raw[k]); });
                }
                Object.keys(ids).forEach(k => { if (!ids[k]) delete ids[k]; });
                if (Object.keys(ids).length) patch.recordIds = ids;
            }
            if (!Object.keys(patch).length) {
                fail('没有要改的内容（--enable/--disable/--url/--schema-file/--map/--const/--json-file/--record-ids-file）');
            }
            const data = needOk(await call(args, 'POST', '/api/webhook', { action: 'config', config: patch }), '更新 WebHook 配置');
            const w = data.webhook || {};
            if (args.json) { console.log(JSON.stringify(w, null, 2)); return; }
            console.log('已更新：%s · 字段 %d 列 · 映射 %d 列 · 固定文本 %d 项 · record_id %d 条',
                w.enabled ? '启用' : '关闭', (w.schemaFields || []).length,
                Object.keys(w.mapping || {}).length, Object.keys(w.constants || {}).length, w.recordCount || 0);
            return;
        }
        // 默认：push
        const body = { action: args.event || 'created' };
        if (flag('force')) body.force = true;
        if (args.ids) body.ids = splitIds(args.ids);
        else if (args.all) {
            const listing = needOk(await call(args, 'GET', '/api/tasks?scope=active'), '读取任务');
            body.ids = (listing.tasks || []).map(t => t.id);
        } else fail('用 --ids 1,2 指定任务，或 --all 推送全部活跃任务');
        const data = needOk(await call(args, 'POST', '/api/webhook', body), '推送到表格');
        const result = data.result || {};
        if (data.ok) console.log('已推送 %d 条到表格 ✓', data.count || 0);
        else console.log('推送失败（%d 条）：%s', data.count || 0, result.error || result.status || '未知原因');
    },

    async settings(args) {
        if (args.key === undefined) {
            const data = needOk(await call(args, 'GET', '/api/settings'), '读取设置');
            console.log(JSON.stringify(data.settings || {}, null, 2));
        } else if (args.value === undefined) {
            const data = needOk(await call(args, 'GET', '/api/settings?key=' + encodeURIComponent(args.key)), '读取设置');
            console.log('%s = %s', args.key, data.value);
        } else {
            needOk(await call(args, 'POST', '/api/settings', { key: args.key, value: args.value }), '写入设置');
            console.log('%s = %s 已保存', args.key, args.value);
        }
    },

    async schema(args) {
        const data = needOk(await call(args, 'GET', '/api/schema'), '读取接口说明');
        console.log('基地址：http://127.0.0.1:%d', loadConfig(args).port);
        (data.endpoints || []).forEach(e => {
            console.log('  ' + String(e.method).padEnd(6) + String(e.path).padEnd(32) + e.desc);
        });
    }
};

// ---------------------------------------------------------------- 参数解析（手写，避免依赖）

const HELP = `专注计时器命令行工具（供 AI / 脚本直接操控）

用法：node timer-cli.js [全局选项] <命令> [参数]

全局选项：
  --port <n>     API 端口（默认读配置文件）
  --token <t>    API 令牌（默认读配置文件）
  --json         输出原始 JSON（给程序处理用）

命令：
  status                          查看应用与计时器状态
  add <内容> [-p high|medium|low] [-t short|long] [--remind 时间]
      [--image 路径或链接]... [--base64 dataURL] [--comment 文本] [--top]
                                  添加任务
  list [--scope active|archive|all] [--keyword 词] [--limit n]
                                  列出任务
  get <id>                        查看单条详情（含评论与图片）
  update <id> [--content 文本] [--append 文本] [-p 级别] [-t 类型]
         [--remind 时间] [--image 路径或链接]...
                                  修改任务
  done <ids> [--undone]           完成 / 取消完成（ids 逗号分隔）
  delete <ids>                    删除任务
  comment <id> <文本>             给任务加评论
  timer <start|pause|toggle|reset|mode|set> [-m 分钟] [-s 秒]
                                  控制计时器
  notify <标题> [内容]            弹系统通知
  window <show|hide|float>        主窗口 / 悬浮窗
  clipboard <get|set> [--path 路径 | --url 链接] [--save 路径]
                                  读写剪贴板图片（微信互通）
  webhook <info|push|config|set|parse|test>
                                  info/config 看配置；push 推送（--event 事件 --ids 1,2|--all [--force]）
                                  set 改配置（--enable|--disable --url 地址 --schema-file 示例JSON
                                      --map 字段ID=来源 --const 字段ID=固定文本
                                      --record-ids-file 回填.json --json-file 配置片段.json）
                                  parse 只解析示例 JSON（--schema-file / --schema-json）
                                  test 发一条测试记录到表格
  settings [key] [value]          读写应用设置
  schema                          打印 HTTP API 自描述

提醒时间格式：2026-09-29 18:00 / 09-29 18:00 / 18:00（今天）
示例：
  node timer-cli.js add "写周报" -p high --remind "2026-09-29 18:00"
  node timer-cli.js list --keyword 周报
  node timer-cli.js timer start
`;

function parseArgs(argv) {
    const args = { _: [] };
    const optionSingles = new Set(['--port', '--token', '--keyword', '--limit', '--scope', '--remind',
        '--content', '--append', '--priority', '--image', '--base64', '--comment',
        '--minutes', '-m', '--seconds', '-s', '--title', '--path', '--url', '--save',
        '--event', '--ids', '-p', '-t',
        // 【2026-09-30】webhook 配置相关
        '--schema-json', '--schema-file', '--json-file', '--record-ids-file']);
    // 可重复的选项：--map fA=content --map fB=priority / --const fA=拯救小猫
    const optionRepeats = new Set(['--image', '--map', '--const']);
    const optionFlags = new Set(['--json', '--undone', '--top', '--all', '--enable', '--disable', '--force']);
    const aliases = { '-p': 'priority', '-t': 'type', '-m': 'minutes', '-s': 'seconds' };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (optionFlags.has(a)) {
            args[a.slice(2)] = true;
        } else if (optionSingles.has(a) || optionRepeats.has(a)) {
            const value = argv[++i];
            if (value === undefined) fail('选项 ' + a + ' 缺少值');
            const key = aliases[a] || a.slice(2);
            if (optionRepeats.has(a)) {
                const list = args[key] = args[key] || [];
                list.push(value);
            } else {
                args[key] = value;
            }
        } else if (a === '--help' || a === '-h') {
            console.log(HELP);
            process.exit(0);
        } else if (!args.command) {
            args.command = a;
        } else {
            args._.push(a);
        }
    }
    return args;
}

async function main() {
    const argv = process.argv.slice(2);
    if (!argv.length) {
        console.log(HELP);
        return;
    }
    const args = parseArgs(argv);
    const fn = commands[args.command];
    if (!fn) fail('未知命令：' + args.command + '（node timer-cli.js 查看帮助）');
    // 把位置参数按命令映射成字段名
    const positional = {
        add: ['content'], get: ['id'], update: ['id'], done: ['ids'], delete: ['ids'],
        comment: ['id', 'text'], timer: ['action'], notify: ['title', 'body'],
        window: ['action'], clipboard: ['action'], webhook: ['action'], settings: ['key', 'value']
    };
    const names = positional[args.command] || [];
    names.forEach((name, i) => {
        if (args._[i] !== undefined && args[name] === undefined) args[name] = args._[i];
    });
    ['id', 'minutes', 'seconds', 'limit'].forEach(k => {
        if (args[k] !== undefined && typeof args[k] === 'string' && /^\d+$/.test(args[k])) args[k] = Number(args[k]);
    });
    await fn(args);
}

main().catch(e => fail(e && e.message));
