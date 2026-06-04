export type ModelType = 'chat' | 'image' | 'video';

export type AspectRatio = '16:9' | '9:16' | '1:1';

export type VideoDuration = 4 | 8 | 12;

export type VideoMode = 'sync' | 'async' | 'doubao';

export interface ChatModelParams {
  temperature: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface ImageModelParams {
  defaultAspectRatio: AspectRatio;
  supportedAspectRatios: AspectRatio[];
}

export interface VideoModelParams {
  mode: VideoMode;
  defaultAspectRatio: AspectRatio;
  supportedAspectRatios: AspectRatio[];
  defaultDuration: VideoDuration;
  supportedDurations: VideoDuration[];
}

export type ModelParams = ChatModelParams | ImageModelParams | VideoModelParams;

export interface ModelDefinitionBase {
  id: string;
  apiModel?: string;
  name: string;
  type: ModelType;
  providerId: string;
  endpoint?: string;
  description?: string;
  isBuiltIn: boolean;
  isEnabled: boolean;
  apiKey?: string;
}

export interface ChatModelDefinition extends ModelDefinitionBase {
  type: 'chat';
  params: ChatModelParams;
}

export interface ImageModelDefinition extends ModelDefinitionBase {
  type: 'image';
  params: ImageModelParams;
}

export interface VideoModelDefinition extends ModelDefinitionBase {
  type: 'video';
  params: VideoModelParams;
}

export type ModelDefinition = ChatModelDefinition | ImageModelDefinition | VideoModelDefinition;

export interface ModelProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  isBuiltIn: boolean;
  isDefault: boolean;
}

export interface ActiveModels {
  chat: string;
  image: string;
  video: string;
}

export interface ModelRegistryState {
  providers: ModelProvider[];
  models: ModelDefinition[];
  activeModels: ActiveModels;
  globalApiKey?: string;
}

export interface ChatOptions {
  prompt: string;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
  timeout?: number;
  overrideParams?: Partial<ChatModelParams>;
}

export interface ImageGenerateOptions {
  prompt: string;
  referenceImages?: string[];
  aspectRatio?: AspectRatio;
}

export interface VideoGenerateOptions {
  prompt: string;
  startImage?: string;
  endImage?: string;
  aspectRatio?: AspectRatio;
  duration?: VideoDuration;
}

export const DEFAULT_CHAT_PARAMS: ChatModelParams = {
  temperature: 0.7,
  maxTokens: undefined,
};

export const DEFAULT_IMAGE_PARAMS: ImageModelParams = {
  defaultAspectRatio: '16:9',
  supportedAspectRatios: ['16:9', '9:16'],
};

export const DEFAULT_VIDEO_PARAMS_VEO: VideoModelParams = {
  mode: 'sync',
  defaultAspectRatio: '16:9',
  supportedAspectRatios: ['16:9', '9:16'],
  defaultDuration: 8,
  supportedDurations: [8],
};

export const DEFAULT_VIDEO_PARAMS_SORA: VideoModelParams = {
  mode: 'async',
  defaultAspectRatio: '16:9',
  supportedAspectRatios: ['16:9', '9:16', '1:1'],
  defaultDuration: 8,
  supportedDurations: [4, 8, 12],
};

export const DEFAULT_VIDEO_PARAMS_DOUBAO: VideoModelParams = {
  mode: 'doubao',
  defaultAspectRatio: '16:9',
  supportedAspectRatios: ['16:9', '9:16', '1:1'],
  defaultDuration: 8,
  supportedDurations: [4, 8, 12],
};

export const BUILTIN_CHAT_MODELS: ChatModelDefinition[] = [
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    type: 'chat',
    providerId: 'gitcc',
    description: '剧情脚本切分首选：结构化输出稳定，适合分场/分镜、提取人物与事件',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    type: 'chat',
    providerId: 'gitcc',
    description: '创意增强型切分：更适合提供多种切分方案、改写节奏与镜头建议（一致性略弱）',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
  {
    id: 'gpt-41',
    name: 'GPT-4.1',
    type: 'chat',
    providerId: 'gitcc',
    description: '严谨切分：对复杂叙事与长文本更稳，适合时间线梳理、因果关系与要点校对',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    type: 'chat',
    providerId: 'gitcc',
    description: '长文友好：适合长篇剧本的分段、摘要与角色弧线整理，文字表达更细腻',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
];

export const BUILTIN_IMAGE_MODELS: ImageModelDefinition[] = [
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Gemini 3 Pro Image',
    type: 'image',
    providerId: 'gitcc',
    endpoint: '/v1beta/models/gemini-3-pro-image-preview:generateContent',
    description: 'Google Gemini 图片生成模型',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_IMAGE_PARAMS },
  },
];

export const BUILTIN_VIDEO_MODELS: VideoModelDefinition[] = [
  {
    id: 'veo',
    name: 'Veo 3.1 (Auto)',
    type: 'video',
    providerId: 'gitcc',
    endpoint: '/v1/chat/completions',
    description: 'Google Veo 视频生成（自动按横竖屏与是否带图选择模型），同步模式',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_VIDEO_PARAMS_VEO },
  },
  {
    id: 'sora-2',
    name: 'Sora-2',
    type: 'video',
    providerId: 'gitcc',
    endpoint: '/v1/videos',
    description: 'OpenAI Sora 视频生成，异步模式，支持多种时长',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_VIDEO_PARAMS_SORA },
  },
];

export const DEPEI_PROVIDER_BASE_URL = 'http://api.gitcc.com';

export const BUILTIN_PROVIDERS: ModelProvider[] = [
  {
    id: 'gitcc',
    name: 'GitCC API',
    baseUrl: 'http://api.gitcc.com',
    isBuiltIn: true,
    isDefault: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    isBuiltIn: true,
    isDefault: false,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    isBuiltIn: true,
    isDefault: false,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    isBuiltIn: true,
    isDefault: false,
  },
  {
    id: 'agnes',
    name: 'AGNES AI',
    baseUrl: 'https://apihub.agnes-ai.com/v1',
    isBuiltIn: true,
    isDefault: false,
  },
  {
    id: 'ollama',
    name: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434/v1',
    isBuiltIn: true,
    isDefault: false,
  },
];

// OpenAI 兼容的模型
const OPENAI_CHAT_MODELS: ChatModelDefinition[] = [
  {
    id: 'openai:gpt-4o',
    apiModel: 'gpt-4o',
    name: 'GPT-4o',
    type: 'chat',
    providerId: 'openai',
    description: 'OpenAI 最新模型，高效能',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
  {
    id: 'openai:gpt-4-turbo',
    apiModel: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    type: 'chat',
    providerId: 'openai',
    description: 'OpenAI GPT-4 Turbo',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
  {
    id: 'openai:gpt-3.5-turbo',
    apiModel: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    type: 'chat',
    providerId: 'openai',
    description: 'OpenAI GPT-3.5 Turbo，成本低',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
];

const ANTHROPIC_CHAT_MODELS: ChatModelDefinition[] = [
  {
    id: 'anthropic:claude-opus',
    apiModel: 'claude-opus-4-1-20250805',
    name: 'Claude Opus 4.1',
    type: 'chat',
    providerId: 'anthropic',
    description: 'Anthropic Claude 最新版本，长文本理解优秀',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
  {
    id: 'anthropic:claude-sonnet',
    apiModel: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    type: 'chat',
    providerId: 'anthropic',
    description: 'Anthropic Claude Sonnet 版本',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
];

const DEEPSEEK_CHAT_MODELS: ChatModelDefinition[] = [
  {
    id: 'deepseek:deepseek-chat',
    apiModel: 'deepseek-chat',
    name: 'DeepSeek Chat',
    type: 'chat',
    providerId: 'deepseek',
    description: 'DeepSeek 聊天模型，性价比高',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
];

const OLLAMA_CHAT_MODELS: ChatModelDefinition[] = [
  {
    id: 'ollama:llama2',
    apiModel: 'llama2',
    name: 'Llama 2 (本地)',
    type: 'chat',
    providerId: 'ollama',
    description: '本地 Llama 2 模型，需要本地 Ollama 支持',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
  {
    id: 'ollama:mistral',
    apiModel: 'mistral',
    name: 'Mistral (本地)',
    type: 'chat',
    providerId: 'ollama',
    description: '本地 Mistral 模型，需要本地 Ollama 支持',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
];

const AGNES_CHAT_MODELS: ChatModelDefinition[] = [
  {
    id: 'agnes:agnes-2.0-flash',
    apiModel: 'agnes-2.0-flash',
    name: 'AGNES 2.0 Flash',
    type: 'chat',
    providerId: 'agnes',
    description: 'AGNES 2.0 Flash - 快速多模态 AI 模型，支持工具调用',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_CHAT_PARAMS },
  },
];

const AGNES_IMAGE_MODELS: ImageModelDefinition[] = [
  {
    id: 'agnes:agnes-image-2.1-flash',
    apiModel: 'agnes-image-2.1-flash',
    name: 'Agnes Image 2.1 Flash',
    type: 'image',
    providerId: 'agnes',
    endpoint: '/images/generations',
    description: 'AGNES Image 2.1 Flash - 高速图片生成',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_IMAGE_PARAMS },
  },
];

const AGNES_VIDEO_MODELS: VideoModelDefinition[] = [
  {
    id: 'agnes:agnes-video-v2.0',
    apiModel: 'agnes-video-v2.0',
    name: 'Agnes-Video-V2.0',
    type: 'video',
    providerId: 'agnes',
    endpoint: '/videos',
    description: 'AGNES Video V2.0 - 视频生成模型',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_VIDEO_PARAMS_SORA },
  },
];

// 扩展图片模型
const OPENAI_IMAGE_MODELS: ImageModelDefinition[] = [
  {
    id: 'openai:dall-e-3',
    apiModel: 'dall-e-3',
    name: 'DALL-E 3',
    type: 'image',
    providerId: 'openai',
    endpoint: '/images/generations',
    description: 'OpenAI DALL-E 3 高质量图片生成',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_IMAGE_PARAMS },
  },
];

// 扩展视频模型
const OPENAI_VIDEO_MODELS: VideoModelDefinition[] = [
  {
    id: 'openai:gpt-4o-realtime',
    apiModel: 'gpt-4o-realtime-preview',
    name: 'GPT-4o Realtime',
    type: 'video',
    providerId: 'openai',
    endpoint: '/videos/generations',
    description: 'OpenAI GPT-4o Realtime 视频生成',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_VIDEO_PARAMS_SORA },
  },
];

export const ALL_BUILTIN_MODELS: ModelDefinition[] = [
  ...BUILTIN_CHAT_MODELS,
  ...OPENAI_CHAT_MODELS,
  ...ANTHROPIC_CHAT_MODELS,
  ...DEEPSEEK_CHAT_MODELS,
  ...OLLAMA_CHAT_MODELS,
  ...AGNES_CHAT_MODELS,
  ...BUILTIN_IMAGE_MODELS,
  ...OPENAI_IMAGE_MODELS,
  ...AGNES_IMAGE_MODELS,
  ...BUILTIN_VIDEO_MODELS,
  ...OPENAI_VIDEO_MODELS,
  ...AGNES_VIDEO_MODELS,
];

export const DEFAULT_ACTIVE_MODELS: ActiveModels = {
  chat: 'gpt-5.1',
  image: 'gemini-3-pro-image-preview',
  video: 'sora-2',
};
