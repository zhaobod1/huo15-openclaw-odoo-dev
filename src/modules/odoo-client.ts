/**
 * Odoo JSON-RPC API 客户端
 * 
 * 支持 Odoo 19 的 JSON-RPC 接口：
 * - 认证：/web/session/authenticate
 * - 查询：/web/dataset/call_kw (search_read, read, create, write, unlink)
 * - 会话：/web/session/get_session_info
 */

import type { OdooConfig, OdooSession, OdooRecord, OdooError } from '../types/index.js';

// Domain 类型：可以是单个字符串（ID）或 [field, operator, value] 元组
type DomainItem = string | [string, string, unknown];
type Domain = DomainItem[];

/** 类型守卫：检查是否为 Odoo 错误响应 */
function isOdooError(result: unknown): result is { error: OdooError } {
  return typeof result === 'object' && result !== null && 'error' in result;
}

export class OdooClient {
  private url: string;
  private db: string;
  private username: string;
  private password: string;
  private uid: number | null = null;
  private session_id: string | null = null;
  private user_context: Record<string, unknown> = {};

  constructor(config: OdooConfig) {
    this.url = config.url.replace(/\/$/, '');
    this.db = config.db;
    this.username = config.username;
    this.password = config.password;
  }

  /**
   * 认证登录
   */
  async authenticate(): Promise<OdooSession> {
    const result = await this.rpc('/web/session/authenticate', {
      db: this.db,
      login: this.username,
      password: this.password,
    });

    if (isOdooError(result)) {
      throw new Error(`认证失败: ${JSON.stringify(result.error)}`);
    }

    const session = result as OdooSession;
    this.uid = session.uid;
    this.session_id = session.session_id as string | null;
    this.user_context = session.user_context || {};

    return session;
  }

  /**
   * 检查会话是否有效
   */
  async checkSession(): Promise<boolean> {
    try {
      const result = await this.rpc('/web/session/get_session_info', {});
      const r = result as any;
      return 'uid' in r && r.uid !== false;
    } catch {
      return false;
    }
  }

  /**
   * 销毁会话
   */
  async destroy(): Promise<void> {
    try {
      await this.rpc('/web/session/destroy', {});
    } finally {
      this.uid = null;
      this.session_id = null;
      this.user_context = {};
    }
  }

  /**
   * 搜索记录
   */
  async searchRead(
    model: string,
    domain: Domain,
    fields: string[] = ['id'],
    options: {
      limit?: number;
      offset?: number;
      order?: string;
    } = {}
  ): Promise<{ length: number; records: OdooRecord[] }> {
    const { limit = 100, offset = 0, order = '' } = options;

    const result = await this.rpc('/web/dataset/call_kw', {
      model,
      method: 'search_read',
      args: [domain],
      kwargs: {
        fields,
        domain,
        limit,
        offset,
        order,
      },
    });

    if (isOdooError(result)) {
      throw new Error(`查询失败: ${JSON.stringify(result.error)}`);
    }

    const records = Array.isArray(result) ? result : [];
    return {
      length: records.length,
      records,
    };
  }

  /**
   * 读取单条记录
   */
  async read(model: string, ids: number[], fields: string[] = ['id', 'name']): Promise<OdooRecord[]> {
    const result = await this.rpc('/web/dataset/call_kw', {
      model,
      method: 'read',
      args: [ids],
      kwargs: { fields },
    });

    if (isOdooError(result)) {
      throw new Error(`读取失败: ${JSON.stringify(result.error)}`);
    }

    return result as OdooRecord[];
  }

  /**
   * 创建记录
   */
  async create(model: string, values: Record<string, unknown>): Promise<number> {
    const result = await this.rpc('/web/dataset/call_kw', {
      model,
      method: 'create',
      args: [values],
      kwargs: {},
    });

    if (isOdooError(result)) {
      throw new Error(`创建失败: ${JSON.stringify(result.error)}`);
    }

    return result as number;
  }

  /**
   * 更新记录
   */
  async write(model: string, ids: number[], values: Record<string, unknown>): Promise<boolean> {
    const result = await this.rpc('/web/dataset/call_kw', {
      model,
      method: 'write',
      args: [ids, values],
      kwargs: {},
    });

    if (isOdooError(result)) {
      throw new Error(`更新失败: ${JSON.stringify(result.error)}`);
    }

    return result === true;
  }

  /**
   * 删除记录
   */
  async unlink(model: string, ids: number[]): Promise<boolean> {
    const result = await this.rpc('/web/dataset/call_kw', {
      model,
      method: 'unlink',
      args: [ids],
      kwargs: {},
    });

    if (isOdooError(result)) {
      throw new Error(`删除失败: ${JSON.stringify(result.error)}`);
    }

    return result === true;
  }

  /**
   * 执行搜索计数
   */
  async searchCount(model: string, domain: Domain): Promise<number> {
    const result = await this.rpc('/web/dataset/call_kw', {
      model,
      method: 'search_count',
      args: [domain],
      kwargs: {},
    });

    if (isOdooError(result)) {
      throw new Error(`计数失败: ${JSON.stringify(result.error)}`);
    }

    return result as number;
  }

  /**
   * 调用任意方法
   */
  async call(model: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): Promise<unknown> {
    const result = await this.rpc('/web/dataset/call_kw', {
      model,
      method,
      args,
      kwargs,
    });

    if (isOdooError(result)) {
      throw new Error(`调用失败: ${JSON.stringify(result.error)}`);
    }

    return result;
  }

  /**
   * 获取当前用户ID
   */
  getUid(): number | null {
    return this.uid;
  }

  /**
   * 是否已登录
   */
  isAuthenticated(): boolean {
    return this.uid !== null;
  }

  // ==================== 专用业务方法 ====================

  /**
   * 创建待办任务（project.task）
   */
  async createTask(values: {
    name: string;
    description?: string;
    project_id?: number;
    date_deadline?: string;
    user_ids?: number[];
    priority?: '0' | '1';
  }): Promise<number> {
    return this.create('project.task', {
      name: values.name,
      description: values.description || '',
      project_id: values.project_id || false,
      date_deadline: values.date_deadline || false,
      user_ids: values.user_ids ? [[6, false, values.user_ids]] : [[6, false, [this.uid || 1]]],
      priority: values.priority || '0',
      active: true,
    });
  }

  /**
   * 获取我的待办列表
   */
  async getMyTasks(options: { limit?: number; project_id?: number } = {}): Promise<OdooRecord[]> {
    const domain: Domain = [
      ['user_ids', 'in', [this.uid || 0]],
      ['active', '=', true],
    ];

    if (options.project_id) {
      domain.push(['project_id', '=', options.project_id]);
    }

    const result = await this.searchRead('project.task', domain, [
      'id', 'name', 'description', 'date_deadline', 'stage_id', 'project_id', 'priority', 'user_ids',
    ], { limit: options.limit || 50 });

    return result.records;
  }

  /**
   * 创建日历活动提醒（mail.activity）
   */
  async createActivity(values: {
    res_model: string;
    res_id: number;
    activity_type_id: number;
    summary?: string;
    note?: string;
    date_deadline: string;
    user_id?: number;
  }): Promise<number> {
    return this.create('mail.activity', {
      res_model: values.res_model,
      res_id: values.res_id,
      activity_type_id: values.activity_type_id,
      summary: values.summary || '',
      note: values.note || '',
      date_deadline: values.date_deadline,
      user_id: values.user_id || this.uid || 1,
    });
  }

  /**
   * 创建日历事件（calendar.event）
   */
  async createCalendarEvent(values: {
    name: string;
    start: string;
    stop: string;
    description?: string;
    partner_ids?: number[];
    alarm_ids?: number[];
  }): Promise<number> {
    return this.create('calendar.event', {
      name: values.name,
      start: values.start,
      stop: values.stop,
      description: values.description || '',
      partner_ids: values.partner_ids ? [[6, false, values.partner_ids]] : [[6, false, [this.uid || 1]]],
      alarm_ids: values.alarm_ids ? [[6, false, values.alarm_ids]] : false,
      duration: 1,
    });
  }

  /**
   * 获取我的未读消息
   */
  async getUnreadMessages(options: { limit?: number } = {}): Promise<OdooRecord[]> {
    const result = await this.searchRead('mail.message', [
      ['message_type', '!=', 'notification'],
      ['to_read', '=', true],
    ], [
      'id', 'body', 'date', 'author_id', 'model', 'res_id', 'subject',
    ], { limit: options.limit || 20 });

    return result.records;
  }

  /**
   * 获取最近的系统通知
   */
  async getRecentNotifications(options: { limit?: number; since?: string } = {}): Promise<OdooRecord[]> {
    const domain: Domain = [
      ['message_type', '!=', 'email'],
    ];

    if (options.since) {
      domain.push(['write_date', '>=', options.since]);
    }

    const result = await this.searchRead('mail.message', domain, [
      'id', 'body', 'date', 'author_id', 'model', 'res_id', 'subject', 'message_type',
    ], { limit: options.limit || 50 });

    return result.records;
  }

  /**
   * 发送邮件
   */
  async sendEmail(values: {
    subject: string;
    body: string;
    recipient_ids: number[];
    model?: string;
    res_id?: number;
  }): Promise<number> {
    return this.create('mail.mail', {
      subject: values.subject,
      body: values.body,
      email_to: values.recipient_ids.map(id => `partner_${id}@localhost`).join(','),
      recipient_ids: [[6, false, values.recipient_ids]],
      model: values.model || 'res.partner',
      res_id: values.res_id || 0,
    });
  }

  // ==================== 内部方法 ====================

  /**
   * 发起 JSON-RPC 请求
   */
  private async rpc(endpoint: string, params: Record<string, unknown>): Promise<unknown> {
    const url = `${this.url}${endpoint}`;

    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      id: Date.now(),
      params,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.session_id ? { 'Cookie': `session_id=${this.session_id}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { result?: unknown; error?: OdooError };

    if (data.error) {
      return { error: data.error };
    }

    return data.result;
  }
}

/** 创建 Odoo 客户端工厂 */
export function createOdooClient(config: OdooConfig): OdooClient {
  return new OdooClient(config);
}
