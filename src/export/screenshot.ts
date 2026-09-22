import { orientedSize } from '../utils/orientation';
import { transformCss } from '../utils/orientation';
import type { ExportOptions, GridSettings, PaneId, ViewState } from '../types';
import type { Pane } from '../pane';
import { t } from '../i18n';

function color(background: ExportOptions['background'], format: ExportOptions['format']) {
  if (background === 'transparent' && format === 'image/png') return undefined;
  return background === 'light' ? '#f6f7fb' : '#151923';
}

function drawPane(ctx: CanvasRenderingContext2D, pane: Pane, view: ViewState, x: number, y: number, width: number, height: number, options: ExportOptions, scale: number) {
  const fill = color(options.background, options.format); if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, width, height); }
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.imageSmoothingEnabled = view.scale < 2;
  ctx.beginPath(); ctx.rect(0, 0, width / scale, height / scale); ctx.clip();
  if (pane.asset) {
    const asset = pane.asset; const o = pane.orientation; const output = orientedSize(asset.width, asset.height, o);
    ctx.translate(view.x, view.y); ctx.scale(view.scale, view.scale); ctx.translate(output.width / 2, output.height / 2); ctx.rotate(o.rotation * Math.PI / 180); ctx.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1); ctx.translate(-asset.width / 2, -asset.height / 2); ctx.drawImage(asset.image, 0, 0);
  }
  ctx.restore();
  if (options.labels) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0, 0, width / scale, 27);
    ctx.fillStyle = '#fff'; ctx.font = '12px system-ui, sans-serif'; ctx.textBaseline = 'middle';
    ctx.fillText(`${pane.asset?.name ?? t('noImageLabel')}  ·  ${Math.round(view.scale * 100)}%`, 10, 14);
    ctx.restore();
  }
}

export interface CompositePlacement { scale: number; offsetX: number; offsetY: number }

export function renderComposite(ctx: CanvasRenderingContext2D, panes: Pane[], getView: (id: PaneId) => ViewState, grid: GridSettings, container: HTMLElement, options: ExportOptions, placement: CompositePlacement) {
  const containerRect = container.getBoundingClientRect();
  const { scale, offsetX, offsetY } = placement;
  const width = containerRect.width;
  const height = containerRect.height;
  const fill = color(options.background, options.format); if (fill) { ctx.fillStyle = fill; ctx.fillRect(offsetX, offsetY, width * scale, height * scale); }
  for (const pane of panes) {
    const rect = pane.rect;
    if (rect.width <= 0 || rect.height <= 0) continue;
    drawPane(ctx, pane, getView(pane.id), offsetX + (rect.left - containerRect.left) * scale, offsetY + (rect.top - containerRect.top) * scale, rect.width * scale, rect.height * scale, options, scale);
  }
  if (options.divider) {
    const style = getComputedStyle(container);
    const gapX = Number.parseFloat(style.columnGap) || 0;
    const gapY = Number.parseFloat(style.rowGap) || 0;
    const cellWidth = (width - gapX * (grid.columns - 1)) / grid.columns;
    const cellHeight = (height - gapY * (grid.rows - 1)) / grid.rows;
    ctx.fillStyle = options.background === 'light' ? '#727987' : '#a7afbf';
    for (let column = 1; column < grid.columns; column++) {
      const x = (cellWidth + gapX) * column - gapX / 2;
      ctx.fillRect(offsetX + Math.round(x * scale) - 1, offsetY, 2, height * scale);
    }
    for (let row = 1; row < grid.rows; row++) {
      const y = (cellHeight + gapY) * row - gapY / 2;
      ctx.fillRect(offsetX, offsetY + Math.round(y * scale) - 1, width * scale, 2);
    }
  }
}

export async function makeScreenshot(panes: Pane[], getView: (id: PaneId) => ViewState, grid: GridSettings, container: HTMLElement, options: ExportOptions) {
  const containerRect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas'); canvas.width = Math.round(containerRect.width * dpr); canvas.height = Math.round(containerRect.height * dpr);
  const ctx = canvas.getContext('2d')!;
  const fill = color(options.background, options.format); if (fill) { ctx.fillStyle = fill; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  renderComposite(ctx, panes, getView, grid, container, options, { scale: dpr, offsetX: 0, offsetY: 0 });
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(t('screenshotError'))), options.format, options.format === 'image/jpeg' ? 0.92 : undefined));
}

export function download(blob: Blob, extension: 'png' | 'jpg' | 'mp4' | 'webm') {
  const date = new Date(); const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `compare_${stamp}.${extension}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
