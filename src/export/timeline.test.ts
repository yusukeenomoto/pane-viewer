import { describe, expect, it } from 'vitest';
import { foldTimeline, parseTimeline, type Timeline } from './timeline';

const base = (events: Timeline['events']): Timeline => ({
  version: 1, app: 'PaneViewer', recordedAt: '2026-09-23T01:00:00.000Z', duration: 5, video: 'compare_x.mp4',
  grid: { rows: 1, columns: 2 }, sync: true,
  panes: [{ id: 'pane-0', label: '画像1', file: 'a.png', width: 900, height: 600 }],
  events,
});

const full = { file: 'a.png', scale: 1, x: 0, y: 0, rotation: 0 as const, flipH: false, flipV: false, page: null };

describe('parseTimeline', () => {
  it('自分が書き出したJSONを受け入れる', () => {
    expect(parseTimeline(JSON.stringify(base([])))?.app).toBe('PaneViewer');
  });

  it('別アプリのJSONを拒否する', () => {
    expect(parseTimeline('{"app":"other","version":1,"events":[],"grid":{}}')).toBeUndefined();
  });

  it('未知のバージョンを拒否する', () => {
    expect(parseTimeline(JSON.stringify({ ...base([]), version: 2 }))).toBeUndefined();
  });

  it('events や grid を欠いたものを拒否する', () => {
    expect(parseTimeline('{"app":"PaneViewer","version":1,"grid":{"rows":1,"columns":1}}')).toBeUndefined();
    expect(parseTimeline('{"app":"PaneViewer","version":1,"events":[]}')).toBeUndefined();
  });

  it('壊れたJSONで例外を投げない', () => {
    expect(parseTimeline('{not json')).toBeUndefined();
    expect(parseTimeline('')).toBeUndefined();
    expect(parseTimeline('null')).toBeUndefined();
  });
});

describe('foldTimeline', () => {
  it('差分を積み上げて録画終了時点の状態にする', () => {
    const folded = foldTimeline(base([
      { t: 0, panes: { 'pane-0': full }, grid: { rows: 1, columns: 2 }, sync: true },
      { t: 1, panes: { 'pane-0': { scale: 2.5, x: -130.5, y: 44 } } },
      { t: 2, panes: { 'pane-0': { rotation: 90 } } },
    ]));
    expect(folded.panes.get('pane-0')).toEqual({ ...full, scale: 2.5, x: -130.5, y: 44, rotation: 90 });
  });

  it('後から現れた項目が先頭の値を上書きしない', () => {
    const folded = foldTimeline(base([
      { t: 0, panes: { 'pane-0': full } },
      { t: 1, panes: { 'pane-0': { page: 3 } } },
    ]));
    expect(folded.panes.get('pane-0')?.file).toBe('a.png');
    expect(folded.panes.get('pane-0')?.page).toBe(3);
  });

  it('グリッドと同期は最後の値が残る', () => {
    const folded = foldTimeline(base([
      { t: 0, grid: { rows: 1, columns: 2 }, sync: true },
      { t: 1, sync: false },
      { t: 2, grid: { rows: 3, columns: 3 } },
    ]));
    expect(folded.grid).toEqual({ rows: 3, columns: 3 });
    expect(folded.sync).toBe(false);
  });

  it('sync が false でも無視されない', () => {
    // `if (event.sync)` と書くと false を取りこぼす。
    const folded = foldTimeline({ ...base([{ t: 1, sync: false }]), sync: true });
    expect(folded.sync).toBe(false);
  });

  it('イベントが無ければ先頭の値をそのまま返す', () => {
    const folded = foldTimeline(base([]));
    expect(folded.grid).toEqual({ rows: 1, columns: 2 });
    expect(folded.sync).toBe(true);
    expect(folded.panes.size).toBe(0);
  });

  it('途中から現れたペインも既定値から積み上がる', () => {
    const folded = foldTimeline(base([
      { t: 0, panes: { 'pane-0': full } },
      { t: 3, panes: { 'pane-1': { file: 'b.png', scale: 0.5 } } },
    ]));
    expect(folded.panes.get('pane-1')).toEqual({ ...full, file: 'b.png', scale: 0.5 });
  });

  it('ファイルが外されたことを null として保持する', () => {
    const folded = foldTimeline(base([
      { t: 0, panes: { 'pane-0': full } },
      { t: 2, panes: { 'pane-0': { file: null } } },
    ]));
    expect(folded.panes.get('pane-0')?.file).toBeNull();
  });
});
