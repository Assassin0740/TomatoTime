const { app, BrowserWindow, Menu, ipcMain, Tray, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./store');

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

    mainWindow.webContents.send('float-window-opened');
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
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isWorking = !isWorking;
        currentTime = isWorking ? WORK_TIME : REST_TIME;
        broadcastTimerStatus();
        updateTrayMenu();
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

    createWindow();
    // 只在应用启动时创建一次托盘
    createTray();
    
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

// 保存卡片/笔记中的图片到本地，避免使用 Base64，并通过 SHA-256 哈希去重（类似 Telegram）
ipcMain.handle('save-note-image', async (event, base64Data) => {
    try {
        const url = require('url');
        const crypto = require('crypto');
        if (!fs.existsSync(noteImagesPath)) {
            fs.mkdirSync(noteImagesPath, { recursive: true });
        }
        
        let ext = 'png';
        let data = base64Data;
        
        const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
            ext = matches[1];
            data = matches[2];
        } else {
            const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
            data = base64Clean;
        }
        const buffer = Buffer.from(data, 'base64');
        
        // 1. 计算图片 buffer 的 SHA-256 哈希值作为文件唯一指纹
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        
        // 2. 用哈希指纹和扩展名组合成固定文件名
        const fileName = `img_${hash}.${ext}`;
        const filePath = path.join(noteImagesPath, fileName);
        
        // 3. 检查文件是否已存在。如果存在则跳过写入直接复用，实现完美去重
        if (fs.existsSync(filePath)) {
            console.log('检测到相同图片，跳过存盘直接复用索引:', filePath);
        } else {
            fs.writeFileSync(filePath, buffer);
            console.log('新图片已保存到本地:', filePath);
        }
        
        // 自动转换为标准的 file URL（处理了盘符、中文字符与空格的 URL 编码）
        return url.pathToFileURL(filePath).href;
    } catch (e) {
        console.error('保存笔记图片失败:', e);
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

module.exports = {
    getMainWindow: () => mainWindow
};
