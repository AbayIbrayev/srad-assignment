import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { DraftMatchEvent, MatchEvent, MatchEventId } from '@/domain/events'
import type { InProgressMatch, Match, MatchId, Score, Side } from '@/domain/match'
import { isInProgress } from '@/domain/match'
import type { StartMatchError } from '@/domain/validation'
import { validateStartMatch } from '@/domain/validation'

import { createSafePersistStorage } from './safe-persist-storage'

export const SCOREBOARD_STORAGE_KEY = 'srad-scoreboard'

/**
 * Bumped when the persisted shape changes in a way older state cannot satisfy.
 *
 * Version 2 added `lastChange` to in-progress matches for undo; version 3
 * added the event log. Migrating rather than discarding matters more than it
 * looks: an operator who reloads into a new build mid-matchday should not lose
 * the board they are watching.
 */
export const SCOREBOARD_STORAGE_VERSION = 3

/**
 * The clock and the id generator are injected rather than reached for, so the
 * store is deterministic under test without faking globals, and so `startedAt`
 * and `id` can be asserted on directly instead of matched against a pattern.
 */
export interface ScoreboardDeps {
  now: () => number
  /**
   * Two generators rather than one, because the store mints two kinds of
   * identifier. Production wires both to the same source; separating them
   * keeps a test's match ids from shifting every time an event is recorded.
   */
  matchId: () => MatchId
  eventId: () => MatchEventId
}

export interface PersistedScoreboard {
  /**
   * Keyed by id rather than an array: cards select their own match by id, and
   * an update touches one key instead of rebuilding a list. Ordering never
   * comes from this object — it comes from the summary selectors, which sort
   * by `seq`.
   */
  matches: Record<MatchId, Match>
  /** Next registration number. See `MatchBase.seq` for why this exists. */
  nextSeq: number
}

export type StartMatchResult =
  | { ok: true; id: MatchId }
  | { ok: false; error: StartMatchError }

export interface ScoreboardState extends PersistedScoreboard {
  /**
   * Returns the outcome instead of throwing: a rejected start is an expected
   * result of operator input, not an exceptional condition, and the caller
   * needs the reason to render it.
   */
  startMatch: (homeTeam: string, awayTeam: string) => StartMatchResult
  addGoal: (id: MatchId, side: Side) => void
  /** No-op at zero. The UI disables the control; this is the backstop. */
  removeGoal: (id: MatchId, side: Side) => void
  /**
   * Reverts the most recent score change on a match, whether that was a goal
   * or a goal removed, and then has nothing left to revert. No-op when there
   * is nothing to undo, and never applies to a finished match.
   */
  undoLastChange: (id: MatchId) => void
  finishMatch: (id: MatchId) => void
}

const isScore = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  Number.isFinite((value as { home: unknown }).home) &&
  Number.isFinite((value as { away: unknown }).away)

const isMatch = (value: unknown): value is Match => {
  if (typeof value !== 'object' || value === null) return false
  const match = value as Partial<Match>

  const shapeIsSound =
    typeof match.id === 'string' &&
    Number.isFinite(match.seq) &&
    typeof match.homeTeam === 'string' &&
    typeof match.awayTeam === 'string' &&
    Number.isFinite(match.startedAt) &&
    isScore(match.score)

  if (!shapeIsSound) return false
  // `events` may be absent: version 2 predates the log, and this guard runs
  // before the version gate. See the note on `lastChange` below.
  if (match.events !== undefined && !Array.isArray(match.events)) return false
  if (match.status === 'in_progress') {
    // `lastChange` may be absent, or be a bare score written by version 2:
    // this guard runs *before* zustand's version gate, so rejecting
    // older-but-recoverable state here would make the migrations unreachable.
    return true
  }
  return match.status === 'finished' && Number.isFinite(match.finishedAt)
}

/**
 * Guards rehydration. Anything that fails this is discarded and the app starts
 * empty rather than rendering from a shape the selectors do not expect.
 */
export const isPersistedScoreboard = (value: unknown): value is PersistedScoreboard => {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Partial<PersistedScoreboard>

  if (!Number.isFinite(state.nextSeq)) return false
  if (typeof state.matches !== 'object' || state.matches === null) return false

  return Object.values(state.matches).every(isMatch)
}

export function createScoreboardStore(deps: ScoreboardDeps) {
  return create<ScoreboardState>()(
    persist(
      (set, get) => {
        const record = (event: DraftMatchEvent): MatchEvent =>
          ({ id: deps.eventId(), at: deps.now(), ...event }) as MatchEvent

        /**
         * Every score change funnels through here, so "a finished match is
         * immutable" is enforced in one place rather than repeated at each
         * call site and eventually forgotten at one of them.
         */
        const updateInProgress = (
          id: MatchId,
          change: (match: InProgressMatch) => Match,
        ): void => {
          const match = get().matches[id]
          if (!match || !isInProgress(match)) return

          const updated = change(match)
          if (updated === match) return

          set((state) => ({ matches: { ...state.matches, [id]: updated } }))
        }

        /** One place where a score change becomes both a new score and a log entry. */
        const scored = (
          match: InProgressMatch,
          score: Score,
          kind: 'GOAL' | 'GOAL_REMOVED',
          side: Side,
        ): InProgressMatch => {
          const event = record({ kind, side, score })
          return {
            ...match,
            score,
            lastChange: { score: match.score, eventId: event.id },
            events: [...match.events, event],
          }
        }

        return {
          matches: {},
          nextSeq: 1,

          startMatch: (homeTeam, awayTeam) => {
            const state = get()
            const error = validateStartMatch(Object.values(state.matches), homeTeam, awayTeam)
            if (error) return { ok: false, error }

            const id = deps.matchId()
            const startedAt = deps.now()
            const match: InProgressMatch = {
              id,
              seq: state.nextSeq,
              homeTeam,
              awayTeam,
              score: { home: 0, away: 0 },
              startedAt,
              status: 'in_progress',
              lastChange: null,
              events: [],
            }

            match.events.push({
              id: deps.eventId(),
              at: startedAt,
              score: match.score,
              kind: 'MATCH_STARTED',
            })

            set({
              matches: { ...state.matches, [id]: match },
              nextSeq: state.nextSeq + 1,
            })

            return { ok: true, id }
          },

          addGoal: (id, side) =>
            updateInProgress(id, (match) =>
              scored(match, { ...match.score, [side]: match.score[side] + 1 }, 'GOAL', side),
            ),

          removeGoal: (id, side) =>
            updateInProgress(id, (match) =>
              match.score[side] === 0
                ? match
                : scored(
                    match,
                    { ...match.score, [side]: match.score[side] - 1 },
                    'GOAL_REMOVED',
                    side,
                  ),
            ),

          undoLastChange: (id) =>
            updateInProgress(id, (match) => {
              // Falsy rather than `=== null`: hand-edited storage can leave the
              // field absent, and restoring `undefined` as a score would be
              // worse than doing nothing.
              if (!match.lastChange) return match

              const { score, eventId } = match.lastChange
              return {
                ...match,
                score,
                lastChange: null,
                // Appended, never subtracted. Deleting the mistaken entry would
                // leave a log that cannot be told apart from one where the
                // mistake never happened, which is the opposite of an audit
                // trail.
                events: [
                  ...match.events,
                  record({ kind: 'UNDO', revertedEventId: eventId, score }),
                ],
              }
            }),

          finishMatch: (id) =>
            updateInProgress(id, ({ lastChange: _undoable, ...match }) => ({
              ...match,
              status: 'finished',
              finishedAt: deps.now(),
              events: [...match.events, record({ kind: 'MATCH_FINISHED', score: match.score })],
            })),
        }
      },
      {
        name: SCOREBOARD_STORAGE_KEY,
        version: SCOREBOARD_STORAGE_VERSION,
        storage: createSafePersistStorage<PersistedScoreboard>(
          () => globalThis.localStorage,
          isPersistedScoreboard,
        ),
        partialize: ({ matches, nextSeq }) => ({ matches, nextSeq }),
        migrate: (persisted, version) => {
          const state = persisted as PersistedScoreboard

          if (version >= SCOREBOARD_STORAGE_VERSION) return state

          // v1 predates undo and v2 predates the event log. Rather than
          // dropping the operator's board on upgrade, bring each match forward:
          // nothing to undo (there is no logged entry an UNDO could name), and
          // a log seeded with the one event that can be reconstructed
          // truthfully -- when the match started. Goals scored before the
          // upgrade are absent because they were never recorded, which is the
          // honest result.
          return {
            ...state,
            matches: Object.fromEntries(
              Object.entries(state.matches).map(([id, match]) => [
                id,
                {
                  ...match,
                  ...(match.status === 'in_progress' ? { lastChange: null } : {}),
                  events: Array.isArray(match.events)
                    ? match.events
                    : [
                        {
                          id: `${id}-migrated-start`,
                          at: match.startedAt,
                          score: { home: 0, away: 0 },
                          kind: 'MATCH_STARTED' as const,
                        },
                      ],
                },
              ]),
            ),
          }
        },
      },
    ),
  )
}

/**
 * `crypto.randomUUID` is unavailable outside a secure context, which includes
 * hitting the dev server from a phone on the LAN — exactly what someone does
 * to check the responsive layout. The fallback keeps that working; ids are
 * local identifiers, not security material.
 */
const randomId = (): MatchId =>
  globalThis.crypto?.randomUUID?.() ?? `match-${Date.now()}-${Math.random().toString(36).slice(2)}`

export const useScoreboardStore = createScoreboardStore({
  now: () => Date.now(),
  matchId: randomId,
  eventId: randomId,
})
