import { describe, expect, it } from 'vitest';
import { orientedSize, orientedToOriginal, originalToOriented, transformCss } from './orientation';
import type { OrientationState, Rotation } from '../types';

const ROTATIONS: Rotation[] = [0, 90, 180, 270];
const ALL: OrientationState[] = ROTATIONS.flatMap((rotation) =>
  [false, true].flatMap((flipH) => [false, true].map((flipV) => ({ rotation, flipH, flipV }))));

const label = (o: OrientationState) => `${o.rotation}度${o.flipH ? '・左右反転' : ''}${o.flipV ? '・上下反転' : ''}`;

describe('orientedSize', () => {
  it('90度と270度で縦横が入れ替わる', () => {
    expect(orientedSize(800, 600, { rotation: 90, flipH: false, flipV: false })).toEqual({ width: 600, height: 800 });
    expect(orientedSize(800, 600, { rotation: 270, flipH: false, flipV: false })).toEqual({ width: 600, height: 800 });
  });

  it('0度と180度では変わらない', () => {
    expect(orientedSize(800, 600, { rotation: 0, flipH: false, flipV: false })).toEqual({ width: 800, height: 600 });
    expect(orientedSize(800, 600, { rotation: 180, flipH: true, flipV: true })).toEqual({ width: 800, height: 600 });
  });

  it('反転は寸法に影響しない', () => {
    expect(orientedSize(800, 600, { rotation: 90, flipH: true, flipV: true })).toEqual({ width: 600, height: 800 });
  });
});

describe('座標変換の往復', () => {
  const width = 800;
  const height = 600;
  const points = [[0, 0], [width, height], [width / 2, height / 2], [123.4, 456.7], [width, 0]];

  // 回転・反転の16通りすべてで、変換して戻したら元の座標に一致すること。
  // ここが崩れると、回転後にカーソル位置や中心保持がずれる。
  for (const orientation of ALL) {
    it(`${label(orientation)}: 元に戻る`, () => {
      for (const [x, y] of points) {
        const to = originalToOriented(x, y, width, height, orientation);
        const back = orientedToOriginal(to.x, to.y, width, height, orientation);
        expect(back.x).toBeCloseTo(x, 9);
        expect(back.y).toBeCloseTo(y, 9);
      }
    });
  }
});

describe('originalToOriented の具体値', () => {
  const size = { width: 800, height: 600 };

  it('無変換なら座標はそのまま', () => {
    const result = originalToOriented(100, 200, size.width, size.height, { rotation: 0, flipH: false, flipV: false });
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(200);
  });

  it('90度回転で左上が右上へ移る', () => {
    const result = originalToOriented(0, 0, size.width, size.height, { rotation: 90, flipH: false, flipV: false });
    expect(result.x).toBeCloseTo(600);
    expect(result.y).toBeCloseTo(0);
  });

  it('左右反転で横方向が鏡像になる', () => {
    const result = originalToOriented(100, 200, size.width, size.height, { rotation: 0, flipH: true, flipV: false });
    expect(result.x).toBeCloseTo(700);
    expect(result.y).toBeCloseTo(200);
  });

  it('180度回転は両方向の反転と一致する', () => {
    const rotated = originalToOriented(100, 200, size.width, size.height, { rotation: 180, flipH: false, flipV: false });
    const flipped = originalToOriented(100, 200, size.width, size.height, { rotation: 0, flipH: true, flipV: true });
    expect(rotated.x).toBeCloseTo(flipped.x);
    expect(rotated.y).toBeCloseTo(flipped.y);
  });

  it('中心は回転しても中心のまま', () => {
    for (const orientation of ALL) {
      const out = orientedSize(size.width, size.height, orientation);
      const result = originalToOriented(size.width / 2, size.height / 2, size.width, size.height, orientation);
      expect(result.x).toBeCloseTo(out.width / 2);
      expect(result.y).toBeCloseTo(out.height / 2);
    }
  });
});

describe('transformCss', () => {
  it('表示位置・倍率・回転・反転をこの順で並べる', () => {
    const css = transformCss({ scale: 2, x: 10, y: 20 }, 800, 600, { rotation: 90, flipH: true, flipV: false });
    expect(css).toBe('translate(10px, 20px) scale(2) translate(300px, 400px) rotate(90deg) scale(-1, 1) translate(-400px, -300px)');
  });

  it('回転していなければ元の寸法の半分で戻す', () => {
    const css = transformCss({ scale: 1, x: 0, y: 0 }, 800, 600, { rotation: 0, flipH: false, flipV: false });
    expect(css).toContain('translate(400px, 300px)');
    expect(css).toContain('translate(-400px, -300px)');
  });
});
