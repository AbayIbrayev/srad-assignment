import { useLayoutEffect, useRef } from 'react'

/**
 * Long enough for the eye to follow a card across the grid, short enough that
 * an operator scoring quickly does not feel held up.
 */
const DURATION_MS = 180

function prefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  } catch {
    // Not every environment implements matchMedia; absence is not a preference.
    return false
  }
}

/**
 * Animates cards to their new positions when the summary re-orders (FLIP).
 *
 * A goal can move a match several places at once, and without this the board
 * simply teleports: the card the operator was aiming at is gone and another is
 * under the cursor. The animation is what makes the movement followable.
 *
 * The animation alone does not prevent the mis-click, though — during it the
 * target is still moving. So pointer events are held on the list while cards
 * are in flight. A click swallowed for 180ms costs a second click; a click
 * landing on the wrong match records a goal against the wrong team. The
 * cheaper failure is the right one to choose. Keyboard interaction is
 * unaffected, `pointer-events` not applying to it, and a keyboard user is not
 * the one aiming at a moving target.
 *
 * Under `prefers-reduced-motion: reduce` nothing animates and nothing is held:
 * the board re-orders instantly, as it did before.
 */
export function useReorderAnimation<T extends HTMLElement>() {
  const container = useRef<T>(null)
  const positions = useRef(new Map<string, DOMRect>())
  const running = useRef<Animation[]>([])

  // No dependency array on purpose: positions must be re-recorded after every
  // render, or a viewport resize leaves stale coordinates that produce a
  // nonsense animation the next time the order changes.
  useLayoutEffect(() => {
    const list = container.current
    if (!list) return

    // Cancel anything still in flight before measuring — a running transform
    // would otherwise be read as the card's settled position.
    for (const animation of running.current) animation.cancel()
    running.current = []

    const previous = positions.current
    const current = new Map<string, DOMRect>()
    const moved: { element: HTMLElement; dx: number; dy: number }[] = []

    for (const child of Array.from(list.children)) {
      const element = child as HTMLElement
      const key = element.dataset.reorderKey
      if (!key) continue

      const rect = element.getBoundingClientRect()
      current.set(key, rect)

      const before = previous.get(key)
      if (!before) continue

      const dx = before.left - rect.left
      const dy = before.top - rect.top
      if (dx !== 0 || dy !== 0) moved.push({ element, dx, dy })
    }

    positions.current = current

    if (moved.length === 0 || prefersReducedMotion()) return
    if (typeof list.animate !== 'function') return

    list.style.pointerEvents = 'none'

    running.current = moved.map(({ element, dx, dy }) =>
      element.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }],
        { duration: DURATION_MS, easing: 'ease-out' },
      ),
    )

    void Promise.allSettled(running.current.map((animation) => animation.finished)).then(() => {
      list.style.pointerEvents = ''
    })
  })

  return container
}
