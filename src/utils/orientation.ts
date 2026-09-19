import type { OrientationState } from '../types';

export function orientedSize(width: number, height: number, orientation: OrientationState) {
  return orientation.rotation === 90 || orientation.rotation === 270 ? { width: height, height: width } : { width, height };
}

export function originalToOriented(x: number, y: number, width: number, height: number, o: OrientationState) {
  const out = orientedSize(width, height, o);
  let px = x - width / 2;
  let py = y - height / 2;
  if (o.flipH) px = -px;
  if (o.flipV) py = -py;
  const r = o.rotation * Math.PI / 180;
  const rx = px * Math.cos(r) - py * Math.sin(r);
  const ry = px * Math.sin(r) + py * Math.cos(r);
  return { x: rx + out.width / 2, y: ry + out.height / 2 };
}

export function orientedToOriginal(x: number, y: number, width: number, height: number, o: OrientationState) {
  const out = orientedSize(width, height, o);
  let px = x - out.width / 2;
  let py = y - out.height / 2;
  const r = -o.rotation * Math.PI / 180;
  const rx = px * Math.cos(r) - py * Math.sin(r);
  const ry = px * Math.sin(r) + py * Math.cos(r);
  if (o.flipH) px = -rx; else px = rx;
  if (o.flipV) py = -ry; else py = ry;
  return { x: px + width / 2, y: py + height / 2 };
}

export function transformCss(view: { scale: number; x: number; y: number }, width: number, height: number, o: OrientationState) {
  const out = orientedSize(width, height, o);
  return `translate(${view.x}px, ${view.y}px) scale(${view.scale}) translate(${out.width / 2}px, ${out.height / 2}px) rotate(${o.rotation}deg) scale(${o.flipH ? -1 : 1}, ${o.flipV ? -1 : 1}) translate(${-width / 2}px, ${-height / 2}px)`;
}
