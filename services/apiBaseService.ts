// Author: forsearch | Updated: 2026-07-09
import { AspectRatio } from "../types";
import { 
  getGlobalApiKey as getRegistryApiKey,
  setGlobalApiKey as setRegistryApiKey,
  getApiBaseUrlForModel,
  getApiKeyForModel,
  getModelById,
  getModels,
  getActiveModel,
  getActiveChatModel,
} from './modelRegistry';

export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

let runtimeApiKey: string = process.env.API_KEY || "";

export const setGlobalApiKey = (key: string) => {
  runtimeApiKey = key;
  setRegistryApiKey(key);
};

export const resolveModel = (type: 'chat' | 'image' | 'video', modelId?: string) => {
  if (modelId) {
    const model = getModelById(modelId);
    if (model && model.type === type) return model;
    const candidates = getModels(type).filter(m => m.apiModel === modelId);
    if (candidates.length === 1) return candidates[0];
  }
  return getActiveModel(type);
};

export const resolveRequestModel = (type: 'chat' | 'image' | 'video', modelId?: string): string => {
  const resolved = resolveModel(type, modelId);
  return resolved?.apiModel || resolved?.id || modelId || '';
};

export const checkApiKey = (type: 'chat' | 'image' | 'video' = 'chat', modelId?: string) => {
  const resolvedModel = resolveModel(type, modelId);
  
  if (resolvedModel) {
    const modelApiKey = getApiKeyForModel(resolvedModel.id);
    if (modelApiKey) return modelApiKey;
  }
  
  const registryKey = getRegistryApiKey();
  if (registryKey) return registryKey;
  
  if (!runtimeApiKey) throw new ApiKeyError("API Key 缺失，请在模型配置中设置 API Key。");
  return runtimeApiKey;
};

export const DEFAULT_API_BASE = 'https://apihub.agnes-ai.com/v1';

export const SCRIPT_INPUT_MAX_CHARS = 120000;
export const LONG_FORM_MAX_TOKENS = 32768;
export const PARAGRAPHS_CHUNK_MAX_TOKENS = 8192;

export const getApiBase = (type: 'chat' | 'image' | 'video' = 'chat', modelId?: string): string => {
  try {
    const resolvedModel = resolveModel(type, modelId);
    if (resolvedModel) {
      return getApiBaseUrlForModel(resolvedModel.id);
    }
    return getDefaultApiBase();
  } catch (e) {
    return getDefaultApiBase();
  }
};

export const getDefaultApiBase = (): string => {
  if (typeof window !== 'undefined') {
    const o = window.location.origin;
    const isLocal = o.startsWith('http://localhost') || o.startsWith('http://127.0.0.1') || o.startsWith('https://localhost') || o.startsWith('https://127.0.0.1');
    // 本地开发通过 /api-proxy 代理，代理会自动添加 /v1
    if (isLocal && DEFAULT_API_BASE === 'https://apihub.agnes-ai.com/v1') return '/api-proxy';
  }
  return DEFAULT_API_BASE;
};

export const resolveGcsUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('https://storage.googleapis.com/')) {
    if (typeof window !== 'undefined') {
      const o = window.location.origin;
      const isLocal = o.startsWith('http://localhost') || o.startsWith('http://127.0.0.1') || o.startsWith('https://localhost') || o.startsWith('https://127.0.0.1');
      if (isLocal) {
        return url.replace('https://storage.googleapis.com', '/gcs-proxy');
      }
    }
  }
  return url;
};

export const getActiveChatModelName = (): string => {
  try {
    const model = getActiveChatModel();
    return model?.apiModel || model?.id || 'gpt-5.1';
  } catch (e) {
    return 'gpt-5.1';
  }
};

export const getVeoModelName = (hasReferenceImage: boolean, aspectRatio: AspectRatio): string => {
  const orientation = aspectRatio === '9:16' ? 'portrait' : 'landscape';
  
  if (hasReferenceImage) {
    return `veo_3_1_i2v_s_fast_fl_${orientation}`;
  } else {
    return `veo_3_1_t2v_fast_${orientation}`;
  }
};

export const getSoraVideoSize = (aspectRatio: AspectRatio): string => {
  const sizeMap: Record<AspectRatio, string> = {
    '16:9': '1280x720',
    '9:16': '720x1280',
    '1:1': '720x720',
  };
  return sizeMap[aspectRatio];
};

export const verifyApiKey = async (key: string): Promise<{ success: boolean; message: string }> => {
  try {
    const apiBase = getApiBase('chat');
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-41',
        messages: [{ role: 'user', content: '仅返回1' }],
        temperature: 0.1,
        max_tokens: 5
      })
    });

    if (!response.ok) {
      let errorMessage = `验证失败: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        // ignore
      }
      return { success: false, message: errorMessage };
    }

    const data = await response.json();
    if (data.choices?.[0]?.message?.content !== undefined) {
      return { success: true, message: 'API Key 验证成功' };
    } else {
      return { success: false, message: '返回格式异常' };
    }
  } catch (error: any) {
    return { success: false, message: error.message || '网络错误' };
  }
};
