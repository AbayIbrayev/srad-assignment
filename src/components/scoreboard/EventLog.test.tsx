import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import type { Match } from '@/domain/match'
import { useScoreboardStore } from '@/store/scoreboard'
import { givenMatch, resetScoreboard } from '@/test/utils'

import { EventLog } from './EventLog'

beforeEach(resetScoreboard)

const matchOf = (id: string): Match => useScoreboardStore.getState().matches[id]

const renderLog = (id: string) => render(<EventLog match={matchOf(id)} />)

const entries = () =>
  within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent)

describe('EventLog', () => {
  it('is collapsed by default, so a board of cards stays scannable', () => {
    renderLog(givenMatch('Spain', 'Brazil'))

    expect(screen.getByText(/Event log/).closest('details')).not.toHaveAttribute('open')
  })

  it('shows how many entries there are without being opened', () => {
    const id = givenMatch('Spain', 'Brazil')
    useScoreboardStore.getState().addGoal(id, 'home')

    renderLog(id)

    expect(screen.getByText(/Event log/)).toHaveTextContent('(2)')
  })

  it('is a focusable, named scroll region, so it can be read without a mouse', () => {
    renderLog(givenMatch('Spain', 'Brazil'))

    const log = screen.getByRole('list', { name: 'Event log for Spain versus Brazil, newest first' })
    expect(log).toHaveAttribute('tabindex', '0')
  })

  it('opens with the match starting', () => {
    renderLog(givenMatch('Spain', 'Brazil'))

    expect(entries()).toEqual([expect.stringContaining('Match started')])
  })

  it('lists the newest entry first', () => {
    const id = givenMatch('Spain', 'Brazil')
    useScoreboardStore.getState().addGoal(id, 'home')
    useScoreboardStore.getState().addGoal(id, 'away')

    renderLog(id)

    expect(entries()[0]).toContain('Goal — Brazil')
    expect(entries().at(-1)).toContain('Match started')
  })

  it('names the side that scored and the score that resulted', () => {
    const id = givenMatch('Spain', 'Brazil')
    useScoreboardStore.getState().addGoal(id, 'home')

    renderLog(id)

    expect(entries()[0]).toContain('Goal — Spain')
    expect(entries()[0]).toContain('1-0')
  })

  it('distinguishes a goal that did not count from an entry made by mistake', () => {
    // This is the reason the log exists rather than a detail of it. Both take a
    // goal off the score; only one of them says the goal was never real.
    const id = givenMatch('Spain', 'Brazil')
    useScoreboardStore.getState().addGoal(id, 'home')
    useScoreboardStore.getState().removeGoal(id, 'home')
    useScoreboardStore.getState().addGoal(id, 'away')
    useScoreboardStore.getState().undoLastChange(id)

    renderLog(id)

    expect(entries()[0]).toContain('Undone: Goal — Brazil')
    expect(entries()[1]).toContain('Goal — Brazil')
    expect(entries()[2]).toContain('Goal removed — Spain')
    expect(entries()[0]).not.toContain('Goal removed')
  })

  it('keeps what an undo reverted, rather than erasing it', () => {
    const id = givenMatch('Spain', 'Brazil')
    useScoreboardStore.getState().addGoal(id, 'home')
    useScoreboardStore.getState().undoLastChange(id)

    renderLog(id)

    // Three entries, not one: deleting the mistaken goal would leave a record
    // indistinguishable from one where it never happened.
    expect(entries()).toHaveLength(3)
    expect(entries()[1]).toContain('Goal — Spain')
  })

  it('records the finish and survives the match it describes', () => {
    const id = givenMatch('Spain', 'Brazil')
    useScoreboardStore.getState().addGoal(id, 'home')
    useScoreboardStore.getState().finishMatch(id)

    renderLog(id)

    expect(entries()[0]).toContain('Match finished')
    expect(entries()[0]).toContain('1-0')
  })

  it('timestamps every entry', () => {
    const id = givenMatch('Spain', 'Brazil')
    useScoreboardStore.getState().addGoal(id, 'home')

    const { container } = renderLog(id)

    expect(container.querySelectorAll('time')).toHaveLength(2)
  })

  it('hides the decorative marker from assistive technology', () => {
    // The wording carries the distinction; the marker only reinforces it, and
    // colour or glyph alone must never be the thing that tells entries apart.
    const id = givenMatch('Spain', 'Brazil')
    useScoreboardStore.getState().addGoal(id, 'home')

    renderLog(id)

    const [newest] = within(screen.getByRole('list')).getAllByRole('listitem')
    const marker = within(newest).getByText('+')

    expect(marker).toHaveAttribute('aria-hidden', 'true')
    // The entry still says what happened with the marker removed from the
    // accessible name.
    expect(newest).toHaveTextContent('Goal — Spain')
  })
})
