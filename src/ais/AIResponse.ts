import { AIMessage } from './AIMessage';

// Full response from an AI provider after sendMessage.

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Result of a memory compaction operation triggered by the AI provider.

export interface MemoryCompactionResult {
  title: string;
  summary: string;
  facts: string;
  preferences: string | null;
  sourceChatIds: string[];
  compactedCount: number;
}

// Input for sending a message to the AI.

export interface SendMessageInput {
  messages: AIMessage[];
  useAiBrain?: boolean;
  brainMemories?: string[];
}

// ── Streaming ────────────────────────────────────────────

/** Event emitted by the streaming message pipeline. */
export interface StreamEvent {
  type: 'delta' | 'done' | 'error' | 'phase';
  /** Text delta for a token chunk. */
  delta?: string;
  /** Full assembled text (only on done). */
  full?: string;
  /** Provider model identifier. */
  model?: string;
  /** Token usage (only on done). */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Persisted assistant message id (only on done). */
  assistantId?: string;
  /** Phase label for thinking indicator. */
  phase?: 'context-building' | 'model-selected' | 'token-start';
  /** Model name for phase events. */
  modelName?: string;
  /** Error message. */
  error?: string;
}