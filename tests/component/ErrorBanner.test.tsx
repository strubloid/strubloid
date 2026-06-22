import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBanner } from '@/components/ErrorBanner';

describe('ErrorBanner', () => {
  it('renders nothing when error is null', () => {
    render(<ErrorBanner error={null} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the error message', () => {
    render(<ErrorBanner error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('displays error code when provided', () => {
    render(<ErrorBanner error="Failed" code="HTTP_ERROR" />);
    expect(screen.getByText(/Error code: HTTP_ERROR/)).toBeInTheDocument();
  });

  it('shows retry hint for retryable errors', () => {
    render(<ErrorBanner error="Timeout" code="TIMEOUT" isRetryable={true} />);
    expect(screen.getByText(/This error may be temporary/)).toBeInTheDocument();
  });

  it('shows Retry button when retryable and onRetry provided', () => {
    render(
      <ErrorBanner
        error="Oops"
        isRetryable={true}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('does not show Retry button when not retryable', () => {
    render(
      <ErrorBanner
        error="Oops"
        isRetryable={false}
        onRetry={vi.fn()}
      />
    );
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('calls onRetry when Retry clicked', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <ErrorBanner
        error="Retry me"
        isRetryable={true}
        onRetry={onRetry}
      />
    );

    await user.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('dismisses when X is clicked', async () => {
    const user = userEvent.setup();

    render(<ErrorBanner error="Dismiss me" />);
    expect(screen.getByText('Dismiss me')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Dismiss error'));
    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
  });
});
