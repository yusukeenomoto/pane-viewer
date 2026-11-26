import { describe, expect, it } from 'vitest';
import { checkedFileName, checkPoints, CHECK_SIZE_MAX, CHECK_SIZE_MIN, DEFAULT_CHECK_STYLE, findMarkAt, parseCheckStyle, scaleMarks } from './marks';

describe('レ点の形', () => {
  it('押した点を中心に、指定した大きさの箱に収まる', () => {
    const points = checkPoints(100, 50, 40);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(40);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(40);
    expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(100, 0);
    expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(50, 0);
  });

  it('右端が左端より高く、谷が最も低い', () => {
    const [left, valley, right] = checkPoints(0, 0, 10);
    expect(right.y).toBeLessThan(left.y);
    expect(valley.y).toBeGreaterThan(left.y);
    expect(left.x).toBeLessThan(valley.x);
    expect(valley.x).toBeLessThan(right.x);
  });
});

describe('当たり判定', () => {
  const marks = [{ x: 0, y: 0, radius: 10 }, { x: 15, y: 0, radius: 10 }];

  it('半径の外なら何も選ばない', () => {
    expect(findMarkAt(marks, 100, 100)).toBe(-1);
    expect(findMarkAt([], 0, 0)).toBe(-1);
  });

  it('近い方を選ぶ', () => {
    expect(findMarkAt(marks, 2, 0)).toBe(0);
    expect(findMarkAt(marks, 13, 0)).toBe(1);
  });

  it('同じ距離なら後から付けた方を選ぶ', () => {
    expect(findMarkAt(marks, 7.5, 0)).toBe(1);
  });
});

describe('解像度変更', () => {
  it('座標と大きさを同じ比率で掛け直し、色は保つ', () => {
    expect(scaleMarks([{ x: 10, y: 20, size: 30, color: '#112233' }], 2)).toEqual([{ x: 20, y: 40, size: 60, color: '#112233' }]);
  });
});

describe('設定の読み込み', () => {
  it('壊れた値や未保存なら既定値に戻す', () => {
    expect(parseCheckStyle(null)).toEqual(DEFAULT_CHECK_STYLE);
    expect(parseCheckStyle('not json')).toEqual(DEFAULT_CHECK_STYLE);
    expect(parseCheckStyle('{"color":"red","size":"abc"}')).toEqual(DEFAULT_CHECK_STYLE);
  });

  it('色は #rrggbb だけを受け、大きさは範囲内に収める', () => {
    expect(parseCheckStyle('{"color":"#00AA11","size":48}')).toEqual({ color: '#00aa11', size: 48 });
    expect(parseCheckStyle('{"size":1}').size).toBe(CHECK_SIZE_MIN);
    expect(parseCheckStyle('{"size":9999}').size).toBe(CHECK_SIZE_MAX);
  });
});

describe('書き出しのファイル名', () => {
  it('拡張子を外し、ページ番号と時刻を付ける', () => {
    expect(checkedFileName('scan.page.tif', 3, '20260101_000000')).toBe('scan.page_p3_checked_20260101_000000.png');
    expect(checkedFileName('photo.png', undefined, 'x')).toBe('photo_checked_x.png');
  });

  it('ファイル名に使えない文字は置き換える', () => {
    expect(checkedFileName('a/b:c?.pdf', undefined, 'x')).toBe('a_b_c__checked_x.png');
    expect(checkedFileName('.png', undefined, 'x')).toBe('image_checked_x.png');
  });
});
