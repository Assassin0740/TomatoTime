/**
 * sync-status.test.js —— 同步进度指示（2026-11-10）
 *
 * 起因：自动同步（改任务 1.5s 后 push、每 90s 轮询 pull、点按钮手动同步）
 * 全程不更新状态条，用户「同步的时候看不见同步的进度」。
 * 现在状态条走：有改动待同步 → 同步中…（按钮转圈）→ ✓ 已同步 / ✗ 同步失败。
 *
 * sync-client.js 是浏览器 IIFE（依赖 window/localStorage），Node 里 require 不了，
 * 所以这里做静态钉子 + 双副本一致性 + 端到端交给 probe-sync-status.js。
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('两版 sync-client.js 完全一致', () => {
    assert.strictEqual(read('sync-client.js'), read('web/sync-client.js'));
});

test('push/pull 全链路都有 begin/end 进度上报', () => {
    const src = read('sync-client.js');
    assert.ok(src.includes('async function doPush()'), '缺少 doPush');
    assert.ok(src.includes('async function doPull()'), '缺少 doPull');
    // begin/end 必须包住两个方向的请求（begin 至少 2 处：push+pull；end 同理）
    const begins = src.match(/\bbegin\(\)/g) || [];
    const ends = src.match(/\bend\(ok/g) || [];
    assert.ok(begins.length >= 2, 'push/pull 里缺少 begin() 进度上报');
    assert.ok(ends.length >= 2, 'push/pull 里缺少 end() 结果上报');
    assert.ok(src.includes("setStatus('有改动 · 待同步…'"), '缺少待同步提示');
    assert.ok(src.includes("setStatus('同步中…'"), '缺少同步中提示');
    assert.ok(src.includes("'✓ 已同步 '"), '缺少成功提示');
    assert.ok(src.includes("'✗ 同步失败 '"), '缺少失败提示');
});

test('按钮有转圈动画，且失败/成功有区分色', () => {
    const src = read('sync-client.js');
    assert.ok(src.includes('sync-spin'), '缺少转圈动画类');
    assert.ok(src.includes('@keyframes syncSpin'), '缺少转圈 keyframes');
    assert.ok(src.includes("#ffd54f") && src.includes('#81c784') && src.includes('#ef5350'),
        '缺少 busy/ok/err 状态色');
});

test('重复 buildUI 不再丢弃 ui 引用（绑到已有 fab 上）', () => {
    const src = read('sync-client.js');
    assert.ok(/getElementById\('sync-fab'\)\) \{[\s\S]{0,400}querySelector\('\.sync-status'\)/.test(src),
        'buildUI 早退分支应把 ui 绑到已有 fab 的状态条上，否则第二实例的状态更新全部丢失');
});
