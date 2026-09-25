import { describe, expect, it } from 'vitest';
import { CLICK_ZOOM_FACTOR, clickZoomFactor } from './zoomClick';

type Modifiers = Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'altKey'>;
const keys = (values: Partial<Modifiers>): Modifiers => ({ metaKey: false, ctrlKey: false, altKey: false, ...values });

describe('clickZoomFactor', () => {
  it('macOS は ⌘+Space で拡大、⌥ も押せば縮小', () => {
    expect(clickZoomFactor(keys({ metaKey: true }), true, true)).toBe(CLICK_ZOOM_FACTOR);
    expect(clickZoomFactor(keys({ metaKey: true, altKey: true }), true, true)).toBe(1 / CLICK_ZOOM_FACTOR);
  });

  it('Windows / Linux は Ctrl+Space で拡大、Alt も押せば縮小', () => {
    expect(clickZoomFactor(keys({ ctrlKey: true }), true, false)).toBe(CLICK_ZOOM_FACTOR);
    expect(clickZoomFactor(keys({ ctrlKey: true, altKey: true }), true, false)).toBe(1 / CLICK_ZOOM_FACTOR);
  });

  it('もう一方の OS の修飾キーでは反応しない', () => {
    expect(clickZoomFactor(keys({ ctrlKey: true }), true, true)).toBeUndefined();
    expect(clickZoomFactor(keys({ metaKey: true }), true, false)).toBeUndefined();
  });

  it('Space を押していなければ通常のクリック', () => {
    expect(clickZoomFactor(keys({ metaKey: true }), false, true)).toBeUndefined();
    expect(clickZoomFactor(keys({ ctrlKey: true, altKey: true }), false, false)).toBeUndefined();
  });

  it('修飾キーなしの Space+クリックは通常のクリック', () => {
    expect(clickZoomFactor(keys({}), true, true)).toBeUndefined();
    expect(clickZoomFactor(keys({ altKey: true }), true, false)).toBeUndefined();
  });
});
