export type ShortcutKey = '⌘' | 'Ctrl';

export function shortcutKeyForPlatform(platform: string | undefined): ShortcutKey {
  return platform && /Mac|iPhone|iPad|iPod/.test(platform) ? '⌘' : 'Ctrl';
}

export function detectShortcutKey(): ShortcutKey {
  if (typeof navigator === 'undefined') return 'Ctrl';
  return shortcutKeyForPlatform(navigator.platform);
}
