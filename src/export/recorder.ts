import { renderComposite } from './screenshot';
import type { ExportOptions, GridSettings, PaneId, ViewState } from '../types';
import type { Timeline, TimelineEvent, TimelinePane, TimelinePaneState } from './timeline';
import type { Pane } from '../pane';
import { t } from '../i18n';

const FPS = 30;
const MAX_SECONDS = 300;
const MAX_DIMENSION = 1920;
const SAMPLE_MS = 100;
const EPSILON = 1e-6;

const CANDIDATES: RecordingFormat[] = [
  { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4' },
  { mimeType: 'video/mp4', extension: 'mp4' },
  { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
  { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
  { mimeType: 'video/webm', extension: 'webm' },
];

export interface RecordingFormat { mimeType: string; extension: 'mp4' | 'webm' }

export interface RecorderSource {
  panes: () => Pane[];
  getView: (id: PaneId) => ViewState;
  grid: () => GridSettings;
  sync: () => boolean;
  container: HTMLElement;
  options: () => ExportOptions;
}

export interface RecordingResult { blob: Blob; format: RecordingFormat; seconds: number; timeline: Timeline }

const round = (value: number, digits: number) => { const factor = 10 ** digits; return Math.round(value * factor) / factor; };

function paneRoster(pane: Pane): TimelinePane {
  const asset = pane.asset;
  const entry: TimelinePane = { id: pane.id, label: pane.label, file: asset?.name ?? null, width: asset?.width ?? null, height: asset?.height ?? null };
  if (asset?.pdf) entry.pdf = { page: asset.pdf.page, pageCount: asset.pdf.pageCount, resolution: asset.pdf.resolution };
  if (asset?.tiff) entry.tiff = { page: asset.tiff.page + 1, pageCount: asset.tiff.pages.length };
  return entry;
}

// ドラッグ中は scale/x/y が微量に動き続けるため、書き出す桁に丸めてから差分を取る。
function paneState(pane: Pane, view: ViewState): TimelinePaneState {
  const asset = pane.asset;
  return {
    file: asset?.name ?? null, scale: round(view.scale, 3), x: round(view.x, 1), y: round(view.y, 1),
    rotation: pane.orientation.rotation, flipH: pane.orientation.flipH, flipV: pane.orientation.flipV,
    page: asset?.pdf ? asset.pdf.page : asset?.tiff ? asset.tiff.page + 1 : null,
  };
}

function paneDelta(before: TimelinePaneState, after: TimelinePaneState) {
  const delta: Partial<TimelinePaneState> = {};
  if (Math.abs(after.scale - before.scale) > EPSILON) delta.scale = after.scale;
  if (Math.abs(after.x - before.x) > EPSILON) delta.x = after.x;
  if (Math.abs(after.y - before.y) > EPSILON) delta.y = after.y;
  if (after.rotation !== before.rotation) delta.rotation = after.rotation;
  if (after.flipH !== before.flipH) delta.flipH = after.flipH;
  if (after.flipV !== before.flipV) delta.flipV = after.flipV;
  if (after.file !== before.file) delta.file = after.file;
  if (after.page !== before.page) delta.page = after.page;
  return delta;
}

// MP4 を優先するのは、WebM が QuickTime や PowerPoint で再生できないため。
export function supportedFormat(): RecordingFormat | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return undefined;
  return CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType));
}

const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);

export class SessionRecorder {
  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private frame = 0;
  private limit = 0;
  private startedAt = 0;
  private format?: RecordingFormat;
  private source?: RecorderSource;
  private sampler = 0;
  private timeline?: Timeline;
  private states = new Map<PaneId, TimelinePaneState>();
  private last?: { grid: GridSettings; sync: boolean };

  get recording() { return this.recorder?.state === 'recording'; }

  get elapsed() { return this.recording ? (performance.now() - this.startedAt) / 1000 : 0; }

  start(source: RecorderSource, onLimit: () => void) {
    if (this.recording) return;
    const format = supportedFormat();
    if (!format) throw new Error(t('recordingUnsupported'));
    const rect = source.container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) throw new Error(t('recordingNoArea'));

    const dpr = window.devicePixelRatio || 1;
    const fit = Math.min(1, MAX_DIMENSION / (Math.max(rect.width, rect.height) * dpr));
    const canvas = document.createElement('canvas');
    canvas.width = even(rect.width * dpr * fit);
    canvas.height = even(rect.height * dpr * fit);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(t('canvasInit'));

    const stream = canvas.captureStream(FPS);
    const bitrate = Math.min(16_000_000, Math.max(2_000_000, Math.round(canvas.width * canvas.height * FPS * 0.12)));
    const recorder = new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: bitrate });
    recorder.ondataavailable = (event) => { if (event.data.size > 0) this.chunks.push(event.data); };

    this.canvas = canvas;
    this.ctx = ctx;
    this.chunks = [];
    this.format = format;
    this.recorder = recorder;
    this.startedAt = performance.now();
    this.source = source;
    this.states = new Map();
    this.last = undefined;
    this.timeline = { version: 1, app: 'PaneViewer', recordedAt: new Date().toISOString(), duration: 0, video: '', grid: source.grid(), sync: source.sync(), panes: source.panes().map(paneRoster), events: [] };
    recorder.start(1000);
    this.paint(source);
    const loop = () => { this.frame = requestAnimationFrame(loop); this.paint(source); };
    this.frame = requestAnimationFrame(loop);
    this.limit = window.setTimeout(onLimit, MAX_SECONDS * 1000);
    // 操作ログは rAF と切り離し、フレームレートが落ちても一定間隔で取る。
    this.tick();
    this.sampler = window.setInterval(() => this.tick(), SAMPLE_MS);
  }

  private tick() {
    try { this.sample(); } catch { /* 操作ログを取りこぼしても録画は続ける */ }
  }

  private sample() {
    const timeline = this.timeline;
    const source = this.source;
    if (!timeline || !source) return;
    const grid = source.grid();
    const sync = source.sync();
    const states = new Map(source.panes().map((pane) => [pane.id, paneState(pane, source.getView(pane.id))] as const));
    const panes: Record<PaneId, Partial<TimelinePaneState>> = {};
    for (const [id, state] of states) {
      const before = this.states.get(id);
      const delta = before ? paneDelta(before, state) : { ...state };
      if (Object.keys(delta).length > 0) panes[id] = delta;
    }
    const last = this.last;
    const event: TimelineEvent = { t: last ? round(this.elapsed, 2) : 0 };
    if (Object.keys(panes).length > 0) event.panes = panes;
    if (!last || grid.rows !== last.grid.rows || grid.columns !== last.grid.columns) event.grid = grid;
    if (!last || sync !== last.sync) event.sync = sync;
    this.states = states;
    this.last = { grid, sync };
    if (last && !event.panes && !event.grid && event.sync === undefined) return;
    timeline.events.push(event);
  }

  private paint(source: RecorderSource) {
    const canvas = this.canvas;
    const ctx = this.ctx;
    if (!canvas || !ctx) return;
    const rect = source.container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const options = source.options();
    // 動画にアルファはないため、透明背景は暗背景として描く。
    const solid: ExportOptions = options.background === 'transparent' ? { ...options, background: 'dark' } : options;
    // 出力サイズは録画開始時に固定されるので、途中でウィンドウが変わっても収まるよう縮めて中央に置く。
    const scale = Math.min(canvas.width / rect.width, canvas.height / rect.height);
    ctx.fillStyle = solid.background === 'light' ? '#f6f7fb' : '#151923';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    renderComposite(ctx, source.panes(), source.getView, source.grid(), source.container, solid, {
      scale,
      offsetX: (canvas.width - rect.width * scale) / 2,
      offsetY: (canvas.height - rect.height * scale) / 2,
    });
  }

  async stop(): Promise<RecordingResult> {
    const recorder = this.recorder;
    const format = this.format;
    if (!recorder || !format) throw new Error(t('recordingNotStarted'));
    const seconds = this.elapsed;
    this.tick();
    cancelAnimationFrame(this.frame);
    clearTimeout(this.limit);
    clearInterval(this.sampler);
    this.frame = 0;
    this.limit = 0;
    this.sampler = 0;
    const timeline = this.timeline!;
    timeline.duration = round(seconds, 2);
    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(this.chunks, { type: format.mimeType }));
      recorder.onerror = () => reject(new Error(t('recordingError', { message: t('recordingFailed') })));
      if (recorder.state === 'inactive') resolve(new Blob(this.chunks, { type: format.mimeType }));
      else recorder.stop();
    });
    for (const track of recorder.stream.getTracks()) track.stop();
    this.recorder = undefined;
    this.canvas = undefined;
    this.ctx = undefined;
    this.chunks = [];
    this.source = undefined;
    this.timeline = undefined;
    this.states = new Map();
    this.last = undefined;
    if (blob.size === 0) throw new Error(t('recordingEmpty'));
    return { blob, format, seconds, timeline };
  }
}
