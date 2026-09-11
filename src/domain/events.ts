import type { Score, Side } from './match'

export type MatchEventId = string

interface MatchEventBase {
  id: MatchEventId
  /** Wall clock. The array's order is what establishes sequence. */
  at: number
  /** The score as it stood immediately after this event. */
  score: Score
}

/**
 * What happened to a match, in the order it happened.
 *
 * `GOAL_REMOVED` and `UNDO` are separate kinds on purpose, and the distinction
 * is the point of the log rather than an implementation detail:
 *
 * - `GOAL_REMOVED` asserts the score is genuinely lower. The goal was
 *   disallowed, overturned on review, or awarded to the wrong side. It is a
 *   real match event and stays in the record as one.
 * - `UNDO` asserts the previous entry was a data-entry error, and names the
 *   entry it reverted.
 *
 * The arithmetic is identical; the claim about what happened in the world is
 * not, and an operator's audit trail has to be able to tell them apart.
 */
export type MatchEvent =
  | (MatchEventBase & { kind: 'MATCH_STARTED' })
  | (MatchEventBase & { kind: 'GOAL'; side: Side })
  | (MatchEventBase & { kind: 'GOAL_REMOVED'; side: Side })
  | (MatchEventBase & { kind: 'UNDO'; revertedEventId: MatchEventId })
  | (MatchEventBase & { kind: 'MATCH_FINISHED' })

export type MatchEventKind = MatchEvent['kind']

/**
 * An event before it is recorded. `Omit` is applied across each member rather
 * than to the union as a whole, which would collapse it to the fields every
 * member shares and lose `side` and `revertedEventId`.
 */
export type DraftMatchEvent = MatchEvent extends infer Member
  ? Member extends MatchEvent
    ? Omit<Member, 'id' | 'at'>
    : never
  : never

/**
 * Kinds `undo` is allowed to revert. `MATCH_FINISHED` is deliberately absent:
 * finishing is terminal. Keeping this as a list rather than a condition buried
 * in the store means adding a new undoable kind is a visible decision.
 */
const UNDOABLE: readonly MatchEventKind[] = ['GOAL', 'GOAL_REMOVED']

export const isUndoable = (event: MatchEvent): boolean => UNDOABLE.includes(event.kind)
