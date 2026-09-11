import { Announcer } from '@/a11y/Announcer'
import { Scoreboard } from '@/components/scoreboard/Scoreboard'
import { StartMatchDialog } from '@/components/scoreboard/StartMatchDialog'

export default function App() {
  return (
    <Announcer>
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Live World Cup scoreboard</h1>
            <p className="text-muted-foreground text-sm">
              Matches in progress, ranked by total goals. Ties go to whichever kicked off most
              recently.
            </p>
          </div>
          <StartMatchDialog />
        </header>

        <Scoreboard />
      </div>
    </Announcer>
  )
}
