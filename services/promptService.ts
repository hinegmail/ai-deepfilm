// Author: forsearch | Updated: 2026-07-09
import { Character, Scene, Shot } from "../types";
import { 
  checkApiKey, 
  getApiBase, 
  getActiveChatModelName 
} from "./apiBaseService";

export const generateVisualPrompts = async (type: 'character' | 'scene', data: Character | Scene, genre: string, model: string = 'gpt-5.1', visualStyle: string = 'live-action', language: string = '中文'): Promise<{ visualPrompt: string; negativePrompt: string }> => {
   const stylePrompt = VISUAL_STYLE_PROMPTS[visualStyle] || visualStyle;
   const negativePrompt = NEGATIVE_PROMPTS[visualStyle] || NEGATIVE_PROMPTS['live-action'];
   
   let prompt: string;
   
   if (type === 'character') {
     const char = data as Character;
     prompt = `You are an expert AI prompt engineer for ${visualStyle} style image generation.

Create a detailed visual prompt for a character with the following structure:

Character Data:
- Name: ${char.name}
- Gender: ${char.gender}
- Age: ${char.age}
- Personality: ${char.personality}

REQUIRED STRUCTURE (output in ${language}):
1. Core Identity: [ethnicity, age, gender, body type]
2. Facial Features: [specific distinguishing features - eyes, nose, face shape, skin tone]
3. Hairstyle: [detailed hair description - color, length, style]
4. Clothing: [detailed outfit appropriate for ${genre} genre]
5. Pose & Expression: [body language and facial expression matching personality]
6. Technical Quality: ${stylePrompt}

CRITICAL RULES:
- Sections 1-3 are FIXED features for consistency across all variations
- Use specific, concrete visual details
- Output as single paragraph, comma-separated
- MUST include style keywords: ${visualStyle}
- Length: 60-90 words
- Focus on visual details that can be rendered in images

Output ONLY the visual prompt text, no explanations.`;
   } else {
     const scene = data as Scene;
     prompt = `You are an expert cinematographer and AI prompt engineer for ${visualStyle} productions.

Create a cinematic scene prompt with this structure:

Scene Data:
- Location: ${scene.location}
- Time: ${scene.time}
- Atmosphere: ${scene.atmosphere}
- Genre: ${genre}

REQUIRED STRUCTURE (output in ${language}):
1. Environment: [detailed location description with architectural/natural elements]
2. Lighting: [specific lighting setup - direction, color temperature, quality (soft/hard), key light source]
3. Composition: [camera angle (eye-level/low/high), framing rules (rule of thirds/symmetry), depth layers]
4. Atmosphere: [mood, weather, particles in air (fog/dust/rain), environmental effects]
5. Color Palette: [dominant colors, color temperature (warm/cool), saturation level]
6. Technical Quality: ${stylePrompt}

CRITICAL RULES:
- Use professional cinematography terminology
- Specify light sources and direction (e.g., "golden hour backlight from right")
- Include composition guidelines (rule of thirds, leading lines, depth of field)
- Output as single paragraph, comma-separated
- MUST emphasize ${visualStyle} style throughout
- Length: 70-110 words
- Focus on elements that establish mood and cinematic quality

Output ONLY the visual prompt text, no explanations.`;
   }

   const visualPrompt = await retryOperation(() => chatCompletion(prompt, model, 0.7, 1024));
   
   return {
     visualPrompt: visualPrompt.trim(),
     negativePrompt: negativePrompt
   };
};

/**
 * 生成图像（Agent 4 & 6）
 * 使用antsk图像生成API (gemini-3-pro-image-preview)
 * 支持参考图像，确保角色和场景的一致性
 * @param prompt - 图像生成提示词
 * @param referenceImages - 参考图像数组（base64格式），第一张为场景参考，后续为角色参考
 * @param aspectRatio - 横竖屏比例，支持 '16:9'（横屏，默认）、'9:16'（竖屏）。注意：Gemini 3 Pro Image 不支持方形(1:1)
 * @param isVariation - 是否为角色变体生成模式（服装变体），变体模式下保持面部一致但改变服装
 * @returns 返回生成的图像base64字符串
 * @throws 如果图像生成失败则抛出错误
 */
export const optimizeBothKeyframes = async (
  actionSummary: string,
  cameraMovement: string,
  sceneInfo: { location: string; time: string; atmosphere: string },
  characterInfo: string[],
  visualStyle: string,
  model: string = 'gpt-5.1'
): Promise<{ startPrompt: string; endPrompt: string }> => {
  console.log('🎨 optimizeBothKeyframes 调用 - 同时优化起始帧和结束帧 - 使用模型:', model);
  const startTime = Date.now();

  const stylePrompts: { [key: string]: string } = {
    'live-action': '真人实拍电影风格，photorealistic，8K高清，专业摄影',
    'anime': '日本动漫风格，cel-shaded，鲜艳色彩，Studio Ghibli品质',
    '3d-animation': '3D CGI动画，Pixar/DreamWorks风格，精细材质',
    'cyberpunk': '赛博朋克美学，霓虹灯光，未来科技感',
    'oil-painting': '油画风格，可见笔触，古典艺术构图'
  };

  const styleDesc = stylePrompts[visualStyle] || visualStyle;

  const prompt = `
你是一位专业的电影视觉导演和概念艺术家。请为以下镜头同时创作起始帧和结束帧的详细视觉描述。

## 场景信息
**地点：** ${sceneInfo.location}
**时间：** ${sceneInfo.time}
**氛围：** ${sceneInfo.atmosphere}

## 叙事动作
${actionSummary}

## 镜头运动
${cameraMovement}

## 角色信息
${characterInfo.length > 0 ? characterInfo.join('、') : '无特定角色'}

## 视觉风格
${styleDesc}

## 任务要求

你需要为这个8-10秒的镜头创作**起始帧**和**结束帧**两个关键画面的视觉描述。

### 起始帧要求：
• 建立清晰的初始场景和人物状态
• 为即将发生的动作预留视觉空间和动势
• 设定光影和色调基调
• 展现角色的起始表情、姿态和位置
• 根据镜头运动（${cameraMovement}）设置合适的初始构图
• 营造场景氛围，让观众明确故事的起点

### 结束帧要求：
• 展现动作完成后的最终状态和结果
• 体现镜头运动（${cameraMovement}）带来的视角和构图变化
• 展现角色的情绪变化、最终姿态和位置
• 可以有戏剧性的光影和色彩变化
• 达到视觉高潮或情绪释放点
• 为下一个镜头的衔接做准备

### 两帧协调性：
⚠️ **关键**：起始帧和结束帧必须在视觉上连贯协调
- 保持一致的视觉风格和色调基础
- 镜头运动轨迹要清晰可推导
- 人物/物体的空间位置变化要合理
- 光影变化要有逻辑性
- 两帧描述应该能够自然串联成一个流畅的视觉叙事

### 每帧必须包含的视觉元素：

**1. 构图与景别**
- 根据镜头运动确定画面框架和视角
- 主体在画面中的位置和大小
- 前景、中景、背景的层次关系

**2. 光影与色彩**
- 光源的方向、强度和色温
- 主光、辅光、轮廓光的配置
- 整体色调和色彩情绪（暖色/冷色）
- 阴影的长度和密度

**3. 角色细节**（如有）
- 面部表情和眼神方向
- 肢体姿态和重心分布
- 服装状态和细节
- 与环境的互动关系

**4. 环境细节**
- 场景的具体视觉元素
- 环境氛围（雾气、光束、粒子等）
- 背景的清晰度和景深效果
- 环境对叙事的支持

**5. 运动暗示**
- 动态模糊或静止清晰
- 运动方向的视觉引导
- 张力和动势的体现

**6. 电影感细节**
- 画面质感和材质
- 大气透视效果
- 电影级的视觉特征

## 输出格式

请按以下JSON格式输出（注意：描述文本用中文，每个约100-150字）：

\`\`\`json
{
  "startFrame": "起始帧的详细视觉描述...",
  "endFrame": "结束帧的详细视觉描述..."
}
\`\`\`

❌ 避免：
- 不要在描述中包含"Visual Style:"等标签
- 不要分段或使用项目符号
- 不要过于技术化的术语
- 不要描述整个动作过程，只描述画面本身

✅ 追求：
- 流畅的单段描述
- 富有画面感的语言
- 两帧描述相互呼应、逻辑连贯
- 与叙事动作和镜头运动协调一致
- 具体、可视觉化的细节

请开始创作：
`;

  try {
    const result = await retryOperation(() => chatCompletion(prompt, model, 0.7, 2048, 'json_object'));
    const duration = Date.now() - startTime;
    
    // 解析JSON响应
    const cleaned = cleanJsonString(result);
    const parsed = JSON.parse(cleaned);
    
    if (!parsed.startFrame || !parsed.endFrame) {
      throw new Error('AI返回的JSON格式不正确');
    }
    
    console.log('✅ AI同时优化起始帧和结束帧成功，耗时:', duration, 'ms');
    
    return {
      startPrompt: parsed.startFrame.trim(),
      endPrompt: parsed.endFrame.trim()
    };
  } catch (error: any) {
    console.error('❌ AI关键帧优化失败:', error);
    throw new Error(`AI关键帧优化失败: ${error.message}`);
  }
};

/**
 * AI优化单个关键帧视觉描述（兼容旧版，建议使用 optimizeBothKeyframes）
 * 根据场景信息和叙事动作，生成详细的起始帧或结束帧视觉描述
 * @param frameType - 帧类型 'start' 或 'end'
 * @param actionSummary - 叙事动作描述
 * @param cameraMovement - 镜头运动
 * @param sceneInfo - 场景信息（地点、时间、氛围）
 * @param characterInfo - 角色信息（可选）
 * @param visualStyle - 视觉风格
 * @param model - 使用的模型，默认'gpt-5.1'
 * @returns 返回AI优化后的关键帧视觉描述
 */
export const optimizeKeyframePrompt = async (
  frameType: 'start' | 'end',
  actionSummary: string,
  cameraMovement: string,
  sceneInfo: { location: string; time: string; atmosphere: string },
  characterInfo: string[],
  visualStyle: string,
  model: string = 'gpt-5.1'
): Promise<string> => {
  console.log(`🎨 optimizeKeyframePrompt 调用 - ${frameType === 'start' ? '起始帧' : '结束帧'} - 使用模型:`, model);
  const startTime = Date.now();

  const frameLabel = frameType === 'start' ? '起始帧' : '结束帧';
  const frameFocus = frameType === 'start' 
    ? '初始状态、起始姿态、预备动作、场景建立'
    : '最终状态、结束姿态、动作完成、情绪高潮';

  const stylePrompts: { [key: string]: string } = {
    'live-action': '真人实拍电影风格，photorealistic，8K高清，专业摄影',
    'anime': '日本动漫风格，cel-shaded，鲜艳色彩，Studio Ghibli品质',
    '3d-animation': '3D CGI动画，Pixar/DreamWorks风格，精细材质',
    'cyberpunk': '赛博朋克美学，霓虹灯光，未来科技感',
    'oil-painting': '油画风格，可见笔触，古典艺术构图'
  };

  const styleDesc = stylePrompts[visualStyle] || visualStyle;

  const prompt = `
你是一位专业的电影视觉导演和概念艺术家。请为以下镜头的${frameLabel}创作详细的视觉描述。

## 场景信息
**地点：** ${sceneInfo.location}
**时间：** ${sceneInfo.time}
**氛围：** ${sceneInfo.atmosphere}

## 叙事动作
${actionSummary}

## 镜头运动
${cameraMovement}

## 角色信息
${characterInfo.length > 0 ? characterInfo.join('、') : '无特定角色'}

## 视觉风格
${styleDesc}

## 任务要求

作为${frameLabel}，你需要重点描述：**${frameFocus}**

### ${frameType === 'start' ? '起始帧' : '结束帧'}特殊要求：
${frameType === 'start' ? `
• 建立清晰的初始场景和人物状态
• 为即将发生的动作预留视觉空间和动势
• 设定光影和色调基调
• 展现角色的起始表情、姿态和位置
• 根据镜头运动（${cameraMovement}）设置合适的初始构图
• 营造场景氛围，让观众明确故事的起点
` : `
• 展现动作完成后的最终状态和结果
• 体现镜头运动（${cameraMovement}）带来的视角和构图变化
• 展现角色的情绪变化、最终姿态和位置
• 可以有戏剧性的光影和色彩变化
• 达到视觉高潮或情绪释放点
• 为下一个镜头的衔接做准备
`}

### 必须包含的视觉元素：

**1. 构图与景别**
- 根据镜头运动确定画面框架和视角
- 主体在画面中的位置和大小
- 前景、中景、背景的层次关系

**2. 光影与色彩**
- 光源的方向、强度和色温
- 主光、辅光、轮廓光的配置
- 整体色调和色彩情绪（暖色/冷色）
- 阴影的长度和密度

**3. 角色细节**（如有）
- 面部表情和眼神方向
- 肢体姿态和重心分布
- 服装状态和细节
- 与环境的互动关系

**4. 环境细节**
- 场景的具体视觉元素
- 环境氛围（雾气、光束、粒子等）
- 背景的清晰度和景深效果
- 环境对叙事的支持

**5. 运动暗示**
- 动态模糊或静止清晰
- 运动方向的视觉引导
- 张力和动势的体现

**6. 电影感细节**
- 画面质感和材质
- 大气透视效果
- 电影级的视觉特征

## 输出格式

请直接输出简洁但详细的视觉描述，约100-150字，用中文。

❌ 避免：
- 不要包含"Visual Style:"等标签
- 不要分段或使用项目符号
- 不要过于技术化的术语
- 不要描述整个动作过程，只描述这一帧的画面

✅ 追求：
- 流畅的单段描述
- 富有画面感的语言
- 突出${frameLabel}的特点
- 与叙事动作和镜头运动协调一致
- 具体、可视觉化的细节

请开始创作这一帧的视觉描述：
`;

  try {
    const result = await retryOperation(() => chatCompletion(prompt, model, 0.7, 1024));
    const duration = Date.now() - startTime;
    
    console.log(`✅ AI ${frameLabel}优化成功，耗时:`, duration, 'ms');
    
    return result.trim();
  } catch (error: any) {
    console.error(`❌ AI ${frameLabel}优化失败:`, error);
    throw new Error(`AI ${frameLabel}优化失败: ${error.message}`);
  }
};

/**
 * AI生成叙事动作建议
 * 根据首帧和尾帧信息，结合高质量动作提示词参考，生成适合场景的动作
 * @param startFramePrompt - 首帧提示词
 * @param endFramePrompt - 尾帧提示词
 * @param cameraMovement - 镜头运动
 * @param model - 使用的模型，默认'gpt-5.1'
 * @returns 返回AI生成的动作建议
 */
export const rewritePromptForModeration = async (
  videoPrompt: string,
  model?: string
): Promise<string> => {
  const chatModel = model || getActiveChatModel()?.apiModel || getActiveChatModel()?.id || 'gpt-4o';
  const prompt = `
你是一位专业的影视剧本审稿与合规顾问。下面是一段用于 AI 视频生成的镜头描述，因涉及暴力、血腥或敏感表述被平台内容审核拦截。

请在不改变场景氛围、剧情走向和镜头意图的前提下，对描述进行「温和化」改写：
- 将直接描写暴力、血腥、尸骨、残肢等改为含蓄或氛围化表述（如：古战场遗迹、荒凉、肃杀、风沙中的残破兵甲等）
- 保留：时间、地点、角色动作、镜头运动、光影与情绪
- 输出语言与原文一致（中文则中文）
- 只输出改写后的完整提示词正文，不要加「改写如下」等前缀或任何解释

## 原始提示词
${videoPrompt}

## 改写后的提示词（仅正文）
`;
  const result = await retryOperation(() => chatCompletion(prompt, chatModel, 0.5, 4096));
  return result.trim();
};

/**
 * AI镜头拆分功能 - 将单个镜头拆分为多个细致的子镜头
 * 根据动作描述，按照景别（全景、中景、特写）和视角拆分镜头
 * @param shot - 原始镜头对象
 * @param sceneInfo - 场景信息（地点、时间、氛围）
 * @param characterNames - 角色名称数组
 * @param visualStyle - 视觉风格
 * @param model - 使用的模型，默认'gpt-5.1'
 * @returns 返回包含子镜头数组的对象
 */
export const enhanceKeyframePrompt = async (
  basePrompt: string,
  visualStyle: string,
  cameraMovement: string,
  frameType: 'start' | 'end',
  model: string = 'gpt-5.1'
): Promise<string> => {
  console.log(`🎨 enhanceKeyframePrompt 调用 - ${frameType === 'start' ? '起始帧' : '结束帧'} - 使用模型:`, model);
  const startTime = Date.now();

  const stylePrompts: { [key: string]: string } = {
    'live-action': '真人实拍电影风格，photorealistic，8K Ultra HD',
    'anime': '日本动漫风格，cel-shaded，高饱和度色彩',
    '3d-animation': '3D CGI动画，Pixar级别渲染质量',
    'cyberpunk': '赛博朋克美学，霓虹灯光，未来科技',
    'oil-painting': '油画艺术风格，可见笔触，古典构图'
  };

  const styleDesc = stylePrompts[visualStyle] || visualStyle;
  const frameLabel = frameType === 'start' ? '起始帧' : '结束帧';

  const prompt = `
你是一位资深的电影摄影指导和视觉特效专家。请基于以下基础提示词,生成一个包含详细技术规格和视觉细节的专业级${frameLabel}描述。

## 基础提示词
${basePrompt}

## 视觉风格
${styleDesc}

## 镜头运动
${cameraMovement}

## ${frameLabel}要求
${frameType === 'start' ? '建立清晰的初始状态、起始姿态、为后续运动预留空间' : '展现最终状态、动作完成、情绪高潮'}

## 任务
请在基础提示词的基础上,添加以下专业的电影级视觉规格描述:

### 1. 技术规格 (Technical Specifications)
- 分辨率规格 (8K等)
- 镜头语言和摄影美学
- 景深控制和焦点策略

### 2. 视觉细节 (Visual Details)  
- 光影层次: 三点布光、阴影与高光的配置
- 色彩饱和度: 色彩分级、色温控制
- 材质质感: 表面纹理、细节丰富度
- 大气效果: 体积光、雾气、粒子、天气效果

### 3. 角色要求 (Character Details) - 如果有角色
⚠️ 最高优先级: 如果提供了角色参考图,必须严格保持人物外观的完全一致性!
- 角色识别: 严格按照参考图中人物的面部特征、发型发色、服装造型
- 面部特征: 五官轮廓、眼睛颜色形状、鼻子嘴巴结构必须与参考图一致
- 发型发色: 头发长度、颜色、质感、发型样式必须完全匹配参考图
- 服装造型: 服装款式、颜色、材质必须与参考图保持一致
- 面部表情: 在保持外观一致的基础上,添加微表情、情绪真实度、眼神方向
- 肢体语言: 在保持体型一致的基础上,展现自然的身体姿态、重心分布、肌肉张力
- 服装细节: 服装的运动感、物理真实性、纹理细节
- 毛发细节: 头发丝、自然的毛发运动

### 4. 环境要求 (Environment Details)
- 背景层次: 前景、中景、背景的深度分离
- 空间透视: 准确的线性透视、大气透视
- 环境光影: 光源的真实性、阴影投射
- 细节丰富度: 环境叙事元素、纹理变化

### 5. 氛围营造 (Mood & Atmosphere)
- 情绪基调与场景情感的匹配
- 色彩心理学的运用
- 视觉节奏的平衡
- 叙事的视觉暗示

### 6. 质量保证 (Quality Assurance)
- 主体清晰度和轮廓
- 背景过渡的自然性
- 光影一致性
- 色彩协调性
- 构图平衡(三分法或黄金比例)
- 动作连贯性

## 输出格式
请使用清晰的分节格式输出,包含上述所有要素。使用中文输出,保持专业性和可读性。

格式示例:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【技术规格】Technical Specifications
• 分辨率: ...

【视觉细节】Visual Details  
• 光影层次: ...
• 色彩饱和度: ...

(依次类推)

请开始创作:
`;

  try {
    const result = await retryOperation(() => chatCompletion(prompt, model, 0.7, 3072));
    const duration = Date.now() - startTime;
    
    console.log(`✅ AI ${frameLabel}增强成功，耗时:`, duration, 'ms');
    
    // 将基础提示词和增强内容组合
    return `${basePrompt}

${result.trim()}`;
  } catch (error: any) {
    console.error(`❌ AI ${frameLabel}增强失败:`, error);
    // 如果AI增强失败,返回基础提示词
    console.warn('⚠️ 回退到基础提示词');
    return basePrompt;
  }
};
