import type { DecodedTiffPage, ImageAsset, PdfResolution } from '../types';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { t } from '../i18n';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const tiffWorker = new Worker(new URL('./tiff.worker.ts', import.meta.url), { type: 'module' });
let sequence = 0;
const pending = new Map<number, { resolve: (pages: DecodedTiffPage[]) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
tiffWorker.onmessage = (event: MessageEvent<{ ok: boolean; pages?: DecodedTiffPage[]; error?: string; id?: number }>) => {
  const response = event.data;
  const entry = pending.get(response.id!);
  if (!entry) return;
  pending.delete(response.id!);
  clearTimeout(entry.timer);
  if (response.ok && response.pages) entry.resolve(response.pages); else entry.reject(new Error(t('tiffDecodeError')));
};

tiffWorker.onerror = () => {
  const error = new Error(t('tiffWorkerStartError'));
  for (const [id, entry] of pending) {
    clearTimeout(entry.timer);
    pending.delete(id);
    entry.reject(error);
  }
};

tiffWorker.onmessageerror = () => {
  const error = new Error(t('tiffWorkerCommunicationError'));
  for (const [id, entry] of pending) {
    clearTimeout(entry.timer);
    pending.delete(id);
    entry.reject(error);
  }
};

function decodeTiff(buffer: ArrayBuffer) {
  return new Promise<DecodedTiffPage[]>((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(t('tiffTimeout')));
    }, 30000);
    pending.set(id, { resolve, reject, timer });
    try {
      tiffWorker.postMessage({ id, buffer }, [buffer]);
    } catch (error) {
      clearTimeout(timer);
      pending.delete(id);
      reject(error instanceof Error ? error : new Error(t('tiffTransferError')));
    }
  });
}

export async function isTiff(file: File) {
  if (/\.tiff?$/i.test(file.name) || /image\/tiff/i.test(file.type)) return true;
  const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a);
}

export async function isPdf(file: File) {
  if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') return true;
  const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return bytes.length === 5 && new TextDecoder().decode(bytes) === '%PDF-';
}

function imageFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(t('imageTimeout')));
    }, 30000);
    image.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(t('imageFormat')));
    };
    image.src = url;
  });
}

async function canvasUrl(width: number, height: number, rgba?: ArrayBuffer, source?: ImageBitmap) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error(t('canvasInit'));
  if (rgba) context.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
  if (source) context.drawImage(source, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error(t('imageConvert'))), 'image/png'));
  return URL.createObjectURL(blob);
}

async function canvasBlobUrl(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error(t('imageConvert'))), 'image/png'));
  return URL.createObjectURL(blob);
}

async function renderPdfPage(pdfDocument: PDFDocumentProxy, pageNumber: number, resolution: PdfResolution) {
  const page = await pdfDocument.getPage(pageNumber);
  try {
    const viewport = page.getViewport({ scale: resolution / 72 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error(t('pdfCanvasInit'));
    await page.render({ canvasContext: context, viewport }).promise;
    const objectUrl = await canvasBlobUrl(canvas);
    const image = await imageFromUrl(objectUrl);
    return { image, objectUrl, width: canvas.width, height: canvas.height };
  } finally {
    page.cleanup();
  }
}

async function loadPdf(file: File, pageNumber = 1, resolution: PdfResolution = 144): Promise<ImageAsset> {
  // フォントを埋め込んでいないPDFでは、これらを渡さないと本文が描画されない。
  // CJKには cmaps、標準14フォントには standard_fonts が要る。
  const base = import.meta.env.BASE_URL;
  const loadingTask = getDocument({
    data: await file.arrayBuffer(),
    cMapUrl: `${base}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}standard_fonts/`,
  });
  let document: PDFDocumentProxy | undefined;
  try {
    document = await loadingTask.promise;
    if (pageNumber < 1 || pageNumber > document.numPages) throw new Error(t('pdfPageOutOfRange'));
    const rendered = await renderPdfPage(document, pageNumber, resolution);
    return { name: file.name, ...rendered, pdf: { document, page: pageNumber, pageCount: document.numPages, resolution, refs: { count: 1 } } };
  } catch (error) {
    await loadingTask.destroy();
    throw error;
  }
}

export async function loadImage(file: File, pageNumber = 1, resolution: PdfResolution = 144): Promise<ImageAsset> {
  if (await isTiff(file)) {
    const pages = await decodeTiff(await file.arrayBuffer());
    const page = pages[0];
    const objectUrl = await canvasUrl(page.width, page.height, page.rgba);
    const image = await imageFromUrl(objectUrl);
    return { name: file.name, image, width: page.width, height: page.height, objectUrl, tiff: { pages, page: 0, converted16Bit: pages.some((p) => p.bitsPerSample > 8) } };
  }
  if (await isPdf(file)) return loadPdf(file, pageNumber, resolution);
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const objectUrl = await canvasUrl(bitmap.width, bitmap.height, undefined, bitmap);
    bitmap.close();
    const image = await imageFromUrl(objectUrl);
    return { name: file.name, image, width: image.naturalWidth, height: image.naturalHeight, objectUrl };
  } catch {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await imageFromUrl(objectUrl);
      return { name: file.name, image, width: image.naturalWidth, height: image.naturalHeight, objectUrl };
    } catch (error) { URL.revokeObjectURL(objectUrl); throw error; }
  }
}

export async function selectTiffPage(asset: ImageAsset, page: number) {
  if (!asset.tiff) throw new Error(t('notTiff'));
  const content = asset.tiff.pages[page];
  const objectUrl = await canvasUrl(content.width, content.height, content.rgba);
  const image = await imageFromUrl(objectUrl);
  return { image, objectUrl, width: content.width, height: content.height };
}

export async function selectPdfPage(asset: ImageAsset, page: number, resolution = asset.pdf?.resolution ?? 144) {
  if (!asset.pdf) throw new Error(t('notPdf'));
  return renderPdfPage(asset.pdf.document, page, resolution);
}

export async function createPdfPageAsset(source: ImageAsset, page: number): Promise<ImageAsset> {
  if (!source.pdf) throw new Error(t('notPdf'));
  const pdf = source.pdf;
  pdf.refs.count += 1;
  try {
    const rendered = await selectPdfPage(source, page);
    return {
      name: source.name,
      ...rendered,
      pdf: { document: pdf.document, page, pageCount: pdf.pageCount, resolution: pdf.resolution, refs: pdf.refs },
    };
  } catch (error) {
    pdf.refs.count -= 1;
    if (pdf.refs.count === 0) void pdf.document.cleanup();
    throw error;
  }
}

export async function createTiffPageAsset(source: ImageAsset, page: number): Promise<ImageAsset> {
  if (!source.tiff) throw new Error(t('notTiff'));
  const rendered = await selectTiffPage(source, page);
  return {
    name: source.name,
    ...rendered,
    tiff: { pages: source.tiff.pages, page, converted16Bit: source.tiff.converted16Bit },
  };
}

export async function cloneImageAsset(source: ImageAsset): Promise<ImageAsset> {
  if (source.pdf) return createPdfPageAsset(source, source.pdf.page);
  if (source.tiff) return createTiffPageAsset(source, source.tiff.page);

  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error(t('copyCanvasInit'));
  context.drawImage(source.image, 0, 0);
  const objectUrl = await canvasBlobUrl(canvas);
  try {
    const image = await imageFromUrl(objectUrl);
    return { name: source.name, image, width: source.width, height: source.height, objectUrl };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}
