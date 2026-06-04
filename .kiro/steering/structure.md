# 项目结构与组织

## 目录布局

```
deep-comedy-pro/
├── .kiro/                          # Kiro配置
│   └── steering/                   # 指导文档
├── .docs/                          # 文档
│   └── implementation_plan_free_models.md
├── components/                     # React UI组件（按功能模块组织）
│   ├── Dashboard.tsx               # 主仪表板/项目选择器
│   ├── Sidebar.tsx                 # 导航侧边栏
│   ├── GlobalAlert.tsx             # 全局通知系统
│   ├── AspectRatioSelector.tsx     # 宽高比选择UI
│   ├── ModelSelector.tsx           # 模型选择下拉菜单
│   ├── ModelManagerTab.tsx         # 模型管理标签页
│   ├── ModelConfig/                # 模型配置模块
│   │   ├── index.tsx
│   │   ├── AddModelForm.tsx
│   │   ├── GlobalSettings.tsx
│   │   ├── ModelCard.tsx
│   │   └── ModelList.tsx
│   ├── Onboarding/                 # 新用户引导模块
│   │   ├── index.tsx
│   │   ├── WelcomePage.tsx
│   │   ├── ApiKeyPage.tsx
│   │   ├── HighlightPage.tsx
│   │   ├── ActionPage.tsx
│   │   ├── WorkflowPage.tsx
│   │   ├── ProgressDots.tsx
│   │   └── constants.ts
│   ├── StageScript/                # Phase 01: 剧情创作模块
│   │   ├── index.tsx
│   │   ├── ScriptEditor.tsx
│   │   └── [其他组件]
│   ├── StageAssets/                # Phase 02: 场景角色模块
│   │   ├── index.tsx
│   │   ├── CharacterCard.tsx
│   │   ├── SceneCard.tsx
│   │   ├── ImageUploadButton.tsx
│   │   ├── ImagePreviewModal.tsx
│   │   ├── PromptEditor.tsx
│   │   ├── WardrobeModal.tsx
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── [其他组件]
│   ├── StageDirector/              # Phase 03: AI工作台模块
│   │   ├── index.tsx
│   │   ├── ShotCard.tsx
│   │   ├── ShotWorkbench.tsx
│   │   ├── KeyframeEditor.tsx
│   │   ├── VideoGenerator.tsx
│   │   ├── EditModal.tsx
│   │   ├── ImagePreviewModal.tsx
│   │   ├── SceneContext.tsx
│   │   ├── cameraMovementGuides.ts
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── [其他组件]
│   ├── StageExport/                # Phase 04: 制片导出模块
│   │   ├── index.tsx
│   │   ├── StatusPanel.tsx
│   │   ├── TimelineVisualizer.tsx
│   │   ├── ActionButtons.tsx
│   │   ├── SecondaryOptions.tsx
│   │   ├── RenderLogsModal.tsx
│   │   ├── VideoPlayerModal.tsx
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── [其他组件]
│   ├── StagePrompts/               # 资产管理模块
│   │   ├── index.tsx
│   │   ├── CharacterSection.tsx
│   │   ├── SceneSection.tsx
│   │   ├── KeyframeSection.tsx
│   │   ├── PromptEditor.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── CollapsibleSection.tsx
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── [其他组件]
│   ├── StageScript.tsx             # Phase 01包装组件
│   ├── StageAssets.tsx             # Phase 02包装组件
│   ├── StageDirector.tsx           # Phase 03包装组件
│   ├── StageExport.tsx             # Phase 04包装组件
│   └── StagePrompts.tsx            # 资产管理包装组件
├── services/                       # 业务逻辑和外部集成
│   ├── adapters/                   # API适配器层
│   │   ├── chatAdapter.ts          # LLM/文本模型API
│   │   ├── imageAdapter.ts         # 图像生成API
│   │   └── videoAdapter.ts         # 视频生成API
│   ├── modelService.ts             # 模型调用服务
│   ├── modelRegistry.ts            # 模型配置注册表
│   ├── modelConfigService.ts       # 模型配置持久化
│   ├── geminiService.ts            # Gemini集成
│   ├── storageService.ts           # IndexedDB操作
│   ├── assetLibraryService.ts      # 角色/场景资产管理
│   ├── renderLogService.ts         # 生成日志跟踪
│   ├── exportService.ts            # 项目导出/导入
│   ├── soraVideoResolve.ts         # Sora视频模型处理
│   ├── videoHttpErrors.ts          # 视频API错误处理
│   └── mockData.ts                 # 开发用模拟数据
├── types/                          # TypeScript类型定义
│   ├── model.ts                    # 模型相关类型
│   └── [其他类型文件]
├── types.ts                        # 核心应用类型（Character、Scene、Shot、ProjectState等）
├── App.tsx                         # React根组件
├── vite.config.ts                  # Vite构建配置
├── tsconfig.json                   # TypeScript配置
├── package.json                    # 依赖和脚本
├── Dockerfile                      # Docker镜像定义
├── docker-compose.yaml             # Docker Compose编排
├── nginx.conf                      # Nginx服务器配置
├── .env.example                    # 环境变量模板
├── .gitignore                      # Git忽略规则
├── README.md                       # 项目文档
└── electron/                       # Electron主进程
    ├── main.cjs                    # 主进程入口
    └── preload.cjs                 # 预加载脚本
```

## 组件组织

### 功能模块
每个主要工作流阶段都是一个功能模块，有自己的文件夹：

- **StageScript/** - 剧本/脚本创建阶段（Phase 01）
- **StageAssets/** - 角色和场景资产生成（Phase 02）
- **StageDirector/** - 关键帧和视频创建（Phase 03）
- **StageExport/** - 预览和导出（Phase 04）
- **StagePrompts/** - 集中式资产/提示词管理

### 包装组件
每个功能都在 `components/` 根目录有对应的包装组件：
- `StageScript.tsx` → 包装 `StageScript/` 模块
- `StageAssets.tsx` → 包装 `StageAssets/` 模块
- `StageDirector.tsx` → 包装 `StageDirector/` 模块
- `StageExport.tsx` → 包装 `StageExport/` 模块
- `StagePrompts.tsx` → 包装 `StagePrompts/` 模块

### 辅助组件
- **ModelConfig/** - 模型提供商和配置管理
- **Onboarding/** - 首次用户设置流程
- 工具类：`GlobalAlert.tsx`、`Sidebar.tsx`、`Dashboard.tsx`等

## 服务层架构

### API适配器（`services/adapters/`）
为每个AI功能提供隔离的适配器模块：
- **chatAdapter.ts** - LLM API调用（文本生成、剧本解析）
- **imageAdapter.ts** - 图像生成API调用
- **videoAdapter.ts** - 视频生成API调用

每个适配器处理：
- 请求格式化
- API认证
- 错误处理
- 响应解析

### 核心服务（`services/`）
协调AI操作的高级服务：
- **modelService.ts** - 所有AI调用的主界面
- **modelRegistry.ts** - 模型配置和活跃模型跟踪
- **modelConfigService.ts** - 持久化和检索模型配置

### 数据服务
- **storageService.ts** - IndexedDB操作（项目、资产、日志的CRUD）
- **assetLibraryService.ts** - 角色和场景资产管理
- **renderLogService.ts** - 跟踪所有生成操作
- **exportService.ts** - 项目序列化和压缩

## 类型系统

### 核心类型（`types.ts`）
整个应用的主要数据结构：
- `Character` - 角色定义及其变体
- `CharacterVariation` - 服装和造型变体
- `Scene` - 位置和环境描述
- `Shot` - 单个镜头/场景及其关键帧
- `Keyframe` - 视频生成的起止帧
- `VideoInterval` - 关键帧之间的生成视频段
- `ScriptData` - 解析后的脚本（包含角色、场景、镜头）
- `ProjectState` - 整个项目的根状态
- `RenderLog` - AI生成操作记录
- `ModelProvider`、`ModelConfig` - 模型和API配置

### 扩展类型（`types/model.ts`）
模型特定的类型：
- `ChatOptions`、`ImageGenerateOptions`、`VideoGenerateOptions`
- `AspectRatio`、`VideoDuration`

## 常量组织

每个功能模块在其 `constants.ts` 文件中有模块特定的常量：
- **StageAssets/constants.ts** - 角色/场景生成默认值
- **StageDirector/constants.ts** - 相机运动、视频设置
- **StageExport/constants.ts** - 导出选项、文件格式
- **Onboarding/constants.ts** - 引导流程配置

## 工具函数组织

每个功能模块在其 `utils.ts` 文件中有辅助函数：
- **StageAssets/utils.ts** - 图像转换、提示词构建
- **StageDirector/utils.ts** - 关键帧计算、镜头操作
- **StageExport/utils.ts** - 文件导出、时间轴生成

## 数据流

```
用户操作（组件）
    ↓
组件状态更新
    ↓
调用服务层（modelService、storageService等）
    ↓
服务使用适配器（chatAdapter、imageAdapter、videoAdapter）
    ↓
调用GitCC或本地模型的API
    ↓
响应处理
    ↓
更新组件状态和IndexedDB
    ↓
UI重新渲染
```

## 存储架构

### IndexedDB存储
项目存储在浏览器IndexedDB中，结构如下：
- `projects` - 根项目文档
- `characters` - 角色定义和变体
- `scenes` - 场景/位置描述
- `shots` - 单个镜头及其关键帧
- `renderLogs` - 所有AI生成操作的历史记录
- `modelConfig` - 模型提供商和配置设置

每个操作都在renderLogs中跟踪用于审计和调试。

## 关键模式

### Props接口模式
```typescript
interface Props {
  projectId: string;
  onUpdate?: (data: UpdateData) => void;
}

const ComponentName: React.FC<Props> = ({ projectId, onUpdate }) => { ... };
```

### 服务调用模式
```typescript
const result = await modelService.generateImage({
  prompt: imagePrompt,
  aspectRatio: '16:9',
  model: 'image-model-v1'
});
```

### 状态跟踪模式
组件跟踪操作状态用于用户反馈：
- `'pending'` - 操作排队中
- `'generating'` - 操作进行中
- `'completed'` - 操作成功
- `'failed'` - 操作失败

此状态存储在每个资产上（Character、Scene、Shot、Keyframe、VideoInterval）。

## 模块间依赖关系

- **包装组件**（Stage*.tsx）依赖对应的功能模块
- **功能模块**依赖服务（modelService、storageService）
- **服务**依赖适配器和类型
- **适配器**没有内部依赖（纯API集成）
