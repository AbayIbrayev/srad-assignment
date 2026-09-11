import { describe, expect, it } from 'vitest'

import type { FinishedMatch, InProgressMatch } from './match'
import { teamsInPlay, validateStartMatch } from './validation'

let nextSeq = 0

function inProgress(homeTeam: string, awayTeam: string): InProgressMatch {
  const seq = ++nextSeq
  return {
    id: `match-${seq}`,
    seq,
    homeTeam,
    awayTeam,
    score: { home: 0, away: 0 },
    startedAt: 0,
    status: 'in_progress',
    lastChange: null,
  }
}

const finished = (homeTeam: string, awayTeam: string): FinishedMatch => ({
  ...inProgress(homeTeam, awayTeam),
  status: 'finished',
  finishedAt: 1_000,
})

describe('teamsInPlay', () => {
  it('collects both sides of every in-progress match', () => {
    const matches = [inProgress('Spain', 'Brazil'), inProgress('Italy', 'Uruguay')]

    expect(teamsInPlay(matches)).toEqual(new Set(['Spain', 'Brazil', 'Italy', 'Uruguay']))
  })

  it('ignores finished matches, freeing their teams for a later fixture', () => {
    expect(teamsInPlay([finished('Spain', 'Brazil')])).toEqual(new Set())
  })

  it('is empty for an empty scoreboard', () => {
    expect(teamsInPlay([])).toEqual(new Set())
  })
})

describe('validateStartMatch', () => {
  it('accepts two free teams', () => {
    expect(validateStartMatch([], 'Spain', 'Brazil')).toBeNull()
  })

  it('rejects a team playing itself', () => {
    expect(validateStartMatch([], 'Spain', 'Spain')).toBe('SAME_TEAM')
  })

  it('rejects a team already in an in-progress match, on either side', () => {
    const matches = [inProgress('Spain', 'Brazil')]

    expect(validateStartMatch(matches, 'Spain', 'Italy')).toBe('TEAM_ALREADY_PLAYING')
    expect(validateStartMatch(matches, 'Italy', 'Spain')).toBe('TEAM_ALREADY_PLAYING')
    expect(validateStartMatch(matches, 'Italy', 'Brazil')).toBe('TEAM_ALREADY_PLAYING')
  })

  it('rejects a duplicate fixture without needing a rule of its own', () => {
    // "No duplicate in-progress fixture" falls out of "a team plays one match
    // at a time" -- this test exists to pin that, so the redundant rule is
    // never added back.
    const matches = [inProgress('Spain', 'Brazil')]

    expect(validateStartMatch(matches, 'Spain', 'Brazil')).toBe('TEAM_ALREADY_PLAYING')
  })

  it('allows a fixture to be replayed once the earlier one has finished', () => {
    expect(validateStartMatch([finished('Spain', 'Brazil')], 'Spain', 'Brazil')).toBeNull()
  })

  it('checks the teams before the roster, so a self-match is reported as such', () => {
    // Spain is in play and homeTeam === awayTeam. SAME_TEAM is the more
    // actionable message, so rule order matters and is asserted.
    expect(validateStartMatch([inProgress('Spain', 'Brazil')], 'Spain', 'Spain')).toBe('SAME_TEAM')
  })
})
