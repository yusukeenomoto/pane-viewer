import { DEFAULT_VIEW } from './types';
import type { GridDimension, GridSettings, PaneId, PdfResolution, ViewState } from './types';

const key = 'image-viewer.settings.v1';
export interface Settings extends GridSettings { sync: boolean; pdfResolution: PdfResolution }

const DEFAULT_GRID: GridSettings = { rows: 1, columns: 2 };
const DEFAULT_PDF_RESOLUTION: PdfResolution = 144;

function dimension(value: unknown, fallback: GridDimension): GridDimension {
  const number = Number(value);
  return number === 1 || number === 2 || number === 3 ? number : fallback;
}

function pdfResolution(value: unknown, fallback: PdfResolution): PdfResolution {
  const number = Number(value);
  return number === 72 || number === 96 || number === 144 || number === 216 || number === 300 ? number : fallback;
}

export function getSettings(): Settings {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '{}');
    const legacyGrid = value.layout === 'vertical' ? { rows: 2, columns: 1 } : DEFAULT_GRID;
    return {
      sync: value.sync !== false,
      rows: dimension(value.rows, legacyGrid.rows as GridDimension),
      columns: dimension(value.columns, legacyGrid.columns as GridDimension),
      pdfResolution: pdfResolution(value.pdfResolution, DEFAULT_PDF_RESOLUTION),
    };
  } catch { return { sync: true, ...DEFAULT_GRID, pdfResolution: DEFAULT_PDF_RESOLUTION }; }
}
export function saveSettings(settings: Settings) {
  try { localStorage.setItem(key, JSON.stringify(settings)); } catch { /* storage is optional */ }
}

export class ViewStore {
  sync: boolean;
  rows: GridDimension;
  columns: GridDimension;
  views: Record<PaneId, ViewState>;
  active: PaneId = 'pane-0';
  constructor(settings: Settings, private readonly paneIds: PaneId[], private readonly onChange: () => void) {
    this.sync = settings.sync;
    this.rows = settings.rows;
    this.columns = settings.columns;
    this.views = Object.fromEntries(paneIds.map((id) => [id, { ...DEFAULT_VIEW }])) as Record<PaneId, ViewState>;
    this.active = paneIds[0] ?? 'pane-0';
  }
  get grid(): GridSettings { return { rows: this.rows, columns: this.columns }; }
  current(id: PaneId) { return this.views[id]; }
  update(id: PaneId, update: (view: ViewState) => void) {
    const view = this.views[id];
    const before = { ...view };
    update(view);
    if (this.sync) this.broadcast(id, before, view);
    this.active = id; this.onChange();
  }
  // 同期中は、操作したペインに起きた変化と同じ変換を他のペインにも掛ける。
  // 位置や倍率そのものを配らないので、ペインごとのずれは保たれる。
  private broadcast(source: PaneId, before: ViewState, after: ViewState) {
    const factor = before.scale === 0 ? 1 : after.scale / before.scale;
    const zoomed = Math.abs(factor - 1) > 1e-9;
    // 拡大縮小なら、変化前後から「動かなかった点」を割り出して他のペインにも同じ点を使う。
    const centerX = zoomed ? (after.x - before.x * factor) / (1 - factor) : 0;
    const centerY = zoomed ? (after.y - before.y * factor) / (1 - factor) : 0;
    for (const id of this.paneIds) {
      if (id === source) continue;
      const view = this.views[id];
      if (!zoomed) { view.x += after.x - before.x; view.y += after.y - before.y; continue; }
      const next = Math.min(64, Math.max(0.01, view.scale * factor));
      const applied = next / view.scale;
      view.x = centerX - (centerX - view.x) * applied;
      view.y = centerY - (centerY - view.y) * applied;
      view.scale = next;
    }
  }
  // 他ペインへ配らずに1枚だけ差し替える。操作ログからの復元と Fit で使う。
  set(id: PaneId, view: ViewState) { this.views[id] = { ...view }; this.onChange(); }
  // アクティブなペインの表示状態を全ペインへ複製する。ずれをまとめて解消する手段。
  alignTo(id: PaneId) {
    const source = this.views[id] ?? DEFAULT_VIEW;
    for (const other of this.paneIds) if (other !== id) this.views[other] = { ...source };
    this.onChange();
  }
  setSync(enabled: boolean) { this.sync = enabled; this.onChange(); }
  setGrid(rows: GridDimension, columns: GridDimension) { this.rows = rows; this.columns = columns; this.onChange(); }
  swap(first: PaneId, second: PaneId) {
    if (first === second) return;
    const view = this.views[first];
    this.views[first] = this.views[second];
    this.views[second] = view;
    this.active = second;
    this.onChange();
  }
}
