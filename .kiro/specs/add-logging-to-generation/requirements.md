# Requirements Document

## Introduction

生成操作日志集成是执行日志功能的基础。当前系统的所有生成操作（角色、场景、关键帧、视频等）都没有记录到日志系统中。

该功能通过在所有生成操作的代码中集成日志记录，使得：
- 每次AI生成操作都被记录到 `renderLogService`
- 成功和失败的操作都有详细的日志记录
- 后续的日志显示面板能够获取这些数据

这是实现完整执行日志功能的**必要前置条件**。

## Glossary

- **生成操作** - 调用AI API进行角色、场景、关键帧或视频生成的代码路径
- **日志记录** - 调用 `addRenderLog()` 记录操作的过程和结果
- **资源类型** - 生成对象的分类：character（角色）、character-variation（服装变体）、scene（场景）、keyframe（关键帧）、video（视频）
- **operationId** - 用于追踪操作的唯一标识符
- **renderLogService** - 管理日志的服务模块

## Requirements

### Requirement 1: 角色生成日志记录

**User Story:** 作为系统，我想在生成角色时记录日志，以便追踪每个角色的生成过程。

#### Acceptance Criteria

1. 当开始生成角色参考图时，调用 `addRenderLog()` 记录"pending"状态
2. 当生成成功时，记录"success"状态、耗时和模型信息
3. 当生成失败时，记录"failed"状态、错误信息和耗时
4. 日志包含：操作类型（'character'）、资源ID、资源名称、使用的模型
5. 日志记录不影响现有的错误处理逻辑

### Requirement 2: 服装变体生成日志记录

**User Story:** 作为系统，我想在生成服装变体时记录日志，以便追踪每个变体的生成过程。

#### Acceptance Criteria

1. 当开始生成服装变体图时，调用 `addRenderLog()` 记录日志
2. 日志类型为 'character-variation'
3. 记录操作类型、资源ID、资源名称（格式："角色名-变体名"）、模型信息
4. 成功和失败都要记录相应的状态和信息
5. 日志记录与现有错误处理逻辑兼容

### Requirement 3: 场景生成日志记录

**User Story:** 作为系统，我想在生成场景时记录日志，以便追踪每个场景的生成过程。

#### Acceptance Criteria

1. 当生成场景概念艺术时，调用 `addRenderLog()` 记录日志
2. 日志类型为 'scene'
3. 记录操作类型、资源ID、资源名称、使用的模型
4. 成功和失败都要记录相应的状态和错误信息
5. 日志记录与现有的UI更新逻辑兼容

### Requirement 4: 关键帧生成日志记录

**User Story:** 作为系统，我想在生成关键帧时记录日志，以便追踪每个关键帧的生成过程。

#### Acceptance Criteria

1. 当生成起始帧或结束帧时，调用 `addRenderLog()` 记录日志
2. 日志类型为 'keyframe'
3. 日志资源名称格式："镜头名-起始帧"或"镜头名-结束帧"
4. 记录使用的模型、提示词、执行耗时
5. 成功和失败都要记录相应的状态

### Requirement 5: 视频生成日志记录

**User Story:** 作为系统，我想在生成视频时记录日志，以便追踪每个视频段的生成过程。

#### Acceptance Criteria

1. 当生成视频段时，调用 `addRenderLog()` 记录日志
2. 日志类型为 'video'
3. 日志资源名称格式："镜头名-视频"
4. 记录使用的视频模型、提示词、执行耗时
5. 记录视频时长和宽高比等参数
6. 成功和失败都要记录

### Requirement 6: 脚本解析日志记录

**User Story:** 作为系统，我想在解析脚本时记录日志，以便追踪脚本解析的过程。

#### Acceptance Criteria

1. 当开始解析脚本时，调用 `addRenderLog()` 记录日志
2. 日志类型为 'script-parsing'
3. 资源名称为项目名称
4. 记录使用的模型和执行耗时
5. 解析成功和失败都要记录

### Requirement 7: 日志记录不影响现有功能

**User Story:** 作为一个用户，我想日志记录功能不能破坏现有的生成操作功能。

#### Acceptance Criteria

1. 生成成功的结果不变
2. 生成失败时仍然正确抛出异常
3. UI 状态更新逻辑不受影响
4. API 密钥验证错误仍然被正确处理
5. 日志记录异常不影响主流程

### Requirement 8: 错误信息的完整性

**User Story:** 作为一个调试人员，我想看到完整的错误信息，以便诊断问题原因。

#### Acceptance Criteria

1. 日志中的错误信息包含原始错误消息
2. 对于 API 错误，记录HTTP状态码和错误响应
3. 对于超时错误，记录超时时间
4. 错误信息应该对人类可读
