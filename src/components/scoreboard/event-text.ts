import type { MatchEvent } from '@/domain/events'
import type { Match } from '@/domain/match'

import { teamOf } from './match-text'

/**
 * How an entry reads in the log.
 *
 * "Goal removed" and "Undone" are deliberately different sentences rather than
 * two shades of the same one. An operator scanning the record has to be able to
 * tell "that goal did not count" from "I entered that by mistake", and the
 * arithmetic alone cannot tell them apart.
 */
export function describeEvent(event: MatchEvent, match: Match): string {
  switch (event.kind) {
    case 'MATCH_STARTED':
      return 'Match started'
    case 'GOAL':
      return `Goal — ${teamOf(match, event.side)}`
    case 'GOAL_REMOVED':
      return `Goal removed — ${teamOf(match, event.side)}`
    case 'UNDO': {
      const reverted = match.events.find((candidate) => candidate.id === event.revertedEventId)
      return reverted ? `Undone: ${describeEvent(reverted, match)}` : 'Undone: earlier entry'
    }
    case 'MATCH_FINISHED':
      return 'Match finished'
  }
}

export const eventScore = (event: MatchEvent): string => `${event.score.home}-${event.score.away}`

/**
 * Entries are not colour-coded. Colour alone cannot carry the distinction this
 * log exists to make, so the wording does it and the marker only reinforces it.
 */
export const eventMarker = (event: MatchEvent): string => {
  switch (event.kind) {
    case 'GOAL':
      return '+'
    case 'GOAL_REMOVED':
      return '−'
    case 'UNDO':
      return '↶'
    default:
      return '·'
  }
}
