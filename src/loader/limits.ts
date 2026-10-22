// Chrome の Canvas が扱える面積の上限（16384×16384）。これを超える画像は描けず、
// RGBA で 1GB を超えるためタブごと落ちかねない。細工したファイルへの備えでもある。
export const MAX_PIXELS = 16384 * 16384;
// TIFF ワーカーから本体へ「大きすぎる」を伝えるための値。ワーカーでは翻訳を引けない。
export const TOO_LARGE = 'too-large';
