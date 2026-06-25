# Search Optimization — Strubloid Chat

> **Target:** Any agent implementing search improvements for the Strubloid chat app.
> **Context:** Next.js 14, Prisma ORM + SQLite, TypeScript, Tailwind CSS.
> **Prerequisite reading:** `AGENTS.md`, `schema.prisma`, `Sidebar.tsx` (current search UI).

---

## Table of Contents

1. [Current State & Problem](#1-current-state--problem)
2. [Target Architecture](#2-target-architecture)
3. [Implementation Plan](#3-implementation-plan)
   - [3.1 Backend — Search API Route](#31-backend--search-api-route)
   - [3.2 Backend — Search Query Logic](#32-backend--search-query-logic)
   - [3.3 Backend — Highlight Generation](#33-backend--highlight-generation)
   - [3.4 Frontend — Search Service Hook](#34-frontend--search-service-hook)
   - [3.5 Frontend — Search Results UI](#35-frontend--search-results-ui)
   - [3.6 Frontend — Debounce & UX](#36-frontend--debounce--ux)
   - [3.7 Full-Text Search (FTS) Upgrade Path](#37-full-text-search-fts-upgrade-path)
4. [Security & Attack Surface](#4-security--attack-surface)
   - [4.1 Attack Vectors Checklist](#41-attack-vectors-checklist)
   - [4.2 Defenses by Layer](#42-defenses-by-layer)
   - [4.3 Security Modules to Install](#43-security-modules-to-install)
   - [4.4 Future Defense Additions](#44-future-defense-additions)
5. [Performance Considerations](#5-performance-considerations)
6. [Testing Plan](#6-testing-plan)
7. [Implementation Order & Handoff](#7-implementation-order--handoff)
8. [NPM Package Management & Dependency Security](#8-npm-package-management--dependency-security)
   - [8.1 Current Dependency Health](#81-current-dependency-health)
   - [8.2 Audit & Fix Workflow](#82-audit--fix-workflow)
   - [8.3 Automated Update Strategy](#83-automated-update-strategy)
   - [8.4 Supply Chain Security](#84-supply-chain-security)
   - [8.5 CI/CD Integration for Dependency Hygiene](#85-cicd-integration-for-dependency-hygiene)
   - [8.6 NPM Security Tools Reference](#86-npm-security-tools-reference)
9. [Continuous Security Improvement](#9-continuous-security-improvement)
   - [9.1 How This Document Works](#91-how-this-document-works)
   - [9.2 Attack Type Reference Library](#92-attack-type-reference-library)
   - [9.3 CVE Monitoring Strategy](#93-cve-monitoring-strategy)
   - [9.4 Reference Links & Tooling Array](#94-reference-links--tooling-array)
   - [9.5 Review Schedule & Handoff Protocol](#95-review-schedule--handoff-protocol)

---

## 1. Current State & Problem

### What exists today

- **Search scope:** Client-side only, in `Sidebar.tsx` lines 216–222.
- **What it searches:** `chat.title` and `project.name` only — no message content.
- **How it works:** `.filter()` + `.toLowerCase().includes()`. Pure JavaScript, zero server queries.
- **No highlighting:** Results appear as plain text.
- **No ordering:** Same order as the base lists (by `updatedAt`).

```ts
// Current — Sidebar.tsx line 216-222
const filteredChats = searchQuery
  ? randomChats.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
  : randomChats;

const filteredProjects = searchQuery
  ? projects.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  : projects;
```

### What needs to change

1. **Search inside message content** — not just titles/names.
2. **Search all chats** — both project chats (scoped by project) and random chats.
3. **Search order:** Project chats first, random chats second.
4. **Highlighted matches** — show context snippets around the match with `<mark>` or bold.
5. **Debounced server-side search** — move from client filter to API endpoint.
6. **Secure by design** — input sanitization, rate limiting, XSS prevention.

---

## 2. Target Architecture

```
[User types in sidebar search box]
        │
        ▼
[Debounce 300ms]
        │
        ▼
[GET /api/search?q=<query>&limit=20]
        │
        ▼
─────────────────────────────────────
  Server-side handler (route.ts)
─────────────────────────────────────
  1. Validate + sanitize query
  2. Search project chats (messages)
  3. Search random chats (messages)
  4. Merge results: projects first
  5. Generate highlight snippets
  6. Return JSON response
─────────────────────────────────────
        │
        ▼
[Client receives results]
        │
        ▼
[Render search result cards]
  - Chat title (clickable link)
  - Project name / "Random Chat" badge
  - Snippet with <mark> highlights
  - Message count + match count
  - Timestamp
```

### API Response Shape

```ts
interface SearchResult {
  chatId: string;
  chatTitle: string;
  projectId: string | null;
  projectName: string | null;
  isRandom: boolean;
  matchCount: number;          // how many messages matched
  snippet: string;             // first matching message with highlights
  highlightedTitle?: string;   // title with <mark> around query terms
  updatedAt: string;
  matchedMessages: Array<{
    id: string;
    role: 'user' | 'assistant';
    snippet: string;           // excerpt with <mark> around match
    createdAt: string;
  }>;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalMatchCount: number;
  tookMs: number;
}
```

---

## 3. Implementation Plan

### 3.1 Backend — Search API Route

**File:** `src/app/api/search/route.ts`

Create a new API route at `GET /api/search`. It must:

```ts
// Query parameters
//   q      : string (required, min 2 chars, max 200)
//   limit  : number (optional, default 20, max 50)
//   offset : number (optional, default 0)
```

**Implementation steps:**

1. Create `src/app/api/search/route.ts`.
2. Parse & validate `searchParams` with Zod.
3. Sanitize the query (strip control characters, limit length).
4. Call `performSearch(query, limit, offset)` — see 3.2.
5. Apply highlight generation — see 3.3.
6. Return `SearchResponse` JSON.

```ts
// Route signature
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const SearchQuerySchema = z.object({
  q: z.string().min(2).max(200).transform(s => s.trim()),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

### 3.2 Backend — Search Query Logic

**File:** `src/lib/search/search.service.ts` (new directory)

The search must span two sources in order:

#### Phase A — Project Chats (return first)

Search all messages whose chat has a `projectId` (i.e., `chat.projectId IS NOT NULL`). Use Prisma's `contains` with case-insensitive mode:

```ts
// SQLite: Prisma `mode: 'insensitive'` works natively
// (it maps to LIKE with COLLATE NOCASE)

const projectMessageMatches = await db.message.findMany({
  where: {
    content: {
      contains: query,
      mode: 'insensitive',
    },
    chat: {
      projectId: { not: null },
    },
  },
  include: {
    chat: {
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    },
  },
  orderBy: { chat: { projectId: 'asc' } },  // grouped by project
  take: limit,
  skip: offset,
});
```

#### Phase B — Random Chats (return second)

Same as above, but `chat.projectId IS NULL AND chat.isRandom = true`:

```ts
const randomMessageMatches = await db.message.findMany({
  where: {
    content: {
      contains: query,
      mode: 'insensitive',
    },
    chat: {
      projectId: null,
      isRandom: true,
    },
  },
  include: {
    chat: true,
  },
  orderBy: { chat: { updatedAt: 'desc' } },
  take: limit,
  skip: offset,
});
```

#### Merge Strategy

```ts
async function performSearch(query: string, limit: number, offset: number) {
  const [projectResults, randomResults] = await Promise.all([
    searchMessages(query, { isProject: true }, limit, offset),
    searchMessages(query, { isProject: false }, limit, offset),
  ]);

  // Group by chat — combine messages under their parent chat
  const grouped = groupByChat(projectResults, 'project');
  const randomGrouped = groupByChat(randomResults, 'random');

  // Project results first, random second
  return [...grouped, ...randomGrouped].slice(0, limit);
}
```

#### Chat Result Deduplication

A single chat may have many matching messages. Group by `chatId`, collect all matching messages, and present the **best** snippet (first match chronologically).

```ts
function groupByChat(
  messages: MessageWithChat[],
  source: 'project' | 'random'
): SearchResult[] {
  const map = new Map<string, MessageWithChat[]>();

  for (const msg of messages) {
    const existing = map.get(msg.chatId);
    if (existing) {
      existing.push(msg);
    } else {
      map.set(msg.chatId, [msg]);
    }
  }

  return Array.from(map.entries()).map(([chatId, msgs]) => {
    const chat = msgs[0].chat;
    return {
      chatId,
      chatTitle: chat.title,
      projectId: chat.projectId,
      projectName: msgs[0].chat.project?.name ?? null,
      isRandom: source === 'random',
      matchCount: msgs.length,
      snippet: generateSnippet(query, msgs[0].content),
      updatedAt: chat.updatedAt.toISOString(),
      matchedMessages: msgs.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        snippet: generateSnippet(query, m.content),
        createdAt: m.createdAt.toISOString(),
      })),
    };
  });
}
```

### 3.3 Backend — Highlight Generation

**File:** `src/lib/search/highlight.ts`

#### What highlighting means

- On the server, insert `<mark>` tags around the matching query term in the snippet.
- On the client, render the snippet with `dangerouslySetInnerHTML` or a safe HTML renderer (React's `dangerouslySetInnerHTML` is fine since the server controls the HTML — but **only** `<mark>` tags must be allowed).

#### Algorithm

```ts
export function generateSnippet(query: string, content: string): string {
  // 1. Find the first occurrence of the query (case-insensitive)
  const lower = content.toLowerCase();
  const lowerQ = query.toLowerCase();
  const idx = lower.indexOf(lowerQ);

  if (idx === -1) {
    // No direct match — return truncated start
    return content.length > 200
      ? escapeHtml(content.slice(0, 197)) + '...'
      : escapeHtml(content);
  }

  // 2. Extract a context window around the match
  const windowSize = 100; // chars before and after match
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(content.length, idx + query.length + windowSize);

  let snippet = content.slice(start, end);

  // 3. Trim to word boundaries if possible
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';

  // 4. Insert <mark> tags (case-preserving, case-insensitive match)
  const escaped = escapeHtml(snippet);
  const regex = new RegExp(
    query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), // escape regex special chars
    'gi'
  );
  return escaped.replace(regex, (match) => `<mark>${match}</mark>`);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

#### Safety Note

Only `<mark>` tags are allowed in the snippet output. The `escapeHtml()` call before inserting `<mark>` ensures the query itself cannot inject arbitrary HTML. Regex special characters in the query are escaped before building the regex.

### 3.4 Frontend — Search Service Hook

**File:** `src/lib/search/useSearch.ts` (new)

A debounced React hook that calls `/api/search`:

```ts
'use client';

import { useState, useEffect, useRef } from 'react';

interface UseSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
}

export function useSearch({ debounceMs = 300, minQueryLength = 2 }: UseSearchOptions = {}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalMatchCount, setTotalMatchCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [tookMs, setTookMs] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minQueryLength) {
      setResults([]);
      setTotalMatchCount(0);
      setIsSearching(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // Abort any in-flight request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setIsSearching(true);
      const start = performance.now();

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=20`,
          { signal: abortRef.current.signal }
        );
        if (!res.ok) throw new Error('Search failed');
        const data: SearchResponse = await res.json();
        setResults(data.results);
        setTotalMatchCount(data.totalMatchCount);
        setTookMs(data.tookMs);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Search error:', err);
          setResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs, minQueryLength]);

  return { query, setQuery, results, totalMatchCount, isSearching, tookMs };
}
```

### 3.5 Frontend — Search Results UI

**File:** `src/components/SearchResults.tsx` (new)

Replace the inline `filteredChats` / `filteredProjects` logic in `Sidebar.tsx` with a search results overlay.

#### Component Structure

```tsx
'use client';

import { SearchResult } from '@/lib/search/types';
import Link from 'next/link';

interface SearchResultsProps {
  query: string;
  results: SearchResult[];
  totalMatchCount: number;
  isSearching: boolean;
  tookMs: number;
  onClose: () => void;
}

export function SearchResultsPanel({
  query,
  results,
  totalMatchCount,
  isSearching,
  tookMs,
  onClose,
}: SearchResultsProps) {
  if (isSearching) {
    return (
      <div className="search-results-panel">
        <div className="p-4 text-center text-sm text-[--color-text-dim]">
          <span className="search-pulse" /> Searching "{query}"…
        </div>
      </div>
    );
  }

  if (query.length >= 2 && results.length === 0 && !isSearching) {
    return (
      <div className="search-results-panel">
        <div className="p-4 text-center text-sm text-[--color-text-dim]">
          No results for "{query}"
        </div>
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <div className="search-results-panel absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border border-[--color-border] bg-[--color-bg] shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[--color-border] px-3 py-2 text-xs text-[--color-text-dim]">
        <span>{totalMatchCount} match{totalMatchCount !== 1 ? 'es' : ''}</span>
        <span>{tookMs}ms</span>
      </div>

      {/* Result items */}
      {results.map((result) => (
        <Link
          key={result.chatId}
          href={`/chat/${result.chatId}`}
          className="block border-b border-[--color-border] px-3 py-2 transition-colors last:border-b-0 hover:bg-[--color-bg-tertiary]"
          onClick={onClose}
        >
          <div className="flex items-center justify-between">
            <h4 className="truncate text-sm font-medium">
              {result.chatTitle}
            </h4>
            <span className="ml-2 flex-shrink-0 text-xs text-[--color-text-dim]">
              {result.matchCount} msg{result.matchCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-2 text-xs text-[--color-text-dim]">
            {result.projectName ? (
              <span className="rounded bg-[--color-accent]/10 px-1.5 py-0.5 text-[--color-accent]">
                {result.projectName}
              </span>
            ) : (
              <span className="rounded bg-[--color-bg-tertiary] px-1.5 py-0.5">
                Random Chat
              </span>
            )}
            {result.matchedMessages[0]?.role && (
              <span>{result.matchedMessages[0].role === 'user' ? 'You: ' : 'AI: '}</span>
            )}
          </div>

          {/* Highlighted snippet */}
          <p
            className="mt-1 line-clamp-2 text-xs text-[--color-text-dim]"
            dangerouslySetInnerHTML={{ __html: result.snippet }}
          />
        </Link>
      ))}

      {/* Scroll hint */}
      {results.length >= 20 && (
        <div className="p-2 text-center text-xs text-[--color-text-dim]">
          Results limited to 20. Refine your search for more specific matches.
        </div>
      )}
    </div>
  );
}
```

### 3.6 Frontend — Debounce & UX

#### Sidebar Integration

In `Sidebar.tsx`, replace lines 216–222 (the inline filter logic) with:

1. Import and use the `useSearch` hook.
2. Add a `searchResultsOpen` state.
3. The search input field calls `setQuery()` from the hook.
4. Below the search input, conditionally render `<SearchResultsPanel>` when `query.length >= 2`.
5. When `query.length < 2`, fall back to the current "Recent chats" view.
6. Hide random chats / projects sections while search results are visible.

```tsx
// In Sidebar.tsx
import { useSearch } from '@/lib/search/useSearch';
import { SearchResultsPanel } from '@/components/SearchResults';

// Inside component
const { query, setQuery, results, totalMatchCount, isSearching, tookMs } = useSearch();
const showSearchResults = query.trim().length >= 2;

// In the JSX, replace the inline filter logic:
{!isIconsMode && (
  <div className="relative mb-3">
    <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search chats & projects..."
      className="..."
    />
    {showSearchResults && (
      <SearchResultsPanel
        query={query}
        results={results}
        totalMatchCount={totalMatchCount}
        isSearching={isSearching}
        tookMs={tookMs}
        onClose={() => { setQuery(''); }}
      />
    )}
  </div>
)}
```

The `relative` wrapper is important — the results panel uses `absolute` positioning to overlay below the input without shifting the layout.

### 3.7 Full-Text Search (FTS) Upgrade Path

SQLite supports FTS5 (Full-Text Search version 5) as a virtual table module. While Prisma doesn't natively manage FTS virtual tables, they can be created via raw SQL in a migration script.

#### When to consider FTS

- The Message table exceeds ~50,000 rows.
- Search latency below 100ms is required for >10 concurrent users.
- Users need prefix matching, fuzzy matching, or relevance ranking.

#### Implementation sketch

```sql
-- Migration: create_fts_index.sql
CREATE VIRTUAL TABLE IF NOT EXISTS message_fts USING fts5(
  content,
  chat_id UNINDEXED,
  role UNINDEXED,
  content='Message',
  content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER message_ai AFTER INSERT ON Message BEGIN
  INSERT INTO message_fts(rowid, content, chat_id, role)
  VALUES (new.id, new.content, new.chatId, new.role);
END;

-- etc. for UPDATE and DELETE
```

Then query with:

```sql
SELECT m.* FROM Message m
JOIN message_fts fts ON m.id = fts.rowid
WHERE message_fts MATCH ?
ORDER BY rank
LIMIT ? OFFSET ?;
```

With Prisma, use `$queryRawUnsafe`:

```ts
// src/lib/search/search.fts.ts
const results = await db.$queryRawUnsafe<Message[]>(
  `SELECT m.* FROM Message m
   JOIN message_fts fts ON m.id = fts.rowid
   WHERE message_fts MATCH ?
   LIMIT ? OFFSET ?`,
  query, limit, offset
);
```

**⚠️ Note:** Only implement FTS when the `contains` + `LIKE` approach proves too slow. Measure first.

---

## 4. Security & Attack Surface

### 4.1 Attack Vectors Checklist

This is a **living checklist**. Add new attack types as they are discovered or published.
When a new defense is added, increment the version and update the file.
Each attack must document: vector, impact, existing defenses, and future improvements.

| # | Attack Vector | Impact | Risk | Existing Defense | Future Improvement |
|---|---|---|---|---|---|
| SV-01 | **SQL Injection via query string** | Direct DB access, data exfiltration | **Critical** | Prisma parameterizes all queries; `contains` uses bound parameters, not string interpolation | Regular `$queryRaw` audit; never interpolate user input into raw SQL |
| SV-02 | **XSS via highlighted snippets** | Stored XSS in search results if snippets render unescaped HTML | **High** | `escapeHtml()` called on all snippet content before `<mark>` insertion; query regex chars escaped | Content Security Policy (CSP) header; use `<react-marquee>` or other safe rendering instead of `dangerouslySetInnerHTML` |
| SV-03 | **Denial of Service — long query** | Server processes expensive `LIKE '%...%'` on large `content` field | **Medium** | Zod max length (200 chars), min length (2 chars); query timeout | Add `AbortController.timeout(5000)` in the route; rate limit per IP |
| SV-04 | **Denial of Service — wildcard / regex injection** | `%`, `_` in LIKE queries match broadly, causing unbounded result sets | **Medium** | `contains` in Prisma/LIKE doesn't treat `%` and `_` as special when using bound parameters (`%` is literal in `LIKE` with `?`) | Escape `%` and `_` explicitly with `\` prefix if using raw SQL; `limit` cap (50) prevents result explosion |
| SV-05 | **Information disclosure — timing oracle** | Attacker deduces existence of data via response time differences | **Low** | Prisma's consistent query path; static response shape regardless of results | Constant-time response for auth-sensitive data; not a priority for a personal chat app |
| SV-06 | **Information disclosure — result content** | Search reveals content from chats the user shouldn't access | **Medium** | No multi-user auth exists yet; all chats are local | When auth is added, filter `chat.userId` or project membership in the DB query |
| SV-07 | **Unicode normalization attacks** | Query bypasses case-insensitive matching via homoglyphs or combining chars | **Low** | SQLite NOCASE handles ASCII well but has gaps with Unicode | Apply `.normalize('NFC')` or `NFKC` to query before searching; use ICU collation if FTS5 |
| SV-08 | **ReDoS — Regular Expression Denial of Service** | Catastrophic backtracking when generating `<mark>` highlights with crafted query | **Medium** | Query regex special chars are escaped (no `.*` injection into regex) | Set a regex execution timeout (< 100ms); use `String.replace` with a simple indexOf-based approach instead of regex |
| SV-09 | **Mass assignment / injection via request body** | Attackers inject additional search params | **Low** | GET request, query params parsed by Zod schema; unknown params discarded | N/A — already safe by design |
| SV-10 | **CSRF via search endpoint** | Attacker induces user's browser to send search requests | **Low** | Search is `GET` (no side effects); Next.js `SameSite=Lax` by default | Add CSRF token for POST endpoints only; not needed for read-only search |
| SV-11 | **Caching proxy data leakage** | Shared/CDN proxy caches search results revealing private chat data | **Medium** | None currently | Add `Cache-Control: private, no-cache, no-store, must-revalidate` to search response headers |
| SV-12 | **Rate limiting bypass** | Attacker floods search endpoint to extract DB contents character by character | **High** | None currently | Implement rate limiting via `@upstash/ratelimit` or in-memory token bucket (see 4.3) |

### 4.2 Defenses by Layer

#### Layer 1 — Input Validation (Route Handler)

```ts
const SearchQuerySchema = z.object({
  q: z
    .string()
    .min(2, 'Query must be at least 2 characters')
    .max(200, 'Query must be 200 characters or less')
    .transform((s) => {
      // Strip control characters (null, backspace, etc.)
      return s.replace(/[\x00-\x1f\x7f]/g, '').trim();
    }),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(1000).default(0),
});
```

#### Layer 2 — Parameterized Queries (Prisma)

Prisma's `contains` with `mode: 'insensitive'` compiles to:

```sql
WHERE content LIKE '%' || ? || '%' COLLATE NOCASE
```

The `?` is a bound parameter — **never interpolated**. This is the primary defense against SQL injection.

#### Layer 3 — Output Encoding (Snippet Rendering)

```ts
// Server-side: escapeHtml before mark insertion
const snippet = escapeHtml(rawContent);  // &, <, >, ", ' escaped
const highlighted = snippet.replace(regex, '<mark>$&</mark>'); // safe because regex chars escaped

// Client-side: only <mark> allowed via dangerouslySetInnerHTML
// NG: <script>, <img>, <a> would be escaped by escapeHtml
```

#### Layer 4 — Response Headers

```ts
return new NextResponse(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  },
});
```

#### Layer 5 — Rate Limiting

See section 4.3 for implementation. Without it, an attacker can brute-force the DB character by character via search timing.

### 4.3 Security Modules to Install

These packages should be added to `package.json` when the search feature is implemented:

| Package | Purpose | When Required |
|---------|---------|---------------|
| `@upstash/ratelimit` + `@upstash/redis` | Distributed rate limiting for search endpoint | Immediately (or use in-memory as fallback) |
| `he` | HTML entity encoding/decoding (more robust than manual `escapeHtml`) | Immediately |
| `xss-filters` | SAST-style output sanitization for highlighted snippets | Optional (manual escaping is sufficient) |
| `recheck` or `safe-regex` | ReDoS vulnerability scanner for regex patterns | Before deployment |

#### In-Memory Rate Limiter (no-dependency alternative)

```ts
// src/lib/rate-limit.ts
// Simple token bucket — no external deps needed for single-instance use

const requestCounts = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 30; // requests
const RATE_WINDOW_MS = 60_000; // per minute

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || entry.resetAt < now) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}

// For production, swap this for @upstash/ratelimit or a Redis-backed solution
```

### 4.4 Future Defense Additions

When a new vulnerability or attack vector is discovered:

1. Add a new row to the **Attack Vectors Checklist** (section 4.1).
2. Document the fix in the relevant defense layer (section 4.2).
3. Bump the document's last-updated date at the top.
4. If a new security package was needed, add it to section 4.3.
5. Re-run the test suite to verify no regressions.
6. Commit with message: `docs(search): add defense against <attack vector>`

**Format for new checklist entry:**

```
| SV-NN | **Attack name** | Impact | **High/Med/Low** | Existing defense | Link to mitigation PR |
```

Where `NN` is the next sequential number.

---

## 5. Performance Considerations

### Query Performance

- **`LIKE '%query%'`** cannot use indexes. SQLite must scan every row in the Message table.
- For SQLite, a full table scan of 10,000 rows takes ~5–20ms.
- For 100,000+ rows, this degrades to 200ms+. **Upgrade to FTS5** at that point.
- The query scope (only project chats or only random chats) helps: half the table per query.

### Query Caching

```ts
// src/lib/search/search.cache.ts
const searchCache = new Map<string, { results: SearchResponse; expires: number }>();
const CACHE_TTL_MS = 5_000; // 5 seconds — short enough to stay fresh

export async function cachedSearch(
  query: string,
  limit: number,
  offset: number
): Promise<SearchResponse> {
  const key = `${query.toLowerCase()}::${limit}::${offset}`;
  const hit = searchCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.results;

  const results = await performSearch(query, limit, offset);
  searchCache.set(key, { results, expires: Date.now() + CACHE_TTL_MS });
  return results;
}
```

Cache invalidation: clear the search cache whenever a new message is created (`src/app/api/chat/send/route.ts`):

```ts
import { searchCache } from '@/lib/search/search.cache';
searchCache.clear(); // or invalidate specific keys
```

### Response Size

- Limit snippets to **200 characters** with context window.
- Include at most **3 matched messages** per chat result (the `matchedMessages` array).
- If user wants all matches, they click into the chat and use Ctrl+F.

---

## 6. Testing Plan

### Unit Tests

| Test | File | Coverage |
|------|------|----------|
| Search service query shape | `tests/unit/search.test.ts` | Verifies Prisma query filters (project vs random), limit, offset |
| Highlight generation | `tests/unit/search.test.ts` | `<mark>` placement, multi-word queries, case preservation, regex special chars in query, Unicode handling |
| Snippet extraction | `tests/unit/search.test.ts` | Context window, word boundary trimming, edge cases (empty content, content shorter than window) |
| Input sanitization | `tests/unit/search.test.ts` | Control character stripping, max length enforcement, min length enforcement |
| Rate limiter | `tests/unit/rate-limit.test.ts` | Token count, reset after window, burst handling |
| Result grouping | `tests/unit/search.test.ts` | Multiple messages from same chat grouped, match count correct |

### Integration Tests

| Test | File | Coverage |
|------|------|----------|
| `/api/search` returns proper shape | `tests/component/search-api.test.ts` | Status 200, `SearchResponse` schema validation |
| Empty query returns 400 | `tests/component/search-api.test.ts` | Zod validation error shape |
| Exact match returns result | `tests/component/search-api.test.ts` | Real DB with seeded messages, verify snippet content |
| Search across projects and random | `tests/component/search-api.test.ts` | Real DB, verify project results come first |
| Rate limit headers | `tests/component/search-api.test.ts` | After N requests, status 429 returned |
| Cache headers | `tests/component/search-api.test.ts` | `Cache-Control: private, no-cache` present |

### End-to-End Tests

| Test | File | Coverage |
|------|------|----------|
| Type in sidebar search → results appear | `tests/e2e/search.spec.ts` | Playwright, full browser test |
| Click result → navigate to chat | `tests/e2e/search.spec.ts` | Verify URL changes, chat page loads with correct chat |
| Clear query → results dismissed | `tests/e2e/search.spec.ts` | Back to default sidebar view |
| Special chars in query | `tests/e2e/search.spec.ts` | `<script>`, `%`, `_` don't cause errors or XSS |

---

## 7. Implementation Order & Handoff

### Recommended Build Order

| Step | Effort | Risk | Depends On |
|------|--------|------|------------|
| 1. `src/lib/search/highlight.ts` | 1h | Low | None |
| 2. `src/lib/search/search.service.ts` | 2h | Low | None |
| 3. `src/lib/search/search.cache.ts` | 0.5h | Low | Step 2 |
| 4. `src/lib/rate-limit.ts` | 0.5h | Low | None |
| 5. `src/app/api/search/route.ts` | 1h | Medium (API shape) | Steps 1–4 |
| 6. `src/lib/search/useSearch.ts` | 1h | Low | Step 5 |
| 7. `src/components/SearchResults.tsx` | 2h | Medium (UI polish) | Step 6 |
| 8. `Sidebar.tsx` integration | 1h | Low | Steps 6–7 |
| 9. Tests (unit + integration) | 2h | Low | Steps 1–8 |
| 10. E2E tests | 1h | Low | Step 9 |
| 11. Build + verify | 0.5h | None | Step 10 |

**Total estimated effort: ~12.5 hours.**

### Files to Create

```
src/lib/search/
  highlight.ts         — Snippet extraction + <mark> highlighting
  search.service.ts    — DB query logic (project then random)
  search.cache.ts      — In-memory result cache (5s TTL)
  search.types.ts      — Shared TypeScript interfaces
  useSearch.ts         — Client-side React hook with debounce

src/components/
  SearchResults.tsx    — Search result panel/overlay

src/app/api/
  search/
    route.ts           — GET /api/search handler

src/lib/
  rate-limit.ts        — In-memory rate limiter (token bucket)
```

### Files to Modify

```
src/components/
  Sidebar.tsx          — Integrate useSearch hook + SearchResultsPanel
  (replace lines 216–222 and related JSX)

src/app/api/chat/send/
  route.ts             — Import and call searchCache.clear() on new message
```

### Verification Checklist

- [ ] `npm run typecheck` — zero TypeScript errors
- [ ] `npm test` — all existing tests still pass
- [ ] `npm run build` — clean production build
- [ ] Search returns results for query found in message content
- [ ] Project chat results appear before random chat results
- [ ] Highlighted `<mark>` tags render in snippets, no visible HTML tags
- [ ] `<script>` in query is escaped and not executed
- [ ] 30 rapid requests in 1 minute → 429 rate limited
- [ ] Rate limit resets after 1 minute
- [ ] Empty/minimal query returns empty results (not all chats)
- [ ] Search results overlay dismisses on click/navigation
- [ ] Long queries (>200 chars) rejected with 400
- [ ] FTS upgrade path is documented and ready for future optimization

---

> **Last updated:** 2026-06-25
> **Maintained by:** AI agent working on Strubloid
> **Review cycle:** Update this document whenever a new search-related feature, optimization, or vulnerability is addressed, or after every NPM audit cycle.

---

## 8. NPM Package Management & Dependency Security

> **Goal:** Keep dependencies up-to-date, eliminate known vulnerabilities, and prevent supply-chain attacks. This section documents the strategy, tools, and automation for NPM package health.

### 8.1 Current Dependency Health

*Snapshot taken 2026-06-25.*

**Outdated packages:** 24 of 27 packages have newer versions available.
**Vulnerabilities detected by `npm audit`:** Multiple (includes high-severity issues in `@next/eslint-plugin-next`, `@playwright/test`, transitive deps).
**Major version gaps:** `next` 14.x → 16.x, `react`/`react-dom` 18.x → 19.x, `prisma` 5.x → 7.x, `zod` 3.x → 4.x, `tailwindcss` 3.x → 4.x, `eslint` 8.x → 10.x.
**Semver-safe upgrades available:** `@playwright/test`, `@vitejs/plugin-react`, `@testing-library/*`, `prettier`, `postcss`, `tsx`, `autoprefixer`.

**Priority action items:**

| Priority | Package | Current | Available | Risk | Action |
|----------|---------|---------|-----------|------|--------|
| Critical | `@playwright/test` | 1.48.2 | 1.61.1 (non-breaking) | High vuln | `npm update` immediately |
| Critical | `@vitejs/plugin-react` | 4.3.3 | 4.7.0 (non-breaking) | Moderate vuln | `npm update` immediately |
| High | `eslint-config-next` | 14.2.18 | 16.2.9 (breaking) | High vuln transitive | Upgrade `next` to 16.x |
| High | `next` | 14.2.18 | 16.2.9 | Breaking | Plan migration (App Router stable) |
| Medium | `react` / `react-dom` | 18.3.1 | 19.2.7 | Breaking | Test with Next.js 16 compatibility |
| Medium | `prisma` / `@prisma/client` | 5.22.0 | 7.8.0 | Breaking | Check migration guide |
| Low | `zod` | 3.23.8 | 4.4.3 | Breaking | API changes in v4 |
| Low | `tailwindcss` | 3.4.14 | 4.3.1 | Breaking | Config format changes in v4 |

### 8.2 Audit & Fix Workflow

#### Standard Procedure

```bash
# 1. Check current status
npm audit                    # List all vulnerabilities
npm outdated                 # List all outdated packages

# 2. Apply non-breaking fixes (patch + minor)
npm audit fix                # Auto-fix where semver-safe
npm update                   # Update all packages within semver range

# 3. Review remaining issues
npm audit --audit-level=high # Filter to high/critical only

# 4. For breaking changes — create a branch
git checkout -b deps/update-<package>-<version>
npm install <package>@latest
npm test
npm run build
# Fix any breaking changes, commit, PR

# 5. Re-audit
npm audit && npm outdated
```

#### Breaking Change Decision Tree

```
Package has new major version?
├── Is it a direct dependency?
│   ├── YES → Check changelog/release notes for breaking API changes
│   │   ├── Low effort migration (< 1 day) → Do it now
│   │   └── High effort migration → Schedule as separate task
│   └── NO (transitive) → Check if direct dep has a newer version
│       ├── YES → Update direct dep
│       └── NO → Accept risk, document in issues
└── Is there a known CVE?
    ├── YES → Prioritize update regardless of effort
    └── NO → Schedule per normal cadence
```

#### Automated Fix Attempt

```bash
# Safe auto-fix (non-breaking only)
npm audit fix --dry-run      # Preview what will change
npm audit fix                # Apply safe fixes

# Force fix (may break things — USE WITH CAUTION)
npm audit fix --force        # Installs latest major versions
```

### 8.3 Automated Update Strategy

#### Scheduled Checks with Cron

The `npm-package-audit` skill (see below) runs automatically on a schedule via Hermes cron. It:

1. Runs `npm audit --json` and parses results
2. Runs `npm outdated --json` and parses results  
3. Attempts `npm audit fix` for non-breaking fixes
4. Saves a report to `.hermes/reports/npm-audit-<date>.json`
5. Reports high/critical vulnerabilities to the user

**Schedule recommendation:** Weekly (every Monday 9am).

#### Version Pinning Policy

| Dependency Type | Pin Strategy | Example |
|----------------|-------------|---------|
| Direct deps (runtime) | `^` (minor auto-update) | `"next": "^14.2.18"` |
| Direct deps (dev) | `^` (minor auto-update) | `"vitest": "^2.1.5"` |
| Transitive with CVEs | Override via `package.json` `overrides` | `"overrides": { "vite": "^6.0.0" }` |
| Build tools | Exact pin for reproducibility | `"typescript": "5.6.3"` |

#### Lockfile Management

```bash
# After ANY dependency change:
npm install        # Updates package-lock.json
git add package-lock.json
git commit -m "chore(deps): update lockfile"

# Verify integrity:
npm ls             # Check dependency tree
npm audit          # Re-scan
npm cache verify   # Check cache integrity
```

### 8.4 Supply Chain Security

#### Attack Vectors

| Vector | Description | Mitigation |
|--------|-------------|------------|
| **Typosquatting** | Malicious package with similar name (e.g. `prisam` vs `prisma`) | Use `npm install --dry-run` to preview; verify package name |
| **Dependency confusion** | Internal package name published to public registry with higher version | Scope private packages with `@scope`; use `npm config set @scope:registry <private-url>` |
| **Malicious maintainer** | Legitimate package compromised via maintainer account takeover | Pin exact versions for critical deps; use `npm audit signatures` |
| **Protestware** | Package introduces harmful behavior for political reasons | Monitor package announcements; use `socket.dev` for behavior analysis |
| **Embedded malware in assets** | Obfuscated code in `postinstall` scripts | Use `--ignore-scripts`; audit `postinstall` hooks with `npm query .postinstall` |
| **Registry compromise** | CDN/registry serves tampered package | Use `npm audit signatures` (requires npm 9+); verify integrity |
| **Subdependency poisoning** | Deep transitive dependency compromised | Use lockfile; enable `npm audit` in CI; use `overrides` to force safe versions |

#### Lockfile Security

```bash
# Verify package signatures (npm 9+)
npm audit signatures

# Check for unexpected scripts
npm query ":root > .scripts"                      # Top-level scripts only
npm query ":inherits .scripts"                    # All scripts in tree
npm pkg get scripts                               # Package.json scripts

# Use overrides to force safe transitive versions
# package.json:
# "overrides": {
#   "vite": "6.0.3",
#   "glob": "11.0.0"
# }
```

#### Registry Configuration

```bash
# Use npm registry with security headers
npm config set registry https://registry.npmjs.org/

# For scoped packages (private or alternative registry)
npm config set @my-org:registry https://npm.my-org.com/

# Enable strict SSL
npm config set strict-ssl true

# Verify registry response headers
curl -sI https://registry.npmjs.org/ | grep -i 'content-security-policy\|x-content-type-options'
```

### 8.5 CI/CD Integration for Dependency Hygiene

#### Package.json Scripts

Add these to `package.json`:

```json
{
  "scripts": {
    "deps:audit": "npm audit --audit-level=high",
    "deps:outdated": "npm outdated",
    "deps:update-safe": "npm update && npm audit fix",
    "deps:verify": "npm audit signatures && npm cache verify",
    "deps:report": "npm audit --json > .hermes/reports/audit-$(date +%Y%m%d).json"
  }
}
```

#### Pre-commit Hook (optional with husky)

```bash
# .husky/pre-commit
npm run deps:audit || echo "Warning: vulnerabilities found"
npm run deps:verify
```

#### CI Gate (GitHub Actions example)

```yaml
# .github/workflows/deps-audit.yml
name: Dependency Audit
on:
  schedule:
    - cron: '0 9 * * 1'   # Every Monday 9am
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm audit --audit-level=high
        continue-on-error: true
      - run: npm audit signatures
      - run: npm outdated
      - name: Report vulnerabilities
        if: failure()
        run: |
          echo "::warning::Vulnerabilities found in dependencies"
          npm audit
```

### 8.6 NPM Security Tools Reference

| Tool | Purpose | Installation | Usage |
|------|---------|-------------|-------|
| `npm audit` (built-in) | Vulnerability scanning | Built into npm | `npm audit` |
| `npm outdated` (built-in) | List outdated packages | Built into npm | `npm outdated` |
| `npm update` (built-in) | Safe update within range | Built into npm | `npm update` |
| `npm audit fix` (built-in) | Auto-fix vulnerabilities | Built into npm | `npm audit fix` |
| `npm audit signatures` (npm 9+) | Verify package signatures | Built into npm | `npm audit signatures` |
| **npm-check-updates** | Interactive major version updates | `npm i -g npm-check-updates` | `ncu -u` then `npm install` |
| **Snyk** | Advanced vulnerability scanning + fix | `npm i -g snyk` | `snyk test` |
| **Socket.dev** | Supply chain threat detection | `npm i -g @socketsecurity/cli` | `socket scan` |
| **Dependabot** (GitHub) | Automated PRs for updates | Built into GitHub | Enable in repo Settings > Security |
| **Renovate** | Configurable auto-update bot | GitHub app | Configure `renovate.json` |
| **npm-force-resolutions** | Force transitive dep versions | `npx npm-force-resolutions` | Add `resolutions` to `package.json` |

---

## 9. Continuous Security Improvement

> **Target:** Any AI agent working on Strubloid security. This section tells you how to get better at securing the project over time.
> **Prerequisite:** Read and understand the Attack Vectors Checklist (4.1) and NPM Package Management (8) sections.

### 9.1 How This Document Works

This is a **living reference document**. Every time an AI works on security for this project, it must:

1. **Read this section completely** before making any security change.
2. **Check the Attack Vectors Checklist (4.1)** for the current list of known threats.
3. **Check the NPM audit status (8.1)** for current dependency health.
4. **After making a change**, update this document:
   - Add new attack vectors to section 4.1
   - Add new defenses to section 4.2
   - Add new npm tools to section 8.6
   - Bump the "Last updated" date
   - Save your work as a skill if you discovered a new workflow

### 9.2 Attack Type Reference Library

Use this curated list of security domains to systematically audit the codebase. Each domain links to OWASP or equivalent authoritative guidance. When working on security, pick the next unchecked domain and audit the search code against it.

| # | Security Domain | OWASP / Reference | Applies To | Audit Priority |
|---|---|---|---|---|
| AT-01 | **SQL Injection** | [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection) | All DB queries | High — always |
| AT-02 | **Cross-Site Scripting (XSS)** | [OWASP XSS](https://owasp.org/www-community/attacks/xss/) | Snippet rendering, search input, titles | High — always |
| AT-03 | **Cross-Site Request Forgery (CSRF)** | [OWASP CSRF](https://owasp.org/www-community/attacks/csrf) | Search GET (low risk), but all POST routes | Medium |
| AT-04 | **Server-Side Request Forgery (SSRF)** | [OWASP SSRF](https://owasp.org/www-community/attacks/Server_Side_Request_Forgery) | AI provider API calls | Medium |
| AT-05 | **Injection (NoSQL / OS Command)** | [OWASP Injection](https://owasp.org/www-community/Injection_Flaws) | Any user input passed to external processes | Medium |
| AT-06 | **Broken Authentication** | [OWASP Auth Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) | Future auth implementation | Future |
| AT-07 | **Broken Access Control** | [OWASP Access Control](https://owasp.org/www-community/Access_Control) | Multi-user chat isolation | Future |
| AT-08 | **Sensitive Data Exposure** | [OWASP Data Protection](https://owasp.org/www-community/attacks/Sensitive_Data_Exposure) | API keys in config/env, chat content in search results | High — always |
| AT-09 | **Mass Assignment** | [OWASP Mass Assignment](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html) | API request body parsing | Medium |
| AT-10 | **Denial of Service (DoS)** | [OWASP DoS](https://owasp.org/www-community/attacks/Denial_of_Service) | Search query size, AI provider streaming | High — always |
| AT-11 | **Regular Expression DoS (ReDoS)** | [OWASP ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS) | Highlight generation regex | Medium |
| AT-12 | **Prototype Pollution** | [OWASP Prototype Pollution](https://owasp.org/www-community/attacks/Prototype_Pollution) | JSON parsing, object merging in config | Low |
| AT-13 | **Supply Chain** | [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/) | All npm packages | High — weekly audit |
| AT-14 | **Log Injection** | [OWASP Log Injection](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) | Console.log with user data | Low |
| AT-15 | **Path Traversal** | [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal) | File paths in config, file uploads | Medium |
| AT-16 | **Cache Poisoning** | [OWASP Cache Poisoning](https://owasp.org/www-community/attacks/Cache_Poisoning) | Search response caching (SV-11) | Medium |
| AT-17 | **Race Condition** | [OWASP Race Condition](https://owasp.org/www-community/attacks/Race_condition) | Async chat operations, memory compaction | Low |
| AT-18 | **HTTP Method Tampering** | [OWASP HTTP Methods](https://owasp.org/www-community/attacks/HTTP_Method_Tampering) | API route security headers | Low |
| AT-19 | **Timing Attacks** | [OWASP Timing Attack](https://cheatsheetseries.owasp.org/cheatsheets/Timing_Attack_Cheat_Sheet.html) | Search response time analysis (SV-05) | Low |
| AT-20 | **Unicode / Encoding Attacks** | [OWASP Unicode](https://owasp.org/www-community/attacks/Unicode_Encoding) | Search normalization (SV-07) | Low |

**How to use:** For each new feature, review the applicable AT domains. If the feature creates new attack surface, add a new row to this table with the next sequential AT-NN number.

### 9.3 CVE Monitoring Strategy

```bash
# 1. Subscribe to security feeds
#    - Node.js Security Working Group: https://nodejs.org/en/blog/vulnerability/
#    - npm Security Advisories: https://www.npmjs.com/advisories
#    - GitHub Advisory Database: https://github.com/advisories

# 2. Check your dependencies against known CVEs
npm audit --json | jq '.vulnerabilities | keys[]'

# 3. For major framework CVEs (Next.js, Prisma, React):
#    - Next.js Security: https://nextjs.org/docs/messages/security-advisories
#    - Prisma Security: https://www.prisma.io/docs/orm/reference/security
#    - React Security: https://react.dev/community/security

# 4. Automated monitoring (install one):
npx @socketsecurity/cli scan --all            # Socket.dev: supply chain monitoring
npm i -g snyk && snyk monitor                 # Snyk: continuous monitoring
```

#### High-Severity CVE Watchlist (Strubloid)

These packages are most likely to have security advisories that affect this project:

```json
{
  "watch": [
    "next",
    "react", "react-dom",
    "prisma", "@prisma/client",
    "zod",
    "vitest",
    "eslint-config-next",
    "sass"
  ],
  "check_frequency": "weekly",
  "notification": "npm audit fails → report to user"
}
```

### 9.4 Reference Links & Tooling Array

Organized by category for easy lookup. Any AI agent can use these to research security improvements.

#### Official Documentation & Standards

| Resource | URL | Why |
|----------|-----|-----|
| OWASP Top 10 (2021) | https://owasp.org/www-project-top-ten/ | Default threat model reference |
| OWASP Cheat Sheet Series | https://cheatsheetseries.owasp.org/ | Practical defense guides |
| OWASP ASVS (Application Security Verification Standard) | https://owasp.org/www-project-application-security-verification-standard/ | Comprehensive checklist for security review |
| CWE (Common Weakness Enumeration) | https://cwe.mitre.org/ | Standardized weakness IDs |
| CVE (Common Vulnerabilities and Exposures) | https://cve.mitre.org/ | Vulnerability database |
| NVD (National Vulnerability Database) | https://nvd.nist.gov/ | Enriched CVE data with CVSS scores |

#### Next.js & React Security

| Resource | URL | Why |
|----------|-----|-----|
| Next.js Security Docs | https://nextjs.org/docs/messages/security-advisories | Framework-specific advisories |
| Next.js Security Headers | https://nextjs.org/docs/app/api-reference/next-config-js/headers | CSP, CORS config |
| React Security | https://react.dev/community/security | React-specific XSS guidance |
| Next.js Server Actions Security | https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#security | For future server actions |

#### NPM & Dependency Security

| Resource | URL | Why |
|----------|-----|-----|
| npm audit docs | https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities | Built-in auditing |
| npm registry security | https://docs.npmjs.com/about-registry-security | Registry tampering protections |
| npm package signatures | https://docs.npmjs.com/about-registry-signatures | Package integrity verification (npm 9+) |
| Socket.dev Blog | https://socket.dev/blog | Supply chain threat research |
| Snyk Blog | https://snyk.io/blog/ | Vulnerability research & fixes |

#### Web Security Scanning Tools

| Tool | URL | Purpose |
|------|-----|---------|
| Mozilla Observatory | https://observatory.mozilla.org/ | Scan HTTP security headers |
| Security Headers | https://securityheaders.com/ | Header analysis |
| CSP Evaluator | https://csp-evaluator.withgoogle.com/ | Content Security Policy validation |
| SSLyze | https://github.com/nabla-c0d3/sslyze | TLS configuration scanning |

#### SAST / Code Analysis

| Tool | URL | Purpose |
|------|-----|---------|
| ESLint Security Plugin | https://github.com/nodesecurity/eslint-plugin-security | Lint-time security rules |
| CodeQL | https://codeql.github.com/ | Deep code analysis (free for public repos) |
| SonarQube | https://www.sonarsource.com/ | Full SAST suite |
| Trivy | https://github.com/aquasecurity/trivy | File system + dependency scanning |

#### Runtime Protection

| Tool | URL | Purpose |
|------|-----|---------|
| Helmet.js | https://helmetjs.github.io/ | Express HTTP headers (for custom Node servers) |
| express-rate-limit | https://github.com/express-rate-limit/express-rate-limit | Rate limiting middleware |
| rate-limiter-flexible | https://github.com/animir/node-rate-limiter-flexible | Advanced rate limiting (in-memory, Redis, etc.) |

#### Security News & Feeds

| Feed | URL | Why |
|------|-----|-----|
| Node.js Security WG | https://nodejs.org/en/blog/vulnerability/ | Official Node.js vuln announcements |
| The Hacker News | https://thehackernews.com/ | General security news |
| BleepingComputer | https://www.bleepingcomputer.com/ | Security incidents |
| PortSwigger Research | https://portswigger.net/research | Web security research |
| OWASP Newsletter | https://owasp.org/news/ | Community announcements |

### 9.5 Review Schedule & Handoff Protocol

#### Scheduled Reviews

| Cadence | Action | Tool / Doc |
|---------|--------|------------|
| **Weekly** | NPM audit + outdated check | Hermes cron + `npm-package-audit` skill |
| **Monthly** | Full dependency review + update | Section 8 + npm-check-updates |
| **Quarterly** | Attack surface audit (pick 3 AT domains) | Section 9.2 Attack Type Library |
| **Per feature** | Security review of new endpoint | Section 4 + applicable AT domains |
| **On vulnerability disclosure** | Immediate patch + document update | Sections 4.4 / 9.3 |

#### Handoff Protocol for AI Agents

When an AI completes a security task on this project, it must leave a clear trail for the next AI:

1. **Update this document** with any new defenses, attack vectors, or tool references.
2. **Run the test suite** and verify all existing tests pass. If security tests were added, verify they pass too.
3. **Save new procedures as skills** using `skill_manage(action='create')` if a non-trivial workflow was discovered.
4. **Document the change scope**:
   ```
   Files changed:
   - <path> — <what changed and why>
   
   Security impact:
   - <new attack vectors addressed>
   - <new defenses added>
   - <remaining risk, if any>
   
   Run-book for next AI:
   - <what the next agent should verify or continue>
   ```
5. **Verify the build:** `npm run typecheck && npm run build && npm test`
6. **Bump the "Last updated" date** at the top of this document.

#### Escalation Path

```
Subject: Security escalation — Strubloid
─────────────────────────────────────
High/Critical severity → Stop all other work
├── CVE with CVSS >= 7.0 in direct dependency
├── Exploit detected in the wild
└── Data exfiltration confirmed

Medium severity → Schedule within current work cycle
├── CVE with CVSS 4.0–6.9
├── Missing security header
└── Rate limiting not implemented

Low severity → Document as future improvement
├── CVE with CVSS < 4.0
├── Code quality issues
└── Theoretical attack vectors without known exploit
```

---

> **Last updated:** 2026-06-25
> **Maintained by:** AI agent working on Strubloid
> **Review cycle:** Update this document whenever a new search-related feature, optimization, or vulnerability is addressed, or after every NPM audit cycle.
