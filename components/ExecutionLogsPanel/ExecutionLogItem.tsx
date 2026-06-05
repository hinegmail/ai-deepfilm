import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { RenderLog } from '@/types';
import { formatTime, getTypeLabel } from './utils';

interface ExecutionLogItemProps {
  log: RenderLog;
}

const ExecutionLogItem: React.FC<ExecutionLogItemProps> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const isSuccess = log.status === 'success';
  const Icon = isSuccess ? CheckCircle : AlertCircle;

  const handleCopyError = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (log.error) {
      navigator.clipboard.writeText(log.error).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

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
        <div className="mt-2 pt-2 border-t border-white/10 bg-slate-900/70 p-2 rounded flex flex-col gap-2">
          {/* 错误文本 - 允许选择和复制 */}
          <div 
            className="text-xs text-red-300 font-mono break-words max-h-32 overflow-auto font-medium select-all cursor-text"
            style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          >
            {log.error}
          </div>
          
          {/* 复制按钮 */}
          <button
            onClick={handleCopyError}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors w-fit"
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>复制错误</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExecutionLogItem;
