import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useScoreboardStore } from '@/store/scoreboard'
import { givenMatch, renderWithAnnouncer, resetScoreboard } from '@/test/utils'

import { MatchCard } from './MatchCard'

beforeEach(resetScoreboard)

const renderCard = (id: string, rank = 1, onFinished = vi.fn()) => ({
  onFinished,
  ...renderWithAnnouncer(<MatchCard id={id} rank={rank} onFinished={onFinished} />),
})

describe('MatchCard', () => {
  it('names itself after the fixture and states its position in the summary', () => {
    const id = givenMatch('Spain', 'Brazil', 10, 2)
    renderCard(id, 2)

    expect(screen.getByRole('heading', { name: 'Spain vs Brazil', level: 3 })).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
  })

  it('shows the total goals and the start time, so the ranking can be checked on sight', () => {
    const id = givenMatch('Spain', 'Brazil', 10, 2)
    const { container } = renderCard(id)

    expect(screen.getByText(/12 goals/)).toBeInTheDocument()
    expect(container.querySelector('time')).toHaveAttribute('datetime')
  })

  it('renders a single goal in the singular', () => {
    renderCard(givenMatch('Spain', 'Brazil', 1, 0))

    expect(screen.getByText(/1 goal ·/)).toBeInTheDocument()
  })

  it('adds a goal to the chosen side only', async () => {
    const id = givenMatch('Spain', 'Brazil')
    const { user } = renderCard(id)

    await user.click(screen.getByRole('button', { name: 'Add a goal for Spain' }))

    expect(useScoreboardStore.getState().matches[id].score).toEqual({ home: 1, away: 0 })
  })

  it('removes a goal from the chosen side only', async () => {
    const id = givenMatch('Spain', 'Brazil', 2, 1)
    const { user } = renderCard(id)

    await user.click(screen.getByRole('button', { name: 'Remove a goal from Brazil' }))

    expect(useScoreboardStore.getState().matches[id].score).toEqual({ home: 2, away: 0 })
  })

  it('cannot remove a goal from a side on zero', () => {
    renderCard(givenMatch('Spain', 'Brazil', 1, 0))

    expect(screen.getByRole('button', { name: 'Remove a goal from Spain' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Remove a goal from Brazil' })).toBeDisabled()
  })

  it('announces the new score after a change', async () => {
    const { user } = renderCard(givenMatch('Spain', 'Brazil'))

    await user.click(screen.getByRole('button', { name: 'Add a goal for Spain' }))

    expect(screen.getByTestId('announcer')).toHaveTextContent('Spain 1 - 0 Brazil')
  })

  it('hides the flag from assistive technology, leaving the team name as the label', () => {
    renderCard(givenMatch('Spain', 'Brazil'))

    // The flag must never be a team's only label: screen readers announce
    // regional indicator pairs inconsistently.
    expect(screen.getByText('🇪🇸')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Spain')).toBeInTheDocument()
  })

  describe('finishing', () => {
    it('asks for confirmation first, because finishing cannot be undone', async () => {
      const id = givenMatch('Spain', 'Brazil', 1, 0)
      const { user } = renderCard(id)

      await user.click(screen.getByRole('button', { name: /Finish match/ }))

      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText(/cannot be scored or reopened/)).toBeInTheDocument()
      expect(useScoreboardStore.getState().matches[id].status).toBe('in_progress')
    })

    it('leaves the match alone if the operator backs out', async () => {
      const id = givenMatch('Spain', 'Brazil')
      const { user } = renderCard(id)

      await user.click(screen.getByRole('button', { name: /Finish match/ }))
      await user.click(screen.getByRole('button', { name: 'Keep playing' }))

      expect(useScoreboardStore.getState().matches[id].status).toBe('in_progress')
    })

    it('finishes on confirmation, announces it, and hands focus back', async () => {
      const id = givenMatch('Spain', 'Brazil', 1, 0)
      const { user, onFinished } = renderCard(id)

      await user.click(screen.getByRole('button', { name: /Finish match/ }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Finish match' }))

      expect(useScoreboardStore.getState().matches[id].status).toBe('finished')
      expect(screen.getByTestId('announcer')).toHaveTextContent('Match finished. Spain 1 - 0 Brazil.')
      // The card is about to unmount; without this the keyboard user is dropped
      // on the document body with no idea what happened.
      expect(onFinished).toHaveBeenCalledWith(id)
    })
  })

  it('renders nothing for a match that is no longer in progress', () => {
    const id = givenMatch('Spain', 'Brazil')
    useScoreboardStore.getState().finishMatch(id)

    const { container } = renderCard(id)

    expect(container.querySelector('h3')).toBeNull()
  })
})
