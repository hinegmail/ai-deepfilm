# AGNES AI 模型配置更新总结

## 问题分析
在模型配置的健康检查中，AGNES AI 提供商仅显示对话模型（AGNES 2.0 Flash 和 AGNES 2.0 Standard），但缺少图片和视频模型的验证选项。

## 修改内容

### 1. 类型定义更新 (`types/model.ts`)
添加了两个新的模型数组：

#### AGNES 图片模型
```typescript
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
```

#### AGNES 视频模型
```typescript
const AGNES_VIDEO_MODELS: VideoModelDefinition[] = [
  {
    id: 'agnes:agnes-video-v2.0',
    apiModel: 'agnes-video-v2.0',
    name: 'Agnes-Video-V2.0',
    type: 'video',
    providerId: 'agnes',
    endpoint: '/videos/generations',
    description: 'AGNES Video V2.0 - 视频生成模型',
    isBuiltIn: true,
    isEnabled: true,
    params: { ...DEFAULT_VIDEO_PARAMS_SORA },
  },
];
```

### 2. 模型注册表更新
在 `ALL_BUILTIN_MODELS` 数组中添加了新的模型数组：
```typescript
export const ALL_BUILTIN_MODELS: ModelDefinition[] = [
  ...BUILTIN_CHAT_MODELS,
  ...OPENAI_CHAT_MODELS,
  ...ANTHROPIC_CHAT_MODELS,
  ...DEEPSEEK_CHAT_MODELS,
  ...OLLAMA_CHAT_MODELS,
  ...AGNES_CHAT_MODELS,
  ...BUILTIN_IMAGE_MODELS,
  ...OPENAI_IMAGE_MODELS,
  ...AGNES_IMAGE_MODELS,        // ← 新增
  ...BUILTIN_VIDEO_MODELS,
  ...OPENAI_VIDEO_MODELS,
  ...AGNES_VIDEO_MODELS,        // ← 新增
];
```

### 3. 健康检查优先级更新 (`services/providerHealthCheck.ts`)
更新了 AGNES 提供商的测试模型优先级，确保能正确选择用于测试的模型：
```typescript
'agnes': ['agnes:agnes-2.0-flash', 'agnes:agnes-2.0-standard', 'agnes:agnes-image-2.1-flash', 'agnes:agnes-video-v2.0'],
```

## 现在支持的 AGNES 模型

| 类型 | 模型名称 | 模型ID | 说明 |
|------|---------|--------|------|
| 对话 | AGNES 2.0 Flash | `agnes:agnes-2.0-flash` | 快速多模态 AI 模型 |
| 对话 | AGNES 2.0 Standard | `agnes:agnes-2.0-standard` | 标准性能 AI 模型 |
| 图片 | Agnes Image 2.1 Flash | `agnes:agnes-image-2.1-flash` | 高速图片生成 |
| 视频 | Agnes-Video-V2.0 | `agnes:agnes-video-v2.0` | 视频生成模型 |

## 健康检查界面效果

当在模型配置 → 健康检查 → AGNES AI 展开时，现在将看到：

### 健康检查结果
- API 连接状态
- 响应时间
- 检查时间

### 模型验证
展示所有四个 AGNES 模型的验证按钮：
- ✓ AGNES 2.0 Flash
- ✓ AGNES 2.0 Standard  
- ✓ Agnes Image 2.1 Flash
- ✓ Agnes-Video-V2.0

每个模型可独立验证连接状态和 API Key 有效性。

## 后续使用

1. **在模型配置中激活模型**：可选择 AGNES Image 2.1 Flash 作为图片生成模型，Agnes-Video-V2.0 作为视频生成模型
2. **进行健康检查**：验证所有配置的模型的 API 连接状态
3. **在创作流程中使用**：在生成图片/视频时会使用激活的 AGNES 模型

## 相关文件变更

- `types/model.ts` - 添加 AGNES 图片和视频模型定义
- `services/providerHealthCheck.ts` - 更新测试模型优先级
- `components/ModelConfig/ProviderHealthCheck.tsx` - 无需修改（自动显示所有模型）

