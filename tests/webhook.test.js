'use strict';

/**
 * webhook.js 测试：载荷格式、字段映射、差分事件、错误处理
 * 运行：node --test tests/webhook.test.js
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

const { createWebhook, DEFAULT_WEBHOOK_CONFIG, parseSchema, guessSource } = require('../webhook.js');

/** 起一个临时接收端，返回收到的请求数组 */
function withReceiver(fn, responder) {
    return async () => {
        const received = [];
        const server = http.createServer((req, res) => {
            let body = '';
            req.on('data', c => { body += c; });
            req.on('end', () => {
                received.push({ method: req.method, body: body });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(responder ? responder(body) : { errcode: 0, errmsg: 'ok' }));
            });
        });
        await new Promise(r => server.listen(0, '127.0.0.1', r));
        const port = server.address().port;
        try {
            await fn('http://127.0.0.1:' + port + '/webhook?key=test', received);
        } finally {
            if (server.closeAllConnections) server.closeAllConnections();
            await new Promise(r => server.close(r));
        }
    };
}

const SAMPLE_SCHEMA = JSON.stringify({
    schema: [
        { field_id: 'fA1', field_name: '任务内容', field_type: 'text' },
        { field_id: 'fA2', field_name: '优先级', field_type: 'singleSelect' },
        { field_id: 'fA3', field_name: '是否完成', field_type: 'checkbox' },
        { field_id: 'fA4', field_name: '创建时间', field_type: 'dateTime' },
        { field_id: 'fA5', field_name: '图片', field_type: 'image' }
    ]
});

const sampleTask = {
    id: 1759000000000,
    content: '写周报<br>第二段 <img src="file:///C:/img/a.png">',
    p: 3,
    type: 'short',
    done: false,
    ts: 1759000000000,
    comments: [{ text: '来自 AI', time: 1759000000000 }]
};

function makeWebhook(overrides, hookOptions) {
    let cfg = Object.assign({}, DEFAULT_WEBHOOK_CONFIG, overrides || {});
    const wh = createWebhook(Object.assign({
        getConfig: () => cfg,
        saveConfig: next => { cfg = next; }
    }, hookOptions || {}));
    wh._cfg = () => cfg;
    return wh;
}

/** 只用于「按列名映射」的通用模式 */
function makeGenericWebhook(overrides, mode) {
    return makeWebhook(Object.assign({ enabled: true, mode: mode || 'records', url: '' }, overrides || {}));
}

// ---------------- 智能表格（wecom）载荷 ----------------

test('wecom 模式：add_records + 字段 ID + 按列类型格式化', () => {
    const wh = makeWebhook({ enabled: true, mode: 'wecom', schemaFields: parseSchema(SAMPLE_SCHEMA) });
    wh.updateConfig({ parseSchemaOnly: SAMPLE_SCHEMA, mapping: { fA1: 'content', fA2: 'priority', fA3: 'done', fA4: 'createdAt', fA5: 'image' } });

    const built = wh.buildPayload('created', [sampleTask]);
    assert.ok(Array.isArray(built.add_records), ' 必须是 add_records 结构（否则企业微信返回 40058）');
    const values = built.add_records[0].values;
    assert.strictEqual(values['fA1'], '写周报\n第二段');       // 文本
    assert.deepStrictEqual(values['fA2'], [{ text: '高' }]);   // 单选
    assert.strictEqual(values['fA3'], false);                 // 复选框
    assert.strictEqual(values['fA4'], String(sampleTask.ts)); // 日期 = 毫秒时间戳字符串
});

test('wecom 模式：图片列转纯 base64（去掉 dataURL 前缀）', () => {
    const wh = makeWebhook(
        { enabled: true, mode: 'wecom', schemaFields: parseSchema(SAMPLE_SCHEMA) },
        { loadImage: () => 'data:image/png;base64,AAAA' }
    );
    wh.updateConfig({ parseSchemaOnly: SAMPLE_SCHEMA, mapping: { fA5: 'image' } });
    const values = wh.buildPayload('created', [sampleTask]).add_records[0].values;
    assert.strictEqual(values['fA5'][0].image_base64, 'AAAA');
    assert.strictEqual(values['fA5'][0].title, 'a.png');
});

test('wecom 模式：有 record_id 时改用 update_records', () => {
    const wh = makeWebhook({
        enabled: true,
        mode: 'wecom',
        url: 'http://127.0.0.1:1/none',
        schemaFields: parseSchema(SAMPLE_SCHEMA),
        mapping: { fA1: 'content' },
        recordIds: { '1759000000000': 'REC_abc' }
    });
    const built = wh.buildPayload('completed', [sampleTask]);
    assert.ok(Array.isArray(built.update_records));
    assert.strictEqual(built.update_records[0].record_id, 'REC_abc');
    assert.strictEqual(built.add_records, undefined);
});

test('wecom 模式：示例 JSON 能解析出字段并自动猜测映射', () => {
    const fields = parseSchema(SAMPLE_SCHEMA);
    assert.strictEqual(fields.length, 5);
    assert.strictEqual(fields[0].id, 'fA1');
    assert.strictEqual(fields[3].type, 'dateTime');

    const wh = makeWebhook({ enabled: true, mode: 'wecom' });
    const next = wh.updateConfig({ parseSchemaOnly: SAMPLE_SCHEMA });
    assert.strictEqual(next.schemaFields.length, 5);
    assert.strictEqual(next.mapping['fA1'], 'content');
    assert.strictEqual(next.mapping['fA2'], 'priority');
    assert.strictEqual(next.mapping['fA3'], 'done');     // 复选框列 → 是否完成
    assert.strictEqual(next.mapping['fA4'], 'createdAt');
    assert.strictEqual(next.mapping['fA5'], 'image');
});

test('guessSource 关键词识别', () => {
    assert.strictEqual(guessSource('待办事项'), 'content');
    assert.strictEqual(guessSource('紧急程度'), 'priority');
    assert.strictEqual(guessSource('完成时间'), 'doneAt');
    assert.strictEqual(guessSource('图片数'), 'imageCount');
    assert.strictEqual(guessSource('图片'), 'image');
    assert.strictEqual(guessSource('随便什么'), '');
});

// ---------------- 推送与错误处理 ----------------

test('推送到接收端并记录历史', withReceiver(async (url, received) => {
    const wh = makeWebhook({ enabled: true, mode: 'wecom', url: url });
    wh.updateConfig({ parseSchemaOnly: SAMPLE_SCHEMA, mapping: { fA1: 'content' } });
    await wh.push('created', [sampleTask]);

    assert.strictEqual(received.length, 1);
    const body = JSON.parse(received[0].body);
    assert.strictEqual(body.add_records[0].values['fA1'], '写周报\n第二段');
    const history = wh.history();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].ok, true);
}));

test('企业微信业务错误（HTTP 200 + errcode）算失败', withReceiver(async (url, received) => {
    const wh = makeWebhook({ enabled: true, mode: 'wecom', url: url });
    wh.updateConfig({ parseSchemaOnly: SAMPLE_SCHEMA, mapping: { fA1: 'content' } });
    await wh.push('created', [sampleTask]);
    const last = wh.history()[0];
    assert.strictEqual(last.ok, false);
    assert.strictEqual(last.errcode, 40058);
    assert.ok(String(last.error).indexOf('invalid') !== -1);
    assert.strictEqual(received.length, 1);   // 业务错误不重试
}, () => ({ errcode: 40058, errmsg: 'invalid Request Parameter' })));

test('响应里的 record_id 会被记住，供后续更新', withReceiver(async (url, received) => {
    const wh = makeWebhook({ enabled: true, mode: 'wecom', url: url });
    wh.updateConfig({ parseSchemaOnly: SAMPLE_SCHEMA, mapping: { fA1: 'content' } });
    await wh.push('created', [sampleTask]);
    assert.strictEqual(wh.config().recordIds[String(sampleTask.id)], 'REC_xyz');

    await wh.push('completed', [Object.assign({}, sampleTask, { done: true })]);
    const second = JSON.parse(received[1].body);
    assert.strictEqual(second.update_records[0].record_id, 'REC_xyz');
}, () => ({ errcode: 0, errmsg: 'ok', data: { record_ids: ['REC_xyz'] } })));

test('未填写地址 / 未解析字段时只记历史不发请求', withReceiver(async (url, received) => {
    const noUrl = makeWebhook({ enabled: true, mode: 'wecom', url: '' });
    await noUrl.push('created', [sampleTask]);
    assert.strictEqual(noUrl.history()[0].ok, false);

    const noSchema = makeWebhook({ enabled: true, mode: 'wecom', url: url });
    await noSchema.push('created', [sampleTask]);
    assert.strictEqual(noSchema.history()[0].ok, false);
    assert.ok(String(noSchema.history()[0].error).indexOf('字段') !== -1);
    assert.strictEqual(received.length, 0);
}));

test('超量任务会自动分批（每批 500 条）', withReceiver(async (url, received) => {
    const wh = makeWebhook({ enabled: true, mode: 'wecom', url: url });
    wh.updateConfig({ parseSchemaOnly: SAMPLE_SCHEMA, mapping: { fA1: 'content' } });
    const tasks = [];
    for (let i = 0; i < 1200; i++) tasks.push(Object.assign({}, sampleTask, { id: i, content: '任务' + i }));
    await wh.push('created', tasks);
    assert.strictEqual(received.length, 3);
    assert.strictEqual(JSON.parse(received[0].body).add_records.length, 500);
    assert.strictEqual(JSON.parse(received[2].body).add_records.length, 200);
}));

// ---------------- 通用模式 ----------------

test('records 模式生成 records 数组并带事件信息', () => {
    const wh = makeGenericWebhook({}, 'records');
    const payload = wh.buildPayload('created', [sampleTask]);
    assert.strictEqual(payload.action, 'created');
    assert.strictEqual(payload.count, 1);
    assert.strictEqual(payload.records[0]['任务内容'], '写周报\n第二段');
    assert.strictEqual(payload.records[0]['优先级'], '高');
    assert.strictEqual(payload.records[0]['图片数'], 1);
});

test('flat 模式把字段平铺到根层级', () => {
    const wh = makeGenericWebhook({}, 'flat');
    const payload = wh.buildPayload('completed', [sampleTask]);
    assert.strictEqual(payload['任务内容'], '写周报\n第二段');
    assert.strictEqual(payload.records, undefined);
});

test('text 模式输出企业微信群机器人文本格式', () => {
    const wh = makeGenericWebhook({}, 'text');
    const payload = wh.buildPayload('created', [sampleTask]);
    assert.strictEqual(payload.msgtype, 'text');
    assert.ok(payload.text.content.indexOf('新增任务') !== -1);
});

test('custom 模式替换占位符（值里有换行也不会弄坏 JSON）', () => {
    const wh = makeGenericWebhook({
        mode: 'custom',
        template: '{"标题":"{{任务内容}}","级别":"{{优先级}}","动作":"{{action}}"}'
    });
    const payload = wh.buildPayload('created', [sampleTask]);
    assert.strictEqual(payload['标题'], '写周报\n第二段');
    assert.strictEqual(payload['级别'], '高');
    assert.strictEqual(payload['动作'], 'created');
});

// ---------------- 差分事件 ----------------

test('差分：首次只建快照，之后识别新增/完成/删除', withReceiver(async (url, received) => {
    const wh = makeGenericWebhook({
        url: url,
        events: { created: true, completed: true, updated: true, archived: true, deleted: true }
    });

    const t1 = Object.assign({}, sampleTask);
    assert.deepStrictEqual(wh.diffAndEmit([t1], []), []);   // 首次不推送
    assert.strictEqual(received.length, 0);

    const t2 = Object.assign({}, sampleTask, { id: 2, content: '第二条' });
    wh.diffAndEmit([t1, t2], []);                            // 新增
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(received.length, 1);
    assert.strictEqual(JSON.parse(received[0].body).action, 'created');

    const doneT1 = Object.assign({}, t1, { done: true, doneTime: Date.now() });
    wh.diffAndEmit([doneT1, t2], []);                        // 完成
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(received.length, 2);
    assert.strictEqual(JSON.parse(received[1].body).action, 'completed');

    wh.diffAndEmit([t2], []);                                // 删除 t1
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(received.length, 3);
    assert.strictEqual(JSON.parse(received[2].body).action, 'deleted');
}));

test('未订阅的事件不推送', withReceiver(async (url, received) => {
    const wh = makeGenericWebhook({
        url: url,
        events: { created: true, completed: false, updated: false, archived: false, deleted: false }
    });
    const t1 = Object.assign({}, sampleTask);
    wh.diffAndEmit([t1], []);
    wh.diffAndEmit([Object.assign({}, t1, { done: true, doneTime: Date.now() })], []);
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(received.length, 0);
}));

test('updateConfig 合并事件与通用列名映射', () => {
    const wh = makeWebhook({ enabled: false, mode: 'records' });
    const next = wh.updateConfig({ enabled: true, url: 'https://x/y', events: { completed: true }, fields: { '标题': 'content' } });
    assert.strictEqual(next.enabled, true);
    assert.strictEqual(next.url, 'https://x/y');
    assert.strictEqual(next.events.completed, true);
    assert.strictEqual(next.events.created, true);     // 未指定的保持默认
    assert.strictEqual(next.fields['标题'], 'content');
});

test('测试发送不受启用开关影响', withReceiver(async (url, received) => {
    const wh = makeWebhook({ enabled: false, mode: 'wecom', url: url });
    wh.updateConfig({ parseSchemaOnly: SAMPLE_SCHEMA, mapping: { fA1: 'content' } });
    const res = await wh.test();
    assert.strictEqual(res.ok, true);
    assert.strictEqual(received.length, 1);
    assert.ok(JSON.parse(received[0].body).add_records[0].values['fA1'].indexOf('测试任务') !== -1);
}));

test('没做字段映射时 test 直接返回提示', async () => {
    const wh = makeWebhook({ enabled: true, mode: 'wecom', url: 'http://127.0.0.1:1/x' });
    const res = await wh.test();
    assert.strictEqual(res.ok, false);
    assert.ok(String(res.body).indexOf('字段映射') !== -1);
});
