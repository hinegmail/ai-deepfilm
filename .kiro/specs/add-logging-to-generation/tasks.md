# Implementation Tasks

## 任务总览

完成以下3个任务来集成日志记录功能。总工作量约 2-3 小时。

---

## Task 1: 在 StageAssets 中添加日志记录

**优先级**: 🔴 高  
**预估时间**: 1 小时  
**依赖**: 无

### 目标

为 StageAssets/index.tsx 中的角色和服装变体生成操作集成日志记录。

### 验收标准

- [ ] 导入 `addRenderLog` 和模型相关服务
- [ ] 角色参考图生成被日志记录（第176行附近）
- [ ] 服装变体生成被日志记录（第562行附近）
- [ ] 成功和失败都有对应的日志记录
- [ ] 日志包含：type、resourceId、resourceName、status、model、duration、error（失败时）
- [ ] 现有的错误处理逻辑保持不变
- [ ] 编译无错误，TypeScript 检查通过

### 实现要点

1. 在文件头添加导入：
   ```typescript
   import { addRenderLog } from '../../services/renderLogService';
   ```

2. 在两个 `generateImage` 调用处添加 try-catch 和日志记录：
   ```typescript
   const startTime = Date.now();
   try {
     const imageUrl = await generateImage(...);
     const duration = Date.now() - startTime;
     
     addRenderLog({
       type: 'character', // 或 'character-variation'
       resourceId: id,
       resourceName: characterName,
       status: 'success',
       model: modelName,
       duration
     });
     // 现有成功处理逻辑...
   } catch (error) {
     const duration = Date.now() - startTime;
     
     addRenderLog({
       type: 'character',
       resourceId: id,
       resourceName: characterName,
       status: 'failed',
       model: modelName,
       error: error.message || String(error),
       duration
     });
     // 现有错误处理逻辑...
     throw error;
   }
   ```

### 代码检查清单

- [ ] 所有 try-catch 块正确嵌套
- [ ] 没有改变现有的业务逻辑
- [ ] 错误被正确重新抛出
- [ ] resourceName 包含有意义的信息
- [ ] model 名称正确获取

---

## Task 2: 在 StageDirector 中添加日志记录

**优先级**: 🔴 高  
**预估时间**: 1 小时  
**依赖**: Task 1

### 目标

为 StageDirector/index.tsx 中的关键帧和视频生成操作集成日志记录。

### 验收标准

- [ ] 导入 `addRenderLog` 和必要的服务
- [ ] 关键帧生成被日志记录（第124行附近）
- [ ] 视频生成被日志记录（第221行附近）
- [ ] 成功和失败都有对应的日志记录
- [ ] 日志包含所有必要字段
- [ ] 现有的UI更新逻辑保持不变
- [ ] 编译无错误

### 实现要点

1. 导入必要的服务
2. 关键帧日志类型为 'keyframe'
3. 视频日志类型为 'video'
4. 资源名称格式：`${shotId}-${frameType}` 或 `${shotId}-video`

### 代码检查清单

- [ ] 两个生成操作都有日志记录
- [ ] 日志类型正确
- [ ] 错误处理完整
- [ ] 没有改变现有逻辑

---

## Task 3: 集成测试与验证

**优先级**: 🟡 中  
**预估时间**: 1 小时  
**依赖**: Task 1、Task 2

### 目标

验证日志记录功能正确工作，并确保没有破坏现有功能。

### 验收标准

- [ ] 生成角色时有日志记录（可通过浏览器控制台验证）
- [ ] 生成场景时有日志记录
- [ ] 生成关键帧时有日志记录
- [ ] 生成视频时有日志记录
- [ ] 成功生成的结果不变
- [ ] 生成失败时仍然显示错误提示
- [ ] 没有控制台错误或警告

### 测试清单

1. **成功场景**
   - [ ] 生成一个角色 → 检查日志中有 'success' 记录
   - [ ] 生成一个场景 → 检查日志
   - [ ] 生成一个关键帧 → 检查日志
   - [ ] 生成一个视频 → 检查日志

2. **失败场景**
   - [ ] 使用无效 API Key → 检查日志中有 'failed' 和错误信息
   - [ ] 网络异常 → 检查日志记录

3. **完整性检查**
   - [ ] 每条日志包含 type、resourceId、resourceName、status、model
   - [ ] duration 字段准确
   - [~] 失败日志包含 error 字段

### 日志验证方法

由于还没有日志显示面板，可以通过以下方式验证：

1. **浏览器控制台** - 添加临时的 console.log：
   ```typescript
   addRenderLog({...});
   console.log('Log recorded:', {...});  // 临时调试
   ```

2. **使用 setLogCallback** - 创建临时的日志收集器：
   ```typescript
   const logs = [];
   setLogCallback(log => {
     logs.push(log);
     console.log('New log:', log);
   });
   ```

3. **验证无影响** - 确保生成操作仍然正常工作

---

## 任务完成顺序

```
Task 1 (1h)
    ↓
Task 2 (1h)
    ↓
Task 3 (1h) - 测试和验证
```

**总工作量**: 2-3 小时

---

## 完成后的检查清单

- ✅ 所有生成操作都集成了日志记录
- ✅ 日志包含完整的操作信息
- ✅ 成功和失败都有记录
- ✅ 现有功能保持不变
- ✅ 没有引入新的错误
- ✅ 代码风格与项目一致

---

## 开发建议

1. **增量开发** - 先做 Task 1 的一个函数，测试成功后再做另一个
2. **保守改动** - 只添加日志记录代码，不修改其他部分
3. **充分测试** - 每个地方都应该手动测试一次
4. **保留调试代码** - Task 3 中的 console.log 可以保留到日志面板做好为止

---

## 与后续规范的关系

完成这个规范后，日志记录功能就准备好了。接下来可以：

1. 创建 ExecutionLogsPanel 组件来显示这些日志
2. 在 Sidebar 中展示实时日志
3. 用户就能看到生成操作的详细信息
