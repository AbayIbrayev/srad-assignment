import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useReorderAnimation } from './use-reorder-animation'

/** Where each key currently sits, as the mocked layout reports it. */
const layout = new Map<string, { top: number; left: number }>()

const place = (positions: Record<string, { top: number; left: number }>) => {
  layout.clear()
  for (const [key, position] of Object.entries(positions)) layout.set(key, position)
}

const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() }))

function Harness({ keys }: { keys: string[] }) {
  const ref = useReorderAnimation<HTMLOListElement>()

  return (
    <ol ref={ref} data-testid="list">
      {keys.map((key) => (
        <li key={key} data-reorder-key={key}>
          {key}
        </li>
      ))}
    </ol>
  )
}

beforeEach(() => {
  layout.clear()
  animate.mockClear()

  // jsdom has no layout engine and no Web Animations API, so both are supplied.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const key = (this as HTMLElement).dataset?.reorderKey ?? ''
    const { top, left } = layout.get(key) ?? { top: 0, left: 0 }
    return { top, left, x: left, y: top, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) } as DOMRect
  })
  Object.defineProperty(Element.prototype, 'animate', { value: animate, configurable: true, writable: true })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(Element.prototype, 'animate')
})

const firstKeyframeOf = (call: number) =>
  (animate.mock.calls[call] as unknown as [Keyframe[]])[0][0].transform

describe('useReorderAnimation', () => {
  it('does not animate on first render, having nothing to move from', () => {
    place({ a: { top: 0, left: 0 }, b: { top: 100, left: 0 } })

    render(<Harness keys={['a', 'b']} />)

    expect(animate).not.toHaveBeenCalled()
  })

  it('animates each moved card from where it was to where it now is', () => {
    place({ a: { top: 0, left: 0 }, b: { top: 100, left: 0 } })
    const { rerender } = render(<Harness keys={['a', 'b']} />)

    place({ b: { top: 0, left: 0 }, a: { top: 100, left: 0 } })
    rerender(<Harness keys={['b', 'a']} />)

    expect(animate).toHaveBeenCalledTimes(2)
    // Children are read in DOM order, so b (which moved up) comes first.
    expect(firstKeyframeOf(0)).toBe('translate(0px, 100px)')
    expect(firstKeyframeOf(1)).toBe('translate(0px, -100px)')
  })

  it('animates sideways movement too, since the summary is a grid', () => {
    place({ a: { top: 0, left: 0 }, b: { top: 0, left: 300 } })
    const { rerender } = render(<Harness keys={['a', 'b']} />)

    place({ b: { top: 0, left: 0 }, a: { top: 0, left: 300 } })
    rerender(<Harness keys={['b', 'a']} />)

    expect(firstKeyframeOf(0)).toBe('translate(300px, 0px)')
  })

  it('leaves a card that has not moved alone', () => {
    place({ a: { top: 0, left: 0 }, b: { top: 100, left: 0 }, c: { top: 200, left: 0 } })
    const { rerender } = render(<Harness keys={['a', 'b', 'c']} />)

    // Only b and c swap; a stays put.
    place({ a: { top: 0, left: 0 }, c: { top: 100, left: 0 }, b: { top: 200, left: 0 } })
    rerender(<Harness keys={['a', 'c', 'b']} />)

    expect(animate).toHaveBeenCalledTimes(2)
  })

  it('holds pointer events while cards are in flight, then gives them back', async () => {
    place({ a: { top: 0, left: 0 }, b: { top: 100, left: 0 } })
    const { rerender, getByTestId } = render(<Harness keys={['a', 'b']} />)

    place({ b: { top: 0, left: 0 }, a: { top: 100, left: 0 } })
    rerender(<Harness keys={['b', 'a']} />)

    // A click landing mid-flight would hit whichever card is now under the
    // cursor, which is the mis-click this exists to prevent.
    expect(getByTestId('list').style.pointerEvents).toBe('none')
    await waitFor(() => expect(getByTestId('list').style.pointerEvents).toBe(''))
  })

  it('neither animates nor holds pointer events when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    place({ a: { top: 0, left: 0 }, b: { top: 100, left: 0 } })
    const { rerender, getByTestId } = render(<Harness keys={['a', 'b']} />)

    place({ b: { top: 0, left: 0 }, a: { top: 100, left: 0 } })
    rerender(<Harness keys={['b', 'a']} />)

    expect(animate).not.toHaveBeenCalled()
    // The board must stay fully usable, not merely still: holding clicks for an
    // animation that is not running would be a pure penalty.
    expect(getByTestId('list').style.pointerEvents).toBe('')
  })

  it('cancels an in-flight move before measuring again', () => {
    const cancel = vi.fn()
    animate.mockReturnValue({ finished: Promise.resolve(), cancel })

    place({ a: { top: 0, left: 0 }, b: { top: 100, left: 0 } })
    const { rerender } = render(<Harness keys={['a', 'b']} />)

    place({ b: { top: 0, left: 0 }, a: { top: 100, left: 0 } })
    rerender(<Harness keys={['b', 'a']} />)

    place({ a: { top: 0, left: 0 }, b: { top: 100, left: 0 } })
    rerender(<Harness keys={['a', 'b']} />)

    // A running transform would otherwise be measured as the settled position.
    expect(cancel).toHaveBeenCalled()
  })

  it('does nothing where the Web Animations API is unavailable', () => {
    Reflect.deleteProperty(Element.prototype, 'animate')
    place({ a: { top: 0, left: 0 }, b: { top: 100, left: 0 } })
    const { rerender, getByTestId } = render(<Harness keys={['a', 'b']} />)

    place({ b: { top: 0, left: 0 }, a: { top: 100, left: 0 } })

    expect(() => rerender(<Harness keys={['b', 'a']} />)).not.toThrow()
    expect(getByTestId('list').style.pointerEvents).toBe('')
  })
})
