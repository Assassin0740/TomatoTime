# 10 · 本地 AI 接入 API（M15）

> **文档性质**：面向「调用方」（AI 助手、脚本、其它本地程序）的接口说明。
> 创建日期：2026-09-28 ｜ 对应版本：v1.1.0

---

## 1. 它解决什么问题

以前只有「人」能往计时器里加任务：打开窗口 → 打字 → 回车。
现在任何能发 HTTP 请求的东西（AI 助手、命令行、另一个脚本）都可以直接把任务和图片写进来，
并且走的是**和手动添加完全相同的保存链路**（图片落盘、悬浮窗同步、图片回收），不会出现两份数据。

> 💡 **嫌拼 HTTP 麻烦？用命令行 CLI**：`node timer-cli.js add "写周报" -p high`，
> 端口和令牌自动发现，见 [`12-命令行CLI.md`](12-命令行CLI.md)。本 HTTP API 是 CLI 的底层。

---

## 2. 开关与凭据

| 项 | 位置 | 默认值 |
|---|---|---|
| 总开关 | 设置面板 → 「🤖 AI 接入 · 系统集成」→ AI 接口 | **关闭**（需要时再开） |
| 端口 | 同一节 | `17890` |
| 令牌 | 同一节 | 首次启动自动生成，可点 ↻ 重新生成 |
| 局域网访问 | `main-settings.json` 的 `api.allowLAN` | 关闭（开启后强制要求令牌） |
| 配置文件 | `<userData>/main-settings.json` | — |

服务**默认只监听 `127.0.0.1`**，外部机器访问不到；只有在显式打开 `allowLAN` 后才会监听 `0.0.0.0`，
且此时令牌校验强制开启。

令牌三种传法任选其一：

```
X-Api-Token: <token>
Authorization: Bearer <token>
?token=<token>
```

---

## 3. 接口一览

基地址：`http://127.0.0.1:17890`

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 + 当前计时状态 |
| GET | `/api/schema` | 接口自描述（**建议 AI 先调这个**） |
| GET | `/api/tasks` | 列出任务，`?scope=active\|archive\|all&keyword=&limit=` |
| POST | `/api/tasks` | 新增任务；body 也支持 `{ "tasks": [...] }` 批量 |
| GET | `/api/tasks/:id` | 查询单条 |
| PATCH | `/api/tasks/:id` | 修改（内容 / 优先级 / 类型 / 完成 / 提醒 / 追加文字） |
| DELETE | `/api/tasks/:id` | 删除 |
| POST | `/api/tasks/:id/comments` | 追加评论 |
| GET | `/api/timer` | 计时器状态 |
| POST | `/api/timer` | `{ action: start\|pause\|toggle\|reset\|mode\|set, minutes, seconds }` |
| GET | `/api/clipboard/image` | 读取系统剪贴板里的图片（微信复制的截图也能读） |
| POST | `/api/clipboard/image` | 把图片写进剪贴板 `{ data\|url\|path }`，可直接粘进微信 |
| GET | `/api/settings` | 读设置（可带 `?key=`） |
| POST | `/api/settings` | 写设置 `{ key, value }` 或 `{ settings: {...} }` |
| POST | `/api/notify` | 弹系统通知 `{ title, body }` |
| POST | `/api/window` | `{ action: show\|hide\|float }` |
| GET | `/api/webhook` | 查看 WebHook 配置与最近推送记录 |
| POST | `/api/webhook` | 立刻推送任务到表格 `{ action, ids \| tasks }` |

统一返回 JSON：`{ "ok": true, ... }`；失败为 `{ "ok": false, "error": "..." }` 并带相应状态码
（401 令牌无效 / 404 接口不存在 / 400 请求体异常 / 500 处理异常）。已开启 CORS，浏览器里的工具也能直连。

---

## 4. 新增任务（最常用）

```bash
curl -X POST http://127.0.0.1:17890/api/tasks \
  -H "X-Api-Token: 你的令牌" \
  -H "Content-Type: application/json" \
  -d '{
        "content": "完成季度总结\n第二段会变成换行",
        "priority": "high",
        "type": "short",
        "remindAt": "2026-09-28 18:00",
        "comments": ["由 AI 生成"],
        "images": [
          { "url": "https://example.com/chart.png" },
          { "data": "data:image/png;base64,iVBORw0KGgo..." }
        ]
      }'
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `content` | string | 纯文本（换行自动转 `<br>`）；含标签时按 HTML 处理 |
| `html` | string | 显式 HTML，优先于 `content` |
| `priority` / `p` | string\|number | `high`/`紧急`/`3`、`medium`/`2`、其余为低；数字 1–3 |
| `type` | string | `short`（默认）/ `long` |
| `done` | boolean | 默认 false |
| `remindAt` | string\|number | `2026-09-28 18:00`、ISO 串或时间戳（秒/毫秒均可） |
| `comments` | string[] \| object[] | 评论 |
| `images` | array | `{ data }` base64/DataURL、`{ url }` 网络图、`{ path }` 本地文件 |
| `imageUrls` | string[] | `images` 的简写形式 |
| `top` | boolean | `false` 时追加到列表末尾（默认放最前） |
| `tags` | string[] | 预留标签 |

**图片处理**：base64 / 远程 URL / 本地路径都会下载或读取后写入
`<userData>/NoteImages/`，按 SHA-256 去重，任务里保存的是 `file://` 本地地址，
因此不会因为源链接失效而裂图，也不会把几 MB 的 base64 塞进数据文件。

---

## 5. 与微信互传图片（同时是 M15-2 的修复）

| 方向 | 做法 |
|---|---|
| 微信 → 应用 | 应用内 Ctrl+V（或右键「粘贴图片」）。剪贴板里是纯位图时网页拿不到任何条目，改由主进程直接从系统剪贴板读取 |
| 应用 → 微信 | 图片上右键 → 「复制图片」（位图）或「复制为文件（微信兼容）」（文件拖放列表，微信一定认）；大图预览里的「复制图片」同样可用 |
| 通过 API | `POST /api/clipboard/image` 写入、`GET /api/clipboard/image` 读取 |

---

## 6. 给 AI 的一句提示词（可直接粘贴）

```
本机有一个「专注计时器」的本地 API：
  自描述：GET http://127.0.0.1:17890/api/schema
  注入任务：POST http://127.0.0.1:17890/api/tasks
  请求头：X-Api-Token: <下面的令牌>
请把我们讨论出的待办按 JSON 批量 POST 进去，
字段：content / priority(high|medium|low) / type(short|long) / remindAt("YYYY-MM-DD HH:mm") / images[{url|data}]
```

设置面板里的「**复制调用示例（给 AI / 脚本）**」按钮会把这段示例连令牌一起复制到剪贴板。

---

## 7. 与 WebHook 配合

注入的任务同样会被 WebHook 的差分轮询捕捉到，因此「AI 写任务 → 自动同步到企业微信智能表格 → 手机上查看」
这条链路不需要额外接线。也可以显式触发：

```bash
curl -X POST http://127.0.0.1:17890/api/webhook \
  -H "X-Api-Token: 你的令牌" -H "Content-Type: application/json" \
  -d '{ "action": "created", "ids": [1759000000000] }'
```

配置与字段映射见 [`11-WebHook同步表格.md`](11-WebHook同步表格.md)。

---

## 8. 已知边界

| 边界 | 说明 |
|---|---|
| 主窗口必须活着 | 任务由渲染进程持有；主窗口最小化到托盘仍可用，应用完全退出后接口返回错误 |
| 不执行代码 | 接口只做数据读写，不执行任何传入的脚本 |
| 图片上限 | 单个请求体 24MB，超限直接拒绝 |
| 提醒窗口 | 提醒任务过期超过 24 小时不再补发通知（避免开机后集中轰炸） |
