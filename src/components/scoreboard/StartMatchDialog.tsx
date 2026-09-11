import { useState } from 'react'

import { useAnnouncer } from '@/a11y/announcer-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TEAMS } from '@/domain/teams'
import type { StartMatchError } from '@/domain/validation'
import { useScoreboardStore } from '@/store/scoreboard'
import { useTeamsInPlay } from '@/store/selectors'

/**
 * Wording lives here rather than in the domain, so the rules stay testable
 * without asserting on prose and the prose can change without touching them.
 */
const ERROR_MESSAGE: Record<StartMatchError, string> = {
  SAME_TEAM: 'A team cannot play itself. Choose two different teams.',
  TEAM_ALREADY_PLAYING:
    'That team is already in a match that has not finished. Finish it first, or choose another team.',
}

export function StartMatchDialog() {
  const [open, setOpen] = useState(false)
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [error, setError] = useState<StartMatchError | null>(null)

  const startMatch = useScoreboardStore((state) => state.startMatch)
  const teamsInPlay = useTeamsInPlay()
  const announce = useAnnouncer()

  const close = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setHomeTeam('')
      setAwayTeam('')
      setError(null)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const result = startMatch(homeTeam, awayTeam)
    if (!result.ok) {
      setError(result.error)
      return
    }

    announce(`Match started. ${homeTeam} versus ${awayTeam}.`)
    close(false)
  }

  /**
   * A team already in play is disabled at the point of choice rather than
   * accepted and then rejected on submit — the difference between a rule the
   * operator can see and a rule that just says no. The submit-time check stays
   * as the backstop, because the two selects can still disagree.
   */
  const unavailable = (team: string, opposite: string) =>
    teamsInPlay.has(team) || team === opposite

  const picker = (
    side: 'home' | 'away',
    label: string,
    value: string,
    opposite: string,
    onChange: (team: string) => void,
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${side}-team`}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={`${side}-team`} className="w-full">
          <SelectValue placeholder="Choose a team" />
        </SelectTrigger>
        <SelectContent>
          {TEAMS.map((team) => {
            const blocked = unavailable(team.name, opposite)
            return (
              <SelectItem key={team.name} value={team.name} disabled={blocked}>
                <span aria-hidden="true">{team.flag}</span>
                {team.name}
                {teamsInPlay.has(team.name) ? ' — already playing' : null}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button>Start match</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Start a match</DialogTitle>
            <DialogDescription>
              The match is added to the summary at nil-nil. A team can only be in one match at a
              time.
            </DialogDescription>
          </DialogHeader>

          {picker('home', 'Home team', homeTeam, awayTeam, setHomeTeam)}
          {picker('away', 'Away team', awayTeam, homeTeam, setAwayTeam)}

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {ERROR_MESSAGE[error]}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={!homeTeam || !awayTeam}>
              Start match
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
