# 执行日志功能实现计划

## 总体规划

完整的执行日志功能分为两个规范，需要按顺序完成：

### Phase 1: 日志记录集成 ✅ 已规范化
**规范名**: `add-logging-to-generation`  
**目标**: 在所有生成操作中集成日志记录  
**工作量**: 2-3 小时  
**状态**: 规范已完成，准备实现

**包含内容**：
- 在 StageAssets/index.tsx 中添加日志记录（角色、服装变体）
- 在 StageDirector/index.tsx 中添加日志记录（关键帧、视频）
- 测试所有生成操作的日志记录功能

**关键文件**：
- `.kiro/specs/add-logging-to-generation/requirements.md` - 8个需求
- `.kiro/specs/add-logging-to-generation/design.md` - 实现细节
- `.kiro/specs/add-logging-to-generation/tasks.md` - 3个任务

---

### Phase 2: 日志显示面板 ✅ 已规范化
**规范名**: `execution-logs-panel`  
**目标**: 创建UI面板显示实时日志  
**工作量**: 4-5 小时  
**状态**: 规范已完成，需要 Phase 1 完成后才能实现

**包含内容**：
- 创建 ExecutionLogsPanel 组件
- 实时显示生成操作日志
- 区分成功/失败操作
- 展开错误信息

**关键文件**：
- `.kiro/specs/execution-logs-panel/requirements.md` - 5个需求
- `.kiro/specs/execution-logs-panel/design.md` - 组件设计
- `.kiro/specs/execution-logs-panel/tasks.md` - 5个任务

---

## 实现顺序

```
│
├─ Phase 1: add-logging-to-generation (2-3h)
│  ├─ Task 1: StageAssets 日志集成
│  ├─ Task 2: StageDirector 日志集成
│  └─ Task 3: 集成测试验证
│
└─ Phase 2: execution-logs-panel (4-5h)
   ├─ Task 1: 组件框架
   ├─ Task 2: 主组件逻辑
   ├─ Task 3: 日志项组件
   ├─ Task 4: 工具函数
   └─ Task 5: Sidebar 集成
```

**总工作量**: 6-8 小时  
**总功能**: 完整的执行日志功能（记录 + 显示）

---

## 关键依赖关系

```
Phase 2 依赖 Phase 1
      ↑
      │
   日志显示面板需要日志记录数据源
```

**不能颠倒顺序**：
- ❌ 先做 Phase 2 不行 - 日志面板没有数据显示
- ✅ 必须先做 Phase 1 - 建立日志记录基础设施

---

## 实现建议

### Phase 1 实现建议

1. **增量实现**
   - 先修改一个生成函数（如 StageAssets 的角色生成）
   - 验证日志记录工作正常
   - 再做其他生成函数

2. **测试验证**
   - 使用浏览器控制台验证日志记录
   - 生成一个资产，查看是否有日志记录
   - 用无效 API Key 测试失败场景

3. **保守修改**
   - 只添加日志记录代码，不改变现有逻辑
   - 保持现有的错误处理方式

### Phase 2 实现建议

1. **等待 Phase 1 完成**
   - 确保日志记录功能正常工作
   - 验证日志数据完整

2. **按顺序实现组件**
   - Task 1-4：组件开发
   - Task 5：集成到 Sidebar

3. **测试**
   - 生成资产时，验证日志面板实时显示
   - 测试失败操作的错误显示

---

## 当前状态

- ✅ Phase 1 规范已完成（requirements + design + tasks）
- ✅ Phase 2 规范已完成（requirements + design + tasks）
- ⏳ 待实现：Phase 1 的 3 个任务
- ⏳ 待实现：Phase 2 的 5 个任务（依赖 Phase 1 完成）

---

## 后续步骤

1. **立即开始**: Phase 1 的实现
   - 查看 `.kiro/specs/add-logging-to-generation/tasks.md`
   - 从 Task 1 开始编码

2. **Phase 1 完成后**: 开始 Phase 2
   - 查看 `.kiro/specs/execution-logs-panel/tasks.md`
   - 从 Task 1 开始编码

3. **最终验收**: 
   - 生成操作时，日志面板实时显示日志
   - 失败操作时，错误信息清晰可见
   - 功能完整，没有遗漏

---

## FAQ

**Q: 为什么分两个规范？**  
A: 因为日志记录和日志显示是独立的技术栈。分开可以各自独立验证，降低风险。

**Q: 两个规范可以并行做吗？**  
A: 不行。Phase 2 必须等待 Phase 1 完成，否则日志面板没有数据显示。

**Q: 要多久才能看到日志面板？**  
A: 总共 6-8 小时。Phase 1 约 2-3 小时，Phase 2 约 4-5 小时。

**Q: 现有功能会被破坏吗？**  
A: 不会。Phase 1 只是添加日志记录，没有改变现有的生成逻辑。
