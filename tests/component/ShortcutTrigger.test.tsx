import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderBar } from '@/components/LayoutShell/HeaderBar';
import { Sidebar } from '@/components/Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/chat',
  useRouter: () => ({ push: vi.fn() }),
}));

describe('visible command shortcut triggers', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn((input: string | URL | Request) => {
      const url = input.toString();
      if (url.startsWith('/api/ai/models')) return Promise.resolve({ json: async () => ({ models: [] }) } as Response);
      if (url.startsWith('/api/chats')) return Promise.resolve({ json: async () => ({ chats: [] }) } as Response);
      if (url.startsWith('/api/projects')) return Promise.resolve({ json: async () => ({ projects: [] }) } as Response);
      return Promise.resolve({ json: async () => ({}) } as Response);
    });
  });

  it('opens the command deck from the header shortcut badge', async () => {
    const onOpenCommandDeck = vi.fn();
    render(<HeaderBar onOpenCommandDeck={onOpenCommandDeck} />);

    await userEvent.setup().click(screen.getByRole('button', { name: /open command deck/i }));

    expect(onOpenCommandDeck).toHaveBeenCalledWith('');
  });

  it('opens the command deck from the sidebar shortcut badge', async () => {
    const listener = vi.fn();
    window.addEventListener('strubloid-open-command-deck', listener);

    render(<Sidebar mode="full" mobileOpen={false} />);
    await userEvent.setup().click(screen.getByRole('button', { name: /open command deck/i }));

    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('strubloid-open-command-deck', listener);
  });
});
