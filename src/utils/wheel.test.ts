import { beforeEach, describe, expect, it } from 'vitest';
import { isTrackpadScroll, resetWheelDetection } from './wheel';

type Wheelish = Pick<WheelEvent, 'deltaMode' | 'deltaX' | 'deltaY' | 'timeStamp'>;
const wheel = (values: Partial<Wheelish>): Wheelish => ({ deltaMode: 0, deltaX: 0, deltaY: 0, timeStamp: 0, ...values });

describe('isTrackpadScroll', () => {
  beforeEach(resetWheelDetection);

  it('横方向の成分があればトラックパッド', () => {
    expect(isTrackpadScroll(wheel({ deltaX: -3, deltaY: 7, timeStamp: 1000 }))).toBe(true);
  });

  it('刻みが小数ならトラックパッド', () => {
    expect(isTrackpadScroll(wheel({ deltaY: 2.5, timeStamp: 1000 }))).toBe(true);
  });

  it('刻みが細かければトラックパッド', () => {
    expect(isTrackpadScroll(wheel({ deltaY: 12, timeStamp: 1000 }))).toBe(true);
  });

  it('マウスホイールの1ノッチはトラックパッドではない', () => {
    expect(isTrackpadScroll(wheel({ deltaY: 100, timeStamp: 1000 }))).toBe(false);
    expect(isTrackpadScroll(wheel({ deltaY: -100, timeStamp: 2000 }))).toBe(false);
  });

  it('行単位・ページ単位はマウス扱い', () => {
    expect(isTrackpadScroll(wheel({ deltaMode: 1, deltaY: 3, timeStamp: 1000 }))).toBe(false);
    expect(isTrackpadScroll(wheel({ deltaMode: 2, deltaY: 1, timeStamp: 1000 }))).toBe(false);
  });

  // 慣性スクロールの終盤はマウスホイールと見分けがつかない値になる。
  // ここで判定が反転すると、1回のスワイプの途中で移動から拡大に化ける。
  it('直近の判定を500ms引き継ぐ', () => {
    expect(isTrackpadScroll(wheel({ deltaY: 2.5, timeStamp: 1000 }))).toBe(true);
    expect(isTrackpadScroll(wheel({ deltaY: 120, timeStamp: 1200 }))).toBe(true);
    expect(isTrackpadScroll(wheel({ deltaY: 120, timeStamp: 1499 }))).toBe(true);
  });

  it('引き継ぎ期間を過ぎればマウスと判定する', () => {
    expect(isTrackpadScroll(wheel({ deltaY: 2.5, timeStamp: 1000 }))).toBe(true);
    expect(isTrackpadScroll(wheel({ deltaY: 120, timeStamp: 1500 }))).toBe(false);
  });

  it('引き継ぎは新しい判定のたびに延長される', () => {
    isTrackpadScroll(wheel({ deltaY: 2.5, timeStamp: 1000 }));
    isTrackpadScroll(wheel({ deltaY: 2.5, timeStamp: 1400 }));
    expect(isTrackpadScroll(wheel({ deltaY: 120, timeStamp: 1800 }))).toBe(true);
  });

  it('マウス操作は引き継ぎを発生させない', () => {
    expect(isTrackpadScroll(wheel({ deltaY: 100, timeStamp: 1000 }))).toBe(false);
    expect(isTrackpadScroll(wheel({ deltaY: 100, timeStamp: 1100 }))).toBe(false);
  });
});
