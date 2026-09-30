'use strict';

/**
 * sw.js —— 网页版的离线壳缓存
 *
 * 只缓存「应用壳」（HTML/CSS/JS/图标），任务与图片仍然存在 IndexedDB 里 ——
 * Service Worker 不碰用户数据，只让页面在断网时也能打开。
 * 改完前端记得把 CACHE_VERSION 加一，否则浏览器还在用旧缓存。
 */

const CACHE_VERSION = 'timer-web-v2';   // v2：修 hidden 失效 + 补 favicon（改前端就加一，否则老用户还在用旧缓存）
const SHELL = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.webmanifest',
    './icon.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== location.origin) return;      // 外链一律不接管

    event.respondWith(
        caches.match(req).then(hit => {
            if (hit) return hit;
            return fetch(req)
                .then(res => {
                    // 同源的静态资源顺手存一份，下次离线可用
                    if (res && res.ok && res.type === 'basic') {
                        const copy = res.clone();
                        caches.open(CACHE_VERSION).then(c => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => caches.match('./index.html'));   // 断网且没缓存 → 回壳
        })
    );
});
