// Author: forsearch | Updated: 2026-04-30
import {
  ModelType,
  ModelDefinition,
  ModelProvider,
  ModelRegistryState,
  ActiveModels,
  ChatModelDefinition,
  ImageModelDefinition,
  VideoModelDefinition,
  BUILTIN_PROVIDERS,
  ALL_BUILTIN_MODELS,
  DEFAULT_ACTIVE_MODELS,
  AspectRatio,
  VideoDuration,
} from '../types/model';

const STORAGE_KEY = 'ai_manga_studio_model_registry';
const LEGACY_STORAGE_KEY = ['big' + 'banana', 'model', 'registry'].join('_');
const API_KEY_STORAGE_KEY = 'antsk_api_key';

const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '').toLowerCase();

let registryState: ModelRegistryState | null = null;

const getDefaultState = (): ModelRegistryState => ({
  providers: [...BUILTIN_PROVIDERS],
  models: [...ALL_BUILTIN_MODELS],
  activeModels: { ...DEFAULT_ACTIVE_MODELS },
  globalApiKey: localStorage.getItem(API_KEY_STORAGE_KEY) || undefined,
});

export const loadRegistry = (): ModelRegistryState => {
  if (registryState) {
    return registryState;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ModelRegistryState;
      const deprecatedVideoModelIds = [
        'veo-3.1',
        'veo_3_1_t2v_fast_landscape',
        'veo_3_1_t2v_fast_portrait',
        'veo_3_1_i2v_s_fast_fl_landscape',
        'veo_3_1_i2v_s_fast_fl_portrait',
      ];
      
      // 合并内置提供商，并保留用户自定义的 baseUrl/name
      BUILTIN_PROVIDERS.forEach(bp => {
        const idx = parsed.providers.findIndex(p => p.id === bp.id);
        if (idx === -1) {
          parsed.providers.unshift(bp);
        } else {
          parsed.providers[idx] = { ...bp, ...parsed.providers[idx] };
        }
      });

      // 彻底移除任何已废弃的旧提供商
      parsed.providers = parsed.providers.filter(p => p.id !== 'gitcc' && p.id !== 'antsk');

      // 只保留存在于 BUILTIN_PROVIDERS 中的提供商（这是最后的防线）
      parsed.providers = parsed.providers.filter(p => BUILTIN_PROVIDERS.some(bp => bp.id === p.id));

      // 按 baseUrl 去重提供商（保留先出现的项，通常为内置）
      const seenBaseUrls = new Set<string>();
      parsed.providers = parsed.providers.filter(p => {
        const key = normalizeBaseUrl(p.baseUrl);
        if (seenBaseUrls.has(key)) return false;
        seenBaseUrls.add(key);
        return true;
      });
      
      // 合并内置模型，并确保内置模型的参数与代码保持同步
      ALL_BUILTIN_MODELS.forEach(bm => {
        const existingIndex = parsed.models.findIndex(m => m.id === bm.id);
        if (existingIndex === -1) {
          // 内置模型不存在，添加
          parsed.models.push(bm);
        } else {
          // 内置模型已存在，更新 params 以确保与代码同步（保留用户的 isEnabled 设置）
          const existing = parsed.models[existingIndex];
          parsed.models[existingIndex] = {
            ...bm,
            isEnabled: existing.isEnabled,
          };
        }
      });

      // 迁移缺失的 apiModel（优先从 id 或 providerId 前缀推断）
      parsed.models = parsed.models.map(m => {
        if (m.apiModel) return m;
        if (m.providerId && m.id.startsWith(`${m.providerId}:`)) {
          return { ...m, apiModel: m.id.slice(m.providerId.length + 1) };
        }
        return { ...m, apiModel: m.id };
      });

      // 清理旧的 Veo 内置模型和已废弃模型
      parsed.models = parsed.models.filter(
        m => !(m.type === 'video' && deprecatedVideoModelIds.includes(m.id)) && m.providerId !== 'gitcc'
      );

      // 迁移激活视频模型和清理已废弃模型的引用
      if (
        deprecatedVideoModelIds.includes(parsed.activeModels.video) ||
        parsed.activeModels.video?.startsWith('veo_3_1') ||
        parsed.activeModels.video?.startsWith('gitcc:')
      ) {
        parsed.activeModels.video = 'agnes:agnes-video-v2.0';
      }
      
      // 清理已废弃模型的引用
      if (parsed.activeModels.chat?.startsWith('gitcc:')) {
        parsed.activeModels.chat = 'agnes:agnes-2.0-flash';
      }
      if (parsed.activeModels.image?.startsWith('gitcc:')) {
        parsed.activeModels.image = 'agnes:agnes-image-2.1-flash';
      }
      
      // 同步全局 API Key
      parsed.globalApiKey = localStorage.getItem(API_KEY_STORAGE_KEY) || parsed.globalApiKey;
      
      registryState = parsed;
      saveRegistry(parsed);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return parsed;
    }
  } catch (e) {
    console.error('加载模型注册中心失败:', e);
  }

  registryState = getDefaultState();
  return registryState;
};

/**
 * 保存状态到 localStorage
 */
export const saveRegistry = (state: ModelRegistryState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    registryState = state;
  } catch (e) {
    console.error('保存模型注册中心失败:', e);
  }
};

/**
 * 获取当前状态
 */
export const getRegistryState = (): ModelRegistryState => {
  return loadRegistry();
};

/**
 * 重置为默认状态
 */
export const resetRegistry = (): void => {
  registryState = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  loadRegistry();
};

// ============================================
// 提供商管理
// ============================================

/**
 * 获取所有提供商
 */
export const getProviders = (): ModelProvider[] => {
  const providers = loadRegistry().providers;
  // 最后防线：过滤掉任何已废弃的提供商
  return providers.filter(p => p.id !== 'gitcc' && p.id !== 'antsk');
};

/**
 * 根据 ID 获取提供商
 */
export const getProviderById = (id: string): ModelProvider | undefined => {
  return getProviders().find(p => p.id === id);
};

/**
 * 获取默认提供商
 */
export const getDefaultProvider = (): ModelProvider => {
  return getProviders().find(p => p.isDefault) || BUILTIN_PROVIDERS[0];
};

/**
 * 添加提供商
 */
export const addProvider = (provider: Omit<ModelProvider, 'id' | 'isBuiltIn'>): ModelProvider => {
  const state = loadRegistry();
  const normalized = normalizeBaseUrl(provider.baseUrl);
  const existing = state.providers.find(p => normalizeBaseUrl(p.baseUrl) === normalized);
  if (existing) return existing;
  const newProvider: ModelProvider = {
    ...provider,
    id: `provider_${Date.now()}`,
    isBuiltIn: false,
  };
  state.providers.push(newProvider);
  saveRegistry(state);
  return newProvider;
};

/**
 * 更新提供商
 */
export const updateProvider = (id: string, updates: Partial<ModelProvider>): boolean => {
  const state = loadRegistry();
  const index = state.providers.findIndex(p => p.id === id);
  if (index === -1) return false;

  if (state.providers[index].isBuiltIn) {
    delete updates.id;
    delete updates.isBuiltIn;
  }

  state.providers[index] = { ...state.providers[index], ...updates };
  saveRegistry(state);
  return true;
};

/**
 * 删除提供商
 */
export const removeProvider = (id: string): boolean => {
  const state = loadRegistry();
  const provider = state.providers.find(p => p.id === id);
  
  if (!provider || provider.isBuiltIn) return false;
  
  state.models = state.models.filter(m => m.providerId !== id);
  state.providers = state.providers.filter(p => p.id !== id);
  
  saveRegistry(state);
  return true;
};

// ============================================
// 模型管理
// ============================================

/**
 * 获取所有模型
 */
export const getModels = (type?: ModelType): ModelDefinition[] => {
  const models = loadRegistry().models;
  if (type) {
    return models.filter(m => m.type === type);
  }
  return models;
};

/**
 * 获取对话模型列表
 */
export const getChatModels = (): ChatModelDefinition[] => {
  return getModels('chat') as ChatModelDefinition[];
};

/**
 * 获取图片模型列表
 */
export const getImageModels = (): ImageModelDefinition[] => {
  return getModels('image') as ImageModelDefinition[];
};

/**
 * 获取视频模型列表
 */
export const getVideoModels = (): VideoModelDefinition[] => {
  return getModels('video') as VideoModelDefinition[];
};

/**
 * 根据 ID 获取模型
 */
export const getModelById = (id: string): ModelDefinition | undefined => {
  return getModels().find(m => m.id === id);
};

/**
 * 获取当前激活的模型
 */
export const getActiveModel = (type: ModelType): ModelDefinition | undefined => {
  const state = loadRegistry();
  const activeId = state.activeModels[type];
  return getModelById(activeId);
};

/**
 * 获取当前激活的对话模型
 */
export const getActiveChatModel = (): ChatModelDefinition | undefined => {
  return getActiveModel('chat') as ChatModelDefinition | undefined;
};

/**
 * 获取当前激活的图片模型
 */
export const getActiveImageModel = (): ImageModelDefinition | undefined => {
  return getActiveModel('image') as ImageModelDefinition | undefined;
};

/**
 * 获取当前激活的视频模型
 */
export const getActiveVideoModel = (): VideoModelDefinition | undefined => {
  return getActiveModel('video') as VideoModelDefinition | undefined;
};

/**
 * 设置激活的模型
 */
export const setActiveModel = (type: ModelType, modelId: string): boolean => {
  const model = getModelById(modelId);
  if (!model || model.type !== type || !model.isEnabled) return false;

  const state = loadRegistry();
  state.activeModels[type] = modelId;
  saveRegistry(state);
  return true;
};

/**
 * 注册新模型
 * @param model - 模型定义（可包含自定义 id，不包含 isBuiltIn）
 */
export const registerModel = (model: Omit<ModelDefinition, 'isBuiltIn'> & { id?: string }): ModelDefinition => {
  const state = loadRegistry();
  
  const providedId = (model as any).id?.trim();
  const apiModel = (model as any).apiModel?.trim();
  const baseId = providedId || (apiModel ? `${model.providerId}:${apiModel}` : `model_${Date.now()}`);
  let modelId = baseId;

  // 若未显式提供 ID，则自动生成唯一 ID（允许 API 模型名重复）
  if (!providedId) {
    let suffix = 1;
    while (state.models.some(m => m.id === modelId)) {
      modelId = `${baseId}_${suffix++}`;
    }
  } else if (state.models.some(m => m.id === modelId)) {
    throw new Error(`模型 ID "${modelId}" 已存在，请使用其他 ID`);
  }
  
  const newModel = {
    ...model,
    id: modelId,
    apiModel: apiModel || (model.providerId && modelId.startsWith(`${model.providerId}:`)
      ? modelId.slice(model.providerId.length + 1)
      : modelId),
    isBuiltIn: false,
  } as ModelDefinition;
  
  state.models.push(newModel);
  saveRegistry(state);
  return newModel;
};

/**
 * 更新模型
 */
export const updateModel = (id: string, updates: Partial<ModelDefinition>): boolean => {
  const state = loadRegistry();
  const index = state.models.findIndex(m => m.id === id);
  if (index === -1) return false;

  // 内置模型只能修改 isEnabled 和 params
  if (state.models[index].isBuiltIn) {
    const allowedUpdates: Partial<ModelDefinition> = {};
    if (updates.isEnabled !== undefined) allowedUpdates.isEnabled = updates.isEnabled;
    if (updates.params) allowedUpdates.params = updates.params as any;
    state.models[index] = { ...state.models[index], ...allowedUpdates } as ModelDefinition;
  } else {
    state.models[index] = { ...state.models[index], ...updates } as ModelDefinition;
  }

  saveRegistry(state);
  return true;
};

/**
 * 删除模型
 */
export const removeModel = (id: string): boolean => {
  const state = loadRegistry();
  const model = state.models.find(m => m.id === id);
  
  // 不能删除内置模型
  if (!model || model.isBuiltIn) return false;
  
  // 如果删除的是当前激活的模型，切换到同类型的第一个启用模型
  if (state.activeModels[model.type] === id) {
    const fallback = state.models.find(m => m.type === model.type && m.id !== id && m.isEnabled);
    if (fallback) {
      state.activeModels[model.type] = fallback.id;
    }
  }
  
  state.models = state.models.filter(m => m.id !== id);
  saveRegistry(state);
  return true;
};

/**
 * 启用/禁用模型
 */
export const toggleModelEnabled = (id: string, enabled: boolean): boolean => {
  return updateModel(id, { isEnabled: enabled });
};

// ============================================
// API Key 管理
// ============================================

/**
 * 获取全局 API Key
 */
export const getGlobalApiKey = (): string | undefined => {
  return loadRegistry().globalApiKey || localStorage.getItem(API_KEY_STORAGE_KEY) || undefined;
};

/**
 * 设置全局 API Key
 */
export const setGlobalApiKey = (apiKey: string): void => {
  const state = loadRegistry();
  state.globalApiKey = apiKey;
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  saveRegistry(state);
};

/**
 * 获取模型对应的 API Key
 * 优先级：模型专属 Key > 提供商 Key > 全局 Key
 */
export const getApiKeyForModel = (modelId: string): string | undefined => {
  const model = getModelById(modelId);
  if (!model) return getGlobalApiKey();
  
  // 1. 优先使用模型专属 API Key
  if (model.apiKey) {
    return model.apiKey;
  }
  
  // 2. 其次使用提供商的 API Key
  const provider = getProviderById(model.providerId);
  if (provider?.apiKey) {
    return provider.apiKey;
  }
  
  // 3. 判断是否为本地/局域网服务或 Ollama 服务，若是则返回占位符 Key 避免报错
  if (provider) {
    const isOllama = provider.id === 'ollama' || provider.id?.startsWith('ollama') || provider.name?.toLowerCase().includes('ollama');
    const url = (provider.baseUrl || '').toLowerCase();
    const isLocal = url.includes('localhost') || 
                    url.includes('127.0.0.1') || 
                    /192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|::1|host\.docker\.internal|\.local/.test(url);
    if (isOllama || isLocal) {
      return 'local-bypass-key';
    }
  }
  
  // 4. 最后使用全局 API Key
  return getGlobalApiKey();
};

/** 本地用相对路径走 Vite 代理，避免 CORS */
const API_PROXY_PATH = '/api-proxy';

/** 是否当前运行在本地（localhost/127.0.0.1），用于决定是否走代理规避 CORS */
function isLocalOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const o = window.location.origin;
  return o.startsWith('http://localhost') || o.startsWith('http://127.0.0.1') || o.startsWith('https://localhost') || o.startsWith('https://127.0.0.1');
}

/**
 * 获取模型对应的 API 基础 URL
 * - 本地开发时走代理：/api-proxy 到提供商
 * - 线上环境：直连或走后端代理
 */
export const getApiBaseUrlForModel = (modelId: string): string => {
  const model = getModelById(modelId);
  const provider = model ? getProviderById(model.providerId) : BUILTIN_PROVIDERS[0];
  let baseUrl = (provider?.baseUrl || BUILTIN_PROVIDERS[0].baseUrl).replace(/\/+$/, '');

  // 本地开发时统一通过 /api-proxy 代理，避免 CORS 问题
  if (isLocalOrigin() && !baseUrl.startsWith('http://localhost')) {
    // 非本地的 API，通过代理访问
    return API_PROXY_PATH;
  }

  return baseUrl;
};

// ============================================
// 辅助函数
// ============================================

/**
 * 获取激活模型的完整配置
 */
export const getActiveModelsConfig = (): ActiveModels => {
  return loadRegistry().activeModels;
};

/**
 * 检查模型是否可用（已启用且有 API Key）
 */
export const isModelAvailable = (modelId: string): boolean => {
  const model = getModelById(modelId);
  if (!model || !model.isEnabled) return false;
  
  const apiKey = getApiKeyForModel(modelId);
  return !!apiKey;
};

// ============================================
// 默认值辅助函数（向后兼容）
// ============================================

/**
 * 获取默认横竖屏比例
 */
export const getDefaultAspectRatio = (): AspectRatio => {
  const imageModel = getActiveImageModel();
  if (imageModel) {
    return imageModel.params.defaultAspectRatio;
  }
  return '16:9';
};

/**
 * 获取默认视频时长
 */
export const getDefaultVideoDuration = (): VideoDuration => {
  const videoModel = getActiveVideoModel();
  if (videoModel) {
    return videoModel.params.defaultDuration;
  }
  return 8;
};

/**
 * 获取视频模型类型
 */
export const getVideoModelType = (): 'sora' | 'veo' => {
  const videoModel = getActiveVideoModel();
  if (videoModel) {
    return videoModel.params.mode === 'async' ? 'sora' : 'veo';
  }
  return 'sora';
};
