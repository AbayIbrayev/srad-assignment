import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'

import { Announcer } from '@/a11y/Announcer'
import { useScoreboardStore } from '@/store/scoreboard'

/**
 * The store is a module singleton, so tests share it. Resetting the state is
 * enough — the actions are closures over the same `set`/`get` and do not need
 * rebuilding — and clearing storage stops one test's board rehydrating into the
 * next one.
 */
export function resetScoreboard(): void {
  useScoreboardStore.setState({ matches: {}, nextSeq: 1 })
  localStorage.clear()
}

export function renderWithAnnouncer(ui: ReactElement) {
  return { user: userEvent.setup(), ...render(<Announcer>{ui}</Announcer>) }
}

/** Starts a match directly through the store, for tests that are not about starting one. */
export function givenMatch(homeTeam: string, awayTeam: string, home = 0, away = 0): string {
  const result = useScoreboardStore.getState().startMatch(homeTeam, awayTeam)
  if (!result.ok) throw new Error(`could not start ${homeTeam} v ${awayTeam}: ${result.error}`)

  for (let i = 0; i < home; i++) useScoreboardStore.getState().addGoal(result.id, 'home')
  for (let i = 0; i < away; i++) useScoreboardStore.getState().addGoal(result.id, 'away')

  return result.id
}
