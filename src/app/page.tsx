'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePortalStore } from '@/stores/portal.store'
import { ScrollToEnter } from '@/components/portal/ScrollToEnter'
import { Hallway } from '@/components/hallway/Hallway'

/**
 * Landing page — the portal entrance.
 *
 * Phase 1 (portal shown): renders Portal via createPortal to document.body,
 * covering the entire viewport. LayoutShell hides all chrome during this phase.
 *
 * Phase 2 (portal exited): stops createPortal, renders Hallway in the
 * LayoutShell's <main> children slot, alongside the sidebar.
 *
 * No delay gap: the moment phase='interior', portal stops and hallway starts.
 * The flash overlay inside ScrollToEnter covers the visual transition.
 */
export default function Home() {
  const phase = usePortalStore((s) => s.phase)
  const [mounted, setMounted] = useState(false)
  const [showPortal, setShowPortal] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (phase === 'interior') {
      // Reset scroll so the real app content comes back into view
      window.scrollTo({ top: 0, behavior: 'instant' })
      // Immediately stop showing portal — no delay gap.
      // The flash overlay inside ScrollToEnter handles the visual transition.
      setShowPortal(false)
    }
  }, [phase])

  if (!mounted) return null

  return (
    <>
      {/* Portal entrance — covers EVERYTHING via portal to body */}
      {showPortal && createPortal(<ScrollToEnter />, document.body)}

      {/* After portal exit: Hallway renders INSIDE the layout's <main> area */}
      {!showPortal && <Hallway />}
    </>
  )
}
