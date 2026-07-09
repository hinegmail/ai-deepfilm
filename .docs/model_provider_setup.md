# 模型提供商配置指南

## 概述

AI 短剧工作室 现在支持多个 OpenAI 兼容格式的 AI 模型提供商，不再仅限于 GitCC API。

## 支持的提供商

### 内置提供商

以下提供商已内置在应用中，默认可直接使用：

#### 1. GitCC API（默认）
- **基础 URL**: `http://api.gitcc.com`
- **支持模型**:
  - 文本：GPT-5.1、GPT-5.2、GPT-4.1、Claude Sonnet 4.5
  - 图像：Gemini 3 Pro Image
  - 视频：Veo 3.1、Sora-2
- **描述**: 一站式 AI API 服务，支持最新的商用模型

#### 2. OpenAI
- **基础 URL**: `https://api.openai.com/v1`
- **支持模型**:
  - 文本：GPT-4o、GPT-4 Turbo、GPT-3.5 Turbo
  - 图像：DALL-E 3
  - 视频：GPT-4o Realtime
- **申请方式**: 访问 [OpenAI 官网](https://openai.com) 获取 API Key

#### 3. Anthropic
- **基础 URL**: `https://api.anthropic.com`
- **支持模型**:
  - 文本：Claude Opus 4.1、Claude 3.5 Sonnet
- **描述**: 专业文本生成模型，特别优秀于长文本理解
- **申请方式**: 访问 [Anthropic 官网](https://www.anthropic.com) 获取 API Key

#### 4. DeepSeek
- **基础 URL**: `https://api.deepseek.com`
- **支持模型**:
  - 文本：DeepSeek Chat
- **描述**: 性价比高的文本生成模型
- **申请方式**: 访问 [DeepSeek 官网](https://www.deepseek.com) 获取 API Key

#### 5. Ollama（本地）
- **基础 URL**: `http://localhost:11434/v1`
- **支持模型**:
  - 文本：Llama 2、Mistral（需本地部署）
- **描述**: 支持本地运行的开源模型，无需 API Key
- **安装方式**:
  1. 从 [ollama.ai](https://ollama.ai) 下载并安装 Ollama
  2. 运行 `ollama serve` 启动服务
  3. 根据需要运行 `ollama pull llama2` 或 `ollama pull mistral` 等

## 配置步骤

### 第一步：在"全局设置"中配置 API Key

1. 打开应用侧边栏的"模型配置"标签页
2. 点击"全局设置"
3. 在文本框中输入你要使用的提供商的 API Key
4. 点击"验证并保存"

**优先级顺序**：
- 模型专属 API Key > 提供商 API Key > 全局 API Key

### 第二步：选择活跃模型

1. 在"模型配置"中选择对应的模型类别（文本、图像、视频）
2. 从下拉列表中选择你要使用的模型
3. 所选模型将自动成为活跃模型

### 第三步：调整模型参数（可选）

每个模型分类下都有参数调整选项：
- **温度 (Temperature)**：控制生成的创意程度，值越高越创意，越低越保守
- **最大 Tokens**：限制单次生成的最大文本长度
- **其他参数**：如 Top-P、频率惩罚等

## 添加自定义模型

如果内置模型不够，你可以添加自定义模型：

1. 在"模型配置"中找到对应模型类别
2. 点击"+ 添加模型"
3. 填写以下信息：
   - **模型名称**：用于界面显示的名称
   - **API 模型名**：提供商 API 中的实际模型名
   - **API 端点**：模型的 API 端点（可选，留空使用默认）
   - **API Key**：此模型专属的 API Key（可选，留空使用全局 Key）
4. 点击"添加模型"

### 示例：添加 OpenAI 的 GPT-4 Turbo

| 字段 | 值 |
|------|-----|
| 模型名称 | GPT-4 Turbo Custom |
| API 模型名 | gpt-4-turbo |
| API 端点 | /v1/chat/completions |
| API Key | （留空使用全局 Key） |

## 模型参数说明

### 文本模型参数

- **Temperature** (0.0-2.0): 越高越有创意，越低越保守
- **Max Tokens**: 单次生成的最大 Token 数，留空则无限制
- **Top P** (0.0-1.0): 核采样，配合 temperature 使用
- **Frequency Penalty** (-2.0-2.0): 负值减少重复，正值增加多样性
- **Presence Penalty** (-2.0-2.0): 负值鼓励讨论新话题，正值坚持已有话题

### 图像模型参数

- **Default Aspect Ratio**: 默认宽高比（16:9、9:16 或 1:1）
- **Supported Aspect Ratios**: 支持的宽高比列表

### 视频模型参数

- **Mode**: 视频生成模式
  - `sync`：同步模式（Veo 类），立即返回结果
  - `async`：异步模式（Sora 类），先创建任务再轮询
  - `doubao`：Doubao Seedance（基于任务制）
- **Default Duration**: 默认视频时长（4、8 或 12 秒）
- **Supported Durations**: 支持的时长列表

## API Key 优先级

系统按以下优先级选择 API Key：

1. **模型专属 API Key** ← 最高优先级
2. **提供商 API Key**
3. **全局 API Key** ← 最低优先级

## 数据隐私

所有配置都只保存在本地浏览器的 IndexedDB 中，**不会**上传到任何服务器。

- API Key 仅在调用模型 API 时使用
- 清理浏览器缓存会删除所有配置

## 常见问题

### Q: 如何同时使用多个提供商？

A: 为不同的模型类别选择不同的提供商即可。例如文本用 OpenAI，图像用 GitCC，视频用 Ollama。

### Q: 本地 Ollama 无法连接？

A: 确保：
1. Ollama 已安装并运行 (`ollama serve`)
2. 模型已下载 (`ollama pull llama2`)
3. 浏览器可访问 `http://localhost:11434`（某些情况下可能需要配置 CORS）

### Q: 如何在 Docker 中使用？

A: 配置提供商 URL 时，将 `localhost` 改为 Docker 容器内能访问的地址：
- 如果 Ollama 在宿主机：`http://host.docker.internal:11434/v1`
- 如果 Ollama 在同一网络：使用容器名或 IP

### Q: 为什么验证 API Key 失败？

A: 检查以下几点：
1. API Key 格式是否正确
2. 提供商 URL 是否正确
3. 网络连接是否正常
4. 提供商的 API 是否可用

### Q: 如何重置配置到默认值？

A: 在浏览器开发者工具中运行：
```javascript
localStorage.removeItem('ai_manga_studio_model_registry');
localStorage.removeItem('ai_manga_studio_model_config');
location.reload();
```

## 技术细节

### API 代理

本地开发时，所有 API 请求都通过 `/api-proxy` 代理，避免 CORS 问题：
- 本地请求 → `/api-proxy` → 真实 API 端点

Vite 配置（`vite.config.ts`）中定义了代理规则。

### 模型注册

系统使用注册表（Registry）管理模型：
- `modelRegistry.ts`: 核心注册管理
- `types/model.ts`: 模型定义和内置模型列表
- `GlobalSettings.tsx`: 全局配置 UI

### 适配器

API 调用通过适配器实现，支持 OpenAI 兼容格式：
- `services/adapters/chatAdapter.ts`: 文本 API
- `services/adapters/imageAdapter.ts`: 图像 API
- `services/adapters/videoAdapter.ts`: 视频 API

## 相关文件

- 模型类型定义：`types/model.ts`
- 注册表：`services/modelRegistry.ts`
- 配置服务：`services/modelConfigService.ts`
- 配置 UI：`components/ModelConfig/`
- API 适配器：`services/adapters/`

## 支持与反馈

如遇问题或有改进建议，欢迎提交 Issue 或 PR。
