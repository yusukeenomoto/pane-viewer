import { renderComposite } from './screenshot';
import type { ExportOptions, GridSettings, PaneId, ViewState } from '../types';
import type { Pane } from '../pane';
import { t } from '../i18n';

const FPS = 30;
const MAX_SECONDS = 300;
const MAX_DIMENSION = 1920;

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
  container: HTMLElement;
  options: () => ExportOptions;
}

export interface RecordingResult { blob: Blob; format: RecordingFormat; seconds: number }

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
    recorder.start(1000);
    this.paint(source);
    const loop = () => { this.frame = requestAnimationFrame(loop); this.paint(source); };
    this.frame = requestAnimationFrame(loop);
    this.limit = window.setTimeout(onLimit, MAX_SECONDS * 1000);
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
    cancelAnimationFrame(this.frame);
    clearTimeout(this.limit);
    this.frame = 0;
    this.limit = 0;
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
    if (blob.size === 0) throw new Error(t('recordingEmpty'));
    return { blob, format, seconds };
  }
}
