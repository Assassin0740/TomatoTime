'use strict';

/**
 * preload.js —— 渲染进程侧的存储桥接（P2-3）
 *
 * 【职责】
 *   在页面脚本执行之前跑，把主进程的集中存储（store.js）和渲染进程的 localStorage
 *   接上：
 *     1. 启动时按「写入序号」判断谁更新，决定是「导入」还是「回填」；
 *     2. 之后把 window.localStorage 换成镜像实现 —— 每次写入先落 localStorage，
 *        再通知主进程，于是 app-data.json 始终是完整副本。
 *
 * 【三条不可动摇的安全原则】
 *   1. localStorage 永不被无条件覆盖。只有两种情况才回填：
 *        · 主进程数据的写入序号明确更新（storeRev > localRev）
 *        · localStorage 里已经没有真实数据了（被清空 / 换了 profile）
 *      回填前还会把当前内容留档到 localStorage-rescue-<时间>.json。
 *   2. 写入顺序固定为「先 localStorage，后镜像」。镜像失败只影响副本，不影响数据。
 *   3. 只有主窗口参与导入 / 回填；悬浮窗不参与，避免两个窗口互相覆盖。
 *      同时若 localStorage 不可用或替身安装失败，会保持原样并留痕，
 *      下次启动会走「强制导入」路径自愈。
 *
 * 【为什么需要写入序号】
 *   只有能判断新旧，才能既让 localStorage 说了算（现在），又给将来
 *   「主进程侧写入（如手机端远程操作）反推回界面」留出通路。
 */

const { ipcRenderer } = require('electron');

(function bootstrapStore() {
    const SHIM_FLAG = '__store_shim';
    const REV_KEY = '__store_rev';

    let snap = null;
    try {
        snap = ipcRenderer.sendSync('store:snapshot');
    } catch (e) {
        // 拿不到快照就退回原生 localStorage，功能不受影响，只是不再镜像
        return;
    }
    if (!snap || typeof snap !== 'object' || !snap.data) return;

    let real = null;
    try {
        real = window.localStorage;
        // 探一下可用性（隐私模式等情况下可能直接抛错）
        real.setItem('__probe', '1');
        real.removeItem('__probe');
    } catch (e) {
        return;
    }

    // 悬浮窗（float.html）不参与导入 / 回填 / 替身
    const isMainWindow = location.pathname.indexOf('float.html') === -1;

    function dump() {
        const out = {};
        try {
            for (let i = 0; i < real.length; i++) {
                const k = real.key(i);
                if (k !== null) out[k] = real.getItem(k);
            }
        } catch (e) { /* ignore */ }
        return out;
    }

    /** 用主进程数据覆盖本地内容（调用方需确保这是安全的方向） */
    function hydrate(data, rev) {
        try {
            real.clear();
            const keys = Object.keys(data);
            for (let i = 0; i < keys.length; i++) {
                real.setItem(keys[i], data[keys[i]]);
            }
            if (rev !== undefined) real.setItem(REV_KEY, String(rev));
            real.setItem(SHIM_FLAG, '1');
        } catch (e) {
            console.error('[store] 回填 localStorage 失败：', e);
        }
    }

    if (isMainWindow) {
        const local = dump();
        const localKeys = Object.keys(local).filter(function (k) {
            return k !== SHIM_FLAG && k !== REV_KEY;
        });
        const localRev = Number(local[REV_KEY] || 0);
        const storeRev = Number(snap.data[REV_KEY] || 0);
        const storeKeys = Object.keys(snap.data).filter(function (k) {
            return k !== REV_KEY;
        });
        const shimWasActive = local[SHIM_FLAG] === '1';

        if (storeKeys.length > 0 && localKeys.length === 0) {
            // 情况一：本地已空（被清理 / 换了 profile），主进程还有完整副本 → 恢复
            hydrate(snap.data, storeRev);
        } else if (storeKeys.length > 0 && !shimWasActive) {
            // 情况二：上次替身没装上（本地可能已领先）→ 以本地为准刷新副本
            try {
                ipcRenderer.sendSync('store:import', local, localRev);
            } catch (e) { /* ignore */ }
        } else if (storeRev > localRev) {
            // 情况三：主进程副本更新（例如将来的外部写入）→ 留档后回填
            try {
                ipcRenderer.sendSync('store:rescue-ls', local);
            } catch (e) { /* ignore */ }
            hydrate(snap.data, storeRev);
        } else if (localRev > storeRev || (!snap.hasData && localKeys.length > 0)) {
            // 情况四：本次启动前的写入还没同步（上次异常退出）或首次迁移 → 导入
            if (localKeys.length > 0) {
                try {
                    ipcRenderer.sendSync('store:import', local, localRev);
                } catch (e) { /* ignore */ }
            }
        }
        // 其余情况：两边一致，什么都不用做
    }

    if (isMainWindow) {
        const shim = {
            getItem: function (k) {
                return real.getItem(String(k));
            },
            setItem: function (k, v) {
                const key = String(k);
                const val = String(v);
                real.setItem(key, val);
                if (key === SHIM_FLAG || key === REV_KEY) return;
                const rev = Number(real.getItem(REV_KEY) || 0) + 1;
                real.setItem(REV_KEY, String(rev));
                try {
                    ipcRenderer.send('store:set', key, val, rev);
                } catch (e) { /* ignore */ }
            },
            removeItem: function (k) {
                const key = String(k);
                real.removeItem(key);
                if (key === SHIM_FLAG || key === REV_KEY) return;
                const rev = Number(real.getItem(REV_KEY) || 0) + 1;
                real.setItem(REV_KEY, String(rev));
                try {
                    ipcRenderer.send('store:remove', key, rev);
                } catch (e) { /* ignore */ }
            },
            clear: function () {
                real.clear();
                try {
                    ipcRenderer.send('store:clear');
                } catch (e) { /* ignore */ }
            },
            key: function (i) {
                return real.key(i);
            }
        };
        Object.defineProperty(shim, 'length', {
            get: function () { return real.length; }
        });

        let installed = false;
        try {
            Object.defineProperty(window, 'localStorage', {
                configurable: true,
                enumerable: true,
                get: function () { return shim; }
            });
            installed = window.localStorage === shim;
        } catch (e) {
            installed = false;
        }

        if (installed) {
            try {
                real.setItem(SHIM_FLAG, '1');
            } catch (e) { /* ignore */ }
        } else {
            // 替身没装上：数据仍在 localStorage 里，只是不再镜像。
            // 这里故意不写 SHIM_FLAG，下次启动会走「强制导入」把副本补齐。
            console.warn('[store] localStorage 替身安装失败，本次运行不做镜像');
        }
    }
})();
