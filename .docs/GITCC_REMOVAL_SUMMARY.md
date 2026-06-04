# GitCC 提供商移除总结

## 概述
完全移除了 GitCC（付费 AI 模型提供商）的所有代码，本项目现已专注于**免费 API 提供商**。

## 移除的内容

### 1. 内置模型（types/model.ts）
- **对话模型**：GPT-5.1、GPT-5.2、GPT-4.1、Claude Sonnet 4.5（所有 GitCC 提供）
- **图片模型**：Gemini 3 Pro Image（所有 GitCC 提供）
- **视频模型**：Veo 3.1、Sora-2（所有 GitCC 提供）

### 2. 默认配置更新
- **默认提供商**：从 GitCC → **AGNES AI**
- **默认对话模型**：从 gpt-5.1 → **agnes:agnes-2.0-flash**
- **默认图片模型**：从 gemini-3-pro-image-preview → **agnes:agnes-image-2.1-flash**
- **默认视频模型**：从 sora-2 → **agnes:agnes-video-v2.0**

### 3. API 代理（vite.config.ts）
- 代理目标从 `http://api.gitcc.com` → **`https://apihub.agnes-ai.com`**

### 4. 数据迁移代码清理（modelRegistry.ts、modelConfigService.ts）
- 移除了旧的 antsk → gitcc 迁移代码
- 移除了 Veo 模型名称迁移逻辑
- 移除了过时的兼容性代码

### 5. 服务配置更新
- **modelConfigService.ts**：默认提供商改为 AGNES
- **geminiService.ts**：API 基础 URL 改为 AGNES
- **chatAdapter.ts**：API 密钥验证端点改为 AGNES
- **providerHealthCheck.ts**：移除 gitcc 测试模型优先级

## 当前支持的免费提供商

| 提供商 | 基础 URL | 类型 |
|--------|---------|------|
| **AGNES AI** | https://apihub.agnes-ai.com/v1 | 对话、图片、视频 |
| OpenAI | https://api.openai.com/v1 | 对话、图片、视频 |
| Anthropic | https://api.anthropic.com | 对话 |
| DeepSeek | https://api.deepseek.com | 对话 |
| Ollama (本地) | http://localhost:11434/v1 | 对话 |

## 修改的文件

1. ✅ `types/model.ts` - 移除内置模型，更新默认模型
2. ✅ `services/modelRegistry.ts` - 移除迁移代码
3. ✅ `services/modelConfigService.ts` - 更新默认配置和提供商
4. ✅ `services/providerHealthCheck.ts` - 清理测试优先级
5. ✅ `services/geminiService.ts` - 更新 API 基础 URL
6. ✅ `services/adapters/chatAdapter.ts` - 更新默认 API URL
7. ✅ `vite.config.ts` - 更新代理目标

## 清除用户缓存

用户需要在浏览器中执行以下操作以清除旧数据：

```javascript
// 在浏览器控制台执行
localStorage.removeItem('ai_manga_studio_model_registry');
localStorage.removeItem('ai_manga_studio_model_config');
localStorage.removeItem('big_banana_model_registry');
localStorage.removeItem('big_banana_model_config');
location.reload();
```

或直接清除所有本地存储：
```javascript
localStorage.clear();
location.reload();
```

## 后续操作

1. 测试应用是否正常启动
2. 验证 AGNES AI 模型是否能正确连接
3. 检查其他免费提供商配置是否完整

## 项目现状

✅ 项目现已专注于**免费 API 提供商**
✅ AGNES AI 设为默认提供商
✅ 所有模型配置已更新
✅ 代码中无 GitCC 依赖

