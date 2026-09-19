/// <reference lib="webworker" />
import UTIF from 'utif';

self.onmessage = (event: MessageEvent<{ id: number; buffer: ArrayBuffer }>) => {
  try {
    const id = event.data.id;
    const buffer = event.data.buffer;
    const ifds = UTIF.decode(buffer);
    if (!ifds.length) throw new Error('画像ページが見つかりません');
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
