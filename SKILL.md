---
name: huo15-openclaw-odoo-dev
displayName: 火一五·辉火云企业套件插件
description: OpenClaw 插件 - 自然语言操作辉火云企业套件（Odoo 19）、通知同步、待办管理、活动提醒（多用户隔离版）
version: 0.3.0
---

# 火一五·辉火云企业套件插件

> OpenClaw 插件 — 自然语言操作辉火云企业套件（Odoo 19）（多用户隔离版）

## 功能

- 🤖 自然语言操作（待办、日历、CRM商机、销售订单等）
- 🔔 通知同步（待办、活动、消息）
- ⚡ 30+ 意图模式
- 👥 **多用户隔离**（每个用户独立配置，数据完全隔离）

## 安装

```bash
openclaw plugins install @huo15/openclaw-odoo-dev
```

## 首次使用

用户首次操作 Odoo 时，插件会自动引导配置：

```
帮我查一下销售订单
→ 🔔 首次使用 Odoo 插件，需要先配置连接信息
```

提供以下信息即可：
- **系统地址**（URL）
- **数据库名称**
- **用户名**
- **密码**

## 工具

- `odoo_connect` - 显式连接 Odoo
- `odoo_setup_from_text` - 从自然语言解析配置
- `odoo_create_task` - 创建待办
- `odoo_list_tasks` - 待办列表
- `odoo_create_event` - 创建日历
- `odoo_search` - 通用搜索
- `odoo_status` - 连接状态

## 多用户隔离

- 每个用户（agentId）独立配置
- 配置保存在 `~/.openclaw/plugin-configs/odoo-config.json`
- 用户间数据完全隔离

## 安全说明

⚠️ 当前版本密码明文存储。
TODO: 后续升级为 SecretInput 机制（env/file/exec）
