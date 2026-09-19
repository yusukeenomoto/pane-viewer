declare module 'utif' {
  const UTIF: {
    decode(buffer: ArrayBuffer): Array<{ width: number; height: number; bitsPerSample?: number[] }>;
    decodeImage(buffer: ArrayBuffer, ifd: unknown, ifds: unknown[]): void;
    toRGBA8(ifd: unknown): Uint8Array;
  };
  export = UTIF;
}

declare module 'pdfjs-dist/build/pdf.worker.mjs?url' {
  const url: string;
  export default url;
}
