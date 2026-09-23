import type { PaneId } from '../types';

export const FOLLOW_SYNC = 'sync';
export const ALL_PANES = 'all';

// 回転・反転をどのペインに適用するか。既定は同期の状態に従う。
// 同期OFFなら操作対象は1枚だけで、ペインごとに向きを変えられる。
export function orientationTargetIds(selection: string, sync: boolean, active: PaneId, visible: PaneId[]): PaneId[] {
  if (selection === FOLLOW_SYNC) return sync ? visible : visible.includes(active) ? [active] : [];
  if (selection === ALL_PANES) return visible;
  return visible.includes(selection) ? [selection] : [];
}
