/**
 * Odoo 多账号解析模块
 *
 * 参考企微插件（dingtalk）账号解析模式
 * 支持按 agentId 隔离的 Odoo 配置
 *
 * ⚠️ 当前版本使用明文密码存储
 * TODO: 后续升级为 SecretInput 机制
 */

import type { OdooPluginConfig, OdooConfig } from '../types/index.js';
import { configManager } from '../modules/config-manager.js';

/** 默认账号 ID（兼容无 agentId 场景） */
export const DEFAULT_ACCOUNT_ID = 'default';

/**
 * 标准化 agentId
 */
export function normalizeAgentId(agentId: string | null | undefined): string {
  if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
    return DEFAULT_ACCOUNT_ID;
  }
  const trimmed = agentId.trim();
  return trimmed || DEFAULT_ACCOUNT_ID;
}

/**
 * 列出所有已配置的账号 ID
 */
export function listOdooAccountIds(): string[] {
  const ids = configManager.listConfiguredUsers();
  if (ids.length === 0) {
    return [DEFAULT_ACCOUNT_ID];
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}

/**
 * 解析默认账号 ID
 */
export function resolveDefaultOdooAccountId(): string {
  return DEFAULT_ACCOUNT_ID;
}

/**
 * 解析账号配置
 */
export function resolveOdooAccount(params: {
  agentId?: string | null;
}): { accountId: string; configured: boolean; odooConfig: OdooConfig | null } {
  const accountId = normalizeAgentId(params.agentId);
  const odooConfig = configManager.getOdooConfig(accountId);

  return {
    accountId,
    configured: odooConfig !== null,
    odooConfig,
  };
}

/**
 * 获取账号配置（带默认值）
 */
export function getOdooConfigForAgent(agentId: string | null | undefined): OdooConfig | null {
  const { odooConfig } = resolveOdooAccount({ agentId });
  return odooConfig;
}

/**
 * 检查用户是否已配置
 */
export function isUserConfigured(agentId: string | null | undefined): boolean {
  const { configured } = resolveOdooAccount({ agentId });
  return configured;
}

/**
 * 保存用户 Odoo 配置
 */
export function saveOdooConfigForAgent(agentId: string, odooConfig: OdooConfig): boolean {
  return configManager.saveOdooConfig(normalizeAgentId(agentId), odooConfig);
}

/**
 * 列出所有已配置用户
 */
export function listAllConfiguredUsers(): string[] {
  return configManager.listConfiguredUsers();
}
