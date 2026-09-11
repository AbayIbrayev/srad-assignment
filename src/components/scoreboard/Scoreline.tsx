import { flagFor } from '@/domain/teams'

/**
 * Flags are decorative and hidden from assistive technology: screen readers
 * announce regional indicator pairs inconsistently, so the team name beside it
 * is the real label. See `TeamOption.flag`.
 */
export function TeamName({ team }: { team: string }) {
  const flag = flagFor(team)

  return (
    <span className="flex min-w-0 items-center gap-2">
      {flag ? (
        <span aria-hidden="true" className="text-base leading-none">
          {flag}
        </span>
      ) : null}
      <span className="truncate">{team}</span>
    </span>
  )
}

const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

export function TimeAt({ at }: { at: number }) {
  const date = new Date(at)

  return <time dateTime={date.toISOString()}>{TIME.format(date)}</time>
}
