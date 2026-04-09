/**
 * Odoo 通知同步器
 * 
 * 定期轮询 Odoo 系统，获取最新的通知、待办、活动等
 * 并将更新推送到 OpenClaw
 */

import type { OdooClient } from './odoo-client.js';
import type { SyncUpdate, OdooRecord } from '../types/index.js';

// Domain 类型
type DomainItem = string | [string, string, unknown];
type Domain = DomainItem[];

export interface NotificationCallback {
  (updates: SyncUpdate[]): void;
}

export class NotificationPoller {
  private client: OdooClient;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callback: NotificationCallback | null = null;
  private intervalSeconds: number = 30;
  private lastCheck: Date = new Date();
  private lastMessageIds: Map<string, number> = new Map();
  private lastTaskIds: Set<number> = new Set();
  private channels: string[] = ['todo', 'activity', 'message'];

  constructor(client: OdooClient) {
    this.client = client;
  }

  /**
   * 启动轮询
   */
  start(callback: NotificationCallback, options: {
    intervalSeconds?: number;
    channels?: string[];
  } = {}): void {
    this.callback = callback;
    this.intervalSeconds = options.intervalSeconds || 30;
    this.channels = options.channels || ['todo', 'activity', 'message'];

    // 立即执行一次初始同步
    this.poll().catch(console.error);

    // 设置定时轮询
    this.intervalId = setInterval(() => {
      this.poll().catch(console.error);
    }, this.intervalSeconds * 1000);
  }

  /**
   * 停止轮询
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.callback = null;
  }

  /**
   * 手动触发一次同步
   */
  async poll(): Promise<SyncUpdate[]> {
    if (!this.client.isAuthenticated()) {
      console.log('[Odoo Poller] 未登录，跳过同步');
      return [];
    }

    const updates: SyncUpdate[] = [];

    try {
      for (const channel of this.channels) {
        switch (channel) {
          case 'todo':
            updates.push(...await this.checkTodos());
            break;
          case 'activity':
            updates.push(...await this.checkActivities());
            break;
          case 'message':
            updates.push(...await this.checkMessages());
            break;
        }
      }

      this.lastCheck = new Date();

      if (updates.length > 0 && this.callback) {
        this.callback(updates);
      }

      return updates;
    } catch (error) {
      console.error('[Odoo Poller] 轮询错误:', error);
      return [];
    }
  }

  /**
   * 检查待办任务更新
   */
  private async checkTodos(): Promise<SyncUpdate[]> {
    const updates: SyncUpdate[] = [];

    try {
      const uid = this.client.getUid() || 0;
      const domain: Domain = [
        ['user_ids', 'in', [uid]],
        ['active', '=', true],
        ['write_date', '>', this.formatDate(this.lastCheck)],
      ];

      const tasks = await this.client.searchRead('project.task', domain, [
        'id', 'name', 'stage_id', 'date_deadline', 'priority',
      ], { limit: 20 });

      for (const task of tasks.records) {
        const taskId = task.id as number;
        if (!this.lastTaskIds.has(taskId)) {
          updates.push({
            type: 'todo',
            action: 'create',
            id: taskId,
            data: task,
            timestamp: Date.now(),
          });
          this.lastTaskIds.add(taskId);
        } else {
          updates.push({
            type: 'todo',
            action: 'update',
            id: taskId,
            data: task,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      console.error('[Odoo Poller] 检查待办失败:', error);
    }

    return updates;
  }

  /**
   * 检查活动提醒更新
   */
  private async checkActivities(): Promise<SyncUpdate[]> {
    const updates: SyncUpdate[] = [];

    try {
      const uid = this.client.getUid() || 0;
      const domain: Domain = [
        ['user_id', 'in', [uid]],
        ['date_deadline', '>=', this.formatDate(this.lastCheck)],
      ];

      const activities = await this.client.searchRead('mail.activity', domain, [
        'id', 'summary', 'date_deadline', 'activity_type_id', 'res_model', 'res_id',
      ], { limit: 20 });

      for (const activity of activities.records) {
        updates.push({
          type: 'activity',
          action: 'read',
          id: activity.id as number,
          data: activity,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('[Odoo Poller] 检查活动失败:', error);
    }

    return updates;
  }

  /**
   * 检查消息通知
   */
  private async checkMessages(): Promise<SyncUpdate[]> {
    const updates: SyncUpdate[] = [];

    try {
      const domain: Domain = [
        ['message_type', '!=', 'notification'],
        ['write_date', '>', this.formatDate(this.lastCheck)],
      ];

      const messages = await this.client.searchRead('mail.message', domain, [
        'id', 'subject', 'body', 'author_id', 'date', 'model', 'res_id',
      ], { limit: 20 });

      for (const message of messages.records) {
        const key = `${message.model}:${message.res_id}:${message.id}`;
        const lastId = this.lastMessageIds.get(key) || 0;

        if ((message.id as number) > lastId) {
          updates.push({
            type: 'message',
            action: 'create',
            id: message.id as number,
            data: message,
            timestamp: Date.now(),
          });
          this.lastMessageIds.set(key, message.id as number);
        }
      }
    } catch (error) {
      console.error('[Odoo Poller] 检查消息失败:', error);
    }

    return updates;
  }

  /**
   * 格式化日期为 Odoo 格式
   */
  private formatDate(date: Date): string {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * 获取当前状态
   */
  getStatus(): { running: boolean; lastCheck: Date; channels: string[] } {
    return {
      running: this.intervalId !== null,
      lastCheck: this.lastCheck,
      channels: this.channels,
    };
  }
}
