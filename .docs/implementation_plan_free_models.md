# 全免费模型替代方案规划书

本规划旨在将项目中所有依赖 GitCC (antsk) 的付费模型替换为免费模型（基于 NVIDIA NIM 免费端点与 LTX Video 免费额度/Key），实现零成本运行。

## 用户评审需求

> [!IMPORTANT]
> 1. **NVIDIA API Key**: 您需要从 [NVIDIA NIM](https://build.nvidia.com/) 获取免费的 API Key。
> 2. **LTX Video API Key**: 您已提供，将用于替换视频生成环节。
> 3. **兼容性差异**: 免费模型在处理速度、并发限制（Rate Limit）上可能与付费模型存在差异。

## 方案设计

### 1. 文本模型 (Text)
- **目标模型**: `deepseek-v4-pro` 或 `llama-3.1-405b` (由 NVIDIA NIM 提供)。
- **实现方式**: 接口完全兼容 OpenAI 风格。
- **用途**: 剧本解析、分镜生成、提示词优化。

### 2. 图像模型 (Image)
- **目标模型**: `qwen-image` (由 NVIDIA NIM 提供)。
- **实现方式**: 接口兼容 OpenAI 风格，但需确认返回格式（Base64 或 URL）。
- **用途**: 角色定妆、场景概念图、关键帧生成。

### 3. 视频模型 (Video)
- **目标模型**: `LTX2.3` (LTX Video)。
- **实现方式**: 需新增专属驱动，适配 LTX 的 `/v2` 异步任务流。
- **用途**: 文生视频、图生视频（带起始帧）。

---

## 拟定变更

### 核心服务层

#### [MODIFY] [geminiService.ts](file:///d:/Users/hineo/Documents/Project/deep-comedy-pro/services/geminiService.ts)
- 新增 `generateVideoWithLTX` 异步处理函数。
- 重构 `generateVideo` 入口，根据模型类型自动分流至 LTX 或标准 OpenAI 接口。
- 优化 `generateImage` 以支持 NVIDIA NIM 的图像返回格式。

#### [MODIFY] [modelConfigService.ts](file:///d:/Users/hineo/Documents/Project/deep-comedy-pro/services/modelConfigService.ts)
- 将 NVIDIA NIM 设为默认的 Text/Image Provider。
- 将 LTX 设为默认的 Video Provider。
- 更新内置模型列表，移除 GitCC 相关硬编码。

### 类型与配置

#### [MODIFY] [model.ts](file:///d:/Users/hineo/Documents/Project/deep-comedy-pro/types/model.ts)
- 新增 `VideoMode: 'ltx'`。
- 更新 `BUILTIN_MODELS` 列表。

---

## 验证计划

### 自动化测试
- 使用 Browser Tool 模拟用户在设置页面填入 NVIDIA 与 LTX 的 Key。
- 运行“剧本解析”测试流，验证文本模型输出的 JSON 结构。
- 运行“视频生成”测试流，验证 LTX 的轮询机制是否能正确获取视频结果。

### 手动验证
- 检查生成图片的“角色一致性”在 `qwen-image` 下的表现。
- 验证 LTX 生成的视频是否能正确下载并存储到本地 IndexedDB。
