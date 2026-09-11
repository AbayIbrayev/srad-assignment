import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useScoreboardStore } from '@/store/scoreboard'
import { givenMatch, renderWithAnnouncer, resetScoreboard } from '@/test/utils'

import { StartMatchDialog } from './StartMatchDialog'

const openDialog = async () => {
  const view = renderWithAnnouncer(<StartMatchDialog />)
  await view.user.click(screen.getByRole('button', { name: 'Start match' }))
  return view
}

const pick = async (user: ReturnType<typeof renderWithAnnouncer>['user'], label: string, team: string) => {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: new RegExp(team) }))
}

beforeEach(resetScoreboard)

describe('StartMatchDialog', () => {
  it('labels both team pickers', async () => {
    await openDialog()

    expect(screen.getByRole('combobox', { name: 'Home team' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Away team' })).toBeInTheDocument()
  })

  it('starts a match at nil-nil', async () => {
    const { user } = await openDialog()

    await pick(user, 'Home team', 'Spain')
    await pick(user, 'Away team', 'Brazil')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Start match' }))

    const matches = Object.values(useScoreboardStore.getState().matches)
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      homeTeam: 'Spain',
      awayTeam: 'Brazil',
      score: { home: 0, away: 0 },
      status: 'in_progress',
    })
  })

  it('cannot be submitted until both teams are chosen', async () => {
    const { user } = await openDialog()
    const submit = within(screen.getByRole('dialog')).getByRole('button', { name: 'Start match' })

    expect(submit).toBeDisabled()

    await pick(user, 'Home team', 'Spain')
    expect(submit).toBeDisabled()

    await pick(user, 'Away team', 'Brazil')
    expect(submit).toBeEnabled()
  })

  it('announces the match it started', async () => {
    const { user } = await openDialog()

    await pick(user, 'Home team', 'Spain')
    await pick(user, 'Away team', 'Brazil')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Start match' }))

    expect(screen.getByTestId('announcer')).toHaveTextContent('Match started. Spain versus Brazil.')
  })

  it('disables a team that is already playing, and says why', async () => {
    givenMatch('Spain', 'Brazil')
    const { user } = await openDialog()

    await user.click(screen.getByRole('combobox', { name: 'Home team' }))

    const spain = await screen.findByRole('option', { name: /Spain/ })
    expect(spain).toHaveTextContent('already playing')
    expect(spain).toHaveAttribute('aria-disabled', 'true')
  })

  it('disables the team already chosen on the other side', async () => {
    const { user } = await openDialog()

    await pick(user, 'Home team', 'Spain')
    await user.click(screen.getByRole('combobox', { name: 'Away team' }))

    expect(await screen.findByRole('option', { name: /Spain/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('offers every team from the example scenario', async () => {
    const { user } = await openDialog()

    await user.click(screen.getByRole('combobox', { name: 'Home team' }))

    for (const team of ['Mexico', 'Canada', 'Spain', 'Brazil', 'Germany', 'France', 'Uruguay', 'Italy', 'Argentina', 'Australia']) {
      expect(await screen.findByRole('option', { name: new RegExp(team) })).toBeInTheDocument()
    }
  })
})
