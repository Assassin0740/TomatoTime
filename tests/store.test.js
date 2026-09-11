'use strict';

/**
 * store.js 单元测试（对应 `项目文档/08` §3.5 / 09 P2-4 第二步）
 *
 * 运行方式（在项目根目录）：
 *   node --test tests/
 *
 * store.js 顶部 require('electron')，纯 Node 环境下通过 Module._load
 * 打桩注入一个假的 app.getPath('userData')，指向临时目录。
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

// ---------- electron 桩 ----------

let dataDir = '';

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'electron') {
        return { app: { getPath: () => dataDir } };
    }
    return originalLoad.apply(this, arguments);
};

// 每个用例前准备干净的临时 userData，用完后销毁
function freshStore() {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'timer-store-test-'));
    delete require.cache[require.resolve('../store.js')];
    const store = require('../store.js');
    return { store, dataDir };
}

function cleanup() {
    fs.rmSync(dataDir, { recursive: true, force: true });
}

// ---------- 用例 ----------

test('全新环境：init 返回 hasStore=false、0 个键', () => {
    const { store } = freshStore();
    try {
        const r = store.init();
        assert.equal(r.hasStore, false);
        assert.equal(r.keys, 0);
    } finally { cleanup(); }
});

test('全新环境：snapshot().hasData 为 false', () => {
    const { store } = freshStore();
    try {
        store.init();
        assert.equal(store.snapshot().hasData, false);
    } finally { cleanup(); }
});

test('getItem：不存在的键返回 null（与 localStorage 语义一致）', () => {
    const { store } = freshStore();
    try {
        store.init();
        assert.equal(store.getItem('nope'), null);
    } finally { cleanup(); }
});

test('setItem / getItem 往返', () => {
    const { store } = freshStore();
    try {
        store.init();
        store.setItem('k1', 'v1');
        assert.equal(store.getItem('k1'), 'v1');
    } finally { cleanup(); }
});

test('getAll 返回浅拷贝，改返回值不影响内部缓存', () => {
    const { store } = freshStore();
    try {
        store.init();
        store.setItem('k1', 'v1');
        const all = store.getAll();
        all.k1 = 'hacked';
        assert.equal(store.getItem('k1'), 'v1');
    } finally { cleanup(); }
});

test('importAll：导入字符串键值对并立即落盘', () => {
    const { store, dataDir } = freshStore();
    try {
        store.init();
        const n = store.importAll({ a: '1', b: '2' }, 5);
        assert.equal(n, 3); // a、b + __store_rev
        const raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'app-data.json'), 'utf8'));
        assert.equal(raw.data.a, '1');
        assert.equal(raw.data.__store_rev, '5');
    } finally { cleanup(); }
});

test('importAll：非字符串值被跳过', () => {
    const { store } = freshStore();
    try {
        store.init();
        store.importAll({ a: 'ok', bad: 123, obj: { x: 1 } });
        assert.equal(store.getItem('a'), 'ok');
        assert.equal(store.getItem('bad'), null);
        assert.equal(store.getItem('obj'), null);
    } finally { cleanup(); }
});

test('importAll：超过 MAX_VALUE_BYTES 的值被跳过并记录', () => {
    const { store } = freshStore();
    try {
        store.init();
        const big = 'x'.repeat(store.MAX_VALUE_BYTES + 1);
        store.importAll({ big, small: 'ok' });
        assert.equal(store.getItem('big'), null);
        assert.equal(store.getItem('small'), 'ok');
        assert.ok(store.stats().skipped.includes('big'));
    } finally { cleanup(); }
});

test('snapshot().hasData 在导入后为 true，且 data 是快照', () => {
    const { store } = freshStore();
    try {
        store.init();
        store.importAll({ a: '1' });
        const snap = store.snapshot();
        assert.equal(snap.hasData, true);
        assert.equal(snap.data.a, '1');
    } finally { cleanup(); }
});

test('落盘文件结构：{ __v, savedAt, data }，__v 等于 SCHEMA_VERSION', () => {
    const { store, dataDir } = freshStore();
    try {
        store.init();
        store.setItem('k', 'v');
        store.flushSync();
        const raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'app-data.json'), 'utf8'));
        assert.equal(raw.__v, store.SCHEMA_VERSION);
        assert.equal(typeof raw.savedAt, 'string');
        assert.equal(raw.data.k, 'v');
    } finally { cleanup(); }
});

test('原子写入：flushSync 后不残留 .tmp 文件', () => {
    const { store, dataDir } = freshStore();
    try {
        store.init();
        store.setItem('k', 'v');
        store.flushSync();
        assert.equal(fs.existsSync(path.join(dataDir, 'app-data.json.tmp')), false);
    } finally { cleanup(); }
});

test('重启路径：重新 init 能从磁盘恢复数据', () => {
    const { store, dataDir } = freshStore();
    store.init();
    store.setItem('persist', 'yes');
    store.flushSync();

    // 模拟"重启"：重新加载模块 + 重新 init
    delete require.cache[require.resolve('../store.js')];
    const store2 = require('../store.js');
    store2.init();
    assert.equal(store2.getItem('persist'), 'yes');
    cleanup();
});

test('重启路径：已有数据时 init 会创建备份文件', () => {
    const { store, dataDir } = freshStore();
    store.init();
    store.setItem('k', 'v');
    store.flushSync();

    delete require.cache[require.resolve('../store.js')];
    const store2 = require('../store.js');
    store2.init();
    assert.equal(fs.existsSync(path.join(dataDir, 'app-data.backup.json')), true);
    cleanup();
});

test('损坏留档：非法 JSON 被改名 .corrupt-*，存储视同空白', () => {
    const { store, dataDir } = freshStore();
    try {
        fs.writeFileSync(path.join(dataDir, 'app-data.json'), '{oops not json');
        store.init();
        assert.equal(store.getItem('anything'), null);
        assert.equal(store.snapshot().hasData, false);
        const files = fs.readdirSync(dataDir).filter(f => f.startsWith('app-data.json.corrupt-'));
        assert.equal(files.length, 1);
    } finally { cleanup(); }
});

test('结构损坏：合法 JSON 但缺 data 字段，同样留档并视同空白', () => {
    const { store, dataDir } = freshStore();
    try {
        fs.writeFileSync(path.join(dataDir, 'app-data.json'), JSON.stringify({ foo: 1 }));
        store.init();
        assert.equal(store.snapshot().hasData, false);
    } finally { cleanup(); }
});

test('setItem 带 rev 时记录 __store_rev', () => {
    const { store } = freshStore();
    try {
        store.init();
        store.setItem('k', 'v', 42);
        assert.equal(store.getAll().__store_rev, '42');
    } finally { cleanup(); }
});

test('setItem 超限时返回 false，且 rev 仍然前进', () => {
    const { store } = freshStore();
    try {
        store.init();
        const big = 'x'.repeat(store.MAX_VALUE_BYTES + 1);
        assert.equal(store.setItem('big', big, 7), false);
        assert.equal(store.getAll().__store_rev, '7'); // 序号必须跟上，否则每次启动都触发全量导入
        assert.equal(store.getItem('big'), null);
    } finally { cleanup(); }
});

test('removeItem 删除键；删除后 getItem 返回 null', () => {
    const { store } = freshStore();
    try {
        store.init();
        store.setItem('k', 'v');
        store.removeItem('k', 2);
        assert.equal(store.getItem('k'), null);
    } finally { cleanup(); }
});

test('clear() 清空所有数据，snapshot().hasData 变为 false', () => {
    const { store } = freshStore();
    try {
        store.init();
        store.importAll({ a: '1', b: '2' });
        store.clear();
        assert.equal(store.snapshot().hasData, false);
        assert.equal(store.getItem('a'), null);
    } finally { cleanup(); }
});

test('stats() 报告键数、字节数与跳过键', () => {
    const { store } = freshStore();
    try {
        store.init();
        store.setItem('k', 'hello');
        const s = store.stats();
        assert.equal(s.keys, 1);
        assert.equal(s.bytes, 5);
        assert.deepEqual(s.skipped, []);
    } finally { cleanup(); }
});

test('MAX_VALUE_BYTES 导出值为 512KB', () => {
    const { store } = freshStore();
    try {
        assert.equal(store.MAX_VALUE_BYTES, 512 * 1024);
    } finally { cleanup(); }
});

test('连续写入合并：flushSync 前不落盘，flushSync 后一次写入', () => {
    const { store, dataDir } = freshStore();
    try {
        store.init();
        store.setItem('a', '1');
        store.setItem('b', '2');
        assert.equal(fs.existsSync(path.join(dataDir, 'app-data.json')), false); // 180ms 内未 flush
        store.flushSync();
        const raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'app-data.json'), 'utf8'));
        assert.equal(raw.data.a, '1');
        assert.equal(raw.data.b, '2');
    } finally { cleanup(); }
});

test('导入后再次 getItem 大小写敏感（与 localStorage 一致）', () => {
    const { store } = freshStore();
    try {
        store.init();
        store.setItem('Key', 'v');
        assert.equal(store.getItem('key'), null);
        assert.equal(store.getItem('Key'), 'v');
    } finally { cleanup(); }
});
