/**
 * Odoo 插件类型定义
 */

/** Odoo 连接配置 */
export interface OdooConfig {
  url: string;
  db: string;
  username: string;
  password: string;
}

/** Odoo 会话信息 */
export interface OdooSession {
  uid: number;
  session_id: string;
  user_context: Record<string, unknown>;
  company_id: number;
  partner_id: number;
  name: string;
  login: string;
}

/** Odoo API 错误 */
export interface OdooError {
  code: number;
  message: string;
  data?: {
    name: string;
    debug: string;
    message: string;
    arguments: unknown[];
  };
}

/** Odoo 记录 */
export interface OdooRecord {
  id: number;
  [key: string]: unknown;
}

/** Odoo search_read 返回结果 */
export interface OdooSearchResult {
  length: number;
  records: OdooRecord[];
}

/** 待办/任务 */
export interface OdooTask {
  id: number;
  name: string;
  description?: string;
  user_ids?: number[];
  project_id?: number;
  stage_id?: number;
  priority?: '0' | '1';
  date_deadline?: string;
  active?: boolean;
  create_date?: string;
  write_date?: string;
}

/** 日历活动/提醒 */
export interface OdooActivity {
  id: number;
  res_model: string;
  res_id: number;
  activity_type_id: number;
  summary?: string;
  note?: string;
  date_deadline: string;
  user_id: number;
  state?: string;
}

/** 消息/通知 */
export interface OdooMessage {
  id: number;
  model: string;
  res_id: number;
  body: string;
  message_type: string;
  author_id: number[];
  date: string;
  channel_ids?: number[];
}

/** 意图解析结果 */
export interface IntentResult {
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
  model?: string;
  method?: string;
  params?: Record<string, unknown>;
}

/** 同步的更新项 */
export interface SyncUpdate {
  type: 'todo' | 'activity' | 'message' | 'email' | 'calendar';
  action: 'create' | 'update' | 'delete' | 'read';
  id: number;
  data?: OdooRecord;
  timestamp: number;
}

/** 插件配置 */
export interface OdooPluginConfig {
  odoo?: OdooConfig;
  sync?: {
    enabled: boolean;
    intervalSeconds: number;
    channels: string[];
  };
  nlp?: {
    enabled: boolean;
    intentPatterns?: IntentPattern[];
  };
}

export interface IntentPattern {
  pattern: string;
  intent: string;
  model?: string;
  method?: string;
}
