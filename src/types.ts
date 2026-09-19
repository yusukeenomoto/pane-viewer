import type { PDFDocumentProxy } from 'pdfjs-dist';

export type PaneId = string;
export type GridDimension = 1 | 2 | 3;
export type Rotation = 0 | 90 | 180 | 270;
export type PdfResolution = 72 | 96 | 144 | 216 | 300;

export interface GridSettings {
  rows: GridDimension;
  columns: GridDimension;
}

export interface ViewState { scale: number; x: number; y: number }
export interface OrientationState { rotation: Rotation; flipH: boolean; flipV: boolean }
export interface PdfDocumentRef { count: number }
export interface ImageAsset {
  name: string;
  image: HTMLImageElement;
  width: number;
  height: number;
  objectUrl: string;
  tiff?: { pages: DecodedTiffPage[]; page: number; converted16Bit: boolean };
  pdf?: { document: PDFDocumentProxy; page: number; pageCount: number; resolution: PdfResolution; refs: PdfDocumentRef };
}
export interface DecodedTiffPage { width: number; height: number; rgba: ArrayBuffer; bitsPerSample: number }
export interface CursorInfo { x: number; y: number; inside: boolean }
export interface ExportOptions {
  format: 'image/png' | 'image/jpeg'; labels: boolean; divider: boolean; background: 'dark' | 'light' | 'transparent';
}

export const DEFAULT_VIEW: ViewState = { scale: 1, x: 0, y: 0 };
export const DEFAULT_ORIENTATION: OrientationState = { rotation: 0, flipH: false, flipV: false };
