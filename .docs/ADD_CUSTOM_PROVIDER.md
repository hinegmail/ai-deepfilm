# 添加自定义 API 提供商指南

## 🎯 概览

本指南教您如何在 AI 短剧工作室中添加**任何 OpenAI 兼容的 API 提供商**。

---

## 📋 前置条件

您需要准备以下信息：

1. **提供商名称** - 例如: "My Custom API"
2. **API 基础 URL** - 例如: `https://api.example.com/v1`
3. **API Key** - 从提供商获取的认证密钥
4. **支持的模型名** - 提供商支持的模型 ID

---

## ⚡ 5 分钟快速添加

### 步骤 1: 打开模型配置

```
1. 点击 ⚙️ 模型配置按钮
2. 选择 "API 提供商" 标签页
3. 点击 "添加提供商" 按钮
```

### 步骤 2: 填写提供商信息

| 字段 | 说明 | 示例 |
|------|------|------|
| 提供商名称 | 自定义名称 | Together AI |
| API 基础 URL | OpenAI 兼容的 v1 URL | `https://api.together.xyz/v1` |
| API Key (可选) | 单独为此提供商配置 Key | sk-xxxx... |

### 步骤 3: 验证连接

```
1. 返回 "健康检查" 标签页
2. 找到新添加的提供商
3. 点击 ⚡ 按钮进行检查
4. 确保显示 ✅ 连接正常
```

### 步骤 4: 添加模型

```
1. 选择 "对话模型" / "图片模型" / "视频模型" 标签页
2. 点击 "添加自定义模型"
3. 选择 API 提供商 → 您新添加的提供商
4. 填写模型信息
5. 点击 "添加模型"
```

---

## 🔍 常见 OpenAI 兼容提供商

### Together AI
```
提供商名称: Together AI
基础 URL: https://api.together.xyz/v1
模型示例:
├─ meta-llama/Llama-2-7b
├─ meta-llama/Llama-2-13b-hf
├─ mistralai/Mistral-7B-Instruct-v0.1
└─ togethercomputer/alpaca-7b

获取 API Key: https://www.together.ai
```

### Groq
```
提供商名称: Groq
基础 URL: https://api.groq.com/openai/v1
模型示例:
├─ mixtral-8x7b-32768
├─ llama2-70b-4096
└─ gemma-7b-it

获取 API Key: https://console.groq.com
```

### Azure OpenAI
```
提供商名称: Azure OpenAI
基础 URL: https://<resource-name>.openai.azure.com/v1
模型示例:
├─ gpt-4
├─ gpt-35-turbo
└─ text-davinci-003

获取 API Key: https://portal.azure.com
备注: 需要在 URL 中替换 <resource-name>
```

### 本地 vLLM
```
提供商名称: Local vLLM
基础 URL: http://localhost:8000/v1
模型示例: (取决于您部署的模型)
├─ meta-llama/Llama-2-7b
├─ mistralai/Mistral-7B
└─ 其他本地模型

启动 vLLM: vllm serve meta-llama/Llama-2-7b-hf
```

### 其他 OpenAI 兼容服务
```
如果提供商声称支持 OpenAI 兼容 API，通常可以这样配置:
1. 基础 URL 通常以 /v1 结尾
2. 认证方式相同 (Bearer Token)
3. 模型参数传递方式相同
```

---

## 🔧 详细配置步骤

### 步骤 1: 识别 API 基础 URL

**检查提供商的文档中的示例 curl 请求**:

```bash
curl https://api.example.com/v1/chat/completions \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "model-name",
    "messages": [...]
  }'
```

**正确的基础 URL** 是 URL 的根部分（到 `/v1`）:
- ✅ `https://api.example.com/v1`
- ❌ `https://api.example.com/v1/chat/completions`

### 步骤 2: 获取 API Key

访问提供商的控制台/账户设置，创建或复制 API Key。

### 步骤 3: 在应用中添加提供商

```
模型配置 ⚙️
  ↓
API 提供商
  ↓
点击 "添加提供商"
  ↓
填写:
  ├─ 名称: My Custom API
  ├─ URL: https://api.example.com/v1
  └─ Key: (可选)
  ↓
点击 "添加"
```

### 步骤 4: 验证

```
返回 "健康检查"
  ↓
找到新提供商
  ↓
点击 ⚡
  ↓
检查状态:
  ├─ ✅ 连接正常 → 成功！
  ├─ ⚠️ API Key 问题 → 检查 Key
  ├─ ❌ 连接失败 → 检查 URL
  └─ ⏱️ 请求超时 → 检查网络
```

### 步骤 5: 添加模型

选择模型类型后，填写:

```
API 提供商: [您刚添加的提供商]
模型名称: (自定义，例如 "My LLM")
API 模型名: (提供商的模型 ID，例如 "meta-llama/Llama-2-70b-hf")
描述: (可选)
API Key: (可选，如已在提供商级设置则留空)
```

---

## 🎯 验证 URL 格式

### 常见错误

```
❌ 错误 1: 包含了端点路径
URL: https://api.example.com/v1/chat/completions
应该: https://api.example.com/v1

❌ 错误 2: 末尾有斜杠
URL: https://api.example.com/v1/
应该: https://api.example.com/v1

❌ 错误 3: 使用了主域名而非 API 子域名
URL: https://example.com/v1
应该: https://api.example.com/v1 (如果 API 在子域)

❌ 错误 4: 缺少版本号
URL: https://api.example.com
应该: https://api.example.com/v1
```

### 如何确认

1. **查看官方文档** - 查找 "Base URL" 或 "API Endpoint" 部分
2. **查看示例代码** - 查找 curl/Python/JavaScript 示例
3. **提取基础部分** - 从示例中提取 URL 的基础部分（到 `/v1`）
4. **测试** - 在健康检查中验证

---

## 🔑 API Key 优先级

系统按以下优先级使用 API Key:

```
1. 模型级别 API Key (最高优先级)
   ├─ 在添加模型时设置
   
2. 提供商级别 API Key
   ├─ 在 API 提供商配置中设置
   
3. 全局 API Key (最低优先级)
   ├─ 在全局配置中设置
```

**推荐做法**:
- 不同的提供商 → 使用提供商级 API Key
- 同一提供商多个模型 → 设置一个提供商级 Key
- 所有模型共用一个 Key → 使用全局 Key

---

## 🧪 测试您的配置

### 使用健康检查

```
1. 打开 "健康检查" 标签页
2. 点击新提供商的 ⚡ 按钮
3. 查看结果:
   ✅ 连接正常
   ⚠️ API Key 问题
   ❌ 连接失败
   ⏱️ 请求超时
```

### 手动测试 (可选)

使用 curl 测试连接:

```bash
curl https://api.example.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-model-id",
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 10
  }'
```

应该收到成功的 JSON 响应。

---

## ❌ 常见问题排查

### 404 错误 - 端点未找到

**可能的原因**:
1. 基础 URL 包含了完整的端点路径
2. URL 格式不正确
3. 提供商不支持 OpenAI 兼容 API

**解决**:
- 检查提供商文档
- 确保 URL 只到 `/v1`
- 确认提供商支持 OpenAI 兼容格式

### 401 错误 - 认证失败

**可能的原因**:
1. API Key 无效或过期
2. API Key 没有权限
3. API Key 格式不正确

**解决**:
- 从提供商控制台重新复制 API Key
- 确保 API Key 未过期
- 检查 API Key 是否有必要的权限

### 429 错误 - 限流

**可能的原因**:
1. 请求过于频繁
2. 已达到配额限制
3. 账户等级限制

**解决**:
- 等待片刻后重试
- 检查账户配额使用情况
- 升级账户获得更高限额

---

## 📊 测试请求

健康检查会发送最小化的测试请求:

```json
{
  "model": "你的-模型-id",
  "messages": [{"role": "user", "content": "测试"}],
  "temperature": 0.1,
  "max_tokens": 10
}
```

这个请求:
- ✅ 不会产生大量成本
- ✅ 验证连接和认证
- ✅ 通常在 1-2 秒内完成
- ✅ 可能计入配额（取决于提供商）

---

## 💡 最佳实践

### 1. 选择合适的 API Key 级别
```
┌─ 全局 API Key
│  └─ 所有提供商共用一个 Key 时使用
│
├─ 提供商级 API Key
│  └─ 推荐: 每个提供商一个 Key
│
└─ 模型级 API Key
   └─ 只在需要特殊权限时使用
```

### 2. 定期验证
- 每周运行一次健康检查
- 监控响应时间变化
- 及时更新过期的 Key

### 3. 生产环境建议
- 使用提供商级或模型级 API Key (不要全局共用)
- 配置多个备份提供商
- 设置其中一个为默认提供商
- 定期监控健康状态

### 4. 文档记录
- 记录每个提供商的基础 URL
- 记录使用的模型 ID
- 记录成本和配额信息

---

## 🔗 相关资源

### 应用内指南
- [健康检查完整指南](./PROVIDER_HEALTH_CHECK.md)
- [快速参考](./QUICK_HEALTH_CHECK.md)
- [AGNES AI 配置](./AGNES_AI_SETUP.md)

### 外部资源
- [OpenAI API 文档](https://platform.openai.com/docs)
- [Together AI 文档](https://docs.together.ai)
- [Groq 文档](https://console.groq.com/docs)
- [Azure OpenAI 文档](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/)

---

## ✅ 完成清单

添加自定义提供商时，确保完成以下步骤:

- [ ] 获取提供商的 API Key
- [ ] 确认 API 基础 URL 格式正确
- [ ] 在应用中添加提供商
- [ ] 运行健康检查验证
- [ ] 添加至少一个模型
- [ ] 测试模型是否可用
- [ ] 文档记录（可选）

---

**最后更新**: 2026-06-05  
**适用版本**: v2.1.1+  
**支持的格式**: OpenAI 兼容 API
