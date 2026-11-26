import { cloneImageAsset, createPdfPageAsset, loadImage, selectPdfPage, selectTiffPage } from './loader/loadImage';
import { orientedSize, orientedToOriginal, originalToOriented, transformCss } from './utils/orientation';
import { isTrackpadScroll } from './utils/wheel';
import { CHECK_STROKE_RATIO, checkSvgPath, findMarkAt, scaleMarks, type CheckMark, type CheckStyle } from './utils/marks';
import type { CursorInfo, ImageAsset, OrientationState, PaneId, PdfResolution, ViewState } from './types';
import { DEFAULT_ORIENTATION } from './types';
import { t } from './i18n';

export interface PaneCallbacks {
  getView(id: PaneId): ViewState;
  updateView(id: PaneId, update: (view: ViewState) => void): void;
  onActive(id: PaneId): void;
  onChange(): void;
  onCursor(id: PaneId, cursor: CursorInfo): void;
  onFit(id: PaneId): void;
  onDuplicate(id: PaneId): void;
  onSwap(source: PaneId, target: PaneId): void;
  onFiles(id: PaneId, files: File[]): void;
  getPdfResolution(): PdfResolution;
  getClickZoom(event: MouseEvent): number | undefined;
  getCheckMode(): boolean;
  getCheckStyle(): CheckStyle;
}

// 押してから離すまでにこれ以上動いたらパンとみなし、レ点は付けない。
const TAP_SLOP = 4;
const UNDO_LIMIT = 200;

export class Pane {
  readonly element: HTMLElement;
  label: string;
  readonly stage: HTMLElement;
  readonly header: HTMLElement;
  readonly imageEl: HTMLImageElement;
  readonly meta: HTMLElement;
  readonly fileName: HTMLButtonElement;
  readonly metaDetails: HTMLElement;
  readonly message: HTMLElement;
  readonly pages: HTMLElement;
  readonly fileInput: HTMLInputElement;
  readonly marksEl: SVGSVGElement;
  asset?: ImageAsset;
  orientation: OrientationState = { ...DEFAULT_ORIENTATION };
  private pointers = new Map<number, { x: number; y: number }>();
  private drag?: { x: number; y: number; viewX: number; viewY: number };
  private pinch?: { distance: number; scale: number; centerX: number; centerY: number };
  private loadToken = 0;
  private tap?: { pointerId: number; x: number; y: number };
  // レ点はページごとに持つ。キーはページ送りの表示と同じ1始まり（単ページの画像は1）。
  private marksByPage = new Map<number, CheckMark[]>();
  private undoStack: Array<{ page: number; marks: CheckMark[] }> = [];

  constructor(readonly id: PaneId, label: string, private readonly callbacks: PaneCallbacks) {
    this.label = label;
    this.element = document.createElement('section');
    this.element.className = 'pane'; this.element.dataset.pane = id; this.element.tabIndex = 0;
    this.element.setAttribute('aria-label', t('paneAria', { label }));
    this.element.innerHTML = `<div class="pane-header"><strong>${label}</strong><span class="independent" hidden>${t('independent')}</span><span class="orientation" hidden></span><span class="pane-actions"><button class="duplicate" type="button" aria-label="${t('duplicateAria', { label })}" title="${t('duplicate')}" hidden>${t('duplicate')}</button><button class="close" type="button" aria-label="${t('closeAria', { label })}" title="${t('close')}" hidden>${t('close')}</button></span></div><div class="stage"><img draggable="false" alt="" /><svg class="marks" aria-hidden="true"></svg><div class="message">${t('emptyMessage')}</div><div class="pages" hidden></div></div><div class="pane-meta"><button class="file-name" type="button" title="${t('fileChangeTitle')}" hidden></button><span class="meta-details"></span></div><input class="file-input" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml,image/tiff,.tif,.tiff,application/pdf,.pdf" aria-label="${t('fileInputAria', { label })}" />`;
    this.header = this.element.querySelector('.pane-header')!;
    this.stage = this.element.querySelector('.stage')!;
    this.imageEl = this.element.querySelector('img')!;
    this.meta = this.element.querySelector('.pane-meta')!;
    this.fileName = this.element.querySelector<HTMLButtonElement>('.file-name')!;
    this.metaDetails = this.element.querySelector('.meta-details')!;
    this.message = this.element.querySelector('.message')!;
    this.pages = this.element.querySelector('.pages')!;
    this.fileInput = this.element.querySelector<HTMLInputElement>('.file-input')!;
    this.marksEl = this.element.querySelector<SVGSVGElement>('.marks')!;
    const input = this.fileInput;
    const duplicate = this.element.querySelector<HTMLButtonElement>('.duplicate')!;
    const close = this.element.querySelector<HTMLButtonElement>('.close')!;
    this.header.draggable = true;
    this.header.addEventListener('dragstart', (event) => {
      if (!this.asset || !event.dataTransfer) { event.preventDefault(); return; }
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-image-viewer-pane', this.id);
      event.dataTransfer.setData('text/plain', this.id);
      this.element.classList.add('pane-dragging');
    });
    this.header.addEventListener('dragend', () => this.element.classList.remove('pane-dragging'));
    this.fileName.addEventListener('click', (event) => { event.stopPropagation(); this.fileInput.click(); });
    duplicate.addEventListener('click', (event) => { event.stopPropagation(); this.callbacks.onDuplicate(this.id); });
    close.addEventListener('click', (event) => { event.stopPropagation(); this.clear(); });
    this.element.addEventListener('click', (event) => { if (!this.asset && event.target !== input) input.click(); this.element.focus(); });
    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? []);
      input.value = '';
      if (files.length) this.callbacks.onFiles(this.id, files);
    });
    this.element.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer?.types.includes('application/x-image-viewer-pane')) this.element.classList.add('pane-drop-target');
      else this.element.classList.add('dragging');
    });
    this.element.addEventListener('dragleave', () => { this.element.classList.remove('dragging'); this.element.classList.remove('pane-drop-target'); });
    this.element.addEventListener('drop', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.element.classList.remove('dragging'); this.element.classList.remove('pane-drop-target');
      const sourceId = event.dataTransfer?.getData('application/x-image-viewer-pane');
      if (sourceId) { if (sourceId !== this.id) this.callbacks.onSwap(sourceId, this.id); return; }
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length) this.callbacks.onFiles(this.id, files);
    });
    this.pages.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.pages.addEventListener('pointermove', (event) => event.stopPropagation());
    this.pages.addEventListener('pointerup', (event) => event.stopPropagation());
    this.pages.addEventListener('click', (event) => event.stopPropagation());
    this.stage.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
    // 拡大縮小のクリックを素早く続けてもダブルクリック扱いで Fit に戻さない。
    // チェック中は続けて押すとレ点の付け外しになるので、Fit には戻さない。
    this.stage.addEventListener('dblclick', (event) => { if (!this.callbacks.getClickZoom(event) && !this.callbacks.getCheckMode()) this.callbacks.onFit(this.id); });
    this.stage.addEventListener('pointerdown', (event) => this.pointerDown(event));
    this.stage.addEventListener('pointermove', (event) => this.pointerMove(event));
    this.stage.addEventListener('pointerup', (event) => this.pointerEnd(event));
    this.stage.addEventListener('pointercancel', (event) => this.pointerEnd(event));
    this.stage.addEventListener('pointerleave', () => this.callbacks.onCursor(this.id, { x: 0, y: 0, inside: false }));
  }
  get rect() { return this.stage.getBoundingClientRect(); }
  get page() { return this.asset?.tiff ? this.asset.tiff.page + 1 : this.asset?.pdf?.page ?? 1; }
  get marks(): readonly CheckMark[] { return this.marksByPage.get(this.page) ?? []; }
  get canUndoMark() { return this.undoStack.length > 0; }
  // 付ける・消す・全消しのどれも1手として取り消せるよう、変更前の一覧を積んでおく。
  private setMarks(next: CheckMark[]) {
    const page = this.page;
    this.undoStack.push({ page, marks: [...this.marks] });
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.marksByPage.set(page, next);
    this.callbacks.onChange();
  }
  private resetMarks() { this.marksByPage = new Map(); this.undoStack = []; this.tap = undefined; }
  // 取り消した操作が別のページのものでも、そのページのレ点を戻す。表示中でなければ見た目は変わらない。
  undoMark() {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    this.marksByPage.set(entry.page, entry.marks);
    this.callbacks.onChange();
    return true;
  }
  clearMarks() {
    if (!this.marks.length) return false;
    this.setMarks([]);
    return true;
  }
  // 表示中の座標で、レ点の上なら消し、画像の上なら付ける。
  private toggleMarkAt(x: number, y: number) {
    const asset = this.asset;
    if (!asset) return;
    const view = this.callbacks.getView(this.id);
    const marks = this.marks;
    const onScreen = marks.map((mark) => {
      const p = originalToOriented(mark.x, mark.y, asset.width, asset.height, this.orientation);
      return { x: view.x + p.x * view.scale, y: view.y + p.y * view.scale, radius: Math.max(mark.size * view.scale / 2, 8) };
    });
    const hit = findMarkAt(onScreen, x, y);
    if (hit >= 0) { this.setMarks(marks.filter((_, index) => index !== hit)); return; }
    const original = orientedToOriginal((x - view.x) / view.scale, (y - view.y) / view.scale, asset.width, asset.height, this.orientation);
    if (original.x < 0 || original.y < 0 || original.x >= asset.width || original.y >= asset.height) return;
    // 大きさは付けた瞬間の見た目に合わせ、以後は画像と一緒に拡大縮小する。
    const style = this.callbacks.getCheckStyle();
    this.setMarks([...marks, { x: original.x, y: original.y, size: style.size / view.scale, color: style.color }]);
  }
  // レ点は画像と同じ変換に載せると回転・反転で形が崩れるので、画面座標へ直して正立で描く。
  private renderMarks(view: ViewState) {
    const asset = this.asset;
    if (!asset || !this.marks.length) { this.marksEl.replaceChildren(); return; }
    this.marksEl.innerHTML = this.marks.map((mark) => {
      const p = originalToOriented(mark.x, mark.y, asset.width, asset.height, this.orientation);
      const size = mark.size * view.scale;
      return `<path d="${checkSvgPath(view.x + p.x * view.scale, view.y + p.y * view.scale, size)}" stroke="${mark.color}" stroke-width="${Math.round(size * CHECK_STROKE_RATIO * 100) / 100}" />`;
    }).join('');
  }
  get oriented() { return this.asset ? orientedSize(this.asset.width, this.asset.height, this.orientation) : { width: 0, height: 0 }; }
  setLanguage(label: string) {
    this.label = label;
    this.header.querySelector('strong')!.textContent = label;
    this.element.setAttribute('aria-label', t('paneAria', { label }));
    this.header.querySelector<HTMLElement>('.independent')!.textContent = t('independent');
    const duplicate = this.header.querySelector<HTMLButtonElement>('.duplicate')!;
    duplicate.textContent = t('duplicate'); duplicate.title = t('duplicate'); duplicate.setAttribute('aria-label', t('duplicateAria', { label }));
    const close = this.header.querySelector<HTMLButtonElement>('.close')!;
    close.textContent = t('close'); close.title = t('close'); close.setAttribute('aria-label', t('closeAria', { label }));
    this.fileName.title = t('fileChangeTitle');
    this.fileInput.setAttribute('aria-label', t('fileInputAria', { label }));
    if (!this.asset) this.message.innerHTML = t('emptyMessage');
    this.renderPages();
  }
  render(view: ViewState, sync: boolean, active = false) {
    this.element.classList.toggle('active', active);
    const independent = this.element.querySelector<HTMLElement>('.independent')!;
    independent.textContent = t('independent'); independent.hidden = sync;
    this.element.querySelector<HTMLButtonElement>('.duplicate')!.hidden = !this.asset;
    this.element.querySelector<HTMLButtonElement>('.close')!.hidden = !this.asset;
    this.fileName.hidden = !this.asset;
    const marker = this.element.querySelector<HTMLElement>('.orientation')!;
    if (!this.asset) {
      this.marksEl.replaceChildren();
      marker.hidden = true;
      marker.textContent = '';
      this.fileName.textContent = '';
      this.metaDetails.textContent = '';
      return;
    }
    this.imageEl.style.transform = transformCss(view, this.asset.width, this.asset.height, this.orientation);
    this.imageEl.style.imageRendering = view.scale >= 2 ? 'pixelated' : 'auto';
    this.renderMarks(view);
    const text = `${this.orientation.rotation ? `${this.orientation.rotation}°` : ''}${this.orientation.flipH ? ' ⇆' : ''}${this.orientation.flipV ? ' ⇅' : ''}`;
    marker.hidden = !text; marker.textContent = text;
    this.fileName.textContent = this.asset.name;
    this.metaDetails.textContent = ` — ${this.oriented.width} × ${this.oriented.height}px${this.asset.tiff?.converted16Bit ? t('converted16') : ''}`;
  }
  async setFile(file: File) {
    return this.setFileAtPage(file, 1);
  }
  private async setFileAtPage(file: File, pageNumber: number) {
    const token = ++this.loadToken;
    this.message.innerHTML = `<span class="spinner"></span>${t('loading')}`; this.message.hidden = false; this.element.classList.remove('error');
    try {
      const asset = await loadImage(file, pageNumber, this.callbacks.getPdfResolution());
      if (token !== this.loadToken) { this.disposeAsset(asset); return; }
      this.disposeAsset();
      this.asset = asset; this.imageEl.src = asset.objectUrl; this.message.hidden = true; this.orientation = { ...DEFAULT_ORIENTATION }; this.resetMarks();
      this.renderPages(); this.callbacks.onActive(this.id); this.callbacks.onFit(this.id); this.callbacks.onChange();
    } catch (error) {
      if (token !== this.loadToken) return;
      this.disposeAsset();
      this.asset = undefined; this.imageEl.removeAttribute('src'); this.pages.hidden = true; this.element.classList.add('error'); this.resetMarks();
      this.message.textContent = t('loadingError', { message: error instanceof Error ? error.message : t('noImage') }); this.message.hidden = false; this.callbacks.onChange();
    }
  }
  private disposeAsset(asset = this.asset) {
    if (!asset) return;
    URL.revokeObjectURL(asset.objectUrl);
    if (asset.pdf) {
      asset.pdf.refs.count -= 1;
      if (asset.pdf.refs.count === 0) void asset.pdf.document.cleanup();
    }
  }
  clear() {
    ++this.loadToken;
    this.disposeAsset();
    this.asset = undefined;
    this.imageEl.removeAttribute('src');
    this.pages.hidden = true;
    this.fileName.hidden = true;
    this.fileName.textContent = '';
    this.metaDetails.textContent = '';
    this.message.innerHTML = t('emptyMessage');
    this.message.hidden = false;
    this.element.classList.remove('error');
    this.orientation = { ...DEFAULT_ORIENTATION };
    this.resetMarks();
    this.callbacks.onChange();
  }
  swapContent(other: Pane) {
    if (this === other) return;
    ++this.loadToken; ++other.loadToken;
    [this.asset, other.asset] = [other.asset, this.asset];
    [this.orientation, other.orientation] = [other.orientation, this.orientation];
    [this.marksByPage, other.marksByPage] = [other.marksByPage, this.marksByPage];
    [this.undoStack, other.undoStack] = [other.undoStack, this.undoStack];
    this.refreshContentUi();
    other.refreshContentUi();
  }
  private refreshContentUi() {
    this.element.classList.remove('error');
    if (this.asset) {
      this.imageEl.src = this.asset.objectUrl;
      this.message.hidden = true;
      this.renderPages();
    } else {
      this.imageEl.removeAttribute('src');
      this.pages.hidden = true;
      this.message.innerHTML = t('emptyMessage');
      this.message.hidden = false;
    }
  }
  private renderPages() {
    const pageCount = this.asset?.tiff?.pages.length ?? this.asset?.pdf?.pageCount ?? 0;
    if (!this.asset || pageCount < 2) { this.pages.hidden = true; return; }
    const pageIndex = this.asset.tiff ? this.asset.tiff.page : this.asset.pdf!.page - 1;
    this.pages.hidden = false;
    this.pages.innerHTML = `<button type="button" aria-label="${t('previousPage')}">◀</button><span>${t('pageCounter', { current: pageIndex + 1, total: pageCount })}</span><button type="button" aria-label="${t('nextPage')}">▶</button>`;
    const buttons = this.pages.querySelectorAll<HTMLButtonElement>('button');
    buttons[0].disabled = pageIndex === 0; buttons[1].disabled = pageIndex === pageCount - 1;
    buttons[0].onclick = () => void this.changePage(pageIndex - 1); buttons[1].onclick = () => void this.changePage(pageIndex + 1);
  }
  async setPdfPage(source: ImageAsset, page: number) {
    const token = ++this.loadToken;
    this.message.innerHTML = `<span class="spinner"></span>${t('loading')}`; this.message.hidden = false; this.element.classList.remove('error');
    try {
      const asset = await createPdfPageAsset(source, page);
      if (token !== this.loadToken) { this.disposeAsset(asset); return; }
      this.disposeAsset();
      this.asset = asset; this.imageEl.src = asset.objectUrl; this.message.hidden = true; this.orientation = { ...DEFAULT_ORIENTATION }; this.resetMarks();
      this.renderPages(); this.callbacks.onActive(this.id); this.callbacks.onFit(this.id); this.callbacks.onChange();
    } catch (error) {
      if (token !== this.loadToken) return;
      this.disposeAsset();
      this.asset = undefined; this.imageEl.removeAttribute('src'); this.pages.hidden = true; this.element.classList.add('error'); this.resetMarks();
      this.message.textContent = t('pdfPageError', { message: error instanceof Error ? error.message : t('noImage') }); this.message.hidden = false; this.callbacks.onChange();
    }
  }
  async setPdfResolution(resolution: PdfResolution) {
    const asset = this.asset;
    if (!asset?.pdf || asset.pdf.resolution === resolution) return;
    const token = ++this.loadToken;
    this.message.innerHTML = `<span class="spinner"></span>${t('loadingResolution')}`; this.message.hidden = false; this.element.classList.remove('error');
    this.pages.setAttribute('aria-busy', 'true');
    try {
      const next = await selectPdfPage(asset, asset.pdf.page, resolution);
      if (token !== this.loadToken || this.asset !== asset) { URL.revokeObjectURL(next.objectUrl); return; }
      // 解像度を変えると画素数が変わる。レ点が同じ場所に残るよう、全ページ分を同じ比率で掛け直す。
      const ratio = asset.width ? next.width / asset.width : 1;
      if (ratio !== 1) {
        for (const [page, marks] of this.marksByPage) this.marksByPage.set(page, scaleMarks(marks, ratio));
        this.undoStack = this.undoStack.map((entry) => ({ page: entry.page, marks: scaleMarks(entry.marks, ratio) }));
      }
      URL.revokeObjectURL(asset.objectUrl); Object.assign(asset, next);
      asset.pdf.resolution = resolution;
      this.imageEl.src = next.objectUrl;
      this.message.hidden = true;
      this.renderPages(); this.callbacks.onFit(this.id); this.callbacks.onChange();
    } catch (error) {
      if (token !== this.loadToken || this.asset !== asset) return;
      this.element.classList.add('error');
      this.message.textContent = t('resolutionError', { message: error instanceof Error ? error.message : t('noImage') });
      this.message.hidden = false; this.callbacks.onChange();
    } finally {
      this.pages.removeAttribute('aria-busy');
    }
  }
  async duplicateFrom(source: ImageAsset) {
    const token = ++this.loadToken;
    this.message.innerHTML = `<span class="spinner"></span>${t('duplicating')}`; this.message.hidden = false; this.element.classList.remove('error');
    try {
      const asset = await cloneImageAsset(source);
      if (token !== this.loadToken) { this.disposeAsset(asset); return; }
      this.disposeAsset();
      this.asset = asset; this.imageEl.src = asset.objectUrl; this.message.hidden = true; this.orientation = { ...DEFAULT_ORIENTATION }; this.resetMarks();
      this.renderPages(); this.callbacks.onActive(this.id); this.callbacks.onFit(this.id); this.callbacks.onChange();
    } catch (error) {
      if (token !== this.loadToken) return;
      this.disposeAsset();
      this.asset = undefined; this.imageEl.removeAttribute('src'); this.pages.hidden = true; this.element.classList.add('error'); this.resetMarks();
      this.message.textContent = t('duplicateError', { message: error instanceof Error ? error.message : t('noImage') }); this.message.hidden = false; this.callbacks.onChange();
    }
  }
  // 操作ログからの復元用。ページ番号はページ送りの表示と同じ1始まりで受ける。
  async goToPage(page: number) {
    const asset = this.asset;
    if (!asset) return;
    const pageCount = asset.tiff?.pages.length ?? asset.pdf?.pageCount ?? 0;
    const current = asset.tiff ? asset.tiff.page + 1 : asset.pdf?.page ?? 0;
    if (pageCount < 2 || page === current) return;
    await this.changePage(page - 1);
  }
  private async changePage(page: number) {
    const asset = this.asset;
    const pageCount = asset?.tiff?.pages.length ?? asset?.pdf?.pageCount ?? 0;
    if (!asset || page < 0 || page >= pageCount || (!asset.tiff && !asset.pdf)) return;
    this.pages.setAttribute('aria-busy', 'true');
    try {
      const next = asset.tiff ? await selectTiffPage(asset, page) : await selectPdfPage(asset, page + 1, asset.pdf?.resolution);
      URL.revokeObjectURL(asset.objectUrl); Object.assign(asset, next);
      if (asset.tiff) asset.tiff.page = page;
      if (asset.pdf) asset.pdf.page = page + 1;
      this.imageEl.src = next.objectUrl;
      this.renderPages(); this.callbacks.onChange();
    } finally { this.pages.removeAttribute('aria-busy'); }
  }
  private point(event: PointerEvent | WheelEvent) { const r = this.rect; return { x: event.clientX - r.left, y: event.clientY - r.top }; }
  private onWheel(event: WheelEvent) {
    if (!this.asset) return; event.preventDefault();
    if (!event.ctrlKey && !event.altKey && isTrackpadScroll(event)) {
      this.pan(-event.deltaX, -event.deltaY);
    } else {
      const p = this.point(event); this.zoomAt(p.x, p.y, event.deltaY < 0 ? 1.1 : 1 / 1.1);
    }
    this.callbacks.onActive(this.id);
  }
  zoomAt(x: number, y: number, factor: number) {
    if (!this.asset) return;
    this.callbacks.updateView(this.id, (view) => { const next = Math.min(64, Math.max(0.01, view.scale * factor)); const actual = next / view.scale; view.x = x - (x - view.x) * actual; view.y = y - (y - view.y) * actual; view.scale = next; });
  }
  pan(dx: number, dy: number) { this.callbacks.updateView(this.id, (view) => { view.x += dx; view.y += dy; }); }
  private pointerDown(event: PointerEvent) {
    const zoom = event.button === 0 ? this.callbacks.getClickZoom(event) : undefined;
    if (zoom) { const p = this.point(event); this.zoomAt(p.x, p.y, zoom); this.callbacks.onActive(this.id); return; }
    this.stage.setPointerCapture(event.pointerId); this.pointers.set(event.pointerId, this.point(event)); this.callbacks.onActive(this.id);
    if (this.pointers.size === 1 && event.button === 0 && this.asset && this.callbacks.getCheckMode()) { const p = this.point(event); this.tap = { pointerId: event.pointerId, x: p.x, y: p.y }; }
    else this.tap = undefined;
    if (this.pointers.size === 1) { const p = this.point(event); const v = this.callbacks.getView(this.id); this.drag = { x: p.x, y: p.y, viewX: v.x, viewY: v.y }; }
    if (this.pointers.size === 2) this.startPinch();
  }
  private pointerMove(event: PointerEvent) {
    const p = this.point(event); this.pointers.set(event.pointerId, p); this.updateCursor(p.x, p.y);
    if (this.tap && Math.hypot(p.x - this.tap.x, p.y - this.tap.y) > TAP_SLOP) this.tap = undefined;
    if (!this.asset) return;
    if (this.pointers.size === 2 && this.pinch) {
      const points = [...this.pointers.values()]; const dx = points[1].x - points[0].x; const dy = points[1].y - points[0].y;
      this.zoomAt(this.pinch.centerX, this.pinch.centerY, Math.hypot(dx, dy) / this.pinch.distance / (this.callbacks.getView(this.id).scale / this.pinch.scale));
    } else if (this.drag && this.pointers.size === 1) {
      const dx = p.x - this.drag.x; const dy = p.y - this.drag.y;
      this.callbacks.updateView(this.id, (view) => { view.x = this.drag!.viewX + dx; view.y = this.drag!.viewY + dy; });
    }
  }
  private pointerEnd(event: PointerEvent) {
    const tap = this.tap; this.tap = undefined;
    if (tap && tap.pointerId === event.pointerId && event.type === 'pointerup' && this.callbacks.getCheckMode()) this.toggleMarkAt(tap.x, tap.y);
    this.pointers.delete(event.pointerId); this.drag = undefined; this.pinch = undefined; if (this.pointers.size === 1) { const p = [...this.pointers.values()][0]; const v = this.callbacks.getView(this.id); this.drag = { x: p.x, y: p.y, viewX: v.x, viewY: v.y }; } }
  private startPinch() { const points = [...this.pointers.values()]; const dx = points[1].x - points[0].x; const dy = points[1].y - points[0].y; this.pinch = { distance: Math.hypot(dx, dy), scale: this.callbacks.getView(this.id).scale, centerX: (points[0].x + points[1].x) / 2, centerY: (points[0].y + points[1].y) / 2 }; }
  private updateCursor(x: number, y: number) {
    if (!this.asset) return;
    const v = this.callbacks.getView(this.id); const original = orientedToOriginal((x - v.x) / v.scale, (y - v.y) / v.scale, this.asset.width, this.asset.height, this.orientation);
    this.callbacks.onCursor(this.id, { x: original.x, y: original.y, inside: original.x >= 0 && original.y >= 0 && original.x < this.asset.width && original.y < this.asset.height });
  }
  centerOriginal(view: ViewState) {
    if (!this.asset) return undefined; const r = this.rect; return orientedToOriginal((r.width / 2 - view.x) / view.scale, (r.height / 2 - view.y) / view.scale, this.asset.width, this.asset.height, this.orientation);
  }
  placeOriginalAtCenter(original: { x: number; y: number }, view: ViewState) {
    if (!this.asset) return; const p = originalToOriented(original.x, original.y, this.asset.width, this.asset.height, this.orientation); const r = this.rect; view.x = r.width / 2 - p.x * view.scale; view.y = r.height / 2 - p.y * view.scale;
  }
}
