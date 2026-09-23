import { beforeEach, describe, expect, it } from 'vitest';
import { getSettings, ViewStore, type Settings } from './state';
import type { PaneId, ViewState } from './types';

const ids: PaneId[] = ['pane-0', 'pane-1', 'pane-2'];
const settings = (sync: boolean): Settings => ({ sync, rows: 1, columns: 3, pdfResolution: 144 });

function store(sync: boolean) {
  const value = new ViewStore(settings(sync), ids, () => {});
  // 位置も倍率もばらばらの状態から始める。
  value.views['pane-0'] = { scale: 1, x: 0, y: 0 };
  value.views['pane-1'] = { scale: 1.5, x: 40, y: -25 };
  value.views['pane-2'] = { scale: 0.5, x: -10, y: 60 };
  return value;
}

const snapshot = (value: ViewStore) => JSON.parse(JSON.stringify(value.views)) as Record<PaneId, ViewState>;

// ペインの操作と同じ形でズームさせる。
function zoomAt(value: ViewStore, id: PaneId, x: number, y: number, factor: number) {
  value.update(id, (view) => {
    const next = Math.min(64, Math.max(0.01, view.scale * factor));
    const applied = next / view.scale;
    view.x = x - (x - view.x) * applied;
    view.y = y - (y - view.y) * applied;
    view.scale = next;
  });
}

describe('同期の開始', () => {
  it('同期をONにしても、その瞬間は何も動かない', () => {
    const value = store(false);
    const before = snapshot(value);
    value.setSync(true);
    expect(snapshot(value)).toEqual(before);
  });

  it('同期をOFFに戻しても状態は保たれる', () => {
    const value = store(true);
    const before = snapshot(value);
    value.setSync(false);
    expect(snapshot(value)).toEqual(before);
  });
});

describe('同期中のズーム', () => {
  it('全ペインが同じ比率で拡大する', () => {
    const value = store(true);
    const before = snapshot(value);
    zoomAt(value, 'pane-0', 300, 200, 1.1);
    for (const id of ids) expect(value.views[id].scale / before[id].scale).toBeCloseTo(1.1, 12);
  });

  it('倍率の相対関係が保たれる', () => {
    const value = store(true);
    const before = snapshot(value);
    zoomAt(value, 'pane-0', 300, 200, 1.1);
    for (const id of ids) {
      expect(value.views[id].scale / value.views['pane-0'].scale)
        .toBeCloseTo(before[id].scale / before['pane-0'].scale, 12);
    }
  });

  it('ペイン間の位置のずれが倍率どおりに変化する', () => {
    const value = store(true);
    const before = snapshot(value);
    zoomAt(value, 'pane-0', 300, 200, 1.1);
    for (const id of ids) {
      expect(value.views[id].x - value.views['pane-0'].x).toBeCloseTo(1.1 * (before[id].x - before['pane-0'].x), 9);
      expect(value.views[id].y - value.views['pane-0'].y).toBeCloseTo(1.1 * (before[id].y - before['pane-0'].y), 9);
    }
  });

  it('縮小でも相対関係が保たれる', () => {
    const value = store(true);
    const before = snapshot(value);
    zoomAt(value, 'pane-0', 120, 90, 1 / 1.1);
    for (const id of ids) {
      expect(value.views[id].x - value.views['pane-0'].x).toBeCloseTo((before[id].x - before['pane-0'].x) / 1.1, 9);
    }
  });

  it('操作していないペインを起点にしても成り立つ', () => {
    const value = store(true);
    const before = snapshot(value);
    zoomAt(value, 'pane-2', 500, 400, 1.25);
    for (const id of ids) expect(value.views[id].scale / before[id].scale).toBeCloseTo(1.25, 12);
  });
});

describe('同期中の平行移動', () => {
  it('全ペインが同じ量だけ動き、倍率は変わらない', () => {
    const value = store(true);
    const before = snapshot(value);
    value.update('pane-0', (view) => { view.x += 30; view.y -= 12; });
    for (const id of ids) {
      expect(value.views[id].x - before[id].x).toBeCloseTo(30, 12);
      expect(value.views[id].y - before[id].y).toBeCloseTo(-12, 12);
      expect(value.views[id].scale).toBe(before[id].scale);
    }
  });
});

describe('同期OFF', () => {
  it('他のペインは動かない', () => {
    const value = store(false);
    const before = snapshot(value);
    zoomAt(value, 'pane-0', 300, 200, 2);
    expect(value.views['pane-1']).toEqual(before['pane-1']);
    expect(value.views['pane-2']).toEqual(before['pane-2']);
  });
});

describe('set と alignTo', () => {
  it('set は他のペインへ配らない', () => {
    const value = store(true);
    const before = snapshot(value);
    value.set('pane-0', { scale: 3, x: 5, y: 5 });
    expect(value.views['pane-0']).toEqual({ scale: 3, x: 5, y: 5 });
    expect(value.views['pane-1']).toEqual(before['pane-1']);
  });

  it('set は渡された値を複製する', () => {
    const value = store(true);
    const source: ViewState = { scale: 3, x: 5, y: 5 };
    value.set('pane-0', source);
    source.scale = 99;
    expect(value.views['pane-0'].scale).toBe(3);
  });

  it('alignTo で全ペインが同じ表示状態になる', () => {
    const value = store(true);
    value.alignTo('pane-1');
    for (const id of ids) expect(value.views[id]).toEqual({ scale: 1.5, x: 40, y: -25 });
  });

  it('alignTo の複製が参照を共有しない', () => {
    const value = store(true);
    value.alignTo('pane-1');
    value.views['pane-0'].x = 999;
    expect(value.views['pane-1'].x).toBe(40);
  });
});

describe('倍率の上下限', () => {
  it('下限に達しても有効な値を保つ', () => {
    const value = store(true);
    value.views['pane-2'] = { scale: 0.01, x: 0, y: 0 };
    zoomAt(value, 'pane-0', 100, 100, 0.5);
    expect(value.views['pane-2'].scale).toBeGreaterThanOrEqual(0.01);
    expect(Number.isFinite(value.views['pane-2'].x)).toBe(true);
  });

  it('上限を超えない', () => {
    const value = store(true);
    value.views['pane-1'] = { scale: 60, x: 0, y: 0 };
    zoomAt(value, 'pane-0', 100, 100, 4);
    expect(value.views['pane-1'].scale).toBeLessThanOrEqual(64);
  });
});

describe('swap と grid', () => {
  it('swap で2枚の表示状態が入れ替わる', () => {
    const value = store(false);
    const before = snapshot(value);
    value.swap('pane-0', 'pane-1');
    expect(value.views['pane-0']).toEqual(before['pane-1']);
    expect(value.views['pane-1']).toEqual(before['pane-0']);
  });

  it('同じペイン同士の swap は何もしない', () => {
    const value = store(false);
    const before = snapshot(value);
    value.swap('pane-0', 'pane-0');
    expect(snapshot(value)).toEqual(before);
  });

  it('setGrid が行数と列数を反映する', () => {
    const value = store(false);
    value.setGrid(3, 2);
    expect(value.grid).toEqual({ rows: 3, columns: 2 });
  });
});

describe('getSettings', () => {
  const memory = new Map<string, string>();
  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => void memory.set(key, value),
      },
    });
  });

  const save = (value: unknown) => memory.set('image-viewer.settings.v1', JSON.stringify(value));

  it('保存が無ければ既定値を返す', () => {
    expect(getSettings()).toEqual({ sync: true, rows: 1, columns: 2, pdfResolution: 144 });
  });

  it('保存された値を読み戻す', () => {
    save({ sync: false, rows: 3, columns: 2, pdfResolution: 300 });
    expect(getSettings()).toEqual({ sync: false, rows: 3, columns: 2, pdfResolution: 300 });
  });

  it('旧い縦並び設定を2行1列として引き継ぐ', () => {
    save({ layout: 'vertical' });
    const result = getSettings();
    expect(result.rows).toBe(2);
    expect(result.columns).toBe(1);
  });

  it('範囲外の行数・列数を既定値に落とす', () => {
    save({ rows: 9, columns: 0 });
    expect(getSettings().rows).toBe(1);
    expect(getSettings().columns).toBe(2);
  });

  it('未対応のPDF解像度を既定値に落とす', () => {
    save({ pdfResolution: 9999 });
    expect(getSettings().pdfResolution).toBe(144);
  });

  it('壊れた保存内容でも既定値で復帰する', () => {
    memory.set('image-viewer.settings.v1', '{not json');
    expect(getSettings()).toEqual({ sync: true, rows: 1, columns: 2, pdfResolution: 144 });
  });
});
