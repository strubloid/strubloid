export type GlobalSearchResultType = 'project' | 'chat' | 'message' | 'memory' | 'model';

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle?: string;
  snippet?: string;
  href: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface GlobalSearchResponse {
  results: GlobalSearchResult[];
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    color: string;
    isStarred: boolean;
    chatCount: number;
    href: string;
    score: number;
  }>;
  chats: Array<{
    id: string;
    title: string;
    updatedAt: Date;
    isRandom: boolean;
    projectId: string | null;
    snippet?: string;
    href: string;
    score: number;
  }>;
  memories: Array<{
    id: string;
    title: string;
    projectId: string | null;
    snippet?: string;
    href: string;
    score: number;
  }>;
  models: Array<{
    id: string;
    modelId: string;
    name: string;
    provider: string;
    modelSource: string;
    href: string;
    score: number;
  }>;
}
