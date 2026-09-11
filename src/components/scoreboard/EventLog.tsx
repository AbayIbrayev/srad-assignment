import type { Match } from '@/domain/match'

import { describeEvent, eventMarker, eventScore } from './event-text'
import { fixture } from './match-text'
import { TimeAt } from './Scoreline'

/**
 * The match's audit trail, newest first.
 *
 * Collapsed by default: an operator watching several matches wants the board
 * scannable, and a log open on every card would undo the reason the summary is
 * a grid at all. The count on the summary line is enough to show there is
 * something to read without costing any height.
 *
 * The list itself is the scroll container and is focusable, so a keyboard user
 * can reach and scroll it — a scrollable region that cannot be focused is
 * content only a mouse can read.
 */
export function EventLog({ match }: { match: Match }) {
  const newestFirst = match.events.toReversed()

  return (
    <details className="group/log">
      <summary className="text-muted-foreground cursor-pointer text-xs select-none">
        Event log <span className="tabular-nums">({match.events.length})</span>
      </summary>

      <ol
        tabIndex={0}
        aria-label={`Event log for ${fixture(match)}, newest first`}
        className="ring-border/60 mt-2 max-h-40 list-none space-y-1 overflow-y-auto rounded-md p-2 text-xs ring-1 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {newestFirst.map((event) => (
          <li key={event.id} className="flex items-baseline gap-2">
            <span aria-hidden="true" className="text-muted-foreground w-2 shrink-0 text-center">
              {eventMarker(event)}
            </span>
            <TimeAt at={event.at} />
            <span className="min-w-0 flex-1 truncate">{describeEvent(event, match)}</span>
            <span className="shrink-0 font-medium tabular-nums">{eventScore(event)}</span>
          </li>
        ))}
      </ol>
    </details>
  )
}
