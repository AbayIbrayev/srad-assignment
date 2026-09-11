import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import type { MatchId } from '@/domain/match'
import { isFinished } from '@/domain/match'
import { totalGoals } from '@/domain/ordering'
import { useMatch } from '@/store/selectors'

import { EventLog } from './EventLog'
import { goalCount, teamOf } from './match-text'
import { TeamName, TimeAt } from './Scoreline'

/**
 * Read-only by construction: there are no controls to disable, because a
 * finished match is immutable rather than merely locked.
 */
export function FinishedMatchCard({ id }: { id: MatchId }) {
  const match = useMatch(id)
  if (!match || !isFinished(match)) return null

  return (
    <Card className="gap-3 bg-muted/40">
      <CardHeader className="gap-1">
        <h3 className="font-heading text-base leading-snug font-medium">
          {match.homeTeam} vs {match.awayTeam}
        </h3>
        <CardDescription>
          Final · {goalCount(totalGoals(match))} · finished <TimeAt at={match.finishedAt} />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {(['home', 'away'] as const).map((side) => (
          <div key={side} className="flex items-center justify-between gap-3">
            <TeamName team={teamOf(match, side)} />
            <span className="w-6 text-right font-semibold tabular-nums">{match.score[side]}</span>
          </div>
        ))}

        {/* The record outlives the match: a finished match keeps its log. */}
        <EventLog match={match} />
      </CardContent>
    </Card>
  )
}
