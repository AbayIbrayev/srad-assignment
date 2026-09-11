import type { FinishedMatch, InProgressMatch, Match } from './match'
import { isFinished, isInProgress } from './match'

export const totalGoals = (match: Match): number => match.score.home + match.score.away

/**
 * The brief's summary rule: "Total goals (home + away), highest first. If tied
 * on total goals → most recently started match first."
 *
 * "Most recently started" is read as most recently *registered*: `seq`
 * descending. See the note on `MatchBase.seq` for why not `startedAt`.
 */
export const compareInProgress = (a: Match, b: Match): number =>
  totalGoals(b) - totalGoals(a) || b.seq - a.seq

/**
 * The brief does not specify an order for finished matches, so this is a
 * documented choice: most recently finished first, which keeps the freshest
 * results nearest the in-progress summary. `seq` breaks the tie so the order
 * stays total even if two matches are finished within the same millisecond.
 */
export const compareFinished = (a: FinishedMatch, b: FinishedMatch): number =>
  b.finishedAt - a.finishedAt || b.seq - a.seq

/**
 * The "matches in progress" summary. Finished matches are filtered out here
 * rather than at the call site, so there is exactly one place that can get the
 * brief's "finished matches must not appear" rule wrong.
 */
export const summariseInProgress = (matches: readonly Match[]): InProgressMatch[] =>
  matches.filter(isInProgress).toSorted(compareInProgress)

export const summariseFinished = (matches: readonly Match[]): FinishedMatch[] =>
  matches.filter(isFinished).toSorted(compareFinished)
