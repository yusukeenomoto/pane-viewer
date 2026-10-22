/// <reference lib="webworker" />
import UTIF from 'utif';
import { MAX_PIXELS, TOO_LARGE } from './limits';

self.onmessage = (event: MessageEvent<{ id: number; buffer: ArrayBuffer }>) => {
  try {
    const id = event.data.id;
    const buffer = event.data.buffer;
    const ifds = UTIF.decode(buffer);
    if (!ifds.length) throw new Error('画像ページが見つかりません');
    // 全ページを先に RGBA へ展開するので、展開する前に合計の画素数で止める。
    const pixels = ifds.reduce((sum, ifd) => sum + (ifd.t256?.[0] ?? 0) * (ifd.t257?.[0] ?? 0), 0);
    if (pixels > MAX_PIXELS) throw new Error(TOO_LARGE);
    const pages = ifds.map((ifd) => {
      UTIF.decodeImage(buffer, ifd, ifds);
      const rgba = UTIF.toRGBA8(ifd);
      const bits = (ifd.bitsPerSample?.[0] ?? 8);
      return { width: ifd.width, height: ifd.height, bitsPerSample: bits, rgba: rgba.buffer };
    });
    self.postMessage({ id, ok: true, pages }, pages.map((page) => page.rgba));
  } catch (error) {
    self.postMessage({ id: event.data.id, ok: false, error: error instanceof Error ? error.message : 'TIFFをデコードできませんでした' });
  }
};
