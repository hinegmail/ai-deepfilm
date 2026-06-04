# AGNES AI 集成指南

## 🎯 概览

AGNES AI 是一个强大的多模态 AI 平台，已集成到 AI 漫剧工场的提供商系统中。

**支持的模型**:
- AGNES 2.0 Flash (快速、轻量级)
- AGNES 2.0 Standard (标准性能)

**官方文档**: https://apihub.agnes-ai.com

---

## ⚡ 快速开始 (5 分钟)

### 步骤 1: 获取 API Key

1. 访问 [AGNES AI 控制台](https://apihub.agnes-ai.com)
2. 注册或登录账户
3. 进入 "API Keys" 部分
4. 创建新的 API Key
5. 复制 API Key

### 步骤 2: 在应用中配置

1. 打开 AI 漫剧工场
2. 点击 ⚙️ **模型配置**
3. 选择 **"全局配置"** 标签页
4. 粘贴您的 API Key
5. 点击 **"验证 API Key"** 确认有效

### 步骤 3: 选择 AGNES 模型

1. 在 **"对话模型"** 标签页中
2. 查看 AGNES 可用的模型:
   - ✅ AGNES 2.0 Flash - 快速响应
   - ✅ AGNES 2.0 Standard - 标准性能
3. 选择要使用的模型

### 步骤 4: 验证连接

1. 返回 **"健康检查"** 标签页
2. 点击 AGNES AI 右侧的 ⚡ 按钮
3. 等待检查完成
4. 查看结果:
   - ✅ 连接正常 → 可以开始使用
   - ⚠️ API Key 问题 → 重新检查 API Key
   - ❌ 连接失败 → 查看故障排除部分

---

## 📋 API 配置详情

### API 端点

```
基础 URL: https://apihub.agnes-ai.com/v1
聊天端点: /v1/chat/completions
模型参数: model (必需)
认证方式: Bearer Token (Authorization 头)
```

### 正确的 URL 格式

```
正确: https://apihub.agnes-ai.com/v1
错误: https://apihub.agnes-ai.com (缺少 /v1)
错误: https://apihub.agnes-ai.com/v1/chat/completions (不要包含端点路径)
```

### 请求示例

```bash
curl https://apihub.agnes-ai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-2.0-flash",
    "messages": [
      {
        "role": "user",
        "content": "What is the weather like in Singapore today?"
      }
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get the current weather for a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "The city and country"
              }
            },
            "required": ["location"]
          }
        }
      }
    ]
  }'
```

---

## 🔧 可用模型

### AGNES 2.0 Flash
- **ID**: `agnes:agnes-2.0-flash`
- **API 模型名**: `agnes-2.0-flash`
- **特点**:
  - 快速响应时间
  - 轻量级处理
  - 成本效益高
  - 适合实时应用
- **推荐用途**:
  - 实时对话
  - 快速原型
  - 成本敏感应用

### AGNES 2.0 Standard
- **ID**: `agnes:agnes-2.0-standard`
- **API 模型名**: `agnes-2.0-standard`
- **特点**:
  - 标准性能和准确度
  - 平衡的响应时间
  - 通用用途
- **推荐用途**:
  - 常规对话
  - 内容生成
  - 数据分析

---

## 🔍 故障排除

### 问题 1: 404 端点未找到

**错误信息**:
```
检查失败: 端点未找到 (404): 请检查 API 基础 URL
```

**原因**:
- 基础 URL 配置不正确
- 使用了 `/chat/completions` 完整路径而不是基础 URL

**解决方案**:
```
❌ 错误: https://apihub.agnes-ai.com
❌ 错误: https://apihub.agnes-ai.com/v1/chat/completions

✅ 正确: https://apihub.agnes-ai.com/v1
```

### 问题 2: 401 认证失败

**错误信息**:
```
检查失败: 认证失败 (401): API Key 可能无效或已过期
```

**原因**:
- API Key 无效或已过期
- API Key 没有权限
- API Key 未正确传递

**解决方案**:
1. 访问 AGNES AI 控制台检查 API Key
2. 确保 API Key 未被禁用
3. 在全局配置中重新输入 API Key
4. 重新验证

### 问题 3: 请求超时

**错误信息**:
```
检查失败: 请求超时 (10秒): 网络连接可能有问题
```

**原因**:
- 网络连接缓慢
- AGNES 服务器响应缓慢
- 防火墙阻止

**解决方案**:
1. 检查网络连接速度
2. 稍后重试
3. 检查防火墙/代理设置
4. 尝试不同的网络环境

### 问题 4: 限流 (429)

**错误信息**:
```
检查失败: 请求过于频繁 (429): 限流中
```

**原因**:
- 超过 API 速率限制
- 配额已用尽

**解决方案**:
1. 稍后重试
2. 升级 AGNES AI 账户获取更高限额
3. 检查账户配额使用情况

---

## 💡 最佳实践

### 1. API Key 管理
- ✅ 定期检查 API Key 的有效性
- ✅ 创建多个 API Key 用于不同用途
- ✅ 在开发和生产环境中使用不同的 Key
- ❌ 不要在代码中硬编码 API Key
- ❌ 不要将 API Key 分享给他人

### 2. 模型选择
- 使用 **Flash** 模型用于:
  - 快速响应需求的应用
  - 成本敏感的场景
  - 实时交互

- 使用 **Standard** 模型用于:
  - 需要更高准确度的任务
  - 复杂的推理
  - 生产环境

### 3. 工具调用 (Function Calling)
- AGNES 支持工具定义
- 可用于扩展功能
- 详见官方示例代码

### 4. 定期验证
- 每周运行一次健康检查
- 监控响应时间
- 及时更新过期的 API Key

---

## 📊 性能参考

### 响应时间

| 模型 | 平均响应时间 | 质量 |
|------|------------|------|
| Flash | 200-500ms | ⭐⭐⭐⭐ |
| Standard | 300-800ms | ⭐⭐⭐⭐⭐ |

### 配额限制

具体的速率限制和配额依据您的账户级别而定。访问 [AGNES AI 控制台](https://apihub.agnes-ai.com) 查看您的配额情况。

---

## 🔗 相关资源

### 官方
- [AGNES AI 官网](https://apihub.agnes-ai.com)
- [AGNES AI 文档](https://apihub.agnes-ai.com/docs)
- [API 参考](https://apihub.agnes-ai.com/api-reference)

### 应用内
- [快速健康检查指南](./QUICK_HEALTH_CHECK.md)
- [完整健康检查指南](./PROVIDER_HEALTH_CHECK.md)
- [API 提供商快速开始](./QUICK_START_PROVIDERS.md)

---

## ❓ 常见问题

### Q: 能否同时使用多个 AGNES 模型?
**A**: 是的，可以在模型列表中配置多个 AGNES 模型，并在需要时切换。

### Q: AGNES 支持流式响应吗?
**A**: 支持。详见官方文档的 stream 参数说明。

### Q: 能否使用自定义提供商添加其他 AGNES 端点?
**A**: 可以。如果有私有部署，可以在 "API 提供商" 中添加自定义提供商，使用您的私有端点。

### Q: API Key 在哪里可以找到?
**A**: 登录 [AGNES AI 控制台](https://apihub.agnes-ai.com) → 账户设置 → API Keys

### Q: 如何升级账户获得更高配额?
**A**: 登录 AGNES AI 控制台，进入计费部分选择升级计划。

### Q: 错误信息中说 URL 不正确，但我觉得配置是对的?
**A**: 确保 URL 末尾 **没有** `/chat/completions` 或其他端点路径。基础 URL 应该是: `https://apihub.agnes-ai.com/v1`

---

## 📞 获取帮助

1. **应用内诊断**: 使用健康检查功能快速诊断问题
2. **官方支持**: 访问 AGNES AI 官网获得官方支持
3. **文档**: 查看本文档和其他集成指南

---

**最后更新**: 2026-06-05  
**集成状态**: ✅ 完成  
**支持模型**: AGNES 2.0 Flash, Standard  
**构建版本**: v2.1.1+
