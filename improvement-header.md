# Chat Header UX Auto-Hide & Sticky Header Improvement

## Problem

The chat page's title header scrolls away with the messages. Once the user scrolls down, they can no longer see the chat title, rename button, or delete action without scrolling back to the top or reaching for the sidebar. This creates friction — the user must remember the chat context from memory or interrupt their reading flow to find it.

## Goals

1. **Sticky header** — The chat title + actions (rename, delete, future options) remain accessible at the top of the chat area at all times.
2. **Auto-hide on scroll down** — When the user scrolls down through a long conversation, the header smoothly slides up and out of view to reclaim vertical space for messages.
3. **Show on scroll up** — As soon as the user scrolls back up (even a few pixels), the header slides back down to reveal the title and actions.
4. **Always visible at top** — When the scroll position is at or near the very top, the header is always visible regardless of scroll direction.
5. **Glass/blur aesthetic** — Semi-transparent background with backdrop blur, consistent with the app-level HeaderBar design language.

## Approach Evaluation

| Technique | Pros | Cons | Verdict |
|-----------|------|------|---------|
| `position: sticky` only | Simple, no JS | Doesn't hide on scroll, always visible | ✗ Not enough |
| IntersectionObserver (sentinel) | Performant, no scroll listeners | Direction-based hide/show harder; only knows "at top" vs "not at top" | ✗ Misses direction requirement |
| Scroll event + RAF throttling | Full control, direction-aware, smooth | Requires ref to scroll container | ✓ **Chosen** |
| CSS `overflow-anchor` | Native browser behavior | Only controls scroll anchoring, not header visibility | ✗ Wrong purpose |
| `position: fixed` + scroll tracking | Stays above everything independent of container | Overlays content, needs careful z-indexing, breaks with sidebar layout | ✗ Too fragile |

## Chosen Technique

The **scroll-direction-aware sticky header** pattern:

- The header uses `position: sticky; top: 0` within a dedicated scroll-area container
- A `requestAnimationFrame`-throttled scroll listener tracks `scrollTop` direction
- `transform: translateY(-100%)` slides the header out of view; `translateY(0)` brings it back
- CSS `transition: transform 0.25s ease` provides smooth motion
- 5px deadzone prevents flickering from tiny scroll jitter
- `scrollTop < 10` forces the header visible (explicit override when near top)

This is the same technique used by Chrome mobile, Twitter, Instagram, and most modern progressive web apps.

## Layout Architecture Change

### Before
```
<main> (flex-1 flex-col min-h-0)
  <header> (chat title, NOT sticky, scrolls away)
  <MessageList> (flex:1, overflow-y:auto — the scroll container)
  <ChatComposer> (flex-shrink:0)
```

### After
```
<main> (flex-1 flex-col)
  <div class="scroll-area"> (flex:1, overflow-y:auto — NEW scroll container)
    <ChatHeaderBar> (sticky top:0, auto-hide via transform)
    <MessageList> (flex:1, no overflow — renders messages inline)
  </div>
  <ChatComposer> (flex-shrink:0, stays pinned to bottom)
  <ErrorBanner>
  <ConfirmDialog>
```

The scroll-area wraps only the header + messages. The composer stays outside the scroll area, fixed at the bottom — standard chat app layout (WhatsApp, Telegram, Signal).

## Component: ChatHeaderBar

### Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | string | Current chat title |
| `isEditing` | boolean | Whether title is being edited |
| `editedTitle` | string | Current value of edit input |
| `onEditedTitleChange` | (v: string) => void | Called on edit input change |
| `titleError` | string \| null | Validation error message |
| `onStartEdit` | () => void | Double-click or pencil click |
| `onSave` | () => void | Enter or blur |
| `onCancelEdit` | () => void | Escape |
| `onDelete` | () => void | Delete button click |
| `isRandom` | boolean | Show "Random Chat" vs "Project Chat" |
| `scrollContainerRef` | RefObject\<HTMLElement\> | Ref to the scroll container for tracking |

### Auto-Hide Logic (inside component)

```typescript
const lastScrollYRef = useRef(0);
const tickingRef = useRef(false);

useEffect(() => {
  const el = scrollContainerRef.current;
  if (!el) return;

  const handleScroll = () => {
    if (tickingRef.current) return;
    tickingRef.current = true;

    requestAnimationFrame(() => {
      const currentScrollY = el.scrollTop;
      const isAtTop = currentScrollY < 10;

      if (isAtTop) {
        setHidden(false);
      } else if (currentScrollY > lastScrollYRef.current + 5) {
        setHidden(true);  // scrolling down
      } else if (currentScrollY < lastScrollYRef.current - 5) {
        setHidden(false); // scrolling up
      }

      lastScrollYRef.current = currentScrollY;
      tickingRef.current = false;
    });
  };

  el.addEventListener('scroll', handleScroll, { passive: true });
  return () => el.removeEventListener('scroll', handleScroll);
}, [scrollContainerRef]);
```

### CSS

```scss
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  transform: translateY(0);
  transition: transform 0.25s ease;
  background: rgba(color-bg-secondary, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid color-border;
  flex-shrink: 0;
}

.hidden {
  transform: translateY(-100%);
}
```

## Files Changed

| Action | File |
|--------|------|
| **Create** | `src/components/ChatHeaderBar.tsx` |
| **Create** | `src/components/ChatHeaderBar.module.scss` |
| **Modify** | `src/app/chat/[chatId]/page.tsx` |
| **Modify** | `src/app/chat/page.tsx` |
| **Modify** | `src/components/MessageList.module.scss` |
| **Create** | `improvement-header.md` (this file) |

## MessageList Side Effect

Since the scroll handling moves from `MessageList` to the scroll-area wrapper, MessageList's `.container` loses `overflow-y: auto`. The spacer for bottom-anchoring remains. No other MessageList changes needed.

## Edge Cases Handled

| Case | Behavior |
|------|----------|
| Single message | Header visible, messages at bottom above composer |
| Long conversation scrolled down | Header hidden, all space for messages |
| Scroll up from bottom | Header reappears immediately with title context |
| Rapid scroll / flick scroll | RAF throttling + 5px deadzone prevents toggle flicker |
| Mobile touch scroll | Passive listener, RAF throttling works with touch |
| Title editing while scrolled | Edit input stays in header; scroll-down hides it (intentional — user can scroll up to reveal) |
| Keyboard navigation (PageUp/Down) | Works naturally — `scroll` event fires on any scroll method |
| Resize / orientation change | Sticky handles it; no extra logic needed |

## Verification

1. Open a chat with enough messages to scroll
2. Confirm header shows title, rename pencil, delete button
3. Scroll down → header slides up smoothly, hidden from view
4. Scroll up → header slides back down smoothly
5. At the very top → header always visible
6. Double-click title → edit input appears; Enter saves; Escape cancels
7. Click delete → confirm dialog shows; confirm deletes + refresh sidebar
8. Check `/chat` (new/random chat page) has the same behavior
