'use client';

import { useState, createContext, useContext, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { HeaderBar } from '@/components/LayoutShell/HeaderBar';
import { CommandDeck } from '@/components/CommandDeck';
import { usePortalStore } from '@/stores/portal.store';
import styles from './LayoutShell.module.scss';

export type SidebarMode = 'full' | 'icons' | 'hidden';

interface SidebarContextValue {
  mode: SidebarMode;
  toggle: () => void;
  setMode: (m: SidebarMode) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  mode: 'full',
  toggle: () => {},
  setMode: () => {},
  mobileOpen: false,
  setMobileOpen: () => {}
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('icons');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandDeckOpen, setCommandDeckOpen] = useState(false);
  const [commandDeckQuery, setCommandDeckQuery] = useState('');
  const pathname = usePathname();
  const portalPhase = usePortalStore((s) => s.phase);

  // During portal entry phases on the root route, don't render layout chrome.
  // On direct app routes like /chat or /projects, a hard refresh resets the
  // in-memory portal store back to "landing"; those routes must still render
  // the normal app shell/sidebar.
  const isPortalEntry = pathname === '/' && portalPhase !== 'interior';

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<{ query?: string }>).detail;
      setCommandDeckQuery(detail?.query ?? '');
      setCommandDeckOpen(true);
    };
    window.addEventListener('strubloid-open-command-deck', open);
    return () => window.removeEventListener('strubloid-open-command-deck', open);
  }, []);

  // On mobile, start with hidden sidebar
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 768) {
        setSidebarMode('hidden');
      } else if (window.innerWidth < 1024) {
        setSidebarMode('icons');
      } else {
        setSidebarMode('icons');
      }
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggle = useCallback(() => {
    setSidebarMode((prev) => {
      if (prev === 'full') return 'icons';
      if (prev === 'icons') return 'full';
      return 'full';
    });
  }, []);

  // During portal entry: just render children (the portal lives in a
  // createPortal to body from page.tsx — this wrapper is invisible).
  // No sidebar, no header, no chrome — the portal IS the entrance.
  if (isPortalEntry) {
    return <>{children}</>;
  }

  return (
    <SidebarContext.Provider
      value={{
        mode: sidebarMode,
        toggle,
        setMode: setSidebarMode,
        mobileOpen,
        setMobileOpen
      }}
    >
      <div className={styles['layout-shell']} data-portal-interior>
        <HeaderBar
          onOpenCommandDeck={(query) => {
            setCommandDeckQuery(query ?? '');
            setCommandDeckOpen(true);
          }}
        />

        {/* Decorative /dev/hack strapline below header */}
        <div className={styles['devhack-bar']}>
          <span className={styles['devhack-text']}>/dev/hack</span>
        </div>

        <div className={styles['layout-body']}>
          <Sidebar mode={sidebarMode} mobileOpen={mobileOpen} onMobileToggle={setMobileOpen} />
          {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
          <main
            className={styles['main-area']}
            onClick={() => {
              setSidebarMode((current) => (current === 'full' ? 'icons' : current));
            }}
          >
            {children}
          </main>
        </div>
        <CommandDeck
          open={commandDeckOpen}
          initialQuery={commandDeckQuery}
          onClose={() => setCommandDeckOpen(false)}
        />
      </div>
    </SidebarContext.Provider>
  );
}
