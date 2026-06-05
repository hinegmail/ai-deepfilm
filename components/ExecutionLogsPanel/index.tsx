import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { RenderLog } from '@/types';
import { setLogCallback, clearLogCallback } from '@/services/renderLogService';
import ExecutionLogItem from './ExecutionLogItem';

interface ExecutionLogsPanelProps {
  projectId: string;
}

const ExecutionLogsPanel: React.FC<ExecutionLogsPanelProps> = ({ projectId }) => {
  const [logs, setLogs] = useState<RenderLog[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // 订阅日志
  useEffect(() => {
    const handleNewLog = (log: RenderLog) => {
      setLogs((prev) => {
        // 限制日志数量，最多保留 500 条
        const newLogs = [log, ...prev];
        return newLogs.slice(0, 500);
      });

      // 自动滚动到最新
      if (isExpanded) {
        setTimeout(() => {
          logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 0);
      }
    };

    setLogCallback(handleNewLog);

    return () => {
      clearLogCallback();
    };
  }, [isExpanded]);

  return (
    <div className="flex flex-col h-full border-t border-white/10 bg-slate-950 relative z-10">
      {/* 头部：展开/收起按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/10 relative z-20 flex-shrink-0"
      >
        <span className="text-xs font-medium text-white tracking-wider uppercase">执行日志</span>
        <ChevronDown
          className={`w-4 h-4 text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 日志列表 */}
      {isExpanded && (
        <div
          ref={logsContainerRef}
          className="flex-1 overflow-y-auto bg-slate-950 relative z-20"
        >
          {logs.length > 0 ? (
            <>
              {logs.map((log) => (
                <ExecutionLogItem key={log.id} log={log} />
              ))}
              <div ref={logsEndRef} />
            </>
          ) : (
            <div className="px-4 py-6 text-center text-slate-300 text-xs">暂无日志</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExecutionLogsPanel;
