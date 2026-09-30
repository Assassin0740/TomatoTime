# 12 · 命令行 CLI（给 AI 的「Unity CLI」）

> **文档性质**：面向「调用方」（AI 助手、脚本）的命令行工具说明。
> 创建日期：2026-09-29 ｜ 对应版本：v1.1.0 ｜ 相关文件：`timer-cli.js`、`timer-cli.py`、`timer.cmd`

---

## 1. 它解决什么问题

HTTP API（见 `10`）功能完整，但 AI 每次都要拼 curl 很啰嗦。
CLI 把常用操作封装成一条命令，AI 直接执行即可：

```bash
node timer-cli.js add "写周报" -p high --remind "2026-09-29 18:00"
```

底层就是本地 HTTP API（`127.0.0.1:17890`），CLI 负责：自动找配置（端口/令牌）、
拼请求、把结果翻译成人话。**端口和令牌自动从
`%APPDATA%\计时器\main-settings.json`（或 `timer-app`）读取**，无需手动配置。

两个版本功能完全一致，任选其一：

| 文件 | 运行方式 | 适用 |
|---|---|---|
| `timer-cli.js` | `node timer-cli.js …` | 机器装了 Node.js（开发机即装即用） |
| `timer-cli.py` | `python timer-cli.py …` | 机器装了 Python 3.8+（纯标准库，零依赖） |
| `timer.cmd` | `timer …`（双击目录下的 cmd） | Windows 快捷方式，转发给 timer-cli.js |

> 已随安装包放在 `<安装目录>\resources\` 下（extraResources）。

---

## 2. 命令一览

```
status                            查看应用与计时器状态
add <内容> [-p high|medium|low] [-t short|long] [--remind 时间]
    [--image 路径或链接]... [--base64 dataURL] [--comment 文本] [--top]
list [--scope active|archive|all] [--keyword 词] [--limit n]
get <id>                          单条详情（含评论与图片）
update <id> [--content 文本] [--append 文本] [-p 级别] [-t 类型]
       [--remind 时间] [--image 路径或链接]...
done <ids> [--undone]             完成 / 取消完成（ids 逗号分隔，支持批量）
delete <ids>                      删除任务
comment <id> <文本>               加评论
timer <start|pause|toggle|reset|mode|set> [-m 分钟] [-s 秒]
notify <标题> [内容]              弹系统通知
window <show|hide|float>          主窗口 / 悬浮窗
clipboard <get|set> [--path 路径 | --url 链接] [--save 路径]
                                  读写剪贴板图片（微信互通）
webhook <info|config|push|set|parse|test>
    info|config                   看完整配置（字段 + 选项 + 映射 + 固定文本 + 最近推送）
    push [--event 事件] [--ids 1,2 | --all] [--force]
                                  推送任务（--force 忽略「启用同步」开关）
    set [--enable|--disable] [--url 地址] [--schema-file 示例JSON | --schema-json 原文]
        [--map 字段ID=来源]... [--const 字段ID=固定文本]...
        [--record-ids-file 回填.json] [--json-file 配置片段.json]
                                  改 WebHook 配置（2026-09-30 新增）
    parse --schema-file 示例JSON   只解析示例 JSON，不保存
    test                          发一条测试记录到表格
settings [key] [value]            读写应用设置
schema                            打印 HTTP API 自描述
```

通用选项：`--json`（输出原始 JSON，给程序处理）、`--port`、`--token`（覆盖自动发现的配置）。

---

## 3. 典型用法

```bash
# 确认应用在线（AI 拿到命令后应先跑这个）
node timer-cli.js status

# 加一条紧急任务，明晚 6 点提醒，带两条评论
node timer-cli.js add "写周报" -p 紧急 --remind "2026-09-29 18:00" --comment "来自AI|初稿"

# 加任务并带本地图片（自动落盘去重）
node timer-cli.js add "截图待办" --image "C:\Users\me\Desktop\shot.png"

# 搜索、修改、完成、删除
node timer-cli.js list --keyword 周报
node timer-cli.js update 1759000000000 --append "（补充说明）" -p low
node timer-cli.js done 1759000000000
node timer-cli.js delete 1759000000000,1759000000001

# 计时器
node timer-cli.js timer set -m 25
node timer-cli.js timer start

# 微信互通：把剪贴板里的截图存下来 / 把本地图放进剪贴板
node timer-cli.js clipboard get --save shot.png
node timer-cli.js clipboard set --path shot.png

# 把当前全部任务手动推一遍表格
node timer-cli.js webhook push --all
```

提醒时间支持：`2026-09-29 18:00`、`09-29 18:00`、`18:00`（今天）、毫秒时间戳。
优先级支持：`high / medium / low`、`紧急 / 中 / 低`、`1-3`。

---

## 4. 给 AI 的一段提示词（可直接粘贴）

```
你可以通过命令行直接操控本机的「专注计时器」：
  node "d:/Program Files (x86)/计时器/timer-cli.js" <命令>
先执行 status 确认在线；常用命令：
  add "任务内容" -p high|medium|low --remind "YYYY-MM-DD HH:mm" [--image 图片路径] [--comment 文本]
  list [--keyword 词] / get <id> / update <id> --append 文本 / done <id> / delete <id>
  timer start|pause|set -m 25 / clipboard set --path 图片
输出加 --json 可得到原始 JSON。连不上时提示用户打开应用并开启「AI 接口」。
```

---

## 5. 设计说明

| 决策 | 理由 |
|---|---|
| CLI 只是 API 的壳，不含业务逻辑 | 逻辑只在应用里，避免两边漂移；API 升级 CLI 自动跟上 |
| 自动发现配置（挑 mtime 最新的 main-settings.json） | 兼容打包版（`计时器`）与开发版（`timer-app`）两种 userData |
| 失败时打印排查步骤（应用没开 / 开关没开 / 端口不对） | AI 拿到 stderr 就能引导用户处理，不用再猜 |
| `--json` 输出原始返回并带退出码 | 方便脚本 / AI 做结构化处理 |
| 零第三方依赖 | 拿到任何机器上都能跑，不用 npm install / pip install |

## 6. 本机环境备注（2026-09-29 实测）

- 本机 Node.js 可用 → **`timer-cli.js` 开箱即用**
- 本机 `python` 是商店占位符、`Python311` 目录残缺（无 python.exe），`python`/`py` 均返回 9009
  → `timer-cli.py` 已按用户要求提供，但**装好 Python 后才能用**
- 建议把 `timer.cmd` 所在目录加入 PATH，之后任意位置敲 `timer …` 即可
