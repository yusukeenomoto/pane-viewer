import { describe, expect, it } from 'vitest';
import { detectLanguage } from './i18n';

describe('detectLanguage', () => {
  it('日本語の指定なら日本語', () => {
    expect(detectLanguage(['ja'])).toBe('ja');
    expect(detectLanguage(['ja-JP'])).toBe('ja');
  });

  it('大文字小文字を問わない', () => {
    expect(detectLanguage(['JA-JP'])).toBe('ja');
  });

  it('英語の指定なら英語', () => {
    expect(detectLanguage(['en-US'])).toBe('en');
  });

  // 日本語のメニューは日本語話者以外には読めない。迷ったら英語を出す。
  it('対応していない言語なら英語', () => {
    expect(detectLanguage(['fr-FR'])).toBe('en');
    expect(detectLanguage(['zh-CN', 'ko'])).toBe('en');
  });

  it('指定が無ければ英語', () => {
    expect(detectLanguage([])).toBe('en');
  });

  it('ブラウザの優先順位に従う', () => {
    expect(detectLanguage(['fr', 'ja', 'en'])).toBe('ja');
    expect(detectLanguage(['fr', 'en', 'ja'])).toBe('en');
  });
});
