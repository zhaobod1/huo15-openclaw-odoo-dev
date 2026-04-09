/**
 * 自然语言意图理解处理器 v2
 * 
 * 支持的意图类型：
 * - todo.create: 创建待办
 * - todo.list: 查看待办列表
 * - todo.done: 标记待办完成
 * - todo.delete: 删除待办
 * - activity.create: 创建活动提醒
 * - calendar.create: 创建日历事件
 * - message.send: 发送消息
 * - email.send: 发送邮件
 * - search: 搜索记录
 * - crm.*: CRM 相关操作
 * - sale.*: 销售相关操作
 * - stock.*: 库存相关操作
 */

import type { IntentResult, IntentPattern } from '../types/index.js';

// 内置意图模式 v2（更智能的模式匹配）
const BUILTIN_PATTERNS: IntentPattern[] = [
  // ========== 待办相关 ==========
  {
    pattern: '(帮我|给我)?(创建|新建|添加|加一个)(个)?待办',
    intent: 'todo.create',
    model: 'project.task',
    method: 'create',
  },
  {
    pattern: '(帮我|给我)?(创建|新建|添加)(个)?任务',
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
    pattern: '(帮我|给我)?(删除|删掉)(.+?)待办',
    intent: 'todo.delete',
    model: 'project.task',
    method: 'unlink',
  },
  {
    pattern: '(帮我|给我)?(更新|修改)(.+?)待办',
    intent: 'todo.update',
    model: 'project.task',
    method: 'write',
  },

  // ========== 日历/活动相关 ==========
  {
    pattern: '(帮我|给我)?(创建|新建|添加|加一个)(个)?(日历|日程|会议|活动)(提醒)?',
    intent: 'calendar.create',
    model: 'calendar.event',
    method: 'create',
  },
  {
    pattern: '(明天|今天|后天|下周|这周)(.+?)(上午|下午|早上|晚上)(.+?)提醒我',
    intent: 'calendar.create.specificTime',
    model: 'calendar.event',
    method: 'create',
  },
  {
    pattern: '(明天下午|今天下午|后天上午|下周|这周)([0-9]|一|二|三|四|五|六|日)点',
    intent: 'calendar.create.specificTime',
    model: 'calendar.event',
    method: 'create',
  },
  {
    pattern: '(帮我|给我)?(看看|查看|显示|列出)(我的)?(日历|日程|会议|活动)',
    intent: 'calendar.list',
    model: 'calendar.event',
    method: 'search_read',
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
  {
    pattern: '(帮我|给我)?(新建|创建)(一个)?线索',
    intent: 'crm.lead.create',
    model: 'crm.lead',
    method: 'create',
  },
  {
    pattern: '(帮我|给我)?(查看|看看)(我的)?线索',
    intent: 'crm.lead.list',
    model: 'crm.lead',
    method: 'search_read',
  },

  // ========== 销售订单相关 ==========
  {
    pattern: '(帮我|给我)?(查看|看看|显示)(我的)?报价单',
    intent: 'sale.order.list',
    model: 'sale.order',
    method: 'search_read',
  },
  {
    pattern: '(帮我|给我)?(创建|新建)(一个)?报价单',
    intent: 'sale.order.create',
    model: 'sale.order',
    method: 'create',
  },
  {
    pattern: '(帮我|给我)?(查看|看看)(我的)?销售订单',
    intent: 'sale.order.list',
    model: 'sale.order',
    method: 'search_read',
  },

  // ========== 库存相关 ==========
  {
    pattern: '(帮我|给我)?(查看|看看|显示)(.+?)库存',
    intent: 'stock.inventory',
    model: 'stock.quant',
    method: 'search_read',
  },
  {
    pattern: '(帮我|给我)?(查看|看看)(我的)?采购订单',
    intent: 'purchase.order.list',
    model: 'purchase.order',
    method: 'search_read',
  },

  // ========== 工时相关 ==========
  {
    pattern: '(帮我|给我)?(记录|添加)(.+?)工时',
    intent: 'project.task.recordHours',
    model: 'account.analytic.line',
    method: 'create',
  },
  {
    pattern: '(帮我|给我)?(查看|看看)(我的)?工时',
    intent: 'project.timesheet.list',
    model: 'account.analytic.line',
    method: 'search_read',
  },
];

/**
 * 从文本中提取日期时间（支持更多格式）
 */
function extractDateTime(text: string): { 
  date: string | null; 
  time: string | null; 
  relative: string | null;
  timeOfDay: string | null;
} {
  const result = {
    date: null as string | null,
    time: null as string | null,
    relative: null as string | null,
    timeOfDay: null as string | null,
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
  } else if (text.includes('下个月')) {
    result.relative = 'next month';
  }

  // 时段
  if (text.includes('上午') || text.includes('早上') || text.includes('早晨')) {
    result.timeOfDay = 'morning';
  } else if (text.includes('下午')) {
    result.timeOfDay = 'afternoon';
  } else if (text.includes('晚上') || text.includes('傍晚')) {
    result.timeOfDay = 'evening';
  } else if (text.includes('中午')) {
    result.timeOfDay = 'noon';
  }

  // 时间匹配 (HH:MM)
  const timeMatch = text.match(/([0-9]|一|二|三|四|五|六|日){1,2}点([0-9]{1,2})?分?/);
  if (timeMatch) {
    const hourMap: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7 };
    let hour = parseInt(timeMatch[1]) || hourMap[timeMatch[1]] || 9;
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    result.time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  // 标准时间格式
  const stdTimeMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (stdTimeMatch) {
    result.time = `${stdTimeMatch[1].padStart(2, '0')}:${stdTimeMatch[2]}`;
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
  const urgentKeywords = ['紧急', '重要', '急', '马上', '立刻', '优先', '加急'];
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
 * 从文本中提取金额
 */
function extractAmount(text: string): number | null {
  const match = text.match(/([¥￥$]?\s*[\d,]+(?:\.\d{2})?)/);
  if (match) {
    return parseFloat(match[1].replace(/[¥￥$,]/g, ''));
  }
  return null;
}

/**
 * 自然语言处理器 v2
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
    const text = typeof input === 'string' ? input.trim() : String(input).trim();

    for (const pattern of this.patterns) {
      try {
        const regex = new RegExp(pattern.pattern, 'i');
        const match = regex.exec(text);

        if (match) {
          const result = this.buildIntent(pattern, match, text);
          return result;
        }
      } catch (e) {
        // 正则表达式错误，跳过此模式
        console.warn(`[NLP] Pattern error: ${pattern.pattern}`, e);
      }
    }

    // 没有匹配到已知模式，尝试通用搜索意图
    return this.fallbackSearch(text);
  }

  /**
   * 构建意图结果
   */
  private buildIntent(pattern: IntentPattern, match: RegExpExecArray, text: string): IntentResult {
    const entities: Record<string, unknown> = {};

    // 提取日期时间
    const dateTime = extractDateTime(text);
    if (dateTime.date) entities.date = dateTime.date;
    if (dateTime.time) entities.time = dateTime.time;
    if (dateTime.relative) entities.relative = dateTime.relative;
    if (dateTime.timeOfDay) entities.timeOfDay = dateTime.timeOfDay;

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
      case 'calendar.create.specificTime':
        entities.eventName = this.extractContent(text, ['会议', '日程', '活动', '提醒'], match[0]);
        entities.description = entities.eventName;
        break;

      case 'todo.done':
        entities.taskName = this.extractTaskName(text);
        break;

      case 'todo.delete':
        entities.taskName = this.extractTaskName(text);
        break;

      case 'todo.update':
        entities.taskName = this.extractTaskName(text);
        entities.updateContent = this.extractUpdateContent(text);
        break;

      case 'create.partner':
      case 'crm.lead.create':
      case 'crm.opportunity.create':
        entities.partnerName = this.extractPartnerName(text);
        entities.contact = this.extractContact(text);
        break;

      case 'sale.order.create':
        entities.amount = extractAmount(text);
        break;

      case 'project.task.recordHours':
        entities.hours = this.extractHours(text);
        entities.description = this.extractContent(text, ['工时', '时间', '小时'], match[0]);
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

    // 清理多余空白
    result = result.replace(/\s+/g, ' ').trim();

    return result || '新待办';
  }

  /**
   * 提取收件人
   */
  private extractRecipient(text: string): string {
    const match = text.match(/给(.+?)(的话|一下|发送|发|邮件|消息|封信)/);
    if (match) {
      return match[1].trim();
    }
    
    const altMatch = text.match(/发送给(.+?)([，。]|$)/);
    if (altMatch) {
      return altMatch[1].trim();
    }
    
    return '';
  }

  /**
   * 提取主题
   */
  private extractSubject(text: string): string {
    const match = text.match(/主题[:：]?(.+?)(?=\s|[,，]|$)/);
    if (match) {
      return match[1].trim();
    }

    const aboutMatch = text.match(/关于(.+?)(?=\s|[,，]|$)/);
    if (aboutMatch) {
      return aboutMatch[1].trim();
    }

    return '无主题';
  }

  /**
   * 提取正文
   */
  private extractBody(text: string): string {
    // 提取引号内内容
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

    // 移除"客户"、"联系人"、"商机"等关键词
    result = result.replace(/客户|联系人|商机|线索/g, '');

    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * 提取任务名称
   */
  private extractTaskName(text: string): string {
    const match = text.match(/(?:完成|标记完成|做完了|删除|更新|修改)(.+?)(?:待办|任务)/);
    if (match) {
      return match[1].trim();
    }

    const quoteMatch = text.match(/["'""](.+?)["'""]/);
    if (quoteMatch) {
      return quoteMatch[1];
    }

    return '';
  }

  /**
   * 提取更新内容
   */
  private extractUpdateContent(text: string): string {
    const match = text.match(/更新为(.+?)(?:$|[，,])|修改为(.+?)(?:$|[，,])/);
    if (match) {
      return (match[1] || match[2] || '').trim();
    }
    return '';
  }

  /**
   * 提取客户名称
   */
  private extractPartnerName(text: string): string {
    const match = text.match(/(?:客户|公司|企业)(?:名称)?[:：]?(.+?)(?:[，,]|$)/);
    if (match) {
      return match[1].trim();
    }

    // 提取引号或括号内内容
    const quoteMatch = text.match(/["'""](.+?)["'""]/);
    if (quoteMatch) {
      return quoteMatch[1];
    }

    return '';
  }

  /**
   * 提取联系人
   */
  private extractContact(text: string): { name?: string; phone?: string; email?: string } {
    const contact: { name?: string; phone?: string; email?: string } = {};
    
    const nameMatch = text.match(/(?:联系人|联系|对接人)[:：]?(.+?)(?:[，,\s]|$)/);
    if (nameMatch) {
      contact.name = nameMatch[1].trim();
    }

    const phoneMatch = text.match(/电话[:：]?(\d+[-\d]{7,})/);
    if (phoneMatch) {
      contact.phone = phoneMatch[1];
    }

    const emailMatch = text.match(/邮箱[:：]?([^\s，,]+@[^\s，,]+)/);
    if (emailMatch) {
      contact.email = emailMatch[1];
    }

    return contact;
  }

  /**
   * 提取工时
   */
  private extractHours(text: string): number {
    const match = text.match(/(\d+(?:\.\d+)?)\s*(?:小时|工时|h|H)/);
    if (match) {
      return parseFloat(match[1]);
    }
    return 1;
  }

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
