import { expect, test, type Page } from '@playwright/test'

/**
 * Three flows only, and deliberately the three that the unit tests cannot
 * stand in for: the ordering rule driven through real clicks rather than the
 * store, state crossing a page reload, and a finished match leaving the
 * summary. Everything else is covered faster and more precisely by Vitest.
 */

const summary = (page: Page) => page.getByRole('list', { name: /Matches in progress/ })

const fixturesIn = (page: Page, list = summary(page)) => list.getByRole('heading', { level: 3 })

async function startMatch(page: Page, home: string, away: string) {
  await page.getByRole('button', { name: 'Start match', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByRole('combobox', { name: 'Home team' }).click()
  await page.getByRole('option', { name: new RegExp(home) }).click()
  await dialog.getByRole('combobox', { name: 'Away team' }).click()
  await page.getByRole('option', { name: new RegExp(away) }).click()
  await dialog.getByRole('button', { name: 'Start match' }).click()

  await expect(dialog).toBeHidden()
}

async function score(page: Page, team: string, goals: number) {
  for (let i = 0; i < goals; i++) {
    // Auto-waiting matters here: while cards are animating to new positions the
    // list stops receiving pointer events, so Playwright waits rather than
    // clicking whatever has slid under the cursor -- the same protection the
    // hold gives an operator.
    await page.getByRole('button', { name: `Add a goal for ${team}` }).click()
  }
}

/**
 * Kickoff times are pinned so the documentation screenshot below does not
 * change on every run, and so the five matches carry *different* start times.
 * That matters: with distinct kickoffs the screenshot shows the tiebreak being
 * applied rather than only its result.
 */
const KICKOFF = Date.UTC(2026, 5, 14, 19, 0)
const MINUTE = 60_000

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('ranks the summary by total goals, most recently started first on a tie', async ({
  page,
}, testInfo) => {
  // The brief's example scenario, started in the order it lists and scored
  // through the interface rather than seeded into the store.
  const kickOff = async (minutes: number) =>
    page.clock.setFixedTime(new Date(KICKOFF + minutes * MINUTE))

  await kickOff(0)
  await startMatch(page, 'Mexico', 'Canada')
  await score(page, 'Canada', 5)

  await kickOff(5)
  await startMatch(page, 'Spain', 'Brazil')
  await score(page, 'Spain', 10)
  await score(page, 'Brazil', 2)

  await kickOff(10)
  await startMatch(page, 'Germany', 'France')
  await score(page, 'Germany', 2)
  await score(page, 'France', 2)

  await kickOff(15)
  await startMatch(page, 'Uruguay', 'Italy')
  await score(page, 'Uruguay', 6)
  await score(page, 'Italy', 6)

  await kickOff(20)
  await startMatch(page, 'Argentina', 'Australia')
  await score(page, 'Argentina', 3)
  await score(page, 'Australia', 1)

  await expect(fixturesIn(page)).toHaveText([
    'Uruguay vs Italy',
    'Spain vs Brazil',
    'Mexico vs Canada',
    'Argentina vs Australia',
    'Germany vs France',
  ])

  // Both ties are visible here, not just the ordering: Uruguay (19:15) sits
  // above Spain (19:05) on twelve goals, and Argentina (19:20) above Germany
  // (19:10) on four.
  await expect(fixturesIn(page).first()).toContainText('Uruguay')

  if (testInfo.project.name === 'desktop') {
    // Written from one project only, so the committed image is a single
    // snapshot rather than whichever browser finished last.
    //
    // The final assertion passes as soon as the *text* settles, which is before
    // the cards have finished sliding to their new positions -- capturing then
    // produces a picture of two cards overlapping mid-flight. Wait for the
    // board to come to rest first.
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState === 'finished'),
    )
    await page.screenshot({ path: 'docs/example-scenario.png', animations: 'disabled' })
  }
})

test('a finished match leaves the summary and keeps its record', async ({ page }) => {
  await startMatch(page, 'Spain', 'Brazil')
  await score(page, 'Spain', 2)
  await startMatch(page, 'Germany', 'France')

  await page.getByRole('button', { name: 'Finish match: Spain versus Brazil' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Finish match' }).click()

  await expect(fixturesIn(page)).toHaveText(['Germany vs France'])

  const finished = page.getByText(/Finished matches/)
  await expect(finished).toContainText('(1)')
  await finished.click()

  const finishedList = page.getByRole('list', { name: /Finished matches/ })
  await expect(fixturesIn(page, finishedList)).toHaveText(['Spain vs Brazil'])

  // The record outlives the match it describes.
  await finishedList.getByText(/Event log/).click()
  const log = page.getByRole('list', { name: /Event log for Spain versus Brazil/ })
  await expect(log.getByRole('listitem').first()).toContainText('Match finished')
  await expect(log.getByRole('listitem')).toHaveCount(4)
})

test('the board survives a reload, including what can still be undone', async ({ page }) => {
  await startMatch(page, 'Spain', 'Brazil')
  await score(page, 'Spain', 3)

  await page.reload()

  await expect(fixturesIn(page)).toHaveText(['Spain vs Brazil'])
  await expect(page.getByText('3 goals · started')).toBeVisible()

  const undo = page.getByRole('button', { name: 'Undo last score change: Spain versus Brazil' })
  await expect(undo).toBeEnabled()
  await undo.click()

  await expect(page.getByText('2 goals · started')).toBeVisible()
  await expect(undo).toBeDisabled()
})
