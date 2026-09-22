export type Language = 'ja' | 'en';

const languageKey = 'image-viewer.language.v1';
const messages: Record<Language, Record<string, string>> = {
  ja: {
    appTitle: 'PaneViewer', toolbarAria: '画像ビューア操作', fit: 'Fit', fitTitle: '全体表示 (0)', actual: '100%', actualTitle: '100%表示 (1)', resetOrientation: '向きリセット',
    gridSettings: 'グリッド設定', rows: '行数', columns: '列数', scale: '倍率', syncOn: '⛓ 同期 ON', syncOff: '⛓̸ 同期 OFF', syncTitleOn: '同期: ON (S)', syncTitleOff: '同期: OFF (S)',
    pdfResolution: 'PDF解像度', target: '対象', allPanes: '全ペイン', rotateLeftTitle: '左90°回転 (Shift+R)', rotateRightTitle: '右90°回転 (R)', flipHTitle: '左右反転 (H)', flipVTitle: '上下反転 (V)',
    labels: 'ラベル', divider: '区切り', background: '背景色', dark: '暗背景', light: '明背景', transparent: '透明', save: '📷 保存', saveTitle: 'スクリーンショットを保存 (Ctrl/⌘+S)', copy: '📋 コピー', copyTitle: 'PNGをコピー (Ctrl/⌘+Shift+C)',
    record: '⏺ 録画', recordTitle: 'ズームやページ送りの操作を、動画と操作ログとして保存（最長5分）', stopRecordingWithTime: '⏹ 停止 {time}', stopRecordingTitle: '録画を終了して動画と操作ログを保存',
    recordingStarted: '録画を開始しました', recordingSaved: '動画と操作ログを保存しました（{seconds}秒 / {format}）', recordingLogFailed: '操作ログを保存できませんでした（動画は保存済み）', recordingLimit: '最長5分に達したため録画を終了しました', recordingWebmNote: 'WebM形式です。QuickTimeやPowerPointでは再生できない場合があります',
    saveLogAgain: '操作ログを保存', restored: '表示状態を復元しました', restoredWaiting: '表示状態を復元しました。{files} を読み込むと残りも復元します', restoreInvalid: 'PaneViewerの操作ログJSONではありません', recordingUnsupported: 'このブラウザは動画の保存に対応していません', recordingNoArea: '録画する領域がありません', recordingNotStarted: '録画は開始されていません', recordingEmpty: '録画データが空でした', recordingFailed: '録画に失敗しました', recordingError: '録画エラー: {message}',
    disclaimer: 'このアプリは視覚的に確認を行うもので、ファイル間の一致を保証するものではありません。', compareImages: '比較画像', noImage: '画像なし', cursorNone: 'カーソル: —', language: '言語', japanese: '日本語', english: 'English', licenseInfo: 'ライセンス情報',
    licenseBody: '本アプリケーションは <a href="./LICENSE" target="_blank" rel="noreferrer">MIT License</a> の下で公開されています。PDF表示には、本アプリケーションとは別ライセンスの <a href="https://github.com/mozilla/pdfjs-dist" target="_blank" rel="noreferrer">PDF.js（Apache License 2.0）</a>、TIFF表示には <a href="https://github.com/photopea/UTIF.js" target="_blank" rel="noreferrer">UTIF.js（MIT License）</a>を使用しています。依存ライセンスの本文と著作権表示は <a href="./THIRD-PARTY-NOTICES.md" target="_blank" rel="noreferrer">THIRD-PARTY-NOTICES.md</a> を確認してください。',
    imageLabel: '画像{n}', paneAria: '{label}ペイン。クリックまたは画像をドロップして読み込み', independent: '独立', duplicate: '複製', duplicateAria: '{label}を複製', close: '×', closeAria: '{label}を閉じる', fileChangeTitle: 'クリックしてファイルを変更', fileInputAria: '{label}の画像を選択', emptyMessage: '画像をドロップ<br>またはクリックして選択',
    loading: '読み込み中…', loadingResolution: '解像度を変更中…', duplicating: '複製中…', loadingError: '読み込みエラー: {message}', pdfPageError: '読み込みエラー: {message}', resolutionError: 'PDF解像度の変更に失敗: {message}', duplicateError: '複製エラー: {message}',
    previousPage: '前のページ', nextPage: '次のページ', pageCounter: '{current}/{total}', converted16: ' · 16bit→8bit変換表示', cursor: 'カーソル: {x}, {y} px',
    swapped: '{name}を入れ替えました', noEmptyPane: '空いているペインがありません', noMorePanes: 'これ以上ペインを増やせません', duplicated: '{name}を複製しました', copySuccess: 'コピーしました', saved: '保存しました', exportError: '出力エラー: {message}', sizeWarning: '⚠ 画像サイズが異なります', pdfResolutionChanged: 'PDF解像度を{value}dpiに変更しました',
    imageTimeout: '画像の読み込みがタイムアウトしました', imageFormat: 'ブラウザがこの画像形式を表示できません', canvasInit: 'Canvasを初期化できません', pdfCanvasInit: 'PDFの描画用Canvasを初期化できません', imageConvert: '画像を変換できません', pdfPageOutOfRange: 'PDFのページ番号が範囲外です', notTiff: 'TIFFではありません', notPdf: 'PDFではありません', copyCanvasInit: '画像複製用Canvasを初期化できません',
    tiffDecodeError: 'TIFFをデコードできませんでした', tiffWorkerStartError: 'TIFFデコーダーを起動できませんでした', tiffWorkerCommunicationError: 'TIFFデコーダーとの通信に失敗しました', tiffTimeout: 'TIFFの読み込みがタイムアウトしました', tiffTransferError: 'TIFFをデコーダーへ渡せませんでした', screenshotError: 'スクリーンショットを作成できません', noImageLabel: '(画像なし)',
  },
  en: {
    appTitle: 'PaneViewer', toolbarAria: 'Image viewer controls', fit: 'Fit', fitTitle: 'Fit to view (0)', actual: '100%', actualTitle: 'Actual size (1)', resetOrientation: 'Reset orientation',
    gridSettings: 'Grid settings', rows: 'Rows', columns: 'Columns', scale: 'Scale', syncOn: '⛓ Sync ON', syncOff: '⛓̸ Sync OFF', syncTitleOn: 'Sync: ON (S)', syncTitleOff: 'Sync: OFF (S)',
    pdfResolution: 'PDF resolution', target: 'Target', allPanes: 'All panes', rotateLeftTitle: 'Rotate left 90° (Shift+R)', rotateRightTitle: 'Rotate right 90° (R)', flipHTitle: 'Flip horizontal (H)', flipVTitle: 'Flip vertical (V)',
    labels: 'Labels', divider: 'Divider', background: 'Background', dark: 'Dark', light: 'Light', transparent: 'Transparent', save: '📷 Save', saveTitle: 'Save screenshot (Ctrl/⌘+S)', copy: '📋 Copy', copyTitle: 'Copy PNG (Ctrl/⌘+Shift+C)',
    record: '⏺ Record', recordTitle: 'Record zooming and page turns as a video plus an operation log (up to 5 minutes)', stopRecordingWithTime: '⏹ Stop {time}', stopRecordingTitle: 'Finish recording and save the video and log',
    recordingStarted: 'Recording started', recordingSaved: 'Saved video + operation log ({seconds}s / {format})', recordingLogFailed: 'Could not save the operation log (the video was saved)', recordingLimit: 'Recording stopped at the 5 minute limit', recordingWebmNote: 'Saved as WebM, which QuickTime and PowerPoint may not play',
    saveLogAgain: 'Save operation log', restored: 'View state restored', restoredWaiting: 'View state restored. Open {files} to restore the rest', restoreInvalid: 'Not a PaneViewer operation log', recordingUnsupported: 'This browser cannot save video', recordingNoArea: 'There is no area to record', recordingNotStarted: 'Recording has not started', recordingEmpty: 'The recording was empty', recordingFailed: 'Recording failed', recordingError: 'Recording error: {message}',
    disclaimer: 'This app is for visual inspection only. It does not guarantee that files match.', compareImages: 'Comparison images', noImage: 'No image', cursorNone: 'Cursor: —', language: 'Language', japanese: '日本語', english: 'English', licenseInfo: 'License information',
    licenseBody: 'This application is released under the <a href="./LICENSE" target="_blank" rel="noreferrer">MIT License</a>. PDF rendering uses <a href="https://github.com/mozilla/pdfjs-dist" target="_blank" rel="noreferrer">PDF.js (Apache License 2.0)</a>, which is licensed separately from this application. TIFF rendering uses <a href="https://github.com/photopea/UTIF.js" target="_blank" rel="noreferrer">UTIF.js (MIT License)</a>. See <a href="./THIRD-PARTY-NOTICES.md" target="_blank" rel="noreferrer">THIRD-PARTY-NOTICES.md</a> for third-party license texts and notices.',
    imageLabel: 'Image {n}', paneAria: '{label} pane. Click or drop an image to load it', independent: 'Independent', duplicate: 'Duplicate', duplicateAria: 'Duplicate {label}', close: '×', closeAria: 'Close {label}', fileChangeTitle: 'Click to choose another file', fileInputAria: 'Choose an image for {label}', emptyMessage: 'Drop an image<br>or click to choose one',
    loading: 'Loading…', loadingResolution: 'Changing resolution…', duplicating: 'Duplicating…', loadingError: 'Load error: {message}', pdfPageError: 'Load error: {message}', resolutionError: 'Could not change PDF resolution: {message}', duplicateError: 'Duplication error: {message}',
    previousPage: 'Previous page', nextPage: 'Next page', pageCounter: '{current}/{total}', converted16: ' · 16-bit → 8-bit display', cursor: 'Cursor: {x}, {y} px',
    swapped: 'Swapped {name}', noEmptyPane: 'No empty pane is available', noMorePanes: 'No more panes can be added', duplicated: 'Duplicated {name}', copySuccess: 'Copied', saved: 'Saved', exportError: 'Export error: {message}', sizeWarning: '⚠ Image sizes differ', pdfResolutionChanged: 'PDF resolution changed to {value} dpi',
    imageTimeout: 'Image loading timed out', imageFormat: 'The browser cannot display this image format', canvasInit: 'Could not initialize Canvas', pdfCanvasInit: 'Could not initialize the PDF rendering Canvas', imageConvert: 'Could not convert the image', pdfPageOutOfRange: 'PDF page number is out of range', notTiff: 'Not a TIFF file', notPdf: 'Not a PDF file', copyCanvasInit: 'Could not initialize the image duplication Canvas',
    tiffDecodeError: 'Could not decode the TIFF', tiffWorkerStartError: 'Could not start the TIFF decoder', tiffWorkerCommunicationError: 'TIFF decoder communication failed', tiffTimeout: 'TIFF loading timed out', tiffTransferError: 'Could not send the TIFF to the decoder', screenshotError: 'Could not create the screenshot', noImageLabel: '(No image)',
  },
};

let language: Language = (() => {
  try {
    const value = localStorage.getItem(languageKey);
    return value === 'en' ? 'en' : 'ja';
  } catch { return 'ja'; }
})();

export function getLanguage() { return language; }

export function setLanguage(value: Language) {
  language = value;
  try { localStorage.setItem(languageKey, value); } catch { /* storage is optional */ }
}

export function t(key: string, values: Record<string, string | number> = {}) {
  const template = messages[language][key] ?? messages.ja[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}
