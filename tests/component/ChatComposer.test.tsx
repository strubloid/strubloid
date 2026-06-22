import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatComposer } from '@/components/ChatComposer';

// Mock the error banner since ChatComposer imports it
vi.mock('@/components/ErrorBanner', () => ({
  __esModule: true,
  ErrorBanner: () => null,
}));

const PLACEHOLDER = 'Type a message... (Enter to send, Shift+Enter for newline)';

function renderComposer(props: Record<string, unknown> = {}) {
  const defaults = {
    onSend: vi.fn(),
    onToggleBrain: vi.fn(),
    useAiBrain: false,
    devMode: false,
    disabled: false,
    previousMessages: [] as string[],
    ...props,
  };
  return render(<ChatComposer {...(defaults as any)} />);
}

describe('ChatComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders textarea and send button', () => {
    renderComposer();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('calls onSend when Enter is pressed with content', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    renderComposer({ onSend });

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.type(textarea, 'hello');
    await user.keyboard('{Enter}');

    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('does not call onSend for empty input', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    renderComposer({ onSend });

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.type(textarea, '  ');
    await user.keyboard('{Enter}');

    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears textarea after sending', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderComposer({ onSend });

    const textarea = screen.getByPlaceholderText(PLACEHOLDER) as HTMLTextAreaElement;
    await user.type(textarea, 'test message');
    await user.keyboard('{Enter}');

    await vi.waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('disables textarea and send button when disabled', () => {
    renderComposer({ disabled: true });

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeDisabled();
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('shows request counter at zero messages', () => {
    renderComposer();
    expect(screen.getByText(/messages sent: 0/i)).toBeInTheDocument();
  });

  it('shows request counter incremented after send', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderComposer({ onSend });

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.type(textarea, 'first');
    await user.keyboard('{Enter}');

    await vi.waitFor(() => {
      expect(screen.getByText(/messages sent: 1/i)).toBeInTheDocument();
    });
  });

  it('toggles AI brain when button clicked', async () => {
    const onToggleBrain = vi.fn();
    const user = userEvent.setup();

    renderComposer({ onToggleBrain, useAiBrain: false });

    const brainButton = screen.getByTitle('Enable AI Brain');
    await user.click(brainButton);

    expect(onToggleBrain).toHaveBeenCalledWith(true);
  });

  it('shows brain active message when on', () => {
    renderComposer({ useAiBrain: true });
    expect(screen.getByText(/AI Brain is active/)).toBeInTheDocument();
  });

  it('shows dev mode hint when devMode is on', () => {
    renderComposer({ devMode: true });
    expect(screen.getByText(/DEV MODE/i)).toBeInTheDocument();
  });

  it('recalls previous messages with ArrowUp', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderComposer({
      onSend,
      previousMessages: ['hello', 'how are you?'],
    });

    const textarea = screen.getByPlaceholderText(PLACEHOLDER) as HTMLTextAreaElement;
    await user.click(textarea);
    await user.keyboard('{ArrowUp}');

    expect(textarea.value).toBe('how are you?');
  });

  it('clears input when navigating past the start of history', async () => {
    const user = userEvent.setup();

    renderComposer({
      onSend: vi.fn(),
      previousMessages: ['hello'],
    });

    const textarea = screen.getByPlaceholderText(PLACEHOLDER) as HTMLTextAreaElement;
    await user.click(textarea);
    await user.keyboard('{ArrowUp}{ArrowDown}');

    expect(textarea.value).toBe('');
  });

  it('disables textarea while sending', async () => {
    const onSend = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(resolve, 100))
    );
    const user = userEvent.setup();

    renderComposer({ onSend });

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.type(textarea, 'message');
    await user.keyboard('{Enter}');

    expect(textarea).toBeDisabled();
  });

  it('shows recalling indicator when navigating history', async () => {
    const user = userEvent.setup();

    renderComposer({
      previousMessages: ['hello', 'world'],
    });

    const textarea = screen.getByPlaceholderText(PLACEHOLDER) as HTMLTextAreaElement;
    await user.click(textarea);
    await user.keyboard('{ArrowUp}');

    expect(screen.getByText(/recalling message/i)).toBeInTheDocument();
  });
});
