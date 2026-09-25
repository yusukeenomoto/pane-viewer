// ⌘+Space+クリックで拡大、⌘+⌥+Space+クリックで縮小（Photoshop と同じ割り当て）。
// Windows / Linux では ⌘ の代わりに Ctrl を使う。macOS の Ctrl+クリックは右クリック扱いなので、
// OS ごとに片方の修飾キーだけを見る。Space はマウスイベントに載らないため、押下状態は呼び出し側が渡す。
export const CLICK_ZOOM_FACTOR = 2;

export function clickZoomFactor(event: Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'altKey'>, spaceHeld: boolean, mac: boolean) {
  if (!spaceHeld || !(mac ? event.metaKey : event.ctrlKey)) return undefined;
  return event.altKey ? 1 / CLICK_ZOOM_FACTOR : CLICK_ZOOM_FACTOR;
}
