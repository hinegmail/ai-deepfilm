// Author: forsearch | Updated: 2026-07-09

// 1. 核心网络与配置服务
export { 
  ApiKeyError, 
  setGlobalApiKey, 
  verifyApiKey 
} from './apiBaseService';

// 2. 剧本创作与故事处理服务
export { 
  parseScriptToData, 
  generateShotList, 
  continueScript, 
  continueScriptStream, 
  rewriteScript, 
  rewriteScriptStream, 
  generateActionSuggestion, 
  splitShotIntoSubShots 
} from './scriptService';

// 3. 视觉风格与提示词增强服务
export { 
  generateVisualPrompts, 
  optimizeBothKeyframes, 
  optimizeKeyframePrompt, 
  rewritePromptForModeration, 
  enhanceKeyframePrompt 
} from './promptService';

// 4. 多媒体生成服务（图片与视频）
export { generateImage } from './imageService';
export { generateVideo } from './videoService';
