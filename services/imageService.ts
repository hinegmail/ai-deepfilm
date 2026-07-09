// Author: forsearch | Updated: 2026-07-09
import { Character, Scene } from "../types";
import { 
  checkApiKey, 
  getApiBase, 
  resolveGcsUrl 
} from "./apiBaseService";

export const generateImage = async (
  prompt: string, 
  referenceImages: string[] = [],
  aspectRatio: AspectRatio = '16:9',
  isVariation: boolean = false
): Promise<string> => {
  const startTime = Date.now();
  
  // 从 modelRegistry 获取当前激活的图片模型
  const activeImageModel = getActiveModel('image');
  const imageModelId = activeImageModel?.apiModel || activeImageModel?.id || 'gemini-3-pro-image-preview';
  const apiKey = checkApiKey('image', activeImageModel?.id);
  const apiBase = getApiBase('image', activeImageModel?.id);
  // 使用模型定义中的端点，如果没有则使用默认的图片生成端点
  const requestEndpoint = activeImageModel?.endpoint || '/images/generations';

  try {
    // If we have reference images, instruct the model to use them for consistency
    let finalPrompt = prompt;
    if (referenceImages.length > 0) {
      if (isVariation) {
        // 变体模式：保持面部一致，但改变服装/造型
        finalPrompt = `
      ⚠️⚠️⚠️ CRITICAL REQUIREMENTS - CHARACTER OUTFIT VARIATION ⚠️⚠️⚠️
      
      Reference Images Information:
      - The provided image shows the CHARACTER's BASE APPEARANCE that you MUST use as reference for FACE ONLY.
      
      Task:
      Generate a character image with a NEW OUTFIT/COSTUME based on this description: "${prompt}".
      
      ⚠️ ABSOLUTE REQUIREMENTS (NON-NEGOTIABLE):
      
      1. FACE & IDENTITY - MUST BE 100% IDENTICAL TO REFERENCE:
         • Facial Features: Eyes (color, shape, size), nose structure, mouth shape, facial contours must be EXACTLY the same
         • Hairstyle & Hair Color: Length, color, texture, and style must be PERFECTLY matched (unless prompt specifies hair change)
         • Skin tone and facial structure: MUST remain identical
         • Expression can vary based on prompt
         
      2. OUTFIT/CLOTHING - MUST BE COMPLETELY DIFFERENT FROM REFERENCE:
         • Generate NEW clothing/outfit as described in the prompt
         • DO NOT copy the clothing from the reference image
         • The outfit should match the description provided: "${prompt}"
         • Include all accessories, props, or costume details mentioned in the prompt
         
      3. Body proportions should remain consistent with the reference.
      
      ⚠️ This is an OUTFIT VARIATION task - The face MUST match the reference, but the CLOTHES MUST be NEW as described!
      ⚠️ If the new outfit is not clearly visible and different from the reference, the task has FAILED!
    `;
      } else {
        // 普通模式：完全一致性（分镜生成等场景）
        finalPrompt = `
      ⚠️⚠️⚠️ CRITICAL REQUIREMENTS - CHARACTER CONSISTENCY ⚠️⚠️⚠️
      
      Reference Images Information:
      - The FIRST image is the Scene/Environment reference.
      - Any subsequent images are Character references (Base Look or Variation).
      
      Task:
      Generate a cinematic shot matching this prompt: "${prompt}".
      
      ⚠️ ABSOLUTE REQUIREMENTS (NON-NEGOTIABLE):
      1. Scene Consistency:
         - STRICTLY maintain the visual style, lighting, and environment from the scene reference.
      
      2. Character Consistency - HIGHEST PRIORITY:
         If characters are present in the prompt, they MUST be IDENTICAL to the character reference images:
         • Facial Features: Eyes (color, shape, size), nose structure, mouth shape, facial contours must be EXACTLY the same
         • Hairstyle & Hair Color: Length, color, texture, and style must be PERFECTLY matched
         • Clothing & Outfit: Style, color, material, and accessories must be IDENTICAL
         • Body Type: Height, build, proportions must remain consistent
         
      ⚠️ DO NOT create variations or interpretations of the character - STRICT REPLICATION ONLY!
      ⚠️ Character appearance consistency is THE MOST IMPORTANT requirement!
    `;
      }
    }

  // 构建请求体 - 使用 AGNES API 格式，而不是 OpenAI 聊天格式
  const sizeMap: Record<AspectRatio, string> = {
    '16:9': '1024x576',
    '9:16': '576x1024',
    '1:1': '512x512'
  };
  const size = sizeMap[aspectRatio] || '1024x576';

  // 构建请求体
  const requestBody: any = {
    model: imageModelId,
    prompt: finalPrompt,
    size: size,
    response_format: 'b64_json', // 增加标准的 OpenAI 兼容参数以获取 Base64
  };

  // 如果有参考图像，添加到请求体
  if (referenceImages.length > 0) {
    requestBody.image = referenceImages;
    // 图生图需要将输出格式放在 extra_body 中
    requestBody.extra_body = {
      response_format: 'b64_json'
    };
  } else {
    // 文生图：兼容某些非标准 API 直接返回 Base64 的参数
    requestBody.return_base64 = true;
  }

  const response = await retryOperation(async () => {
    // 图片生成需要较长的超时（根据AGNES文档：60-360秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 360000); // 6分钟超时

    try {
      const res = await fetch(`${apiBase}${requestEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': '*/*'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // 特殊处理400、403、500状态码
        if (res.status === 400) {
          throw new Error('内容安全拦截：该提示词可能包含不安全或违规内容。请点击本镜头的「编辑」修改关键帧提示词，避免暴力、血腥、敏感描述后重试。');
        }
        else if (res.status === 403) {
          throw new Error('请求被拒绝 (403 Forbidden)：可能是 API 限流或 IP 被临时拦截。请稍后重试，或检查 API Key 是否有效。');
        }
        else if (res.status === 500) {
          throw new Error('当前请求较多，暂时未能处理成功，请稍后重试。');
        }
        
        let errorMessage = `HTTP错误: ${res.status}`;
        try {
          const errorText = await res.text();
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error?.message || errorMessage;
          } catch {
            if (errorText) errorMessage = errorText;
          }
        } catch (_) {
          // body 已读或解析失败，用默认 errorMessage
        }
        throw new Error(errorMessage);
      }

      return await res.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('图片生成超时（6分钟）：请求过程中超时。请稍后重试或尝试更简单的提示词。');
      }
      throw error;
    }
  });

  // AGNES API 返回格式：{ data: [ { b64_json: "..." } 或 { url: "..." } ], created: ... }
  if (!response || !response.data || !Array.isArray(response.data) || response.data.length === 0) {
    throw new Error('图片生成失败：API 返回了空响应');
  }

  const imageData = response.data[0];
  let imageUrl: string | null = null;

  // 优先使用 Base64（如果有）
  if (imageData.b64_json) {
    imageUrl = `data:image/png;base64,${imageData.b64_json}`;
  } 
  // 其次使用 URL
  else if (imageData.url) {
    imageUrl = imageData.url;
    
    // 如果返回了公网 URL，为了防止 GCS 域名污染导致前端加载失败，
    // 我们尝试在前端通过代理下载该图片并转换为 Base64 格式
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        console.log('📷 图片接口返回了公网 URL，正在尝试通过代理下载并转换为 Base64...');
        const resolvedUrl = resolveGcsUrl(imageUrl);
        const imgResponse = await fetch(resolvedUrl);
        if (imgResponse.ok) {
          const blob = await imgResponse.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          imageUrl = base64;
          console.log('✅ 成功将图片 URL 转换为 Base64');
        } else {
          console.warn(`⚠️ 代理下载图片失败: HTTP ${imgResponse.status}`);
        }
      } catch (e) {
        console.warn('⚠️ 下载转换为 Base64 失败，将保留原始 URL 作为降级方案:', e);
      }
    }
  }

  if (!imageUrl) {
    throw new Error('图片生成失败：未能从响应中提取图片数据');
  }

  addRenderLogWithTokens({
    type: 'keyframe',
    resourceId: 'image-' + Date.now(),
    resourceName: prompt.substring(0, 50) + '...',
    status: 'success',
    model: imageModelId,
    prompt: prompt,
    duration: Date.now() - startTime
  });
  return imageUrl;
  } catch (error: any) {
    // Log failed generation
    addRenderLogWithTokens({
      type: 'keyframe',
      resourceId: 'image-' + Date.now(),
      resourceName: prompt.substring(0, 50) + '...',
      status: 'failed',
      model: imageModelId,
      prompt: prompt,
      error: error.message,
      duration: Date.now() - startTime
    });
    
    throw error;
  }
};

/**
 * 将视频URL转换为base64格式
 * @param url - 视频文件的URL
 * @returns 返回base64编码的视频数据
 * @throws 如果下载或转换失败则抛出错误
 */
const convertVideoUrlToBase64 = async (url: string): Promise<string> => {
  try {
    // 下载视频文件 (通过代理转换以避开域名污染)
    const resolvedUrl = resolveGcsUrl(url);
    const response = await fetch(resolvedUrl);
    if (!response.ok) {
      throw new Error(`下载视频失败: HTTP ${response.status}`);
    }
    
    // 获取视频blob
    const blob = await response.blob();
    
    // 转换为base64
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = () => {
        reject(new Error('转换视频为base64失败'));
      };
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    console.error('视频URL转base64失败:', error);
    throw new Error(`视频转换失败: ${error.message}`);
  }
};

/**
 * 调整图片尺寸到指定宽高
 * @param base64Data - 原始图片base64数据（不含前缀）
 * @param targetWidth - 目标宽度
 * @param targetHeight - 目标高度
 * @returns 调整后的图片base64数据（不含前缀）
 */
const resizeImageToSize = async (base64Data: string, targetWidth: number, targetHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建canvas上下文'));
        return;
      }
      // 使用 cover 模式填充，保持比例并居中裁剪
      const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const offsetX = (targetWidth - scaledWidth) / 2;
      const offsetY = (targetHeight - scaledHeight) / 2;
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      // 返回不含前缀的base64
      const result = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
      resolve(result);
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = `data:image/png;base64,${base64Data}`;
  });
};

/**
 * 异步模式视频生成（支持 AGNES Video、OpenAI Realtime 等异步 API）
 * 流程：1. 创建任务 -> 2. 轮询状态 -> 3. 下载视频
 * @param prompt - 视频生成提示词
 * @param startImageBase64 - 起始关键帧图像(支持 URL 或 base64格式，可选)
 * @param apiKey - API密钥
 * @param aspectRatio - 横竖屏比例，支持 '16:9'（横屏）、'9:16'（竖屏）、'1:1'（方形）
 * @param duration - 视频时长（秒）
 * @returns 返回视频的base64编码
 */
const generateVideoAsync = async (
  prompt: string, 
  startImageBase64: string | undefined, 
  endImageBase64: string | undefined,
  apiKey: string,
  aspectRatio: AspectRatio = '16:9',
  duration: VideoDuration = 8,
  modelName: string = 'agnes-video-v2.0'
): Promise<string> => {
  console.log(`🎬 使用异步模式生成视频 (${modelName}, ${aspectRatio}, ${duration}秒)...`);
  
  // 根据时长计算帧数（num_frames 必须满足 8n + 1）
  let numFrames = 121; // 默认约5秒 (121/24 ≈ 5秒)
  if (duration === 12) {
    numFrames = 441; // 最长约18秒 (441/24 ≈ 18秒)
  } else if (duration === 4) {
    numFrames = 81; // 约3秒 (81/24 ≈ 3秒)
  }
  
  const frameRate = 24; // 固定 24 FPS
  const actualDuration = numFrames / frameRate;
  
  console.log(`📐 帧数配置: ${numFrames} 帧 @ ${frameRate} FPS = ${actualDuration.toFixed(1)} 秒`);
  
  // 获取视频尺寸
  const videoSize = getSoraVideoSize(aspectRatio);
  const [VIDEO_WIDTH, VIDEO_HEIGHT] = videoSize.split('x').map(Number);
  console.log(`📐 视频尺寸: ${VIDEO_WIDTH}x${VIDEO_HEIGHT}`);
  
  // 获取 API 基础 URL
  const apiBase = getApiBase('video', modelName);
  
  // 处理关键帧
  const keyframes: string[] = [];
  
  if (startImageBase64) {
    if (startImageBase64.startsWith('http://') || startImageBase64.startsWith('https://')) {
      // URL 格式，直接使用
      console.log(`📷 起始帧使用 URL: ${startImageBase64.substring(0, 80)}...`);
      keyframes.push(startImageBase64);
    } else if (startImageBase64.startsWith('data:')) {
      // data URI 格式
      console.log('📷 起始帧使用 Data URI');
      keyframes.push(startImageBase64);
    }
  }
  
  if (endImageBase64) {
    if (endImageBase64.startsWith('http://') || endImageBase64.startsWith('https://')) {
      // URL 格式，直接使用
      console.log(`📷 结束帧使用 URL: ${endImageBase64.substring(0, 80)}...`);
      keyframes.push(endImageBase64);
    } else if (endImageBase64.startsWith('data:')) {
      // data URI 格式
      console.log('📷 结束帧使用 Data URI');
      keyframes.push(endImageBase64);
    }
  }
  
  // 构建请求体 - 根据模式类型决定包含的字段
  let requestBody: Record<string, any> = {
    model: modelName,
    prompt: prompt,
    num_frames: numFrames,
    frame_rate: frameRate
  };
  
  // 根据关键帧情况调整请求体
  if (keyframes.length === 2) {
    // 关键帧动画模式：在两个关键帧之间生成平滑过渡
    // 注意：关键帧模式下 width/height 由图像决定，不应该包含在请求体中
    console.log('🎬 使用关键帧动画模式');
    requestBody = {
      model: modelName,
      prompt: prompt,
      num_frames: numFrames,
      frame_rate: frameRate,
      extra_body: {
        image: keyframes,
        mode: 'keyframes'
      }
    };
  } else if (keyframes.length === 1) {
    // 单图生成模式：从单个图像生成视频
    console.log('🎬 使用图生视频模式');
    requestBody = {
      model: modelName,
      prompt: prompt,
      num_frames: numFrames,
      frame_rate: frameRate,
      image: keyframes[0],
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT
    };
  } else {
    // 文生视频模式：纯文本生成视频
    console.log('🎬 使用文生视频模式');
    requestBody = {
      model: modelName,
      prompt: prompt,
      num_frames: numFrames,
      frame_rate: frameRate,
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT
    };
  }
  
  console.log('📋 开始创建异步视频任务...');
  console.log('📍 API Base URL:', apiBase);
  
  // Step 1: 创建视频任务
  // URL 构建逻辑：
  // - 本地开发：apiBase = /api-proxy → /api-proxy/videos (Vite 代理会添加 /v1)
  // - 生产环境：apiBase = https://apihub.agnes-ai.com/v1 → https://apihub.agnes-ai.com/v1/videos
  const videoApiUrl = apiBase.endsWith('/v1')
    ? `${apiBase}/videos`  // 已包含 /v1
    : apiBase === '/api-proxy'
    ? `${apiBase}/videos`  // 本地代理（代理会添加 /v1）
    : `${apiBase}/v1/videos`;  // 其他情况
  
  console.log('🔗 Video API URL:', videoApiUrl);
  console.log('📝 Request Body:', JSON.stringify(requestBody, null, 2));
  
  const createResponse = await fetch(videoApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });
  
  console.log('📊 Response Status:', createResponse.status, createResponse.statusText);
  
  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throwFromVideoHttpError(createResponse.status, errorText, 'sora');
  }
  
  const createData = await createResponse.json();
  // 响应格式可能是 { id: "task_xxx" } 或 { task_id: "xxx" }
  const taskId = createData.id || createData.task_id;
  if (!taskId) {
    throw new Error('创建视频任务失败：未返回任务ID');
  }
  
  console.log('📋 异步视频任务已创建，任务ID:', taskId);
  
  // Step 2: 轮询查询任务状态
  const maxPollingTime = 1800000; // 30分钟超时（留给服务器更多时间）
  const pollingInterval = 10000; // 每10秒查询一次（减少请求频率）
  const startTime = Date.now();
  
  let videoUrl: string | null = null;
  let completedStatus: Record<string, unknown> | null = null;
  let lastLoggedStatus: string | null = null;
  let statusUnchangedCount = 0;

  while (Date.now() - startTime < maxPollingTime) {
    await new Promise(resolve => setTimeout(resolve, pollingInterval));
    
    const statusUrl = apiBase.endsWith('/v1')
      ? `${apiBase}/videos/${taskId}`  // 已包含 /v1
      : apiBase === '/api-proxy'
      ? `${apiBase}/videos/${taskId}`  // 本地代理
      : `${apiBase}/v1/videos/${taskId}`;  // 其他情况
    
    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!statusResponse.ok) {
      console.warn('⚠️ 查询任务状态失败，继续重试...');
      continue;
    }
    
    const statusData = await statusResponse.json();
    const status = statusData.status;
    const progress = statusData.progress || 0;
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    
    // 仅在状态改变时打印日志
    if (status !== lastLoggedStatus) {
      console.log(`🔄 任务状态: ${status} (进度: ${progress}%, 已耗时: ${elapsedSeconds}s)`);
      lastLoggedStatus = status;
      statusUnchangedCount = 0;
    } else {
      statusUnchangedCount++;
      if (statusUnchangedCount % 6 === 0) {  // 每 60 秒打印一次心跳
        console.log(`💓 状态保持: ${status} (进度: ${progress}%, 已耗时: ${elapsedSeconds}s)`);
      }
    }
    
    if (status === 'completed' || status === 'succeeded') {
      completedStatus = statusData as Record<string, unknown>;
      // 根据文档，视频 URL 在 remixed_from_video_id 字段中
      videoUrl = statusData.remixed_from_video_id || statusData.video_url || statusData.url;
      if (!videoUrl) {
        console.error('📋 完成状态响应:', JSON.stringify(statusData, null, 2));
        throw new Error('视频生成完成但未返回视频 URL');
      }
      console.log('✅ 任务完成，视频 URL:', videoUrl.substring(0, 100));
      break;
    } else if (status === 'failed' || status === 'error') {
      const err = statusData.error;
      const errMsg = typeof err === 'string' ? err : (err?.message || err?.code || statusData.message || '未知错误');
      console.error('❌ 任务失败详情:', JSON.stringify(statusData, null, 2));
      throw new Error(`视频生成失败: ${errMsg}`);
    }
    // 其他状态（queued、in_progress等）继续轮询
  }

  if (!videoUrl) {
    throw new Error('视频生成超时 (30分钟) 或未返回视频URL');
  }

  console.log('✅ 异步视频生成完成');

  // Step 3: 下载视频并转换为 base64
  const maxDownloadRetries = 5;
  const downloadTimeout = 600000; // 10分钟超时
  
  for (let attempt = 1; attempt <= maxDownloadRetries; attempt++) {
    try {
      console.log(`📥 尝试下载视频 (第${attempt}/${maxDownloadRetries}次)...`);
      
      const downloadController = new AbortController();
      const downloadTimeoutId = setTimeout(() => downloadController.abort(), downloadTimeout);
      
      const resolvedUrl = resolveGcsUrl(videoUrl);
      const downloadResponse = await fetch(resolvedUrl, {
        method: 'GET',
        signal: downloadController.signal
      });
      
      clearTimeout(downloadTimeoutId);
      
      if (!downloadResponse.ok) {
        if (downloadResponse.status >= 500 && attempt < maxDownloadRetries) {
          console.warn(`⚠️ 下载失败 HTTP ${downloadResponse.status}，${5 * attempt}秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
          continue;
        }
        throw new Error(`下载视频失败: HTTP ${downloadResponse.status}`);
      }
      
      const videoBlob = await downloadResponse.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          console.log('✅ 异步视频已转换为base64格式');
          resolve(result);
        };
        reader.onerror = () => reject(new Error('视频转base64失败'));
        reader.readAsDataURL(videoBlob);
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`⚠️ 下载超时，${5 * attempt}秒后重试...`);
        if (attempt < maxDownloadRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
          continue;
        }
        throw new Error('下载视频超时 (10分钟)');
      }
      // 其他错误在最后一次重试时抛出
      if (attempt === maxDownloadRetries) {
        throw error;
      }
      console.warn(`⚠️ 下载出错: ${error.message}，${5 * attempt}秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
    }
  }
  
  throw new Error('下载视频失败：已达最大重试次数');
};

/**
 * 生成视频
 * 使用多种视频生成 API（异步模式和同步模式）
 * 通过起始帧和结束帧生成视频片段
 * @param prompt - 视频生成提示词
 * @param startImageBase64 - 起始关键帧图像(base64或URL格式)
 * @param endImageBase64 - 结束关键帧图像(base64或URL格式)
 * @param model - 使用的视频生成模型，'veo' 会根据 aspectRatio 自动选择具体模型，异步模型使用 /v1/videos API
 * @param aspectRatio - 横竖屏比例，支持 '16:9'（横屏，默认）、'9:16'（竖屏）、'1:1'（方形）
 * @param duration - 视频时长（秒），支持 4、8、12 秒
 * @returns 返回生成的视频base64编码(而非URL),用于存储到indexedDB
 * @throws 如果视频生成失败则抛出错误
 * @note 视频URL会过期,因此转换为base64存储
 * @note 异步 API 使用轮询模式（/v1/videos），同步 API 使用流式/非流式模式（/v1/chat/completions）
 */