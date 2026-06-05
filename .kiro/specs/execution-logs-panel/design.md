# Design Document

## 架构概述

```
┌─────────────────────────────┐
│     Sidebar.tsx             │
├─────────────────────────────┤
│  导航菜单项                  │
│  - 剧情创作                  │
│  - 场景角色                  │
│  - AI工作台                  │
│  - 制片导出                  │
│  - 资产管理                  │
├─────────────────────────────┤
│  [新增] ExecutionLogsPanel   │
│  - 日志列表（展开/折叠）     │
└─────────────────────────────┘
```

## 组件设计

### 主组件：ExecutionLogsPanel

**位置**: `components/ExecutionLogsPanel/`

**文件结构**:
```
components/ExecutionLogsPanel/
├── index.tsx              # 主面板组件
├── ExecutionLogItem.tsx   # 单条日志项
├── constants.ts           # 常量
└── utils.ts               # 工具函数
```

### ExecutionLogsPanel/index.tsx

核心功能：
- 订阅 `renderLogService` 的日志回调
- 管理日志列表状态（使用 useState）
- 管理面板展开/折叠状态
- 自动滚动到最新日志

```typescript
interface ExecutionLogsPanelProps {
  projectId: string;
}

const ExecutionLogsPanel: React.FC<ExecutionLogsPanelProps> = ({ projectId }) => {
  const [logs, setLogs] = useState<RenderLog[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 订阅日志
  useEffect(() => {
    const handleNewLog = (log: RenderLog) => {
      setLogs(prev => [log, ...prev]);
      setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
    };

    setLogCallback(handleNewLog);
    return () => clearLogCallback();
  }, []);

  return (
    <div className="flex flex-col h-80 border-t border-white/10 bg-slate-900/30">
      {/* 头部：展开/收起按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 flex items-center justify-between hover:bg-white/5"
      >
        <span className="text-xs font-mono uppercase text-cyan-200/70">执行日志</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* 日志列表 */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto">
          {logs.length > 0 ? (
            logs.map(log => (
              <ExecutionLogItem key={log.id} log={log} />
            ))
          ) : (
            <div className="px-4 py-6 text-center text-slate-500 text-xs">暂无日志</div>
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
};
```

### ExecutionLogItem.tsx

显示单条日志的组件，支持展开错误信息。

```typescript
interface ExecutionLogItemProps {
  log: RenderLog;
}

const ExecutionLogItem: React.FC<ExecutionLogItemProps> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSuccess = log.status === 'success';
  const Icon = isSuccess ? CheckCircle : AlertCircle;

  return (
    <div
      className={`px-3 py-2 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
        isSuccess ? 'bg-emerald-950/20' : 'bg-red-950/20'
      }`}
      onClick={() => log.error && setIsExpanded(!isExpanded)}
    >
      {/* 主行 */}
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${
          isSuccess ? 'text-emerald-400' : 'text-red-400'
        }`} />

        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-200 truncate">
            {log.resourceName}
            <span className="text-slate-500 ml-1">({getTypeLabel(log.type)})</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {formatTime(log.timestamp)} · {log.duration}ms
          </div>
        </div>

        <span className={`text-[10px] font-mono ${
          isSuccess ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {isSuccess ? '成功' : '失败'}
        </span>
      </div>

      {/* 错误信息（展开时显示）*/}
      {isExpanded && log.error && (
        <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-red-300 font-mono break-words max-h-32 overflow-auto bg-slate-900/50 p-2 rounded">
          {log.error}
        </div>
      )}
    </div>
  );
};
```

### constants.ts

```typescript
export const LOG_TYPE_LABELS: Record<RenderLog['type'], string> = {
  'character': '角色',
  'character-variation': '服装变体',
  'scene': '场景',
  'keyframe': '关键帧',
  'video': '视频',
  'script-parsing': '脚本解析'
};
```

### utils.ts

```typescript
import { RenderLog } from '../types';
import { LOG_TYPE_LABELS } from './constants';

export const getTypeLabel = (type: RenderLog['type']): string => {
  return LOG_TYPE_LABELS[type] || type;
};

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};
```

## Sidebar 集成

在 `components/Sidebar.tsx` 中导入并渲染面板：

```typescript
import ExecutionLogsPanel from './ExecutionLogsPanel';

const Sidebar: React.FC<SidebarProps> = ({ ... }) => {
  return (
    <aside className="w-72 bg-slate-950/75 ... flex flex-col z-50 ...">
      {/* 头部 */}
      {/* 导航菜单 */}
      <nav className="relative flex-1 p-4 space-y-2">
        {/* 菜单项 */}
      </nav>

      {/* [新增] 执行日志面板 */}
      <ExecutionLogsPanel projectId={projectId} />

      {/* 底部按钮 */}
      <div className="relative p-6 border-t border-white/10 space-y-3">
        {/* 新手引导、模型配置 */}
      </div>
    </aside>
  );
};
```

## 数据流

```
AI 生成操作
    ↓
renderLogService.addRenderLog()
    ↓
setLogCallback() 触发回调
    ↓
ExecutionLogsPanel 接收新日志
    ↓
setLogs() 更新状态
    ↓
UI 重新渲染 + 自动滚动
```

## 样式设计

**色彩方案**:
- 背景: `bg-slate-900/30` 与 Sidebar 一致
- 成功: `bg-emerald-950/20`、`text-emerald-400`
- 失败: `bg-red-950/20`、`text-red-400`
- 边框: `border-white/10`、`border-white/5`
- 文本: `text-slate-200`（主）、`text-slate-500`（次）

**布局**:
- 面板固定高度: 320px (`h-80`)
- 日志列表可滚动
- 头部固定

## 性能考虑

1. 日志列表使用虚拟滚动（可选）：如果日志超过 200 条
2. 日志上限：内存中保留最多 500 条日志
3. 自动清理：超过限制时删除最旧的日志
