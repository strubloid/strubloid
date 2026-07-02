import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandDeck } from '@/components/CommandDeck';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

function mockSearch(results: unknown[]) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: async () => ({ results }),
  } as Response);
}

function byTextContent(expected: string) {
  return (_content: string, element: Element | null) =>
    element?.textContent === expected &&
    !Array.from(element.children).some((child) => child.textContent === expected);
}

describe('CommandDeck global search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch([]);
  });

  it('does not show no-results while the async search is pending', async () => {
    let resolveFetch!: (value: Response) => void;
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(<CommandDeck open onClose={vi.fn()} />);
    await userEvent.setup().type(
      screen.getByPlaceholderText(/search actions/i),
      'zzzz',
    );

    expect(screen.getByText('[ searching ]')).toBeInTheDocument();
    expect(screen.queryByText('No signal found.')).not.toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 320));
      resolveFetch({ json: async () => ({ results: [] }) } as Response);
    });

    expect(screen.getByText('No signal found.')).toBeInTheDocument();
  });

  it('shows simplified default actions and hides secondary memory cleanup until searched', () => {
    render(<CommandDeck open onClose={vi.fn()} />);

    expect(screen.getByText('New random capture')).toBeInTheDocument();
    expect(screen.getByText('Open brain registry')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.queryByText('Open systems console')).not.toBeInTheDocument();
    expect(screen.queryByText('Clean random memory')).not.toBeInTheDocument();
    expect(screen.getByText('capture.new')).toBeInTheDocument();
    expect(screen.getByText('brain.open')).toBeInTheDocument();
    expect(screen.getByText('settings.open')).toBeInTheDocument();
  });

  it('uses the hacker-safe settings handler for Settings', async () => {
    const onClose = vi.fn();
    const onOpenSettings = vi.fn();
    render(<CommandDeck open onClose={onClose} isHackerMode onOpenSettings={onOpenSettings} />);

    await userEvent.setup().click(screen.getByText('Settings'));

    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalledWith('/settings');
  });

  it('renders grouped backend project, chat, memory, and model results', async () => {
    mockSearch([
      {
        id: 'project-1',
        type: 'project',
        title: 'Fátima research project',
        subtitle: '1 chat · starred',
        snippet: 'Project name matched',
        href: '/projects/project-1',
        score: 100,
        metadata: { color: '#9ad933' },
      },
      {
        id: 'message-1',
        type: 'message',
        title: 'Random chat',
        subtitle: 'user message',
        snippet: 'fátima likes green',
        href: '/chat/chat-1',
        score: 80,
      },
      {
        id: 'memory-1',
        type: 'memory',
        title: 'Compacted random memory',
        snippet: 'Fátima was mentioned in a compacted random chat',
        href: '/settings',
        score: 70,
      },
      {
        id: 'model-1',
        type: 'model',
        title: 'Model routing',
        snippet: 'zen · openai',
        href: '/settings',
        score: 60,
      },
    ]);

    render(<CommandDeck open onClose={vi.fn()} />);
    await userEvent.setup().type(
      screen.getByPlaceholderText(/search actions/i),
      'fátima',
    );

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    expect(await screen.findByText('Project brains')).toBeInTheDocument();
    expect(screen.getByText('Random chats')).toBeInTheDocument();
    expect(screen.getByText('Memory')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText(byTextContent('Fátima research project'))).toBeInTheDocument();
    expect(screen.getByText(byTextContent('fátima likes green'))).toBeInTheDocument();
    expect(screen.getByText('Compacted random memory')).toBeInTheDocument();
  });

  it('opens the selected backend result on Enter', async () => {
    mockSearch([
      {
        id: 'project-1',
        type: 'project',
        title: 'Fátima research project',
        href: '/projects/project-1',
        score: 100,
      },
    ]);
    const onClose = vi.fn();

    render(<CommandDeck open onClose={onClose} />);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/search actions/i), 'fátima');
    await screen.findByText(byTextContent('Fátima research project'));
    await user.keyboard('{Enter}');

    expect(onClose).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith('/projects/project-1');
  });

  it('opens chat search results inline when hacker mode is active', async () => {
    mockSearch([
      {
        id: 'message-1',
        type: 'message',
        title: 'Random chat',
        snippet: 'fátima likes green',
        href: '/chat/chat-1',
        score: 100,
        metadata: { chatId: 'chat-1', isRandom: true },
      },
    ]);
    const onClose = vi.fn();
    const eventSpy = vi.fn();
    window.addEventListener('strubloid-open-hacker-chat', eventSpy);

    render(<CommandDeck open onClose={onClose} isHackerMode />);
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/search actions/i), 'fátima');
    await screen.findByText(byTextContent('fátima likes green'));
    await user.keyboard('{Enter}');

    expect(onClose).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalledWith('/chat/chat-1');
    expect(eventSpy).toHaveBeenCalledOnce();
    expect((eventSpy.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
      chatId: 'chat-1',
      title: 'Random chat',
      isRandom: true,
    });

    window.removeEventListener('strubloid-open-hacker-chat', eventSpy);
  });
});
