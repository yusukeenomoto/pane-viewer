import { cpSync, readdirSync, rmSync } from 'node:fs';

// PDF.js は、フォントを埋め込んでいないPDFを描くのに cmaps（CJKの文字コード変換表）と
// standard_fonts（標準14フォントの実体）を実行時に取得する。これらが無いと本文が消える。
// dev と build の両方で配信できるよう public/ へ置く（public/ は .gitignore 済み）。
for (const name of ['cmaps', 'standard_fonts']) {
  const target = new URL(`../public/${name}`, import.meta.url);
  rmSync(target, { recursive: true, force: true });
  cpSync(new URL(`../node_modules/pdfjs-dist/${name}`, import.meta.url), target, { recursive: true });
}

// public/ の中身はそのまま dist/ へ入り、配信される。Finder が置く .DS_Store が
// 混ざると公開物になってしまうため、ビルドのたびに掃除する。
for (const entry of readdirSync(new URL('../public/', import.meta.url), { recursive: true })) {
  if (String(entry).endsWith('.DS_Store')) rmSync(new URL(`../public/${entry}`, import.meta.url), { force: true });
}
