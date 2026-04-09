/**
 * 火一五·辉火云企业套件插件 (Odoo 19 Plugin)
 * 
 * 功能：
 * 1. 自然语言操作 Odoo（创建待办、提醒、活动等）
 * 2. Odoo 通知同步到 OpenClaw
 * 3. 智能意图理解和路由
 * 
 * 使用方式：
 * - 用户首次需要配置 Odoo 连接信息（URL、数据库、账号、密码）
 * - 配置后，插件会自动轮询 Odoo 通知
 * - 用户可以用自然语言操作 Odoo
 */

import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { OdooClient } from './src/modules/odoo-client.js';
import { NLPUtils } from './src/modules/nlp-handler.js';
import { NotificationPoller } from './src/modules/notification-poller.js';
import { ConfigManager } from './src/modules/config-manager.js';
import type { OdooPluginConfig, SyncUpdate, IntentResult } from './src/types/index.js';

// 存储已认证的 Odoo 客户端
const odooClients = new Map<string, OdooClient>();
const nlpHandlers = new Map<string, NLPUtils>();
const pollers = new Map<string, NotificationPoller>();

// 插件状态
const configManager = new ConfigManager();

const pluginState = {
  getStatus(agentId: string = 'default') {
    const client = odooClients.get(agentId);
    const poller = pollers.get(agentId);

    return {
      connected: client?.isAuthenticated() ?? false,
      uid: client?.getUid() ?? null,
      polling: poller?.getStatus() ?? null,
    };
  },

  async configure(api: any, config: OdooPluginConfig, agentId: string = 'default') {
    if (config.odoo) {
      // 保存配置
      configManager.saveOdooConfig(config.odoo);
      await initOdooClient(api, config.odoo, agentId);
    }
  },

  loadSavedConfig(): OdooPluginConfig | null {
    return configManager.load();
  },
};

export default definePluginEntry({
  id: 'odoo-dev',
  name: '火一五·辉火云企业套件插件',
  description: '自然语言操作辉火云企业套件（Odoo 19）、通知同步、待办管理、活动提醒',

  register(api) {
    const config = (api.pluginConfig ?? {}) as OdooPluginConfig;

    // 如果配置了 Odoo 连接，自动初始化
    if (config.odoo) {
      initOdooClient(api, config.odoo).catch(err => {
        console.error('[Odoo Plugin] 初始化失败:', err);
      });
    } else {
      // 尝试加载保存的配置
      const savedConfig = pluginState.loadSavedConfig();
      if (savedConfig?.odoo) {
        console.log('[Odoo Plugin] 发现保存的 Odoo 配置，正在连接...');
        initOdooClient(api, savedConfig.odoo).catch(err => {
          console.error('[Odoo Plugin] 恢复连接失败:', err);
        });
      }
    }

    // 注册工具
    registerTools(api);

    // 注册钩子
    registerHooks(api);

    console.log('[Odoo Plugin] 插件已加载');
  },
});

/**
 * 初始化 Odoo 客户端
 */
async function initOdooClient(api: any, odooConfig: NonNullable<OdooPluginConfig['odoo']>, agentId: string = 'default'): Promise<OdooClient> {
  const client = new OdooClient(odooConfig);

  try {
    await client.authenticate();
    odooClients.set(agentId, client);

    // 初始化 NLP 处理器
    const nlpHandler = new NLPUtils();
    nlpHandlers.set(agentId, nlpHandler);

    // 启动通知轮询
    const config = api.pluginConfig as OdooPluginConfig;
    const syncConfig = config.sync ?? { enabled: true, intervalSeconds: 30, channels: ['todo', 'activity', 'message'] };

    if (syncConfig.enabled) {
      const poller = new NotificationPoller(client);
      pollers.set(agentId, poller);

      poller.start((updates: SyncUpdate[]) => {
        handleOdooUpdates(api, updates, agentId);
      }, {
        intervalSeconds: syncConfig.intervalSeconds,
        channels: syncConfig.channels,
      });
    }

    console.log(`[Odoo Plugin] 已连接到 Odoo，用户ID: ${client.getUid()}`);
    return client;
  } catch (error) {
    console.error('[Odoo Plugin] Odoo 连接失败:', error);
    throw error;
  }
}

/**
 * 注册 OpenClaw 工具
 */
function registerTools(api: any) {
  // Odoo 连接工具
  api.registerTool({
    name: 'odoo_connect',
    description: '连接辉火云企业套件（Odoo 19）系统。需要提供系统地址、数据库名、账号和密码。',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Odoo 系统地址，如 https://www.huo15.com',
        },
        db: {
          type: 'string',
          description: '数据库名称，如 huo15',
        },
        username: {
          type: 'string',
          description: '用户名（邮箱或登录名）',
        },
        password: {
          type: 'string',
          description: '密码',
        },
      },
      required: ['url', 'db', 'username', 'password'],
    },
    async handler(params: { url: string; db: string; username: string; password: string }, ctx: any) {
      const agentId = ctx.agentId || 'default';
      const config: OdooPluginConfig = {
        odoo: {
          url: params.url,
          db: params.db,
          username: params.username,
          password: params.password,
        },
      };

      try {
        await pluginState.configure(api, config, agentId);
        return { success: true, message: `已成功连接到 ${params.url}` };
      } catch (error) {
        return { success: false, message: `连接失败: ${error}` };
      }
    },
  });

  // 创建待办工具
  api.registerTool({
    name: 'odoo_create_task',
    description: '在辉火云企业套件中创建待办任务',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '待办名称/标题',
        },
        description: {
          type: 'string',
          description: '待办详细描述',
        },
        date_deadline: {
          type: 'string',
          description: '截止日期，格式 YYYY-MM-DD',
        },
        priority: {
          type: 'string',
          enum: ['0', '1'],
          description: '优先级，0=普通，1=紧急',
        },
        project_id: {
          type: 'number',
          description: '所属项目ID（可选）',
        },
      },
      required: ['name'],
    },
    async handler(params: any, ctx: any) {
      const agentId = ctx.agentId || 'default';
      const client = odooClients.get(agentId);

      if (!client || !client.isAuthenticated()) {
        return { success: false, message: '未连接到 Odoo，请先使用 odoo_connect' };
      }

      try {
        const taskId = await client.createTask({
          name: params.name,
          description: params.description,
          date_deadline: params.date_deadline,
          priority: params.priority || '0',
          project_id: params.project_id,
        });

        return { success: true, message: `待办已创建，ID: ${taskId}`, taskId };
      } catch (error) {
        return { success: false, message: `创建失败: ${error}` };
      }
    },
  });

  // 获取待办列表工具
  api.registerTool({
    name: 'odoo_list_tasks',
    description: '获取当前用户的待办任务列表',
    schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: '返回数量限制，默认50',
        },
        project_id: {
          type: 'number',
          description: '筛选特定项目的待办',
        },
      },
    },
    async handler(params: any, ctx: any) {
      const agentId = ctx.agentId || 'default';
      const client = odooClients.get(agentId);

      if (!client || !client.isAuthenticated()) {
        return { success: false, message: '未连接到 Odoo' };
      }

      try {
        const tasks = await client.getMyTasks({
          limit: params.limit || 50,
          project_id: params.project_id,
        });

        return {
          success: true,
          tasks: tasks.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            date_deadline: t.date_deadline,
            priority: t.priority,
            stage: t.stage_id,
          })),
          count: tasks.length,
        };
      } catch (error) {
        return { success: false, message: `查询失败: ${error}` };
      }
    },
  });

  // 创建日历事件工具
  api.registerTool({
    name: 'odoo_create_event',
    description: '在辉火云企业套件中创建日历事件/会议',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '事件名称',
        },
        start: {
          type: 'string',
          description: '开始时间，格式 YYYY-MM-DD HH:MM:SS',
        },
        stop: {
          type: 'string',
          description: '结束时间，格式 YYYY-MM-DD HH:MM:SS',
        },
        description: {
          type: 'string',
          description: '事件描述',
        },
        partner_ids: {
          type: 'array',
          items: { type: 'number' },
          description: '参与人ID列表',
        },
      },
      required: ['name', 'start', 'stop'],
    },
    async handler(params: any, ctx: any) {
      const agentId = ctx.agentId || 'default';
      const client = odooClients.get(agentId);

      if (!client || !client.isAuthenticated()) {
        return { success: false, message: '未连接到 Odoo' };
      }

      try {
        const eventId = await client.createCalendarEvent({
          name: params.name,
          start: params.start,
          stop: params.stop,
          description: params.description,
          partner_ids: params.partner_ids,
        });

        return { success: true, message: `日历事件已创建，ID: ${eventId}`, eventId };
      } catch (error) {
        return { success: false, message: `创建失败: ${error}` };
      }
    },
  });

  // 创建活动提醒工具
  api.registerTool({
    name: 'odoo_create_activity',
    description: '在辉火云企业套件中创建活动提醒（待办类型）',
    schema: {
      type: 'object',
      properties: {
        res_model: {
          type: 'string',
          description: '关联模型，如 project.task',
        },
        res_id: {
          type: 'number',
          description: '关联记录ID',
        },
        activity_type_id: {
          type: 'number',
          description: '活动类型ID',
        },
        summary: {
          type: 'string',
          description: '活动摘要',
        },
        note: {
          type: 'string',
          description: '活动详细说明',
        },
        date_deadline: {
          type: 'string',
          description: '截止日期，格式 YYYY-MM-DD',
        },
        user_id: {
          type: 'number',
          description: '负责人ID',
        },
      },
      required: ['res_model', 'res_id', 'activity_type_id', 'date_deadline'],
    },
    async handler(params: any, ctx: any) {
      const agentId = ctx.agentId || 'default';
      const client = odooClients.get(agentId);

      if (!client || !client.isAuthenticated()) {
        return { success: false, message: '未连接到 Odoo' };
      }

      try {
        const activityId = await client.createActivity({
          res_model: params.res_model,
          res_id: params.res_id,
          activity_type_id: params.activity_type_id,
          summary: params.summary,
          note: params.note,
          date_deadline: params.date_deadline,
          user_id: params.user_id,
        });

        return { success: true, message: `活动提醒已创建，ID: ${activityId}`, activityId };
      } catch (error) {
        return { success: false, message: `创建失败: ${error}` };
      }
    },
  });

  // 通用查询工具
  api.registerTool({
    name: 'odoo_search',
    description: '在辉火云企业套件中搜索记录',
    schema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: '模型名称，如 res.partner, project.task, crm.lead',
        },
        domain: {
          type: 'array',
          description: '搜索域，格式 [[field, operator, value], ...]',
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: '返回字段列表',
        },
        limit: {
          type: 'number',
          description: '返回数量限制',
        },
      },
      required: ['model'],
    },
    async handler(params: any, ctx: any) {
      const agentId = ctx.agentId || 'default';
      const client = odooClients.get(agentId);

      if (!client || !client.isAuthenticated()) {
        return { success: false, message: '未连接到 Odoo' };
      }

      try {
        const result = await client.searchRead(
          params.model,
          params.domain || [],
          params.fields || ['id', 'name'],
          { limit: params.limit || 50 }
        );

        return {
          success: true,
          records: result.records,
          count: result.length,
        };
      } catch (error) {
        return { success: false, message: `查询失败: ${error}` };
      }
    },
  });

  // 发送消息工具
  api.registerTool({
    name: 'odoo_send_message',
    description: '在辉火云企业套件中发送消息',
    schema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: '目标模型',
        },
        res_id: {
          type: 'number',
          description: '目标记录ID',
        },
        body: {
          type: 'string',
          description: '消息内容',
        },
      },
      required: ['model', 'res_id', 'body'],
    },
    async handler(params: any, ctx: any) {
      const agentId = ctx.agentId || 'default';
      const client = odooClients.get(agentId);

      if (!client || !client.isAuthenticated()) {
        return { success: false, message: '未连接到 Odoo' };
      }

      try {
        const messageId = await client.call('mail.message', 'create', [{
          model: params.model,
          res_id: params.res_id,
          body: params.body,
          message_type: 'comment',
        }]);

        return { success: true, message: `消息已发送，ID: ${messageId}`, messageId };
      } catch (error) {
        return { success: false, message: `发送失败: ${error}` };
      }
    },
  });

  // 获取连接状态工具
  api.registerTool({
    name: 'odoo_status',
    description: '获取辉火云企业套件连接状态',
    schema: {
      type: 'object',
      properties: {},
    },
    async handler(_params: any, ctx: any) {
      const agentId = ctx.agentId || 'default';
      const status = pluginState.getStatus(agentId);

      return {
        success: true,
        ...status,
      };
    },
  });

  console.log('[Odoo Plugin] 工具已注册');
}

/**
 * 注册钩子
 */
function registerHooks(api: any) {
  // OpenClaw 4.10+ API: registerHook("eventName", handler)
  // onMessage 事件会传递 (channelName, user, text, msg)
  api.registerHook('onMessage', async (text: string, user: string, channelName: string, msg: any) => {
    if (!text || typeof text !== 'string') {
      return null; // 没有有效文本，不拦截
    }

    const agentId = msg?.agentId || 'default';
    const nlpHandler = nlpHandlers.get(agentId);

    if (!nlpHandler) {
      return null; // 不拦截，继续处理
    }

    const intent = nlpHandler.parse(text);

    // 如果置信度较低，不拦截
    if (intent.confidence < 0.6) {
      return null;
    }

    // 处理已知意图
    return handleIntent(intent, api, agentId);
  });

  console.log('[Odoo Plugin] 钩子已注册（onMessage hook）');
}

/**
 * 处理意图
 */
async function handleIntent(intent: IntentResult, api: any, agentId: string): Promise<any> {
  const client = odooClients.get(agentId);

  if (!client || !client.isAuthenticated()) {
    return {
      content: '请先连接到辉火云企业套件。使用命令：帮我连接 Odoo（提供 URL、数据库、账号、密码）',
    };
  }

  try {
    switch (intent.intent) {
      case 'todo.create':
      case 'todo.create.withReminder': {
        const taskId = await client.createTask({
          name: intent.entities.name as string || '新待办',
          description: intent.entities.description as string || '',
          date_deadline: intent.entities.date as string || undefined,
          priority: intent.entities.priority as '0' | '1' || '0',
        });
        return {
          content: `✅ 已创建待办「${intent.entities.name}」，ID: ${taskId}`,
        };
      }

      case 'todo.list': {
        const tasks = await client.getMyTasks({ limit: 10 });
        if (tasks.length === 0) {
          return { content: '📋 您目前没有待办任务' };
        }
        const list = tasks.map((t: any, i: number) => `${i + 1}. ${t.name}${t.date_deadline ? ` (截止: ${t.date_deadline})` : ''}`).join('\n');
        return {
          content: `📋 您的待办列表：\n${list}`,
        };
      }

      case 'calendar.create':
      case 'calendar.create.withDate': {
        const startDate = resolveRelativeDate(intent.entities.relative as string, intent.entities.date as string, 'start');
        const endDate = resolveRelativeDate(intent.entities.relative as string, intent.entities.date as string, 'end');
        const eventId = await client.createCalendarEvent({
          name: intent.entities.eventName as string || '新事件',
          start: startDate,
          stop: endDate,
        });
        return {
          content: `✅ 已创建日历事件「${intent.entities.eventName}」，ID: ${eventId}`,
        };
      }

      case 'search.partner':
      case 'search.contact': {
        const result = await client.searchRead('res.partner', [
          ['name', 'ilike', intent.entities.term as string],
          ['company_type', '=', 'company'],
        ], ['id', 'name', 'phone', 'email'], { limit: 10 });
        if (result.records.length === 0) {
          return { content: `未找到客户：${intent.entities.term}` };
        }
        const list = result.records.map((p: any, i: number) => `${i + 1}. ${p.name} ${p.phone || ''}`).join('\n');
        return {
          content: `🔍 客户搜索结果：\n${list}`,
        };
      }

      case 'project.list': {
        const result = await client.searchRead('project.project', [
          ['active', '=', true],
        ], ['id', 'name', 'partner_id'], { limit: 20 });
        if (result.records.length === 0) {
          return { content: '您目前没有项目' };
        }
        const list = result.records.map((p: any, i: number) => `${i + 1}. ${p.name}`).join('\n');
        return {
          content: `📁 项目列表：\n${list}`,
        };
      }

      case 'crm.opportunity.list': {
        const result = await client.searchRead('crm.lead', [
          ['type', '=', 'opportunity'],
          ['active', '=', true],
        ], ['id', 'name', 'partner_id', 'stage_id', 'probability'], { limit: 20 });
        if (result.records.length === 0) {
          return { content: '您目前没有商机' };
        }
        const list = result.records.map((o: any, i: number) => `${i + 1}. ${o.name}`).join('\n');
        return {
          content: `💰 商机列表：\n${list}`,
        };
      }

      case 'crm.opportunity.create': {
        const name = intent.entities.partnerName as string || '新商机';
        const leadId = await client.create('crm.lead', {
          name,
          type: 'opportunity',
          active: true,
        });
        return {
          content: `✅ 已创建商机「${name}」，ID: ${leadId}`,
        };
      }

      case 'crm.lead.list': {
        const result = await client.searchRead('crm.lead', [
          ['type', '=', 'lead'],
          ['active', '=', true],
        ], ['id', 'name', 'partner_id', 'stage_id'], { limit: 20 });
        if (result.records.length === 0) {
          return { content: '您目前没有线索' };
        }
        const list = result.records.map((l: any, i: number) => `${i + 1}. ${l.name}`).join('\n');
        return {
          content: `📝 线索列表：\n${list}`,
        };
      }

      case 'crm.lead.create': {
        const name = intent.entities.partnerName as string || '新线索';
        const contact = intent.entities.contact as { name?: string; phone?: string; email?: string } || {};
        const leadId = await client.create('crm.lead', {
          name,
          type: 'lead',
          contact_name: contact.name,
          phone: contact.phone,
          email_from: contact.email,
          active: true,
        });
        return {
          content: `✅ 已创建线索「${name}」，ID: ${leadId}`,
        };
      }

      case 'sale.order.list': {
        const result = await client.searchRead('sale.order', [
          ['state', 'not in', ['cancel']],
        ], ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state'], { limit: 20 });
        if (result.records.length === 0) {
          return { content: '您目前没有销售订单' };
        }
        const list = result.records.map((o: any, i: number) => 
          `${i + 1}. ${o.name} - ${o.partner_id?.[1] || '未知客户'} - ¥${o.amount_total || 0} - ${o.state}`
        ).join('\n');
        return {
          content: `📦 销售订单列表：\n${list}`,
        };
      }

      case 'purchase.order.list': {
        const result = await client.searchRead('purchase.order', [
          ['state', 'not in', ['cancel']],
        ], ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state'], { limit: 20 });
        if (result.records.length === 0) {
          return { content: '您目前没有采购订单' };
        }
        const list = result.records.map((o: any, i: number) => 
          `${i + 1}. ${o.name} - ${o.partner_id?.[1] || '未知供应商'} - ¥${o.amount_total || 0} - ${o.state}`
        ).join('\n');
        return {
          content: `🛒 采购订单列表：\n${list}`,
        };
      }

      case 'stock.inventory': {
        const term = intent.entities.term as string || '';
        const domain: any = [];
        if (term) {
          domain.push(['product_id.name', 'ilike', term]);
        }
        const result = await client.searchRead('stock.quant', domain, 
          ['id', 'product_id', 'quantity', 'location_id'], 
          { limit: 20 }
        );
        if (result.records.length === 0) {
          return { content: '未找到相关库存记录' };
        }
        const list = result.records.map((q: any, i: number) => 
          `${i + 1}. ${q.product_id?.[1] || '未知产品'} - 数量: ${q.quantity} - 位置: ${q.location_id?.[1] || '未知'}`
        ).join('\n');
        return {
          content: `📦 库存查询结果：\n${list}`,
        };
      }

      case 'project.timesheet.list': {
        const uid = client.getUid() || 0;
        const result = await client.searchRead('account.analytic.line', [
          ['user_id', '=', uid],
        ], ['id', 'name', 'unit_amount', 'date', 'project_id'], { limit: 20 });
        if (result.records.length === 0) {
          return { content: '您目前没有工时记录' };
        }
        const list = result.records.map((t: any, i: number) => 
          `${i + 1}. ${t.name || '无描述'} - ${t.unit_amount}h - ${t.date} - ${t.project_id?.[1] || '未知项目'}`
        ).join('\n');
        return {
          content: `⏱️ 工时记录：\n${list}`,
        };
      }

      case 'project.task.recordHours': {
        const hours = intent.entities.hours as number || 1;
        const description = intent.entities.description as string || '工时记录';
        const timesheetId = await client.create('account.analytic.line', {
          name: description,
          unit_amount: hours,
          date: new Date().toISOString().split('T')[0],
          user_id: client.getUid() || 1,
        });
        return {
          content: `✅ 已记录工时 ${hours} 小时，ID: ${timesheetId}`,
        };
      }

      case 'todo.done': {
        const taskName = intent.entities.taskName as string;
        if (!taskName) {
          return { content: '请指定要完成的待办名称' };
        }
        const tasks = await client.searchRead('project.task', [
          ['name', 'ilike', taskName],
          ['active', '=', true],
        ], ['id', 'name'], { limit: 1 });
        if (tasks.records.length === 0) {
          return { content: `未找到待办：${taskName}` };
        }
        await client.write('project.task', [tasks.records[0].id as number], { active: false });
        return {
          content: `✅ 已完成待办「${taskName}」`,
        };
      }

      case 'todo.delete': {
        const taskName = intent.entities.taskName as string;
        if (!taskName) {
          return { content: '请指定要删除的待办名称' };
        }
        const tasks = await client.searchRead('project.task', [
          ['name', 'ilike', taskName],
        ], ['id', 'name'], { limit: 1 });
        if (tasks.records.length === 0) {
          return { content: `未找到待办：${taskName}` };
        }
        await client.unlink('project.task', [tasks.records[0].id as number]);
        return {
          content: `✅ 已删除待办「${taskName}」`,
        };
      }

      default:
        return null; // 不拦截，让其他处理
    }
  } catch (error) {
    console.error('[Odoo Plugin] 处理意图失败:', error);
    return {
      content: `⚠️ 操作失败: ${error}`,
    };
  }
}

/**
 * 处理 Odoo 更新通知
 */
function handleOdooUpdates(api: any, updates: SyncUpdate[], agentId: string) {
  for (const update of updates) {
    let message = '';

    switch (update.type) {
      case 'todo':
        if (update.action === 'create') {
          message = `📋 新待办：${(update.data as any).name}`;
        } else if (update.action === 'update') {
          message = `📋 待办更新：${(update.data as any).name}`;
        }
        break;

      case 'activity':
        message = `⏰ 活动提醒：${(update.data as any).summary || '新活动'}`;
        break;

      case 'message':
        message = `💬 新消息：${(update.data as any).subject || '无主题'}`;
        break;
    }

    if (message) {
      // 通过 OpenClaw 发送通知
      api.sendNotification?.({
        agentId,
        title: '辉火云企业套件',
        body: message,
        data: update,
      }).catch(console.error);
    }
  }
}

/**
 * 解析相对日期
 */
function resolveRelativeDate(relative: string | null, explicitDate: string | null, type: 'start' | 'end'): string {
  const now = new Date();

  if (explicitDate) {
    const date = new Date(explicitDate);
    if (type === 'start') {
      date.setHours(9, 0, 0, 0);
    } else {
      date.setHours(18, 0, 0, 0);
    }
    return formatOdooDate(date);
  }

  if (relative === 'tomorrow') {
    now.setDate(now.getDate() + 1);
  } else if (relative === 'day after tomorrow') {
    now.setDate(now.getDate() + 2);
  } else if (relative === 'next week') {
    now.setDate(now.getDate() + 7);
  } else if (relative === 'this week') {
    // 本周五
    const dayOfWeek = now.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    now.setDate(now.getDate() + daysUntilFriday);
  }

  if (type === 'start') {
    now.setHours(9, 0, 0, 0);
  } else {
    now.setHours(18, 0, 0, 0);
  }

  return formatOdooDate(now);
}

/**
 * 格式化日期为 Odoo 格式
 */
function formatOdooDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}
