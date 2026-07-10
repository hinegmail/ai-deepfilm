/**
 * 提供商健康检查和 API Key 验证服务
 * - Provider 级健康检查：轻量探测 BASE URL 是否可达，不调用模型推理接口
 * - 模型级 API Key 验证：调用实际模型端点，验证 API Key 是否有效
 */

import { ModelProvider, ModelType } from '../types/model';
import { getProviderById, getModels, getApiKeyForModel, getApiBaseUrlForModel, getGlobalApiKey } from './modelRegistry';
import { resolveEndpoint } from './apiBaseService';

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

// ============================================
// 辅助函数
// ============================================

/** 是否为本地开发环境（localhost / 127.0.0.1） */
function isLocalOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const o = window.location.origin;
  return o.startsWith('http://localhost') || o.startsWith('http://127.0.0.1') ||
         o.startsWith('https://localhost') || o.startsWith('https://127.0.0.1');
}

/** 是否为本地 / 局域网 / Ollama 服务（不需要代理） */
function isLocalProvider(provider: ModelProvider): boolean {
  const url = (provider.baseUrl || '').toLowerCase();
  return provider.id === 'ollama' ||
         provider.name?.toLowerCase().includes('ollama') ||
         /localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|::1|host\.docker\.internal|\.local/.test(url);
}

/**
 * 解析提供商的基础 URL（与 getApiBaseUrlForModel 逻辑一致）
 * 本地开发时，非本地/非局域网的 API 统一通过 /api-proxy 代理，避免 CORS
 */
function resolveProviderBaseUrl(provider: ModelProvider): string {
  const baseUrl = (provider.baseUrl || '').replace(/\/+$/, '');
  if (isLocalOrigin() && !isLocalProvider(provider)) {
    return '/api-proxy';
  }
  // 本地开发时，host.docker.internal 替换为 localhost（与 getApiBaseUrlForModel 一致）
  if (isLocalOrigin() && baseUrl.includes('host.docker.internal')) {
    return baseUrl.replace(/host\.docker\.internal/g, 'localhost');
  }
  return baseUrl;
}

// ============================================
// Provider 级健康检查（轻量探测，不调用模型推理）
// ============================================

/**
 * 对提供商执行健康检查
 * 仅探测 BASE URL 是否可达，不调用模型推理接口
 * 使用 GET /models 等轻量端点，将 401/403/404/405 等视为"服务器可达"
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
    const result = await probeProviderConnectivity(provider);
    const responseTime = Date.now() - startTime;

    return {
      provider: provider.name,
      providerId,
      status: result.status,
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
 * 将 URL 中的 host.docker.internal 或 LAN IP 替换为 localhost
 * 用于本地服务（Ollama 等）在 host.docker.internal 不可达时的回退
 */
function fallbackToLocalhost(url: string): string | null {
  if (url.includes('host.docker.internal')) {
    return url.replace(/host\.docker\.internal/g, 'localhost');
  }
  // 匹配 192.168.x.x / 10.x.x.x / 172.16-31.x.x
  const lanMatch = url.match(/^(https?:\/\/)(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)/);
  if (lanMatch) {
    return url.replace(lanMatch[2], 'localhost');
  }
  return null;
}

/**
 * 轻量探测提供商 BASE URL 是否可达
 * - Ollama / 本地服务：GET 根路径
 * - 远程 API：GET /models（标准 OpenAI 兼容端点，不触发推理）
 * - 任何 HTTP 响应（状态码 < 500）都意味着服务器可达
 * - 对于本地服务，如果 host.docker.internal / LAN IP 不可达，自动回退到 localhost
 */
async function probeProviderConnectivity(
  provider: ModelProvider
): Promise<{ status: HealthCheckResult['status']; message: string }> {
  const baseUrl = resolveProviderBaseUrl(provider);
  const apiKey = provider.apiKey || getGlobalApiKey() || '';

  const isOllama = provider.id === 'ollama' ||
                   provider.id?.startsWith('ollama') ||
                   provider.name?.toLowerCase().includes('ollama');

  // 如果 baseUrl 使用了 host.docker.internal 或 LAN IP，准备 localhost 回退 URL
  const localhostUrl = fallbackToLocalhost(baseUrl);

  const result = await doProbe(baseUrl, isOllama, apiKey, 8000);

  // 探测成功或返回非网络错误（如认证失败等），直接返回
  if (result.status !== 'timeout' && result.status !== 'error') {
    return result;
  }
  // 如果是网络错误/超时且有 localhost 回退可用，尝试 localhost
  if (localhostUrl) {
    const fallbackResult = await doProbe(localhostUrl, isOllama, apiKey, 8000);
    if (fallbackResult.status === 'healthy') {
      return {
        status: 'healthy',
        message: `连接成功（通过 localhost 回退）`,
      };
    }
    return fallbackResult;
  }

  return result;
}

/**
 * 执行单次轻量探测
 */
async function doProbe(
  baseUrl: string,
  isOllama: boolean,
  apiKey: string,
  timeoutMs: number
): Promise<{ status: HealthCheckResult['status']; message: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {};
    if (apiKey && !isOllama) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Ollama / 本地服务：GET 根路径（Ollama 返回 "Ollama is running"）
    if (isOllama) {
      const testUrl = baseUrl.endsWith('/v1') ? baseUrl.slice(0, -3) : baseUrl;
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.status < 500) {
        return { status: 'healthy', message: '连接成功' };
      }
      return { status: 'error', message: `服务不可用 (HTTP ${response.status})` };
    }

    // 远程 API：GET /models（OpenAI 兼容的标准端点，仅列出可用模型，不触发推理）
    let probeUrl: string;
    if (baseUrl.endsWith('/v1') || baseUrl === '/api-proxy') {
      probeUrl = `${baseUrl}/models`;
    } else {
      probeUrl = `${baseUrl}/v1/models`;
    }

    const response = await fetch(probeUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // 任何 HTTP 响应（状态码 < 500）都意味着服务器可达
    if (response.status < 500) {
      return { status: 'healthy', message: '连接成功' };
    }

    if (response.status === 503) {
      return { status: 'error', message: `服务不可用 (${response.status}): 服务器可能在维护中` };
    }
    return { status: 'error', message: `服务器错误 (HTTP ${response.status})` };
  } catch (error: any) {
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      return { status: 'timeout', message: `请求超时 (${timeoutMs / 1000}秒): 服务器无响应` };
    }

    const message = error.message || '网络错误';
    if (message.includes('fetch') || message.includes('NetworkError') || message.includes('Failed to')) {
      return { status: 'error', message: '网络错误: 无法连接到 API 服务器' };
    }

    return { status: 'error', message: `连接错误: ${message}` };
  }
}

// ============================================
// 模型级 API Key 验证（调用实际模型端点）
// ============================================

/**
 * 验证特定模型的 API Key
 * 调用实际模型推理端点，验证 API Key 是否有效
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
        provider: '未知',
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

    const apiKey = getApiKeyForModel(modelId) || '';
    const isLocalOrOllama = model.providerId === 'ollama' || 
                            provider.name?.toLowerCase().includes('ollama') || 
                            /localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|::1|host\.docker\.internal|\.local/.test(provider.baseUrl || '');

    if (!apiKey && !isLocalOrOllama) {
      return {
        success: false,
        message: 'API Key 未配置',
        provider: provider.name,
        modelType: model.type,
        timestamp: Date.now(),
      };
    }

    // 测试 API 连接（调用实际模型端点）
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
      provider: '未知',
      timestamp: Date.now(),
    };
  }
};

/**
 * 测试与模型端点的实际连接（用于模型级 API Key 验证）
 * 会调用 /chat/completions、/images/generations 或 /videos 等推理端点
 */
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
    // 使用与实际 API 调用相同的 URL 解析逻辑
    // 本地开发时通过 /api-proxy 代理（避免 CORS），生产环境直连
    let baseUrl = getApiBaseUrlForModel(model.id).replace(/\/+$/, '');

    // Ollama 模型验证：GET /v1/models 获取已安装模型列表，检查目标模型是否存在
    const isOllama = provider.id === 'ollama' || provider.id?.startsWith('ollama') || provider.name?.toLowerCase().includes('ollama');
    if (isOllama) {
      const targetModel = (model.apiModel || model.id).toLowerCase();
      // 尝试原始 URL，如果超时/网络错误则回退到 localhost
      const urls = [baseUrl];
      const localhostUrl = fallbackToLocalhost(baseUrl);
      if (localhostUrl) urls.push(localhostUrl);

      for (let i = 0; i < urls.length; i++) {
        const tryUrl = urls[i].endsWith('/v1') ? `${urls[i]}/models` : `${urls[i]}/v1/models`;
        const probeController = new AbortController();
        const probeTimeout = setTimeout(() => probeController.abort(), timeoutMs);
        try {
          const response = await fetch(tryUrl, {
            method: 'GET',
            signal: probeController.signal,
          });
          clearTimeout(probeTimeout);

          if (response.status >= 500) {
            // 服务器错误，如果不是最后一个 URL，继续尝试回退
            if (i < urls.length - 1) continue;
            return { success: false, message: `服务不可用 (HTTP ${response.status})` };
          }

          // 服务器可达，检查模型是否已安装
          const data = await response.json();
          const installedModels: string[] = (data.data || []).map((m: any) =>
            (m.id || m.name || '').toLowerCase()
          );

          if (installedModels.includes(targetModel)) {
            return {
              success: true,
              message: i > 0 ? '连接成功（通过 localhost 回退）' : '连接成功',
            };
          }

          // 模型未安装
          const available = installedModels.slice(0, 5).join(', ');
          return {
            success: false,
            message: `模型未安装: ${model.apiModel || model.id}${available ? `（可用: ${available}）` : ''}`,
          };
        } catch (e: any) {
          clearTimeout(probeTimeout);
          if (e.name === 'AbortError') {
            // 超时，如果有回退 URL 则继续尝试
            if (i < urls.length - 1) continue;
            return { success: false, message: `请求超时 (${timeoutMs / 1000}秒)` };
          }
          // 网络错误，如果有回退 URL 则继续尝试
          if (i < urls.length - 1) continue;
          const msg = e.message || '网络错误';
          if (msg.includes('fetch') || msg.includes('NetworkError') || msg.includes('Failed to')) {
            return { success: false, message: '网络错误: 无法连接到 API 服务器' };
          }
          return { success: false, message: `连接错误: ${msg}` };
        }
      }
    }

    let endpoint = resolveEndpoint(baseUrl, model.endpoint || getDefaultEndpoint(model.type));

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

// ============================================
// 批量检查与摘要
// ============================================

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
