'use client';

import { useEffect, useState } from 'react';
import { detectShortcutKey, type ShortcutKey } from '@/lib/platform/shortcut-key';

export function useShortcutKey(): ShortcutKey {
  const [shortcutKey, setShortcutKey] = useState<ShortcutKey>('Ctrl');

  useEffect(() => {
    setShortcutKey(detectShortcutKey());
  }, []);

  return shortcutKey;
}
