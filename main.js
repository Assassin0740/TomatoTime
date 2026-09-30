const { app, BrowserWindow, Menu, ipcMain, Tray, dialog,
    globalShortcut, clipboard, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodeUrl = require('url');
const store = require('./store');
const { createApiServer } = require('./api-server');
const { createWebhook, DEFAULT_WEBHOOK_CONFIG } = require('./webhook');

// 单实例锁定
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
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
        withBackground: true
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
let withBackground = true;
let isWindowLocked = false;
let isFloatPinned = true;

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

    const { screen, Menu, MenuItem } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    // 读取保存的配置
    const savedConfig = loadFloatWindowConfig();
    const windowWidth = savedConfig.width || 380;
    const windowHeight = savedConfig.height || 100;
    let windowX = savedConfig.x;
    let windowY = savedConfig.y;
    withBackground = savedConfig.withBackground !== undefined ? savedConfig.withBackground : true;
    
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
    
    const floatWindowOptions = {
        width: windowWidth,
        height: windowHeight,
        x: windowX,
        y: windowY,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        opacity: 0.999,
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
    
    floatWindow.setAlwaysOnTop(isFloatPinned);
    floatWindow.setIgnoreMouseEvents(isWindowLocked);
    
    // 移除菜单
    floatWindow.setMenu(null);
    floatWindow.setMenuBarVisibility(false);
    floatWindow.setAutoHideMenuBar(true);
    
    // 显示窗口
    floatWindow.once('ready-to-show', () => {
        floatWindow.show();
        // 发送初始背景状态
        if (!withBackground) {
            floatWindow.webContents.send('toggle-background');
        }
        // 推送保存的显示设置（直接读主进程集中存储，不再依赖主窗口）
        pushSettingsToFloatWindow();
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
    floatWindow.on('resize', saveWindowState);

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
        menu.append(new MenuItem({
            label: '🖼️ 设置悬浮窗配图…',
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
            label: withBackground ? '👻 透明背景' : '🎨 显示背景',
            click: () => {
                withBackground = !withBackground;
                if (floatWindow && !floatWindow.isDestroyed()) {
                    floatWindow.webContents.send('toggle-background');
                }
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
        }
    });

    ipcMain.on('float-mousemove', (event, data) => {
        if (isDragging && floatWindow && !floatWindow.isDestroyed()) {
            floatWindow.setPosition(
                Math.floor(data.screenX - dragOffset.x),
                Math.floor(data.screenY - dragOffset.y)
            );
        }
    });

    ipcMain.on('float-mouseup', () => {
        isDragging = false;
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

/** 把 base64 / dataURL 转成 file:// URL */
function saveImageFromBase64(base64Data) {
    let ext = 'png';
    let data = String(base64Data);
    const matches = data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (matches) {
        ext = matches[1];
        data = matches[2];
    } else {
        data = data.replace(/^data:image\/\w+;base64,/, '');
    }
    const buffer = Buffer.from(data, 'base64');
    if (!buffer.length) throw new Error('图片数据为空');
    return saveImageBuffer(buffer, ext);
}

/** 从网络下载图片（AI 注入的远程图片走这里） */
async function downloadImage(url) {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error('下载图片失败：HTTP ' + res.status);
    const type = (res.headers.get('content-type') || '').toLowerCase();
    let ext = 'png';
    if (type.indexOf('jpeg') !== -1) ext = 'jpg';
    else if (type.indexOf('gif') !== -1) ext = 'gif';
    else if (type.indexOf('webp') !== -1) ext = 'webp';
    else if (type.indexOf('bmp') !== -1) ext = 'bmp';
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) throw new Error('下载到的图片为空');
    return saveImageBuffer(buffer, ext);
}

/** 从本地文件读取并收纳进图片库（API 传入路径 / 粘贴自其它软件时用） */
function saveImageFromPath(filePath) {
    let p = String(filePath);
    if (p.indexOf('file://') === 0) p = nodeUrl.fileURLToPath(p);
    const buffer = fs.readFileSync(p);
    return saveImageBuffer(buffer, path.extname(p).replace('.', '').toLowerCase());
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
        
        files.forEach(file => {
            // 只清理 img_ 开头的文件，保证安全性，避免误删其他文件
            if (file.startsWith('img_') && !usedSet.has(file)) {
                try {
                    const filePath = path.join(noteImagesPath, file);
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
