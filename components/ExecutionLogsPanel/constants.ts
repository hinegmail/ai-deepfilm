import { RenderLog } from '@/types';

export const LOG_TYPE_LABELS: Record<RenderLog['type'], string> = {
  'character': '角色',
  'character-variation': '服装变体',
  'scene': '场景',
  'keyframe': '关键帧',
  'video': '视频',
  'script-parsing': '脚本解析'
};
