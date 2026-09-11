import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App'
import { givenMatch, resetScoreboard } from './test/utils'

beforeEach(resetScoreboard)

const renderApp = () => ({ user: userEvent.setup(), ...render(<App />) })

const summaryList = () => screen.getByRole('list', { name: /Matches in progress/ })

const fixturesIn = (list: HTMLElement) =>
  within(list)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent)

/** The brief's example scenario, started in the order it lists. */
const givenExampleScenario = () => {
  givenMatch('Mexico', 'Canada', 0, 5)
  givenMatch('Spain', 'Brazil', 10, 2)
  givenMatch('Germany', 'France', 2, 2)
  givenMatch('Uruguay', 'Italy', 6, 6)
  givenMatch('Argentina', 'Australia', 3, 1)
}

describe('the scoreboard', () => {
  it('tells the operator how to begin when nothing is live', () => {
    renderApp()

    expect(screen.getByText(/Nothing is live right now/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /Matches in progress/ })).not.toBeInTheDocument()
  })

  it('renders the summary in the documented order', () => {
    givenExampleScenario()
    renderApp()

    expect(fixturesIn(summaryList())).toEqual([
      'Uruguay vs Italy',
      'Spain vs Brazil',
      'Mexico vs Canada',
      'Argentina vs Australia',
      'Germany vs France',
    ])
  })

  it('numbers each card with its position, so the order is checkable on sight', () => {
    givenExampleScenario()
    renderApp()

    expect(within(summaryList()).getAllByText(/^#\d$/).map((badge) => badge.textContent)).toEqual([
      '#1',
      '#2',
      '#3',
      '#4',
      '#5',
    ])
  })

  it('is a list in the markup, not only a grid on screen', () => {
    // The grid is what an operator wants to look at; the list is what carries
    // the ranking to anyone not looking at it.
    givenExampleScenario()
    renderApp()

    expect(within(summaryList()).getAllByRole('listitem')).toHaveLength(5)
  })

  it('re-ranks when a score changes the order', async () => {
    givenMatch('Spain', 'Brazil', 1, 0)
    givenMatch('Germany', 'France', 0, 0)
    const { user } = renderApp()

    await user.click(screen.getByRole('button', { name: 'Add a goal for Germany' }))
    await user.click(screen.getByRole('button', { name: 'Add a goal for Germany' }))

    expect(fixturesIn(summaryList())).toEqual(['Germany vs France', 'Spain vs Brazil'])
  })

  describe('finished matches', () => {
    it('are not shown at all until there are some', () => {
      givenMatch('Spain', 'Brazil')
      renderApp()

      expect(screen.queryByText(/Finished matches/)).not.toBeInTheDocument()
    })

    it('leave the in-progress summary and appear in their own collapsed section', async () => {
      givenMatch('Spain', 'Brazil', 10, 2)
      givenMatch('Germany', 'France', 2, 2)
      const { user } = renderApp()

      // Each Finish button names its own fixture, so a board with several live
      // matches can be driven without relying on card order.
      await user.click(screen.getByRole('button', { name: 'Finish match: Spain versus Brazil' }))
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Finish match' }),
      )

      // Spain vs Brazil had the most goals and was therefore ranked first.
      expect(fixturesIn(summaryList())).toEqual(['Germany vs France'])

      const finished = screen.getByText(/Finished matches/)
      expect(finished).toHaveTextContent('(1)')
      // A closed section with a count makes "finished matches are not in the
      // summary" visibly true rather than something to take on trust.
      expect(finished.closest('details')).not.toHaveAttribute('open')
    })

    it('can be opened to read the final scores', async () => {
      givenMatch('Spain', 'Brazil', 10, 2)
      const { user } = renderApp()

      await user.click(screen.getByRole('button', { name: /Finish match/ }))
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Finish match' }),
      )
      await user.click(screen.getByText(/Finished matches/))

      const finishedList = screen.getByRole('list', { name: /Finished matches/ })
      expect(fixturesIn(finishedList)).toEqual(['Spain vs Brazil'])
      expect(within(finishedList).getByText(/Final/)).toBeInTheDocument()
    })
  })

  it('has one heading hierarchy, not a pile of styled text', () => {
    givenMatch('Spain', 'Brazil')
    renderApp()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Live World Cup scoreboard')
    expect(screen.getByRole('heading', { level: 2, name: /Matches in progress/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Spain vs Brazil' })).toBeInTheDocument()
  })
})
