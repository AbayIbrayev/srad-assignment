import { useShallow } from 'zustand/react/shallow'

import type { Match, MatchId } from '@/domain/match'
import { summariseFinished, summariseInProgress } from '@/domain/ordering'

import type { ScoreboardState } from './scoreboard'
import { useScoreboardStore } from './scoreboard'

const allMatches = (state: ScoreboardState): Match[] => Object.values(state.matches)

/**
 * Summaries hand back ids, not matches.
 *
 * A card subscribes to its own match and re-renders when that match changes;
 * the container subscribes only to the ranked list of ids and re-renders when
 * the *order* changes. Adding a goal that does not move a match therefore
 * re-renders one card rather than the whole board.
 *
 * At six concurrent matches this saves nothing measurable, and it is not
 * claimed as a performance decision — it is here because it makes the data
 * flow say what it means: the board owns the order, a card owns its match.
 */
export const useInProgressIds = (): MatchId[] =>
  useScoreboardStore(useShallow((state) => summariseInProgress(allMatches(state)).map(byId)))

export const useFinishedIds = (): MatchId[] =>
  useScoreboardStore(useShallow((state) => summariseFinished(allMatches(state)).map(byId)))

export const useMatch = (id: MatchId): Match | undefined =>
  useScoreboardStore((state) => state.matches[id])

/** Teams occupied by an in-progress match, for disabling them in the picker. */
export const useTeamsInPlay = (): ReadonlySet<string> =>
  useScoreboardStore(
    useShallow(
      (state) =>
        new Set(
          summariseInProgress(allMatches(state)).flatMap((match) => [
            match.homeTeam,
            match.awayTeam,
          ]),
        ),
    ),
  )

const byId = (match: Match): MatchId => match.id
