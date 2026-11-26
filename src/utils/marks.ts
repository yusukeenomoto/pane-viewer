// レ点チェックの形・当たり判定・設定の読み書き。DOM に触らない部分だけを置く。

// x, y は回転・反転前の元画像のピクセル座標。拡大縮小や向きを変えても同じ場所に付いて回る。
// size は向きを当てた後の画像上のピクセル数で、レ点そのものは常に正立で描く。
export interface CheckMark { x: number; y: number; size: number; color: string }
export interface CheckStyle { color: string; size: number }

export const CHECK_SIZE_MIN = 12;
export const CHECK_SIZE_MAX = 160;
export const DEFAULT_CHECK_STYLE: CheckStyle = { color: '#e5383b', size: 36 };
// 線の太さは大きさに対する比率。小さくしても潰れず、大きくしても細く見えない値にしている。
export const CHECK_STROKE_RATIO = 0.13;

// 中心を原点とし、大きさ1の箱に収めたレ点の3点。左の短い払いから右上へ跳ね上げる。
const SHAPE: ReadonlyArray<readonly [number, number]> = [[-0.42, 0.02], [-0.12, 0.34], [0.42, -0.36]];

export function checkPoints(cx: number, cy: number, size: number) {
  return SHAPE.map(([x, y]) => ({ x: cx + x * size, y: cy + y * size }));
}

export function checkSvgPath(cx: number, cy: number, size: number) {
  const [a, b, c] = checkPoints(cx, cy, size);
  const n = (value: number) => Math.round(value * 100) / 100;
  return `M${n(a.x)} ${n(a.y)}L${n(b.x)} ${n(b.y)}L${n(c.x)} ${n(c.y)}`;
}

export function drawCheck(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  const [a, b, c] = checkPoints(cx, cy, size);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * CHECK_STROKE_RATIO;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y);
  ctx.stroke();
  ctx.restore();
}

// 押した位置にいちばん近く、かつ半径内にあるレ点の番号。無ければ -1。
// 重なっているときは後から付けた方（上に描かれている方）を優先する。
export function findMarkAt(marks: ReadonlyArray<{ x: number; y: number; radius: number }>, x: number, y: number) {
  let found = -1;
  let best = Infinity;
  marks.forEach((mark, index) => {
    const distance = Math.hypot(mark.x - x, mark.y - y);
    if (distance <= mark.radius && distance <= best) { best = distance; found = index; }
  });
  return found;
}

// PDF の解像度を変えると画像のピクセル数が変わるので、同じ場所に残るよう座標と大きさを掛け直す。
export function scaleMarks(marks: readonly CheckMark[], ratio: number): CheckMark[] {
  return marks.map((mark) => ({ ...mark, x: mark.x * ratio, y: mark.y * ratio, size: mark.size * ratio }));
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

export function clampCheckSize(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_CHECK_STYLE.size;
  return Math.min(CHECK_SIZE_MAX, Math.max(CHECK_SIZE_MIN, Math.round(number)));
}

export function parseCheckStyle(text: string | null): CheckStyle {
  try {
    const value = JSON.parse(text ?? '{}') as Partial<CheckStyle>;
    return {
      color: isHexColor(value.color) ? value.color.toLowerCase() : DEFAULT_CHECK_STYLE.color,
      size: value.size === undefined ? DEFAULT_CHECK_STYLE.size : clampCheckSize(value.size),
    };
  } catch { return { ...DEFAULT_CHECK_STYLE }; }
}

// 書き出すファイル名。元の名前から拡張子とファイル名に使えない文字を落とす。
export function checkedFileName(name: string, page: number | undefined, stamp: string) {
  const base = name.replace(/\.[^./\\]+$/, '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').trim() || 'image';
  return `${base}${page ? `_p${page}` : ''}_checked_${stamp}.png`;
}
