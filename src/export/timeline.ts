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

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

// 操作ログは手で書き換えたり細工したりできるので、型と範囲の合う値だけを拾う。
// 合わない値は捨て、直前の状態を残す。倍率の範囲は画面上の操作と揃える。
export function sanitizeDelta(value: unknown): Partial<TimelinePaneState> {
  if (!isObject(value)) return {};
  const delta: Partial<TimelinePaneState> = {};
  if (typeof value.file === 'string' || value.file === null) delta.file = value.file;
  if (isFiniteNumber(value.scale) && value.scale > 0) delta.scale = Math.min(64, Math.max(0.01, value.scale));
  if (isFiniteNumber(value.x)) delta.x = value.x;
  if (isFiniteNumber(value.y)) delta.y = value.y;
  if (value.rotation === 0 || value.rotation === 90 || value.rotation === 180 || value.rotation === 270) delta.rotation = value.rotation;
  if (typeof value.flipH === 'boolean') delta.flipH = value.flipH;
  if (typeof value.flipV === 'boolean') delta.flipV = value.flipV;
  if ((Number.isInteger(value.page) && (value.page as number) >= 1) || value.page === null) delta.page = value.page as number | null;
  return delta;
}

// 差分の集まりなので、先頭から畳んで録画終了時点の状態を作る。
export function foldTimeline(timeline: Timeline): RestoredState {
  const panes = new Map<PaneId, TimelinePaneState>();
  let grid = timeline.grid;
  let sync = timeline.sync !== false;
  for (const event of timeline.events) {
    if (!isObject(event)) continue;
    if (isObject(event.grid)) grid = event.grid as unknown as GridSettings;
    if (typeof event.sync === 'boolean') sync = event.sync;
    if (!isObject(event.panes)) continue;
    for (const [id, delta] of Object.entries(event.panes)) {
      panes.set(id, { ...(panes.get(id) ?? BASE), ...sanitizeDelta(delta) });
    }
  }
  return { grid, sync, panes };
}
