/**
 * 自然语言意图理解处理器
 * 
 * 将用户的自然语言指令解析为 Odoo 操作意图
 * 
 * 支持的意图类型：
 * - todo.create: 创建待办
 * - todo.list: 查看待办列表
 * - todo.update: 更新待办
 * - todo.delete: 删除待办
 * - activity.create: 创建活动提醒
 * - calendar.create: 创建日历事件
 * - message.send: 发送消息
 * - email.send: 发送邮件
 * - search: 搜索记录
 * - report: 生成报表
 */

import type { IntentResult, IntentPattern } from '../types/index.js';

// 内置意图模式
const BUILTIN_PATTERNS: IntentPattern[] = [
  // ========== 待办相关 ==========
  {
    pattern: '(帮我|给我)?(创建|新建|添加|加一个)(个)?待办',
    intent: 'todo.create',
    model: 'project.task',
    method: 'create',
  },
  {
    pattern: '(帮我|给我)?(创建|新建|添加|加一个)(个)?任务',
    intent: 'todo.create',
    model: 'project.task',
    method: 'create',
  },
  {
    pattern: '提醒我(.+)',
    intent: 'todo.create.withReminder',
    model: 'project.task',
    method: 'create',
  },
  {
    pattern: '(帮我|给我)?(看看|查看|显示|列出|给我)(我的)?待办',
    intent: 'todo.list',
    model: 'project.task',
    method: 'search_read',
  },
  {
    pattern: '待办列表',
    intent: 'todo.list',
    model: 'project.task',
    method: 'search_read',
  },
  {
    pattern: '(帮我|给我)?(完成|标记完成|做完了)(.+?)待办',
    intent: 'todo.done',
    model: 'project.task',
    method: 'write',
  },
  {
    pattern: '删除(.+?)待办',
    intent: 'todo.delete',
    model: 'project.task',
    method: 'unlink',
  },

  // ========== 日历/活动相关 ==========
  {
    pattern: '(帮我|给我)?(创建|新建|添加|加一个)(个)?(日历|日程|会议|活动)(提醒)?',
    intent: 'calendar.create',
    model: 'calendar.event',
    method: 'create',
  },
  {
    pattern: '(明天|今天|后天|下周|这周)(.+?)提醒我',
    intent: 'calendar.create.withDate',
    model: 'calendar.event',
    method: 'create',
  },
  {
    pattern: '(帮我|给我)?(看看|查看|显示|列出)(我的)?(日历|日程|会议|活动)',
    intent: 'calendar.list',
    model: 'calendar.event',
    method: 'search_read',
  },
  {
    pattern: '(明天|今天|后天|下周|这周)(.+?)有个?(.+?)会议',
    intent: 'calendar.create',
    model: 'calendar.event',
    method: 'create',
  },

  // ========== 消息/邮件相关 ==========
  {
    pattern: '(帮我|给我)?(发送|发一封)(.+)给(.+)',
    intent: 'email.send',
    model: 'mail.mail',
    method: 'create',
  },
  {
    pattern: '(帮我|给我)?(发送|发)消息给(.+)',
    intent: 'message.send',
    model: 'mail.message',
    method: 'create',
  },
  {
    pattern: '(帮我|给我)?(查看|看看|显示)(我的)?未读(消息|邮件)',
    intent: 'message.unread',
    model: 'mail.message',
    method: 'search_read',
  },

  // ========== 客户/联系人相关 ==========
  {
    pattern: '(帮我|给我)?(查找|搜索|看看)(.+?)客户',
    intent: 'search.partner',
    model: 'res.partner',
    method: 'search_read',
  },
  {
    pattern: '(帮我|给我)?(新建|添加|创建一个)(.+?)客户',
    intent: 'create.partner',
    model: 'res.partner',
    method: 'create',
  },
  {
    pattern: '(帮我|给我)?(查找|搜索)(.+?)联系人',
    intent: 'search.contact',
    model: 'res.partner',
    method: 'search_read',
  },

  // ========== 项目相关 ==========
  {
    pattern: '(帮我|给我)?(查看|看看|显示)(我的)?项目',
    intent: 'project.list',
    model: 'project.project',
    method: 'search_read',
  },
  {
    pattern: '(帮我|给我)?(创建|新建|添加)(一个)?项目',
    intent: 'project.create',
    model: 'project.project',
    method: 'create',
  },

  // ========== 销售/CRM 相关 ==========
  {
    pattern: '(帮我|给我)?(查看|看看|显示)(我的)?商机',
    intent: 'crm.opportunity.list',
    model: 'crm.lead',
    method: 'search_read',
  },
  {
    pattern: '(帮我|给我)?(创建|新建)(一个)?商机',
    intent: 'crm.opportunity.create',
    model: 'crm.lead',
    method: 'create',
  },
  {
    pattern: '(帮我|给我)?(查找|搜索)(.+?)商机',
    intent: 'crm.opportunity.search',
    model: 'crm.lead',
    method: 'search_read',
  },

  // ========== 库存相关 ==========
  {
    pattern: '(帮我|给我)?(查看|看看|显示)(.+?)库存',
    intent: 'stock.inventory',
    model: 'stock.quant',
    method: 'search_read',
  },
];

/**
 * 从文本中提取日期时间
 */
function extractDateTime(text: string): { date: string | null; time: string | null; relative: string | null } {
  const result = {
    date: null as string | null,
    time: null as string | null,
    relative: null as string | null,
  };

  // 相对时间
  if (text.includes('明天')) {
    result.relative = 'tomorrow';
  } else if (text.includes('今天')) {
    result.relative = 'today';
  } else if (text.includes('后天')) {
    result.relative = 'day after tomorrow';
  } else if (text.includes('下周')) {
    result.relative = 'next week';
  } else if (text.includes('这周')) {
    result.relative = 'this week';
  }

  // 时间匹配 (HH:MM)
  const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    result.time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }

  // 日期匹配 (YYYY-MM-DD)
  const dateMatch = text.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
  if (dateMatch) {
    result.date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
  }

  return result;
}

/**
 * 从文本中提取优先级
 */
function extractPriority(text: string): '0' | '1' {
  const urgentKeywords = ['紧急', '重要', '急', '马上', '立刻', '优先'];
  const lowKeywords = ['不急', '慢慢来', '有空再', '低优先级'];

  for (const kw of urgentKeywords) {
    if (text.includes(kw)) return '1';
  }
  for (const kw of lowKeywords) {
    if (text.includes(kw)) return '0';
  }

  return '0';
}

/**
 * 自然语言处理器
 */
export class NLPUtils {
  private patterns: IntentPattern[];

  constructor(customPatterns: IntentPattern[] = []) {
    this.patterns = [...BUILTIN_PATTERNS, ...customPatterns];
  }

  /**
   * 解析用户输入，返回意图结果
   */
  parse(input: string): IntentResult {
    const text = input.trim();

    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.pattern, 'i');
      const match = regex.exec(text);

      if (match) {
        const result = this.buildIntent(pattern, match, text);
        return result;
      }
    }

    // 没有匹配到已知模式，尝试通用搜索意图
    return this.fallbackSearch(text);
  }

  /**
   * 构建意图结果
   */
  private buildIntent(pattern: IntentPattern, match: RegExpExecArray, text: string): IntentResult {
    const groups = match.groups || {};
    const entities: Record<string, unknown> = {};

    // 提取日期时间
    const dateTime = extractDateTime(text);
    if (dateTime.date) entities.date = dateTime.date;
    if (dateTime.time) entities.time = dateTime.time;
    if (dateTime.relative) entities.relative = dateTime.relative;

    // 提取优先级
    entities.priority = extractPriority(text);

    // 根据意图类型提取特定实体
    switch (pattern.intent) {
      case 'todo.create':
      case 'todo.create.withReminder':
        entities.name = this.extractContent(text, ['待办', '任务', '提醒'], match[0]);
        entities.description = entities.name;
        break;

      case 'email.send':
      case 'message.send':
        entities.recipient = this.extractRecipient(text);
        entities.subject = this.extractSubject(text);
        entities.body = this.extractBody(text);
        break;

      case 'search.partner':
      case 'search.contact':
      case 'crm.opportunity.search':
        entities.term = this.extractSearchTerm(text);
        break;

      case 'calendar.create':
      case 'calendar.create.withDate':
        entities.eventName = this.extractContent(text, ['会议', '日程', '活动', '提醒'], match[0]);
        break;

      case 'todo.done':
        entities.taskName = this.extractTaskName(text);
        break;

      case 'todo.delete':
        entities.taskName = this.extractTaskName(text);
        break;
    }

    return {
      intent: pattern.intent,
      confidence: 0.85,
      entities,
      model: pattern.model,
      method: pattern.method,
      params: {},
    };
  }

  /**
   * 提取主要内容
   */
  private extractContent(text: string, keywords: string[], prefix: string): string {
    let result = text;

    // 移除常见前缀
    const prefixes = ['帮我', '给我', '创建', '新建', '添加', '加一个', '提醒我', '有个'];
    for (const p of prefixes) {
      result = result.replace(p, '');
    }

    // 移除关键词
    for (const kw of keywords) {
      result = result.replace(kw, '');
    }

    return result.trim() || '新待办';
  }

  /**
   * 提取收件人
   */
  private extractRecipient(text: string): string {
    const match = text.match(/给(.+?)(さん|总|先生|女士|姐|哥|)/);
    if (match) {
      return match[1].trim();
    }
    return '';
  }

  /**
   * 提取主题
   */
  private extractSubject(text: string): string {
    const match = text.match(/主题[:：]?(.+?)(?=\s|$|[,，])/);
    if (match) {
      return match[1].trim();
    }

    // 提取"关于xxx"的内容
    const aboutMatch = text.match(/关于(.+?)(?=\s|$|[,，])/);
    if (aboutMatch) {
      return aboutMatch[1].trim();
    }

    return '无主题';
  }

  /**
   * 提取正文
   */
  private extractBody(text: string): string {
    // 提取引号或括号内的内容
    const quoteMatch = text.match(/["'""](.+?)["'""]/);
    if (quoteMatch) {
      return quoteMatch[1];
    }

    const bracketMatch = text.match(/[【\[](.+?)[】\]]/);
    if (bracketMatch) {
      return bracketMatch[1];
    }

    // 提取冒号后的内容
    const colonMatch = text.match(/[:：](.+?)$/);
    if (colonMatch) {
      return colonMatch[1].trim();
    }

    return text;
  }

  /**
   * 提取搜索关键词
   */
  private extractSearchTerm(text: string): string {
    const prefixes = ['帮我查找', '给我查找', '搜索', '查找', '看看'];
    let result = text;

    for (const p of prefixes) {
      result = result.replace(p, '');
    }

    // 移除"客户"、"联系人"等关键词
    result = result.replace(/客户|联系人|商机/g, '');

    return result.trim();
  }

  /**
   * 提取任务名称（用于完成/删除）
   */
  private extractTaskName(text: string): string {
    const match = text.match(/(?:完成|标记完成|做完了|删除)(.+?)(?:待办|任务)/);
    if (match) {
      return match[1].trim();
    }

    // 提取引号内内容
    const quoteMatch = text.match(/["'""](.+?)["'""]/);
    if (quoteMatch) {
      return quoteMatch[1];
    }

    return '';
  }

  /**
  /**
   * 备用搜索意图
   */
  private fallbackSearch(text: string): IntentResult {
    return {
      intent: 'general.search',
      confidence: 0.5,
      entities: { term: text },
    };
  }

  /**
   * 添加自定义意图模式
   */
  addPattern(pattern: IntentPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * 批量添加意图模式
   */
  addPatterns(patterns: IntentPattern[]): void {
    this.patterns.push(...patterns);
  }
}

/** 导出单例 */
export const nlpHandler = new NLPUtils();
