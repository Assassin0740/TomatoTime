'use strict';

/**
 * api-server.js 接口测试（对应 `项目文档/09` P2-4 第二步 + M15）
 *
 * 运行方式（在项目根目录）：
 *   node --test tests/
 *
 * api-server.js 顶部 require('electron') 取 clipboard / nativeImage，
 * 纯 Node 环境下用 Module._load 打桩替换掉，服务本身不依赖真实 Electron。
 * 任务数据用内存数组代替渲染进程，验证路由、鉴权与任务注入链路。
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const Module = require('module');

// ---------- electron 桩 ----------
const originalLoad = Module._load;
Module._load = function (request) {
    if (request === 'electron') {
        return {
            clipboard: {
                readImage: () => ({ isEmpty: () => true, toDataURL: () => '', getSize: () => ({ width: 0, height: 0 }) }),
                availableFormats: () => [],
                writeImage: () => {}
            },
            nativeImage: {
                createFromBuffer: () => ({ isEmpty: () => true, getSize: () => ({ width: 0, height: 0 }), toPNG: () => Buffer.from('') })
            }
        };
    }
    return originalLoad.apply(this, arguments);
};

const { createApiServer } = require('../api-server.js');

const PORT = 17895;
const TOKEN = 'test-token';

function request(method, urlPath, body, headers) {
    return new Promise((resolve, reject) => {
        const data = body === undefined ? null : JSON.stringify(body);
        const opts = {
            host: '127.0.0.1',
            port: PORT,
            path: encodeURI(urlPath),
            method: method,
            // 每个用例都会重启服务，必须关掉连接池，否则会复用已被销毁的 socket
            agent: false,
            headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {})
        };
        if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
        const r = http.request(opts, res => {
            let out = '';
            res.on('data', c => { out += c; });
            res.on('end', () => resolve({
                status: res.statusCode,
                json: (() => { try { return JSON.parse(out); } catch (e) { return null; } })()
            }));
        });
        r.on('error', reject);
        if (data) r.write(data);
        r.end();
    });
}

/** 起一个带内存任务库的服务，回调结束后自动停止 */
function withServer(fn) {
    return async () => {
        const notes = [];
        const archived = [];
        const api = createApiServer({
            version: () => '0.0.0-test',
            invokeRenderer: async (op, payload) => {
                if (op === 'list') return { notes: notes, archived: archived };
                if (op === 'get') return notes.find(n => n.id === payload.id) || null;
                if (op === 'add') {
                    const note = Object.assign({ id: Date.now(), ts: Date.now(), comments: [] }, payload.task);
                    notes.unshift(note);
                    return note;
                }
                if (op === 'update') {
                    const n = notes.find(x => x.id === payload.id);
                    if (!n) throw new Error('任务不存在');
                    Object.assign(n, payload.patch);
                    if (payload.patch.appendText) n.content += '<br>' + payload.patch.appendText;
                    return n;
                }
                if (op === 'remove') {
                    const i = notes.findIndex(x => x.id === payload.id);
                    if (i !== -1) notes.splice(i, 1);
                    return { id: payload.id, removed: i !== -1 };
                }
                if (op === 'comment') {
                    const n = notes.find(x => x.id === payload.id);
                    n.comments.push({ text: payload.text, time: Date.now() });
                    return n;
                }
                throw new Error('未知操作 ' + op);
            },
            timer: {
                status: () => ({ isRunning: false, isWorking: true, currentTime: 1500 }),
                start: () => {}, pause: () => {}, toggle: () => {}, reset: () => {},
                switchMode: () => {}, setTime: () => {}
            },
            saveImage: async input => {
                if (!input || (!input.data && !input.url && !input.path)) throw new Error('缺少图片数据');
                return 'file:///C:/fake/img.png';
            },
            readImageFile: async () => Buffer.from('x'),
            localizeHtml: async html => html,
            getSetting: () => 'v',
            setSetting: () => {},
            getAllSettings: () => ({ k: 'v' }),
            notify: () => {},
            showWindow: () => {}, hideWindow: () => {}, toggleFloat: () => {}, isFloatOpen: () => false
        });

        await api.applyConfig({ enabled: true, port: PORT, token: TOKEN, requireToken: true });
        try {
            await fn(api, notes);
        } finally {
            await api.stop();
        }
    };
}

const auth = { 'X-Api-Token': TOKEN };

test('未带令牌的请求被拒绝', withServer(async () => {
    const res = await request('GET', '/api/health');
    assert.strictEqual(res.status, 401);
}));

test('健康检查返回计时器状态', withServer(async () => {
    const res = await request('GET', '/api/health', undefined, auth);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.ok, true);
    assert.strictEqual(res.json.timer.currentTime, 1500);
}));

test('注入任务：优先级/类型/图片/提醒都被正确解析', withServer(async (api, notes) => {
    const res = await request('POST', '/api/tasks', {
        content: '写周报\n第二段',
        priority: 'high',
        type: 'long',
        remindAt: '2026-09-28 18:00',
        images: [{ data: 'data:image/png;base64,AAAA' }]
    }, auth);

    assert.strictEqual(res.json.ok, true);
    const note = notes[0];
    assert.strictEqual(note.p, 3);                      // high → 3
    assert.strictEqual(note.type, 'long');
    assert.ok(note.content.indexOf('<br>') !== -1);     // 换行被转成 <br>
    assert.ok(note.content.indexOf('<img src="file:///C:/fake/img.png"') !== -1);
    assert.strictEqual(typeof note.remindAt, 'number'); // 时间字符串被解析成时间戳
}));

test('批量注入：tasks 数组', withServer(async (api, notes) => {
    const res = await request('POST', '/api/tasks', {
        tasks: [{ content: '任务一' }, { content: '任务二', priority: 2 }]
    }, auth);
    assert.strictEqual(res.json.count, 2);
    assert.strictEqual(notes.length, 2);
}));

test('空内容被拒绝', withServer(async () => {
    const res = await request('POST', '/api/tasks', { content: '   ' }, auth);
    assert.strictEqual(res.json.ok, false);
}));

test('查询、修改、评论、删除一条龙', withServer(async () => {
    const added = await request('POST', '/api/tasks', { content: '待处理任务' }, auth);
    const id = added.json.created[0].id;

    const got = await request('GET', '/api/tasks/' + id, undefined, auth);
    assert.strictEqual(got.json.task.id, id);

    const patched = await request('PATCH', '/api/tasks/' + id, { done: true, p: 2 }, auth);
    assert.strictEqual(patched.json.task.done, true);
    assert.strictEqual(patched.json.task.p, 2);

    const commented = await request('POST', '/api/tasks/' + id + '/comments', { text: '来自 AI' }, auth);
    assert.strictEqual(commented.json.task.comments.length, 1);

    const removed = await request('DELETE', '/api/tasks/' + id, undefined, auth);
    assert.strictEqual(removed.json.removed, true);

    const gone = await request('GET', '/api/tasks/' + id, undefined, auth);
    assert.strictEqual(gone.json.ok, false);
}));

test('关键词搜索与 scope 过滤', withServer(async () => {
    await request('POST', '/api/tasks', { content: '买牛奶' }, auth);
    await request('POST', '/api/tasks', { content: '写周报' }, auth);

    const hit = await request('GET', '/api/tasks?keyword=周报', undefined, auth);
    assert.strictEqual(hit.json.count, 1);

    const all = await request('GET', '/api/tasks?scope=all', undefined, auth);
    assert.strictEqual(all.json.count, 2);
}));

test('计时器控制与接口自描述可用', withServer(async () => {
    const t = await request('POST', '/api/timer', { action: 'set', minutes: 5, seconds: 0 }, auth);
    assert.strictEqual(t.json.ok, true);

    const bad = await request('POST', '/api/timer', { action: 'nope' }, auth);
    assert.strictEqual(bad.json.ok, false);

    const schema = await request('GET', '/api/schema', undefined, auth);
    assert.ok(schema.json.endpoints.length > 5);
}));

test('未知接口返回 404 并提示查看 schema', withServer(async () => {
    const res = await request('GET', '/api/does-not-exist', undefined, auth);
    assert.strictEqual(res.status, 404);
    assert.ok(res.json.error.indexOf('接口不存在') !== -1);
}));
