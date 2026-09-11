import { createContext, useContext } from 'react'

/**
 * One polite live region for the whole board, not one per card.
 *
 * Six cards each with their own live region is screen-reader spam: every score
 * change on any match interrupts whatever is being read. A single region means
 * the most recent change is announced once, in the operator's words, and the
 * scores themselves stay ordinary readable text.
 */
export const AnnouncerContext = createContext<((message: string) => void) | null>(null)

export function useAnnouncer(): (message: string) => void {
  const announce = useContext(AnnouncerContext)
  if (!announce) throw new Error('useAnnouncer must be used inside <Announcer>')
  return announce
}
