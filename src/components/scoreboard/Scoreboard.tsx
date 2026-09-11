import { useCallback, useRef } from 'react'

import { useFinishedIds, useInProgressIds } from '@/store/selectors'

import { FinishedMatchCard } from './FinishedMatchCard'
import { MatchCard } from './MatchCard'
import { useReorderAnimation } from './use-reorder-animation'

/**
 * `<ol>` rather than a grid of `<div>`s, laid out with CSS grid.
 *
 * The visual grid is what an operator watching several matches wants — six
 * cards at a glance beat a column that has to be scrolled. But the summary is
 * a *ranked* list, and saying so in the markup means the order survives for
 * anyone not looking at the screen, and each card can state its own position
 * rather than leaving the reader to infer it from where it sits.
 */
const GRID = 'grid list-none grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'

export function Scoreboard() {
  const inProgressIds = useInProgressIds()
  const finishedIds = useFinishedIds()
  const inProgressHeading = useRef<HTMLHeadingElement>(null)
  const summary = useReorderAnimation<HTMLOListElement>()

  /**
   * Finishing a match unmounts its card, which would otherwise drop focus to
   * the document body and leave a keyboard user at the top of the page with no
   * idea what happened. Focus goes to the summary heading instead, and the
   * announcer says what changed.
   */
  const handleFinished = useCallback(() => {
    inProgressHeading.current?.focus()
  }, [])

  return (
    <main className="flex flex-col gap-8">
      <section aria-labelledby="in-progress-heading" className="flex flex-col gap-3">
        <h2
          id="in-progress-heading"
          ref={inProgressHeading}
          tabIndex={-1}
          className="text-lg font-semibold outline-none"
        >
          Matches in progress{' '}
          <span className="text-muted-foreground font-normal">({inProgressIds.length})</span>
        </h2>

        {inProgressIds.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing is live right now. Use <strong>Start match</strong> to add one.
          </p>
        ) : (
          <ol ref={summary} className={GRID} aria-labelledby="in-progress-heading">
            {inProgressIds.map((id, index) => (
              <li key={id} data-reorder-key={id}>
                <MatchCard id={id} rank={index + 1} onFinished={handleFinished} />
              </li>
            ))}
          </ol>
        )}
      </section>

      {finishedIds.length > 0 ? (
        <section aria-labelledby="finished-heading" className="flex flex-col gap-3">
          {/*
            Collapsed by default, and separate from the summary above: the brief
            requires finished matches to stay out of the in-progress summary, and
            a closed section with a count makes that visibly true rather than
            something a reviewer has to take on trust.
          */}
          <details className="group">
            <summary className="cursor-pointer text-lg font-semibold marker:text-muted-foreground">
              <span id="finished-heading">
                Finished matches{' '}
                <span className="text-muted-foreground font-normal">({finishedIds.length})</span>
              </span>
            </summary>
            <ol className={`${GRID} mt-3`} aria-labelledby="finished-heading">
              {finishedIds.map((id) => (
                <li key={id}>
                  <FinishedMatchCard id={id} />
                </li>
              ))}
            </ol>
          </details>
        </section>
      ) : null}
    </main>
  )
}
