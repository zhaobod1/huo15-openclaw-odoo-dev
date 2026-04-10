/**
 * Odoo 插件配置管理器（多用户版）
 *
 * 负责 Odoo 连接配置的持久化存储和加载
 * 支持按 agentId 隔离，每个用户独立配置
 *
 * ⚠️ 当前版本使用明文存储，后续升级为 SecretInput 机制
 * TODO: 升级为 secretRef 加密存储（env/file/exec）
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { OdooPluginConfig, OdooConfig } from '../types/index.js';

const CONFIG_DIR = '.openclaw/plugin-configs';
const CONFIG_FILE = 'odoo-config.json';

export class ConfigManager {
  private configPath: string;

  constructor(homeDir: string = process.env.HOME || '/root') {
    this.configPath = join(homeDir, CONFIG_DIR, CONFIG_FILE);
  }

  /**
   * 加载完整配置
   */
  load(): OdooPluginConfig | null {
    try {
      if (!existsSync(this.configPath)) {
        return null;
      }
      const data = readFileSync(this.configPath, 'utf-8');
      return JSON.parse(data) as OdooPluginConfig;
    } catch (error) {
      console.error('[Odoo Config] 加载配置失败:', error);
      return null;
    }
  }

  /**
   * 保存完整配置
   */
  save(config: OdooPluginConfig): boolean {
    try {
      const dir = dirname(this.configPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log('[Odoo Config] 配置已保存');
      return true;
    } catch (error) {
      console.error('[Odoo Config] 保存配置失败:', error);
      return false;
    }
  }

  /**
   * 获取指定用户的 Odoo 配置
   */
  getOdooConfig(agentId: string): OdooConfig | null {
    const config = this.load();
    return config?.users?.[agentId]?.odoo ?? null;
  }

  /**
   * 保存指定用户的 Odoo 配置
   */
  saveOdooConfig(agentId: string, odooConfig: OdooConfig): boolean {
    const config = this.load() || { users: {} };
    if (!config.users) {
      config.users = {};
    }
    config.users[agentId] = {
      agentId,
      odoo: odooConfig,
      configuredAt: Date.now(),
    };
    return this.save(config);
  }

  /**
   * 获取所有已配置的用户列表
   */
  listConfiguredUsers(): string[] {
    const config = this.load();
    return config?.users ? Object.keys(config.users) : [];
  }

  /**
   * 检查指定用户是否已配置
   */
  hasUserConfig(agentId: string): boolean {
    return this.getOdooConfig(agentId) !== null;
  }

  /**
   * 获取同步配置
   */
  getSyncConfig(): OdooPluginConfig['sync'] {
    const config = this.load();
    return config?.sync || {
      enabled: true,
      intervalSeconds: 30,
      channels: ['todo', 'activity', 'message'],
    };
  }

  /**
   * 保存同步配置
   */
  saveSyncConfig(syncConfig: NonNullable<OdooPluginConfig['sync']>): boolean {
    const config = this.load() || {};
    config.sync = syncConfig;
    return this.save(config);
  }

  /**
   * 清除指定用户的配置
   */
  clearUserConfig(agentId: string): boolean {
    const config = this.load();
    if (!config?.users?.[agentId]) {
      return false;
    }
    delete config.users[agentId];
    return this.save(config);
  }

  /**
   * 清除所有配置
   */
  clear(): boolean {
    try {
      if (existsSync(this.configPath)) {
        const fs = require('node:fs');
        fs.unlinkSync(this.configPath);
      }
      return true;
    } catch (error) {
      console.error('[Odoo Config] 清除配置失败:', error);
      return false;
    }
  }
}

/** 导出单例 */
export const configManager = new ConfigManager();
