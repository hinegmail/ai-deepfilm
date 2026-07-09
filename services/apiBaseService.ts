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

export { getActiveChatModel };

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

export const retryOperation = async <T>(operation: () => Promise<T>, maxRetries: number = 3, baseDelay: number = 2000): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (e: any) {
      lastError = e;
      const isRetryableError = 
        e.status === 429 || 
        e.status === 403 || 
        e.status === 502 ||
        e.status === 503 ||
        e.code === 429 || 
        e.status === 504 ||
        e.message?.includes('429') || 
        e.message?.includes('403') ||
        e.message?.includes('Forbidden') ||
        e.message?.includes('502') ||
        e.message?.includes('503') ||
        e.message?.includes('quota') || 
        e.message?.includes('RESOURCE_EXHAUSTED') ||
        e.message?.includes('overloaded') ||
        e.message?.includes('cpu overloaded') ||
        e.message?.includes('超时') ||
        e.message?.includes('timeout') ||
        e.message?.includes('Gateway Timeout') ||
        e.message?.includes('504') ||
        e.message?.includes('ECONNRESET') ||
        e.message?.includes('ETIMEDOUT') ||
        e.message?.includes('network') ||
        e.status >= 500;
      
      if (isRetryableError && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`请求失败，正在重试... (第 ${i + 1}/${maxRetries} 次，${delay}ms后重试)`, e.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
};

export const cleanJsonString = (str: string): string => {
  if (!str) return "{}";
  let cleaned = str.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/```\s*$/, '');
  return cleaned.trim();
};

export const chatCompletion = async (prompt: string, model: string = 'gpt-5.1', temperature: number = 0.7, maxTokens: number = 8192, responseFormat?: 'json_object', timeout: number = 600000): Promise<string> => {
  const apiKey = checkApiKey('chat', model);
  const requestModel = resolveRequestModel('chat', model);
  
  const requestBody: any = {
    model: requestModel,
    messages: [{ role: 'user', content: prompt }],
    temperature: temperature,
    max_tokens: maxTokens
  };
  
  if (responseFormat === 'json_object') {
    requestBody.response_format = { type: 'json_object' };
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const apiBase = getApiBase('chat', model);
    const resolvedModel = resolveModel('chat', model);
    const endpoint = resolvedModel?.endpoint || '/chat/completions';
    const response = await fetch(`${apiBase}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!response.ok) {
      let errorMessage = `HTTP错误: ${response.status}`;
      const raw = await response.text();
      try {
        if (raw) {
          const errorData = JSON.parse(raw);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        }
      } catch (_) {
        if (raw) errorMessage = raw;
      }
      throw new Error(errorMessage);
    }

    const data = JSON.parse(await response.text() || '{}');
    return data.choices?.[0]?.message?.content || '';
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`请求超时（${timeout}ms）`);
    }
    throw error;
  }
};

export const chatCompletionStream = async (
  prompt: string,
  model: string = 'gpt-5.1',
  temperature: number = 0.7,
  responseFormat: 'json_object' | undefined,
  timeout: number = 600000,
  onDelta?: (delta: string) => void
): Promise<string> => {
  const apiKey = checkApiKey('chat', model);
  const requestModel = resolveRequestModel('chat', model);
  const requestBody: any = {
    model: requestModel,
    messages: [{ role: 'user', content: prompt }],
    temperature: temperature,
    stream: true
  };

  if (responseFormat === 'json_object') {
    requestBody.response_format = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const apiBase = getApiBase('chat', model);
    const resolvedModel = resolveModel('chat', model);
    const endpoint = resolvedModel?.endpoint || '/chat/completions';
    const response = await fetch(`${apiBase}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!response.ok) {
      let errorMessage = `HTTP错误: ${response.status}`;
      const raw = await response.text();
      try {
        if (raw) {
          const errorData = JSON.parse(raw);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        }
      } catch (_) {
        if (raw) errorMessage = raw;
      }
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error('响应流为空，无法进行流式处理');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundaryIndex = buffer.indexOf('\n\n');
      while (boundaryIndex !== -1) {
        const chunk = buffer.slice(0, boundaryIndex).trim();
        buffer = buffer.slice(boundaryIndex + 2);

        if (chunk) {
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const dataStr = line.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') {
              clearTimeout(timeoutId);
              return fullText;
            }
            try {
              const payload = JSON.parse(dataStr);
              const delta = payload?.choices?.[0]?.delta?.content || payload?.choices?.[0]?.message?.content || '';
              if (delta) {
                fullText += delta;
                onDelta?.(delta);
              }
            } catch (e) {
              // ignore
            }
          }
        }
        boundaryIndex = buffer.indexOf('\n\n');
      }
    }

    clearTimeout(timeoutId);
    return fullText;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`请求超时（${timeout}ms）`);
    }
    throw error;
  }
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

export const VISUAL_STYLE_PROMPTS: { [key: string]: string } = {
  'live-action': 'photorealistic, cinematic film quality, real human actors, professional cinematography, natural lighting, 8K resolution',
  'anime': 'Japanese anime style, cel-shaded, vibrant colors, expressive eyes, dynamic poses, Studio Ghibli/Makoto Shinkai quality',
  '2d-animation': 'classic 2D animation, hand-drawn style, Disney/Pixar quality, smooth lines, expressive characters, painterly backgrounds',
  '3d-animation': 'high-quality 3D CGI animation, Pixar/DreamWorks style, subsurface scattering, detailed textures, stylized characters',
  'cyberpunk': 'cyberpunk aesthetic, neon-lit, rain-soaked streets, holographic displays, high-tech low-life, Blade Runner style',
  'oil-painting': 'oil painting style, visible brushstrokes, rich textures, classical art composition, museum quality fine art',
};

export const NEGATIVE_PROMPTS: { [key: string]: string } = {
  'live-action': 'cartoon, anime, illustration, painting, drawing, 3d render, cgi, low quality, blurry, grainy, watermark, text, logo, signature, distorted face, bad anatomy, extra limbs, mutated hands, deformed, ugly, disfigured, poorly drawn, amateur',
  'anime': 'photorealistic, 3d render, western cartoon, ugly, bad anatomy, extra limbs, deformed limbs, blurry, watermark, text, logo, poorly drawn face, mutated hands, extra fingers, missing fingers, bad proportions, grotesque',
  '2d-animation': 'photorealistic, 3d, low quality, pixelated, blurry, watermark, text, bad anatomy, deformed, ugly, amateur drawing, inconsistent style, rough sketch',
  '3d-animation': 'photorealistic, 2d, flat, hand-drawn, low poly, bad topology, texture artifacts, z-fighting, clipping, low quality, blurry, watermark, text, bad rigging, unnatural movement',
  'cyberpunk': 'bright daylight, pastoral, medieval, fantasy, cartoon, low tech, rural, natural, watermark, text, logo, low quality, blurry, amateur',
  'oil-painting': 'digital art, photorealistic, 3d render, cartoon, anime, low quality, blurry, watermark, text, amateur, poorly painted, muddy colors, overworked canvas',
};
