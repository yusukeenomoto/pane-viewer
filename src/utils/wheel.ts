// macOS ではトラックパッドの2本指スクロールもマウスホイールも同じ wheel イベントで届く。
// ピンチは ctrlKey で確実に分かるが、残りは delta の性質から推測するしかない。
// 横成分がある、刻みが小数、刻みが細かい、のいずれかならトラックパッド。
// 1回の操作の途中で判定が揺れないよう、直近の判定を少しの間引き継ぐ。
const CARRY_MS = 500;
const NOTCH = 40;

let trackpadUntil = 0;

export function isTrackpadScroll(event: Pick<WheelEvent, 'deltaMode' | 'deltaX' | 'deltaY' | 'timeStamp'>) {
  if (event.deltaMode !== 0) return false;
  if (event.deltaX !== 0 || !Number.isInteger(event.deltaY) || Math.abs(event.deltaY) < NOTCH) {
    trackpadUntil = event.timeStamp + CARRY_MS;
    return true;
  }
  return event.timeStamp < trackpadUntil;
}

export function resetWheelDetection() { trackpadUntil = 0; }
