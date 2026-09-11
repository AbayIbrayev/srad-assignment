import { useState } from 'react'

import { useAnnouncer } from '@/a11y/announcer-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import type { MatchId, Side } from '@/domain/match'
import { isInProgress } from '@/domain/match'
import { totalGoals } from '@/domain/ordering'
import { useScoreboardStore } from '@/store/scoreboard'
import { useMatch } from '@/store/selectors'

import { FinishMatchDialog } from './FinishMatchDialog'
import { fixture, goalCount, scoreline, teamOf } from './match-text'
import { TeamName, TimeAt } from './Scoreline'

const SIDES: readonly Side[] = ['home', 'away']

/**
 * Subscribes to its own match by id rather than being handed one, so a score
 * change re-renders the card it happened on and leaves the rest of the board
 * alone. See `useInProgressIds` for the other half of that arrangement.
 */
export function MatchCard({
  id,
  rank,
  onFinished,
}: {
  id: MatchId
  rank: number
  onFinished: (id: MatchId) => void
}) {
  const match = useMatch(id)
  const addGoal = useScoreboardStore((state) => state.addGoal)
  const removeGoal = useScoreboardStore((state) => state.removeGoal)
  const finishMatch = useScoreboardStore((state) => state.finishMatch)
  const announce = useAnnouncer()
  const [confirming, setConfirming] = useState(false)

  // The board renders ids taken from the summary, so a match that has just been
  // finished can briefly be listed while no longer being in progress.
  if (!match || !isInProgress(match)) return null

  const goals = totalGoals(match)

  /**
   * The score is read back from the store rather than predicted, so the
   * announcement can never disagree with what is on screen.
   */
  const announceScore = () => {
    const updated = useScoreboardStore.getState().matches[match.id]
    if (updated) announce(scoreline(updated))
  }

  const handleFinish = () => {
    finishMatch(match.id)
    setConfirming(false)
    announce(`Match finished. ${scoreline(match)}.`)
    onFinished(match.id)
  }

  return (
    <Card className="gap-3">
      <CardHeader className="gap-1">
        <Badge variant="secondary" aria-label={`Position ${rank} in the summary`}>
          #{rank}
        </Badge>
        {/*
          A real heading rather than the vendored CardTitle, which is a styled
          `div`. Headings are how a screen reader user moves through a list of
          cards; `aria-labelledby` on a element with no role announces nothing.
        */}
        <h3 className="font-heading text-base leading-snug font-medium">
          {match.homeTeam} vs {match.awayTeam}
        </h3>
        <CardDescription>
          {goalCount(goals)} · started <TimeAt at={match.startedAt} />
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {SIDES.map((side) => {
          const team = teamOf(match, side)
          const score = match.score[side]

          return (
            <div key={side} className="flex items-center justify-between gap-3">
              <TeamName team={team} />
              <div className="flex shrink-0 items-center gap-1">
                <span className="w-6 text-right font-semibold tabular-nums">{score}</span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Remove a goal from ${team}`}
                  disabled={score === 0}
                  onClick={() => {
                    removeGoal(match.id, side)
                    announceScore()
                  }}
                >
                  −
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Add a goal for ${team}`}
                  onClick={() => {
                    addGoal(match.id, side)
                    announceScore()
                  }}
                >
                  +
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>

      <CardFooter>
        <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
          Finish match
          <span className="sr-only">: {fixture(match)}</span>
        </Button>
      </CardFooter>

      <FinishMatchDialog
        match={match}
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={handleFinish}
      />
    </Card>
  )
}
