import type { GridSettings, PaneId, PdfResolution, Rotation } from '../types';

export interface TimelinePane {
  id: PaneId; label: string; file: string | null; width: number | null; height: number | null;
  pdf?: { page: number; pageCount: number; resolution: PdfResolution };
  tiff?: { page: number; pageCount: number };
}
export interface TimelinePaneState { file: string | null; scale: number; x: number; y: number; rotation: Rotation; flipH: boolean; flipV: boolean; page: number | null }
export interface TimelineEvent { t: number; panes?: Record<PaneId, Partial<TimelinePaneState>>; grid?: GridSettings; sync?: boolean }
export interface Timeline {
  version: 1; app: 'PaneViewer'; recordedAt: string; duration: number; video: string;
  grid: GridSettings; sync: boolean; panes: TimelinePane[]; events: TimelineEvent[];
}

export interface RestoredState { grid: GridSettings; sync: boolean; panes: Map<PaneId, TimelinePaneState> }

const BASE: TimelinePaneState = { file: null, scale: 1, x: 0, y: 0, rotation: 0, flipH: false, flipV: false, page: null };

export function parseTimeline(text: string): Timeline | undefined {
  try {
    const value = JSON.parse(text) as Partial<Timeline>;
    if (!value || value.app !== 'PaneViewer' || value.version !== 1) return undefined;
    if (!Array.isArray(value.events) || !value.grid) return undefined;
    return value as Timeline;
  } catch { return undefined; }
}

// 差分の集まりなので、先頭から畳んで録画終了時点の状態を作る。
export function foldTimeline(timeline: Timeline): RestoredState {
  const panes = new Map<PaneId, TimelinePaneState>();
  let grid = timeline.grid;
  let sync = timeline.sync;
  for (const event of timeline.events) {
    if (event.grid) grid = event.grid;
    if (typeof event.sync === 'boolean') sync = event.sync;
    for (const [id, delta] of Object.entries(event.panes ?? {})) {
      panes.set(id, { ...(panes.get(id) ?? BASE), ...delta });
    }
  }
  return { grid, sync, panes };
}
