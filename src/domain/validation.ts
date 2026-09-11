import type { Match } from './match'
import { isInProgress } from './match'

/**
 * Why a match cannot be started. Codes rather than sentences, so the wording
 * lives with the UI that renders it and the rules stay testable without
 * asserting on prose.
 */
export type StartMatchError = 'SAME_TEAM' | 'TEAM_ALREADY_PLAYING'

/**
 * Teams currently occupied by an in-progress match.
 *
 * Exported because the picker needs it too: a team that cannot be chosen is
 * disabled at the point of choice rather than accepted and then rejected on
 * submit, which is the difference between a rule the operator can see and a
 * rule that just says no.
 */
export const teamsInPlay = (matches: readonly Match[]): ReadonlySet<string> =>
  new Set(matches.filter(isInProgress).flatMap((match) => [match.homeTeam, match.awayTeam]))

/**
 * A team plays one match at a time, so "no duplicate in-progress fixture" needs
 * no rule of its own — starting Spain vs Brazil twice is already blocked by
 * Spain being in play. One rule, two guarantees.
 *
 * Finished matches deliberately do not occupy a team: a squad that has played
 * and finished is free to appear in a later fixture.
 */
export const validateStartMatch = (
  matches: readonly Match[],
  homeTeam: string,
  awayTeam: string,
): StartMatchError | null => {
  if (homeTeam === awayTeam) return 'SAME_TEAM'

  const inPlay = teamsInPlay(matches)
  if (inPlay.has(homeTeam) || inPlay.has(awayTeam)) return 'TEAM_ALREADY_PLAYING'

  return null
}
