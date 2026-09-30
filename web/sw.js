/* sw.js —— 网页版 Service Worker
 *
 * 三件事：
 *   1. 预缓存应用壳（断网也能打开）；
 *   2. NoteImages/img_* 任务图片：从 IndexedDB 出图（bridge.js 存、这里取），
 *      这是任务内容里 <img src="NoteImages/..."> 能显示的唯一途径；
 *   3. Draws / 表情包 大体积静态图走「网络优先，失败回缓存」。
 *
 * 改了前端 JS/CSS 必须把 CACHE_VERSION 加一，否则老用户一直用旧壳。
 */
const CACHE_VERSION = 'v2.0.0';
const SHELL_CACHE = `timer-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `timer-asset-${CACHE_VERSION}`;

const SHELL_ASSETS = [
    './',
    './index.html',
    './style.css',
    './overrides.css',
    './renderer.js',
    './bridge.js',
    './manifest.webmanifest',
    './icon.svg',
    './仕事終わったよ.wav',
    './休憩終わったよ.wav'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((k) => {
                if (k !== SHELL_CACHE && k !== ASSET_CACHE) return caches.delete(k);
            }))
        ).then(() => self.clients.claim())
    );
});

/** 从 IndexedDB 读一张任务图片 blob（与 bridge.js 同一个库） */
function idbGetImage(name) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('timer-web', 1);
        req.onsuccess = () => {
            const db = req.result;
            try {
                const tx = db.transaction('images', 'readonly');
                const st = tx.objectStore('images');
                const get = st.get(name);
                get.onsuccess = () => resolve(get.result || null);
                get.onerror = () => reject(get.error);
            } catch (e) { reject(e); }
        };
        req.onerror = () => reject(req.error);
    });
}

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET') return;

    // 1) 任务图片：IndexedDB 出图（bridge.js 存的就是这些键名）
    const imgMatch = url.pathname.match(/NoteImages\/(img_[\w.\-]+)$/);
    if (imgMatch) {
        event.respondWith(
            idbGetImage(decodeURIComponent(imgMatch[1])).then((blob) => {
                if (blob) return new Response(blob, { headers: { 'Content-Type': blob.type || 'image/png' } });
                return new Response('Not Found', { status: 404 });
            }).catch(() => new Response('Not Found', { status: 404 }))
        );
        return;
    }

    // 2) 背景 / 表情包：网络优先，失败回缓存（内容基本不变，缓存只为断网兜底）
    if (/\/(Draws|表情包)\//.test(url.pathname)) {
        event.respondWith(
            caches.open(ASSET_CACHE).then(async (cache) => {
                try {
                    const fresh = await fetch(event.request);
                    cache.put(event.request, fresh.clone());
                    return fresh;
                } catch (e) {
                    const hit = await cache.match(event.request);
                    if (hit) return hit;
                    throw e;
                }
            })
        );
        return;
    }

    // 3) 应用壳：缓存优先，后台更新
    if (event.request.mode === 'navigate' || SHELL_ASSETS.some((a) => url.pathname.endsWith(a.replace('./', '/')))) {
        event.respondWith(
            caches.match(event.request).then((hit) => hit || fetch(event.request))
        );
    }
});
