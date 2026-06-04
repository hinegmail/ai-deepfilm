/**
 * 提供商健康检查和 API Key 验证服务
 * 支持多种提供商和模型类型的测试
 */

import { ModelProvider, ModelType } from '../types/model';
import { getProviderById, getModels, getApiKeyForModel } from './modelRegistry';

export interface HealthCheckResult {
  provider: string;
  providerId: string;
  status: 'healthy' | 'error' | 'invalid_key' | 'timeout';
  message: string;
  responseTime?: number;
  timestamp: number;
}

export interface ApiKeyValidationResult {
  success: boolean;
  message: string;
  provider: string;
  modelType?: ModelType;
  responseTime?: number;
  timestamp: number;
}

/**
 * 对提供商执行健康检查
 * 检测 API 端点是否可访问，API Key 是否有效
 */
export const checkProviderHealth = async (
  providerId: string
): Promise<HealthCheckResult> => {
  const provider = getProviderById(providerId);
  const startTime = Date.now();

  if (!provider) {
    return {
      provider: '未知',
      providerId,
      status: 'error',
      message: '提供商未找到',
      timestamp: startTime,
    };
  }

  try {
    // 获取该提供商的所有模型
    const models = getModels().filter(m => m.providerId === providerId);
    
    if (models.length === 0) {
      return {
        provider: provider.name,
        providerId,
        status: 'error',
        message: '该提供商没有配置任何模型',
        timestamp: startTime,
      };
    }

    // 使用首选模型进行测试
    const testModel = getPreferredTestModel(models, providerId);
    if (!testModel) {
      return {
        provider: provider.name,
        providerId,
        status: 'error',
        message: '无法选择测试模型',
        timestamp: startTime,
      };
    }

    const apiKey = getApiKeyForModel(testModel.id) || provider.apiKey;

    if (!apiKey) {
      return {
        provider: provider.name,
        providerId,
        status: 'invalid_key',
        message: 'API Key 未配置',
        timestamp: startTime,
      };
    }

    // 根据模型类型调用不同的测试端点
    const result = await testProviderConnection(provider, testModel, apiKey);
    const responseTime = Date.now() - startTime;

    return {
      provider: provider.name,
      providerId,
      status: result.success ? 'healthy' : result.status,
      message: result.message,
      responseTime,
      timestamp: Date.now(),
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      provider: provider.name,
      providerId,
      status: 'error',
      message: error.message || '检查失败',
      responseTime,
      timestamp: Date.now(),
    };
  }
};

/**
 * 验证特定模型的 API Key
 */
export const validateModelApiKey = async (
  modelId: string
): Promise<ApiKeyValidationResult> => {
  const startTime = Date.now();

  try {
    const model = getModels().find(m => m.id === modelId);
    if (!model) {
      return {
        success: false,
        message: '模型未找到',
        timestamp: Date.now(),
      };
    }

    const provider = getProviderById(model.providerId);
    if (!provider) {
      return {
        success: false,
        message: '提供商未找到',
        provider: '未知',
        modelType: model.type,
        timestamp: Date.now(),
      };
    }

    const apiKey = getApiKeyForModel(modelId);
    if (!apiKey) {
      return {
        success: false,
        message: 'API Key 未配置',
        provider: provider.name,
        modelType: model.type,
        timestamp: Date.now(),
      };
    }

    // 测试 API 连接
    const result = await testApiConnection(provider, model, apiKey);
    const responseTime = Date.now() - startTime;

    return {
      success: result.success,
      message: result.message,
      provider: provider.name,
      modelType: model.type,
      responseTime,
      timestamp: Date.now(),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '验证失败',
      timestamp: Date.now(),
    };
  }
};

/**
 * 测试与提供商的连接
 */
async function testProviderConnection(
  provider: ModelProvider,
  model: any,
  apiKey: string
): Promise<{ success: boolean; status: HealthCheckResult['status']; message: string }> {
  try {
    const result = await testApiConnection(provider, model, apiKey);
    if (result.success) {
      return { success: true, status: 'healthy', message: '连接成功' };
    } else {
      return {
        success: false,
        status: result.message.includes('401') || result.message.includes('无效') ? 'invalid_key' : 'error',
        message: result.message,
      };
    }
  } catch (error: any) {
    const message = error.message || '连接失败';
    const status = message.includes('timeout') ? 'timeout' : 'error';
    return { success: false, status: status as any, message };
  }
}

/**
 * 获取用于测试的首选模型
 * 优先选择自定义模型，如果没有自定义模型则选择内置模型
 */
function getPreferredTestModel(
  models: any[],
  providerId: string
): any | undefined {
  if (!models.length) return undefined;

  // 首先查找非内置的自定义模型（用户自己添加的）
  const customModels = models.filter(m => !m.isBuiltIn);
  if (customModels.length > 0) {
    // 返回第一个自定义模型
    return customModels[0];
  }

  // 如果没有自定义模型，按提供商优先级选择内置测试模型
  const priorities: Record<string, string[]> = {
    'openai': ['openai:gpt-4o', 'openai:gpt-3.5-turbo'],
    'anthropic': ['anthropic:claude-sonnet', 'anthropic:claude-opus'],
    'deepseek': ['deepseek:deepseek-chat'],
    'agnes': ['agnes:agnes-2.0-flash', 'agnes:agnes-image-2.1-flash', 'agnes:agnes-video-v2.0'],
    'ollama': ['ollama:llama2', 'ollama:mistral'],
    'gitcc': ['gpt-5.1', 'gpt-5.2'],
  };

  const preferredIds = priorities[providerId];
  if (preferredIds) {
    for (const id of preferredIds) {
      const model = models.find(m => m.id === id);
      if (model) return model;
    }
  }

  // 如果没找到任何首选模型，返回第一个内置模型
  return models[0];
}

async function testApiConnection(
  provider: ModelProvider,
  model: any,
  apiKey: string
): Promise<{ success: boolean; message: string }> {
  const controller = new AbortController();
  // 对于图片和视频模型，使用较短的超时（5秒），因为只是测试连接
  // 对于对话模型，需要更长的超时（10秒）
  const timeoutMs = model.type === 'chat' ? 10000 : 5000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let baseUrl = provider.baseUrl.replace(/\/+$/, '');
    let endpoint = model.endpoint || getDefaultEndpoint(model.type);

    // 如果 baseUrl 已经以 /v1 结尾，endpoint 就不要再包含 /v1
    if (baseUrl.endsWith('/v1')) {
      // 移除 endpoint 开头的 /v1（如果有的话）
      if (endpoint.startsWith('/v1/')) {
        endpoint = endpoint.slice(4); // 移除 "/v1"
        endpoint = '/' + endpoint;
      } else if (endpoint.startsWith('v1/')) {
        endpoint = '/' + endpoint.slice(3); // 移除 "v1"
      }
    }

    const apiModel = model.apiModel || model.id;

    // 根据模型类型构建测试请求
    let requestBody: any;

    if (model.type === 'chat') {
      requestBody = {
        model: apiModel,
        messages: [{ role: 'user', content: '测试' }],
        temperature: 0.1,
        max_tokens: 10,
      };
    } else if (model.type === 'image') {
      // AGNES 图片模型：发送快速测试请求，避免实际生成
      // 使用极小的 size 和简短 prompt 加速
      requestBody = {
        model: apiModel,
        prompt: '.',
        size: '256x256',
      };
    } else if (model.type === 'video') {
      // AGNES 视频模型：发送快速测试请求，避免实际生成
      // 使用最少的参数组合加速
      requestBody = {
        model: apiModel,
        prompt: '.',
        height: 256,
        width: 256,
        num_frames: 1,
        frame_rate: 1,
      };
    }

    const fullUrl = `${baseUrl}${endpoint}`;
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // 根据状态码返回不同的错误消息
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: `认证失败 (${response.status}): API Key 可能无效或已过期` };
      } else if (response.status === 404) {
        return { success: false, message: `端点未找到 (${response.status}): 请检查 API 基础 URL` };
      } else if (response.status === 429) {
        return { success: false, message: '请求过于频繁 (429): 限流中' };
      } else if (response.status === 503) {
        return { success: false, message: `服务不可用 (${response.status}): API 服务器可能在维护中` };
      } else {
        let errorMsg = await response.text();
        try {
          const errorData = JSON.parse(errorMsg);
          errorMsg = errorData.error?.message || errorMsg;
        } catch (e) {
          // 保持原始错误信息
        }
        return { success: false, message: `API 错误 (${response.status}): ${errorMsg.substring(0, 100)}` };
      }
    }

    // 验证响应格式
    const data = await response.json();
    
    // 不同模型类型的响应格式验证
    if (model.type === 'chat') {
      if (data.choices?.[0]?.message?.content !== undefined) {
        return { success: true, message: '连接成功' };
      }
    } else if (model.type === 'image') {
      // AGNES 返回的响应格式可能是 data、url、images、result 等
      if (data.data || data.url || data.images || data.result || data.image) {
        return { success: true, message: '连接成功' };
      }
    } else if (model.type === 'video') {
      // 视频模型返回的可能是异步任务 ID
      if (data.id || data.status || data.data || data.result) {
        return { success: true, message: '连接成功' };
      }
    }

    return { success: false, message: '响应格式异常' };
  } catch (error: any) {
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      const timeoutMsg = model.type === 'chat' ? '10秒' : '5秒';
      return { success: false, message: `请求超时 (${timeoutMsg}): 网络连接可能有问题或 API 服务器响应缓慢` };
    }

    const message = error.message || '网络错误';
    if (message.includes('fetch')) {
      return { success: false, message: '网络错误: 无法连接到 API 服务器' };
    }

    return { success: false, message: `连接错误: ${message}` };
  }
}

/**
 * 获取默认的 API 端点（不包含 /v1 前缀）
 */
function getDefaultEndpoint(modelType: ModelType): string {
  switch (modelType) {
    case 'chat':
      return '/chat/completions';
    case 'image':
      return '/images/generations';
    case 'video':
      return '/videos';
    default:
      return '/chat/completions';
  }
}

/**
 * 批量检查所有提供商的健康状态
 */
export const checkAllProvidersHealth = async (
  providerIds: string[]
): Promise<HealthCheckResult[]> => {
  const results = await Promise.all(
    providerIds.map(id => checkProviderHealth(id))
  );
  return results;
};

/**
 * 获取健康检查结果的摘要
 */
export const getHealthCheckSummary = (results: HealthCheckResult[]) => {
  const healthy = results.filter(r => r.status === 'healthy').length;
  const errors = results.filter(r => r.status === 'error').length;
  const invalidKeys = results.filter(r => r.status === 'invalid_key').length;
  const timeouts = results.filter(r => r.status === 'timeout').length;

  return {
    total: results.length,
    healthy,
    errors,
    invalidKeys,
    timeouts,
    allHealthy: results.every(r => r.status === 'healthy'),
  };
};
