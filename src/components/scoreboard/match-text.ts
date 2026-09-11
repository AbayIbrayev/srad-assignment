import type { Match, Side } from '@/domain/match'

export const teamOf = (match: Match, side: Side): string =>
  side === 'home' ? match.homeTeam : match.awayTeam

/** "Spain 2 - 1 Brazil", for announcements and accessible names. */
export const scoreline = (match: Match): string =>
  `${match.homeTeam} ${match.score.home} - ${match.score.away} ${match.awayTeam}`

export const fixture = (match: Match): string => `${match.homeTeam} versus ${match.awayTeam}`

export const goalCount = (goals: number): string => `${goals} ${goals === 1 ? 'goal' : 'goals'}`
