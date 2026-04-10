/**
 * Odoo 插件首次配置引导模块
 *
 * 参考企微插件（dingtalk）的 onboarding 模式
 * 首次操作 Odoo 前引导用户输入配置信息
 *
 * ⚠️ 当前版本使用明文存储密码
 * TODO: 后续升级为 SecretInput 机制（env/file/exec）
 */

import type { OdooConfig } from '../types/index.js';
import { OdooClient } from './odoo-client.js';
import { saveOdooConfigForAgent, isUserConfigured } from '../config/accounts.js';

export interface OnboardingResult {
  success: boolean;
  message: string;
  accountId?: string;
}

/**
 * 验证 Odoo 配置是否有效（尝试验证连接）
 */
export async function validateOdooConfig(config: OdooConfig): Promise<{ valid: boolean; error?: string }> {
  try {
    const client = new OdooClient(config);
    await client.authenticate();
    await client.destroy();
    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, error: message };
  }
}

/**
 * 检查用户是否已完成首次配置
 */
export function checkUserConfigured(agentId: string): boolean {
  return isUserConfigured(agentId);
}

/**
 * 引导用户输入 Odoo 配置（返回引导提示信息）
 *
 * 当用户首次操作 Odoo 但未配置时，调用此方法生成引导提示
 */
export function generateSetupPrompt(): {
  prompt: string;
  requiredFields: string[];
} {
  return {
    prompt: '🔔 首次使用 Odoo 插件，需要先配置连接信息\n\n请提供以下信息：\n1. **系统地址**（URL）- 如：https://www.huo15.com\n2. **数据库名称**（db）- 如：huo15\n3. **用户名**（username）- 您的登录账号\n4. **密码**（password）- 您的登录密码\n\n或者直接说："连接 Odoo，地址是 xxx，数据库是 xxx，用户名是 xxx，密码是 xxx"',
    requiredFields: ['url', 'db', 'username', 'password'],
  };
}

/**
 * 解析用户输入的配置信息
 *
 * 支持多种格式：
 * - 散列：url=xxx db=xxx username=xxx password=xxx
 * - 结构化：请提供 Odoo 系统地址、数据库名、账号和密码
 */
export function parseUserConfigInput(input: string): Partial<OdooConfig> | null {
  const result: Partial<OdooConfig> = {};

  // 尝试散列格式：url=xxx db=xxx username=xxx password=xxx
  const patterns = [
    /url[:\s]*([^\s]+)/i,
    /db[:\s]*([^\s]+)/i,
    /database[:\s]*([^\s]+)/i,
    /username[:\s]*([^\s]+)/i,
    /user[:\s]*([^\s]+)/i,
    /account[:\s]*([^\s]+)/i,
    /password[:\s]*([^\s]+)/i,
    /pwd[:\s]*([^\s]+)/i,
  ];

  const extracts: Array<{ key: keyof OdooConfig; pattern: RegExp }> = [
    { key: 'url', pattern: /url[:\s]*([^\s]+)/i },
    { key: 'db', pattern: /(?:db|database)[:\s]*([^\s]+)/i },
    { key: 'username', pattern: /(?:username|user|account)[:\s]*([^\s]+)/i },
    { key: 'password', pattern: /(?:password|pwd)[:\s]*([^\s]+)/i },
  ];

  for (const { key, pattern } of extracts) {
    const match = input.match(pattern);
    if (match && match[1]) {
      (result as any)[key] = match[1].trim();
    }
  }

  // 如果提取到足够字段，认为有效
  if (result.url && result.db && result.username && result.password) {
    return result;
  }

  // 尝试 URL + 关键词格式
  // 如："连接 Odoo，地址是 https://www.huo15.com，数据库是 huo15"
  const urlMatch = input.match(/(?:地址|URL|url)[：:\s]*([^\s，,。]+)/i);
  const dbMatch = input.match(/(?:数据库|db|database)[：:\s]*([^\s，,。]+)/i);
  const userMatch = input.match(/(?:用户名|账号|user|username)[：:\s]*([^\s，,。]+)/i);
  const pwdMatch = input.match(/(?:密码|password|pwd)[：:\s]*([^\s，,。]+)/i);

  if (urlMatch?.[1] || dbMatch?.[1] || userMatch?.[1] || pwdMatch?.[1]) {
    const partial: Partial<OdooConfig> = {};
    if (urlMatch?.[1]) partial.url = urlMatch[1].trim();
    if (dbMatch?.[1]) partial.db = dbMatch[1].trim();
    if (userMatch?.[1]) partial.username = userMatch[1].trim();
    if (pwdMatch?.[1]) partial.password = pwdMatch[1].trim();

    if (partial.url && partial.db && partial.username && partial.password) {
      return partial;
    }
  }

  return null;
}

/**
 * 保存用户配置并验证
 */
export async function setupUserOdoo(
  agentId: string,
  config: OdooConfig
): Promise<OnboardingResult> {
  // 1. 验证配置是否有效
  const validation = await validateOdooConfig(config);
  if (!validation.valid) {
    return {
      success: false,
      message: `❌ 连接失败：${validation.error}\n\n请检查您的配置信息是否正确后重试。`,
    };
  }

  // 2. 保存配置
  const saved = saveOdooConfigForAgent(agentId, config);
  if (!saved) {
    return {
      success: false,
      message: '❌ 配置保存失败，请稍后重试。',
    };
  }

  return {
    success: true,
    message: `✅ 已成功连接到 Odoo 系统（${config.url}）\n\n您的配置已保存，后续操作无需重复输入。`,
    accountId: agentId,
  };
}

/**
 * 获取未配置用户的欢迎提示
 */
export function getWelcomeMessage(): string {
  return `🤖 欢迎使用 Odoo 插件！

您尚未配置 Odoo 连接信息。请提供以下内容即可开始使用：

**系统地址**：如 https://www.huo15.com
**数据库名**：如 huo15
**用户名**：您的账号
**密码**：您的密码

输入示例：
"连接 Odoo，地址 https://www.huo15.com，数据库 huo15，用户名 admin@huo15.com，密`;

}
