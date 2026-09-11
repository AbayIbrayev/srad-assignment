import { beforeEach, describe, expect, it } from 'vitest'

import { isFinished, isInProgress } from '@/domain/match'
import { summariseInProgress } from '@/domain/ordering'

import {
  SCOREBOARD_STORAGE_KEY,
  SCOREBOARD_STORAGE_VERSION,
  createScoreboardStore,
  isPersistedScoreboard,
} from './scoreboard'

/**
 * A clock that advances a fixed step per read and ids that count up, so every
 * assertion below can name the exact value it expects rather than matching a
 * pattern or reaching for fake timers.
 */
function deterministicDeps(startAt = 1_000) {
  let clock = startAt
  let ids = 0
  return {
    now: () => (clock += 100),
    id: () => `match-${++ids}`,
  }
}

const newStore = (startAt?: number) => createScoreboardStore(deterministicDeps(startAt))

beforeEach(() => {
  localStorage.clear()
})

describe('startMatch', () => {
  it('registers a goalless in-progress match', () => {
    const store = newStore()

    const result = store.getState().startMatch('Spain', 'Brazil')

    expect(result).toEqual({ ok: true, id: 'match-1' })
    expect(store.getState().matches['match-1']).toEqual({
      id: 'match-1',
      seq: 1,
      homeTeam: 'Spain',
      awayTeam: 'Brazil',
      score: { home: 0, away: 0 },
      startedAt: 1_100,
      status: 'in_progress',
      lastChange: null,
    })
  })

  it('hands out registration numbers in order', () => {
    const store = newStore()

    store.getState().startMatch('Spain', 'Brazil')
    store.getState().startMatch('Italy', 'Uruguay')

    expect(store.getState().matches['match-1'].seq).toBe(1)
    expect(store.getState().matches['match-2'].seq).toBe(2)
    expect(store.getState().nextSeq).toBe(3)
  })

  it('never reuses a registration number after a match finishes', () => {
    // Reuse would make the summary tiebreak ambiguous, since `seq` is what
    // "most recently started" means here.
    const store = newStore()

    store.getState().startMatch('Spain', 'Brazil')
    store.getState().finishMatch('match-1')
    store.getState().startMatch('Italy', 'Uruguay')

    expect(store.getState().matches['match-2'].seq).toBe(2)
  })

  it('rejects a team playing itself and changes nothing', () => {
    const store = newStore()
    const before = store.getState().matches

    expect(store.getState().startMatch('Spain', 'Spain')).toEqual({
      ok: false,
      error: 'SAME_TEAM',
    })
    expect(store.getState().matches).toBe(before)
    expect(store.getState().nextSeq).toBe(1)
  })

  it('rejects a team already in an in-progress match and changes nothing', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    const before = store.getState().matches

    expect(store.getState().startMatch('Italy', 'Spain')).toEqual({
      ok: false,
      error: 'TEAM_ALREADY_PLAYING',
    })
    expect(store.getState().matches).toBe(before)
    expect(store.getState().nextSeq).toBe(2)
  })

  it('frees a team once its match has finished', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().finishMatch('match-1')

    expect(store.getState().startMatch('Spain', 'Italy')).toEqual({ ok: true, id: 'match-2' })
  })
})

describe('addGoal', () => {
  it('adds a goal to the named side only', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')

    store.getState().addGoal('match-1', 'home')
    store.getState().addGoal('match-1', 'home')
    store.getState().addGoal('match-1', 'away')

    expect(store.getState().matches['match-1'].score).toEqual({ home: 2, away: 1 })
  })

  it('leaves a finished match untouched', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().addGoal('match-1', 'home')
    store.getState().finishMatch('match-1')

    store.getState().addGoal('match-1', 'home')

    expect(store.getState().matches['match-1'].score).toEqual({ home: 1, away: 0 })
  })

  it('ignores an unknown match', () => {
    const store = newStore()
    const before = store.getState().matches

    expect(() => store.getState().addGoal('nope', 'home')).not.toThrow()
    expect(store.getState().matches).toBe(before)
  })
})

describe('removeGoal', () => {
  it('takes a goal off the named side only', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().addGoal('match-1', 'home')
    store.getState().addGoal('match-1', 'away')

    store.getState().removeGoal('match-1', 'home')

    expect(store.getState().matches['match-1'].score).toEqual({ home: 0, away: 1 })
  })

  it('will not take a score below zero, and writes nothing when it would', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    const before = store.getState().matches

    store.getState().removeGoal('match-1', 'home')

    expect(store.getState().matches['match-1'].score).toEqual({ home: 0, away: 0 })
    // Identity, not equality: a no-op that still replaces state would re-render
    // every subscriber for nothing.
    expect(store.getState().matches).toBe(before)
  })

  it('leaves a finished match untouched', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().addGoal('match-1', 'home')
    store.getState().finishMatch('match-1')

    store.getState().removeGoal('match-1', 'home')

    expect(store.getState().matches['match-1'].score).toEqual({ home: 1, away: 0 })
  })
})

describe('undoLastChange', () => {
  it('has nothing to undo on a freshly started match', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    const before = store.getState().matches

    store.getState().undoLastChange('match-1')

    expect(store.getState().matches).toBe(before)
  })

  it('takes back a goal', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().addGoal('match-1', 'home')

    store.getState().undoLastChange('match-1')

    expect(store.getState().matches['match-1'].score).toEqual({ home: 0, away: 0 })
  })

  it('puts back a goal that was removed', () => {
    // Undo reverts the last score change of either kind, not only additions.
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().addGoal('match-1', 'home')
    store.getState().removeGoal('match-1', 'home')

    store.getState().undoLastChange('match-1')

    expect(store.getState().matches['match-1'].score).toEqual({ home: 1, away: 0 })
  })

  it('goes back one step only, and then has nothing left to undo', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().addGoal('match-1', 'home')
    store.getState().addGoal('match-1', 'home')

    store.getState().undoLastChange('match-1')
    expect(store.getState().matches['match-1'].score).toEqual({ home: 1, away: 0 })

    const afterUndo = store.getState().matches
    store.getState().undoLastChange('match-1')

    expect(store.getState().matches['match-1'].score).toEqual({ home: 1, away: 0 })
    expect(store.getState().matches).toBe(afterUndo)
  })

  it('is armed again by the next change', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().addGoal('match-1', 'home')
    store.getState().undoLastChange('match-1')
    store.getState().addGoal('match-1', 'away')

    store.getState().undoLastChange('match-1')

    expect(store.getState().matches['match-1'].score).toEqual({ home: 0, away: 0 })
  })

  it('is not armed by a removal that did nothing', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().addGoal('match-1', 'home')
    store.getState().removeGoal('match-1', 'away') // already zero

    store.getState().undoLastChange('match-1')

    // The goal is taken back, not the removal that never happened.
    expect(store.getState().matches['match-1'].score).toEqual({ home: 0, away: 0 })
  })

  it('cannot reach a finished match', () => {
    // Finishing is terminal, so the last score change before it stays final.
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().addGoal('match-1', 'home')
    store.getState().finishMatch('match-1')

    store.getState().undoLastChange('match-1')

    expect(store.getState().matches['match-1'].score).toEqual({ home: 1, away: 0 })
  })

  it('does not persist an undo history onto a finished match', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().addGoal('match-1', 'home')
    store.getState().finishMatch('match-1')

    expect(store.getState().matches['match-1']).not.toHaveProperty('lastChange')
  })

  it('ignores an unknown match', () => {
    const store = newStore()

    expect(() => store.getState().undoLastChange('nope')).not.toThrow()
  })

  it('survives a reload', () => {
    const first = newStore()
    first.getState().startMatch('Spain', 'Brazil')
    first.getState().addGoal('match-1', 'home')

    const second = newStore()
    second.getState().undoLastChange('match-1')

    expect(second.getState().matches['match-1'].score).toEqual({ home: 0, away: 0 })
  })
})

describe('finishMatch', () => {
  it('marks the match finished and stamps the finish time', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')

    store.getState().finishMatch('match-1')

    const match = store.getState().matches['match-1']
    expect(isFinished(match)).toBe(true)
    expect(match).toMatchObject({ status: 'finished', finishedAt: 1_200 })
  })

  it('is terminal — finishing again does not restamp the finish time', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().finishMatch('match-1')
    const finishedAt = store.getState().matches['match-1']

    store.getState().finishMatch('match-1')

    expect(store.getState().matches['match-1']).toBe(finishedAt)
  })

  it('removes the match from the in-progress summary', () => {
    const store = newStore()
    store.getState().startMatch('Spain', 'Brazil')
    store.getState().startMatch('Italy', 'Uruguay')

    store.getState().finishMatch('match-1')

    const live = summariseInProgress(Object.values(store.getState().matches))
    expect(live.map((match) => match.id)).toEqual(['match-2'])
    expect(live.every(isInProgress)).toBe(true)
  })

  it('ignores an unknown match', () => {
    const store = newStore()
    const before = store.getState().matches

    expect(() => store.getState().finishMatch('nope')).not.toThrow()
    expect(store.getState().matches).toBe(before)
  })
})

describe('persistence', () => {
  it('restores matches and the registration counter into a fresh store', () => {
    const first = newStore()
    first.getState().startMatch('Spain', 'Brazil')
    first.getState().addGoal('match-1', 'home')

    const second = newStore()

    expect(second.getState().matches['match-1'].score).toEqual({ home: 1, away: 0 })
    expect(second.getState().nextSeq).toBe(2)
  })

  it('keeps validation working against restored state', () => {
    // The rehydrated match has to be visible to the rules, not just renderable.
    const first = newStore()
    first.getState().startMatch('Spain', 'Brazil')

    const second = newStore()

    expect(second.getState().startMatch('Spain', 'Italy')).toEqual({
      ok: false,
      error: 'TEAM_ALREADY_PLAYING',
    })
  })

  it('starts empty and clears the key when stored state is unparseable', () => {
    localStorage.setItem(SCOREBOARD_STORAGE_KEY, '{"state":{"matches":{')

    const store = newStore()

    expect(store.getState().matches).toEqual({})
    expect(store.getState().nextSeq).toBe(1)
    expect(localStorage.getItem(SCOREBOARD_STORAGE_KEY)).toBeNull()
  })

  it('starts empty when stored state is parseable but malformed', () => {
    localStorage.setItem(
      SCOREBOARD_STORAGE_KEY,
      JSON.stringify({
        state: { matches: { 'match-1': { id: 'match-1', status: 'in_progress' } }, nextSeq: 2 },
        version: SCOREBOARD_STORAGE_VERSION,
      }),
    )

    const store = newStore()

    expect(store.getState().matches).toEqual({})
  })

  it('migrates state written before undo existed, rather than dropping it', () => {
    // An operator who reloads into a new build mid-matchday should not lose the
    // board they are watching.
    localStorage.setItem(
      SCOREBOARD_STORAGE_KEY,
      JSON.stringify({
        state: {
          matches: {
            'match-1': {
              id: 'match-1',
              seq: 1,
              homeTeam: 'Spain',
              awayTeam: 'Brazil',
              score: { home: 1, away: 0 },
              startedAt: 1_000,
              status: 'in_progress',
            },
          },
          nextSeq: 2,
        },
        version: 1,
      }),
    )

    const store = newStore()
    const restored = store.getState().matches['match-1']

    expect(restored).toMatchObject({ homeTeam: 'Spain', score: { home: 1, away: 0 } })
    // Nothing to undo: the change that produced this score happened in a build
    // that was not recording it.
    expect(isInProgress(restored) && restored.lastChange).toBeNull()

    store.getState().undoLastChange('match-1')
    expect(store.getState().matches['match-1'].score).toEqual({ home: 1, away: 0 })
  })

  it('still starts, and is still usable, after discarding corrupt state', () => {
    // The point of discarding rather than throwing: the operator gets a working
    // scoreboard, not a blank screen they cannot clear without devtools.
    localStorage.setItem(SCOREBOARD_STORAGE_KEY, 'not json at all')

    const store = newStore()

    expect(store.getState().startMatch('Spain', 'Brazil')).toEqual({ ok: true, id: 'match-1' })
  })
})

describe('isPersistedScoreboard', () => {
  const match = {
    id: 'match-1',
    seq: 1,
    homeTeam: 'Spain',
    awayTeam: 'Brazil',
    score: { home: 1, away: 0 },
    startedAt: 1_000,
    status: 'in_progress',
    lastChange: null,
  }

  it('accepts an empty scoreboard', () => {
    expect(isPersistedScoreboard({ matches: {}, nextSeq: 1 })).toBe(true)
  })

  it('accepts in-progress and finished matches', () => {
    expect(
      isPersistedScoreboard({
        matches: { a: match, b: { ...match, status: 'finished', finishedAt: 2_000 } },
        nextSeq: 3,
      }),
    ).toBe(true)
  })

  it.each([
    ['not an object', null],
    ['a missing counter', { matches: {} }],
    ['a non-numeric counter', { matches: {}, nextSeq: '1' }],
    ['missing matches', { nextSeq: 1 }],
    ['a match missing its score', { matches: { a: { ...match, score: undefined } }, nextSeq: 2 }],
    ['a match with a non-numeric score', { matches: { a: { ...match, score: { home: '1', away: 0 } } }, nextSeq: 2 }],
    ['an unknown status', { matches: { a: { ...match, status: 'paused' } }, nextSeq: 2 }],
    ['a finished match with no finish time', { matches: { a: { ...match, status: 'finished' } } , nextSeq: 2 }],
  ])('rejects %s', (_label, value) => {
    expect(isPersistedScoreboard(value)).toBe(false)
  })
})
