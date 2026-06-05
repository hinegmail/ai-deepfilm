# Design Document

## 总体方案

在所有生成操作的代码中集成日志记录。采用"外包装"策略：用 try-catch 包装现有的生成调用，记录日志。

## 集成点分析

### 1. StageAssets/index.tsx - 角色和场景生成

**位置**：两处生成操作
```
第176行：const imageUrl = await generateImage(enhancedPrompt, [], aspectRatio);  // 角色参考
第562行：const imageUrl = await generateImage(...);  // 服装变体
```

**改造方案**：
```typescript
try {
  const imageUrl = await generateImage(enhancedPrompt, [], aspectRatio);
  
  // 成功 - 记录日志
  addRenderLog({
    type: 'character',
    resourceId: id,
    resourceName: characterName,
    status: 'success',
    model: modelUsed,
    duration: 耗时
  });
  
  // 现有更新逻辑
  ...
} catch (error) {
  // 失败 - 记录日志
  addRenderLog({
    type: 'character',
    resourceId: id,
    resourceName: characterName,
    status: 'failed',
    model: modelUsed,
    error: error.message,
    duration: 耗时
  });
  
  // 现有错误处理逻辑
  throw error;
}
```

### 2. StageDirector/index.tsx - 关键帧和视频生成

**位置**：两处生成操作
```
第124行：const url = await generateImage(...);  // 关键帧
第221行：const videoUrl = await generateVideo(...);  // 视频
```

**改造方案**：类似上面的 try-catch 包装

## 实现细节

### 导入必要的服务

在需要集成日志的文件中添加：
```typescript
import { addRenderLog } from '../../services/renderLogService';
```

### 获取执行时间

```typescript
const startTime = Date.now();
try {
  const result = await generateImage(...);
  const duration = Date.now() - startTime;
  // 记录日志...
} catch (error) {
  const duration = Date.now() - startTime;
  // 记录日志...
}
```

### 获取当前使用的模型

从现有的 modelRegistry 或 modelConfigService 获取：
```typescript
import { getActiveImageModel } from '../../services/modelRegistry';

const model = getActiveImageModel();
const modelName = model?.name || 'unknown';
```

### 日志类型映射

```
角色生成（character）    → 'character'
服装变体（variation）    → 'character-variation'
场景生成（scene）        → 'scene'
关键帧生成（keyframe）   → 'keyframe'
视频生成（video）        → 'video'
```

## 关键实现要点

### 1. 不改变现有逻辑

- 不修改成功时的业务逻辑
- 不改变错误处理方式
- 不修改状态更新逻辑
- 日志记录是"旁路"操作，不影响主流程

### 2. 错误消息的提取

对于不同的错误类型：
```typescript
const getErrorMessage = (error: any): string => {
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error.message) {
    return error.message;
  }
  return String(error);
};
```

### 3. 模型名称的获取

```typescript
const modelName = (() => {
  try {
    const model = getActiveImageModel();
    return model?.name || 'unknown';
  } catch {
    return 'unknown';
  }
})();
```

### 4. 资源名称的格式化

```
角色：使用 character.name
场景：使用 scene.location
服装变体：`${character.name}-${variation.name}`
关键帧：`${shot.id}-${keyframe.type}`
视频：`${shot.id}-video`
```

## 修改的文件

1. `components/StageAssets/index.tsx`
   - 修改角色生成函数（约20行）
   - 修改变体生成函数（约20行）

2. `components/StageDirector/index.tsx`
   - 修改关键帧生成函数（约20行）
   - 修改视频生成函数（约20行）

总计：约80行代码修改

## 测试策略

### 手动测试

1. **成功场景**
   - 生成角色 → 验证日志记录（status: 'success'）
   - 生成场景 → 验证日志记录
   - 生成关键帧 → 验证日志记录
   - 生成视频 → 验证日志记录

2. **失败场景**
   - 使用无效的 API Key → 验证错误被记录
   - 网络超时 → 验证错误被记录
   - API 返回错误 → 验证错误被记录

3. **完整性检查**
   - 日志包含所有必要字段
   - 执行时间（duration）准确
   - 模型名称正确
   - 错误信息清晰

## 性能考虑

- 日志记录是异步的，不阻塞主流程
- `Date.now()` 调用性能开销极小（<1ms）
- 日志记录异常不会导致生成操作失败
