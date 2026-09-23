import { describe, expect, it } from 'vitest';
import { ALL_PANES, FOLLOW_SYNC, orientationTargetIds } from './targets';

const visible = ['pane-0', 'pane-1', 'pane-2'];

describe('同期に従う（既定）', () => {
  it('同期ONなら表示中の全ペインが対象', () => {
    expect(orientationTargetIds(FOLLOW_SYNC, true, 'pane-1', visible)).toEqual(visible);
  });

  // 同期OFFで回転が全ペインに及ぶと、ペインごとに向きを直せない。
  it('同期OFFならアクティブなペインだけが対象', () => {
    expect(orientationTargetIds(FOLLOW_SYNC, false, 'pane-1', visible)).toEqual(['pane-1']);
  });

  it('アクティブなペインが非表示なら対象なし', () => {
    expect(orientationTargetIds(FOLLOW_SYNC, false, 'pane-8', visible)).toEqual([]);
  });
});

describe('明示的な指定', () => {
  it('全ペインを選べば同期OFFでも全ペインが対象', () => {
    expect(orientationTargetIds(ALL_PANES, false, 'pane-1', visible)).toEqual(visible);
  });

  it('個別指定はそのペインだけが対象', () => {
    expect(orientationTargetIds('pane-2', true, 'pane-0', visible)).toEqual(['pane-2']);
  });

  it('個別指定は同期ONでも広がらない', () => {
    expect(orientationTargetIds('pane-2', true, 'pane-2', visible)).toEqual(['pane-2']);
  });

  it('表示されていないペインを指定しても対象にならない', () => {
    expect(orientationTargetIds('pane-5', true, 'pane-0', visible)).toEqual([]);
  });

  it('未知の値は対象なしとして扱う', () => {
    expect(orientationTargetIds('', true, 'pane-0', visible)).toEqual([]);
  });
});

describe('表示枚数が変わる場合', () => {
  it('1枚だけ表示なら同期ONでもその1枚', () => {
    expect(orientationTargetIds(FOLLOW_SYNC, true, 'pane-0', ['pane-0'])).toEqual(['pane-0']);
  });

  it('表示が無ければ常に対象なし', () => {
    for (const selection of [FOLLOW_SYNC, ALL_PANES, 'pane-0']) {
      expect(orientationTargetIds(selection, true, 'pane-0', [])).toEqual([]);
    }
  });
});
