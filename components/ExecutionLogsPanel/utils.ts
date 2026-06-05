import { RenderLog } from '@/types';
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
