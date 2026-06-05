import React, { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { RenderLog } from '@/types';
import { formatTime, getTypeLabel } from './utils';

interface ExecutionLogItemProps {
  log: RenderLog;
}

const ExecutionLogItem: React.FC<ExecutionLogItemProps> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSuccess = log.status === 'success';
  const Icon = isSuccess ? CheckCircle : AlertCircle;

  return (
    <div
      className={`px-3 py-2 border-b border-white/10 hover:bg-white/5 cursor-pointer transition-colors ${
        isSuccess ? 'bg-emerald-950/15' : 'bg-red-950/15'
      }`}
      onClick={() => log.error && setIsExpanded(!isExpanded)}
    >
      {/* 主行 */}
      <div className="flex items-center gap-2">
        <Icon
          className={`w-4 h-4 flex-shrink-0 ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}
        />

        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-xs tracking-wider">
            {log.resourceName}
            <span className="text-slate-300 ml-1">({getTypeLabel(log.type)})</span>
          </div>
          <div className="text-slate-400 font-medium text-[11px] mt-1">
            {formatTime(log.timestamp)} · {log.duration || 0}ms
          </div>
        </div>

        <span
          className={`text-xs font-mono font-bold flex-shrink-0 ${
            isSuccess ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {isSuccess ? '✓' : '✕'}
        </span>
      </div>

      {/* 错误信息（展开时显示）*/}
      {isExpanded && log.error && (
        <div className="mt-2 pt-2 border-t border-white/10 text-xs text-red-300 font-mono break-words max-h-32 overflow-auto bg-slate-900/70 p-2 rounded font-medium">
          {log.error}
        </div>
      )}
    </div>
  );
};

export default ExecutionLogItem;
