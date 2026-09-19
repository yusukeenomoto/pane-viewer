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
  shared: ViewState = { scale: 1, x: 0, y: 0 };
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
  current(id: PaneId) { return this.sync ? this.shared : this.views[id]; }
  update(id: PaneId, update: (view: ViewState) => void) {
    const view = this.current(id); update(view); this.active = id; this.onChange();
  }
  setSync(enabled: boolean) {
    if (enabled && !this.sync) this.shared = { ...(this.views[this.active] ?? DEFAULT_VIEW) };
    if (!enabled && this.sync) this.views = Object.fromEntries(this.paneIds.map((id) => [id, { ...this.shared }])) as Record<PaneId, ViewState>;
    this.sync = enabled; this.onChange();
  }
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
