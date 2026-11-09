// 计时器 PoC —— 验证 mygo 能否承载现有计时器
//
// 四项验证：
//   ① 主窗口加载真实网页版计时器（web/index.html），并用 Page.Eval 无头取 DOM 证据
//   ② 悬浮窗：Frameless + Transparent + AlwaysOnTop + SkipTaskbar + SetIgnoreMouseEvents
//   ③ 托盘（Tray + Menu）与全局快捷键（Ctrl+Alt+P）
//   ④ deep link：注册专用 timer-poc:// 协议（不碰创作台的 workbench://）
//
// 全程只打日志，不改任何系统状态（协议注册可随时 Unregister）。
package main

import (
	_ "embed"
	"log"
	"time"

	"github.com/egoist/mygo"
)

//go:embed tray.png
var trayPNG []byte

const pocScheme = "timer-poc"

var pocTray *mygo.Tray // 占位：托盘对象由 mygo 内部持有，这里保引用防 GC

const floatHTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html,body { margin:0; height:100%; background:transparent; overflow:hidden;
              font-family:"Segoe UI",system-ui,sans-serif; user-select:none; }
  .card { margin:10px; height:calc(100% - 20px); border-radius:14px;
          background:rgba(30,30,34,.78); color:#fff;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:6px; box-shadow:0 4px 24px rgba(0,0,0,.35); }
  .t { font-size:34px; font-weight:600; letter-spacing:1px; font-variant-numeric:tabular-nums; }
  .s { font-size:12px; opacity:.65; }
</style></head>
<body><div class="card">
  <div class="t" id="t">00:00:00</div>
  <div class="s">mygo 透明悬浮窗 PoC · 置顶 · 不占任务栏</div>
</div>
<script>
  const t = document.getElementById('t');
  setInterval(() => { t.textContent = new Date().toLocaleTimeString('zh-CN', {hour12:false}); }, 500);
</script>
</body></html>`

func main() {
	log.SetFlags(log.Ltime | log.Lmicroseconds)
	log.Println("[poc] 启动 · WebView2 可用 =", mygo.WebViewAvailable())

	// deep link / 第二实例：必须先拿单实例锁，后来者把参数交给先到者后自行退出
	if !mygo.App.RequestSingleInstanceLock() {
		log.Println("[poc] 已有实例在跑，命令行已交接，本进程退出")
		return
	}

	// ④ deep link：第二实例/协议唤起的回调
	mygo.App.OnSecondInstance(func(args []string, workingDir string) {
		log.Println("[poc][deeplink] OnSecondInstance args =", args)
	})
	mygo.App.OnOpenURL(func(rawURL string) {
		log.Println("[poc][deeplink] OnOpenURL =", rawURL)
	})
	if err := mygo.App.RegisterURLScheme(pocScheme); err != nil {
		// 沙箱环境可能挡 HKCU\Software\Classes 写入；真实部署无沙箱不受影响
		log.Println("[poc][deeplink] 注册失败(继续跑):", err)
	} else {
		log.Printf("[poc][deeplink] 已注册 %s:// (IsRegistered=%v)，可用 start %s://hello 测试",
			pocScheme, mygo.App.IsURLSchemeRegistered(pocScheme), pocScheme)
	}

	var floatWin *mygo.Window

	mygo.App.OnReady(func() {
		log.Println("[poc] app ready")

		// ── ① 主窗口：加载真实网页版计时器 ─────────────────────────
		mainWin := mygo.NewWindow(mygo.WindowOptions{
			Title:  "计时器 PoC 主窗口",
			Width:  1000,
			Height: 700,
		})
		mainWin.Page().OnDidFailLoad(func(e *mygo.LoadError) {
			log.Printf("[poc][main] 加载失败: %+v", e)
		})
		mainWin.Page().OnDOMReady(func() {
			log.Println("[poc][main] DOM ready")
			// 等渲染稳定后取 DOM 证据
			time.AfterFunc(3*time.Second, func() {
				v, err := mainWin.Page().Eval(`JSON.stringify({
					title: document.title,
					buttons: document.querySelectorAll('button').length,
					notesArea: !!document.querySelector('#notes, .notes-wrap, #noteInput'),
					bodyChildren: document.body.children.length
				})`)
				log.Println("[poc][main] DOM 证据 =", v, "err =", err)
			})
		})
		if err := mainWin.Page().LoadFile(`E:\Programs\计时器\web\index.html`); err != nil {
			log.Println("[poc][main] LoadFile 失败:", err)
		} else {
			log.Println("[poc][main] 已 LoadFile web/index.html（真实网页版计时器）")
		}

		// ── ② 悬浮窗：对应现计时器 float 窗口的全套特性 ─────────────
		floatWin = mygo.NewWindow(mygo.WindowOptions{
			Title:       "PoC 悬浮窗",
			Width:       380,
			Height:      100,
			X:           80,
			Y:           80,
			Frameless:   true,
			Transparent: true,
			AlwaysOnTop: true,
			SkipTaskbar: true,
		})
		floatWin.Page().OnDOMReady(func() {
			log.Println("[poc][float] DOM ready")
			// 穿透开关：开 2 秒再关，证明可编程切换（对应锁定悬浮窗功能）
			floatWin.SetIgnoreMouseEvents(true)
			log.Println("[poc][float] SetIgnoreMouseEvents(true) ✓ 点击可穿透")
			time.AfterFunc(2*time.Second, func() {
				floatWin.SetIgnoreMouseEvents(false)
				log.Println("[poc][float] SetIgnoreMouseEvents(false) ✓ 恢复可交互")
			})
		})
		floatWin.Page().LoadFile(`E:\Programs\计时器\poc-mygo\poc-float.html`)
		log.Println("[poc][float] 悬浮窗已创建（Frameless+Transparent+AlwaysOnTop+SkipTaskbar）")

		// ── ③ 全局快捷键（必须在 App.Run 之后注册）────────────────
		if err := mygo.GlobalShortcut.Register("Ctrl+Alt+Shift+P", func() {
			log.Println("[poc][shortcut] Ctrl+Alt+Shift+P 触发 ✓")
		}); err != nil {
			log.Println("[poc][shortcut] 注册失败:", err)
		} else {
			log.Println("[poc][shortcut] 已注册 Ctrl+Alt+Shift+P")
		}

		// ── ③ 托盘 ────────────────────────────────────────────────
		tray, errT := mygo.NewTray(mygo.TrayOptions{
			Icon:    trayPNG,
			ToolTip: "计时器 PoC",
			Menu: mygo.NewMenu([]*mygo.MenuItem{
				{Label: "显示/隐藏悬浮窗", Click: func(*mygo.MenuItem, *mygo.Window) {
					if floatWin.IsVisible() {
						floatWin.Hide()
					} else {
						floatWin.Show()
					}
				}},
				mygo.Separator(),
				{Label: "退出 PoC", Click: func(*mygo.MenuItem, *mygo.Window) {
					_ = mygo.App.UnregisterURLScheme(pocScheme)
					mygo.App.Exit(0)
				}},
			}),
		})
		if errT != nil {
			log.Println("[poc][tray] 创建失败:", errT)
		} else {
			log.Println("[poc][tray] 托盘已创建 ✓（右下角橙色圆点，右键可退出）")
			pocTray = tray
		}
	})

	if err := mygo.App.Run(); err != nil {
		log.Fatal(err)
	}
	log.Println("[poc] 已退出，协议已注销")
}
