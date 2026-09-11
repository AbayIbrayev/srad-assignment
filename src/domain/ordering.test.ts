import { describe, expect, it } from 'vitest'

import type { FinishedMatch, InProgressMatch } from './match'
import {
  compareFinished,
  summariseFinished,
  summariseInProgress,
  totalGoals,
} from './ordering'

let nextSeq = 0

function inProgress(
  homeTeam: string,
  home: number,
  away: number,
  awayTeam: string,
): InProgressMatch {
  const seq = ++nextSeq
  return {
    id: `match-${seq}`,
    seq,
    homeTeam,
    awayTeam,
    score: { home, away },
    startedAt: 0,
    status: 'in_progress',
  }
}

function finish(match: InProgressMatch, finishedAt: number): FinishedMatch {
  return { ...match, status: 'finished', finishedAt }
}

/** Renders a match the way the brief writes them, so failures read like the spec. */
const asScoreline = (match: { homeTeam: string; awayTeam: string; score: { home: number; away: number } }) =>
  `${match.homeTeam} ${match.score.home} - ${match.score.away} ${match.awayTeam}`

describe('totalGoals', () => {
  it('sums both sides', () => {
    expect(totalGoals(inProgress('Spain', 10, 2, 'Brazil'))).toBe(12)
  })

  it('is zero for a goalless match', () => {
    expect(totalGoals(inProgress('Germany', 0, 0, 'France'))).toBe(0)
  })
})

describe('summariseInProgress — the brief\'s example scenario', () => {
  // Started in this order, with these scores, while still in progress.
  const started = () => [
    inProgress('Mexico', 0, 5, 'Canada'),
    inProgress('Spain', 10, 2, 'Brazil'),
    inProgress('Germany', 2, 2, 'France'),
    inProgress('Uruguay', 6, 6, 'Italy'),
    inProgress('Argentina', 3, 1, 'Australia'),
  ]

  const expected = [
    'Uruguay 6 - 6 Italy',
    'Spain 10 - 2 Brazil',
    'Mexico 0 - 5 Canada',
    'Argentina 3 - 1 Australia',
    'Germany 2 - 2 France',
  ]

  it('produces the documented ordering', () => {
    expect(summariseInProgress(started()).map(asScoreline)).toEqual(expected)
  })

  it('produces the same ordering whatever order the matches arrive in', () => {
    // Guards the rehydrate case: localStorage gives back an array whose order
    // is not guaranteed to be registration order, so the sort must not lean on
    // the input sequence or on Array.prototype.sort being stable.
    const shuffled = started().toReversed()

    expect(summariseInProgress(shuffled).map(asScoreline)).toEqual(expected)
  })

  it('does not mutate the array it is given', () => {
    const matches = started()
    const before = matches.map(asScoreline)

    summariseInProgress(matches)

    expect(matches.map(asScoreline)).toEqual(before)
  })
})

describe('summariseInProgress — ordering rules', () => {
  it('orders by total goals, highest first, regardless of which side scored', () => {
    const low = inProgress('Germany', 1, 0, 'France')
    const high = inProgress('Spain', 0, 4, 'Brazil')

    expect(summariseInProgress([low, high]).map(asScoreline)).toEqual([
      'Spain 0 - 4 Brazil',
      'Germany 1 - 0 France',
    ])
  })

  it('breaks a tie on total goals with the most recently started match', () => {
    const earlier = inProgress('Germany', 2, 2, 'France')
    const later = inProgress('Argentina', 3, 1, 'Australia')

    expect(totalGoals(earlier)).toBe(totalGoals(later))
    expect(summariseInProgress([earlier, later]).map(asScoreline)).toEqual([
      'Argentina 3 - 1 Australia',
      'Germany 2 - 2 France',
    ])
  })

  it('still orders goalless matches by most recently started', () => {
    const earlier = inProgress('Germany', 0, 0, 'France')
    const later = inProgress('Italy', 0, 0, 'Uruguay')

    expect(summariseInProgress([earlier, later]).map(asScoreline)).toEqual([
      'Italy 0 - 0 Uruguay',
      'Germany 0 - 0 France',
    ])
  })

  it('excludes finished matches', () => {
    // The finished match has the most goals, so it would top the summary if the
    // filter were missing.
    const live = inProgress('Germany', 1, 0, 'France')
    const done = finish(inProgress('Spain', 10, 2, 'Brazil'), 1_000)

    expect(summariseInProgress([live, done]).map(asScoreline)).toEqual([
      'Germany 1 - 0 France',
    ])
  })

  it('is empty when nothing is in progress', () => {
    expect(summariseInProgress([])).toEqual([])
    expect(summariseInProgress([finish(inProgress('Spain', 1, 0, 'Brazil'), 1_000)])).toEqual([])
  })
})

describe('summariseFinished', () => {
  it('orders by most recently finished first', () => {
    const first = finish(inProgress('Mexico', 0, 5, 'Canada'), 1_000)
    const second = finish(inProgress('Spain', 10, 2, 'Brazil'), 2_000)

    expect(summariseFinished([first, second]).map(asScoreline)).toEqual([
      'Spain 10 - 2 Brazil',
      'Mexico 0 - 5 Canada',
    ])
  })

  it('breaks a tie on finish time with the most recently started match', () => {
    const earlier = finish(inProgress('Germany', 2, 2, 'France'), 1_000)
    const later = finish(inProgress('Argentina', 3, 1, 'Australia'), 1_000)

    expect(compareFinished(earlier, later)).toBeGreaterThan(0)
    expect(summariseFinished([earlier, later]).map(asScoreline)).toEqual([
      'Argentina 3 - 1 Australia',
      'Germany 2 - 2 France',
    ])
  })

  it('excludes in-progress matches', () => {
    const live = inProgress('Germany', 1, 0, 'France')
    const done = finish(inProgress('Spain', 10, 2, 'Brazil'), 1_000)

    expect(summariseFinished([live, done]).map(asScoreline)).toEqual([
      'Spain 10 - 2 Brazil',
    ])
  })
})
