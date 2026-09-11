import { describe, expect, it } from 'vitest'

import { TEAMS, flagFor } from './teams'

describe('TEAMS', () => {
  it('contains every team from the brief\'s example scenario', () => {
    // Without these ten, the documented ordering cannot be reproduced by hand
    // in the running app.
    const required = [
      'Mexico',
      'Canada',
      'Spain',
      'Brazil',
      'Germany',
      'France',
      'Uruguay',
      'Italy',
      'Argentina',
      'Australia',
    ]

    expect(TEAMS.map((team) => team.name)).toEqual(expect.arrayContaining(required))
  })

  it('has no duplicate names', () => {
    const names = TEAMS.map((team) => team.name)

    expect(new Set(names).size).toBe(names.length)
  })

  it('is listed alphabetically, so the picker needs no sorting of its own', () => {
    const names = TEAMS.map((team) => team.name)

    expect(names).toEqual(names.toSorted())
  })

  it('gives every team a distinct two-codepoint regional indicator flag', () => {
    const flags = TEAMS.map((team) => team.flag)

    for (const flag of flags) {
      // Regional indicator symbols occupy U+1F1E6..U+1F1FF; a country flag is
      // exactly two of them. A stray ASCII letter or a single indicator would
      // render as text rather than a flag.
      expect([...flag]).toHaveLength(2)
      expect(flag).toMatch(/^[\u{1F1E6}-\u{1F1FF}]{2}$/u)
    }

    expect(new Set(flags).size).toBe(flags.length)
  })
})

describe('flagFor', () => {
  it('resolves a flag for every team on the roster', () => {
    for (const team of TEAMS) {
      expect(flagFor(team.name)).toBe(team.flag)
    }
  })

  it('returns undefined for a name that is not on the roster', () => {
    // A match persisted under an older roster should render its team name
    // plainly rather than borrowing another country's flag.
    expect(flagFor('Atlantis')).toBeUndefined()
    expect(flagFor('')).toBeUndefined()
  })
})
