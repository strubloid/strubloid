import { describe, expect, it } from 'vitest';
import { shortcutKeyForPlatform } from '@/lib/platform/shortcut-key';

describe('shortcutKeyForPlatform', () => {
  it.each(['MacIntel', 'MacPPC', 'iPhone', 'iPad', 'iPod'])('uses Command on Apple platform %s', (platform) => {
    expect(shortcutKeyForPlatform(platform)).toBe('⌘');
  });

  it.each(['Win32', 'Linux x86_64', 'Android', undefined])('uses Ctrl on non-Apple platform %s', (platform) => {
    expect(shortcutKeyForPlatform(platform)).toBe('Ctrl');
  });
});
