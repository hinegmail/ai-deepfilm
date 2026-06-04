# GitCC 完全移除 - 技术细节

## 问题
清除浏览器缓存后，模型配置、API 提供商和健康检查中仍然显示 GitCC API。

## 根本原因
旧的 localStorage 数据中存储的 GitCC 提供商配置被认为是"内置"(isBuiltIn: true)，因此过滤逻辑未能完全清除。

## 解决方案

### 1. 加强 loadRegistry 中的过滤（modelRegistry.ts）
```typescript
// 彻底移除任何 GitCC 相关的提供商
parsed.providers = parsed.providers.filter(p => p.id !== 'gitcc' && p.id !== 'antsk');

// 只保留存在于 BUILTIN_PROVIDERS 中的提供商（最后的防线）
parsed.providers = parsed.providers.filter(p => BUILTIN_PROVIDERS.some(bp => bp.id === p.id));
```

### 2. 在 getProviders() 处添加过滤器（双层防护）
**modelRegistry.ts:**
```typescript
export const getProviders = (): ModelProvider[] => {
  const providers = loadRegistry().providers;
  // 最后防线：过滤掉任何 GitCC 或 antsk 提供商
  return providers.filter(p => p.id !== 'gitcc' && p.id !== 'antsk');
};
```

**modelConfigService.ts:**
```typescript
export const getProviders = (): ModelProvider[] => {
  const providers = loadModelConfig().providers;
  // 过滤掉任何 GitCC 或 antsk 提供商
  return providers.filter(p => p.id !== 'gitcc' && p.id !== 'antsk');
};
```

### 3. 移除 GitCC 模型
```typescript
// 清理旧的 Veo 内置模型和任何 GitCC 模型
parsed.models = parsed.models.filter(
  m => !(m.type === 'video' && deprecatedVideoModelIds.includes(m.id)) && m.providerId !== 'gitcc'
);
```

### 4. 清理活跃模型引用
```typescript
// 清理任何 GitCC 模型引用
if (parsed.activeModels.chat?.startsWith('gitcc:')) {
  parsed.activeModels.chat = 'agnes:agnes-2.0-flash';
}
if (parsed.activeModels.image?.startsWith('gitcc:')) {
  parsed.activeModels.image = 'agnes:agnes-image-2.1-flash';
}
```

## 三层防护机制

1. **数据加载层**：loadRegistry() 在加载 localStorage 时立即过滤
2. **返回层**：getProviders() 每次调用时再次过滤
3. **UI 层**：GlobalSettings.tsx 只显示 `p.isBuiltIn` 的提供商

## 现在的行为

✅ **启动时**：自动清除任何 GitCC 配置
✅ **提供商列表**：双层过滤确保 GitCC 永不出现
✅ **健康检查**：只检查有效的提供商
✅ **模型验证**：只验证非 GitCC 模型

## 完全清除操作

用户清除缓存后应该看到：

```javascript
// 浏览器控制台
localStorage.clear();
location.reload();
```

**结果：**
- ✅ 全局配置：只显示内置提供商（AGNES AI, OpenAI 等）
- ✅ API 提供商：列表中没有 GitCC
- ✅ 健康检查：只检查 AGNES AI 等有效提供商
- ✅ 模型验证：只验证 AGNES 模型

## 验证清除成功

检查开发者工具：
```javascript
// 应该为空
console.log(localStorage.getItem('ai_manga_studio_model_registry'));

// 应该不包含任何 gitcc
console.log(JSON.parse(localStorage.getItem('ai_manga_studio_model_registry') || '{}').providers);
```

