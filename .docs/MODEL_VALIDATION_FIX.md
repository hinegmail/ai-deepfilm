# 模型验证列表优先显示自定义模型修复

## 问题描述

在提供商健康检查中，模型验证列表显示了**所有模型**（包括内置模型和自定义模型），而不是优先显示用户已配置的自定义模型。

### 用户场景

用户为 AGNES 提供商配置了以下自定义模型：
- 对话模型：`Agnes-2.0-Flash`
- 图片模型：`Agnes Image 2.1 Flash`
- 视频模型：`Agnes-Video-V2.0`

但在健康检查的模型验证列表中，却看到了内置的默认模型：
- `AGNES 2.0 Flash` (内置)
- `AGNES 2.0 Standard` (内置)

这导致用户困惑，因为他们期望看到的是他们自己配置的模型。

## 根本原因

在 `components/ModelConfig/ProviderHealthCheck.tsx` 的 `ModelListForProvider` 子组件中，模型过滤逻辑如下：

```typescript
const models = getModels().filter(m => m.providerId === providerId);
```

这返回该提供商的**所有模型**，不区分内置模型还是自定义模型。当用户配置了自定义模型时，该列表会包含所有模型，导致视觉混乱。

## 修复方案

修改 `ModelListForProvider` 组件的模型选择逻辑，优先显示用户自定义的模型：

```typescript
// 获取该提供商的所有模型，并优先显示用户自定义模型
const allModels = getModels().filter(m => m.providerId === providerId);
const customModels = allModels.filter(m => !m.isBuiltIn);
const builtInModels = allModels.filter(m => m.isBuiltIn);

// 自定义模型排在前面，内置模型排在后面
// 如果用户有自定义模型，优先显示；否则显示内置模型
const models = customModels.length > 0 ? customModels : builtInModels;
```

### 逻辑说明

1. **获取所有模型**：根据 `providerId` 过滤，获取该提供商的所有模型
2. **区分模型类型**：将模型分为两类
   - `customModels`：用户自定义的模型（`isBuiltIn: false`）
   - `builtInModels`：系统内置的默认模型（`isBuiltIn: true`）
3. **优先显示策略**：
   - 如果用户配置了自定义模型，**只显示自定义模型**
   - 如果没有自定义模型，才显示内置的默认模型

这样用户在健康检查中就会看到他们实际配置的模型，避免混淆。

## 修改文件

- **文件**：`components/ModelConfig/ProviderHealthCheck.tsx`
- **函数**：`ModelListForProvider` 子组件
- **行数**：约 340-350 行
- **改动**：模型过滤逻辑，从返回所有模型改为优先显示自定义模型

## 构建验证

```bash
npm run build
# Exit Code: 0 ✅
# 1777 modules transformed
# 没有编译错误
```

## 用户体验改进

修复后，用户在健康检查中会看到：

### 场景 1：用户已配置自定义模型（AGNES）
- 模型验证列表显示：
  - ✅ Agnes-2.0-Flash （自定义对话模型）
  - ✅ Agnes Image 2.1 Flash （自定义图片模型）
  - ✅ Agnes-Video-V2.0 （自定义视频模型）
- **不显示**内置的 AGNES 2.0 Flash、AGNES 2.0 Standard

### 场景 2：用户没有自定义模型
- 模型验证列表显示：
  - AGNES 2.0 Flash （内置）
  - AGNES 2.0 Standard （内置）
- （作为默认选项进行验证）

## 相关文档

- [AGNES AI 设置指南](./AGNES_AI_SETUP.md)
- [自定义模型优先级](./CUSTOM_MODEL_PREFERENCE.md)
- [AGNES URL 修复](./AGNES_URL_FIX.md)

## 后续改进建议

如果需要在健康检查中显示所有模型（包括内置模型），可以添加一个 UI 开关：
- "仅显示自定义模型" / "显示所有模型"
- 这样既能满足用户只看自定义模型的需求，也能让高级用户调试内置模型

## 总结

通过优先显示自定义模型的逻辑，提高了健康检查 UI 的易用性，用户现在会看到他们实际配置的模型，而不是混淆的模型列表。

---

**更新时间**：2026-04-30  
**状态**：✅ 已修复  
**构建状态**：✅ 通过
