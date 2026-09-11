import type { MatchEvent, MatchEventId } from './events'

export type MatchId = string

export type Side = 'home' | 'away'

/** Goals scored by each side. */
export interface Score {
  home: number
  away: number
}

interface MatchBase {
  id: MatchId
  /**
   * Registration order, monotonically increasing across the scoreboard.
   *
   * This — not `startedAt` — is the authoritative tiebreak for the summary
   * ordering. Wall-clock timestamps collide within a millisecond, and their
   * relative order is not recoverable once state has been serialised to
   * localStorage and read back, because array order is all that survives and
   * nothing guarantees it. A sequence number survives serialisation intact,
   * so "tied on goals and on start time" is not a state this app can reach.
   */
  seq: number
  homeTeam: string
  awayTeam: string
  score: Score
  /** Wall clock, for display only. `seq` orders the summary. */
  startedAt: number
  /**
   * Everything that has happened to this match, oldest first.
   *
   * Kept on the match rather than in a separate log keyed by match id: the log
   * is only ever read alongside its match, and a finished match should carry
   * its own record rather than pointing at one that could be pruned
   * independently.
   */
  events: MatchEvent[]
}

export interface InProgressMatch extends MatchBase {
  status: 'in_progress'
  /**
   * The score as it was immediately before the most recent change, or `null`
   * when there is nothing to undo.
   *
   * Deliberately one snapshot and not a stack. The brief asks for "undo last
   * score change", singular, and a single step is what an operator correcting
   * a mis-click actually needs.
   *
   * `eventId` names the entry in `events` that undoing would revert, so the
   * `UNDO` entry can point at it rather than the log having to infer which
   * entry was meant.
   */
  lastChange: { score: Score; eventId: MatchEventId } | null
}

export interface FinishedMatch extends MatchBase {
  status: 'finished'
  finishedAt: number
}

/**
 * A discriminated union rather than a `status` field beside a nullable
 * `finishedAt`: a finished match always has a finish time and an in-progress
 * one never does, so the illegal combinations are unrepresentable instead of
 * merely unlikely.
 */
export type Match = InProgressMatch | FinishedMatch

export const isInProgress = (match: Match): match is InProgressMatch =>
  match.status === 'in_progress'

export const isFinished = (match: Match): match is FinishedMatch =>
  match.status === 'finished'
