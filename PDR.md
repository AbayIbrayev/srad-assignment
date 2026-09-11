# PDR — Live Football World Cup Scoreboard

Design record for the Sportradar Data & Odds Platform front-end exercise. This document captures the decisions, their rationale, and the alternatives that were rejected. It is the specification the implementation commits are built against.

Reviewer-facing documentation lives in [README.md](./README.md); this document links to it, not the other way round, so a reviewer who reads only the README misses nothing required by the brief. Process and AI usage are recorded in [AI.md](./AI.md).

---

## Context

Build a Live Football World Cup scoreboard in React + TypeScript. The brief deliberately underspecifies; the graded skill is making defensible interpretations and documenting them. A follow-up interview walks through decisions and trade-offs, so every choice below has a one-sentence defence attached.

The repository was bootstrapped ahead of this document (`ac1f3d6 feat: project setup`) with Vite + React 19 + TypeScript, Tailwind 4, oxlint, Vitest + React Testing Library + jsdom, Playwright (desktop and Pixel 5 projects, build-and-preview web server), zustand, and a small set of vendored shadcn components.

Intended outcome: a repository that reads like a normal code review submission, provably reproduces the brief's example ordering, and whose README pre-empts every "why did you…" question.

---

## Requirement → implementation map

This mapping is the core defensive artefact and is reproduced in the README with quotes from the brief.

| Brief | Implementation |
|---|---|
| 1. Start a new match | "Start match" dialog, home/away team selects from a fixed 10-team list |
| 2. Update the score | `+1` / `−1` buttons per team on each in-progress card |
| 3. Finish a match | "Finish" button, confirmation step, **terminal** |
| 4. Summary of matches in progress | Ranked card grid; `total goals desc`, ties → `seq desc` (most recently started first) |
| 5. **Exactly one** additional operation | **Undo last score change** (single-step, per match) |
| Distinct git commit feature | **Per-match event log / audit trail** (collapsible, scrollable, per card) |
| "Data: … localStorage … allowed if you document it" | zustand `persist` → localStorage. Documented under Data, **never described as a feature** |
| Tests | Vitest + RTL (required), Playwright (optional, 3 flows) |
| Accessibility | Semantic `<ol>`/`<li>`, labelled controls, single app-level live region |
| Responsive layout | 1 / 2 / 3 column grid |

Explicitly argued in the README as **not** additional operations, to protect the "exactly one" reading:

- Score `−1` — this is requirement 2, "change the score".
- Start-match validation — a constraint, not an operation.
- The collapsible finished group — the brief says "you may show finished matches elsewhere if you like".
- localStorage persistence — granted unconditionally by the separate "Data:" line under Technical expectations, which is distinct from the section 5 list.

---

## Decisions

### D1. Ordering is a pure function over a monotonic sequence

`seq: number` increments per registration and is the authoritative ordering key. `startedAt: number` (wall clock) is stored for display only.

```ts
// src/domain/ordering.ts
export const totalGoals = (m: Match) => m.home + m.away

export const compareMatches = (a: Match, b: Match) =>
  totalGoals(b) - totalGoals(a) || b.seq - a.seq
```

**Why not `Date.now()`:** two matches registered in the same millisecond collide, which is trivially reproducible in tests and in any seeded or imported data. `Array.prototype.sort` stability cannot rescue it, because insertion order is lost across a localStorage rehydrate — the stored array's order is whatever JSON preserved. `seq` gives a total order that survives serialisation, so "equal goals and equal start time" is not a state the app can reach.

**"You define what 'start' means for ordering":** start is the moment the operator registers the match. Registration order is authoritative; wall-clock time is presentational.

`now()` and the id generators are injected into the store so tests are deterministic.

#### The brief's example scenario, as the app renders it

![The five example matches ranked in the summary: Uruguay 6-6 Italy, Spain 10-2 Brazil, Mexico 0-5 Canada, Argentina 3-1 Australia, Germany 2-2 France](./docs/example-scenario.png)

Not a mock-up. This image is written by the end-to-end spec that drives the scenario through the interface — five dialogs and thirty-four goal clicks — so it cannot drift from what the app actually does: if the ordering broke, the spec would fail before it reached the screenshot.

Both ties are legible rather than merely correct, which is why the kickoff times are staggered. Uruguay (19:15) sits above Spain (19:05) on twelve goals, and Argentina (19:20) above Germany (19:10) on four — the rule being applied, not just its result.

Kept reproducible: the clock and the browser timezone are pinned, the viewport is fixed rather than inherited from a device preset, and the capture waits for the re-order animation to come to rest — without which it caught two cards overlapping mid-flight. Re-running produces a byte-identical file.

### D2. Layout — a grid, but semantically a list

Card grid, row-major, 1 / 2 / 3 columns via `repeat(auto-fill, minmax(320px, 1fr))`.

Chosen over a single ranked column because an operator monitoring several simultaneous matches scans a grid faster than scrolling a list. The cost — that reading order in a multi-column grid is ambiguous — is paid off by keeping the DOM element an `<ol>` / `<li>` with `display: grid`, so semantics and visual order agree, and by putting a visible `#n` rank badge on every card so ordering is verifiable without counting.

Each card shows rank, both teams, both scores, **total goals**, and **start time**. Total and start time make the ordering rule auditable at a glance, which is the cheapest available defence of the only objectively-graded requirement.

Finished matches live in a separate collapsed `<details>` group below, ordered most-recently-finished first (the brief is silent, so this is a documented choice), with no rank badges. Collapsed-with-a-count also makes it visually obvious that finished matches are absent from the in-progress summary.

### D3. Score model — `+1` / `−1`, and why undo is still not redundant

`+1` and `−1` per team. No numeric inputs: no NaN/empty/paste guards, no commit-on-blur buffering, no third dialog, and the card stays dense — which was the entire rationale for the grid. `−1` is **disabled at 0**: a disabled control rather than a silent clamp or an error toast, which is clearer for screen reader users.

The obvious objection is "isn't undo just `−1`?". It is answered by making the two controls different claims about reality:

- **`GOAL_REMOVED`** — the score is genuinely lower. The goal was disallowed, overturned on review, or awarded to the wrong side. A real match event that stays in the record.
- **`UNDO`** — the previous entry was a data-entry error. It references the event it reverted.

Same arithmetic, different audit meaning. An operator's audit trail has to distinguish "the goal didn't count" from "I fat-fingered it". The log renders the two distinctly and the README states the distinction.

### D4. Undo — single step, permanent, score changes only

`lastChange: { prev: ScoreSnapshot } | null` per match. **Never an array.** After undoing there is nothing further to undo until the next change, and the button disables.

Two reasons:

1. It matches the brief's singular wording, "undo last score change".
2. It keeps the later event-log commit purely **additive** rather than a rewrite of a history stack shipped one commit earlier — which is what preserves the brief's requirement that the feature commit be "a second, larger slice of work".

Undo reverts the last score change of **either** kind (`GOAL` or `GOAL_REMOVED`). `MATCH_FINISHED` is explicitly **not** undoable, because finish is terminal (D5).

The event type union stays open so other undoable kinds can be added later, but no reverter-registry abstraction is built for events that do not exist yet.

### D5. Finish is terminal

Finished matches are immutable: no score edits, no undo, read-only event log.

The consequence is that a mis-click is unrecoverable, so Finish carries a confirmation step. The immutability rule is stated flatly in the README rather than left for a reviewer to discover.

### D6. Validation on start

- Home ≠ away.
- A team cannot appear in two in-progress matches.

The second rule subsumes "no duplicate in-progress fixture", so one rule is implemented and the README documents that it covers both. Unavailable teams are disabled in the selects with the reason surfaced, rather than only rejected on submit.

The preset team list contains **all ten example-scenario teams** — Mexico, Canada, Spain, Brazil, Germany, France, Uruguay, Italy, Argentina, Australia — so a reviewer can reproduce the brief's expected ordering by hand.

Each team carries a regional-indicator **flag emoji**, as a scanning aid: an operator watching six cards picks out a flag faster than reading a name. Two constraints follow and are load-bearing wherever a team is rendered:

- The flag is **decorative**. It is marked `aria-hidden` with the team name beside it as real text. Screen readers announce regional indicator pairs inconsistently — anything from the country name to "regional indicator symbol letter A" — so a flag is never a team's only label. This keeps the flags on the right side of the brief's accessibility requirement rather than working against it.
- **Windows Chrome ships no glyphs for these** and renders the underlying letter pair ("AR", "BR") instead. That degrades to a readable abbreviation rather than a broken box, which makes it an accepted trade-off rather than a blocker. Recorded in the README so a reviewer on Windows knows it is known.

The flag lookup is derived from the roster rather than kept as a second literal, so a team cannot be added without one, and it returns `undefined` for an unknown name — a match persisted under an older roster renders its team name plainly rather than borrowing another country's flag.

### D7. State — zustand, justified honestly

zustand with the `persist` middleware. The justification given in the README is **ergonomics, persistence middleware, and a store that is testable outside React** — explicitly *not* performance.

The performance argument is deliberately not made. Nothing in this application ticks: there are no timers and no feed, so renders occur only on operator interaction, and at roughly six concurrent matches the difference against `useReducer` + context is unmeasurable. Claiming otherwise invites "how many cards before it matters, and did you measure?", which has no good answer.

The container selects the ordered list of match **ids** with a shallow comparator; each card selects its own match by id. This is framed as clarity of data flow, with the negligible re-render saving noted as a side effect rather than the reason.

### D8. Persistence

Storage key `srad-scoreboard`. `version: 3`. Version 2 added `lastChange` to in-progress matches for undo; version 3 added the event log. Each bump ships a migration rather than letting older state be discarded — an operator who reloads into a new build mid-matchday should not lose the board they are watching. Corrupt or unparseable stored state resets to empty rather than white-screening the application. Documented in the README under the brief's "Data:" line.

There is **no retention policy** on finished matches or event history. This is recorded in the README as an accepted trade-off — a single matchday does not need one. A "clear finished" button is deliberately not added, because it would invite feature-count questions against "exactly one additional operation".

### D9. Accessibility

- `<ol>` / `<li>` for both summaries; `<details>` / `<summary>` for collapsible regions.
- Radix Dialog for the start and finish-confirm dialogs (focus trap, Escape, labelled title and description). Radix Select with an associated `<Label>`.
- Buttons carry real accessible names — `aria-label="Add goal for Spain"`, not `+`.
- **One** application-level `aria-live="polite"` region announcing the most recent change ("Spain 2, Brazil 1"). Not one per card: six simultaneous live regions is screen reader spam.
- The scrollable log container is `tabIndex={0}` with an accessible name, so it is keyboard-reachable.
- Finishing a match removes its card, so focus moves to the in-progress section heading and the change is announced.
- `prefers-reduced-motion` is respected in two places, because one is not enough. The re-order animation (D11) checks it in JavaScript, and a global rule in `src/index.css` collapses the `tw-animate-css` dialog and card animations, which do not consult the preference on their own. Durations are collapsed rather than zeroed so animation and transition end events still fire.
- Any compromise found during implementation gets a README line rather than being quietly dropped.

### D11. Re-order animation

When a goal changes the ranking, the summary re-orders instantly and the card the operator was aiming at is replaced under the cursor by a different match. The next click lands on the wrong team.

Cards animate to their new positions (FLIP: measure, invert, play, via the Web Animations API), 180ms, ease-out — long enough to follow a card across the grid, short enough not to hold up someone scoring quickly.

**The animation alone does not fix the mis-click**, because during it the target is still moving. Pointer events are therefore held on the list while cards are in flight. A click swallowed for 180ms costs a second click; a click landing on the wrong match records a goal against the wrong team and needs undoing. The cheaper failure is the one to choose. Keyboard interaction is untouched — `pointer-events` does not apply to it, and a keyboard user is not aiming at a moving target.

Under `prefers-reduced-motion: reduce` nothing animates *and* nothing is held: holding clicks for an animation that is not running would be a pure penalty.

Positions are re-measured after every render rather than only when the order changes, so a viewport resize cannot leave stale coordinates that produce a nonsense animation later; and any in-flight animation is cancelled before measuring, since a running transform would otherwise be read as a card's settled position.

### D10. Testing

- `src/domain/ordering.test.ts` — the pure sort. **Reproduces the brief's example scenario exactly**, asserting `[Uruguay, Spain, Mexico, Argentina, Germany]`, plus tie cases and the `seq` tiebreak.
- `src/store/*.test.ts` — start / update score / finish / undo, validation rules, persist rehydrate, corrupt-state recovery, injected clock and id generator.
- Component tests (RTL) — `StartMatchDialog`, `MatchCard`, `EventLog`, queried by role and accessible name, which also serves as evidence for the accessibility claims.
- Integration test (RTL) — start → score → order changes → finish → leaves the summary.
- Playwright, three flows only, run via `npm run test:e2e` and never as part of `npm test`: the example scenario driven through the real UI; finishing moves a match to the finished group; reload preserves state. Runs against `build` + `preview`; the README documents `npx playwright install`.

Playwright is optional per the brief and is treated as a liability unless it is green and fast — a reviewer who clones the repository and hits a browser-download failure is a net loss, so it stays behind its own script with documented setup.

---

## Commit plan

Each commit is self-contained and green.

| # | Commit | Contents | Status |
|---|---|---|---|
| 1 | `docs: add PDR and AI usage log` | `PDR.md`, `AI.md` | done |
| 2 | `feat: match domain model and summary ordering` | Domain types, team roster, `compareInProgress` / `compareFinished`, ordering tests including the brief's example scenario | done |
| 3 | `feat: scoreboard store with localStorage persistence` | zustand slice, start / score / finish, validation, `persist` v1 with guarded rehydration, store tests | done |
| 4 | `feat: start, update score and finish UI` | Dialogs, `<ol>` grid, cards, finished group, accessibility wiring, RTL tests | done |
| 5 | `feat: undo last score change` | The section 5 additional operation | done |
| 6 | `feat: per-match event log with audit trail` | **The distinct feature commit.** Event union, persist v3 + migration, collapsible scrollable log, `GOAL_REMOVED` vs `UNDO` rendering, tests | done |
| 7 | `test: playwright end-to-end coverage for core flows` | Three flows on desktop and Pixel 5, plus the example-scenario screenshot used in the docs | done |
| 8 | `docs: finalise README` | Assumptions, trade-offs, requirement map, accessibility compromises, run instructions, feature documentation — **authored by the candidate, not generated** | pending |

`AI.md` is appended in every commit, not written at the end. The Status column above is updated as part of each commit, so this document stays an accurate record of where the work is.

### Progress log

Appended per commit: what landed, what deviated from this document, and any decision taken during implementation that this PDR did not anticipate.

- **Commit 1 — `docs: add PDR and AI usage log`.** Landed as specified. `PDR.md` and `AI.md` created; no application code. Note: writing these two documents became commit 1, so every implementation step shifted down by one relative to the plan agreed during the brainstorm.

- **Commit 2 (planned) — README and repository hygiene. Dropped.** `README.md` is authored by the candidate, not generated, so it is out of scope for these commits and lands at the end. The hygiene items planned alongside it were checked against the repository and two of the three were wrong, so nothing was changed:
  - *`cn` package* — not a random dependency. It is [`shadcn-ui/cn`](https://github.com/shadcn-ui/cn), first-party shadcn tooling and a compiled drop-in replacement for `clsx` + `tailwind-merge`, emitted by the current shadcn CLI. Correct as generated.
  - *`shadcn` in `dependencies`* — correct as it stands. `src/index.css` imports `shadcn/tailwind.css`, so the package is a build input to the production bundle, not a CLI-only tool. Moving it to `devDependencies` would break `npm ci --omit=dev`.
  - *Empty `e2e/` directory* — a non-issue. It was never tracked (git does not track empty directories) and `playwright.config.ts` points `testDir` at it, so it stays until commit 7.

  All three are worth a line in the final README so a reviewer does not have to ask, but that is the candidate's text to write.

- **Commit 2 — `feat: match domain model and summary ordering`.** Landed. Three source files and one test file, no UI and no store yet.

  `src/domain/match.ts` — `Match` is a **discriminated union** of `InProgressMatch` and `FinishedMatch` rather than a status field beside a nullable `finishedAt`, so a finished match always has a finish time and an in-progress one cannot. `isInProgress` / `isFinished` are the type guards. `seq` carries the reasoning from D1 in a doc comment, at the point where someone would otherwise be tempted to "simplify" it back to `startedAt`.

  `src/domain/teams.ts` — the ten-team roster, containing every team from the brief's example scenario.

  `src/domain/ordering.ts` — `totalGoals`, `compareInProgress`, `compareFinished`, and the two summary selectors. Both selectors filter by status internally, so there is exactly one place that can get "finished matches must not appear in the summary" wrong.

  **Deviations from this document**, both deliberate:
  - D1's sketch had flat `home` / `away` fields on `Match`. The implementation nests them as `score: Score`, because D4's undo snapshot is exactly a `Score` and the two should be the same shape rather than two shapes that happen to agree.
  - `Match.homeTeam` is `string`, not the `Team` union from `teams.ts`. A real deployment loads the roster from a feed, and the domain model should not be coupled to a list that is hard-coded for the exercise. `Team` is exported for the picker to use.

  Selectors use `Array.prototype.toSorted` (available under the project's ES2023 target) so they never mutate their input, and a test asserts that.

  **Test quality check.** The 13 tests were run against a deliberately broken build with the tiebreak reversed (`a.seq - b.seq`); 5 failed, including the example-scenario test. The suite catches the regression it exists to catch rather than passing vacuously.

  **Added mid-commit at the candidate's request:** a regional-indicator flag emoji per team, as a scanning aid for an operator watching several cards. Folded into this commit rather than a later one because it belongs with the roster it describes. See D6 for the accessibility and Windows-rendering constraints it carries. `TEAMS` became a list of `{ name, flag }` objects with the lookup derived from it, so a team cannot be added without a flag, and `Team` is now `(typeof TEAMS)[number]['name']`.

  `npm test` 19 passed · `npx tsc -b` clean · `npm run lint` clean.

- **Commit 3 — `feat: scoreboard store with localStorage persistence`.** Landed. Three source files, three test files, still no UI.

  `src/domain/validation.ts` — `validateStartMatch` returns an error *code* or `null`, and `teamsInPlay` is exported separately because the picker needs it: a team that cannot be chosen is disabled at the point of choice rather than accepted and then rejected on submit. Confirmed in a test that "no duplicate in-progress fixture" needs no rule of its own — it falls out of "a team plays one match at a time" — so the redundant third rule from D6 cannot be added back without a test objecting. Finished matches deliberately release their teams, so a fixture can be replayed.

  `src/store/safe-persist-storage.ts` — a `PersistStorage` that refuses to return state it cannot vouch for. `createJSONStorage` parses whatever is under the key and trusts it; this validates the envelope and the state, and on failure removes the key and reports nothing stored. Storage *access* is guarded too, since `localStorage` throws outright in a private window or when site data is blocked, and a write failure (quota) is swallowed so the scoreboard keeps working in memory and merely stops surviving a reload. This is D8's "must not white-screen" made concrete and testable.

  `src/store/scoreboard.ts` — the zustand slice. `matches` is keyed by id (cards select their own match; an update touches one key). Every score change funnels through one `updateInProgress` helper, so D5's "a finished match is immutable" is enforced in a single place rather than repeated at three call sites and eventually forgotten at one. `startMatch` returns `{ ok: false, error }` rather than throwing: a rejected start is an expected result of operator input, and the caller needs the reason to render it. A no-op (removing a goal at zero, finishing an already-finished match) returns the identical state object, so it re-renders nothing.

  **Decisions taken during implementation that this document did not anticipate:**
  - `crypto.randomUUID` is unavailable outside a secure context, which includes hitting the dev server from a phone on the LAN — exactly what someone does to check the responsive layout. `randomId` falls back rather than throwing; ids are local identifiers, not security material.
  - Version-mismatch behaviour was **probed rather than assumed**: with no `migrate` function, zustand discards state it cannot migrate and the app starts empty, logging a warning. That is the right failure mode, and it is now pinned by a test so commit 6's v1 → v2 migration has a documented baseline to replace.
  - No `reset` action was added. Tests construct fresh stores through the factory, and component tests can use zustand's built-in `setState`. A production reset would be a fifth operation a reviewer could count against "exactly one additional operation" (D8 makes the same argument against a "clear finished" button).

  **Test quality check.** Four mutants were run against the suite: the terminal-finish guard removed (3 failures), the zero floor removed (1), start validation bypassed (3), and the no-op short-circuit removed (1). Each was caught.

  `npm test` 69 passed · `npx tsc -b` clean · `npm run lint` clean · `npm run build` green.

- **Commit 4 — `feat: start, update score and finish UI`.** The app is now usable. Selectors, an announcer, five components, three test files.

  `src/store/selectors.ts` — summaries hand back **ids**, not matches. A card subscribes to its own match; the board subscribes only to the ranked list of ids. Adding a goal that does not move a match re-renders one card rather than the board. As D7 requires, this is not claimed as a performance decision — at six matches it saves nothing measurable — it is here because it makes the data flow say what it means.

  `src/a11y/` — one polite live region for the whole board. Announcements read the score back *from the store* rather than predicting it, so the announcement can never disagree with the screen. Re-announcing an identical string needs a trailing zero-width space, since most screen readers suppress an unchanged live region and "Spain 2 - 1 Brazil" twice in a row would otherwise be silent the second time.

  `src/components/scoreboard/` — `StartMatchDialog`, `MatchCard`, `FinishedMatchCard`, `FinishMatchDialog`, `Scoreboard`. The summary is an `<ol>` laid out with `display: grid` exactly as D2 requires, so the ranking survives for anyone not looking at the screen. Finished matches sit in a `<details>`, closed, with a count.

  **Deviations from this document, and one correction made mid-commit:**
  - **D9 assumed cards would be labelled with `aria-labelledby`. They are not.** The vendored shadcn `Card` and `CardTitle` are plain `<div>`s with no polymorphism, so `aria-labelledby` on them points at nothing announceable. Each card now carries a real `<h3>` instead, which is also how a screen reader user actually moves through a list of cards. A test asserts the `h1` → `h2` → `h3` hierarchy so this cannot silently regress.
  - **A self-inflicted accessibility bug was caught and fixed before it landed.** The score was first written as `aria-hidden`, with "currently 2" stuffed into each button's label to compensate. That hides the score from assistive technology and makes every button verbose. The score is now ordinary readable text and the labels are plain: "Add a goal for Spain".
  - **`−` at zero uses the real `disabled` attribute**, which removes it from the tab order. `aria-disabled` would keep it focusable and is arguably the more accessible choice, but it needs manual click suppression and an explanation of why nothing happened. This is a **documented accessibility compromise** for the README, not an oversight.
  - `vite.config.ts` now pins `TZ: 'UTC'` for tests. Times are rendered for the operator, so a test asserting on one must not depend on the machine running it.

  **Verified in a real browser, not only jsdom.** The full example scenario was driven through the built app in headless Chromium — five dialogs, thirty-four goal clicks — and produced `[Uruguay, Spain, Mexico, Argentina, Germany]` with no console errors. Screenshots at 1280px and 390px confirmed the 3-column and 1-column layouts. One apparent missing button in a screenshot was measured rather than eyeballed and proved to be a PNG artifact: both controls were present, visible and enabled at the same x-position.

  **Test quality check.** Five mutants, all caught: the `−` never disabled (1 failure), the flag exposed to assistive technology (1), rank badges reversed (1), focus not returned after finishing (1), and finish skipping its confirmation (5).

  **Added mid-commit at the candidate's request:** a re-order animation, so a card that changes rank can be followed rather than teleporting. See D11. The request was for the animation; the pointer-event hold was added on top, because an animation on its own makes the movement legible without preventing the mis-click it was asked to prevent — during it the target is still moving.

  The animation is covered by eight unit tests against a mocked layout and Web Animations API (jsdom has neither), including the two that matter most: nothing animates under reduced motion, and nothing is held either.

  **Verified in a real browser, both ways.** With motion allowed: four animations running mid-reorder and `pointer-events: none` on the list, returning to `auto` once settled. Under emulated `prefers-reduced-motion: reduce`: zero animations, pointer events never held, ordering still correct.

  **That check found a real gap in D9.** Under `reduce`, two animations were still running — not from the new hook, which had correctly stayed out of it, but from `tw-animate-css`, which powers the dialog and card animations and does not consult the preference on its own. The design claimed reduced motion was respected while the app still animated. A global `@media (prefers-reduced-motion: reduce)` rule in `src/index.css` now collapses them, and re-running the check confirmed zero animations. This is exactly the class of thing jsdom cannot catch.

  `npm test` 105 passed · `npx tsc -b` clean · `npm run lint` clean · `npm run build` green.

- **Commit 5 — `feat: undo last score change`.** The section 5 additional operation. `lastChange: Score | null` on `InProgressMatch`, one store action, one button.

  **Two bugs found during the commit, both in code written for it:**
  - **The migration was dead code.** `lastChange` was added as a required field, the storage version bumped to 2, and a v1 → v2 migration written. It never ran: the safe-storage validator rejects state that does not match the current shape, and it runs *before* zustand's version gate, so v1 state was discarded at the storage layer and the migration never saw it. Fixed by making the validator tolerant of an absent `lastChange` — its job is "is this recoverable", not "does this match today's type exactly"; migration is what makes it current. The undo action also guards on a falsy `lastChange` rather than `=== null`, so hand-edited storage cannot restore `undefined` as a score.
  - **An accessible name came out wrong.** Composing the Undo button's name from visible text plus an `sr-only` span produced `"Undolast score change: Spain versus Brazil"` — the accessible name algorithm trims each text node before joining them, so a span beginning with a space loses it. The Finish button had escaped this only because its span begins with a colon. Both now compose their names with `aria-label`, and a test pins both strings exactly.

  **Deviation from this document:** D8 said storage version 2 would arrive with the event log. Undo needed it first, so v2 is undo and the event log will be v3. Recorded in D8.

  **Test quality check.** Five mutants, all caught: goals never arming undo (7 failures), undo not disarming and so becoming multi-step (2), a finished match keeping its undo history (1), the migration removed (1), and the undo button never disabled (2).

  **Verified in a real browser.** Undo is disabled on a fresh match, enabled by a goal, restores the previous score, disables itself again, announces "Last change undone. Spain 1 - 0 Brazil.", and disappears entirely once the match is finished. Persisted state reports `version: 2`. Chromium's own accessibility tree — not the test polyfill — resolves exactly one button for the full name `Undo last score change: Spain versus Brazil`.

  `npm test` 119 passed · `npx tsc -b` clean · `npm run lint` clean · `npm run build` green.

- **Commit 6 — `feat: per-match event log with audit trail`.** The distinct feature commit required by the brief, in one commit: event model, store recording across every action, a v2 to v3 migration, the log UI, and its tests.

  **Why this feature.** The score alone tells an operator where a match stands but nothing about how it got there, and this app deliberately offers two ways to take a goal off the board that are arithmetically identical. `GOAL_REMOVED` asserts the goal did not count — disallowed, overturned, awarded to the wrong side. `UNDO` asserts the previous entry was a data-entry error, and names the entry it reverted. Without a record there is no way to tell those apart afterwards, which is exactly what someone reconciling a disputed scoreline needs.

  **Undo appends, never subtracts.** Deleting the mistaken entry would leave a log indistinguishable from one where the mistake never happened — the opposite of an audit trail. A mutant that deleted the reverted entry instead of appending an `UNDO` failed six tests.

  **Decisions taken during implementation:**
  - `ScoreboardDeps` now carries **two** id generators, `matchId` and `eventId`. Production wires both to the same source; separating them stops a test's match ids shifting every time an event is recorded, which is what happened the moment the log started minting ids from the shared generator.
  - `lastChange` grew from a bare `Score` to `{ score, eventId }`, so an `UNDO` entry can name what it reverted rather than the log inferring it from position. The v2 to v3 migration sets it to `null`: a version 2 snapshot names no logged entry, so there is nothing an `UNDO` could point at.
  - Migrated matches get a log seeded with **one** `MATCH_STARTED` entry, stamped from the match's own `startedAt`. Goals scored before the upgrade are absent because they were never recorded — the honest result, rather than a plausible history invented to look complete.
  - The log is collapsed by default with the count on the summary line. An open log on every card would cost the height that made the summary worth being a grid.
  - The list is the scroll container and carries `tabIndex={0}` with an accessible name: a scrollable region that cannot be focused is content only a mouse can read.
  - Entries are not colour-coded. The wording carries the distinction and the marker glyph is `aria-hidden`, because colour or glyph alone must never be the thing that tells two entries apart.

  **Test quality check.** Five mutants, all caught: undo deleting what it reverted (6 failures), a removed goal logged as an ordinary goal (2), the log rendered oldest-first (5), the scroll region not focusable (1), and the migration seeding an empty log (1).

  **Verified in a real browser.** Collapsed by default; opened, it reads newest-first — `Undone: Goal — Brazil` / `Goal — Brazil` / `Goal removed — Spain` / `Goal — Spain` / `Match started`, each with its time and the score that resulted. The region takes keyboard focus, a finished card keeps its full log, persisted state reports `version: 3`, and there were no page errors.

  `npm test` 141 passed · `npx tsc -b` clean · `npm run lint` clean · `npm run build` green.

- **Commit 7 — `test: playwright end-to-end coverage for core flows`.** Three specs, run against the production build on desktop Chrome and a Pixel 5.

  The three were chosen as the ones unit tests *cannot* stand in for, rather than as a second pass over the same ground:
  1. **The example scenario driven through real clicks** — five dialogs and thirty-four goal buttons — rather than seeded into the store. The Vitest ordering test proves the comparator; this proves the operator can actually reach that result through the interface.
  2. **A finished match leaving the summary and keeping its record**, including opening its log and finding the finish entry.
  3. **State surviving a page reload**, which jsdom cannot exercise: it covers the real storage round-trip, and then that undo is still armed and still correct afterwards.

  Auto-waiting turned out to matter. While cards animate to new positions the list stops receiving pointer events, so Playwright waits rather than clicking whatever has slid under the cursor — the same protection D11 gives the operator, confirming from the outside that the hold does what it claims.

  **Test quality check.** Reversing the ordering tiebreak made the first spec fail, so the end-to-end coverage is not vacuous either.

  Kept deliberately cheap and out of the way: 6 tests in about 9 seconds, behind `npm run test:e2e`, never part of `npm test`. A reviewer who clones and runs `npm test` cannot be tripped by a missing browser download; the README documents `npx playwright install` for anyone who wants them.

  **Added at the candidate's request:** the ordering spec now also writes `docs/example-scenario.png`, the screenshot shown in D1. Generating it from the test rather than capturing it by hand means the documentation cannot drift from the behaviour — a broken ordering fails the spec before it reaches the screenshot.

  Three things were needed to make it a committable artefact rather than a source of diff noise: the clock is pinned per kickoff (which also staggers the start times, so the tiebreak is visible rather than merely correct), the browser timezone is pinned to UTC so the rendered times do not depend on the machine, and the capture waits for `document.getAnimations()` to drain. That last one was not a precaution — the first attempt captured two cards overlapping mid-flight, because the final assertion passes as soon as the text settles, which is before the cards have stopped moving. It is written from the desktop project only, so the committed image is one snapshot rather than whichever browser finished last. Re-running produces a byte-identical file.

  `npm test` 141 passed · `npm run test:e2e` 6 passed · `npx tsc -b` clean · `npm run lint` clean · `npm run build` green.


---

## Verification

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm run build        # tsc -b && vite build
npm run lint
npm test             # Vitest — ordering + store + components + integration
npx playwright install
npm run test:e2e     # builds, previews, runs desktop + Pixel 5 projects
```

Manual checks:

1. Start the five example matches in the brief's order and set their scores; confirm the grid reads Uruguay → Spain → Mexico → Argentina → Germany.
2. Finish one match; confirm it leaves the in-progress summary and appears in the collapsed finished group.
3. Reload; confirm state survives.
4. Tab through a card with no mouse; confirm every control is reachable and named.
5. Narrow the viewport to ~375px; confirm the layout is usable.
