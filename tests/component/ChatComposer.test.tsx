import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatComposer } from '@/components/ChatComposer';

// Mock the model loading API to avoid real fetch calls
beforeEach(() => {
  vi.clearAllMocks();
  // Mock fetch for /api/ai/models
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ models: [{ modelId: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', isFree: false }] }),
  } as Response);
});

const PLACEHOLDER = 'Type a message... (Enter to send, Shift+Enter for newline)';

function renderComposer(props: Record<string, unknown> = {}) {
  const defaults = {
    onSend: vi.fn(),
    onToggleBrain: vi.fn(),
    onToggleRandomChats: vi.fn(),
    useAiBrain: false,
    useRandomChats: false,
    devMode: false,
    disabled: false,
    selectedModelId: 'deepseek-v4-flash',
    onModelChange: vi.fn(),
    previousMessages: [] as string[],
    ...props,
  };
  return render(<ChatComposer {...(defaults as any)} />);
}

describe('ChatComposer', () => {
  it('renders textarea and send button', async () => {
    renderComposer();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
    // Wait for model selector to render with loaded models
    const select = await screen.findByTitle('Select AI model');
    expect(select).toBeInTheDocument();
  });

  it('calls onSend when Enter is pressed with content', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderComposer({ onSend });

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.type(textarea, 'hello');
    await user.keyboard('{Enter}');

    expect(onSend).toHaveBeenCalledWith('hello', 'deepseek-v4-flash');
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

  it('shows request counter at zero messages', async () => {
    renderComposer();
    expect(await screen.findByText(/sent: 0/i)).toBeInTheDocument();
  });

  it('shows request counter incremented after send', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderComposer({ onSend });

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.type(textarea, 'first');
    await user.keyboard('{Enter}');

    await vi.waitFor(() => {
      expect(screen.getByText(/sent: 1/i)).toBeInTheDocument();
    });
  });

  it('toggles AI brain when button clicked', async () => {
    const onToggleBrain = vi.fn();
    const user = userEvent.setup();

    renderComposer({ onToggleBrain, useAiBrain: false });

    const brainButton = screen.getByTitle('Enable AI Brain');
    await user.click(brainButton);

    expect(onToggleBrain).toHaveBeenCalledOnce();
  });

  it('shows brain description when on', () => {
    renderComposer({ useAiBrain: true });
    expect(screen.getByText(/remembers project chat history/)).toBeInTheDocument();
  });

  it('shows dev mode hint when devMode is on', () => {
    renderComposer({ devMode: true });
    expect(screen.getByText(/DEV MODE/i)).toBeInTheDocument();
  });

  it('recalls previous messages with ArrowUp', async () => {
    const user = userEvent.setup();

    renderComposer({
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

  it('calls onModelChange when model selector changes', async () => {
    const onModelChange = vi.fn();
    const user = userEvent.setup();

    renderComposer({ onModelChange });

    const select = await screen.findByTitle('Select AI model');
    await user.selectOptions(select, 'deepseek-v4-flash');

    expect(onModelChange).toHaveBeenCalledWith('deepseek-v4-flash');
  });
});
