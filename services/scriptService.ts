// Author: forsearch | Updated: 2026-07-09
import { ScriptData, Shot, Character, Scene } from "../types";
import { 
  checkApiKey, 
  getApiBase, 
  getActiveChatModelName, 
  SCRIPT_INPUT_MAX_CHARS,
  LONG_FORM_MAX_TOKENS,
  PARAGRAPHS_CHUNK_MAX_TOKENS,
  retryOperation,
  cleanJsonString,
  chatCompletion,
  chatCompletionStream,
  VISUAL_STYLE_PROMPTS,
  NEGATIVE_PROMPTS
} from "./apiBaseService";
import { addRenderLogWithTokens } from './renderLogService';
import { generateVisualPrompts } from './promptService';

/**
 * Agent 1 & 2: Script Structuring & Breakdown（長文本兩階段解析）
 * 第一階段：只抽取結構（title, genre, logline, characters, scenes），避免單次輸出過長被截斷
 * 第二階段：按場景分塊抽取 storyParagraphs，每場景一次請求，再合併
 */
export const parseScriptToData = async (rawText: string, language: string = '中文', model: string = 'gpt-5.1', visualStyle: string = 'live-action'): Promise<ScriptData> => {
  console.log('📝 parseScriptToData 调用（長文本兩階段）- 模型:', model, '视觉风格:', visualStyle);
  const startTime = Date.now();
  const inputText = rawText.slice(0, SCRIPT_INPUT_MAX_CHARS);
  if (rawText.length > SCRIPT_INPUT_MAX_CHARS) {
    console.warn(`[parseScriptToData] 劇本已截斷至 ${SCRIPT_INPUT_MAX_CHARS} 字，原始長度: ${rawText.length}`);
  }

  try {
    // ---------- 階段 1：只抽取結構，不包含 storyParagraphs ----------
    const structurePrompt = `
Analyze the text and output a JSON object in the language: ${language}.

Tasks:
1. Extract title, genre, logline (in ${language}).
2. Extract characters (id, name, gender, age, personality).
3. Extract scenes (id, location, time, atmosphere).
Do NOT output storyParagraphs in this step.

Input:
"${inputText}"

Output ONLY valid JSON with this structure (no storyParagraphs):
{
  "title": "string",
  "genre": "string",
  "logline": "string",
  "characters": [{"id": "string", "name": "string", "gender": "string", "age": "string", "personality": "string"}],
  "scenes": [{"id": "string", "location": "string", "time": "string", "atmosphere": "string"}]
}
`;

    let responseText = await retryOperation(() =>
      chatCompletion(structurePrompt, model, 0.7, LONG_FORM_MAX_TOKENS, 'json_object')
    );

    if (!responseText?.trim()) {
      throw new Error('AI 未返回任何內容，請檢查模型是否可用或稍後重試。');
    }

    const text = cleanJsonString(responseText);
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse script structure JSON:", e);
      console.error("Raw (first 500 chars):", responseText.slice(0, 500));
      throw new Error('AI 返回的結構格式無法解析，請重試或換用其他模型。');
    }

    const characters = Array.isArray(parsed.characters)
      ? parsed.characters.map((c: any) => ({
          ...c,
          id: String(c.id),
          variations: [] as any[]
        }))
      : [];
    const scenes = Array.isArray(parsed.scenes)
      ? parsed.scenes.map((s: any) => ({ ...s, id: String(s.id) }))
      : [];

    if (characters.length === 0 && scenes.length === 0) {
      throw new Error('AI 未能從文本中提取角色或場景。請確保輸入的是完整故事/劇本（含人物與地點）。');
    }

    const genre = parsed.genre || '通用';

    // ---------- 階段 2：按場景分塊抽取 storyParagraphs ----------
    const storyParagraphs: { id: number; text: string; sceneRefId: string }[] = [];
    let nextId = 1;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const scenePrompt = `
Given the script and scene list below, extract ONLY the story paragraphs that belong to this scene.
Scene to extract for: id="${scene.id}", location="${scene.location}".

Full script:
"${inputText}"

All scene IDs for reference: ${scenes.map((s: any) => s.id).join(', ')}

Output ONLY a JSON array of objects. Each object: {"id": number, "text": string, "sceneRefId": "${scene.id}"}.
Use short paragraph texts. Language: ${language}.
`;

      try {
        if (i > 0) await new Promise((r) => setTimeout(r, 800));
        const paraResponse = await retryOperation(() =>
          chatCompletion(scenePrompt, model, 0.5, PARAGRAPHS_CHUNK_MAX_TOKENS, 'json_object')
        );
        const paraCleaned = cleanJsonString(paraResponse);
        let arr: any[] = [];
        try {
          const parsedPara = JSON.parse(paraCleaned);
          arr = Array.isArray(parsedPara)
            ? parsedPara
            : Array.isArray(parsedPara.storyParagraphs)
              ? parsedPara.storyParagraphs
              : Array.isArray(parsedPara.paragraphs)
                ? parsedPara.paragraphs
                : (() => {
                    const v = Object.values(parsedPara).find((x: any) => Array.isArray(x));
                    return Array.isArray(v) ? v : [];
                  })();
        } catch (_) {
          // 解析失敗時保留空陣列，該場景段落略過
          arr = [];
        }
        arr.forEach((p: any) => {
          if (p && (p.text || p.content)) {
            storyParagraphs.push({
              id: nextId++,
              text: typeof p.text === 'string' ? p.text : String(p.content || ''),
              sceneRefId: String(scene.id)
            });
          }
        });
      } catch (e) {
        console.warn(`[parseScriptToData] 場景 ${scene.location} 段落抽取失敗，跳過:`, e);
      }
    }

    // 若按場景抽取結果為空，可選：做一次整體抽取（較長輸出）
    if (storyParagraphs.length === 0 && scenes.length > 0) {
      console.log('[parseScriptToData] 按場景抽取無段落，嘗試單次整體抽取...');
      const fallbackPrompt = `
Break down the story into paragraphs linked to scenes. Language: ${language}.
Script:
"${inputText.slice(0, 60000)}"

Scenes (use these sceneRefId): ${JSON.stringify(scenes.map((s: any) => ({ id: s.id, location: s.location })))}

Output ONLY valid JSON: { "storyParagraphs": [ {"id": number, "text": "string", "sceneRefId": "string"} ] }
`;
      try {
        const fallbackResp = await retryOperation(() =>
          chatCompletion(fallbackPrompt, model, 0.6, LONG_FORM_MAX_TOKENS, 'json_object')
        );
        const fallbackParsed = JSON.parse(cleanJsonString(fallbackResp));
        const list = Array.isArray(fallbackParsed.storyParagraphs) ? fallbackParsed.storyParagraphs : [];
        list.forEach((p: any, idx: number) => {
          if (p && (p.text || p.content)) {
            storyParagraphs.push({
              id: nextId++,
              text: typeof p.text === 'string' ? p.text : String(p.content || ''),
              sceneRefId: String(p.sceneRefId || scenes[0]?.id || '')
            });
          }
        });
      } catch (e2) {
        console.warn('[parseScriptToData] 整體段落抽取也失敗:', e2);
      }
    }

    // ---------- 生成角色與場景的視覺提示詞 ----------
    console.log('🎨 正在为角色和场景生成视觉提示词...', `风格: ${visualStyle}`);
    for (let i = 0; i < characters.length; i++) {
      try {
        if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
        const prompts = await generateVisualPrompts('character', characters[i], genre, model, visualStyle, language);
        characters[i].visualPrompt = prompts.visualPrompt;
        (characters[i] as any).negativePrompt = prompts.negativePrompt;
      } catch (e) {
        console.error(`Failed to generate visual prompt for character ${characters[i].name}:`, e);
      }
    }
    for (let i = 0; i < scenes.length; i++) {
      try {
        if (i > 0 || characters.length > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
        const prompts = await generateVisualPrompts('scene', scenes[i], genre, model, visualStyle, language);
        scenes[i].visualPrompt = prompts.visualPrompt;
        (scenes[i] as any).negativePrompt = prompts.negativePrompt;
      } catch (e) {
        console.error(`Failed to generate visual prompt for scene ${scenes[i].location}:`, e);
      }
    }

    console.log('✅ 视觉提示词生成完成！');
    const result: ScriptData = {
      title: parsed.title || '未命名剧本',
      genre,
      logline: parsed.logline || '',
      language,
      characters,
      scenes,
      storyParagraphs
    };

    addRenderLogWithTokens({
      type: 'script-parsing',
      resourceId: 'script-parse-' + Date.now(),
      resourceName: result.title,
      status: 'success',
      model,
      prompt: structurePrompt.substring(0, 200) + '...',
      duration: Date.now() - startTime
    });
    return result;
  } catch (error: any) {
    addRenderLogWithTokens({
      type: 'script-parsing',
      resourceId: 'script-parse-' + Date.now(),
      resourceName: '剧本解析',
      status: 'failed',
      model,
      prompt: '',
      error: error.message,
      duration: Date.now() - startTime
    });
    throw error;
  }
};

/**
 * 生成分镜列表
 * 根据剧本数据和目标时长，为每个场景生成适量的分镜头
 * 算法：目标时长(秒) ÷ 10秒/镜头 = 总镜头数，然后平均分配到各场景
 * @param scriptData - 剧本数据，包含场景、角色、目标时长等信息
 * @param model - 使用的AI模型，默认'gpt-5.1'
 * @returns 返回分镜头列表，每个镜头包含关键帧、镜头运动等信息
 */
export const generateShotList = async (scriptData: ScriptData, model: string = 'gpt-5.1'): Promise<Shot[]> => {
  const overallStartTime = Date.now();
  
  if (!scriptData.scenes || scriptData.scenes.length === 0) {
    return [];
  }

  const lang = scriptData.language || '中文';
  const visualStyle = scriptData.visualStyle || 'live-action';
  const stylePrompt = VISUAL_STYLE_PROMPTS[visualStyle] || visualStyle;
  
  // 逐场景生成可降低长文本 JSON 解析失败和 token 超限风险。
  const processScene = async (scene: Scene, index: number): Promise<Shot[]> => {
    const sceneStartTime = Date.now();
    const paragraphs = scriptData.storyParagraphs
      .filter(p => String(p.sceneRefId) === String(scene.id))
      .map(p => p.text)
      .join('\n');

    if (!paragraphs.trim()) return [];

    const targetDurationStr = scriptData.targetDuration || '60s';
    const targetSeconds = parseInt(targetDurationStr.replace(/[^\d]/g, '')) || 60;
    const totalShotsNeeded = Math.round(targetSeconds / 10);
    const scenesCount = scriptData.scenes.length;
    const shotsPerScene = Math.max(1, Math.round(totalShotsNeeded / scenesCount));
    
    const prompt = `
      Act as a professional cinematographer. Generate a detailed shot list (Camera blocking) for Scene ${index + 1}.
      Language for Text Output: ${lang}.
      
      IMPORTANT VISUAL STYLE: ${stylePrompt}
      All 'visualPrompt' fields MUST describe shots in this "${visualStyle}" style.
      
      Scene Details:
      Location: ${scene.location}
      Time: ${scene.time}
      Atmosphere: ${scene.atmosphere}
      
      Scene Action:
      "${paragraphs.slice(0, 12000)}"
      
      Context:
      Genre: ${scriptData.genre}
      Visual Style: ${visualStyle} (${stylePrompt})
      Target Duration (Whole Script): ${scriptData.targetDuration || 'Standard'}
      Total Shots Budget: ${totalShotsNeeded} shots (Each shot = 10 seconds of video)
      Shots for This Scene: Approximately ${shotsPerScene} shots
      
      Characters:
      ${JSON.stringify(scriptData.characters.map(c => ({ id: c.id, name: c.name, desc: c.visualPrompt || c.personality })))}

      Professional Camera Movement Reference (Choose from these categories):
      - Horizontal Left Shot (向左平移) - Camera moves left
      - Horizontal Right Shot (向右平移) - Camera moves right
      - Pan Left Shot (平行向左扫视) - Pan left
      - Pan Right Shot (平行向右扫视) - Pan right
      - Vertical Up Shot (向上直线运动) - Move up vertically
      - Vertical Down Shot (向下直线运动) - Move down vertically
      - Tilt Up Shot (向上仰角运动) - Tilt upward
      - Tilt Down Shot (向下俯角运动) - Tilt downward
      - Zoom Out Shot (镜头缩小/拉远) - Pull back/zoom out
      - Zoom In Shot (镜头放大/拉近) - Push in/zoom in
      - Dolly Shot (推镜头) - Dolly in/out movement
      - Circular Shot (环绕拍摄) - Orbit around subject
      - Over the Shoulder Shot (越肩镜头) - Over shoulder perspective
      - Pan Shot (摇镜头) - Pan movement
      - Low Angle Shot (仰视镜头) - Low angle view
      - High Angle Shot (俯视镜头) - High angle view
      - Tracking Shot (跟踪镜头) - Follow subject
      - Handheld Shot (摇摄镜头) - Handheld camera
      - Static Shot (静止镜头) - Fixed camera position
      - POV Shot (主观视角) - Point of view
      - Bird's Eye View Shot (俯瞰镜头) - Overhead view
      - 360-Degree Circular Shot (360度环绕) - Full circle
      - Parallel Tracking Shot (平行跟踪) - Side tracking
      - Diagonal Tracking Shot (对角跟踪) - Diagonal tracking
      - Rotating Shot (旋转镜头) - Rotating movement
      - Slow Motion Shot (慢动作) - Slow-mo effect
      - Time-Lapse Shot (延时摄影) - Time-lapse
      - Canted Shot (斜视镜头) - Dutch angle
      - Cinematic Dolly Zoom (电影式变焦推轨) - Vertigo effect

      Instructions:
      1. Create EXACTLY ${shotsPerScene} shots (or ${shotsPerScene - 1} to ${shotsPerScene + 1} shots if needed for story flow) for this scene.
      2. CRITICAL: Each shot will be 10 seconds. Total shots must match the target duration formula: ${targetSeconds} seconds ÷ 10 = ${totalShotsNeeded} total shots across all scenes.
      3. DO NOT exceed ${shotsPerScene + 1} shots for this scene. Select the most important moments only.
      4. 'cameraMovement': Can reference the Professional Camera Movement Reference list above for inspiration, or use your own creative camera movements. You may use the exact English terms (e.g., "Dolly Shot", "Pan Right Shot", "Zoom In Shot", "Tracking Shot") or describe custom movements.
      5. 'shotSize': Specify the field of view (e.g., Extreme Close-up, Medium Shot, Wide Shot).
      6. 'actionSummary': Detailed description of what happens in the shot (in ${lang}).
      7. 'visualPrompt': Detailed description for image generation in ${visualStyle} style (OUTPUT IN ${lang}). Include style-specific keywords. Keep it under 50 words.
      
      Output ONLY a valid JSON OBJECT with this exact structure (no markdown, no extra text):
      {
        "shots": [
          {
            "id": "string",
            "sceneId": "${scene.id}",
            "actionSummary": "string",
            "dialogue": "string (empty if none)",
            "cameraMovement": "string",
            "shotSize": "string",
            "characters": ["string"],
            "keyframes": [
              {"id": "string", "type": "start|end", "visualPrompt": "string (MUST include ${visualStyle} style keywords)"}
            ]
          }
        ]
      }
    `;

    let responseText = '';
    try {
      responseText = await retryOperation(() => chatCompletion(prompt, model, 0.7, LONG_FORM_MAX_TOKENS, 'json_object'));
      const text = cleanJsonString(responseText);
      const parsed = JSON.parse(text);

      // json_object 會強制返回物件，這裡兼容舊版陣列與新版 { shots: [...] }。
      const shots = Array.isArray(parsed)
        ? parsed
        : (parsed && Array.isArray((parsed as any).shots) ? (parsed as any).shots : []);
      
      const validShots = Array.isArray(shots) ? shots : [];
      const result = validShots.map(s => ({
        ...s,
        sceneId: String(scene.id)
      }));
      
      addRenderLogWithTokens({
        type: 'script-parsing',
        resourceId: `shot-gen-scene-${scene.id}-${Date.now()}`,
        resourceName: `分镜生成 - 场景${index + 1}: ${scene.location}`,
        status: 'success',
        model: model,
        prompt: prompt.substring(0, 200) + '...',
        duration: Date.now() - sceneStartTime
      });
      
      return result;

    } catch (e: any) {
      console.error(`Failed to generate shots for scene ${scene.id}`, e);
      try {
        console.error(`  ↳ sceneId=${scene.id}, sceneIndex=${index}, responseText(snippet)=`, String(responseText || '').slice(0, 500));
      } catch {
        // ignore
      }
      
      addRenderLogWithTokens({
        type: 'script-parsing',
        resourceId: `shot-gen-scene-${scene.id}-${Date.now()}`,
        resourceName: `分镜生成 - 场景${index + 1}: ${scene.location}`,
        status: 'failed',
        model: model,
        prompt: prompt.substring(0, 200) + '...',
        error: e.message || String(e),
        duration: Date.now() - sceneStartTime
      });
      
      return [];
    }
  };

  const BATCH_SIZE = 1;
  const allShots: Shot[] = [];
  
  for (let i = 0; i < scriptData.scenes.length; i += BATCH_SIZE) {
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 1500));
    
    const batch = scriptData.scenes.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((scene, idx) => processScene(scene, i + idx))
    );
    batchResults.forEach(shots => allShots.push(...shots));
  }

  if (allShots.length === 0) {
    throw new Error('分镜生成失败：AI返回为空（可能是 JSON 结构不匹配或场景内容未被识别）。请打开控制台查看分镜生成日志。');
  }

  return allShots.map((s, idx) => ({
    ...s,
    id: `shot-${idx + 1}`,
    keyframes: Array.isArray(s.keyframes) ? s.keyframes.map(k => ({ 
      ...k, 
      id: `kf-${idx + 1}-${k.type}`,
      status: 'pending' 
    })) : []
  }));
};



/**
 * 生成角色或场景的视觉提示词
 * 根据指定的视觉风格和语言，为角色或场景生成详细的视觉描述
 * @param type - 类型，'character'（角色）或'scene'（场景）
 * @param data - 角色或场景的数据
 * @param genre - 剧本类型/题材
 * @param model - 使用的AI模型，默认'gpt-5.1'
 * @param visualStyle - 视觉风格，如'live-action'、'anime'等，默认'live-action'
 * @param language - 输出语言，默认'中文'
 * @returns 返回包含visualPrompt和negativePrompt的对象
 */
export const continueScript = async (existingScript: string, language: string = '中文', model: string = 'gpt-5.1'): Promise<string> => {
  console.log('✍️ continueScript 调用 - 使用模型:', model);
  const startTime = Date.now();
  
  const prompt = `
你是一位资深剧本创作者。请在充分理解下方已有剧本内容的基础上，续写后续情节。

续写要求：
1. 严格保持原剧本的风格、语气、人物性格和叙事节奏，确保无明显风格断层。
2. 情节发展需自然流畅，逻辑严密，因果关系合理，避免突兀转折。
3. 有效增加戏剧冲突和情感张力，使故事更具吸引力和张力。
4. 续写内容应为原有剧本长度的30%-50%，字数适中，避免过短或过长。
5. 保持剧本的原有格式，包括场景描述、人物对白、舞台指示等，确保格式一致。
6. 输出语言为：${language}，用词准确、表达流畅。
7. 仅输出续写剧本内容，不添加任何说明、前缀或后缀。

已有剧本内容：
${existingScript}

请直接续写剧本内容。（不要包含"续写："等前缀）：
`;

  try {
    const result = await retryOperation(() => chatCompletion(prompt, model, 0.8, 4096));
    const duration = Date.now() - startTime;
    
    await addRenderLogWithTokens({
      type: 'script-parsing',
      resourceId: 'continue-script',
      resourceName: 'AI续写剧本',
      status: 'success',
      model,
      duration,
      prompt: existingScript.substring(0, 200) + '...'
    });
    
    return result;
  } catch (error) {
    console.error('❌ 续写失败:', error);
    throw error;
  }
};

/**
 * AI续写功能（流式）- 基于已有剧本内容续写后续情节
 * @param existingScript - 已有的剧本内容
 * @param language - 输出语言
 * @param model - 使用的AI模型
 * @param onDelta - 流式增量回调
 * @returns 续写的完整内容
 */
export const continueScriptStream = async (
  existingScript: string,
  language: string = '中文',
  model: string = 'gpt-5.1',
  onDelta?: (delta: string) => void
): Promise<string> => {
  console.log('✍️ continueScriptStream 调用 - 使用模型:', model);
  const startTime = Date.now();

  const prompt = `
你是一位资深剧本创作者。请在充分理解下方已有剧本内容的基础上，续写后续情节。

续写要求：
1. 严格保持原剧本的风格、语气、人物性格和叙事节奏，确保无明显风格断层。
2. 情节发展需自然流畅，逻辑严密，因果关系合理，避免突兀转折。
3. 有效增加戏剧冲突和情感张力，使故事更具吸引力和张力。
4. 续写内容应为原有剧本长度的30%-50%，字数适中，避免过短或过长。
5. 保持剧本的原有格式，包括场景描述、人物对白、舞台指示等，确保格式一致。
6. 输出语言为：${language}，用词准确、表达流畅。
7. 仅输出续写剧本内容，不添加任何说明、前缀或后缀。

已有剧本内容：
${existingScript}

请直接续写剧本内容。（不要包含"续写："等前缀）：
`;

  try {
    const result = await retryOperation(() => chatCompletionStream(prompt, model, 0.8, undefined, 600000, onDelta));
    const duration = Date.now() - startTime;

    await addRenderLogWithTokens({
      type: 'script-parsing',
      resourceId: 'continue-script',
      resourceName: 'AI续写剧本（流式）',
      status: 'success',
      model,
      duration,
      prompt: existingScript.substring(0, 200) + '...'
    });

    return result;
  } catch (error) {
    console.error('❌ 续写失败（流式）:', error);
    throw error;
  }
};

/**
 * AI改写功能 - 对整个剧本进行改写，让情节更连贯
 * @param originalScript - 原始剧本内容
 * @param language - 输出语言
 * @param model - 使用的AI模型
 * @returns 改写后的完整剧本
 */
export const rewriteScript = async (originalScript: string, language: string = '中文', model: string = 'gpt-5.1'): Promise<string> => {
  console.log('🔄 rewriteScript 调用 - 使用模型:', model);
  const startTime = Date.now();
  
  const prompt = `
你是一位顶级剧本编剧顾问，擅长提升剧本的结构、情感和戏剧张力。请对下方提供的剧本进行系统性、创造性改写，目标是使剧本在连贯性、流畅性和戏剧冲突等方面显著提升。

改写具体要求如下：

1. 保留原剧本的核心故事线和主要人物设定，不改变故事主旨。
2. 优化情节结构，确保事件发展具有清晰的因果关系，逻辑严密。
3. 增强场景之间的衔接与转换，使整体叙事流畅自然。
4. 丰富和提升人物对话，使其更具个性、情感色彩和真实感，避免生硬或刻板。
5. 强化戏剧冲突，突出人物之间的矛盾与情感张力，增加情节的吸引力和感染力。
6. 深化人物内心活动和情感描写，提升剧本的情感深度。
7. 优化整体节奏，合理分配高潮与缓和段落，避免情节拖沓或推进过快。
8. 保持或适度增加剧本内容长度，确保内容充实但不过度冗长。
9. 严格遵循剧本格式规范，包括场景标注、人物台词、舞台指示等。
10. 输出语言为：${language}，确保语言风格与剧本类型相符。

原始剧本内容如下：
${originalScript}

请根据以上要求，输出经过全面改写、结构优化、情感丰富的完整剧本文本。
`;

  try {
    const result = await retryOperation(() => chatCompletion(prompt, model, 0.7, 8192));
    const duration = Date.now() - startTime;
    
    await addRenderLogWithTokens({
      type: 'script-parsing',
      resourceId: 'rewrite-script',
      resourceName: 'AI改写剧本',
      status: 'success',
      model,
      duration,
      prompt: originalScript.substring(0, 200) + '...'
    });
    
    return result;
  } catch (error) {
    console.error('❌ 改写失败:', error);
    throw error;
  }
};

/**
 * AI改写功能（流式）- 对整个剧本进行改写，让情节更连贯
 * @param originalScript - 原始剧本内容
 * @param language - 输出语言
 * @param model - 使用的AI模型
 * @param onDelta - 流式增量回调
 * @returns 改写后的完整剧本
 */
export const rewriteScriptStream = async (
  originalScript: string,
  language: string = '中文',
  model: string = 'gpt-5.1',
  onDelta?: (delta: string) => void
): Promise<string> => {
  console.log('🔄 rewriteScriptStream 调用 - 使用模型:', model);
  const startTime = Date.now();

  const prompt = `
你是一位顶级剧本编剧顾问，擅长提升剧本的结构、情感和戏剧张力。请对下方提供的剧本进行系统性、创造性改写，目标是使剧本在连贯性、流畅性和戏剧冲突等方面显著提升。

改写具体要求如下：

1. 保留原剧本的核心故事线和主要人物设定，不改变故事主旨。
2. 优化情节结构，确保事件发展具有清晰的因果关系，逻辑严密。
3. 增强场景之间的衔接与转换，使整体叙事流畅自然。
4. 丰富和提升人物对话，使其更具个性、情感色彩和真实感，避免生硬或刻板。
5. 强化戏剧冲突，突出人物之间的矛盾与情感张力，增加情节的吸引力和感染力。
6. 深化人物内心活动和情感描写，提升剧本的情感深度。
7. 优化整体节奏，合理分配高潮与缓和段落，避免情节拖沓或推进过快。
8. 保持或适度增加剧本内容长度，确保内容充实但不过度冗长。
9. 严格遵循剧本格式规范，包括场景标注、人物台词、舞台指示等。
10. 输出语言为：${language}，确保语言风格与剧本类型相符。

原始剧本内容如下：
${originalScript}

请根据以上要求，输出经过全面改写、结构优化、情感丰富的完整剧本文本。
`;

  try {
    const result = await retryOperation(() => chatCompletionStream(prompt, model, 0.7, undefined, 600000, onDelta));
    const duration = Date.now() - startTime;

    await addRenderLogWithTokens({
      type: 'script-parsing',
      resourceId: 'rewrite-script',
      resourceName: 'AI改写剧本（流式）',
      status: 'success',
      model,
      duration,
      prompt: originalScript.substring(0, 200) + '...'
    });

    return result;
  } catch (error) {
    console.error('❌ 改写失败（流式）:', error);
    throw error;
  }
};

/**
 * AI一次性优化起始帧和结束帧视觉描述（推荐使用）
 * 根据场景信息和叙事动作，同时生成起始帧和结束帧的详细视觉描述
 * 相比单独优化，这个方法能让AI更好地理解两帧的关系，确保视觉过渡更协调
 * @param actionSummary - 叙事动作描述
 * @param cameraMovement - 镜头运动
 * @param sceneInfo - 场景信息（地点、时间、氛围）
 * @param characterInfo - 角色信息（可选）
 * @param visualStyle - 视觉风格
 * @param model - 使用的模型，默认'gpt-5.1'
 * @returns 返回包含起始帧和结束帧的优化描述对象
 */
export const generateActionSuggestion = async (
  startFramePrompt: string,
  endFramePrompt: string,
  cameraMovement: string,
  model: string = 'gpt-5.1'
): Promise<string> => {
  console.log('🎬 generateActionSuggestion 调用 - 使用模型:', model);
  const startTime = Date.now();

  const actionReferenceExamples = `
## 高质量动作提示词参考示例

### 特效魔法戏示例
与男生飞在空中，随着抬起手臂，镜头迅速拉远到大远景，天空不断劈下密密麻麻的闪电，男生的机甲化作蓝光，形成一个压迫感拉满，巨大的魔法冲向镜头，震撼感和压迫感拉满。要求电影级运镜，有多个镜头的转换，内容动作符合要求，运镜要有大片的既视感，动作炫酷且合理，迅速且富有张力。

### 打斗戏示例
面具人和白发男生赤手空拳展开肉搏，他们会使用魔法。要求拥有李小龙、成龙级别的打斗动作。要求电影级运镜，有多个镜头的转换，内容动作符合要求，运镜要有大片的既视感，动作炫酷且合理，迅速且富有张力。

### 蓄力攻击示例
机甲蓄力，朝天空猛开几炮，震撼感和压迫感拉满。要求电影级运镜，有多个镜头的转换，内容动作符合要求，运镜要有大片的既视感，动作炫酷且合理，迅速且富有张力。

### 魔法展开示例
男生脚下的地面突然剧烈震动，一根根粗壮的石刺破土而出如同怪兽的獠牙，压迫感拉满，疯狂地朝他刺来(给石刺特写)！男生快速跃起，同时双手在胸前合拢。眼睛散发出蓝色的魔法光芒，大喊：领域展开·无尽冰原！嗡！一股肉眼可见的蓝色波纹瞬间扩散开来，所过之处，无论是地面、墙壁全都被一层厚厚的坚冰覆盖！整个仓库还是废弃的集装箱，瞬间变成了一片光滑的溜冰场！石刺也被冻住。要求电影级运镜，有多个镜头的转换，内容动作符合要求，运镜要有大片的既视感，动作炫酷且合理，迅速且富有张力。

### 快速移动示例
镜头1：天台左侧中景，郑一剑初始站立，背后是夜色笼罩下灯火闪烁的城市，圆月高悬。他保持着一种蓄势待发的静态站立姿态，周身氛围沉静。
镜头2：郑一剑消失："模糊拖影"特效与空气扰动，画面瞬间触发"模糊拖影"特效，身影如被快速拉扯的幻影般，以极快的速度淡化、消失，原地只残留极其轻微的空气扰动波纹。
镜头3：镜头急速移至曲飞面前，从郑一剑消失的位置，以迅猛的速度横向移动，画面里天台的栏杆、地面等景物飞速掠过，产生强烈的动态模糊效果。最终镜头定格在曲飞面前，脸上露出明显的惊讶与警惕。
镜头4：郑一剑突然出现准备出拳，毫无征兆地出现在画面中央，身体大幅度前倾，呈现出极具张力的准备出拳姿势，右手紧紧握拳，带起的劲风使得衣角大幅度向后飘动。

### 能量爆发示例
镜头在倾盆大雨中快速抖动向前推进，对准在黑暗海平面中屹立不动的黑影。几道闪电快速划过，轮廓在雨幕中若隐若现。突然，一股巨大的雷暴能量在他身后快速汇聚，光芒猛烈爆发。镜头立刻快速向地面猛冲，并同时向上极度仰起，锁定他被能量光芒完全照亮的、张开双臂的威严姿态。
`;

  const prompt = `
你是一位专业的电影动作导演和叙事顾问。请根据提供的首帧和尾帧信息，结合镜头运动，设计一个既符合叙事逻辑又充满视觉冲击力的动作场景。

## 重要约束
⏱️ **时长限制**：这是一个8-10秒的单镜头场景，请严格控制动作复杂度
📹 **镜头要求**：这是一个连续镜头，不要设计多个镜头切换（除非绝对必要，最多2-3个快速切换）

## 输入信息
**首帧描述：** ${startFramePrompt}
**尾帧描述：** ${endFramePrompt}
**镜头运动：** ${cameraMovement}

${actionReferenceExamples}

## 任务要求
1. **时长适配**：动作设计必须在8-10秒内完成，避免过于复杂的多步骤动作
2. **单镜头思维**：优先设计一个连贯的镜头内动作，而非多镜头组合
3. **自然衔接**：动作需要自然地从首帧过渡到尾帧，确保逻辑合理
4. **风格借鉴**：参考上述示例的风格和语言，但要简化步骤：
   - 富有张力但简洁的描述语言
   - 强调关键的视觉冲击点
   - 电影级的运镜描述但避免过度分解
5. **创新适配**：不要重复已有提示词，结合当前场景创新
6. **镜头语言**：根据提供的镜头运动（${cameraMovement}），设计相应的运镜方案

## 输出格式
请直接输出动作描述文本，无需JSON格式或额外标记。内容应包含：
- 简洁的单镜头动作场景描述（不要"镜头1、镜头2..."的分段，除非场景确实需要快速切换）
- 关键的运镜说明（推拉摇移等）
- 核心的视觉特效或情感氛围
- 确保描述具有电影感但控制篇幅

❌ 避免：过多的镜头切换、冗长的分步描述、超过10秒的复杂动作序列
✅ 追求：精炼、有冲击力、符合8-10秒时长的单镜头动作

请开始创作：
`;

  try {
    const result = await retryOperation(() => chatCompletion(prompt, model, 0.8, 2048));
    const duration = Date.now() - startTime;
    
    console.log('✅ AI动作生成成功，耗时:', duration, 'ms');
    
    return result.trim();
  } catch (error: any) {
    console.error('❌ AI动作生成失败:', error);
    throw new Error(`AI动作生成失败: ${error.message}`);
  }
};

/**
 * 将视频提示词改写为更易通过平台内容审核的版本（弱化暴力、血腥、敏感表述，保留氛围与剧情）
 * @param videoPrompt - 原始视频生成提示词（完整段落）
 * @param model - 使用的对话模型 id，默认使用当前激活的 chat 模型
 * @returns 改写后的提示词，可直接用于再次请求视频生成
 */
export const splitShotIntoSubShots = async (
  shot: any, // Shot type from types.ts
  sceneInfo: { location: string; time: string; atmosphere: string },
  characterNames: string[],
  visualStyle: string,
  model: string = 'gpt-5.1'
): Promise<{ subShots: any[] }> => {
  console.log('✂️ splitShotIntoSubShots 调用 - 使用模型:', model);
  const startTime = Date.now();

  const stylePrompts: { [key: string]: string } = {
    'live-action': '真人实拍电影风格',
    'anime': '日本动漫风格',
    '3d-animation': '3D CGI动画风格',
    'cyberpunk': '赛博朋克风格',
    'oil-painting': '油画艺术风格'
  };

  const styleDesc = stylePrompts[visualStyle] || visualStyle;

  const prompt = `
你是一位专业的电影分镜师和导演。你的任务是将一个粗略的镜头描述，拆分为多个细致、专业的子镜头。

## 原始镜头信息

**场景地点：** ${sceneInfo.location}
**场景时间：** ${sceneInfo.time}
**场景氛围：** ${sceneInfo.atmosphere}
**角色：** ${characterNames.length > 0 ? characterNames.join('、') : '无特定角色'}
**视觉风格：** ${styleDesc}
**原始镜头运动：** ${shot.cameraMovement || '未指定'}

**原始动作描述：**
${shot.actionSummary}

${shot.dialogue ? `**对白：** "${shot.dialogue}"

⚠️ **对白处理说明**：原始镜头包含对白。请在拆分时，将对白放在最合适的子镜头中（通常是角色说话的中景或近景镜头），并在该子镜头的actionSummary中明确提及对白内容。其他子镜头不需要包含对白。` : ''}

## 拆分要求

### 核心原则
1. **单一职责**：每个子镜头只负责一个视角或动作细节，避免混合多个视角
2. **时长控制**：每个子镜头时长约2-4秒，总时长保持在8-10秒左右
3. **景别多样化**：合理运用全景、中景、特写等不同景别
4. **连贯性**：子镜头之间要有逻辑的视觉过渡和叙事连贯性

### 拆分维度示例

**景别分类（Shot Size）：**
- **远景 Long Shot / 全景 Wide Shot**：展示整体环境、人物位置关系、空间布局
- **中景 Medium Shot**：展示人物上半身或腰部以上，强调动作和表情
- **近景 Close-up**：展示人物头部或重要物体，强调情感和细节
- **特写 Extreme Close-up**：聚焦关键细节（如手部动作、眼神、物体特写）

**拆分策略：**
- 如果原始描述是"我在书房走向书桌坐下来，打开电脑"，应拆分为：
  1. 全景：展示我从书房门口走向书桌的整体环境
  2. 中景：我走到椅子前准备坐下的动作
  3. 特写：我坐下时身体与椅子接触的瞬间
  4. 近景：我伸手按下电脑开机键或打开笔记本盖

- 如果原始描述是连续的打斗动作，应从不同视角拆分：
  1. 远景：展示双方对峙的整体画面
  2. 中景：第一次攻击动作
  3. 特写：拳头或武器的碰撞细节
  4. 近景：角色面部反应

### 必须包含的字段

每个子镜头必须包含以下信息：

1. **shotSize**（景别）：明确标注景别类型（全景、中景、特写等）
2. **cameraMovement**（镜头运动）：描述镜头如何移动（静止、推进、跟踪、环绕等）
3. **actionSummary**（动作描述）：清晰、具体的动作和画面内容描述（60-100字）
4. **visualFocus**（视觉焦点）：这个镜头的视觉重点是什么（如"人物移动轨迹"、"手部特写"、"面部表情变化"等）
5. **keyframes**（关键帧数组）：包含起始帧(start)和结束帧(end)的视觉描述
   - 每个关键帧必须包含：
     - **type**: "start" 或 "end"
     - **visualPrompt**: 详细的画面视觉描述（用于AI图像生成），包含场景、人物、光影、构图等细节（100-150字）

### 专业镜头运动参考

可从以下类型中选择或自定义：
- 静止镜头 Static Shot
- 推镜头 Dolly Shot / 拉镜头 Zoom Out
- 跟踪镜头 Tracking Shot
- 平移镜头 Pan Shot
- 环绕镜头 Circular Shot
- 俯视镜头 High Angle / 仰视镜头 Low Angle
- 主观视角 POV Shot
- 越肩镜头 Over the Shoulder

## 输出格式

请输出JSON格式，结构如下：

\`\`\`json
{
  "subShots": [
    {
      "shotSize": "全景 Wide Shot",
      "cameraMovement": "静止镜头 Static Shot",
      "actionSummary": "镜头从书房门口的角度，展示整个书房空间，我从门口缓步走向位于房间中央的书桌，背景可见书架、窗户和温暖的灯光。",
      "visualFocus": "整体环境布局和人物移动轨迹",
      "keyframes": [
        {
          "type": "start",
          "visualPrompt": "书房全景，${styleDesc}，我站在门口，身体朝向书桌方向，准备迈步。房间中央是深色木质书桌，背后是装满书籍的书架，窗户透进柔和的自然光，营造温馨的学习氛围。构图采用三分法，人物位于左侧，书桌位于画面中心。"
        },
        {
          "type": "end",
          "visualPrompt": "书房全景，${styleDesc}，我已走到书桌旁边，身体靠近椅子，手即将触碰椅背。画面保持整体环境视角，展示完整的移动轨迹。光线保持一致，强调空间的纵深感。"
        }
      ]
    },
    {
      "shotSize": "中景 Medium Shot",
      "cameraMovement": "跟踪镜头 Tracking Shot",
      "actionSummary": "镜头跟随我走到书桌前，拍摄腰部以上，我伸手拉开椅子，身体微微前倾准备坐下。",
      "visualFocus": "人物上半身动作和与椅子的互动",
      "keyframes": [
        {
          "type": "start",
          "visualPrompt": "中景人物镜头，${styleDesc}，拍摄腰部以上，我正在接近书桌，手臂自然摆动，表情专注。背景虚化的书架和窗户，突出人物主体。侧面光勾勒人物轮廓。"
        },
        {
          "type": "end",
          "visualPrompt": "中景人物镜头，${styleDesc}，我的手已抓住椅背，身体微微前倾，准备坐下的姿态。表情放松，眼神看向座位。背景保持虚化，强调动作细节。"
        }
      ]
    },
    {
      "shotSize": "特写 Close-up",
      "cameraMovement": "静止镜头 Static Shot",
      "actionSummary": "特写镜头聚焦在我的臀部和椅子座面，捕捉我坐下的瞬间，椅子轻微下沉的动作。",
      "visualFocus": "身体与椅子接触的细节瞬间",
      "keyframes": [
        {
          "type": "start",
          "visualPrompt": "特写镜头，${styleDesc}，聚焦椅子座面和我即将坐下的臀部位置，椅子为深色皮革材质，反射柔和光线。身体正在下降，距离椅面约10厘米。浅景深，背景完全虚化。"
        },
        {
          "type": "end",
          "visualPrompt": "特写镜头，${styleDesc}，身体已完全坐在椅子上，座面轻微凹陷，皮革产生自然的皱褶。捕捉接触瞬间的微妙变化，展现材质质感和重量感。"
        }
      ]
    },
    {
      "shotSize": "近景 Close Shot",
      "cameraMovement": "推镜头 Dolly In",
      "actionSummary": "镜头从侧面推进，拍摄我端坐在椅子上，手伸向电脑，按下开机键，屏幕亮起微光照亮脸部。",
      "visualFocus": "手部按键动作和屏幕亮起的瞬间",
      "keyframes": [
        {
          "type": "start",
          "visualPrompt": "近景侧面镜头，${styleDesc}，我端坐在椅子上，上半身和电脑在画面中。手臂伸向笔记本电脑，手指即将触碰键盘或电源键。电脑屏幕暗黑，面部被环境光照亮，表情期待。"
        },
        {
          "type": "end",
          "visualPrompt": "近景侧面镜头，${styleDesc}，镜头推进更近，手指已按下开机键，屏幕亮起柔和的蓝白色光芒，照亮我的脸部轮廓和手部。表情专注，眼神看向屏幕，营造科技氛围。"
        }
      ]
    }
  ]
}
\`\`\`

**关键帧visualPrompt要求**：
- 必须包含视觉风格标记（${styleDesc}）
- 详细描述画面构图、光影、色彩、景深等视觉元素
- 起始帧和结束帧要有明显的视觉差异，体现动作过程
- 长度控制在100-150字，既详细又不过于冗长
- 使用专业的摄影和美术术语

## 重要提示

❌ **避免：**
- 不要在单个子镜头中混合多个视角或景别
- 不要拆分过细导致总时长超过10秒
- 不要使用过于技术化或晦涩的术语
- 不要忽略视觉连贯性

✅ **追求：**
- 每个子镜头职责清晰、画面感强
- 景别和视角多样化但符合叙事逻辑
- 动作描述具体、可执行
- 保持电影级的专业表达

请开始拆分，直接输出JSON格式（不要包含markdown代码块标记）：
`;

  try {
    const result = await retryOperation(() => chatCompletion(prompt, model, 0.7, 4096, 'json_object'));
    const duration = Date.now() - startTime;
    
    // 清理和解析JSON
    const cleaned = cleanJsonString(result);
    const parsed = JSON.parse(cleaned);
    
    if (!parsed.subShots || !Array.isArray(parsed.subShots) || parsed.subShots.length === 0) {
      throw new Error('AI返回的JSON格式不正确或子镜头数组为空');
    }
    
    // 验证每个子镜头包含必需字段
    for (const subShot of parsed.subShots) {
      if (!subShot.shotSize || !subShot.cameraMovement || !subShot.actionSummary || !subShot.visualFocus) {
        throw new Error('子镜头缺少必需字段（shotSize、cameraMovement、actionSummary、visualFocus）');
      }
      
      // 验证关键帧数组
      if (!subShot.keyframes || !Array.isArray(subShot.keyframes) || subShot.keyframes.length === 0) {
        throw new Error('子镜头缺少关键帧数组（keyframes）');
      }
      
      // 验证每个关键帧
      for (const kf of subShot.keyframes) {
        if (!kf.type || !kf.visualPrompt) {
          throw new Error('关键帧缺少必需字段（type、visualPrompt）');
        }
        if (kf.type !== 'start' && kf.type !== 'end') {
          throw new Error('关键帧type必须是"start"或"end"');
        }
      }
    }
    
    console.log(`✅ 镜头拆分成功，生成 ${parsed.subShots.length} 个子镜头，耗时:`, duration, 'ms');
    
    // 记录成功日志
    addRenderLogWithTokens({
      type: 'script-parsing',
      resourceId: `shot-split-${shot.id}-${Date.now()}`,
      resourceName: `镜头拆分 - ${shot.actionSummary.substring(0, 30)}...`,
      status: 'success',
      model: model,
      prompt: prompt.substring(0, 200) + '...',
      duration: duration
    });
    
    return parsed;
  } catch (error: any) {
    console.error('❌ 镜头拆分失败:', error);
    
    // 记录失败日志
    addRenderLogWithTokens({
      type: 'script-parsing',
      resourceId: `shot-split-${shot.id}-${Date.now()}`,
      resourceName: `镜头拆分 - ${shot.actionSummary.substring(0, 30)}...`,
      status: 'failed',
      model: model,
      prompt: prompt.substring(0, 200) + '...',
      error: error.message,
      duration: Date.now() - startTime
    });
    
    throw new Error(`镜头拆分失败: ${error.message}`);
  }
};

/**
 * AI增强关键帧提示词 - 添加详细的技术规格和视觉细节
 * 使用LLM根据基础提示词生成专业的电影级视觉描述
 * @param basePrompt - 基础提示词(包含场景、角色、动作等基本信息)
 * @param visualStyle - 视觉风格
 * @param cameraMovement - 镜头运动
 * @param frameType - 帧类型(start/end)
 * @param model - 使用的模型,默认'gpt-5.1'
 * @returns 返回增强后的提示词
 */