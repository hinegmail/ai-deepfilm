# 快速入门 - API 提供商配置

## 30 秒快速上手

### 1️⃣ 打开模型配置
应用左侧边栏 → 点击"模型配置"按钮

### 2️⃣ 选择标签页
点击"API 提供商"标签页

### 3️⃣ 添加提供商
点击"+ 添加提供商"按钮

### 4️⃣ 填写信息
- **名称**: 自定义名称
- **URL**: API 基础地址
- **Key**: 可选，API Key

### 5️⃣ 添加模型
在对应的模型类别（文本/图像/视频）中添加模型，选择你的提供商

---

## 常见场景（复制即用）

### 场景 A：使用 OpenAI

**提供商配置**
```
名称: OpenAI
URL: https://api.openai.com/v1
Key: sk-...
```

**添加模型**
```
类别: 对话模型
提供商: OpenAI
模型名称: GPT-4o
API 模型名: gpt-4o
```

### 场景 B：使用 Anthropic

**提供商配置**
```
名称: Anthropic
URL: https://api.anthropic.com
Key: sk-ant-...
```

**添加模型**
```
类别: 对话模型
提供商: Anthropic
模型名称: Claude Opus
API 模型名: claude-opus-4-1-20250805
```

### 场景 C：本地 Ollama

**提供商配置**
```
名称: Ollama (已内置)
URL: http://localhost:11434/v1
Key: 留空
```

**添加模型**
```
类别: 对话模型
提供商: Ollama (本地)
模型名称: Llama 2
API 模型名: llama2
```

### 场景 D：国内 API 代理

**提供商配置**
```
名称: OpenAI (代理)
URL: https://api.openaiddd.com/v1
Key: 你的 OpenAI Key
```

**添加模型**
```
类别: 对话模型
提供商: OpenAI (代理)
模型名称: GPT-4o (代理)
API 模型名: gpt-4o
```

---

## 5 个内置提供商

| 提供商 | 已包含模型 | 需要 API Key? |
|--------|-----------|---------------|
| **GitCC** | GPT-5.1/5.2、Claude、Gemini、Veo、Sora | ✅ 需要 |
| **OpenAI** | GPT-4o、DALL-E 3 | ✅ 需要 |
| **Anthropic** | Claude Opus、Sonnet | ✅ 需要 |
| **DeepSeek** | DeepSeek Chat | ✅ 需要 |
| **Ollama** | Llama 2、Mistral | ❌ 不需要 |

---

## 故障排查

### ❌ 模型验证失败

**检查项**：
1. API Key 是否正确？
2. API URL 是否可访问？
   ```bash
   curl https://your-api.com/v1/chat/completions
   ```
3. 网络是否正常？
4. 提供商的 API 是否可用？

### ❌ 找不到提供商

**解决**：
1. 检查拼写是否正确
2. 确认提供商是否已保存
3. 刷新页面重新加载

### ❌ 本地 Ollama 无法连接

**检查**：
1. 是否启动了 Ollama？
   ```bash
   ollama serve
   ```
2. 是否下载了模型？
   ```bash
   ollama pull llama2
   ```
3. 浏览器是否能访问 localhost:11434？

---

## 关键信息

### API Key 优先级
```
模型 Key > 提供商 Key > 全局 Key > 无 Key
```

### URL 格式
```
✅ 正确: https://api.example.com/v1
❌ 错误: https://api.example.com/v1/chat/completions
```
（不要包含具体端点）

### 数据保存位置
```
浏览器 → IndexedDB → 完全本地
```
（不会上传到任何服务器）

---

## 获取 API Key

| 提供商 | 获取地址 |
|--------|---------|
| OpenAI | https://platform.openai.com/api-keys |
| Anthropic | https://console.anthropic.com |
| DeepSeek | https://platform.deepseek.com |
| Together AI | https://www.together.ai |
| Groq | https://console.groq.com |

---

## 更多帮助

- 📖 [完整配置指南](./CUSTOM_PROVIDER_GUIDE.md)
- 📋 [所有提供商列表](./model_provider_setup.md)
- 🏗️ [系统架构详解](./COMPLETE_PROVIDER_SYSTEM.md)

---

**需要帮助？** 在 GitHub Issues 中提问！
