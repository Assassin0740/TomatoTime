#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
专注计时器 CLI（timer-cli.py）
================================

让 AI / 脚本用一条命令直接操控「专注计时器」，类似 Unity 的命令行工具。
零依赖：只用 Python 标准库（3.8+），通过本机 HTTP API 与应用通信。

快速上手
--------
    python timer-cli.py                        # 查看帮助
    python timer-cli.py status                 # 应用与计时器状态
    python timer-cli.py add "写周报" -p high --remind "2026-09-29 18:00"
    python timer-cli.py list                   # 列出任务
    python timer-cli.py done 1759000000000     # 完成任务
    python timer-cli.py timer start            # 开始计时

端口与令牌自动从 %APPDATA%\\计时器\\main-settings.json（或 timer-app）读取，
也可用 --port / --token 或环境变量 TIMER_API_PORT / TIMER_API_TOKEN 覆盖。

给 AI 的提示：先跑 `python timer-cli.py status` 确认在线，再执行其它命令；
所有命令加 --json 可输出原始 JSON。
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime

# Windows 控制台尽量用 UTF-8 输出，避免中文乱码
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PROG = 'timer-cli.py'
_cfg_cache = None


# ---------------------------------------------------------------- 配置发现

def find_config_file():
    """按修改时间挑最新的 main-settings.json（兼容 计时器 / timer-app 两种 userData）"""
    candidates = []
    env = os.environ.get('TIMER_CLI_CONFIG')
    if env:
        candidates.append(env)
    appdata = os.environ.get('APPDATA')
    if appdata:
        candidates.append(os.path.join(appdata, '计时器', 'main-settings.json'))
        candidates.append(os.path.join(appdata, 'timer-app', 'main-settings.json'))
    found = [c for c in candidates if os.path.isfile(c)]
    if not found:
        return None
    return max(found, key=os.path.getmtime)


def load_config(args):
    """返回 (port, token, require_token, config_path)"""
    global _cfg_cache
    if _cfg_cache is None:
        path = find_config_file()
        if not path:
            fail('找不到配置文件 main-settings.json。\n'
                 '请先启动「专注计时器」应用至少一次；'
                 '或用环境变量 TIMER_CLI_CONFIG 指定配置路径。')
        try:
            with open(path, 'r', encoding='utf-8') as f:
                _cfg_cache = json.load(f)
        except Exception as e:
            fail('读取配置失败：%s' % e)
        _cfg_cache['__path'] = path
    api = _cfg_cache.get('api', {})
    port = getattr(args, 'port', None) or int(api.get('port') or os.environ.get('TIMER_API_PORT') or 17890)
    token = getattr(args, 'token', None) or os.environ.get('TIMER_API_TOKEN') or api.get('token') or ''
    require = bool(api.get('requireToken', True))
    return port, token, require, _cfg_cache.get('__path')


# ---------------------------------------------------------------- HTTP

def call(args, method, path, body=None, timeout=30):
    """调 API，成功返回 (True, data)，失败直接退出并打印原因"""
    port, token, require_token, cfg_path = load_config(args)
    url = 'http://127.0.0.1:%d%s' % (port, path)
    data = json.dumps(body, ensure_ascii=False).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Content-Type', 'application/json; charset=utf-8')
    if token and require_token:
        req.add_header('X-Api-Token', token)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read().decode('utf-8'))
        except Exception:
            payload = {'ok': False, 'error': 'HTTP %d' % e.code}
        return finish(args, payload)
    except urllib.error.URLError as e:
        fail('连不上 API（127.0.0.1:%d）：%s\n\n'
             '排查步骤：\n'
             '  1. 「专注计时器」应用是否在运行（托盘里有图标）？\n'
             '  2. 设置面板 →「AI 接入 · 系统集成」→「AI 接口」是否已开启？\n'
             '  3. 端口是否和配置一致（%s）？' % (port, e.reason, cfg_path))
    except Exception as e:
        fail('请求失败：%s' % e)
    return finish(args, payload)


def finish(args, payload):
    """--json 模式：直接输出原始 JSON 给程序处理；普通模式返回给命令函数继续格式化"""
    if getattr(args, 'json', False):
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        sys.exit(0 if payload.get('ok') else 1)
    return payload.get('ok', False), payload


def need_ok(args, result, what):
    ok, data = result
    if not ok or not data.get('ok', False):
        fail('%s失败：%s' % (what, data.get('error') or data))
    return data


def fail(msg, code=1):
    print('[x] ' + msg, file=sys.stderr)
    sys.exit(code)


# ---------------------------------------------------------------- 格式化

def strip_html(html):
    text = re.sub(r'<br\s*/?>', '\n', str(html or ''), flags=re.I)
    text = re.sub(r'<[^>]+>', '', text)
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    return text.strip()


def fmt_time(ts):
    if not ts:
        return ''
    try:
        return datetime.fromtimestamp(int(ts) / 1000).strftime('%Y-%m-%d %H:%M')
    except Exception:
        return str(ts)


def priority_label(p):
    n = int(p) if str(p).isdigit() else 1
    return {3: '高', 2: '中'}.get(n, '低')


def print_task(t, prefix=''):
    done = '[x]' if t.get('done') else '[ ]'
    remind = ('  ⏰' + fmt_time(t.get('remindAt') or t.get('remind_at'))) if (t.get('remindAt') or t.get('remind_at')) else ''
    comments = t.get('comments') or []
    extra = ('  💬%d' % len(comments)) if comments else ''
    content = strip_html(t.get('content')).replace('\n', ' / ')
    if len(content) > 80:
        content = content[:80] + '…'
    print('%s%s #%s [%s|%s] %s%s' % (prefix, done, t.get('id'), priority_label(t.get('p')),
                                     '长期' if t.get('type') == 'long' else '短期', content, remind + extra))


def parse_priority(v):
    """high/紧急/3 → high；medium/中/2；low/低/1"""
    s = str(v).strip().lower()
    table = {'high': 'high', 'h': 'high', '紧急': 'high', '高': 'high', '3': 'high',
             'medium': 'medium', 'm': 'medium', 'mid': 'medium', '中': 'medium', '中等': 'medium', '2': 'medium',
             'low': 'low', 'l': 'low', '低': 'low', '不紧急': 'low', '1': 'low'}
    if s not in table:
        fail('优先级必须是 high / medium / low（或 紧急/中/低、1-3），收到：%s' % v)
    return table[s]


def parse_remind(v):
    """支持 2026-09-29 18:00 / 2026-09-29 / 18:00（今天）/ 毫秒或秒时间戳"""
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return ''          # 空串 = 清除提醒
    if s.isdigit():
        n = int(s)
        return n if n > 10 ** 12 else n * 1000
    now = datetime.now()
    for fmt in ('%Y-%m-%d %H:%M', '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M', '%Y-%m-%d', '%m-%d %H:%M', '%H:%M'):
        try:
            d = datetime.strptime(s, fmt)
            if fmt == '%H:%M':
                d = d.replace(year=now.year, month=now.month, day=now.day)
            elif fmt == '%m-%d %H:%M':
                d = d.replace(year=now.year)
            return int(d.timestamp() * 1000)
        except ValueError:
            continue
    fail('提醒时间格式看不懂：%s（示例：2026-09-29 18:00 / 09-29 18:00 / 18:00）' % s)


def split_ids(v):
    return [int(x) for x in str(v).replace('，', ',').split(',') if x.strip()]


# ---------------------------------------------------------------- 子命令

def cmd_status(args):
    ok, data = call(args, 'GET', '/api/health')
    if not ok:
        fail('应用不在线：%s' % data)
    t = data.get('timer', {})
    state = '运行中' if t.get('isRunning') else '已暂停'
    phase = '工作时间' if t.get('isWorking') else '休息时间'
    sec = int(t.get('currentTime') or 0)
    print('应用在线  版本 %s' % data.get('version', '?'))
    print('计时器：%s · %s · 剩余 %02d:%02d' % (state, phase, sec // 60, sec % 60))
    print('悬浮窗：%s' % ('开' if data.get('floatWindowOpen') else '关'))
    print('API  ：http://127.0.0.1:%d（令牌%s）' % (load_config(args)[0], '必需' if data.get('tokenRequired') else '关闭'))


def cmd_add(args):
    body = {'content': args.content, 'priority': parse_priority(args.priority), 'type': args.type}
    remind = parse_remind(args.remind)
    if remind is not None:
        body['remindAt'] = remind
    if args.comment:
        body['comments'] = [c for c in re.split(r'[|；;]', args.comment) if c]
    if args.image:
        body['images'] = [{'path': i} if os.path.isfile(i) else {'url': i} for i in args.image]
    if args.top:
        body['top'] = True
    if args.base64:
        body['images'] = body.get('images', []) + [{'data': args.base64}]
    data = need_ok(args, call(args, 'POST', '/api/tasks', body), '添加任务')
    for t in data.get('created', []):
        print('已添加：')
        print_task(t, prefix='  ')
    print('共 %d 条' % data.get('count', 0))


def cmd_list(args):
    q = '/api/tasks?scope=%s' % args.scope
    if args.keyword:
        q += '&keyword=' + urllib.request.quote(args.keyword)
    if args.limit:
        q += '&limit=%d' % args.limit
    data = need_ok(args, call(args, 'GET', q), '读取任务')
    tasks = data.get('tasks', [])
    for t in tasks:
        print_task(t)
    print('共 %d 条（%s）' % (len(tasks), args.scope))


def cmd_get(args):
    data = need_ok(args, call(args, 'GET', '/api/tasks/%d' % args.id), '查询任务')
    t = data.get('task', {})
    print_task(t)
    comments = t.get('comments') or []
    if comments:
        print('  评论：')
        for c in comments:
            text = strip_html(c.get('text') if isinstance(c, dict) else c).replace('\n', ' / ')
            print('   · %s' % text)
    imgs = re.findall(r'<img[^>]*?src=["\']([^"\']+)["\']', t.get('content') or '')
    if imgs:
        print('  图片：%d 张' % len(imgs))
        for i in imgs:
            print('   · %s' % i)


def cmd_update(args):
    body = {}
    if args.content is not None:
        body['content'] = args.content
    if args.append is not None:
        body['appendText'] = args.append
    if args.priority is not None:
        body['priority'] = parse_priority(args.priority)
    if args.type is not None:
        body['type'] = args.type
    if args.remind is not None:
        body['remindAt'] = parse_remind(args.remind)
    if args.image:
        body['images'] = [{'path': i} if os.path.isfile(i) else {'url': i} for i in args.image]
    if not body:
        fail('没有要修改的内容（用 --content / --append / --priority / --type / --remind / --image）')
    data = need_ok(args, call(args, 'PATCH', '/api/tasks/%d' % args.id, body), '修改任务')
    print('已更新：')
    print_task(data.get('task', {}), prefix='  ')


def cmd_done(args):
    for tid in args.ids:
        data = need_ok(args, call(args, 'PATCH', '/api/tasks/%d' % tid, {'done': not args.undone}), '完成任务')
        print('%s #%s' % ('已标记未完成' if args.undone else '已完成', data.get('task', {}).get('id', tid)))


def cmd_delete(args):
    for tid in args.ids:
        need_ok(args, call(args, 'DELETE', '/api/tasks/%d' % tid), '删除任务')
        print('已删除 #%s' % tid)


def cmd_comment(args):
    data = need_ok(args, call(args, 'POST', '/api/tasks/%d/comments' % args.id, {'text': args.text}), '添加评论')
    print('已评论 #%s，现有 %d 条评论' % (args.id, len(data.get('task', {}).get('comments') or [])))


def cmd_timer(args):
    if args.action == 'set':
        body = {'action': 'set', 'minutes': args.minutes or 0, 'seconds': args.seconds or 0}
    elif args.action == 'mode':
        body = {'action': 'mode'}
    else:
        body = {'action': args.action}
    data = need_ok(args, call(args, 'POST', '/api/timer', body), '计时器操作')
    t = data.get('timer', {})
    sec = int(t.get('currentTime') or 0)
    print('计时器：%s · %s · %02d:%02d' % ('运行中' if t.get('isRunning') else '已暂停',
                                          '工作时间' if t.get('isWorking') else '休息时间',
                                          sec // 60, sec % 60))


def cmd_notify(args):
    need_ok(args, call(args, 'POST', '/api/notify', {'title': args.title, 'body': args.body}), '发送通知')
    print('已发送系统通知')


def cmd_window(args):
    need_ok(args, call(args, 'POST', '/api/window', {'action': args.action}), '窗口操作')
    print('已执行窗口操作：%s' % args.action)


def cmd_clipboard(args):
    if args.action == 'get':
        data = need_ok(args, call(args, 'GET', '/api/clipboard/image'), '读取剪贴板')
        info = data.get('size') or {}
        print('剪贴板里有图片：%dx%d（用 --save 路径 保存为 png）' % (info.get('width', 0), info.get('height', 0)))
        if args.save:
            import base64
            b64 = data.get('dataUrl', '').split(',', 1)[-1]
            with open(args.save, 'wb') as f:
                f.write(base64.b64decode(b64))
            print('已保存到 %s' % os.path.abspath(args.save))
    else:
        body = {}
        if args.path:
            body['path'] = os.path.abspath(args.path)
        elif args.url:
            body['url'] = args.url
        else:
            fail('需要 --path 图片路径 或 --url 图片链接')
        need_ok(args, call(args, 'POST', '/api/clipboard/image', body), '写入剪贴板')
        print('图片已写入系统剪贴板（可直接到微信里 Ctrl+V）')


def cmd_webhook(args):
    if args.action == 'info':
        data = need_ok(args, call(args, 'GET', '/api/webhook'), '读取 WebHook')
        w = data.get('webhook', {})
        print('WebHook：%s · 模式 %s' % ('启用' if w.get('enabled') else '关闭', w.get('mode')))
        print('地址：%s' % w.get('url', '(未填写)'))
        for e, on in (w.get('events') or {}).items():
            print('  事件 %-10s %s' % (e, '✓' if on else '✗'))
        hist = w.get('history') or []
        print('最近 %d 条推送：' % len(hist))
        for h in hist[:5]:
            mark = '✓' if h.get('ok') else '✗ ' + str(h.get('error') or h.get('status'))
            print('  %s %s %s' % ('✓' if h.get('ok') else '✗', h.get('action'), mark if not h.get('ok') else ''))
    elif args.action == 'push':
        body = {'action': args.event}
        if args.ids:
            body['ids'] = split_ids(args.ids)
        elif args.all:
            listing = need_ok(args, call(args, 'GET', '/api/tasks?scope=active'), '读取任务')
            body['ids'] = [t.get('id') for t in listing.get('tasks', [])]
        else:
            fail('用 --ids 1,2 指定任务，或 --all 推送全部活跃任务')
        need_ok(args, call(args, 'POST', '/api/webhook', body), '推送到表格')
        print('已触发推送到表格：%s' % body['action'])


def cmd_settings(args):
    if args.key is None and args.value is None:
        data = need_ok(args, call(args, 'GET', '/api/settings'), '读取设置')
        print(json.dumps(data.get('settings', {}), ensure_ascii=False, indent=2))
    elif args.value is None:
        data = need_ok(args, call(args, 'GET', '/api/settings?key=' + urllib.request.quote(args.key)), '读取设置')
        print('%s = %s' % (args.key, data.get('value')))
    else:
        need_ok(args, call(args, 'POST', '/api/settings', {'key': args.key, 'value': args.value}), '写入设置')
        print('%s = %s 已保存' % (args.key, args.value))


def cmd_schema(args):
    data = need_ok(args, call(args, 'GET', '/api/schema'), '读取接口说明')
    print('基地址：http://127.0.0.1:%d' % load_config(args)[0])
    for e in data.get('endpoints', []):
        print('  %-6s %-32s %s' % (e.get('method'), e.get('path'), e.get('desc')))


# ---------------------------------------------------------------- 参数解析

def build_parser():
    parser = argparse.ArgumentParser(
        prog=PROG, formatter_class=argparse.RawDescriptionHelpFormatter,
        description='专注计时器命令行工具（供 AI / 脚本直接操控）',
        epilog='示例：\n'
               '  python %(prog)s add "写周报" -p high --remind "2026-09-29 18:00"\n'
               '  python %(prog)s list --keyword 周报\n'
               '  python %(prog)s done 1759000000000\n'
               '  python %(prog)s timer start\n')
    parser.add_argument('--port', type=int, help='API 端口（默认读配置文件）')
    parser.add_argument('--token', help='API 令牌（默认读配置文件）')
    parser.add_argument('--json', action='store_true', help='输出原始 JSON（给程序处理用）')
    sub = parser.add_subparsers(dest='command')

    sub.add_parser('status', help='查看应用与计时器状态')

    p = sub.add_parser('add', help='添加任务')
    p.add_argument('content', help='任务内容')
    p.add_argument('-p', '--priority', default='low', help='优先级：high/medium/low（可写 紧急/中/低 或 1-3）')
    p.add_argument('-t', '--type', choices=['short', 'long'], default='short', help='类型（默认 short 短期）')
    p.add_argument('--remind', help='提醒时间：2026-09-29 18:00 / 09-29 18:00 / 18:00')
    p.add_argument('--image', action='append', help='图片：本地路径或 http 链接，可重复')
    p.add_argument('--base64', help='图片 base64 / dataURL')
    p.add_argument('--comment', help='评论，多条用 | 或 ； 分隔')
    p.add_argument('--top', action='store_true', help='插到列表最前（默认也是）')

    p = sub.add_parser('list', help='列出任务')
    p.add_argument('--scope', choices=['active', 'archive', 'all'], default='active')
    p.add_argument('--keyword', help='按内容搜索')
    p.add_argument('--limit', type=int, help='最多显示几条')

    p = sub.add_parser('get', help='查看单条任务详情')
    p.add_argument('id', type=int)

    p = sub.add_parser('update', help='修改任务')
    p.add_argument('id', type=int)
    p.add_argument('--content', help='覆盖任务内容')
    p.add_argument('--append', help='在任务末尾追加文字')
    p.add_argument('-p', '--priority', help='high/medium/low')
    p.add_argument('-t', '--type', choices=['short', 'long'])
    p.add_argument('--remind', help='提醒时间；传空串清除提醒')
    p.add_argument('--image', action='append', help='追加图片（本地路径或链接）')

    p = sub.add_parser('done', help='标记完成（--undone 反向）')
    p.add_argument('ids', help='任务 ID，多个用逗号分隔')
    p.add_argument('--undone', action='store_true', help='标记为未完成')

    p = sub.add_parser('delete', help='删除任务')
    p.add_argument('ids', help='任务 ID，多个用逗号分隔')

    p = sub.add_parser('comment', help='给任务加评论')
    p.add_argument('id', type=int)
    p.add_argument('text', help='评论内容')

    p = sub.add_parser('timer', help='控制计时器')
    p.add_argument('action', choices=['start', 'pause', 'toggle', 'reset', 'mode', 'set'])
    p.add_argument('--minutes', '-m', type=int, help='set：分钟')
    p.add_argument('--seconds', '-s', type=int, help='set：秒')

    p = sub.add_parser('notify', help='弹系统通知')
    p.add_argument('title')
    p.add_argument('body', nargs='?', default='')

    p = sub.add_parser('window', help='主窗口 / 悬浮窗')
    p.add_argument('action', choices=['show', 'hide', 'float'])

    p = sub.add_parser('clipboard', help='读写系统剪贴板图片（微信互通）')
    p.add_argument('action', choices=['get', 'set'])
    p.add_argument('--path', help='set：本地图片路径')
    p.add_argument('--url', help='set：图片链接')
    p.add_argument('--save', help='get：保存到该 png 路径')

    p = sub.add_parser('webhook', help='查看 / 触发表格同步')
    p.add_argument('action', choices=['info', 'push'])
    p.add_argument('--event', default='created', help='push 的事件名：created/completed/updated/archived/deleted')
    p.add_argument('--ids', help='push 的任务 ID，逗号分隔')
    p.add_argument('--all', action='store_true', help='push 全部活跃任务')

    p = sub.add_parser('settings', help='读写应用设置')
    p.add_argument('key', nargs='?')
    p.add_argument('value', nargs='?')

    sub.add_parser('schema', help='打印 HTTP API 自描述')
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)
    handler = {
        'status': cmd_status, 'add': cmd_add, 'list': cmd_list, 'get': cmd_get,
        'update': cmd_update, 'done': cmd_done, 'delete': cmd_delete, 'comment': cmd_comment,
        'timer': cmd_timer, 'notify': cmd_notify, 'window': cmd_window,
        'clipboard': cmd_clipboard, 'webhook': cmd_webhook, 'settings': cmd_settings,
        'schema': cmd_schema,
    }[args.command]
    handler(args)


if __name__ == '__main__':
    main()
