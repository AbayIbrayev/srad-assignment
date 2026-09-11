import { useCallback, useState, type ReactNode } from 'react'

import { AnnouncerContext } from './announcer-context'

export function Announcer({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')

  const announce = useCallback((next: string) => {
    // Repeating an identical string is not re-announced by most screen readers,
    // so a trailing zero-width space makes "Spain 2, Brazil 1" twice in a row
    // audible twice. It is invisible on screen and unspoken.
    setMessage((current) => (current === next ? `${next}​` : next))
  }, [])

  return (
    <AnnouncerContext value={announce}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="announcer">
        {message}
      </div>
    </AnnouncerContext>
  )
}
