# 自定义 API 提供商配置指南

## 概述

AI 漫剧工场 现在完全支持自定义 API 提供商。你可以添加任何 OpenAI 兼容格式的 API 服务，无论是官方服务、第三方 API 网关、还是本地部署的模型服务。

## 提供商管理界面

打开应用后进入"模型配置" → "API 提供商"标签页，即可管理所有 API 提供商。

### 界面分区

1. **内置提供商区** - 系统预配置的提供商
   - GitCC API（默认）
   - OpenAI
   - Anthropic
   - DeepSeek
   - Ollama（本地）

2. **自定义提供商区** - 用户添加的提供商
   - 可添加、编辑、删除
   - 显示 API 基础 URL 和配置状态

3. **常见模板区** - 快速参考常见提供商的 URL 格式

## 添加自定义提供商

### 步骤 1：打开提供商管理器

1. 点击应用侧边栏的"模型配置"
2. 选择"API 提供商"标签页
3. 在自定义提供商区点击"+ 添加提供商"按钮

### 步骤 2：填写提供商信息

| 字段 | 说明 | 示例 |
|------|------|------|
| **提供商名称** | 显示在界面中的名称 | "My Custom LLM" |
| **API 基础 URL** | API 的根地址（不含具体端点） | `https://api.example.com/v1` |
| **API Key** | 可选，为此提供商单独配置 | 留空则使用全局 Key |

### 步骤 3：保存提供商

点击"添加"按钮，新提供商会被保存到本地浏览器。

## 常见提供商配置

### 1. Together AI

```
名称: Together AI
基础 URL: https://api.together.xyz/v1
API Key: 从 https://www.together.ai 获取
```

### 2. Groq

```
名称: Groq
基础 URL: https://api.groq.com/openai/v1
API Key: 从 https://console.groq.com 获取
说明: 提供快速、廉价的推理 API
```

### 3. Azure OpenAI

```
名称: Azure OpenAI
基础 URL: https://<资源名>.openai.azure.com/v1
API Key: 从 Azure Portal 获取
说明: 在国内或有 VNet 要求时使用
```

### 4. Replicate

```
名称: Replicate
基础 URL: https://api.replicate.com/v1
API Key: 从 https://replicate.com 获取
```

### 5. 本地 vLLM

```
名称: vLLM (本地)
基础 URL: http://localhost:8000/v1
API Key: 不需要
说明: 需要先运行 vLLM 服务器
启动命令: python -m vllm.entrypoints.openai.api_server
```

### 6. 本地 Text Generation WebUI

```
名称: Text Gen (本地)
基础 URL: http://localhost:5000/v1
API Key: 不需要
说明: 需要先运行 WebUI
安装方式: https://github.com/oobabooga/text-generation-webui
```

### 7. 本地 LM Studio

```
名称: LM Studio (本地)
基础 URL: http://localhost:1234/v1
API Key: 不需要
说明: 本地运行的桌面应用
下载: https://lmstudio.ai
```

### 8. Hugging Face Inference API

```
名称: Hugging Face
基础 URL: https://api-inference.huggingface.co/v1
API Key: 从 https://huggingface.co/settings/tokens 获取
```

## 添加模型到自定义提供商

1. 在"模型配置"中选择对应的模型类别（文本、图像、视频）
2. 点击"+ 添加模型"按钮
3. 在"API 提供商"下拉菜单中选择你添加的自定义提供商
4. 填写模型信息：
   - **模型名称**: 界面显示名称
   - **API 模型名**: 提供商 API 中的实际模型名
   - **API 端点**: 可选，默认为 `/v1/chat/completions`
   - **API Key**: 可选，该模型专属 Key
5. 点击"添加模型"

### 模型名称示例

| 提供商 | API 模型名 | 用途 |
|--------|-----------|------|
| Together AI | `meta-llama/Llama-2-70b-chat-hf` | 大型开源模型 |
| Groq | `mixtral-8x7b-32768` | 高速推理 |
| Replicate | `mistral-7b` | 开源模型 |
| vLLM | `llama-2-70b` | 本地运行 |
| Azure OpenAI | `gpt-4-deployment-name` | 你部署的模型名 |

## 编辑和删除提供商

### 编辑提供商

1. 在提供商卡片上鼠标悬停，出现编辑按钮
2. 点击编辑按钮
3. 修改提供商信息（名称和 API Key 可修改）
4. 点击"保存"

**注意**: 对于内置提供商，基础 URL 无法修改，但可以配置专属 API Key。

### 删除提供商

1. 在自定义提供商卡片上鼠标悬停，出现删除按钮
2. 点击删除按钮
3. 确认删除（该提供商的所有模型也会被删除）

**注意**: 内置提供商无法删除。

## API Key 优先级

系统按以下顺序选择 API Key：

1. **模型专属 API Key** ← 最高优先级
2. **提供商专属 API Key**
3. **全局 API Key** ← 最低优先级
4. **空（不使用 Key）** ← 本地模型

## 测试提供商连接

添加提供商后，建议立即添加一个测试模型并进行验证：

1. 在对应的模型类别中添加一个测试模型
2. 在全局设置中点击"验证并保存"
3. 如果验证失败，检查：
   - API Key 是否正确
   - 基础 URL 是否可访问
   - 网络连接是否正常

## 常见问题

### Q: 如何查看提供商是否配置成功？

A: 查看模型配置中对应类别的模型列表，如果你添加的模型显示在列表中，说明提供商配置成功。

### Q: 支持哪些 API 格式？

A: 支持所有兼容 OpenAI API 格式的服务，包括：
- 完全兼容 OpenAI API 的服务（如大多数第三方 API 网关）
- 轻微差异的服务（可通过自定义端点处理）
- 本地部署的服务（如 Ollama、vLLM 等）

### Q: 如何连接到本地 LLM？

A: 
1. 确保本地 LLM 服务已启动（如 Ollama、vLLM 等）
2. 添加一个新提供商，基础 URL 设置为本地地址（如 `http://localhost:8000/v1`）
3. API Key 留空（本地服务通常不需要）
4. 添加模型时，API 模型名设置为本地模型名（如 `llama2`、`mistral`）

### Q: 支持 Anthropic 的特殊端点格式吗？

A: 支持。添加 Anthropic 提供商后，添加模型时可以自定义 API 端点为 `/messages`。系统会自动调用相应的 API 适配器。

### Q: 删除提供商后能恢复吗？

A: 不能自动恢复，但你可以重新添加该提供商。与该提供商关联的模型会被永久删除。

### Q: 能否为同一提供商设置多个配置？

A: 可以。添加多个名称不同但 URL 相同的提供商实例，为不同的模型配置不同的 API Key。

### Q: 国内访问 OpenAI API 如何配置？

A: 
1. 添加一个新提供商
2. 名称: 自定义（如 "OpenAI via Proxy"）
3. 基础 URL: 填写代理地址（如 `https://proxy.example.com/openai/v1`）
4. API Key: 填写 OpenAI API Key
5. 添加模型时使用原生的模型名（如 `gpt-4`）

## 最佳实践

### 1. 为每个提供商设置独立 API Key

这样可以：
- 避免意外超额计费
- 快速定位问题来源
- 灵活调整提供商优先级

### 2. 定期测试连接

定期在全局设置中重新验证 API Key，确保连接正常。

### 3. 记录提供商成本

不同提供商的成本差异很大，建议：
- 为不同任务选择适合的提供商
- 定期对比成本效益

### 4. 备份配置

配置仅保存在浏览器本地，建议：
- 定期截图记录提供商配置
- 重要配置保存在文档中

## 相关文档

- [模型提供商配置指南](./model_provider_setup.md)
- [完整的改造总结](./REFACTOR_SUMMARY.md)
- [技术栈与构建系统](../.kiro/steering/tech.md)

## 技术支持

如遇问题，可以：
1. 检查浏览器控制台的错误信息
2. 确认提供商 API 文档的正确性
3. 尝试使用 curl 或 Postman 直接测试 API 端点
4. 提交 Issue 或联系技术支持
