import { cpSync, rmSync } from 'node:fs';

// PDF.js は、フォントを埋め込んでいないPDFを描くのに cmaps（CJKの文字コード変換表）と
// standard_fonts（標準14フォントの実体）を実行時に取得する。これらが無いと本文が消える。
// dev と build の両方で配信できるよう public/ へ置く（public/ は .gitignore 済み）。
for (const name of ['cmaps', 'standard_fonts']) {
  const target = new URL(`../public/${name}`, import.meta.url);
  rmSync(target, { recursive: true, force: true });
  cpSync(new URL(`../node_modules/pdfjs-dist/${name}`, import.meta.url), target, { recursive: true });
}
