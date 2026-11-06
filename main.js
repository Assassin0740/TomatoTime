const { app, BrowserWindow, Menu, ipcMain, Tray, dialog, shell,
    globalShortcut, clipboard, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodeUrl = require('url');
const store = require('./store');
const mediaFormat = require('./media-format');
const archive = require('./archive');
const editorProvider = require('./editor-provider');
const { createApiServer } = require('./api-server');
const { createWebhook, DEFAULT_WEBHOOK_CONFIG } = require('./webhook');

// GPU 进程沙箱在部分环境（虚拟显卡混装 / 远程桌面 / 向日葵·MuMu 之类虚拟显示适配器）下会让
// GPU 进程一启动就崩溃（exit_code=-1073741819），整个应用退化成软件渲染——此时透明悬浮窗没有
// alpha 通道，只剩"不透明黑板"或"干脆看不见"。只关 GPU 进程的沙箱、保留渲染进程沙箱，
// 风险很低，却能把硬件合成和真透明救回来。
if (!app.commandLine.hasSwitch('disable-gpu') && !app.commandLine.hasSwitch('disable-gpu-sandbox')) {
    app.commandLine.appendSwitch('disable-gpu-sandbox');
}

// 单实例锁定
const gotTheLock = app.requestSingleInstanceLock();if (!gotTheLock) {
    console.log('第二个实例，直接退出');
    app.quit();
    process.exit(0);
}

// 处理第二个实例启动
app.on('second-instance', () => {
    try {
        console.log('收到第二个实例请求，显示主窗口');
        if (mainWindow) {
            // 显示窗口，无论它是最小化还是隐藏
            mainWindow.show();
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    } catch(e) {
        console.error('Error in second-instance:', e);
    }
});

let tray = null;
let trayMenu = null;
let appIsQuitting = false;
let trayCreated = false;

// 获取配置文件路径
const configPath = path.join(app.getPath('userData'), 'floatWindowConfig.json');
const customDrawsPath = path.join(app.getPath('userData'), 'CustomDraws');
const noteImagesPath = path.join(app.getPath('userData'), 'NoteImages');
// 【2026-11-06】任意附件（Word / PPT / APK / ZIP…）单独一个目录：
// 不跟图片混在一起，图片 GC 不会误伤附件，附件也不会被当成图片扫。
const noteFilesPath = path.join(app.getPath('userData'), 'NoteFiles');
const mainSettingsPath = path.join(app.getPath('userData'), 'main-settings.json');

/**
 * main-settings.json —— 只由主进程持有的设置（不进 localStorage）
 *  · api            本地 AI 接入 API 的开关 / 端口 / 令牌
 *  · autolaunch     开机自启
 *  · globalShortcuts 全局快捷键
 * 放在主进程是因为这几项要「在窗口创建之前 / 没有窗口时」也能生效。
 */
const MAIN_SETTINGS_DEFAULT = {
    api: { enabled: false, port: 17890, token: '', requireToken: true, allowLAN: false },
    autolaunch: false,
    globalShortcuts: true,
    reminders: true,
    // WebHook：把任务变化同步到外部表格（企业微信智能表格等）
    webhook: Object.assign({}, DEFAULT_WEBHOOK_CONFIG, {
        enabled: true,
        url: 'https://qyapi.weixin.qq.com/cgi-bin/wedoc/smartsheet/webhook?key=4VIdhSHbIyuo2Ijq5f9otWJGWtwNG0ZvuAJz5trk8IZo2PSKTKOt5FfTyycG71SKOV4kpyd53hHohBVC1lWDVLUuyTbqy0uIApmfjr4RGSKu',
        events: { created: true, completed: true, updated: false, deleted: false, archived: false }
    })
};

let mainSettings = JSON.parse(JSON.stringify(MAIN_SETTINGS_DEFAULT));

function loadMainSettings() {
    try {
        if (fs.existsSync(mainSettingsPath)) {
            const parsed = JSON.parse(fs.readFileSync(mainSettingsPath, 'utf8'));
            mainSettings = Object.assign({}, MAIN_SETTINGS_DEFAULT, parsed);
            mainSettings.api = Object.assign({}, MAIN_SETTINGS_DEFAULT.api, parsed.api || {});
            mainSettings.webhook = Object.assign({}, MAIN_SETTINGS_DEFAULT.webhook, parsed.webhook || {});
            mainSettings.webhook.events = Object.assign({}, MAIN_SETTINGS_DEFAULT.webhook.events, (parsed.webhook || {}).events || {});
            mainSettings.webhook.fields = Object.assign({}, MAIN_SETTINGS_DEFAULT.webhook.fields, (parsed.webhook || {}).fields || {});
        }
    } catch (e) {
        console.error('[settings] 主设置读取失败，使用默认值：', e.message);
    }
    if (!mainSettings.api.token) {
        mainSettings.api.token = crypto.randomBytes(12).toString('hex');
        saveMainSettings();
    }
    return mainSettings;
}

function saveMainSettings() {
    try {
        const tmp = mainSettingsPath + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(mainSettings, null, 2), 'utf8');
        fs.renameSync(tmp, mainSettingsPath);
    } catch (e) {
        console.error('[settings] 主设置保存失败：', e.message);
    }
}

// 读取悬浮窗配置
function loadFloatWindowConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(data);
            // 验证和限制窗口尺寸，防止异常值
            if (config.width && (config.width < 150 || config.width > 700)) {
                config.width = 380;
            }
            if (config.height && (config.height < 50 || config.height > 250)) {
                config.height = 100;
            }
            return config;
        }
    } catch (e) {
        console.log('Could not load float window config');
    }
    return {
        width: 380,
        height: 100,
        x: null,
        y: null,
        // 默认透明：悬浮窗本来就该是"只有文字浮在桌面上"。软件渲染环境会在创建窗口时
        // 自动回退成不透明底板（见 createFloatWindow），所以这里不需要保守。
        withBackground: false
    };
}

// 保存悬浮窗配置（采用原子写入防止断电、崩溃时数据损坏）
function saveFloatWindowConfig(bounds) {
    try {
        const config = loadFloatWindowConfig();
        const newConfig = { ...config, ...bounds };
        const tempPath = configPath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(newConfig), 'utf8');
        fs.renameSync(tempPath, configPath);
    } catch (e) {
        console.error('原子保存悬浮窗配置失败，执行安全降级直接写入:', e);
        try {
            const config = loadFloatWindowConfig();
            const newConfig = { ...config, ...bounds };
            fs.writeFileSync(configPath, JSON.stringify(newConfig), 'utf8');
        } catch (err) {}
    }
}

/**
 * 把主进程集中存储里的显示设置推送给悬浮窗。
 * 原先这里是 5 段 mainWindow.webContents.executeJavaScript('localStorage.getItem(...)')：
 * 异步、强依赖主窗口存活、时序脆弱。改为直接读 store 后变成同步、稳定，
 * 且即使主窗口已关闭也能正确取到值。
 */
function pushSettingsToFloatWindow() {
    if (!floatWindow || floatWindow.isDestroyed()) return;

    const timerColor = store.getItem('timerColor');
    if (timerColor) {
        floatWindow.webContents.send('timer-color-update', timerColor);
    }

    floatWindow.webContents.send('shadow-style-update', {
        color: store.getItem('shadowColor') || '#000000',
        size: store.getItem('shadowSize') || '20'
    });

    const glowEnabled = store.getItem('glowEnabled');
    floatWindow.webContents.send('glow-enabled-update', glowEnabled === null || glowEnabled === 'true');

    floatWindow.webContents.send('glow-color-update', store.getItem('glowColor') || '#00a1d6');
    floatWindow.webContents.send('glow-intensity-update', store.getItem('glowIntensity') || '15');

    const contentSettings = {
        showTask: store.getItem('floatShowTask') !== 'false',
        showImages: store.getItem('floatShowImages') !== 'false',
        imageLimit: parseInt(store.getItem('floatImageLimit') || '3', 10) || 3
    };
    floatWindow.webContents.send('float-content-settings', contentSettings);
    ensureFloatWindowFitsImages(contentSettings);
}

// 需要在悬浮窗显示任务图片时，保证窗口有足够高度，否则图片会被挤压得看不见
function ensureFloatWindowFitsImages(settings) {
    if (!floatWindow || floatWindow.isDestroyed()) return;
    if (!settings || !settings.showTask || !settings.showImages) return;
    try {
        const bounds = floatWindow.getBounds();
        if (bounds.height < 160) {
            floatWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: 170 });
            saveFloatWindowConfig({ height: 170 });
        }
    } catch (e) {
        console.error('调整悬浮窗高度失败:', e);
    }
}

let mainWindow;
let floatWindow = null;
let isAlwaysOnTop = false;
let isTimerRunning = false;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let dragSize = null;   // 拖动开始时的窗口尺寸，拖动全程锁死，避免被 DPI 取整"蹭大"
// 规范尺寸：只在窗口创建 / 用户手动拉伸时更新，拖动期间一律用它。
// 按 4 的倍数对齐——125%(×1.25)、150%(×1.5)、100%、200% 下都能整除，
// 这样 setBounds 来回换算物理像素不丢精度，避免"拖一次大一点点"。
let floatSize = null;
const quantizeFloatSize = (w, h) => ({
    width: Math.min(700, Math.max(148, Math.round(w / 4) * 4)),
    height: Math.min(248, Math.max(52, Math.round(h / 4) * 4))
});
let withBackground = true;
let isWindowLocked = false;
let isFloatPinned = true;
// 当前进程能不能用「真·透明窗口」（需要 GPU 合成）
let floatCanTransparent = true;

// 计时器状态（在主进程中运行，不受页面隐藏影响）
let timerInterval = null;
let currentTime = 25 * 60; // 默认25分钟
let isWorking = true;
let WORK_TIME = 25 * 60; // 工作时间（可配置）
let REST_TIME = 10 * 60; // 休息时间（可配置）
let autoStartNext = false; // 时间到点后是否自动开始下一阶段（由主窗口设置同步过来）

// 获取当前计时器状态
function getTimerStatus() {
    return {
        isRunning: timerInterval !== null,
        isWorking: isWorking,
        currentTime: currentTime
    };
}

// 发送计时器状态给所有窗口
function broadcastTimerStatus() {
    const status = getTimerStatus();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('timer-status', status);
    }
    if (floatWindow && !floatWindow.isDestroyed()) {
        floatWindow.webContents.send('timer-status', status);
    }
}

// 切换计时器
function toggleTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        isTimerRunning = false;
        broadcastTimerStatus();
        updateTrayMenu();
        return;
    }
    
    isTimerRunning = true;
    let lastTime = Date.now();
    timerInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - lastTime) / 1000);
        if (elapsed >= 1) {
            currentTime -= elapsed;
            lastTime += elapsed * 1000; // 精准时间累积补偿，防止 setInterval 受负载/睡眠休眠导致的累计漂移误差
            
            if (currentTime <= 0) {
                // 在切换状态之前发送结束通知，发送的是当前结束的状态
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('timer-end', { isWorking: isWorking });
                }

                isWorking = !isWorking;
                currentTime = isWorking ? WORK_TIME : REST_TIME;

                if (autoStartNext) {
                    // 自动开始下一阶段：不动 interval，让它继续跑下去。
                    // 注意这里不重置 lastTime，这样不足 1 秒的余量会被带到下一阶段，避免累积漂移。
                } else {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    isTimerRunning = false;
                }
                updateTrayMenu();
            }
        }
        broadcastTimerStatus();
    }, 100);
    
    updateTrayMenu();
}

// 设置计时器时间
function setTimerTime(minutes, seconds) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    currentTime = minutes * 60 + seconds;
    broadcastTimerStatus();
}

// 手动切换工作 / 休息模式
function switchMode() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        isTimerRunning = false;
    }
    isWorking = !isWorking;
    currentTime = isWorking ? WORK_TIME : REST_TIME;
    broadcastTimerStatus();
    updateTrayMenu();
}

// 停止并重置为本阶段起始时长
function resetTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        isTimerRunning = false;
    }
    currentTime = isWorking ? WORK_TIME : REST_TIME;
    broadcastTimerStatus();
    updateTrayMenu();
}

// 切换悬浮窗函数
function toggleFloatWindow() {
    if (floatWindow && !floatWindow.isDestroyed()) {
        floatWindow.close();
        return;
    }
    createFloatWindow({ flash: true });
}

/**
 * 把已打开的悬浮窗拉回可见位置并让它"闪一下"：
 * 悬浮窗是无边框 + 透明 + 不占任务栏的，一旦跑到屏幕外、或者跟浅色壁纸糊在一起，
 * 用户就只能干瞪眼。复位时按当前鼠标所在显示器居中，再画一圈虚线提示 2.5 秒。
 */
function resetFloatWindow() {
    const { screen } = require('electron');
    if (!floatWindow || floatWindow.isDestroyed()) {
        createFloatWindow({ center: true, flash: true });
        return;
    }
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const area = display.workArea;
    const b = floatWindow.getBounds();
    const x = Math.round(area.x + Math.max(0, (area.width - b.width) / 2));
    const y = Math.round(area.y + Math.max(0, (area.height - b.height) / 2));
    floatWindow.setBounds({ x, y, width: b.width, height: b.height });
    if (isFloatPinned) floatWindow.setAlwaysOnTop(true);
    if (floatWindow.isMinimized()) floatWindow.restore();
    floatWindow.show();
    floatWindow.moveTop();
    try { floatWindow.webContents.send('float-flash'); } catch (e) { /* 还没加载完就算了 */ }
    saveFloatWindowConfig({ x, y });
}

/** 右键菜单里的「放大 / 缩小」：按比例改窗口尺寸，以中心为基准，限制在 150~700 × 50~250 */
function zoomFloatWindow(factor) {
    if (!floatWindow || floatWindow.isDestroyed()) return;
    const b = floatWindow.getBounds();
    const clamp = (v, lo, hi) => Math.round(Math.max(lo, Math.min(hi, v)));
    const width = clamp(b.width * factor, 150, 700);
    const height = clamp(b.height * factor, 50, 250);
    if (width === b.width && height === b.height) return;
    const x = Math.round(b.x + (b.width - width) / 2);
    const y = Math.round(b.y + (b.height - height) / 2);
    floatWindow.setBounds({ x, y, width, height });
    floatSize = quantizeFloatSize(width, height);
    saveFloatWindowConfig({ x, y, width, height });
}

// 悬浮窗「透明/背景」状态统一出口。
// 真·透明（只有文字、背景透出桌面）必须依赖窗口的 alpha 通道，也就是必须能 GPU 合成。
// 软件渲染下窗口没有 alpha，只剩两种可能：不透明底板，或者整窗半透明（连字一起变淡）。
// 后者不是用户要的效果，所以这里只做状态同步，不碰窗口不透明度。
function applyFloatBackdrop(opts) {
    const silent = !!(opts && opts.silent);
    if (!floatWindow || floatWindow.isDestroyed()) return;
    if (!silent && floatWindow.webContents) {
        floatWindow.webContents.send('set-background', withBackground);
    }
}

function createFloatWindow(options) {
    const opts = options || {};
    const { screen, Menu, MenuItem } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    // 读取保存的配置
    const savedConfig = loadFloatWindowConfig();
    const windowWidth = savedConfig.width || 380;
    const windowHeight = savedConfig.height || 100;
    let windowX = savedConfig.x;
    let windowY = savedConfig.y;
    withBackground = savedConfig.withBackground !== undefined ? savedConfig.withBackground : false;
    
    // 如果没有保存位置，使用默认位置
    if (windowX === null || windowY === null) {
        windowX = Math.floor((width - windowWidth) / 2);
        windowY = 20;
    } else {
        // 检查窗口是否在任何显示范围内
        const { screen } = require('electron');
        const displays = screen.getAllDisplays();
        let isValidPosition = false;
        
        for (const display of displays) {
            const area = display.workArea;
            if (windowX >= area.x - 50 && windowY >= area.y - 50 &&
                windowX + windowWidth <= area.x + area.width + 50 &&
                windowY + windowHeight <= area.y + area.height + 50) {
                isValidPosition = true;
                break;
            }
        }
        
        // 如果不在任何显示范围内，使用默认位置
        if (!isValidPosition) {
            windowX = Math.floor((width - windowWidth) / 2);
            windowY = 20;
        }
    }

    // 右键「复位」：忽略历史位置，直接在当前鼠标所在显示器居中
    if (opts.center) {
        const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
        const area = display.workArea;
        windowX = Math.round(area.x + Math.max(0, (area.width - windowWidth) / 2));
        windowY = Math.round(area.y + Math.max(0, (area.height - windowHeight) / 2));
    }
    
    // 透明窗口依赖 GPU 合成：一旦被强制软件渲染（--disable-gpu，例如远程桌面 / 显卡驱动异常 /
    // 被工具以无 GPU 方式拉起），窗口内容其实是画好的，但桌面上一片空白——用户只看到"打开了却找不到"。
    // 这种情况退化成不透明小窗（深色底板），至少保证看得见、能拖动。
    const canUseTransparent = !app.commandLine.hasSwitch('disable-gpu') && !app.commandLine.hasSwitch('disable-gpu-compositing');
    floatCanTransparent = canUseTransparent;
    if (!canUseTransparent) {
        console.warn('[float] 当前为软件渲染：窗口没有 alpha 通道，无法做"只有文字"的真透明，本次退化为不透明底板');
        // 只在内存里纠正，不回写配置文件——否则用户下次在有显卡的环境启动就变不回透明了
        withBackground = true;
    }

    const floatWindowOptions = {
        width: windowWidth,
        height: windowHeight,
        x: windowX,
        y: windowY,
        frame: false,
        transparent: canUseTransparent,
        backgroundColor: canUseTransparent ? '#00000000' : '#14141e',
        opacity: canUseTransparent ? 0.999 : 1,
        hasShadow: false,
        alwaysOnTop: isFloatPinned,
        skipTaskbar: true,
        resizable: true,
        movable: true,
        minimizable: false,
        maximizable: false,
        closable: true,
        show: false,
        minWidth: 150,
        minHeight: 50,
        maxWidth: 700,
        maxHeight: 250,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            allowRunningInsecureContent: true
        },
        icon: path.join(__dirname, '图标', 'dstuy-bkp5e-001.ico'),
        title: ''
    };

    if (process.platform === 'darwin') {
        floatWindowOptions.titleBarStyle = 'hidden';
    }

    floatWindow = new BrowserWindow(floatWindowOptions);

    // 记录一份"规范尺寸"（按 4 的倍数对齐），之后拖动/复位都以它为准，不再反复读系统值
    const initSize = floatWindow.getContentSize();
    floatSize = quantizeFloatSize(initSize[0], initSize[1]);
    if (initSize[0] !== floatSize.width || initSize[1] !== floatSize.height) {
        floatWindow.setContentSize(floatSize.width, floatSize.height);
    }

    floatWindow.setAlwaysOnTop(isFloatPinned);
    floatWindow.setIgnoreMouseEvents(isWindowLocked);
    
    // 移除菜单
    floatWindow.setMenu(null);
    floatWindow.setMenuBarVisibility(false);
    floatWindow.setAutoHideMenuBar(true);
    
    // 显示窗口
    floatWindow.once('ready-to-show', () => {
        floatWindow.show();
        if (isFloatPinned) {
            floatWindow.setAlwaysOnTop(true);
            floatWindow.moveTop();
        }
        // 推送当前背景状态（明确告知开/关，不再靠两边默认值对齐）
        applyFloatBackdrop();
        // 推送保存的显示设置（直接读主进程集中存储，不再依赖主窗口）
        pushSettingsToFloatWindow();
        // 居中打开时亮一下边框，不然透明窗口在浅色壁纸上等于隐身
        if (opts.flash) {
            setTimeout(() => {
                if (floatWindow && !floatWindow.isDestroyed()) {
                    try { floatWindow.webContents.send('float-flash'); } catch (e) { }
                }
            }, 350);
        }
    });
    
    // 移除防止失焦出现标题栏的旧 blur hack，因为把窗口 opacity 设为 0.999 会使 Chromium 以层合成模式（Layered Window）渲染，Windows DWM 永远不会为其绘制白条标题栏。
    
    // 保存窗口位置和大小变化（防抖优化）
    let saveTimeout = null;
    let isSaving = false;
    const saveWindowState = () => {
        if (floatWindow && !floatWindow.isDestroyed() && !isSaving) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                if (floatWindow && !floatWindow.isDestroyed()) {
                    isSaving = true;
                    try {
                        const bounds = floatWindow.getBounds();
                        // 防止异常值导致抖动
                        if (bounds.width >= 150 && bounds.width <= 700 &&
                            bounds.height >= 50 && bounds.height <= 250) {
                            saveFloatWindowConfig(bounds);
                        }
                    } finally {
                        isSaving = false;
                    }
                }
            }, 800); // 增加延迟，防止频繁保存
        }
    };
    
    floatWindow.on('move', saveWindowState);
    // 用户自己拉伸边缘时更新规范尺寸；拖动过程中的 resize 不算（那是我们自己在纠偏）
    floatWindow.on('resize', () => {
        if (!isDragging && floatWindow && !floatWindow.isDestroyed()) {
            const cs = floatWindow.getContentSize();
            floatSize = quantizeFloatSize(cs[0], cs[1]);
        }
        saveWindowState();
    });

    const createContextMenu = () => {
        const menu = new Menu();
        menu.append(new MenuItem({
            label: isTimerRunning ? '⏸ 暂停' : '▶ 开始',
            click: () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('toggle-timer');
                }
            }
        }));
        menu.append(new MenuItem({
            label: '↔ 切换模式',
            click: () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('toggle-mode');
                }
            }
        }));
        menu.append(new MenuItem({
            label: '✏ 修改时间',
            click: () => {
                if (floatWindow && !floatWindow.isDestroyed()) {
                    floatWindow.webContents.send('start-edit-time');
                }
            }
        }));
        menu.append(new MenuItem({ type: 'separator' }));
        // 尺寸改成菜单里显式调：无边框窗口开着 resizable 时四条边有隐形拉伸手柄，
        // 拖动时抓在边缘会同时触发"改大小"，看起来就是"一移动就变大"。
        menu.append(new MenuItem({
            label: '🔍 放大',
            click: () => { zoomFloatWindow(1.15); }
        }));
        menu.append(new MenuItem({
            label: '🔎 缩小',
            click: () => { zoomFloatWindow(1 / 1.15); }
        }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({
            click: async () => {
                const result = await dialog.showOpenDialog(floatWindow, {
                    filters: [
                        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }
                    ],
                    properties: ['openFile']
                });
                if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    const fileData = fs.readFileSync(filePath);
                    const ext = path.extname(filePath).toLowerCase();
                    let mimeType = 'image/png';
                    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
                    else if (ext === '.gif') mimeType = 'image/gif';
                    else if (ext === '.webp') mimeType = 'image/webp';
                    else if (ext === '.bmp') mimeType = 'image/bmp';
                    const dataUrl = `data:${mimeType};base64,${fileData.toString('base64')}`;
                    if (floatWindow && !floatWindow.isDestroyed()) {
                        floatWindow.webContents.send('set-float-image', dataUrl);
                    }
                }
            }
        }));
        menu.append(new MenuItem({
            label: '🗑️ 清除悬浮窗配图',
            click: () => {
                if (floatWindow && !floatWindow.isDestroyed()) {
                    floatWindow.webContents.send('set-float-image', null);
                }
            }
        }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({
            label: !floatCanTransparent
                ? '👻 透明背景（显卡不可用，暂不支持）'
                : (withBackground ? '👻 透明背景' : '🎨 显示背景'),
            enabled: floatCanTransparent,
            click: () => {
                withBackground = !withBackground;
                applyFloatBackdrop();
                saveFloatWindowConfig({ withBackground: withBackground });
            }
        }));
        menu.append(new MenuItem({
            label: isWindowLocked ? '🔐 解锁' : '🔒 锁定',
            click: () => {
                isWindowLocked = !isWindowLocked;
                if (floatWindow && !floatWindow.isDestroyed()) {
                    floatWindow.setIgnoreMouseEvents(isWindowLocked);
                    floatWindow.webContents.send('set-locked', isWindowLocked);
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('float-locked-changed', isWindowLocked);
                    }
                }
            }
        }));
        menu.append(new MenuItem({
            label: isFloatPinned ? '📍 取消置顶' : '📍 置顶',
            click: () => {
                isFloatPinned = !isFloatPinned;
                floatWindow.setAlwaysOnTop(isFloatPinned);
            }
        }));
        menu.append(new MenuItem({
            label: '🏠 显示主窗口',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        }));
        menu.append(new MenuItem({
            label: '✕ 关闭',
            click: () => {
                floatWindow.close();
            }
        }));
        return menu;
    };

    floatWindow.loadFile('float.html');
    
    // 如果有锁定状态，应用它
    if (isWindowLocked) {
        floatWindow.setIgnoreMouseEvents(true);
        floatWindow.webContents.once('dom-ready', () => {
            floatWindow.webContents.send('set-locked', true);
        });
    }

    // 右键菜单可能同时来自 webContents 的 context-menu 事件与渲染进程的 IPC 请求，
    // 这里用时间戳去重，避免同一个右键动作叠出两层菜单
    let lastFloatMenuAt = 0;
    const popupFloatMenu = () => {
        if (!floatWindow || floatWindow.isDestroyed()) return;
        const now = Date.now();
        if (now - lastFloatMenuAt < 250) return;
        lastFloatMenuAt = now;
        const menu = createContextMenu();
        menu.popup({ window: floatWindow });
    };

    floatWindow.webContents.on('context-menu', (event, params) => {
        if (!isWindowLocked) {
            event.preventDefault();
            popupFloatMenu();
        }
    });

    ipcMain.on('show-float-menu', () => {
        if (!isWindowLocked && floatWindow && !floatWindow.isDestroyed()) {
            popupFloatMenu();
        }
    });

    // 处理拖动
    ipcMain.on('float-mousedown', (event, data) => {
        if (!isWindowLocked && data.button === 0) {
            isDragging = true;
            const pos = floatWindow.getPosition();
            dragOffset.x = data.screenX - pos[0];
            dragOffset.y = data.screenY - pos[1];
            // 用主进程记着的规范尺寸，而不是临时读 getBounds（读出来的值带小数/边框，来回换算会漂）
            const cur = floatWindow.getContentSize();
            dragSize = floatSize || quantizeFloatSize(cur[0], cur[1]);
        }
    });

    ipcMain.on('float-mousemove', (event, data) => {
        if (isDragging && floatWindow && !floatWindow.isDestroyed()) {
            // 位置和尺寸一次设完（setBounds），不要"先 setPosition 再纠尺寸"——
            // 那样中间会有一帧被系统改大，用户看到的就是"忽大忽小"。
            const bounds = {
                // 位置也对齐到 4 的倍数：125% / 150% 缩放下正好落整数物理像素，
                // 否则窗口边缘被系统吸附回整像素，宽度会在 608/610 之间来回跳（视觉上"忽大忽小"）
                x: Math.round((data.screenX - dragOffset.x) / 4) * 4,
                y: Math.round((data.screenY - dragOffset.y) / 4) * 4
            };
            if (dragSize) {
                bounds.width = dragSize.width;
                bounds.height = dragSize.height;
            }
            floatWindow.setBounds(bounds);
        }
    });

    ipcMain.on('float-mouseup', () => {
        isDragging = false;
        dragSize = null;
    });

    floatWindow.on('close', () => {
        // 如果有防抖未保存的窗口位置和大小，立即保存
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
            if (floatWindow && !floatWindow.isDestroyed()) {
                try {
                    const bounds = floatWindow.getBounds();
                    if (bounds.width >= 150 && bounds.width <= 700 &&
                        bounds.height >= 50 && bounds.height <= 250) {
                        saveFloatWindowConfig(bounds);
                    }
                } catch (e) {
                    console.error('Error saving window state on close:', e);
                }
            }
        }
    });

    floatWindow.on('closed', () => {
        clearTimeout(saveTimeout);
        floatWindow = null;
        isDragging = false;
        dragSize = null;
        ipcMain.removeAllListeners('show-float-menu');
        ipcMain.removeAllListeners('float-mousedown');
        ipcMain.removeAllListeners('float-mousemove');
        ipcMain.removeAllListeners('float-mouseup');
        // 通知主窗口悬浮窗已关闭（确保窗口未销毁）
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('float-window-closed');
        }
        updateTrayMenu();
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('float-window-opened');
    }
    updateTrayMenu();
}

/**
 * 调试探针（TIMER_PROBE=<js 文件>）
 * 用来在真实主进程环境里跑一段脚本，量 DOM、抓报错。
 * 平时不启用；只在排查渲染层问题时才设这个环境变量。
 */
async function runProbe(jsFile) {
    try {
        await new Promise(r => setTimeout(r, 2500));
        const js = fs.readFileSync(jsFile, 'utf8');
        const out = await mainWindow.webContents.executeJavaScript(js);
        console.log('PROBE_RESULT ' + JSON.stringify(out));
        const shot = process.env.TIMER_PROBE_SHOT;
        if (shot) {
            const img = await mainWindow.webContents.capturePage();
            fs.writeFileSync(shot, img.toPNG());
            console.log('PROBE_SHOT ' + shot);
        }
        const wait = Number(process.env.TIMER_PROBE_WAIT || 0);
        if (wait) await new Promise(r => setTimeout(r, wait));
    } catch (e) {
        console.error('PROBE_ERROR ' + (e && e.stack ? e.stack : e));
    }
}

function createWindow() {
    // 尝试设置主窗口图标
    const iconPath = path.join(__dirname, '图标', 'dstuy-bkp5e-001.ico');
    console.log('主窗口图标路径:', iconPath);
    
    mainWindow = new BrowserWindow({
        width: 900,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            allowRunningInsecureContent: true,
            // 存储桥接：把 localStorage 的每次写入镜像到主进程集中存储（store.js）
            preload: path.join(__dirname, 'preload.js')
        },
        title: '计时器',
        icon: iconPath,
        show: false // 先不显示，准备好再显示
    });

    // 默认窗口化全屏（最大化）
    mainWindow.maximize();

    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.loadFile('计时器.html');

    if (process.env.TIMER_PROBE) {
        mainWindow.webContents.on('did-finish-load', () => runProbe(process.env.TIMER_PROBE));
    }
    
    // 主窗口关闭时询问用户
    mainWindow.on('close', (event) => {
        if (!appIsQuitting) {
            event.preventDefault();
            
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
                type: 'question',
                buttons: ['📥 最小化到托盘', '❌ 退出应用'],
                defaultId: 0,
                cancelId: 0,
                title: '关闭选项',
                message: '请选择操作：',
                detail: '最小化到托盘可以继续运行计时器\n退出应用将完全关闭程序'
            }).then((result) => {
                if (result.response === 1) {
                    // 用户选择退出应用
                    appIsQuitting = true;
                    app.quit();
                } else {
                    // 用户选择最小化到托盘
                    mainWindow.hide();
                }
            });
        }
    });
    
    // 主窗口完全关闭时
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    const menu = Menu.buildFromTemplate([
        {
            label: '窗口',
            submenu: [
                {
                    label: '置顶',
                    click: () => {
                        isAlwaysOnTop = !isAlwaysOnTop;
                        mainWindow.setAlwaysOnTop(isAlwaysOnTop);
                    },
                    type: 'checkbox',
                    checked: isAlwaysOnTop
                },
                {
                    label: '全屏',
                    click: () => {
                        const isFullScreen = mainWindow.isFullScreen();
                        mainWindow.setFullScreen(!isFullScreen);
                    },
                    accelerator: 'F11'
                },
                { type: 'separator' },
                {
                    label: '最小化到托盘',
                    click: () => mainWindow.hide(),
                    accelerator: 'Ctrl+W'
                },
                {
                    label: '退出应用',
                    click: () => {
                        app.isQuitting = true;
                        app.quit();
                    },
                    accelerator: 'Ctrl+Q'
                }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox({
                            title: '关于计时器',
                            message: `专注计时器 v${app.getVersion()}\n\n一个帮助你保持专注的计时器应用。`
                        });
                    }
                }
            ]
        }
    ]);
    Menu.setApplicationMenu(menu);

    // F11 全屏切换
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11') {
            event.preventDefault();
            const isFullScreen = mainWindow.isFullScreen();
            mainWindow.setFullScreen(!isFullScreen);
            // 发送全屏状态到前端
            mainWindow.webContents.send('fullscreen-status', !isFullScreen);
        }
    });
    
    // 监听窗口进入/退出全屏
    mainWindow.on('enter-full-screen', () => {
        mainWindow.webContents.send('fullscreen-status', true);
    });
    
    mainWindow.on('leave-full-screen', () => {
        mainWindow.webContents.send('fullscreen-status', false);
    });

    ipcMain.on('toggle-top', () => {
        isAlwaysOnTop = !isAlwaysOnTop;
        mainWindow.setAlwaysOnTop(isAlwaysOnTop);
        mainWindow.webContents.send('top-status', isAlwaysOnTop);
    });

    ipcMain.on('get-top-status', (event) => {
        event.reply('top-status', isAlwaysOnTop);
    });

    ipcMain.on('timer-running', (event, running) => {
        isTimerRunning = running;
    });

    // Markdown 里的链接：只放行 http/https，交给系统默认浏览器打开
    // （任务内容是 contenteditable，直接给 <a> 会把应用窗口本身导航走）
    ipcMain.on('open-external', (event, url) => {
        const target = String(url || '').trim();
        if (!/^https?:\/\//i.test(target)) return;
        try {
            require('electron').shell.openExternal(target);
        } catch (e) {
            console.error('打开外部链接失败:', e);
        }
    });

    // 处理从主页面来的锁定请求
    ipcMain.on('toggle-float-lock', () => {
        isWindowLocked = !isWindowLocked;
        if (floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.setIgnoreMouseEvents(isWindowLocked);
            floatWindow.webContents.send('set-locked', isWindowLocked);
            mainWindow.webContents.send('float-locked-changed', isWindowLocked);
        }
    });

    // 主页面请求当前锁定状态
    ipcMain.on('get-float-locked', (event) => {
        event.reply('float-locked-status', isWindowLocked);
    });

    ipcMain.on('toggle-float-window', () => {
        toggleFloatWindow();
    });

    // 右键悬浮窗按钮：不管开没开、跑到哪儿去了，都复位到鼠标所在屏幕的正中间
    ipcMain.on('reset-float-window', () => {
        resetFloatWindow();
    });

    ipcMain.on('close-float-window', () => {
        if (floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.close();
        }
    });

    // 悬浮窗任务管理同步 IPC 转发逻辑
    ipcMain.on('request-notes-from-float', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('request-notes-from-float');
        }
    });

    ipcMain.on('sync-notes-to-float', (event, notes) => {
        if (floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.webContents.send('sync-notes-to-float', notes);
        }
    });

    ipcMain.on('float-toggle-done', (event, id) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('float-toggle-done', id);
        }
    });

    ipcMain.on('float-edit-note', (event, data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('float-edit-note', data);
        }
    });

    ipcMain.on('float-add-note', (event, content) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('float-add-note', content);
        }
    });

    ipcMain.on('update-float-time', (event, data) => {
        if (floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.webContents.send('time-update', data);
        }
    });

    ipcMain.on('update-float-timer-color', (event, color) => {
        if (floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.webContents.send('timer-color-update', color);
        }
    });

    ipcMain.on('update-float-shadow-color', (event, color) => {
        if (floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.webContents.send('shadow-color-update', color);
        }
    });

    ipcMain.on('update-float-shadow-size', (event, size) => {
        if (floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.webContents.send('shadow-size-update', size);
        }
    });

    ipcMain.on('update-float-glow-enabled', (event, enabled) => {
        if (floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.webContents.send('glow-enabled-update', enabled);
        }
    });

    ipcMain.on('update-float-glow-color', (event, color) => {
        if (floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.webContents.send('glow-color-update', color);
        }
    });

    ipcMain.on('update-float-glow-intensity', (event, intensity) => {
        if (floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.webContents.send('glow-intensity-update', intensity);
        }
    });

    // 悬浮窗内容显示设置（是否显示任务 / 是否显示图片 / 图片数量上限）
    ipcMain.on('update-float-content-settings', (event, settings) => {
        if (floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.webContents.send('float-content-settings', settings);
            ensureFloatWindowFitsImages(settings);
        }
    });

    // 时间到点后是否自动开始下一阶段（由主窗口设置推送）
    ipcMain.on('set-auto-start-next', (event, enabled) => {
        autoStartNext = !!enabled;
    });

    // ===== 集中存储（store.js）的桥接 =====
    // preload.js 在页面脚本执行前 sendSync 取一次快照，据此决定「导入」还是「回填」
    ipcMain.on('store:snapshot', (event) => {
        event.returnValue = store.snapshot();
    });

    // 用渲染进程的完整快照刷新主进程副本（首次迁移 + 每次启动自愈）
    ipcMain.on('store:import', (event, obj, rev) => {
        const count = store.importAll(obj, rev);
        event.returnValue = count;
        console.log('[store] 已从 localStorage 导入 ' + count + ' 项');
    });

    // 回填前把 localStorage 现状留档，万一判断失误还能找回
    ipcMain.on('store:rescue-ls', (event, obj) => {
        try {
            const keys = obj ? Object.keys(obj).filter(k => k !== '__store_rev' && k !== '__store_shim') : [];
            if (keys.length === 0) {
                event.returnValue = false;
                return;
            }
            const file = path.join(app.getPath('userData'), 'localStorage-rescue-' + Date.now() + '.json');
            fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
            console.log('[store] 回填前已留档 localStorage：', file);
            event.returnValue = true;
        } catch (e) {
            console.error('[store] 留档失败：', e);
            event.returnValue = false;
        }
    });

    // 渲染进程每次写入 localStorage，preload 都会镜像一份过来
    ipcMain.on('store:set', (event, key, value, rev) => {
        store.setItem(key, value, rev);
    });

    ipcMain.on('store:remove', (event, key, rev) => {
        store.removeItem(key, rev);
    });

    ipcMain.on('store:clear', () => {
        store.clear();
    });

    // 渲染进程每次保存任务后催一次立即落盘（异常关闭时尽量少丢最后一批数据）
    ipcMain.on('store:flush', () => {
        try {
            store.flushSync();
        } catch (e) {
            console.error('[store] 立即落盘失败：', e);
        }
    });

    // 供主进程内部 / 将来其它通道查询
    ipcMain.handle('store:get-all', () => store.getAll());
    ipcMain.handle('store:stats', () => store.stats());

    ipcMain.on('toggle-mode', () => {
        switchMode();
    });

    ipcMain.on('toggle-timer', () => {
        toggleTimer();
    });

    ipcMain.on('get-timer-status', (event) => {
        const status = getTimerStatus();
        event.sender.send('timer-status', status);
    });

    ipcMain.on('timer-status', (event, status) => {
        if (floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.webContents.send('timer-status', status);
        }
    });

    ipcMain.on('set-timer-time', (event, data) => {
        setTimerTime(data.minutes, data.seconds);
    });

    ipcMain.on('save-default-time', (event, data) => {
        if (data.isWorking) {
            WORK_TIME = data.time;
        } else {
            REST_TIME = data.time;
        }
        // 如果当前处于对应模式，更新当前时间
        if (isWorking === data.isWorking && !timerInterval) {
            currentTime = data.time;
            broadcastTimerStatus();
        }
    });
}

app.whenReady().then(() => {
    // 集中存储必须先于窗口创建就绪：preload.js 会立刻 sendSync 来取快照
    try {
        const info = store.init();
        console.log('[store] 数据文件:', info.file, '| 已有副本:', info.hasStore, '| 键数:', info.keys);
    } catch (e) {
        console.error('[store] 初始化失败，将退回纯 localStorage 模式：', e);
    }

    // 主设置（API / 开机自启 / 快捷键）要在窗口之前就绪：API 可能一开机就要工作
    loadMainSettings();

    createWindow();
    // 只在应用启动时创建一次托盘
    createTray();

    // 应用级能力：AI 接入 API、开机自启、全局快捷键、任务提醒
    try {
        applyMainSettings();
        startReminderLoop();
        startWebhookLoop();
    } catch (e) {
        console.error('[boot] 应用级能力初始化失败：', e);
    }
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
        else if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
});

app.on('window-all-closed', () => {
    // 如果主窗口关闭但托盘还在，不退出
    if (!appIsQuitting) {
        return;
    }
    // 否则退出
    app.quit();
});

// 应用真正退出前
app.on('before-quit', () => {
    appIsQuitting = true;
    trayCreated = false; // 重置托盘标志

    // 注销全局快捷键、关闭 API 服务、停止提醒轮询，避免留下占用端口 / 热键的僵尸
    try {
        globalShortcut.unregisterAll();
    } catch (e) { /* ignore */ }
    try {
        api.stop();
    } catch (e) { /* ignore */ }
    if (reminderTimer) {
        clearInterval(reminderTimer);
        reminderTimer = null;
    }

    // 把最后一批写入落盘（平时是 180ms 合并写入，退出前必须强制刷一次）
    try {
        store.flushSync();
    } catch (e) {
        console.error('[store] 退出前落盘失败：', e);
    }
    
    // 清理托盘
    if (tray) {
        try {
            tray.destroy();
        } catch(e) {}
        tray = null;
    }
    
    // 清理所有窗口
    if (floatWindow && !floatWindow.isDestroyed()) {
        try {
            floatWindow.close();
        } catch(e) {}
        floatWindow = null;
    }
    
    if (mainWindow && !mainWindow.isDestroyed()) {
        try {
            mainWindow.close();
        } catch(e) {}
        mainWindow = null;
    }
});

// 更新托盘菜单
function updateTrayMenu() {
    if (!tray) return;
    
    const menuItems = [
        { 
            label: '📋 显示主窗口', 
            click: () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: isTimerRunning ? '⏸ 暂停' : '▶ 开始',
            click: () => toggleTimer()
        },
        {
            label: '🔄 切换模式',
            click: () => {
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
                isWorking = !isWorking;
                currentTime = isWorking ? WORK_TIME : REST_TIME;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('timer-status', {
                        isRunning: timerInterval !== null,
                        isWorking: isWorking,
                        currentTime: currentTime
                    });
                }
                if (floatWindow && !floatWindow.isDestroyed()) {
                    floatWindow.webContents.send('timer-status', {
                        isRunning: timerInterval !== null,
                        isWorking: isWorking,
                        currentTime: currentTime
                    });
                }
                updateTrayMenu();
            }
        },
        {
            label: floatWindow ? '❌ 关闭悬浮窗' : '📌 打开悬浮窗',
            click: () => {
                if (floatWindow && !floatWindow.isDestroyed()) {
                    floatWindow.close();
                } else {
                    toggleFloatWindow();
                }
            }
        },
        {
            label: mainSettings.api && mainSettings.api.enabled
                ? '🤖 AI 接口：已开启（' + mainSettings.api.port + '）'
                : '🤖 AI 接口：已关闭',
            click: () => {
                mainSettings.api.enabled = !mainSettings.api.enabled;
                saveMainSettings();
                applyMainSettings();
                updateTrayMenu();
            }
        },
        { type: 'separator' },
        { 
            label: '❌ 退出应用', 
            click: () => {
                console.log('用户选择退出应用');
                appIsQuitting = true;
                app.quit();
            }
        }
    ];
    
    // 如果悬浮窗打开了，添加悬浮窗锁定选项
    if (floatWindow && !floatWindow.isDestroyed()) {
        menuItems.splice(4, 0, {
            label: isWindowLocked ? '🔓 解锁悬浮窗' : '🔒 锁定悬浮窗',
            click: () => {
                isWindowLocked = !isWindowLocked;
                if (floatWindow && !floatWindow.isDestroyed()) {
                    floatWindow.setIgnoreMouseEvents(isWindowLocked);
                    floatWindow.webContents.send('set-locked', isWindowLocked);
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('float-locked-changed', isWindowLocked);
                    }
                }
                updateTrayMenu();
            }
        });
    }
    
    trayMenu = Menu.buildFromTemplate(menuItems);
    tray.setContextMenu(trayMenu);
}

// 创建托盘函数
function createTray() {
    // 如果已经创建过，直接返回
    if (trayCreated) {
        console.log('托盘已经创建过了');
        return;
    }
    
    // 安全检查：如果托盘已存在，先销毁
    if (tray) {
        try {
            tray.destroy();
        } catch(e) {}
        tray = null;
    }
    
    // 尝试加载托盘图标 - 优先使用用户新建的图标文件夹中的ICO文件
    const iconPath = path.join(__dirname, '图标', 'dstuy-bkp5e-001.ico');
    
    if (fs.existsSync(iconPath)) {
        try {
            tray = new Tray(iconPath);
            trayCreated = true;
            console.log('托盘创建成功');
        } catch(e) {
            console.log('托盘创建失败:', e);
            return;
        }
    } else {
        console.log('未找到图标文件');
        try {
            // 使用默认图标作为备选
            const fallbackIcon = path.join(__dirname, 'icon.ico');
            if (fs.existsSync(fallbackIcon)) {
                tray = new Tray(fallbackIcon);
                trayCreated = true;
            } else {
                // 创建一个简单的图标作为备选
                const { nativeImage } = require('electron');
                const emptyIcon = nativeImage.createEmpty();
                tray = new Tray(emptyIcon);
                trayCreated = true;
            }
        } catch(e) {
            console.log('托盘图标加载失败，不使用托盘:', e);
            return;
        }
    }
    
    updateTrayMenu();
    
    tray.setToolTip('专注计时器');
    
    // 左键单击显示/隐藏主窗口
    tray.on('click', (event, bounds) => {
        console.log('托盘左键点击');
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });
    
    // 右键单击显示菜单
    tray.on('right-click', (event, bounds) => {
        console.log('托盘右键点击');
        updateTrayMenu();
        if (tray && trayMenu) {
            tray.popUpContextMenu(trayMenu);
        }
    });
    
    console.log('托盘创建完成');
}

// 保存背景图片到用户数据目录
ipcMain.on('save-background-image', (event, data) => {
    try {
        console.log('开始保存背景图片');
        const { base64Data, fileName } = data;
        
        // 确保自定义Draws文件夹存在
        if (!fs.existsSync(customDrawsPath)) {
            fs.mkdirSync(customDrawsPath, { recursive: true });
        }
        
        // 将base64转换为buffer并保存
        const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const filePath = path.join(customDrawsPath, fileName);
        fs.writeFileSync(filePath, buffer);
        
        console.log('背景图片保存成功:', filePath);
        console.log('文件大小:', buffer.length, 'bytes');
        
        // 验证文件是否保存成功
        if (fs.existsSync(filePath)) {
            console.log('文件存在验证成功');
        } else {
            console.error('文件不存在');
        }
        
        event.reply('save-background-image-result', { success: true, filePath: filePath, fileName: fileName });
    } catch (e) {
        console.error('保存背景图片失败:', e);
        event.reply('save-background-image-result', { success: false, error: e.message });
    }
});

// 获取Draws文件夹中的所有背景图片
ipcMain.handle('get-background-images', async () => {
    try {
        const images = [];
        
        // 首先获取应用内默认背景
        const defaultDrawsPath = path.join(__dirname, 'Draws');
        if (fs.existsSync(defaultDrawsPath)) {
            const defaultFiles = fs.readdirSync(defaultDrawsPath);
            const defaultImageFiles = defaultFiles.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext);
            });
            images.push(...defaultImageFiles.map(file => ({
                name: file,
                path: path.join(defaultDrawsPath, file),
                isCustom: false,
                isLocal: true // 本地文件，可以用相对路径
            })));
        }
        
        // 然后获取用户自定义背景，转为base64
        if (fs.existsSync(customDrawsPath)) {
            const customFiles = fs.readdirSync(customDrawsPath);
            const customImageFiles = customFiles.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext);
            });
            
            for (const file of customImageFiles) {
                const filePath = path.join(customDrawsPath, file);
                const fileData = fs.readFileSync(filePath);
                const base64 = fileData.toString('base64');
                const mimeType = getMimeType(file);
                const dataUrl = `data:${mimeType};base64,${base64}`;
                
                images.push({
                    name: file,
                    path: filePath,
                    isCustom: true,
                    dataUrl: dataUrl // 自定义文件用data URL
                });
            }
        }
        
        console.log('获取到背景图片:', images.length, '张');
        return images;
    } catch (e) {
        console.error('获取背景图片列表失败:', e);
        return [];
    }
});

// 辅助函数：获取文件的MIME类型
function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.gif': return 'image/gif';
        case '.webp': return 'image/webp';
        case '.bmp': return 'image/bmp';
        case '.svg': return 'image/svg+xml';
        case '.ico': return 'image/x-icon';
        // 2026-11-06：视频也能像图片一样收纳 / 显示
        case '.mp4': return 'video/mp4';
        case '.m4v': return 'video/x-m4v';
        case '.webm': return 'video/webm';
        case '.mov': return 'video/quicktime';
        case '.ogv':
        case '.ogg': return 'video/ogg';
        case '.mp3': return 'audio/mpeg';
        case '.wav': return 'audio/wav';
        default: return 'image/png';
    }
}

// 删除自定义背景图片
ipcMain.on('delete-background-image', (event, fileName) => {
    try {
        const filePath = path.join(customDrawsPath, fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('删除背景图片成功:', filePath);
            event.reply('delete-background-image-result', { success: true });
        } else {
            event.reply('delete-background-image-result', { success: false, error: '文件不存在' });
        }
    } catch (e) {
        console.error('删除背景图片失败:', e);
        event.reply('delete-background-image-result', { success: false, error: e.message });
    }
});

// ============ 图片统一处理（渲染进程粘贴 / API 注入 / 剪贴板共用） ============

/**
 * 把图片二进制写入 <userData>/NoteImages，返回 file:// URL。
 * 用 SHA-256 做指纹去重：同一张图无论从哪条路径进来都只存一份（类似 Telegram）。
 */
function saveImageBuffer(buffer, ext) {
    if (!fs.existsSync(noteImagesPath)) {
        fs.mkdirSync(noteImagesPath, { recursive: true });
    }
    if (!ext || !/^[a-z0-9]{2,5}$/i.test(ext)) ext = 'png';
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const fileName = 'img_' + hash + '.' + ext.toLowerCase();
    const filePath = path.join(noteImagesPath, fileName);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, buffer);
    }
    // 自动转换为标准的 file URL（处理了盘符、中文字符与空格的 URL 编码）
    return nodeUrl.pathToFileURL(filePath).href;
}

/**
 * 把 base64 / dataURL 转成 file:// URL。
 * 【2026-11-06】图片 / SVG / 视频统一走 media-format：
 *   data:image/svg+xml;base64,… 以前被 `data:image/(\w+);base64` 正则漏掉，存出来是坏 PNG；
 *   视频（video/mp4 等）以前完全没有入口。
 */
function saveImageFromBase64(base64Data) {
    const parsed = mediaFormat.parseDataUrl(base64Data);
    if (!parsed.buffer.length) throw new Error('媒体数据为空');
    if (parsed.buffer.length > mediaFormat.MAX_MEDIA_BYTES) {
        throw new Error('文件超过 ' + Math.round(mediaFormat.MAX_MEDIA_BYTES / 1024 / 1024) + 'MB，未保存');
    }
    return saveImageBuffer(parsed.buffer, parsed.ext);
}

/** 从网络下载媒体（图片 / SVG / 视频；AI 注入与网页粘贴都走这里） */
async function downloadImage(url) {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error('下载文件失败：HTTP ' + res.status);
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > mediaFormat.MAX_MEDIA_BYTES) {
        throw new Error('文件超过 ' + Math.round(mediaFormat.MAX_MEDIA_BYTES / 1024 / 1024) + 'MB，未保存');
    }
    const type = res.headers.get('content-type') || '';
    // Content-Type 优先；服务器给 application/octet-stream 时再看 URL 扩展名
    const ext = mediaFormat.extFromContentType(type) || mediaFormat.extFromUrl(url) || 'png';
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) throw new Error('下载到的文件为空');
    if (buffer.length > mediaFormat.MAX_MEDIA_BYTES) {
        throw new Error('文件超过 ' + Math.round(mediaFormat.MAX_MEDIA_BYTES / 1024 / 1024) + 'MB，未保存');
    }
    return saveImageBuffer(buffer, ext);
}

/**
 * 从本地文件收纳进媒体库（API 传入路径 / 从资源管理器粘贴）。
 * 【2026-11-06】视频几十上百 MB，不能整个 readFile 进内存：
 * 先流式算 SHA-256，再用 copyFile 复制；同一个文件只存一份。
 */
function saveImageFromPath(filePath) {
    let p = String(filePath);
    if (p.indexOf('file://') === 0) p = nodeUrl.fileURLToPath(p);
    const stat = fs.statSync(p);
    if (!stat.isFile()) throw new Error('不是一个文件：' + p);
    if (stat.size > mediaFormat.MAX_MEDIA_BYTES) {
        throw new Error('文件超过 ' + Math.round(mediaFormat.MAX_MEDIA_BYTES / 1024 / 1024) + 'MB，未保存');
    }
    if (!fs.existsSync(noteImagesPath)) fs.mkdirSync(noteImagesPath, { recursive: true });

    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(p, 'r');
    try {
        const chunk = Buffer.alloc(1024 * 1024);
        let read;
        while ((read = fs.readSync(fd, chunk, 0, chunk.length, null)) > 0) {
            hash.update(chunk.subarray(0, read));
        }
    } finally {
        fs.closeSync(fd);
    }

    let ext = path.extname(p).replace('.', '').toLowerCase();
    if (!mediaFormat.isMediaExt(ext)) ext = 'png';
    const fileName = 'img_' + hash.digest('hex') + '.' + ext;
    const target = path.join(noteImagesPath, fileName);
    if (!fs.existsSync(target)) fs.copyFileSync(p, target);
    return nodeUrl.pathToFileURL(target).href;
}

/**
 * 统一的图片入口：
 *   { data: 'dataURL 或 base64' } / { url: 'https://...' } / { path: 'C:\\...' } / '字符串'
 * 返回 file:// URL，失败抛错由调用方决定如何处理。
 */
async function saveImageFromInput(input) {
    let spec = input;
    if (typeof spec === 'string') spec = { data: spec };
    if (!spec || typeof spec !== 'object') throw new Error('图片格式不正确');
    if (spec.data) return saveImageFromBase64(spec.data);
    if (spec.url) return await downloadImage(String(spec.url));
    if (spec.path) return saveImageFromPath(String(spec.path));
    throw new Error('图片缺少 data / url / path 字段');
}

/** 读取已入库图片的二进制（供写剪贴板用）：支持 file:// URL 与普通路径 */
async function readImageFile(fileUrl) {
    const p = String(fileUrl).startsWith('file://') ? nodeUrl.fileURLToPath(fileUrl) : fileUrl;
    return fs.readFileSync(p);
}

/**
 * 把一段 HTML 里的远程图片与 base64 图片全部本地化。
 * 目的：AI 注入 / 从别处粘来的内容不会因为链接失效而变成裂图。
 */
async function localizeHtmlImages(html) {
    if (!html || html.indexOf('<img') === -1) return html;
    const imgRegex = /<img\b[^>]*?src\s*=\s*["']([^"']+)["'][^>]*>/gi;
    const jobs = [];
    let m;
    while ((m = imgRegex.exec(html)) !== null) {
        const src = m[1];
        if (/^https?:\/\//i.test(src)) jobs.push({ src, input: { url: src } });
        else if (src.indexOf('data:image') === 0) jobs.push({ src, input: { data: src } });
    }
    if (jobs.length === 0) return html;
    let out = html;
    for (const job of jobs) {
        try {
            const fileUrl = await saveImageFromInput(job.input);
            // 只替换这一处 src，避免误伤同名的其它属性
            out = out.split('"' + job.src + '"').join('"' + fileUrl + '"')
                     .split("'" + job.src + "'").join("'" + fileUrl + "'");
        } catch (e) {
            console.warn('[image] 本地化失败，保留原地址：', job.src, e.message);
        }
    }
    return out;
}

// 保存卡片/笔记中的图片到本地，避免使用 Base64，并通过 SHA-256 哈希去重（类似 Telegram）
ipcMain.handle('save-note-image', async (event, base64Data) => {
    try {
        return saveImageFromBase64(base64Data);
    } catch (e) {
        console.error('保存笔记图片失败:', e);
        throw e;
    }
});

// 从「网络地址 / 本地路径」收纳图片：粘贴外部图片、AI 注入远程图片都走这里
ipcMain.handle('save-note-image-source', async (event, input) => {
    try {
        return await saveImageFromInput(input);
    } catch (e) {
        console.error('保存外部图片失败:', e);
        throw e;
    }
});

/* ==================== 任意附件（2026-11-06） ====================
 * Word / PPT / PDF / APK / ZIP… 用户想放什么就放什么：
 *  · 单文件上限 1GB（再大就不是「随手记」的场景了）
 *  · 按内容 SHA-256 去重，同一份文件只占一份磁盘
 *  · 文件名保留原样，只在磁盘上用 f_<hash> 存储，界面显示原名
 *  · ZIP 系（含 APK / DOCX / XLSX / PPTX）额外支持「点进去看内部清单 + 图片预览」
 */
const MAX_ATTACH_BYTES = 1024 * 1024 * 1024;
const ARCHIVE_PREVIEW_BYTES = 300 * 1024 * 1024;

function toLocalPath(target) {
    const s = String(target || '');
    if (!s) return '';
    if (s.indexOf('file://') === 0) {
        try { return nodeUrl.fileURLToPath(s); } catch (e) { return ''; }
    }
    return s;
}

/** 只看文件头 4 字节判断是不是 ZIP 系，不读整个文件 */
function detectArchive(localPath) {
    try {
        const fd = fs.openSync(localPath, 'r');
        try {
            const head = Buffer.alloc(4);
            const n = fs.readSync(fd, head, 0, 4, 0);
            return n === 4 && archive.isZip(head);
        } finally {
            fs.closeSync(fd);
        }
    } catch (e) {
        return false;
    }
}

/** 附件入库：流式算哈希（大文件不进内存），同内容复用已有文件 */
function saveAttachmentFromPath(filePath) {
    const p = toLocalPath(filePath);
    if (!p) throw new Error('文件路径为空');
    const stat = fs.statSync(p);
    if (!stat.isFile()) throw new Error('不是一个文件：' + p);
    if (stat.size > MAX_ATTACH_BYTES) {
        throw new Error('文件超过 ' + Math.round(MAX_ATTACH_BYTES / 1024 / 1024) + 'MB，未保存');
    }
    if (!fs.existsSync(noteFilesPath)) fs.mkdirSync(noteFilesPath, { recursive: true });

    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(p, 'r');
    try {
        const chunk = Buffer.alloc(1024 * 1024);
        let read;
        while ((read = fs.readSync(fd, chunk, 0, chunk.length, null)) > 0) {
            hash.update(chunk.subarray(0, read));
        }
    } finally {
        fs.closeSync(fd);
    }

    let ext = path.extname(p).replace('.', '').toLowerCase();
    if (!/^[a-z0-9]{1,12}$/.test(ext)) ext = '';
    const fileName = 'f_' + hash.digest('hex').slice(0, 32) + (ext ? '.' + ext : '');
    const target = path.join(noteFilesPath, fileName);
    if (!fs.existsSync(target)) fs.copyFileSync(p, target);

    return {
        url: nodeUrl.pathToFileURL(target).href,
        name: path.basename(p),
        size: stat.size,
        ext: ext,
        archive: detectArchive(target)
    };
}

/** 压缩包读取缓存：同一个包连续点条目时不用重复读盘 */
let archiveCache = null;
function loadArchive(localPath) {
    const stat = fs.statSync(localPath);
    if (!stat.isFile()) throw new Error('压缩包不存在');
    if (archiveCache && archiveCache.path === localPath &&
        archiveCache.size === stat.size && archiveCache.mtimeMs === stat.mtimeMs) {
        return archiveCache;
    }
    if (stat.size > ARCHIVE_PREVIEW_BYTES) {
        throw new Error('压缩包超过 ' + Math.round(ARCHIVE_PREVIEW_BYTES / 1024 / 1024) +
            'MB，暂不预览（可以直接用默认程序打开）');
    }
    const buf = fs.readFileSync(localPath);
    const entries = archive.listEntries(buf);
    archiveCache = { path: localPath, size: stat.size, mtimeMs: stat.mtimeMs, buf: buf, entries: entries };
    return archiveCache;
}

const ENTRY_TEXT_EXT = /^(txt|md|markdown|json|xml|html|htm|css|js|ts|log|csv|tsv|ini|yml|yaml)$/i;
const ENTRY_IMAGE_EXT = /^(png|jpe?g|gif|webp|bmp|svg|ico|avif)$/i;

function entryKind(name) {
    const ext = String(name).split('.').pop().toLowerCase();
    if (ENTRY_IMAGE_EXT.test(ext)) return 'image';
    if (ENTRY_TEXT_EXT.test(ext)) return 'text';
    return 'other';
}

// 选文件 → 入库（桌面端「插入文件」按钮）
ipcMain.handle('file:pick', async (event) => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const res = await dialog.showOpenDialog(win, {
        title: '选择要插入的文件',
        properties: ['openFile', 'multiSelections']
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true, files: [] };
    const files = [];
    const errors = [];
    for (const p of res.filePaths) {
        try {
            files.push(saveAttachmentFromPath(p));
        } catch (e) {
            errors.push(path.basename(p) + '：' + e.message);
        }
    }
    return { ok: files.length > 0, canceled: false, files: files, errors: errors };
});

// 粘贴 / 拖入的文件（渲染进程拿到 File 对象后传真实路径）
ipcMain.handle('file:save-from-path', async (event, input) => {
    const p = typeof input === 'string' ? input : (input && input.path);
    return saveAttachmentFromPath(p);
});

// 用系统默认程序打开附件
ipcMain.handle('file:open', async (event, target) => {
    const p = toLocalPath(target);
    if (!p || !fs.existsSync(p)) return { ok: false, error: '文件不存在' };
    const err = await shell.openPath(p);
    return err ? { ok: false, error: err } : { ok: true };
});

// 在资源管理器里定位附件
ipcMain.handle('file:reveal', async (event, target) => {
    const p = toLocalPath(target);
    if (!p || !fs.existsSync(p)) return { ok: false, error: '文件不存在' };
    shell.showItemInFolder(p);
    return { ok: true };
});

/* ==================== 外部编辑器（CR-020）====================
 * 「哪个文件用谁打开」全部由 editor-provider.js 那张表决定，主进程只负责两件事：
 *   1. 探测某个 Craft 应用装没装（按 exe 名扫 PATH 和常见安装目录，结果缓存 60 秒）
 *   2. 按 id 拉起一个独立进程，把文件路径传给它
 * 这样加第 14 个编辑器 = 表里加一行，这里一行代码都不用改。
 */

const EXTERNAL_CONFIG_FILE = () => path.join(app.getPath('userData'), 'external-editors.json');
let externalDetectCache = null;
let externalDetectAt = 0;
const EXTERNAL_CACHE_MS = 60 * 1000;

/** 用户手动指定的路径（装在 D 盘、绿色版之类），优先于自动探测 */
function loadExternalCustom() {
    try {
        const p = EXTERNAL_CONFIG_FILE();
        if (!fs.existsSync(p)) return {};
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        return (raw && typeof raw === 'object') ? raw : {};
    } catch (e) {
        console.error('读取外部编辑器配置失败:', e);
        return {};
    }
}

function saveExternalCustom(map) {
    try {
        fs.writeFileSync(EXTERNAL_CONFIG_FILE(), JSON.stringify(map, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('保存外部编辑器配置失败:', e);
        return false;
    }
}

/** 该程序可能出现在哪些位置：先 PATH，再几种常见的安装布局 */
function externalCandidates(provider) {
    const out = [];
    const exeNames = [provider.exe + '.exe', provider.name + '.exe'];
    const dirs = String(process.env.PATH || '').split(path.delimiter).filter(Boolean);
    exeNames.forEach(n => dirs.forEach(d => {
        try { out.push(path.join(d, n)); } catch (e) { /* 路径非法，跳过 */ }
    }));

    const bases = [];
    const push = b => { if (b && bases.indexOf(b) < 0) bases.push(b); };
    push(process.env.ProgramFiles);
    push(process.env['ProgramFiles(x86)']);
    push(process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs'));
    push(process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ArtCraft'));
    push(process.env.LOCALAPPDATA);
    push('C:\\Program Files');
    push('C:\\Program Files (x86)');

    const folders = [provider.name, provider.exe, 'ArtCraft\\' + provider.name, 'ArtCraft'];
    bases.forEach(b => {
        folders.forEach(f => {
            exeNames.forEach(n => {
                try { out.push(path.join(b, f, n)); } catch (e) { /* ignore */ }
            });
        });
    });
    return out;
}

function locateExternal(provider) {
    const custom = loadExternalCustom();
    if (custom[provider.id] && fs.existsSync(custom[provider.id])) return custom[provider.id];
    for (const p of externalCandidates(provider)) {
        try {
            if (p && fs.existsSync(p)) return p;
        } catch (e) { /* 权限不足的目录直接跳过 */ }
    }
    return '';
}

/** 探测所有外部编辑器；force=true 时绕过缓存（用户刚装完程序） */
function detectExternal(force) {
    const now = Date.now();
    if (!force && externalDetectCache && (now - externalDetectAt) < EXTERNAL_CACHE_MS) {
        return externalDetectCache;
    }
    const map = {};
    editorProvider.externalProviders().forEach(p => {
        const found = locateExternal(p);
        if (found) map[p.id] = found;
    });
    externalDetectCache = map;
    externalDetectAt = now;
    return map;
}

ipcMain.handle('external:detect', async (event, opts) => {
    const force = !!(opts && opts.force);
    if (force) externalDetectCache = null;
    const installed = detectExternal(force);
    return {
        ok: true,
        installed: installed,
        custom: loadExternalCustom(),
        list: editorProvider.externalProviders().map(p => ({
            id: p.id,
            name: p.name,
            exts: p.exts,
            hint: p.hint || '',
            installed: !!installed[p.id],
            path: installed[p.id] || ''
        }))
    };
});

// 手动指定某个编辑器的 exe 路径（传空字符串则清除）
ipcMain.handle('external:set-path', async (event, input) => {
    const id = input && input.id;
    const target = String((input && input.path) || '').trim();
    const provider = editorProvider.getById(id);
    if (!provider || provider.kind !== 'external') {
        return { ok: false, error: '未知的编辑器：' + id };
    }
    if (target && !fs.existsSync(target)) {
        return { ok: false, error: '路径不存在：' + target };
    }
    const custom = loadExternalCustom();
    if (target) custom[id] = target;
    else delete custom[id];
    if (!saveExternalCustom(custom)) return { ok: false, error: '配置写入失败' };
    externalDetectCache = null;
    return { ok: true, installed: detectExternal(true) };
});

// 用指定编辑器打开附件
/* ==================== 与创作台互通 ==================== */

/**
 * 【2026-11-06 CR-022】把文件送到「创作台」。
 *
 * 两条路，优先第一条：
 *   ① 直接 spawn 创作台的 exe，把 workbench:// 链接当参数传进去（不依赖协议注册）
 *   ② 退回 shell.openExternal，让 Windows 自己按协议找程序
 * 第①条存在的原因：协议注册是「创作台首次运行」才写进注册表的，
 * 用户先装计时器后装创作台时，第②条会静默失效。
 */
function locateWorkbench() {
    const exeNames = ['创作台.exe', 'Workbench.exe', 'workbench.exe'];
    const bases = [
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs'),
        process.env.ProgramFiles,
        process.env['ProgramFiles(x86)'],
        'C:\\Program Files',
        'D:\\Program',
        'E:\\Programs',
        'D:\\Programs',
        'E:\\Program Files'
    ].filter(Boolean);
    const folders = ['创作台\\dist\\win-unpacked', '创作台', 'Workbench\\dist\\win-unpacked', 'Workbench', 'workbench'];

    for (const base of bases) {
        for (const folder of folders) {
            for (const name of exeNames) {
                const p = path.join(base, folder, name);
                try {
                    if (fs.existsSync(p)) return p;
                } catch (e) { /* 权限不足的目录跳过 */ }
            }
        }
    }
    return '';
}

ipcMain.handle('workbench:open', async (event, input) => {
    try {
        const target = (input && input.target) || '';
        const p = toLocalPath(target);
        if (!p || !fs.existsSync(p)) return { ok: false, error: '文件不存在' };

        // 【CR-028】可以指定落到哪个内嵌应用：计时器右键图片时传 app=<craft id>。
        // 渲染层原来传的 provider 只是 'workbench'（来源标记），不是应用 id，别拿来当 app。
        let app = (input && input.app) || '';
        if (!app && input && input.provider && input.provider !== 'workbench') app = input.provider;
        const q = ['path=' + encodeURIComponent(p)];
        if (app) q.push('app=' + encodeURIComponent(app));
        const url = 'workbench://open?' + q.join('&');

        const exe = locateWorkbench();
        if (exe) {
            const child = require('child_process').spawn(exe, [url], { detached: true, stdio: 'ignore' });
            child.unref();
            return { ok: true, via: 'spawn', exe: exe };
        }

        // 没找到安装目录：交给协议。协议没注册时 Windows 会弹「选择打开方式」
        await shell.openExternal(url);
        return { ok: true, via: 'protocol' };
    } catch (e) {
        console.error('唤起创作台失败:', e);
        return { ok: false, error: (e && e.message) || String(e) };
    }
});

ipcMain.handle('external:open', async (event, input) => {
    try {
        const id = input && input.id;
        const provider = editorProvider.getById(id);
        if (!provider || provider.kind !== 'external') {
            return { ok: false, error: '未知的编辑器：' + id };
        }
        const exe = detectExternal(false)[id];
        if (!exe) return { ok: false, error: provider.name + ' 未安装' };

        const p = toLocalPath(input && input.target);
        if (!p || !fs.existsSync(p)) return { ok: false, error: '文件不存在' };

        const { spawn } = require('child_process');
        const child = spawn(exe, [p], { detached: true, stdio: 'ignore' });
        child.unref();
        return { ok: true, exe: exe, name: provider.name };
    } catch (e) {
        console.error('启动外部编辑器失败:', e);
        return { ok: false, error: (e && e.message) || String(e) };
    }
});

// 列出压缩包内部条目
ipcMain.handle('archive:list', async (event, target) => {
    try {
        const p = toLocalPath(target);
        const cache = loadArchive(p);
        const summary = archive.summarize(cache.entries);
        return {
            ok: true,
            name: path.basename(p),
            summary: summary,
            truncated: cache.entries.length >= archive.MAX_ENTRIES,
            entries: cache.entries.map(e => ({
                name: e.name,
                dir: e.dir,
                size: e.size,
                encrypted: e.encrypted,
                kind: e.dir ? 'dir' : entryKind(e.name)
            }))
        };
    } catch (e) {
        return { ok: false, error: e.message || String(e) };
    }
});

// 读取压缩包内单个条目：图片给 dataURL，文本给内容，其余只回元信息
ipcMain.handle('archive:entry', async (event, input) => {
    try {
        const target = input && (input.url || input.path || input.target);
        const name = input && input.name;
        const cache = loadArchive(toLocalPath(target));
        const entry = cache.entries.find(e => e.name === name);
        if (!entry) return { ok: false, error: '压缩包里找不到这个条目' };
        const data = archive.extractEntry(cache.buf, entry);
        const kind = entryKind(entry.name);
        if (kind === 'image') {
            const mime = getMimeType(entry.name);
            return { ok: true, kind: 'image', size: data.length,
                dataUrl: 'data:' + mime + ';base64,' + data.toString('base64') };
        }
        if (kind === 'text') {
            return { ok: true, kind: 'text', size: data.length,
                text: data.subarray(0, 200 * 1024).toString('utf8') };
        }
        return { ok: true, kind: 'other', size: data.length };
    } catch (e) {
        return { ok: false, error: e.message || String(e) };
    }
});

// 深度图片垃圾回收 (GC)：清理无人引用的孤立本地图片文件，防止磁盘泄露
ipcMain.handle('cleanup-unused-images', async (event, usedFileNames) => {
    try {
        if (!fs.existsSync(noteImagesPath)) {
            return { success: true, deletedCount: 0 };
        }
        
        const files = fs.readdirSync(noteImagesPath);
        let deletedCount = 0;
        
        // 转换引用列表为 Set 加快查找
        const usedSet = new Set(usedFileNames);
        // 【2026-10-20】保护期：最近 24 小时内写入的图片一律不删。
        // 异常关闭后 localStorage 可能落后于磁盘（任务里还来不及写入图片引用），
        // 这时按旧数据做 GC 会把刚粘贴的图片当成“孤儿”删掉，重开就没了。
        // 宁可多留一天，也不要误删用户刚存的图。
        const GRACE_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        files.forEach(file => {
            // 只清理 img_ 开头的文件，保证安全性，避免误删其他文件
            if (file.startsWith('img_') && !usedSet.has(file)) {
                try {
                    const filePath = path.join(noteImagesPath, file);
                    const stat = fs.statSync(filePath);
                    if (now - stat.mtimeMs < GRACE_MS) {
                        return; // 保护期内：跳过
                    }
                    fs.unlinkSync(filePath);
                    console.log('图片垃圾回收成功删除孤立文件:', file);
                    deletedCount++;
                } catch (err) {
                    console.error('垃圾回收删除图片失败:', file, err);
                }
            }
        });
        
        console.log(`智能图片垃圾回收(GC)执行完毕，共清除 ${deletedCount} 个孤立文件。`);
        return { success: true, deletedCount: deletedCount };
    } catch (e) {
        console.error('智能图片垃圾回收(GC)执行失败:', e);
        return { success: false, error: e.message };
    }
});

// ============ 剪贴板桥接：让应用与微信可以互相粘贴图片 ============

/**
 * 读取剪贴板里的图片。
 * 微信 / 截图工具复制的图片通常只以位图（CF_DIB / CF_BITMAP）形式存在，
 * 网页的 paste 事件里既没有 files 也没有 items，所以必须由主进程直接从系统剪贴板读。
 */
ipcMain.handle('clipboard:read-image', async () => {
    try {
        const formats = clipboard.availableFormats().slice(0, 12);
        const img = clipboard.readImage();
        if (!img || img.isEmpty()) return { ok: false, formats: formats };
        return { ok: true, dataUrl: img.toDataURL(), size: img.getSize(), formats: formats };
    } catch (e) {
        console.error('[clipboard] 读取图片失败：', e);
        return { ok: false, error: e.message };
    }
});

/**
 * 读取系统剪贴板里的 HTML（CF_HTML）。
 * 【2026-11-05】腾讯文档 / 在线表格复制表格时，网页 paste 事件的 clipboardData 偶尔
 * 只给自定义格式、text/plain 又是空的，渲染进程会以为「什么都没复制」。
 * 这里由主进程直读系统剪贴板作为最后一道兜底，渲染进程再交给 clipboard-table.js 解析。
 */
ipcMain.handle('clipboard:read-html', async () => {
    try {
        const formats = clipboard.availableFormats();
        const html = clipboard.readHTML();
        return { ok: !!html, html: html || '', formats: formats.slice(0, 20) };
    } catch (e) {
        console.error('[clipboard] 读取 HTML 失败：', e);
        return { ok: false, html: '', error: e.message };
    }
});

/**
 * 把图片写进系统剪贴板，使其可以粘贴到微信等外部软件。
 *  mode='bitmap'：写位图（Chromium 会同时提供 DIB 与 PNG，绝大多数程序可用）
 *  mode='file'  ：写文件拖放列表（CF_HDROP）——粘贴图片文件，微信一定认
 */
ipcMain.handle('clipboard:write-image', async (event, src, mode) => {
    try {
        let buffer = null;
        if (typeof src === 'string' && src.indexOf('data:image') === 0) {
            buffer = Buffer.from(src.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        } else {
            let fileUrl = src;
            if (typeof src === 'string' && /^https?:/i.test(src)) fileUrl = await saveImageFromInput({ url: src });
            buffer = await readImageFile(fileUrl);
        }
        const image = nativeImage.createFromBuffer(buffer);
        if (image.isEmpty()) return { ok: false, error: '图片解析失败' };

        if (mode === 'file') {
            const ok = await copyImageAsFile(image, buffer);
            if (ok) return { ok: true, mode: 'file', size: image.getSize() };
            // 文件方式失败时退回位图，保证「复制」这个动作一定成功
            clipboard.writeImage(image);
            return { ok: true, mode: 'bitmap(fallback)', size: image.getSize() };
        }

        clipboard.writeImage(image);
        return { ok: true, mode: 'bitmap', size: image.getSize() };
    } catch (e) {
        console.error('[clipboard] 写入图片失败：', e);
        return { ok: false, error: e.message };
    }
});

/**
 * 把应用内图片（file:// / 本地路径 / NoteImages 相对路径 / 网络地址）读成 data URL。
 * 复制「图文混排」到剪贴板时，HTML 里的图片必须内嵌为 data URL，
 * 否则企业微信 / Word / 邮件客户端都读不到 file:// 路径。
 */
ipcMain.handle('image:to-data-url', async (event, src) => {
    try {
        if (typeof src !== 'string' || !src) return { ok: false, error: '图片地址为空' };
        if (src.indexOf('data:image/png') === 0) {
            const img = nativeImage.createFromDataURL(src);
            return { ok: true, dataUrl: src, size: img.isEmpty() ? null : img.getSize() };
        }
        let fileUrl = src;
        if (/^https?:/i.test(src)) fileUrl = await saveImageFromInput({ url: src });
        let filePath = fileUrl;
        if (fileUrl.startsWith('file://')) filePath = nodeUrl.fileURLToPath(fileUrl);
        else if (!path.isAbsolute(filePath)) {
            // 兼容网页版约定的相对路径 NoteImages/img_xxx.png
            filePath = path.join(noteImagesPath, path.basename(filePath));
        }
        const buffer = fs.readFileSync(filePath);
        // 统一转成 PNG：剪贴板 HTML / RTF 都以 PNG 内嵌，兼容性最好
        const image = nativeImage.createFromBuffer(buffer);
        if (!image.isEmpty()) {
            return { ok: true, dataUrl: 'data:image/png;base64,' + image.toPNG().toString('base64'), size: image.getSize() };
        }
        const ext = path.extname(filePath).replace('.', '').toLowerCase();
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
            : ext === 'gif' ? 'image/gif'
            : ext === 'webp' ? 'image/webp'
            : ext === 'bmp' ? 'image/bmp'
            : ext === 'svg' ? 'image/svg+xml'
            : ext === 'mp4' ? 'video/mp4'
            : ext === 'm4v' ? 'video/x-m4v'
            : ext === 'webm' ? 'video/webm'
            : ext === 'mov' ? 'video/quicktime'
            : ext === 'ogv' || ext === 'ogg' ? 'video/ogg'
            : 'image/png';
        return { ok: true, dataUrl: 'data:' + mime + ';base64,' + buffer.toString('base64'), bytes: buffer.length };
    } catch (e) {
        console.error('[clipboard] 图片转 data URL 失败：', e);
        return { ok: false, error: e.message };
    }
});

/**
 * 一次性写入「文字 + HTML + RTF + 位图」到系统剪贴板。
 * 应用内全选复制时用：外部编辑器拿 HTML/RTF 保留图片，聊天工具拿位图。
 */
ipcMain.handle('clipboard:write-rich', async (event, payload) => {
    try {
        const p = payload || {};
        const data = {};
        if (typeof p.text === 'string' && p.text) data.text = p.text;
        if (typeof p.html === 'string' && p.html) data.html = p.html;
        if (typeof p.rtf === 'string' && p.rtf) data.rtf = p.rtf;
        if (typeof p.imageDataUrl === 'string' && p.imageDataUrl.indexOf('data:image') === 0) {
            const img = nativeImage.createFromDataURL(p.imageDataUrl);
            if (!img.isEmpty()) data.image = img;
        }
        if (Object.keys(data).length === 0) return { ok: false, error: '没有可写入剪贴板的内容' };
        clipboard.write(data);
        return { ok: true, formats: Object.keys(data) };
    } catch (e) {
        console.error('[clipboard] 写入图文失败：', e);
        return { ok: false, error: e.message };
    }
});

/** 把图片导出成临时 PNG 文件并用文件拖放列表占位剪贴板（微信粘贴的稳妥路径） */
function copyImageAsFile(image, buffer) {
    return new Promise(resolve => {
        try {
            const dir = path.join(app.getPath('userData'), 'ClipboardExport');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const filePath = path.join(dir, 'clipboard-image.png');
            fs.writeFileSync(filePath, buffer || image.toPNG());
            if (process.platform !== 'win32') {
                // 非 Windows 没有 PowerShell，直接放弃这条路
                return resolve(false);
            }
            const { execFile } = require('child_process');
            const ps = [
                '-NoProfile', '-NonInteractive', '-STA', '-Command',
                'Add-Type -AssemblyName System.Windows.Forms;' +
                '$c = New-Object System.Collections.Specialized.StringCollection;' +
                '$c.Add(' + JSON.stringify(filePath).replace(/"/g, "'") + ');' +
                '[System.Windows.Forms.Clipboard]::SetFileDropList($c)'
            ];
            execFile('powershell.exe', ps, { timeout: 8000, windowsHide: true }, err => {
                if (err) {
                    console.warn('[clipboard] 文件方式写入失败：', err.message);
                    return resolve(false);
                }
                resolve(true);
            });
        } catch (e) {
            console.warn('[clipboard] 文件方式写入异常：', e.message);
            resolve(false);
        }
    });
}

// ============ 主进程 ⇄ 渲染进程的请求应答（供 API 调用任务能力） ============

const pendingApiRequests = new Map();
let apiRequestSeq = 0;

/**
 * API 收到的任务操作最终都交给渲染进程执行 —— 任务是渲染进程的内存对象，
 * 只有它才能走完整的「保存 + 重渲染 + 同步悬浮窗 + 图片回收」链路。
 */
function invokeRenderer(op, payload) {
    return new Promise((resolve, reject) => {
        if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) {
            return reject(new Error('主窗口未就绪，请先把主窗口显示出来'));
        }
        const reqId = ++apiRequestSeq;
        const timer = setTimeout(() => {
            pendingApiRequests.delete(reqId);
            reject(new Error('渲染进程响应超时（10s）'));
        }, 10000);
        pendingApiRequests.set(reqId, { resolve: resolve, reject: reject, timer: timer });
        mainWindow.webContents.send('api:task-request', { reqId: reqId, op: op, payload: payload || {} });
    });
}

ipcMain.on('api:task-reply', (event, msg) => {
    if (!msg || msg.reqId === undefined) return;
    const entry = pendingApiRequests.get(msg.reqId);
    if (!entry) return;
    clearTimeout(entry.timer);
    pendingApiRequests.delete(msg.reqId);
    if (msg.ok) entry.resolve(msg.data);
    else entry.reject(new Error(msg.error || '渲染进程处理失败'));
});

// ============ 本地 AI 接入 API ============

const api = createApiServer({
    version: () => app.getVersion(),
    invokeRenderer: invokeRenderer,
    timer: {
        status: () => getTimerStatus(),
        start: () => { if (!timerInterval) toggleTimer(); },
        pause: () => { if (timerInterval) toggleTimer(); },
        toggle: () => toggleTimer(),
        reset: () => resetTimer(),
        switchMode: () => switchMode(),
        setTime: (m, s) => setTimerTime(m, s)
    },
    saveImage: input => saveImageFromInput(input),
    readImageFile: fileUrl => readImageFile(fileUrl),
    localizeHtml: html => localizeHtmlImages(html),
    getSetting: key => store.getItem(key),
    setSetting: (key, value) => {
        store.setItem(key, String(value));
        // 让界面立刻跟上（渲染进程按 key 决定怎么应用）
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('api:apply-setting', { key: key, value: String(value) });
        }
    },
    getAllSettings: () => store.getAll(),
    notify: (title, body) => {
        try {
            new Notification({ title: title, body: body }).show();
        } catch (e) {
            console.error('[notify] 通知失败：', e.message);
        }
    },
    showWindow: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
        }
    },
    hideWindow: () => {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) mainWindow.hide();
    },
    toggleFloat: () => toggleFloatWindow(),
    isFloatOpen: () => !!(floatWindow && !floatWindow.isDestroyed()),
    webhook: {
        // 【2026-09-30】info 改为返回完整配置快照（含 schemaFields+enum / mapping / constants），
        // 这样 AI 或脚本能通过 API 读懂当前映射，不必再去设置面板里看。
        info: () => webhook.info(),
        // 允许通过 API 改配置（地址/开关/事件/映射/固定文本/record_id 回填）
        setConfig: patch => webhook.updateConfig(patch || {}),
        parse: text => webhook.parseSchema(text),
        test: () => webhook.test(),
        push: (action, tasks, opts) => webhook.push(action, tasks, opts)
    }
});

// ============ WebHook：把任务变化同步到外部表格 ============

/** 展示时隐藏 webhook 的 key，避免整串密钥被截图外传 */
function maskWebhookUrl(url) {
    const s = String(url || '');
    const i = s.indexOf('key=');
    if (i === -1) return s;
    const key = s.slice(i + 4);
    return s.slice(0, i + 4) + (key.length > 8 ? key.slice(0, 8) + '…（共 ' + key.length + ' 位）' : key);
}

const webhook = createWebhook({
    getConfig: () => mainSettings.webhook,
    saveConfig: next => {
        mainSettings.webhook = next;
        saveMainSettings();
    },
    notify: entry => {
        // 把发送结果广播给界面，方便在设置面板看到最近几次推送
        const payload = { entry: entry };
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('webhook:log', payload);
    },
    // 图片列要传纯 base64；超过 2MB 的直接放弃（企业微信会拒绝）
    loadImage: fileUrl => {
        try {
            const p = String(fileUrl).indexOf('file://') === 0 ? nodeUrl.fileURLToPath(fileUrl) : String(fileUrl);
            const buffer = fs.readFileSync(p);
            if (buffer.length > 2 * 1024 * 1024) {
                console.warn('[webhook] 图片超过 2MB，跳过：', p);
                return null;
            }
            return buffer.toString('base64');
        } catch (e) {
            console.warn('[webhook] 图片读取失败：', e.message);
            return null;
        }
    }
});

function webhookSnapshot() {
    const cfg = JSON.parse(JSON.stringify(mainSettings.webhook));
    return {
        config: cfg,
        events: webhook.EVENT_LABELS,
        sources: webhook.SOURCES,
        history: webhook.history()
    };
}

ipcMain.handle('webhook:get', () => webhookSnapshot());

ipcMain.handle('webhook:set', (event, patch) => {
    webhook.updateConfig(patch || {});
    return webhookSnapshot();
});

ipcMain.handle('webhook:test', () => webhook.test());

// 主动推送：右键「推送到表格」或 API 调用
ipcMain.handle('webhook:push', (event, payload) => {
    const action = (payload && payload.action) || 'created';
    const tasks = (payload && payload.tasks) || [];
    return webhook.push(action, tasks).then(() => ({ ok: true }));
});

/** 差分轮询：和上一轮快照比对，变了才推。覆盖手动编辑、AI 注入等所有改动路径 */
function startWebhookLoop() {
    const tick = () => {
        try {
            const active = JSON.parse(store.getItem('notes') || '[]');
            const archived = JSON.parse(store.getItem('archived_notes') || '[]');
            webhook.diffAndEmit(active, archived);
        } catch (e) {
            console.warn('[webhook] 差分失败：', e.message);
        }
    };
    setTimeout(tick, 6000);          // 启动 6s 后建立首份快照（不推送历史数据）
    setInterval(tick, 6000);
}

/** 把 main-settings.json 的内容落到各个子系统上 */
function applyMainSettings() {
    api.applyConfig(Object.assign({ enabled: mainSettings.api.enabled }, mainSettings.api));
    applyAutoLaunch(mainSettings.autolaunch);
    applyGlobalShortcuts(mainSettings.globalShortcuts);
}

ipcMain.handle('main-settings:get', () => ({
    settings: JSON.parse(JSON.stringify(mainSettings)),
    api: api.info(),
    webhook: { config: JSON.parse(JSON.stringify(mainSettings.webhook)), events: webhook.EVENT_LABELS },
    loginItem: safeGetLoginItemSettings()
}));

ipcMain.handle('main-settings:set', (event, patch) => {
    if (patch && typeof patch === 'object') {
        if (patch.api && typeof patch.api === 'object') {
            mainSettings.api = Object.assign({}, mainSettings.api, patch.api);
        }
        if (typeof patch.autolaunch === 'boolean') mainSettings.autolaunch = patch.autolaunch;
        if (typeof patch.globalShortcuts === 'boolean') mainSettings.globalShortcuts = patch.globalShortcuts;
        if (typeof patch.reminders === 'boolean') mainSettings.reminders = patch.reminders;
        saveMainSettings();
        applyMainSettings();
    }
    return {
        settings: JSON.parse(JSON.stringify(mainSettings)),
        api: api.info(),
        webhook: { config: JSON.parse(JSON.stringify(mainSettings.webhook)), events: webhook.EVENT_LABELS },
        loginItem: safeGetLoginItemSettings()
    };
});

// 【2026-09-30】设置面板「关于」页要显示版本号：渲染进程无法直接读 package.json
ipcMain.handle('app:version', () => app.getVersion());

// ==================== 检查更新 ====================
// 安装包放在 https://www.gdpudev.cn/timer/release/<版本号>/ 下；
// 元数据优先读同目录的 latest.json，没有就退回解析 nginx 目录列表（取最大版本号）。
const UPDATE_BASE = 'https://www.gdpudev.cn/timer/release';

function httpGetText(url, timeoutMs) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (err, data) => {
            if (settled) return;
            settled = true;
            if (err) reject(err); else resolve(data);
        };
        let req;
        try {
            req = require('https').get(url, {
                timeout: timeoutMs || 8000,
                headers: {
                    'User-Agent': 'timer-app/' + app.getVersion(),
                    'Accept': 'application/json,text/html,*/*',
                    'Accept-Encoding': 'identity',
                    'Cache-Control': 'no-cache'
                }
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    res.resume();
                    const next = new URL(res.headers.location, url).href;
                    httpGetText(next, timeoutMs).then(d => finish(null, d), e => finish(e));
                    return;
                }
                if (res.statusCode !== 200) {
                    res.resume();
                    finish(new Error('HTTP ' + res.statusCode));
                    return;
                }
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => finish(null, Buffer.concat(chunks).toString('utf8')));
                res.on('error', e => finish(e));
            });
            req.on('timeout', () => req.destroy(new Error('请求超时')));
            req.on('error', e => finish(e));
        } catch (e) {
            finish(e);
        }
    });
}

function parseVerParts(v) {
    return String(v || '').replace(/^v/i, '').split(/[.+-]/).slice(0, 3).map(n => parseInt(n, 10) || 0);
}

function cmpVersion(a, b) {
    const A = parseVerParts(a);
    const B = parseVerParts(b);
    for (let i = 0; i < 3; i++) {
        const x = A[i] || 0;
        const y = B[i] || 0;
        if (x !== y) return x > y ? 1 : -1;
    }
    return 0;
}

async function fetchUpdateInfo() {
    const current = app.getVersion();

    // 1) latest.json（推荐，能带上更新说明和文件大小）
    try {
        const txt = await httpGetText(UPDATE_BASE + '/latest.json?t=' + Date.now(), 8000);
        const info = JSON.parse(txt);
        if (info && info.version) {
            const file = info.file || '';
            return {
                ok: true,
                current: current,
                latest: String(info.version).replace(/^v/i, ''),
                url: info.url || (file ? UPDATE_BASE + '/' + info.version + '/' + encodeURIComponent(file) : UPDATE_BASE + '/' + info.version + '/'),
                notes: info.notes || '',
                date: info.date || '',
                size: Number(info.size) || 0,
                source: 'latest.json'
            };
        }
    } catch (e) { /* 没配 latest.json 就走下面的目录列表 */ }

    // 2) 退回目录列表：/timer/release/ 下有 1.1.0/ 1.1.1/ …
    const listHtml = await httpGetText(UPDATE_BASE + '/?t=' + Date.now(), 8000);
    const versions = Array.from(new Set(
        (listHtml.match(/href="[^"]*?(\d+\.\d+\.\d+)\/?"/g) || []).map(m => (m.match(/(\d+\.\d+\.\d+)/) || [])[1]).filter(Boolean)
    ));
    if (!versions.length) throw new Error('服务器上没有找到版本目录');
    versions.sort(cmpVersion);
    const latest = versions[versions.length - 1];
    const dirHtml = await httpGetText(UPDATE_BASE + '/' + latest + '/?t=' + Date.now(), 8000);
    const exeMatch = dirHtml.match(/href="([^"]+\.exe)"/i);
    const file = exeMatch ? decodeURIComponent(exeMatch[1]) : '';
    return {
        ok: true,
        current: current,
        latest: latest,
        url: file ? UPDATE_BASE + '/' + latest + '/' + encodeURIComponent(file) : UPDATE_BASE + '/' + latest + '/',
        notes: '',
        date: '',
        size: 0,
        source: 'autoindex'
    };
}

ipcMain.handle('update:check', async () => {
    try {
        const info = await fetchUpdateInfo();
        info.hasUpdate = cmpVersion(info.latest, info.current) > 0;
        return info;
    } catch (e) {
        return { ok: false, current: app.getVersion(), error: (e && e.message) || String(e) };
    }
});

ipcMain.handle('update:open', (event, url) => {
    const target = String(url || '').trim();
    if (!/^https?:\/\//i.test(target)) return { ok: false, error: '无效链接' };
    try {
        require('electron').shell.openExternal(target);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: (e && e.message) || String(e) };
    }
});


ipcMain.handle('api:regenerate-token', () => {
    mainSettings.api.token = crypto.randomBytes(12).toString('hex');
    saveMainSettings();
    return api.applyConfig(Object.assign({ enabled: mainSettings.api.enabled }, mainSettings.api));
});

ipcMain.handle('api:info', () => api.info());

/** 复制一段可直接使用的调用示例（给 AI / 脚本用） */
ipcMain.handle('api:example', () => {
    const info = api.info();
    const h = [];
    if (info.tokenRequired) h.push('-H "X-Api-Token: ' + info.token + '"');
    return [
        '# 1) 健康检查',
        'curl http://127.0.0.1:' + info.port + '/api/health ' + h.join(' '),
        '',
        '# 2) 注入一条任务（带图片）',
        'curl -X POST http://127.0.0.1:' + info.port + '/api/tasks ' + h.join(' ') + ' -H "Content-Type: application/json" -d "{\\"content\\":\\"写周报\\",\\"priority\\":\\"high\\",\\"images\\":[{\\"url\\":\\"https://example.com/a.png\\"}]}"',
        '',
        '# 3) 查看全部任务',
        'curl "http://127.0.0.1:' + info.port + '/api/tasks?scope=active" ' + h.join(' '),
        '',
        '# ---- 内容写法：content 和 comments 都支持轻量 markdown，渲染出来是真正的排版 ----',
        '#   标题      "## 进度更新"        （# 一级 ~ #### 四级）',
        '#   列表      "- 甲\\n- 乙"        有序 "1. 第一步\\n2. 第二步"',
        '#   强调      "**粗体** *斜体* ~~删除线~~ `代码`"',
        '#   链接      "[设计文档](https://example.com/doc)"   只认 http/https',
        '#   引用/分隔 "> 结论：通过"        "---"',
        '# 也接受 HTML 标签：<h3> <ul><li> <ol><li> <blockquote> <a href> <pre> <hr> <br>',
        '# （会被转成同样的样式，不会以字面量 / 浏览器默认大字显示）',
        '# 带排版的例子：',
        'curl -X POST http://127.0.0.1:' + info.port + '/api/tasks ' + h.join(' ') + ' -H "Content-Type: application/json" -d "{\\"content\\":\\"## 进度更新\\\\n- 甲：已完成\\\\n- 乙：进行中\\\\n\\\\n**重点**：今天必须收尾\\",\\"comments\\":[\\"**复查**：见 [日志](https://example.com/log)\\"]}"',
        '',
        '# 接口自描述：GET http://127.0.0.1:' + info.port + '/api/schema'
    ].join('\n');
});

// ============ 开机自启 ============

function safeGetLoginItemSettings() {
    try {
        return app.getLoginItemSettings();
    } catch (e) {
        return { openAtLogin: false };
    }
}

function applyAutoLaunch(enabled) {
    try {
        app.setLoginItemSettings({
            openAtLogin: !!enabled,
            args: ['--autostart']
        });
    } catch (e) {
        console.error('[autolaunch] 设置开机自启失败：', e.message);
    }
}

// ============ 全局快捷键 ============

const GLOBAL_SHORTCUTS = [
    { accelerator: 'Ctrl+Alt+Space', action: 'toggle-timer', desc: '开始 / 暂停' },
    { accelerator: 'Ctrl+Alt+M', action: 'switch-mode', desc: '切换工作 / 休息' },
    { accelerator: 'Ctrl+Alt+F', action: 'toggle-float', desc: '开关悬浮窗' },
    { accelerator: 'Ctrl+Alt+N', action: 'quick-add', desc: '唤起窗口并聚焦任务输入框' }
];

function applyGlobalShortcuts(enabled) {
    try {
        globalShortcut.unregisterAll();
    } catch (e) { /* ignore */ }
    if (!enabled) {
        console.log('[shortcut] 全局快捷键已关闭');
        return;
    }
    for (const s of GLOBAL_SHORTCUTS) {
        try {
            const ok = globalShortcut.register(s.accelerator, () => runShortcutAction(s.action));
            if (!ok) console.warn('[shortcut] 注册失败（可能已被其它软件占用）：' + s.accelerator);
        } catch (e) {
            console.warn('[shortcut] 注册异常：' + s.accelerator, e.message);
        }
    }
    console.log('[shortcut] 已注册 ' + GLOBAL_SHORTCUTS.length + ' 个全局快捷键');
}

function runShortcutAction(action) {
    switch (action) {
        case 'toggle-timer':
            toggleTimer();
            break;
        case 'switch-mode':
            switchMode();
            break;
        case 'toggle-float':
            toggleFloatWindow();
            break;
        case 'quick-add':
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.show();
                mainWindow.focus();
                mainWindow.webContents.send('global-shortcut', { action: 'quick-add' });
            }
            break;
    }
}

ipcMain.handle('shortcuts:list', () => GLOBAL_SHORTCUTS);

// ============ 任务提醒（M14-3） ============

const remindedKeys = new Set();
let reminderTimer = null;

function startReminderLoop() {
    if (reminderTimer) return;
    setTimeout(checkReminders, 8000);
    reminderTimer = setInterval(checkReminders, 30000);
}

/** 直接从主进程副本里读任务，避免为了查提醒频繁打扰渲染进程 */
function checkReminders() {
    if (!mainSettings.reminders) return;
    const raw = store.getItem('notes');
    if (!raw) return;
    let notes = [];
    try {
        notes = JSON.parse(raw);
    } catch (e) {
        return;
    }
    if (!Array.isArray(notes)) return;

    const now = Date.now();
    for (const n of notes) {
        const at = n && (n.remindAt || n.remind_at);
        if (!at || typeof at !== 'number') continue;
        if (at > now) continue;
        // 过期超过 24 小时的不再打扰（多半是电脑没开）
        if (now - at > 24 * 3600 * 1000) continue;
        const key = n.id + ':' + at;
        if (remindedKeys.has(key)) continue;
        remindedKeys.add(key);

        const text = String(n.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
        try {
            new Notification({ title: '⏰ 任务提醒', body: text || '（无内容）' }).show();
        } catch (e) {
            console.warn('[reminder] 通知失败：', e.message);
        }
        const payload = { id: n.id, text: text };
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('task-reminder', payload);
        if (floatWindow && !floatWindow.isDestroyed()) floatWindow.webContents.send('task-reminder', payload);
    }
}

module.exports = {
    getMainWindow: () => mainWindow
};
