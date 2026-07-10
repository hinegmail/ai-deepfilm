// Author: forsearch | Updated: 2026-07-09
import { Shot, AspectRatio, VideoDuration } from "../types";
import { addRenderLogWithTokens } from './renderLogService';
import { throwFromVideoHttpError, formatModerationBlockedForUser } from './videoHttpErrors';
import { resolveSoraVideoDownloadId, extractSoraDirectVideoUrl, fetchVideoUrlAsDataUrl } from './soraVideoResolve';
import { 
  checkApiKey, 
  getApiBase, 
  resolveRequestModel, 
  getVeoModelName, 
  getSoraVideoSize,
  resolveModel,
  resolveEndpoint
} from "./apiBaseService";

export const generateVideo = async (
  prompt: string, 
  startImageBase64?: string, 
  endImageBase64?: string, 
  model: string = 'veo',
  aspectRatio: AspectRatio = '16:9',
  duration: VideoDuration = 8
): Promise<string> => {
  const resolvedVideoModel = resolveModel('video', model);
  const requestModel = resolveRequestModel('video', model) || model;
  const apiKey = checkApiKey('video', model);
  const apiBase = getApiBase('video', model);
  const isAsyncMode = (resolvedVideoModel as any)?.params?.mode === 'async';
  
  // 异步 API 模式（支持 AGNES Video 等）
  if (isAsyncMode) {
    return generateVideoAsync(prompt, startImageBase64, endImageBase64, apiKey, aspectRatio, duration, requestModel || 'agnes-video-v2.0');
  }
  
  // 如果是 veo 模型，根据横竖屏和是否有参考图动态选择模型名称
  let actualModel = requestModel;
  if (actualModel === 'veo' || actualModel.startsWith('veo_3_1')) {
    const hasReferenceImage = !!startImageBase64;
    actualModel = getVeoModelName(hasReferenceImage, aspectRatio);
    console.log(`🎬 使用 Veo 模型: ${actualModel} (${aspectRatio})`);
    
    // Veo 不支持 1:1 方形视频
    if (aspectRatio === '1:1') {
      console.warn('⚠️ Veo 不支持方形视频 (1:1)，将使用横屏 (16:9)');
      actualModel = getVeoModelName(hasReferenceImage, '16:9');
    }
  }
  
  // Veo 模型使用同步模式 (/v1/chat/completions)
  // 处理Base64或URL格式的图像
  const formatImageUrl = (imageData: string): string => {
    if (!imageData) return '';
    
    // 如果已经是data URI，直接返回
    if (imageData.startsWith('data:')) {
      return imageData;
    }
    
    // 如果是HTTP(S) URL，直接返回
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      return imageData;
    }
    
    // 否则假设是纯Base64，需要添加data URI前缀
    return `data:image/png;base64,${imageData}`;
  };

  const startImageUrl = formatImageUrl(startImageBase64 || '');
  const endImageUrl = formatImageUrl(endImageBase64 || '');

  // Build request body based on model requirements
  const messages: any[] = [
    { role: 'user', content: prompt }
  ];

  // Add images as content if provided
  if (startImageUrl) {
    messages[0].content = [
      { type: 'text', text: prompt },
      { 
        type: 'image_url',
        image_url: { url: startImageUrl }
      }
    ];
  }

  if (endImageUrl) {
    if (Array.isArray(messages[0].content)) {
      messages[0].content.push({
        type: 'image_url',
        image_url: { url: endImageUrl }
      });
    }
  }

  // Use non-streaming mode with increased timeout for video generation
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200000); // 20 minutes timeout

  try {
    const response = await retryOperation(async () => {
      const res = await fetch(`${apiBase}${resolveEndpoint(apiBase, '/chat/completions')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: actualModel,
          messages: messages,
          stream: false,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errorText = await res.text();
        throwFromVideoHttpError(res.status, errorText, 'veo');
      }

      return res;
    });

    clearTimeout(timeoutId);

    // Parse non-streaming response
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Look for video URL in the content
    const urlMatch = content.match(/(https?:\/\/[^\s]+\.mp4)/);
    const videoUrl = urlMatch ? urlMatch[1] : '';

    if (!videoUrl) {
      throw new Error("视频生成失败 (No video URL returned)");
    }

    console.log('🎬 视频URL获取成功,正在转换为base64...');
    
    // 将视频URL转换为base64,避免URL过期问题
    try {
      const videoBase64 = await convertVideoUrlToBase64(videoUrl);
      console.log('✅ 视频已转换为base64格式,可安全存储到IndexedDB');
      return videoBase64;
    } catch (error: any) {
      console.error('❌ 视频转base64失败,返回原始URL:', error);
      // 如果转换失败,返回原始URL作为降级方案
      return videoUrl;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('视频生成超时 (20分钟)');
    }
    throw error;
  }
};

/**
 * AI续写功能 - 基于已有剧本内容续写后续情节
 * @param existingScript - 已有的剧本内容
 * @param language - 输出语言
 * @param model - 使用的AI模型
 * @returns 续写的内容
 */