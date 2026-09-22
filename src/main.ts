import './style.css';
import { makeScreenshot, download } from './export/screenshot';
import { SessionRecorder, supportedFormat } from './export/recorder';
import { Pane } from './pane';
import { getSettings, saveSettings, ViewStore } from './state';
import type { ExportOptions, GridDimension, PaneId, PdfResolution } from './types';
import { getLanguage, setLanguage, t, type Language } from './i18n';

const MAX_PANES = 9;
const paneIds: PaneId[] = Array.from({ length: MAX_PANES }, (_, index) => `pane-${index}`);
const paneLabel = (index: number) => t('imageLabel', { n: index + 1 });

const app = document.querySelector<HTMLDivElement>('#app')!;
const saved = getSettings();
let pdfResolution: PdfResolution = saved.pdfResolution;
let exportOptions: ExportOptions = (() => {
  try {
    return { format: 'image/png', labels: true, divider: true, background: 'dark', ...JSON.parse(localStorage.getItem('image-viewer.export.v1') ?? '{}') };
  } catch {
    return { format: 'image/png', labels: true, divider: true, background: 'dark' };
  }
})();
const targetOptions = paneIds.map((id, index) => `<option value="${id}">${paneLabel(index)}</option>`).join('');

app.innerHTML = `
  <main class="viewer-app">
    <header class="toolbar" aria-label="${t('toolbarAria')}" data-i18n-attr="aria-label:toolbarAria">
      <div class="toolbar-row toolbar-row-main">
        <div class="brand" aria-label="PaneViewer">
          <svg class="brand-mark" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
            <rect width="36" height="36" rx="10" fill="#3978e8" />
            <rect x="7" y="7" width="9" height="9" rx="2" fill="#f4f7ff" />
            <rect x="20" y="7" width="9" height="9" rx="2" fill="#b8d0ff" />
            <rect x="7" y="20" width="9" height="9" rx="2" fill="#b8d0ff" />
            <rect x="20" y="20" width="9" height="9" rx="2" fill="#f4f7ff" />
          </svg>
          <span>PaneViewer</span>
        </div>
        <div class="tool-group primary">
          <button id="fit" type="button" title="${t('fitTitle')}" data-i18n="fit" data-i18n-attr="title:fitTitle">${t('fit')}</button>
          <button id="actual" type="button" title="${t('actualTitle')}" data-i18n="actual" data-i18n-attr="title:actualTitle">${t('actual')}</button>
          <button id="reset" type="button" title="${t('resetOrientation')}" data-i18n="resetOrientation" data-i18n-attr="title:resetOrientation">${t('resetOrientation')}</button>
        </div>
        <div class="tool-group grid-tools" aria-label="${t('gridSettings')}" data-i18n-attr="aria-label:gridSettings">
          <label for="grid-rows"><span data-i18n="rows">${t('rows')}</span>
            <select id="grid-rows" aria-label="${t('rows')}" data-i18n-attr="aria-label:rows">
              <option value="1">1</option><option value="2">2</option><option value="3">3</option>
            </select>
          </label>
          <label for="grid-columns"><span data-i18n="columns">${t('columns')}</span>
            <select id="grid-columns" aria-label="${t('columns')}" data-i18n-attr="aria-label:columns">
              <option value="1">1</option><option value="2">2</option><option value="3">3</option>
            </select>
          </label>
        </div>
        <div class="tool-group view-tools">
          <label class="scale-control" for="scale-input">
            <span data-i18n="scale">${t('scale')}</span>
            <input id="scale-input" type="number" value="100" step="0.1" inputmode="decimal" aria-label="${t('scale')}" data-i18n-attr="aria-label:scale" />
            <span class="scale-unit" aria-hidden="true">%</span>
          </label>
          <button id="sync" type="button" aria-pressed="true"></button>
        </div>
        <div class="tool-group pdf-tools">
          <label for="pdf-resolution"><span data-i18n="pdfResolution">${t('pdfResolution')}</span>
            <select id="pdf-resolution" aria-label="${t('pdfResolution')}" data-i18n-attr="aria-label:pdfResolution">
              <option value="72">72 dpi</option><option value="96">96 dpi</option><option value="144">144 dpi</option><option value="216">216 dpi</option><option value="300">300 dpi</option>
            </select>
          </label>
        </div>
        <div class="tool-group language-tools">
          <label for="language"><span data-i18n="language">${t('language')}</span>
            <select id="language" aria-label="${t('language')}" data-i18n-attr="aria-label:language"><option value="ja" data-i18n="japanese">${t('japanese')}</option><option value="en" data-i18n="english">${t('english')}</option></select>
          </label>
        </div>
      </div>
      <div class="toolbar-row toolbar-row-secondary">
        <div class="tool-group orientation-tools">
          <label><span data-i18n="target">${t('target')}</span>
            <select id="orientation-target" aria-label="${t('target')}" data-i18n-attr="aria-label:target">
              <option value="all" data-i18n="allPanes">${t('allPanes')}</option>${targetOptions}
            </select>
          </label>
          <button id="rotate-left" type="button" title="${t('rotateLeftTitle')}" data-i18n-attr="title:rotateLeftTitle">↶</button>
          <button id="rotate-right" type="button" title="${t('rotateRightTitle')}" data-i18n-attr="title:rotateRightTitle">↷</button>
          <button id="flip-h" type="button" title="${t('flipHTitle')}" data-i18n-attr="title:flipHTitle">⇆</button>
          <button id="flip-v" type="button" title="${t('flipVTitle')}" data-i18n-attr="title:flipVTitle">⇅</button>
        </div>
        <div class="tool-group export-tools">
          <select id="export-format" aria-label="${t('exportFormat')}" data-i18n-attr="aria-label:exportFormat"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option></select>
          <label><input id="labels" type="checkbox" checked /> <span data-i18n="labels">${t('labels')}</span></label>
          <label><input id="divider" type="checkbox" checked /> <span data-i18n="divider">${t('divider')}</span></label>
          <select id="background" aria-label="${t('background')}" data-i18n-attr="aria-label:background"><option value="dark" data-i18n="dark">${t('dark')}</option><option value="light" data-i18n="light">${t('light')}</option><option value="transparent" data-i18n="transparent">${t('transparent')}</option></select>
          <button id="save" type="button" title="${t('saveTitle')}" data-i18n="save" data-i18n-attr="title:saveTitle">${t('save')}</button>
          <button id="copy" type="button" title="${t('copyTitle')}" data-i18n="copy" data-i18n-attr="title:copyTitle">${t('copy')}</button>
          <button id="record" type="button" title="${t('recordTitle')}" aria-pressed="false">${t('record')}</button>
        </div>
      </div>
    </header>
    <section id="panes" class="panes" aria-label="${t('compareImages')}" data-i18n-attr="aria-label:compareImages"></section>
    <footer class="status">
      <span id="status-summary">${t('noImage')}</span>
      <span id="cursor">${t('cursorNone')}</span>
      <span id="warning" role="status"></span>
      <details class="license-note">
        <summary data-i18n="licenseInfo">${t('licenseInfo')}</summary>
        <p data-i18n-html="licenseBody">${t('licenseBody')}</p>
      </details>
    </footer>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  </main>`;

const panesElement = document.querySelector<HTMLElement>('#panes')!;
const scaleInput = document.querySelector<HTMLInputElement>('#scale-input')!;
let raf = 0;
const recorder = new SessionRecorder();
const recordingFormat = supportedFormat();
let recordTimer = 0;
const store = new ViewStore(saved, paneIds, schedule);
const panes = new Map<PaneId, Pane>();

for (const [index, id] of paneIds.entries()) {
  const pane = new Pane(id, paneLabel(index), callbacks(id));
  panes.set(id, pane);
  panesElement.append(pane.element);
}

function paneFor(id: PaneId) {
  return panes.get(id)!;
}

function visiblePanes() {
  return paneIds.slice(0, store.rows * store.columns).map(paneFor);
}

function callbacks(id: PaneId) {
  return {
    getView: (value: PaneId) => store.current(value),
    updateView: (value: PaneId, update: (view: { scale: number; x: number; y: number }) => void) => store.update(value, update),
    onActive: (value: PaneId) => { store.active = value; schedule(); },
    onChange: schedule,
    onCursor,
    onFit: fit,
    onDuplicate: duplicatePane,
    onSwap: swapPanes,
    getPdfResolution: () => pdfResolution,
  };
}

function applyViewerBackground() {
  document.querySelector<HTMLElement>('.viewer-app')!.dataset.background = exportOptions.background;
}

function applyLanguage() {
  const language = getLanguage();
  document.documentElement.lang = language;
  document.title = t('appTitle');

  app.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n!);
  });
  app.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((element) => {
    element.innerHTML = t(element.dataset.i18nHtml!);
  });
  app.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((element) => {
    for (const definition of (element.dataset.i18nAttr ?? '').split(';')) {
      const [attribute, key] = definition.trim().split(':');
      if (attribute && key) element.setAttribute(attribute, t(key));
    }
  });

  const target = document.querySelector<HTMLSelectElement>('#orientation-target')!;
  const selectedTarget = target.value;
  target.innerHTML = `<option value="all">${t('allPanes')}</option>${paneIds.map((id, index) => `<option value="${id}">${paneLabel(index)}</option>`).join('')}`;
  target.value = selectedTarget === 'all' || paneIds.includes(selectedTarget) ? selectedTarget : 'all';
  document.querySelector<HTMLSelectElement>('#language')!.value = language;
  paneIds.forEach((id, index) => paneFor(id).setLanguage(paneLabel(index)));
  applyViewerBackground();
  render();
}

function swapPanes(sourceId: PaneId, targetId: PaneId) {
  if (sourceId === targetId) return;
  const source = paneFor(sourceId);
  const target = paneFor(targetId);
  if (!source.asset) return;
  const name = source.asset.name;
  source.swapContent(target);
  store.swap(sourceId, targetId);
  toast(t('swapped', { name }));
}

function nextGridFor(required: number) {
  const candidates: Array<{ rows: GridDimension; columns: GridDimension }> = [
    { rows: 1, columns: 1 }, { rows: 1, columns: 2 }, { rows: 1, columns: 3 },
    { rows: 2, columns: 2 }, { rows: 2, columns: 3 }, { rows: 3, columns: 1 },
    { rows: 3, columns: 2 }, { rows: 3, columns: 3 },
  ];
  return candidates.find((grid) => grid.rows * grid.columns >= required);
}

function duplicatePane(id: PaneId) {
  const sourcePane = paneFor(id);
  const source = sourcePane.asset;
  if (!source) return;
  const targetIndex = paneIds.findIndex((paneId) => paneId !== id && !paneFor(paneId).asset);
  if (targetIndex < 0) { toast(t('noEmptyPane')); return; }
  const target = paneFor(paneIds[targetIndex]);
  const required = targetIndex + 1;
  const nextGrid = required <= store.rows * store.columns
    ? { rows: store.rows as GridDimension, columns: store.columns as GridDimension }
    : nextGridFor(required);
  if (!nextGrid) { toast(t('noMorePanes')); return; }
  if (nextGrid.rows !== store.rows || nextGrid.columns !== store.columns) {
    changeGrid(nextGrid.rows, nextGrid.columns);
  }
  requestAnimationFrame(() => {
    if (sourcePane.asset !== source) return;
    void target.duplicateFrom(source).then(() => toast(t('duplicated', { name: source.name })));
  });
}

function persistSettings() {
  saveSettings({ sync: store.sync, rows: store.rows, columns: store.columns, pdfResolution });
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(render);
}

function render() {
  raf = 0;
  const visibleIds = new Set(paneIds.slice(0, store.rows * store.columns));
  if (!visibleIds.has(store.active)) store.active = paneIds[0];
  for (const id of paneIds) {
    const pane = paneFor(id);
    pane.element.hidden = !visibleIds.has(id);
    pane.render(store.current(id), store.sync);
  }

  const active = store.current(store.active);
  if (document.activeElement !== scaleInput) scaleInput.value = String(Math.round(active.scale * 1000) / 10);
  scaleInput.disabled = !paneFor(store.active).asset;
  const sync = document.querySelector<HTMLButtonElement>('#sync')!;
  sync.textContent = store.sync ? t('syncOn') : t('syncOff');
  sync.classList.toggle('active', store.sync);
  sync.setAttribute('aria-pressed', String(store.sync));
  sync.title = store.sync ? t('syncTitleOn') : t('syncTitleOff');

  const rows = document.querySelector<HTMLSelectElement>('#grid-rows')!;
  const columns = document.querySelector<HTMLSelectElement>('#grid-columns')!;
  rows.value = String(store.rows);
  columns.value = String(store.columns);
  panesElement.style.gridTemplateRows = `repeat(${store.rows}, minmax(0, 1fr))`;
  panesElement.style.gridTemplateColumns = `repeat(${store.columns}, minmax(0, 1fr))`;

  const target = document.querySelector<HTMLSelectElement>('#orientation-target')!;
  for (const option of target.options) option.disabled = option.value !== 'all' && !visibleIds.has(option.value);
  if (target.value !== 'all' && !visibleIds.has(target.value)) target.value = 'all';

  const visible = visiblePanes();
  const summary = visible.map((pane) => `${pane.label}: ${pane.asset ? pane.asset.name : t('noImage')}`).join(' / ');
  document.querySelector('#status-summary')!.textContent = summary || t('noImage');
  const sizes = visible.filter((pane) => pane.asset).map((pane) => `${pane.oriented.width}x${pane.oriented.height}`);
  document.querySelector('#warning')!.textContent = sizes.length > 1 && sizes.some((size) => size !== sizes[0]) ? t('sizeWarning') : '';

  const hasImage = visible.some((pane) => Boolean(pane.asset));
  document.querySelector<HTMLButtonElement>('#save')!.disabled = !hasImage;
  document.querySelector<HTMLButtonElement>('#copy')!.disabled = !hasImage || !('clipboard' in navigator) || !('ClipboardItem' in window);
  const record = document.querySelector<HTMLButtonElement>('#record')!;
  record.disabled = !recordingFormat || (!hasImage && !recorder.recording);
  renderRecordButton();
}

function renderRecordButton() {
  const button = document.querySelector<HTMLButtonElement>('#record')!;
  const recording = recorder.recording;
  const seconds = Math.floor(recorder.elapsed);
  button.textContent = recording ? t('stopRecordingWithTime', { time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }) : t('record');
  button.title = recording ? t('stopRecordingTitle') : recordingFormat ? t('recordTitle') : t('recordingUnsupported');
  button.classList.toggle('recording', recording);
  button.setAttribute('aria-pressed', String(recording));
}

function fit(id: PaneId) {
  const pane = paneFor(id);
  if (!pane.asset || pane.element.hidden) return;
  const rect = pane.rect;
  const size = pane.oriented;
  store.update(id, (view) => {
    view.scale = Math.min(rect.width / size.width, rect.height / size.height);
    view.x = (rect.width - size.width * view.scale) / 2;
    view.y = (rect.height - size.height * view.scale) / 2;
  });
}

function actual(id = store.active) {
  const pane = paneFor(id);
  if (!pane.asset || pane.element.hidden) return;
  const center = pane.centerOriginal(store.current(id));
  store.update(id, (view) => {
    view.scale = 1;
    if (center) pane.placeOriginalAtCenter(center, view);
  });
}

function onCursor(id: PaneId, cursor: { x: number; y: number; inside: boolean }) {
  if (id === store.active || cursor.inside) {
    document.querySelector('#cursor')!.textContent = cursor.inside ? t('cursor', { x: Math.round(cursor.x), y: Math.round(cursor.y) }) : t('cursorNone');
  }
}

function preserveCenter(action: () => void) {
  const snapshots = visiblePanes().map((pane) => ({ pane, center: pane.centerOriginal(store.current(pane.id)) }));
  action();
  requestAnimationFrame(() => {
    for (const { pane, center } of snapshots) if (center && !pane.element.hidden) pane.placeOriginalAtCenter(center, store.current(pane.id));
    schedule();
  });
}

function orientationTargets() {
  const value = document.querySelector<HTMLSelectElement>('#orientation-target')!.value;
  if (value === 'all') return visiblePanes();
  const pane = panes.get(value);
  return pane && !pane.element.hidden ? [pane] : [];
}

function rotate(delta: number) {
  preserveCenter(() => {
    for (const pane of orientationTargets()) pane.orientation.rotation = (((pane.orientation.rotation + delta + 360) % 360) as 0 | 90 | 180 | 270);
  });
}

function flip(axis: 'flipH' | 'flipV') {
  preserveCenter(() => {
    for (const pane of orientationTargets()) pane.orientation[axis] = !pane.orientation[axis];
  });
}

function resetOrientation() {
  preserveCenter(() => {
    for (const pane of orientationTargets()) {
      pane.orientation.rotation = 0;
      pane.orientation.flipH = false;
      pane.orientation.flipV = false;
    }
  });
}

function changeGrid(rows: GridDimension, columns: GridDimension) {
  preserveCenter(() => {
    store.setGrid(rows, columns);
    persistSettings();
  });
}

function toast(message: string) {
  const element = document.querySelector<HTMLElement>('#toast')!;
  element.textContent = message;
  element.classList.add('visible');
  setTimeout(() => element.classList.remove('visible'), 2200);
}

function saveExportOptions() {
  try { localStorage.setItem('image-viewer.export.v1', JSON.stringify(exportOptions)); } catch { /* optional */ }
}

async function capture(copy = false) {
  try {
    const blob = await makeScreenshot(visiblePanes(), (id) => store.current(id), store.grid, panesElement, copy ? { ...exportOptions, format: 'image/png' } : exportOptions);
    if (copy) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast(t('copySuccess'));
    } else {
      download(blob, exportOptions.format === 'image/png' ? 'png' : 'jpg');
      toast(t('saved'));
    }
  } catch (error) {
    toast(t('exportError', { message: error instanceof Error ? error.message : t('noImage') }));
  }
}

async function toggleRecording() {
  const failure = (error: unknown) => toast(t('recordingError', { message: error instanceof Error ? error.message : t('recordingFailed') }));
  if (recorder.recording) {
    clearInterval(recordTimer);
    recordTimer = 0;
    try {
      const { blob, format, seconds } = await recorder.stop();
      download(blob, format.extension);
      toast(t('recordingSaved', { seconds: seconds.toFixed(1), format: format.extension.toUpperCase() }));
      if (format.extension === 'webm') setTimeout(() => toast(t('recordingWebmNote')), 2400);
    } catch (error) {
      failure(error);
    }
    renderRecordButton();
    schedule();
    return;
  }
  try {
    recorder.start({
      panes: visiblePanes,
      getView: (id) => store.current(id),
      grid: () => store.grid,
      container: panesElement,
      options: () => exportOptions,
    }, () => { toast(t('recordingLimit')); void toggleRecording(); });
    recordTimer = window.setInterval(renderRecordButton, 500);
    toast(t('recordingStarted'));
  } catch (error) {
    failure(error);
  }
  renderRecordButton();
  schedule();
}

document.querySelector('#record')!.addEventListener('click', () => void toggleRecording());
document.querySelector('#fit')!.addEventListener('click', () => fit(store.active));
document.querySelector('#actual')!.addEventListener('click', () => actual());
document.querySelector('#reset')!.addEventListener('click', resetOrientation);
scaleInput.addEventListener('change', () => {
  const pane = paneFor(store.active);
  const current = store.current(store.active);
  const requestedPercent = Number(scaleInput.value);
  if (!scaleInput.value || !Number.isFinite(requestedPercent) || requestedPercent <= 0 || !pane.asset) {
    scaleInput.value = String(Math.round(current.scale * 1000) / 10);
    return;
  }
  const targetScale = Math.min(64, Math.max(0.01, requestedPercent / 100));
  const rect = pane.rect;
  pane.zoomAt(rect.width / 2, rect.height / 2, targetScale / current.scale);
  scaleInput.value = String(Math.round(store.current(store.active).scale * 1000) / 10);
});
scaleInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    scaleInput.blur();
  }
});
document.querySelector('#sync')!.addEventListener('click', () => { store.setSync(!store.sync); persistSettings(); });
document.querySelector('#grid-rows')!.addEventListener('change', (event) => changeGrid(Number((event.currentTarget as HTMLSelectElement).value) as GridDimension, store.columns));
document.querySelector('#grid-columns')!.addEventListener('change', (event) => changeGrid(store.rows, Number((event.currentTarget as HTMLSelectElement).value) as GridDimension));
const pdfResolutionSelect = document.querySelector<HTMLSelectElement>('#pdf-resolution')!;
pdfResolutionSelect.value = String(pdfResolution);
pdfResolutionSelect.addEventListener('change', () => {
  pdfResolution = Number(pdfResolutionSelect.value) as PdfResolution;
  persistSettings();
  void Promise.all(paneIds.map((id) => paneFor(id).setPdfResolution(pdfResolution))).then(() => toast(t('pdfResolutionChanged', { value: pdfResolution })));
});
document.querySelector('#rotate-left')!.addEventListener('click', () => rotate(-90));
document.querySelector('#rotate-right')!.addEventListener('click', () => rotate(90));
document.querySelector('#flip-h')!.addEventListener('click', () => flip('flipH'));
document.querySelector('#flip-v')!.addEventListener('click', () => flip('flipV'));
document.querySelector('#language')!.addEventListener('change', (event) => {
  const value = (event.currentTarget as HTMLSelectElement).value;
  setLanguage(value === 'en' ? 'en' : 'ja');
  applyLanguage();
});

for (const [selector, field] of [['#export-format', 'format'], ['#labels', 'labels'], ['#divider', 'divider'], ['#background', 'background']] as const) {
  const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
  if (element instanceof HTMLInputElement) element.checked = exportOptions[field] as boolean;
  else element.value = exportOptions[field] as string;
  element.addEventListener('change', () => {
    if (field === 'labels' || field === 'divider') exportOptions[field] = (element as HTMLInputElement).checked;
    else if (field === 'format') exportOptions.format = (element as HTMLSelectElement).value as ExportOptions['format'];
    else exportOptions.background = (element as HTMLSelectElement).value as ExportOptions['background'];
    if (exportOptions.format === 'image/jpeg' && exportOptions.background === 'transparent') {
      exportOptions.background = 'dark';
      document.querySelector<HTMLSelectElement>('#background')!.value = 'dark';
    }
    applyViewerBackground();
    saveExportOptions();
  });
}

document.querySelector('#save')!.addEventListener('click', () => void capture());
document.querySelector('#copy')!.addEventListener('click', () => void capture(true));
window.addEventListener('resize', schedule);
window.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('input,select,button')) return;
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === 's') {
    event.preventDefault();
    if (event.shiftKey) void capture(true); else void capture();
    return;
  }
  if (key === 's') { store.setSync(!store.sync); persistSettings(); }
  else if (key === 'r') rotate(event.shiftKey ? -90 : 90);
  else if (key === 'h') flip('flipH');
  else if (key === 'v') flip('flipV');
  else if (key === '0') fit(store.active);
  else if (key === '1') actual();
  else if (key === '+' || key === '=') { const rect = paneFor(store.active).rect; paneFor(store.active).zoomAt(rect.width / 2, rect.height / 2, 1.1); }
  else if (key === '-') { const rect = paneFor(store.active).rect; paneFor(store.active).zoomAt(rect.width / 2, rect.height / 2, 1 / 1.1); }
  else if (event.key.startsWith('Arrow')) {
    event.preventDefault();
    const dx = event.key === 'ArrowLeft' ? -24 : event.key === 'ArrowRight' ? 24 : 0;
    const dy = event.key === 'ArrowUp' ? -24 : event.key === 'ArrowDown' ? 24 : 0;
    paneFor(store.active).pan(dx, dy);
  } else return;
  event.preventDefault();
});

applyLanguage();
