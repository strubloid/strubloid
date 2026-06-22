// Errors produced by AI provider operations.
// Use AIProviderError.isRetryable() to check if a request can be safely retried.

export class AIProviderError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isRetryable: boolean;

  constructor(params: {
    message: string;
    code: string;
    statusCode?: number;
    isRetryable?: boolean;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = 'AIProviderError';
    this.code = params.code;
    this.statusCode = params.statusCode ?? 0;
    this.isRetryable = params.isRetryable ?? false;
    this.cause = params.cause;
  }

  static missingConfig(variableName: string): AIProviderError {
    return new AIProviderError({
      message: `Missing required environment variable: ${variableName}`,
      code: 'MISSING_CONFIG',
      statusCode: 0,
      isRetryable: false
    });
  }

  static timeout(): AIProviderError {
    return new AIProviderError({
      message: 'AI provider request timed out',
      code: 'TIMEOUT',
      statusCode: 0,
      isRetryable: true
    });
  }

  static providerUnavailable(cause?: unknown): AIProviderError {
    return new AIProviderError({
      message: 'AI provider is unavailable',
      code: 'PROVIDER_UNAVAILABLE',
      statusCode: 0,
      isRetryable: true,
      cause
    });
  }

  static invalidResponse(reason: string, cause?: unknown): AIProviderError {
    return new AIProviderError({
      message: `Invalid response from AI provider: ${reason}`,
      code: 'INVALID_RESPONSE',
      statusCode: 0,
      isRetryable: false,
      cause
    });
  }

  static httpError(statusCode: number, message?: string): AIProviderError {
    const defaultMessages: Record<number, string> = {
      401: 'Authentication failed — check BIGPICKLE_API_KEY',
      403: 'Access forbidden — check your AI provider permissions',
      429: 'Rate limit exceeded — try again shortly',
      500: 'AI provider internal error',
      502: 'AI provider gateway error',
      503: 'AI provider temporarily unavailable'
    };
    return new AIProviderError({
      message: message ?? defaultMessages[statusCode] ?? `HTTP error ${statusCode}`,
      code: 'HTTP_ERROR',
      statusCode,
      isRetryable: statusCode >= 500 || statusCode === 429
    });
  }
}