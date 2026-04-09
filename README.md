<div align="center">

<img src="https://tools.huo15.com/uploads/images/system/logo-colours.png" alt="火一五Logo" style="width: 120px; height: auto; display: inline; margin: 0;" />

</div>

<div align="center">

<h3>打破信息孤岛，用一套系统驱动企业增长</h3>
<h3>加速企业用户向全场景人工智能机器人转变</h3>

</div>

<div align="center">

| 🏫 教学机构 | 👨‍🏫 讲师 | 📧 联系方式         | 💬 QQ群      | 📺 配套视频                         |
|:-----------:|:--------:|:------------------:|:-----------:|:-----------------------------------:|
| 逸寻智库 | Job | support@huo15.com | 1093992108  | [📺 B站视频](https://space.bilibili.com/400418085) |

</div>

---

# 火一五·辉火云企业套件插件

> OpenClaw 插件 — 自然语言操作辉火云企业套件（Odoo 19）、通知同步、待办管理、活动提醒

**版本：** 0.1.0

---

## 功能特性

### 🤖 智能自然语言操作

用户可以用自然语言与 Odoo 交互，系统自动理解意图并执行操作：

| 用户说 | 系统理解 | 执行操作 |
|--------|----------|----------|
| 帮我创建个待办 | todo.create | 在 project.task 创建记录 |
| 提醒我明天开会 | calendar.create | 创建日历事件 |
| 看看我的待办 | todo.list | 查询用户待办列表 |
| 帮我查一下客户 | search.partner | 搜索 res.partner |

### 🔔 通知同步

自动轮询 Odoo 系统，将以下更新实时同步到 OpenClaw：

- 📋 待办任务更新
- ⏰ 活动提醒
- 💬 新消息
- 📧 邮件通知
- 📅 日历事件

### 🛠️ 完整工具集

| 工具 | 说明 |
|------|------|
| odoo_connect | 连接 Odoo 系统 |
| odoo_create_task | 创建待办任务 |
| odoo_list_tasks | 获取待办列表 |
| odoo_create_event | 创建日历事件 |
| odoo_create_activity | 创建活动提醒 |
| odoo_search | 通用记录搜索 |
| odoo_send_message | 发送消息 |
| odoo_status | 获取连接状态 |

---

## 安装

```bash
# 克隆项目
git clone https://github.com/zhaobod1/huo15-openclaw-odoo-dev.git

# 进入目录
cd huo15-openclaw-odoo-dev

# 安装依赖
npm install

# 源码模式安装到 OpenClaw
openclaw plugins install -l .
```

---

## 配置

### 插件配置（openclaw.plugin.json）

```json
{
  "id": "odoo-dev",
  "name": "火一五·辉火云企业套件插件",
  "configSchema": {
    "properties": {
      "odoo": {
        "type": "object",
        "properties": {
          "url": "https://www.huo15.com",
          "db": "huo15",
          "username": "your@email.com",
          "password": "your-password"
        }
      },
      "sync": {
        "type": "object",
        "properties": {
          "enabled": true,
          "intervalSeconds": 30,
          "channels": ["todo", "activity", "message"]
        }
      }
    }
  }
}
```

### 首次连接

用户也可以通过聊天命令首次连接：

```
帮我连接 Odoo
- URL: https://www.huo15.com
- 数据库: huo15
- 账号: your@email.com
- 密码: your-password
```

---

## 支持的 Odoo 模型

### 常用模型

| 模型 | 说明 | 支持操作 |
|------|------|----------|
| project.task | 待办任务 | CRUD |
| calendar.event | 日历事件 | CRUD |
| mail.activity | 活动提醒 | CRUD |
| mail.message | 消息 | CRUD |
| res.partner | 联系人/客户 | CRUD |
| project.project | 项目 | CRUD |
| crm.lead | 商机/线索 | CRUD |

### 扩展模型

| 模型 | 说明 |
|------|------|
| sale.order | 销售订单 |
| purchase.order | 采购订单 |
| stock.quant | 库存 |
| account.move | 财务凭证 |
| hr.employee | 员工 |

---

## 工作流程

### 1. 首次配置

```
用户：帮我连接辉火云
助手：请提供 Odoo 系统地址、数据库名、账号和密码
用户：https://www.huo15.com, huo15, admin@huo15.com, password123
助手：✅ 已成功连接到辉火云企业套件
```

### 2. 创建待办

```
用户：帮我创建一个待办，明天给客户发报价单
助手：✅ 已创建待办「给客户发报价单」，截止日期: 明天
```

### 3. 查看列表

```
用户：看看我的待办
助手：📋 您的待办列表：
1. 给客户发报价单 (截止: 2026-04-10)
2. 跟进订单进度
3. 周会准备
```

### 4. 创建日历事件

```
用户：提醒我后天上午10点有个产品评审会议
助手：✅ 已创建日历事件「产品评审会议」，时间: 后天 10:00
```

---

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                     OpenClaw                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │              odoo-dev 插件                       │    │
│  │  ┌─────────────┐  ┌──────────────┐              │    │
│  │  │ NLP 处理器  │  │ 通知轮询器    │              │    │
│  │  │             │  │              │              │    │
│  │  │ • 意图解析  │  │ • 定时轮询    │              │    │
│  │  │ • 实体提取  │  │ • 变更检测    │              │    │
│  │  │ • 路由分发  │  │ • 推送通知    │              │    │
│  │  └─────────────┘  └──────────────┘              │    │
│  │                                                   │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │            Odoo JSON-RPC 客户端          │    │    │
│  │  │                                          │    │    │
│  │  │ • 认证 /web/session/authenticate        │    │    │
│  │  │ • 查询 /web/dataset/call_kw            │    │    │
│  │  │ • 通知轮询                              │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│               辉火云企业套件（Odoo 19）                   │
│                                                          │
│  • 项目管理 (project)     • CRM 客户关系                  │
│  • 客户联系人 (res.partner)  • 日历 (calendar)           │
│  • 消息 (mail)           • 库存 (stock)                  │
│  • 销售 (sale)            • 采购 (purchase)               │
│  • 财务 (account)         • 人力资源 (hr)                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 目录结构

```
huo15-openclaw-odoo-dev/
├── index.ts                    # 插件入口
├── package.json                # 项目配置
├── openclaw.plugin.json        # 插件清单
├── README.md                   # 本文件
└── src/
    ├── index.ts                # 入口导出
    ├── types/
    │   └── index.ts            # 类型定义
    └── modules/
        ├── odoo-client.ts       # Odoo API 客户端
        ├── nlp-handler.ts       # 自然语言处理器
        └── notification-poller.ts # 通知轮询器
```

---

## 开发

### 源码修改后重新安装

```bash
# 停止 OpenClaw
openclaw gateway stop

# 重新安装
openclaw plugins install -l /path/to/huo15-openclaw-odoo-dev

# 启动 OpenClaw
openclaw gateway start
```

### 调试

插件会在控制台输出日志：

```
[Odoo Plugin] 插件已加载
[Odoo Plugin] 已连接到 Odoo，用户ID: 5
[Odoo Plugin] 工具已注册
[Odoo Plugin] 钩子已注册
```

---

## TODO

- [ ] 支持 WebSocket 实时通知（替代轮询）
- [ ] 支持更多 Odoo 模型的操作
- [ ] 支持 Odoo Workflow 审批流
- [ ] 支持仪表盘数据查询
- [ ] 支持报表生成
- [ ] 支持附件上传/下载
- [ ] 多语言国际化（中文/英文）

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 0.1.0 | 2026-04-10 | 首次发布，支持基础 CRUD 和通知同步 |

---

## 作者

**青岛火一五信息科技有限公司**

---

## 许可

MIT License

---

<div align="center">

**公司名称：** 青岛火一五信息科技有限公司

**联系邮箱：** postmaster@huo15.com | **QQ群：** 1093992108

---

**关注逸寻智库公众号，获取更多资讯**

<img src="https://tools.huo15.com/uploads/images/system/qrcode_yxzk.jpg" alt="逸寻智库公众号二维码" style="width: 200px; height: auto; margin: 10px 0;" />

</div>

---
