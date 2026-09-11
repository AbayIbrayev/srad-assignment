# [AI.md](http://AI.md)

How I used AI on this exercise, and what came out of it.

## Summary

I used **Claude Code (Opus 5)** throughout, but deliberately not as a code generator working from a one-line prompt.

The brief says the requirements "intentionally include open questions and design choices", so I spent the first session using the model as an **adversarial reviewer of my own plan**, before any application code existed. My opening instruction was, in short: _be brutally honest and sceptical, attack this plan rather than build it, find where I misread the brief or contradicted myself, and argue me out of bad ideas while it is still cheap._

That produced several rounds of pushback. Some of my decisions survived it; some did not. Only once it had settled did I write the design up and start building against it, commit by commit.

**Used for:** interrogating the brief, surfacing decisions I had not made, arguing both sides of trade-offs, and writing implementation code and tests against an agreed design.

**Not used for:** deciding the product. Every decision below is mine, including the ones where I overruled the model.

## Decisions I held, against pushback

| Decision                         | The objection                                                                                | Why I kept it                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card grid, not a ranked column   | A grid makes reading order ambiguous, and ordering is the one objectively-graded requirement | An operator watching several matches scans a grid faster than scrolling. Settled by keeping the markup an `<ol>` and putting a visible rank on every card, so both hold |
| Undo before the event log        | Undo introduces the history, so the feature commit is left thin                              | The brief wants the feature commit to be a _larger_ slice, not a later one. Resolved by keeping undo to a single snapshot so the log is purely additive                 |
| Finishing is terminal            | A mis-click then becomes unrecoverable                                                       | Accepted the consequence and added a confirmation step instead of making finish reversible                                                                              |
| `+1` / `−1` only, no score input | With `−1` present, undo looks redundant and §5 allows only one extra operation               | Kept both, but made them mean different things — and built the event log so the difference is recorded, not just claimed                                                |

## Corrections I accepted

- `Date.now()` **was the wrong ordering key.** Timestamps collide within a millisecond and their order is lost across a localStorage round-trip. Replaced with a monotonic registration sequence, which also answered my own open question — an exact tie on goals _and_ start time is no longer reachable.
- **The performance argument for zustand was indefensible.** Nothing in this app ticks, so renders only happen on a click. The store is justified on ergonomics, persistence and testability instead.
- **One live region, not one per card.** Six would interrupt each other on every goal.
- **Two of the model's own criticisms were wrong**, and I checked before acting on them: `cn` is first-party shadcn tooling, not an odd third-party pick, and `shadcn` belongs in `dependencies` because `index.css` imports its stylesheet into the bundle.

## Bugs this process caught

Worth listing, because they are the argument for the working method rather than for the tool:

- An accessible name computed as **"Undolast score change"** — the name algorithm trims each text node before joining them, so a hidden span beginning with a space loses it. The suite was green; my test used a regex that happened to match.
- A **migration that never ran**: the storage guard rejected older state before the version gate reached it, so the upgrade path was dead code.
- The score was initially **hidden from screen readers** and the missing information stuffed into every button label.
- `prefers-reduced-motion` was **claimed but not honoured** — my own animation respected it, the dialog animations did not.
- The first documentation screenshot caught **two cards overlapping mid-animation**, because the assertion before it passes as soon as the text settles.

None of these would have been found by reading the diff, and most were invisible to a passing test suite. Where behaviour could not be proven in jsdom I checked it in a real browser, and I regularly re-ran the suite against deliberately broken code to confirm the tests actually fail when they should.

## Prompt history

```
 ▐▛███▛█   Claude Code v2.1.268
▝▜██████▀  Opus 5 · Claude Pro
  ▝▝ ▝▝    ~/Documents/srad-assignment


❯ /caveman

● CAVEMAN MODE ON — level full.

  Drop articles, filler, hedging. Technical substance stay.
  Code/commits/security warnings: normal prose.

  Switch: /caveman lite|ultra. Off: "stop caveman".

  What you need?

✻ Cogitated for 1s · done 1:35 PM

❯ '/home/aibrayev/Downloads/Coding Exercise version 2 front-end.pdf' your task
  is to review this assignment. be brutally honest and skeptical of the
  approach I am suggesting, I want to find the best way to pass this, not to
  feel good about my plan. there is a lot of requirements deliberately left for
  interpretation so a big part of this is deciding how to handle them and
  being able to defend it later. first, grill me. my plan is below, treat it as
  something to attack and not something to build. i want to be argued of bad
  ideas while it is still cheap and in planning. look for where I misread the
  brief or contradicted it and work that will cause me to possibly loose
  points.  ask me questions with trade-offs for my ambigious points. do not
  make a plan yet, only after a brainstorm with clarifying questions so we both
  have a great understanding of the topic we can go ahead with a proper
  project overview and then a PDR for this assignment. wait for me to approve
  that before you write anything. keep AI.md file going from your first reply,
  appending as we go, what I asked, what you pushed back on, what changed and
  why. we will implement it commit by commit against the PDR. my plan: I have
  bootstrapped a barebones react+ts with vite template with only a few
  components from shadcn I think we will need (to handle accessibility because
  it is rated in the brief), vitest unit and int tests, playwright for end to
  end (playwright was mentioned as optional but I think we could add only the
  most important flows tested so that it has extra coverage since it will be
  mainly written by AI). the user is an operator that monitors live world cup
  matches, so they should land on a dashboard with a start match button. it
  will open a modal where they pick home and away team from dummy options in a
  select component. once statted the match should be added to the dasboard as a
  card on the grid of columns grouped by in progress and finished matches.
  each card has a buttons to change goals and finish the match. for the exactly
  one additional feature I think the undo button because operators can make
  mistakes or goals can be not counted, and for the distinct feature commits I
  want a scrolable list of events that happended during the match on each card
  because it would be more useful for an operator than just scores on the card.
  the undo action should show up on the event list for audit purposes than
  just deleting the event. ordering is important as matches with most goals
  should be at the top of grid and if goals ae equal based on the stat time we
  can order the matches. what if they started at the same time and same goals?
  I added zustand to the project already for the persistance layer because I
  don't want the page to accidently refresh and loose all progress for the
  operator and the localstorage was allowed if you doccument it (in the brief).
  It was mentioned as possible example in one operational feature, so could be
  possibly counted as 2 features not "exactly one" but I think it is not an
  operation that operator does and not a feature but infra and how the store is
  stored if reason is documented. also zustand should be used as per match
  card slector subscription since we don't have the backend and mock api is
  optional and I think not needed for this simple assignment. each card should
  subscribe to its own match, so we re-render only one card instead of all of
  them, since that all of them will be running live simultaniously we need to
  be able to run efficiently. for world cup matches there shouldn't be more
  than 6 matches/cards per day so we shouldn't worry about the load too much or
  virtualising, etc.

  Searched for 1 pattern, listed 1 directory, ran 3 shell commands (ctrl+o to expand)

● Updated plan
  ⎿  /plan to preview

● Read brief (5 pages) + your repo. AI.md log started — parked in plan file,
  since plan mode blocks repo writes. Copies to AI.md as first implementation
  commit.

  Now grill.

  Where plan fight brief

  1. Grid kill your only objectively-scored requirement.
  Ordering is the one thing reviewer can mark right/wrong. They have exact
  expected list (Uruguay, Spain, Mexico, Argentina, Germany). Grid of columns =
  reviewer must decide if flow is row-major or column-major before they can even
  check. You make the graded bit ambiguous to save nothing. Semantic <ol> also
  wins a11y points — brief rates semantic HTML. Grid of <div> does not.

  2. Your perf argument contradict itself, and nothing ticks.
  You wrote "6 matches max, don't worry about load" AND "per-card selector so we
  re-render one card not all". Both can't be true. Worse: no timers, no feed,
  no clock in your plan. Nothing re-renders except on operator click. "All
  running live simultaneously" is decoration — app has zero autonomous updates.
  Interviewer asks "how many cards before context re-render hurt? did you
  measure?" → you lose.
  Zustand still fine. Justify honestly: persist middleware, store testable
  outside React, no provider boilerplate. Not perf.

  3. "-1 button" and "undo" cannibalize each other.
  You said "buttons to change goals". If that means +/− per team, undo is nearly
  redundant → your §5 feature reads as padding. If increment-only, undo is
  genuinely the correction mechanism → strong story. Pick one, can't have both.

  4. Commit order backwards.
  Undo needs history stack. Event list renders history stack. Brief demand
  feature commit be "a second, larger slice of work" in ONE distinct commit. If
  undo ships first, the stack ships with it → event-log commit is a 40-line
  render. Thin. Ship event log first (model + UI + tests + README, one commit,
  obvious message), undo after as small §5 op.

  5. localStorage-as-third-feature risk — real but winnable.
  Brief lists "persist to localStorage" as §5 example. You claim infra. Your
  defense exists in brief: Technical expectations → "Data: In-memory state is
  sufficient; localStorage or a mock API is allowed if you document it." That
  line is separate from §5 and grants it unconditionally. Cite it verbatim in
  README. Do NOT call persistence a feature anywhere — not in README headings,
  not in commit message. Land it in the same commit as store setup, not its own
  commit.

  6. Date.now() tiebreak is broken — you already smelled it.
  Your question "same start time same goals?" answer: don't let it happen.
  Monotonic seq: number incremented per registration is authoritative ordering
  key. Date.now() collides (same ms is easy, and trivially reproducible in
  tests/seed). Also don't lean on Array.sort stability — after localStorage
  rehydrate your insertion order is whatever JSON order was. Explicit total
  order: goals desc, seq desc. Inject now() and id() into store → deterministic
  tests.
  Also brief says "You define what 'start' means" — that's explicit invite.
  Define it: "start = moment operator registers match; registration order is
  authoritative, wall-clock stored for display only."

  7. Team list must contain all 10 example teams.
  Mexico, Canada, Spain, Brazil, Germany, France, Uruguay, Italy, Argentina,
  Australia. Reviewer will try to reproduce the example by hand. If your dummy
  list is "Team A/B/C" they can't → friction, looks careless.

  8. Repo hygiene already leaking points.
  - README.md is still raw Vite template boilerplate, committed. Reviewer opens
    README first.
  - shadcn is in dependencies, belongs in devDependencies (or npx only).
  - src/lib/utils.ts = export { cn } from "cn" — third-party cn package instead
    of clsx+tailwind-merge. Reviewer will ask why. Have answer or swap.
  - 6 shadcn components vendored before any feature exists. Any unused one at
    submit = dead code in a repo graded on "clear structure, maintainable".
    Prune at the end.
  - e2e/ dir empty and committed.

  9. Playwright is optional — treat it as a liability unless green and fast.
  Failure mode: reviewer clones, runs, Playwright wants npx playwright install,
  fails → net negative. If kept: separate test:e2e script (you have it),
  documented install step, 2–3 flows max (start → score → ordering; finish →
  leaves summary; reload → state survives). Must not run as part of npm test. It
  doesn't currently — good.

  10. Decisions you have not made at all (each is a documentable interpretation
  point — free marks, or free lost marks):
  - Can same team be in two in-progress matches? Home == away?
  - Duplicate fixture allowed?
  - Score model: increment-only, +/−, or direct numeric entry? Negative floor?
  - Finished matches: what order? (brief silent → you must pick + document)
  - Can you undo after finish? Can you undo an undo (redo)?
  - Corrupt/stale localStorage JSON → app must not white-screen. Namespaced key
    + version + safe parse.
  - aria-live="polite" on score region so screen reader announces changes.
    Cheap, and brief explicitly grades a11y. Your plan has nothing on this.
  - Nested scrollable event list inside a card is a a11y/UX trap on narrow
    viewport (needs focusable scroll region + accessible name).
    <details>/collapsible or per-match detail may be better.
  - Modal vs inline form: modal costs focus trap, escape, focus return (Radix
    gives free). Inline form is simpler and easier to E2E. Justify whichever.

  What is actually good in your plan

  - Undo as §5 — brief literally names it.
  - Event log as distinct feature — brief literally names "tracking score-change
    history".
  - Undo recorded as event, not deleted → audit trail. Genuinely good operator
    reasoning, defensible in interview.
  - Operator framing throughout. That's the differentiator vs a generic CRUD
    demo.

  Four highest-leverage forks now. Rest after.

● User answered Claude's questions:
  ⎿  · How should the in-progress summary render? → (notes only)
     · What is the score-editing model on an in-progress match? → (notes only)
     · What exactly does Undo revert? → (notes only)
     · Which lands first: the §5 operation or the distinct-commit feature? →
     (notes only)

● Four answers. Two I concede, two still have holes.

  Conceded

  Grid. Your operator argument beats mine — scanning 6 cards at a glance beats
  scrolling a ranked column. Condition: DOM stays <ol>/<li> with display:grid.
  Row-major is grid's natural flow, so semantics and visuals agree, rank badge
  #1..#n on every card makes ordering checkable, and <ol> keeps the a11y point.
  You lose nothing. Finished group below as collapsible <details> or button with
  aria-expanded/aria-controls, count in header.

  Commit order. Your reading is right — brief says "second, larger slice",
  doesn't say later. Undo first, event log second works, and objection #3 dies
  too: with per-team update controls there's no −1 button, so undo isn't
  redundant. Attack downgraded to a churn risk, see Q4.

  Finish terminal — accepted, but it has a price

  Terminal + undo-can't-reach-it means mis-finishing is unrecoverable. So finish
  needs a confirm step, and you must state the rule flat in README: finished
  matches are immutable — no score edits, no undo, log is read-only. Clean rule,
  easy to defend. Without the confirm, a reviewer clicking Finish by accident
  hits a dead end and marks it down.

  Still open — score control

  "Update not just add" is a correct read of requirement 2. But "per-team
  control that can set a value" splits three ways and they are not equal:

  - If per-team −1 — objection #3 comes straight back, undo looks like padding.
  - If per-team numeric input — objection dies, but new problem: commit
    semantics. Typing 10 into an input emits 1 then 10. Per-keystroke = event
    log fills with garbage. Need commit-on-blur/Enter with a pending-value
    buffer. Also empty field → NaN, paste abc, negatives, decimals. All must be
    handled and documented.
  - If both +1 and input — richest and arguably the truest operator model (goal
    vs correction are different acts, log them differently), but doubles a11y
    surface, test matrix, and event kinds.

  Event vocabulary follows from this. +1 gives you GOAL. Direct set gives you
  SCORE_SET { from, to } — and "goals" stop being events, which changes what
  your audit log actually says.

  New contradiction your own feature creates

  You justified the grid with scanability. The event log makes each card tall.
  Six cards with scrollable logs → you scroll again, and nested scroll regions
  inside a grid are a a11y trap (focusable region + accessible name needed).
  Your feature is eating your layout rationale. Needs a decision, not a patch
  later.

  Asserting, not asking

  - Preset teams must include all 10 from the example so a reviewer can
    reproduce it by hand.
  - One Vitest test reproduces the exact example scenario → expects [Uruguay,
    Spain, Mexico, Argentina, Germany]. Directly targets the graded requirement.
    Non-negotiable.
  - Ordering key is monotonic seq, not Date.now(). now() and id() injected into
    the store.
  - Persisted state gets a namespaced versioned key + safe parse; corrupt JSON
    resets to empty, never white-screens.
  - aria-live="polite" on score region.
  - Repo hygiene commit first: real README, shadcn → devDependencies, drop empty
    e2e/, justify or replace the cn package, prune unused shadcn components at
    the end.

● Updated plan
  ⎿  /plan to preview

● User answered Claude's questions:
  ⎿  · Given "update the score, not just add" — what is the exact per-team
     control? → (notes only)
     · Where does the event log live on the card, given the grid is justified by
     scanability? → (notes only)
     · Which validation rules does "Start match" enforce? (pick all that apply)
     → Home ≠ away, A team cannot be in two in-progress matches, No duplicate
     in-progress fixture
     · How deep is undo? → Single step, permanently (Recommended)

● Good. Locked: quick +1 goal button and a score-adjust path per team;
  collapsible scrollable log per card; all three validation rules (note: "no
  duplicate fixture" is fully subsumed by "a team can't be in two live matches"
  — keep one rule, document it covers both); single-step undo, permanent.

  Two consequences of your undo answer, asserting them:

  - Undo reverts the last score change of either kind — a +1 or an adjustment.
    Brief says "undo last score change", it doesn't distinguish. After undo,
    button disables until the next change. No undo-the-undo.
  - Store field is lastChange: ScoreSnapshot | null per match. Never an array.
    That's what keeps the event-log commit additive instead of a rewrite.

  Event vocabulary (asserting)

  MATCH_STARTED · GOAL {team, from, to} · SCORE_ADJUSTED {team, from, to} · UNDO
  {revertedEventId} · MATCH_FINISHED

  Log carries start and finish too, not only scores. Makes it a real audit trail
  and makes the feature commit substantive.

  More asserting, no question needed

  - Card always shows: rank #n, both teams, both scores, total goals, and start
    time. Total + start time make your ordering rule auditable by the reviewer
    without opening anything — that is the cheapest defense of the graded
    requirement.
  - Finished group: ordered most-recently-finished first (brief is silent, so
    it's a documented choice). Collapsed by default with a count in the header —
    that visibly proves finished matches are out of the in-progress summary. No
    rank badges there.
  - Grid: 1 / 2 / 3 columns by viewport.
  - No retention policy on finished matches or event history. Goes in README
    under accepted trade-offs, not fixed in code — a single matchday doesn't
    need it, and adding a "clear finished" button invites feature-count
    questions.
  - README carries an explicit requirement→implementation map quoting the brief,
    so the "exactly one operation" reading is argued for the reviewer rather
    than left for them to guess. Undo = §5. Event log = distinct commit. Score
    adjust = requirement 2, not extra. localStorage = the "Data:" line, not §5.
    Validation and the collapsible finished group = not operations.

  Still bothering me

  Card density. You now have per team: a +1 button and an adjust control. Plus
  undo, finish, collapsible log, rank, total, start time. Six of those on screen
  at once was the whole reason you wanted the grid. Inline number inputs are
  the densest and most fiddly part — and they carry the commit-on-blur,
  empty-field, paste-garbage handling. That's the last real layout decision.

  Second: reviewer cold-start. They clone, run, see an empty board. Reproducing
  your example scenario by hand is 5 modals and 20 score clicks. How much do you
  want to help them.

● User answered Claude's questions:
  ⎿  · Where does the score-adjust control live? → (notes only)
     · How does a reviewer get data on screen to check your ordering? → Tests
     prove it; README says so (Recommended)

● −1 is a real simplification and I'll take it: no inputs, no NaN, no
  commit-on-blur, no extra dialog, card stays dense. Good call.

  But it walks straight back into the objection you overrode two rounds ago. If
  −1 exists, why does undo exist? Mis-click +1 Spain → −1 Spain fixes it. An
  interviewer will ask this in the first two minutes, and "exactly one
  additional operation" means undo is the only thing you get to add — so if it
  reads as redundant, you've spent your single feature slot on nothing.

  There is a good defense, but only if you commit to it now and build it in:

  ▎ −1 and undo mean different things in the audit log. −1 asserts the score is
  ▎ now lower — a goal was disallowed, VAR overturned it, it was awarded to the
  ▎ wrong side. That's a real match event and stays in the record as
  ▎ GOAL_REMOVED. Undo asserts the previous entry was a data-entry error —
  ▎ logged as UNDO, referencing the event it reverted. Same arithmetic,
  ▎ different claim about reality. An operator's audit trail has to distinguish
  ▎ "the goal didn't count" from "I fat-fingered it".

  That defense only holds if the log renders them differently and the README
  says this explicitly. Otherwise undo is a duplicate button.

  Asserting the rest:

  - −1 disabled at 0. Disabled button, not a clamp, not a toast — clearer and
    better for screen readers.
  - Event vocabulary now: MATCH_STARTED · GOAL · GOAL_REMOVED · UNDO
    {revertedEventId} · MATCH_FINISHED.
  - Undo reverts the last score change of either kind — a GOAL or a
    GOAL_REMOVED.
  - Cost accepted: reaching Spain 10 is ten clicks. You chose "tests prove the
    ordering", so this only bites in a live demo. Worth knowing before the
    interview.

● Updated plan
  ⎿  /plan to preview

● User answered Claude's questions:
  ⎿  · With −1 buttons in place, what happens to undo — your one additional
     operation? → (notes only)

● Locked. Undo stays, with GOAL_REMOVED vs UNDO as distinct audit claims.

  One guard on your future-proofing rationale: keep the type open (undo reverts
  the last undoable event, whatever kind) but don't build generalization
  machinery now — a registry of reverters for events that don't exist yet is the
  kind of speculative abstraction reviewers flag. And your own rule already
  fences it: MATCH_FINISHED is explicitly not undoable, since you made finish
  terminal. README says that out loud.

  Brainstorm converged. Writing the overview + PDR now.

  Ran 2 shell commands (ctrl+o to expand)

● Updated plan
  ⎿  /plan to preview

● Overview + PDR written. Summary of what it commits you to:

  Conceded to you: card grid (as <ol>+display:grid with rank badges),
  undo-before-event-log commit order, terminal finish, +1/−1 only, all three
  validation rules, no seeding.

  Held against you: monotonic seq instead of Date.now() for the tiebreak
  (answers your "same time same goals" question — it can't happen), zustand
  justified on ergonomics not perf, single-step undo that never becomes a stack,
  one app-level live region not six, README requirement→implementation map that
  argues the "exactly one operation" reading instead of leaving it to the
  reviewer.

  Unresolved, parked for commit 1: the cn package (export { cn } from "cn"
  instead of the usual clsx + tailwind-merge) and shadcn sitting in
  dependencies. Both are one-line reviewer questions — decide when we get there.
  ⎿  User rejected Claude's plan:
     ╭─────────────────────────────────────────────────────────────────────────╮
     │ Live World Cup Scoreboard — Project Overview & PDR                      │
     │                                                                         │
     │ Context                                                                 │
     │                                                                         │
     │ Sportradar take-home (Coding Exercise version 2 front-end.pdf, Data &   │
     │ Odds Platform). Build a Live Football World Cup scoreboard in React +   │
     │ TypeScript. The brief deliberately underspecifies; the graded skill is  │
     │ making defensible interpretations and documenting them. There is a      │
     │ follow-up interview walking through decisions and trade-offs, so every  │
     │ choice must have a one-sentence defence ready.                          │
     │                                                                         │
     │ The repo is already bootstrapped (ac1f3d6 feat: project setup) with     │
     │ Vite + React 19 + TS, Tailwind 4, oxlint, Vitest + RTL + jsdom,         │
     │ Playwright (desktop + Pixel 5 projects, build-and-preview webServer),   │
     │ zustand, and six vendored shadcn components. src/App.tsx is             │
     │ <main>Hello</main>; nothing else is implemented. README.md is still     │
     │ Vite boilerplate.                                                       │
     │                                                                         │
     │ Intended outcome: a repo that reads like a normal code review           │
     │ submission, reproduces the brief's example ordering provably, and whose │
     │ README pre-empts every "why did you…" question.                         │
     │                                                                         │
     │ ---                                                                     │
     │                                                                         │
     │ Requirement → implementation map                                        │
     │                                                                         │
     │ This mapping is the core defensive artefact and gets written into the   │
     │ README verbatim, with brief quotes.                                     │
     │                                                                         │
     │ ┌─────────────────────────────┬──────────────────────────────────────── │
     │ ───┐                                                                    │
     │ │            Brief            │              Implementation             │
     │   │                                                                     │
     │ ├─────────────────────────────┼──────────────────────────────────────── │
     │ ───┤                                                                    │
     │ │ 1. Start a new match        │ "Start match" dialog, home/away team    │
     │   │                                                                     │
     │ │                             │ selects from a fixed 10-team list       │
     │   │                                                                     │
     │ ├─────────────────────────────┼──────────────────────────────────────── │
     │ ───┤                                                                    │
     │ │ 2. Update the score         │ +1 / −1 buttons per team on each        │
     │   │                                                                     │
     │ │                             │ in-progress card                        │
     │   │                                                                     │
     │ ├─────────────────────────────┼──────────────────────────────────────── │
     │ ───┤                                                                    │
     │ │ 3. Finish a match           │ "Finish" button, confirmation step,     │
     │   │                                                                     │
     │ │                             │ terminal                                │
     │   │                                                                     │
     │ ├─────────────────────────────┼──────────────────────────────────────── │
     │ ───┤                                                                    │
     │ │ 4. Summary in progress      │ Ranked card grid; total goals desc,     │
     │ ties  │                                                                 │
     │ │                             │ → seq desc (most recently started       │
     │ first)  │                                                               │
     │ ├─────────────────────────────┼──────────────────────────────────────── │
     │ ───┤                                                                    │
     │ │ 5. Exactly one additional   │ Undo last score change (single-step,    │
     │ per  │                                                                  │
     │ │ operation                   │ match)                                  │
     │   │                                                                     │
     │ ├─────────────────────────────┼──────────────────────────────────────── │
     │ ───┤                                                                    │
     │ │ Distinct git commit feature │ Per-match event log / audit trail       │
     │   │                                                                     │
     │ │                             │ (collapsible, scrollable, per card)     │
     │   │                                                                     │
     │ ├─────────────────────────────┼──────────────────────────────────────── │
     │ ───┤                                                                    │
     │ │ "Data: localStorage …       │ zustand persist → localStorage.         │
     │   │                                                                     │
     │ │ allowed if you document it" │ Documented under Data, never described  │
     │ as │                                                                    │
     │ │                             │  a feature                              │
     │   │                                                                     │
     │ ├─────────────────────────────┼──────────────────────────────────────── │
     │ ───┤                                                                    │
     │ │ Tests                       │ Vitest + RTL (required), Playwright     │
     │   │                                                                     │
     │ │                             │ (optional, 3 flows)                     │
     │   │                                                                     │
     │ ├─────────────────────────────┼──────────────────────────────────────── │
     │ ───┤                                                                    │
     │ │ Accessibility               │ Semantic <ol>/<li>, labelled controls,  │
     │   │                                                                     │
     │ │                             │ single app-level live region            │
     │   │                                                                     │
     │ ├─────────────────────────────┼──────────────────────────────────────── │
     │ ───┤                                                                    │
     │ │ Responsive                  │ 1 / 2 / 3 column grid                   │
     │   │                                                                     │
     │ └─────────────────────────────┴──────────────────────────────────────── │
     │ ───┘                                                                    │
     │                                                                         │
     │ Explicitly argued in the README as not additional operations:           │
     │ score-adjust controls (they are requirement 2), start-match validation, │
     │ the collapsible finished section (brief: "you may show finished         │
     │ matches elsewhere if you like"), and persistence.                       │
     │                                                                         │
     │ ---                                                                     │
     │                                                                         │
     │ PDR — decisions and rationale                                           │
     │                                                                         │
     │ D1. Ordering is a pure function over a monotonic sequence               │
     │                                                                         │
     │ seq: number increments per registration and is the authoritative        │
     │ ordering key. startedAt: number (wall clock) is stored for display      │
     │ only.                                                                   │
     │                                                                         │
     │ // src/domain/ordering.ts                                               │
     │ export const totalGoals = (m: Match) => m.home + m.away                 │
     │ export const compareMatches = (a: Match, b: Match) =>                   │
     │   totalGoals(b) - totalGoals(a) || b.seq - a.seq                        │
     │                                                                         │
     │ Why not Date.now(): two matches registered in the same millisecond      │
     │ collide, which is trivially reproducible in tests and in any            │
     │ seeded/imported data, and Array.prototype.sort stability cannot rescue  │
     │ it because insertion order is lost across a localStorage rehydrate. seq │
     │ gives a total order that survives serialisation. This directly answers  │
     │ the user's own open question ("what if same start time and same         │
     │ goals?") — it cannot happen.                                            │
     │                                                                         │
     │ "You define what 'start' means": start = the moment the operator        │
     │ registers the match. Registration order is authoritative; wall-clock is │
     │ presentational.                                                         │
     │                                                                         │
     │ now() and id() are injected into the store so tests are deterministic.  │
     │                                                                         │
     │ D2. Layout — grid, but semantically a list                              │
     │                                                                         │
     │ Card grid, row-major, 1 / 2 / 3 columns via repeat(auto-fill,           │
     │ minmax(320px, 1fr)). Chosen over a ranked column because an operator    │
     │ monitoring several simultaneous matches scans a grid faster than        │
     │ scrolling.                                                              │
     │                                                                         │
     │ The DOM element is <ol> / <li> with display: grid — semantics and       │
     │ visual order agree, <ol> is the correct element for a ranked summary,   │
     │ and every card carries a visible #n rank badge so a reviewer can verify │
     │ ordering without counting.                                              │
     │                                                                         │
     │ Each card shows: rank, both teams, both scores, total goals, start      │
     │ time. Total and start time make the ordering rule auditable at a glance │
     │ — the cheapest possible defence of the only objectively-graded          │
     │ requirement.                                                            │
     │                                                                         │
     │ Finished matches live in a separate collapsed <details> group below,    │
     │ ordered most-recently-finished first (brief is silent → documented      │
     │ choice), no rank badges. Collapsed-with-count visibly proves finished   │
     │ matches are absent from the in-progress summary.                        │
     │                                                                         │
     │ D3. Score model — +1 / −1, and why undo is still not redundant          │
     │                                                                         │
     │ +1 and −1 per team. No numeric inputs: no NaN/empty/paste guards, no    │
     │ commit-on-blur buffering, no third dialog, card stays dense. −1 is      │
     │ disabled at 0 (a disabled control, not a silent clamp or a toast —      │
     │ clearer for screen readers).                                            │
     │                                                                         │
     │ The redundancy objection ("isn't undo just −1?") is answered by making  │
     │ them different claims about reality:                                    │
     │                                                                         │
     │ - GOAL_REMOVED — the score is genuinely lower. Goal disallowed, VAR     │
     │   overturned, awarded to the wrong side. A real match event that stays  │
     │   in the record.                                                        │
     │ - UNDO — the previous entry was a data-entry error. References the      │
     │   event it reverted.                                                    │
     │                                                                         │
     │ Same arithmetic, different audit meaning. The log renders them          │
     │ distinctly and the README states this. This is a naming and             │
     │ documentation commitment made now specifically so it is not discovered  │
     │ during the interview.                                                   │
     │                                                                         │
     │ D4. Undo — single step, permanent, score-only                           │
     │                                                                         │
     │ lastChange: { prev: ScoreSnapshot } | null per match. Never an array.   │
     │ After undoing there is nothing further to undo until the next change;   │
     │ the button disables.                                                    │
     │                                                                         │
     │ Two reasons: it matches the brief's singular wording ("undo last score  │
     │ change"), and it keeps the later event-log commit purely additive       │
     │ rather than a rewrite of a history stack shipped one commit earlier —   │
     │ which is what preserves the brief's requirement that the feature commit │
     │ be "a second, larger slice of work".                                    │
     │                                                                         │
     │ Undo reverts the last score change of either kind (GOAL or              │
     │ GOAL_REMOVED). MATCH_FINISHED is explicitly not undoable — finish is    │
     │ terminal. The event type union stays open so other undoable kinds could │
     │ be added later, but no reverter-registry abstraction is built for       │
     │ events that do not exist.                                               │
     │                                                                         │
     │ D5. Finish is terminal                                                  │
     │                                                                         │
     │ Finished matches are immutable: no score edits, no undo, read-only log. │
     │ Consequence: a mis-click is unrecoverable, so Finish carries a          │
     │ confirmation step. The immutability rule is stated flatly in the        │
     │ README.                                                                 │
     │                                                                         │
     │ D6. Validation on start                                                 │
     │                                                                         │
     │ - Home ≠ away.                                                          │
     │ - A team cannot appear in two in-progress matches.                      │
     │                                                                         │
     │ The second subsumes "no duplicate in-progress fixture" — one rule is    │
     │ implemented and the README documents that it covers both. Unavailable   │
     │ teams are disabled in the selects (with the reason surfaced), not       │
     │ merely rejected on submit.                                              │
     │                                                                         │
     │ The preset team list contains all ten example-scenario teams — Mexico,  │
     │ Canada, Spain, Brazil, Germany, France, Uruguay, Italy, Argentina,      │
     │ Australia — so a reviewer can reproduce the expected ordering by hand.  │
     │                                                                         │
     │ D7. State — zustand, justified honestly                                 │
     │                                                                         │
     │ zustand + persist middleware. Justification in the README is            │
     │ ergonomics, persistence middleware, and a store testable outside React  │
     │ — not performance.                                                      │
     │                                                                         │
     │ The performance argument is deliberately not made: nothing in this app  │
     │ ticks (no timers, no feed), so renders only occur on operator click,    │
     │ and at ~6 concurrent matches the difference against useReducer +        │
     │ context is unmeasurable. Claiming otherwise invites "how many cards     │
     │ before it matters, did you measure?" — a question with no good answer.  │
     │                                                                         │
     │ The container selects the ordered list of ids with a shallow            │
     │ comparator; each card selects its own match by id. Framed as clarity of │
     │ data flow, with the negligible re-render saving noted as a side effect  │
     │ rather than the reason.                                                 │
     │                                                                         │
     │ D8. Persistence                                                         │
     │                                                                         │
     │ Key srad-scoreboard, version: 1, bumped to 2 when events[] lands (with  │
     │ a migration giving pre-existing matches an empty log). Corrupt or       │
     │ unparseable stored state resets to empty rather than white-screening.   │
     │ Documented under the brief's "Data:" line.                              │
     │                                                                         │
     │ No retention policy on finished matches or event history — recorded in  │
     │ the README as an accepted trade-off. A "clear finished" button is       │
     │ deliberately not added, because it would invite feature-count questions │
     │ against "exactly one additional operation".                             │
     │                                                                         │
     │ D9. Accessibility                                                       │
     │                                                                         │
     │ - <ol>/<li> for both summaries; <details>/<summary> for collapsibles.   │
     │ - Radix Dialog for start + finish-confirm (focus trap, ESC, labelled    │
     │   title/description). Radix Select with associated <Label>.             │
     │ - Buttons carry real accessible names — aria-label="Add goal for        │
     │   Spain", not +.                                                        │
     │ - One app-level aria-live="polite" region announcing the last change    │
     │   ("Spain 2, Brazil 1"). Not one per card — six simultaneous live       │
     │   regions is screen-reader spam.                                        │
     │ - Scrollable log container is tabIndex={0} with an accessible name so   │
     │   it is keyboard-reachable.                                             │
     │ - Finishing a match removes its card, so focus moves to the in-progress │
     │   section heading and the change is announced.                          │
     │ - prefers-reduced-motion respected.                                     │
     │ - Any compromise found during build gets a README line rather than      │
     │   being quietly dropped.                                                │
     │                                                                         │
     │ D10. Testing                                                            │
     │                                                                         │
     │ - src/domain/ordering.test.ts — pure sort. Reproduces the brief's       │
     │   example scenario exactly, asserting [Uruguay, Spain, Mexico,          │
     │   Argentina, Germany], plus tie cases and the seq tiebreak.             │
     │ - src/store/*.test.ts — start/score/finish/undo, validation rules,      │
     │   persist rehydrate, corrupt-state recovery, injected clock and id.     │
     │ - RTL component tests — StartMatchDialog, MatchCard, EventLog, queried  │
     │   by role and accessible name (which also proves the a11y claims).      │
     │ - RTL integration test — start → score → order changes → finish →       │
     │   leaves summary.                                                       │
     │ - Playwright (3 flows only, npm run test:e2e, never part of npm test):  │
     │   example scenario through the real UI; finish moves a match to the     │
     │   finished group; reload preserves state. Runs against build + preview; │
     │   README documents npx playwright install.                              │
     │                                                                         │
     │ ---                                                                     │
     │                                                                         │
     │ Commit plan                                                             │
     │                                                                         │
     │ Each commit is self-contained and green.                                │
     │                                                                         │
     │ 1. chore: replace template README, tidy dependencies — real README      │
     │    skeleton, shadcn → devDependencies, resolve the cn package question, │
     │    drop the empty e2e/ placeholder, initial AI.md.                      │
     │ 2. feat: match domain model and summary ordering — types,               │
     │    compareMatches, ordering tests incl. the example scenario.           │
     │ 3. feat: scoreboard store with localStorage persistence — zustand       │
     │    slice, start/score/finish, validation, persist v1, store tests.      │
     │ 4. feat: start, update score and finish UI — dialog, <ol> grid, cards,  │
     │    finished group, a11y wiring, RTL tests.                              │
     │ 5. feat: undo last score change — the §5 additional operation.          │
     │ 6. feat: per-match event log with audit trail — the distinct feature    │
     │    commit. Event union, persist v2 + migration, collapsible scrollable  │
     │    log, GOAL_REMOVED vs UNDO rendering, tests, and its README section — │
     │    all in this one commit.                                              │
     │ 7. test: playwright end-to-end coverage for core flows                  │
     │ 8. docs: finalise README and AI.md — assumptions, trade-offs,           │
     │    requirement map, a11y compromises, run instructions.                 │
     │                                                                         │
     │ AI.md is appended in every commit, not written at the end.              │
     │                                                                         │
     │ ---                                                                     │
     │                                                                         │
     │ Verification                                                            │
     │                                                                         │
     │ npm install                                                             │
     │ npm run dev          # http://127.0.0.1:5173                            │
     │ npm run build        # tsc -b && vite build                             │
     │ npm run lint                                                            │
     │ npm test             # Vitest — ordering + store + components +         │
     │ integration                                                             │
     │ npx playwright install                                                  │
     │ npm run test:e2e     # builds, previews, runs desktop + Pixel 5         │
     │ projects                                                                │
     │                                                                         │
     │ Manual: start the five example matches in brief order, set their        │
     │ scores, confirm the grid reads Uruguay → Spain → Mexico → Argentina →   │
     │ Germany; finish one and confirm it leaves the in-progress summary and   │
     │ appears in the collapsed finished group; reload and confirm state       │
     │ survives; tab through a card with no mouse; narrow the viewport to      │
     │ ~375px.                                                                 │
     │                                                                         │
     │ ---                                                                     │
     │                                                                         │
     │ AI.md running log                                                       │
     │                                                                         │
     │ ▎ Plan mode blocked repo writes, so this log accumulated here and is    │
     │ ▎ copied into AI.md in commit 1.                                        │
     │                                                                         │
     │ Entry 1 — 2026-09-11 — brief review + plan grilling                     │
     │                                                                         │
     │ What the user asked for                                                 │
     │ Review the exercise PDF, be brutally honest and skeptical, attack the   │
     │ proposed plan rather than build it, find                                │
     │ misreadings/contradictions/point-losing work, ask trade-off questions   │
     │ on ambiguous points. No plan or code until after a brainstorm, then a   │
     │ project overview, then a PDR, then explicit approval. Keep this log     │
     │ from the first reply onward. Implement commit by commit against the     │
     │ PDR.                                                                    │
     │                                                                         │
     │ User's original plan                                                    │
     │ Vite React+TS, shadcn components pre-added for a11y, Vitest, Playwright │
     │ for a few critical flows. Operator dashboard with "Start match" →       │
     │ modal with home/away selects. Started matches render as cards on a grid │
     │ grouped by in-progress and finished. Card has goal buttons and finish.  │
     │ §5 = undo. Distinct feature = per-card scrollable event list, with      │
     │ undo recorded as an event rather than deleting, for audit. Ordering by  │
     │ goals then start time. zustand for persistence plus per-card selector   │
     │ subscriptions to avoid re-rendering all cards. Argued localStorage is   │
     │ infrastructure, not the §5 operation. ~6 concurrent matches so no       │
     │ virtualisation.                                                         │
     │                                                                         │
     │ What I pushed back on (round 1)                                         │
     │ 1. Card grid obscures the one objectively-graded requirement            │
     │    (ordering); proposed a semantic ranked <ol>.                         │
     │ 2. Internal contradiction: "only ~6 matches, don't worry about load" vs │
     │    "per-card selectors so we don't re-render everything". Nothing in    │
     │    the app ticks, so renders happen only on click — the perf            │
     │    justification for zustand is indefensible in interview;              │
     │    ergonomics/persist/testability is not.                               │
     │ 3. A −1 button would make undo near-redundant, so §5 would look like    │
     │    padding.                                                             │
     │ 4. Commit ordering risk: undo and the event log share one history       │
     │    structure, so if undo ships a general stack first the "larger slice" │
     │    commit is thin.                                                      │
     │ 5. localStorage triple-count risk — defensible via the brief's separate │
     │    "Data:" line, but must never be worded as a feature.                 │
     │ 6. Date.now() as ordering key is collision-prone and non-deterministic; │
     │    proposed monotonic seq + injected clock/id.                          │
     │ 7. Preset team list must contain all 10 example teams.                  │
     │ 8. Repo hygiene: Vite boilerplate README committed, shadcn in           │
     │    dependencies, unusual cn package, pre-vendored shadcn components     │
     │    risk reading as dead code, empty e2e/.                               │
     │ 9. Surfaced undecided: validation rules, score bounds, finished-list    │
     │    ordering, undo-after-finish, corrupt-localStorage handling,          │
     │    aria-live.                                                           │
     │                                                                         │
     │ What changed and why (round 1 resolution)                               │
     │ - Layout — user held, I conceded. Grid with explicit per-card priority  │
     │   and a collapsible finished group below; an operator scans a grid      │
     │   faster than a scrolling column. Accepted on condition the DOM stays   │
     │   <ol>/<li> with display: grid and every card carries a visible rank,   │
     │   which keeps ordering verifiable and the a11y point intact.            │
     │ - Commit order — user held, I conceded. Undo first, event log second.   │
     │   The brief requires the feature commit be a "second, larger slice",    │
     │   not that it come later. My objection downgraded to a churn risk,      │
     │   resolved by D4 (single-step undo, never a stack).                     │
     │ - Finish — user decided. Terminal and immutable. I raised the           │
     │   consequence: a mis-click becomes unrecoverable, so a confirmation     │
     │   step is required and the rule must be explicit in the README.         │
     │ - Score model — user rejected increment-only, citing requirement 2's    │
     │   "change the score". Later reversed again, see round 3.                │
     │                                                                         │
     │ Entry 2 — rounds 2 and 3                                                │
     │                                                                         │
     │ Round 2 decisions                                                       │
     │ Quick +1 plus an adjust path (later reversed); collapsible scrollable   │
     │ log per card; all three validation rules (I noted rule 3 is subsumed by │
     │ rule 2 — one rule implemented, documented as covering both); undo       │
     │ single-step and permanent.                                              │
     │                                                                         │
     │ Round 3 — user reversed the score control                               │
     │ Dropped the adjust input/dialog: +1 / −1 only. Reason:                  │
     │ over-complication. I accepted — it removes NaN/empty/paste guards,      │
     │ commit-on-blur buffering and a third dialog, and keeps cards dense,     │
     │ which was the grid's whole rationale.                                   │
     │                                                                         │
     │ Round 3 pushback                                                        │
     │ Re-raised the objection the round-2 answer had temporarily dissolved:   │
     │ with −1 present, undo looks redundant, and §5 grants exactly one        │
     │ operation, so a redundant undo wastes the only slot. Offered the        │
     │ defence that rescues it — GOAL_REMOVED and UNDO make different claims   │
     │ about reality and must be logged distinctly.                            │
     │                                                                         │
     │ Cold start — user decided                                               │
     │ No seeding in the product. Tests prove the ordering; the README points  │
     │ at them. Zero added product surface, so nothing can be miscounted as a  │
     │ fifth operation. Accepted cost: empty board on first load.              │
     │                                                                         │
     │ Entry 3 — round 4                                                       │
     │                                                                         │
     │ User's call: keep undo with the sharpened GOAL_REMOVED vs UNDO          │
     │ semantics. Rationale added by the user: it future-proofs the approach,  │
     │ since other event kinds could later become undoable.                    │
     │                                                                         │
     │ My guard on that rationale: keep the event type union open, but build   │
     │ no reverter-registry abstraction for events that do not exist —         │
     │ speculative generality is a review flag. And the user's own             │
     │ terminal-finish rule already fences it: MATCH_FINISHED is explicitly    │
     │ not undoable, and the README says so.                                   │
     │                                                                         │
     │ Outcome: brainstorm converged; overview and PDR above written for       │
     │ approval.                                                               │
     ╰─────────────────────────────────────────────────────────────────────────╯

● Plan mode still blocks repo writes — I need approval to exit before I can
  create those files. Reframing the plan so its first step is exactly that, then
  re-requesting.

  One flag first: the brief requires README.md and AI.md. PDR.md is extra. Not a
  problem — it shows process — but it must not become a second, diverging copy
  of the README. Split: PDR.md = design record, decisions and rationale, frozen
  once agreed. README.md = reviewer-facing, assumptions/trade-offs/run
  instructions/feature docs. PDR.md links to README, not the reverse.

● Updated plan
  ⎿  /plan to preview

● Plan mode exited. Writing both documents.

  Read 2 files (ctrl+o to expand)

● Both written, untracked, not committed.

  PDR.md (189 lines) — Context, requirement→implementation map with the "not an
  additional operation" defenses, D1–D10 with rationale and rejected
  alternatives, 9-commit plan, verification steps. Links out to README, not the
  reverse.

  AI.md (104 lines) — "how AI was used" summary plus all 5 rounds: what you
  asked, what I pushed back on, what changed and why, and which alternatives you
  rejected and on what grounds. Records where you overruled me (grid, commit
  order, terminal finish, +1/−1) and where you took the correction (seq over
  Date.now(), zustand justification, one live region).

  Note on commit numbering: PDR's plan has 9 commits, since writing these two
  docs became commit 1. Implementation now starts at commit 2 (chore: replace
  template README, tidy dependencies).

  Two things still parked for that commit: the cn package (export { cn } from
  "cn" rather than clsx + tailwind-merge) and shadcn in dependencies. Both are
  one-line reviewer questions.

  Say the word and I commit these as docs: add PDR and AI usage log, then start
  commit 2.

✻ Sautéed for 4m 41s · done 3:16 PM
❯ commit these and start commit 2 implementation. do not commit it until I
  approve. from now on with each commit update PDR with updated progress to
  stay on track

  Searched for 1 pattern, ran 2 shell commands (ctrl+o to expand)

● Commit 1 landed. Now commit 2 — investigating the cn package before deciding.

  Listed 1 directory (ctrl+o to expand)

● cn question resolved — it's not a random package. github.com/shadcn-ui/cn,
  first-party shadcn, described as a drop-in replacement for clsx +
  tailwind-merge. My flag was wrong; keeping it, and documenting why so a
  reviewer doesn't have to ask.

  e2e/ also dissolves: it's empty and was never tracked (git doesn't track empty
  dirs), and playwright.config.ts points testDir at it. Leaving it for commit
  8.

  Read 1 file, ran 7 shell commands (ctrl+o to expand)

● Commit 1 landed (2b349c7). Commit 2 staged in the working tree, not committed.

  Commit 2 shrank — two of my own flags were wrong

  Checked before acting, both failed:

  - cn package — not third-party junk. It's shadcn-ui/cn, first-party, a
    compiled drop-in for clsx + tailwind-merge, and what the current CLI
    generates. Nothing to fix.
  - shadcn in dependencies — correct where it is. src/index.css does @import
    "shadcn/tailwind.css", so it's a build input to the production bundle.
    Moving it would break npm ci --omit=dev.
  - Empty e2e/ — never tracked; git doesn't track empty dirs.
    playwright.config.ts points testDir at it. Stays for commit 8.

  All three are now documented in the README's Tooling notes instead, so a
  reviewer never has to ask. Both wrong calls are recorded in AI.md rather than
  quietly dropped — that's the honest version of the record, and it's the same
  lesson in both directions.

  What's in the working tree

  - README.md — replaced boilerplate. Intro, Node requirement verified against
    Vite's own engines (^20.19.0 || >=22.12.0, not guessed), full script list,
    why Playwright is deliberately out of npm test, project structure,
    three-document map, tooling notes.
  - PDR.md — Status column + Progress log added (your standing instruction),
    commit 2 row corrected to what actually happened.
  - AI.md — round 6 entry.

  Behavioural sections — assumptions, trade-offs, a11y, the operation, the
  feature — deliberately not stubbed. Empty headings describing behaviour that
  doesn't exist would make the README false at this commit. Each lands in the
  commit that makes it true.

  Verification

  npm run lint clean. npm run build green. npm test exits 1 with "No test files
  found" — expected, first tests land in commit 3, and this commit touches no
  code.

  Proposed message:

  docs: replace Vite template README

  Replaces the unmodified Vite boilerplate with documentation a reviewer
  can actually use: how to install, run, build, lint and test, and why the
  Playwright suite is kept out of `npm test` so a fresh clone never fails
  on a missing browser download.

  Adds tooling notes answering the three things in this repo that look
  wrong at a glance but are not: `cn` is first-party shadcn tooling rather
  than an unusual third-party pick, `shadcn` belongs in dependencies
  because index.css imports its stylesheet into the bundle, and the
  vendored shadcn components are excluded from linting because they are
  generated rather than hand-authored.

  Behavioural sections are deliberately omitted rather than stubbed --
  documenting behaviour that does not exist yet would make the README
  false at this commit.

  Approve and I commit, then start commit 3 (domain model + ordering, with the
  example-scenario test).

✻ Cooked for 1m 41s · done 3:24 PM

❯ forget about readme for now because I will write my own thoughts there.
  proceed with the next commit

● Taking "forget about README" literally: I'll leave my draft uncommitted in the
  working tree and stop touching it — it's yours to write. Note git checkout
  README.md would restore Vite boilerplate, so the draft is the better base if
  you want one.

  Renumbering: the domain model becomes commit 2.

  Read 1 file, ran 3 shell commands (ctrl+o to expand)

● Tests verified against a mutant — reversing the tiebreak fails 5 of them, so
  they're not vacuous. Now syncing docs.

  Ran 2 shell commands (ctrl+o to expand)

● Commit 2 work done, not committed. Waiting on your approval.

  What landed

  Domain layer only — no store, no UI.

  - src/domain/match.ts — Match is a discriminated union of InProgressMatch |
    FinishedMatch, not a status field beside a nullable finishedAt. A finished
    match always has finishedAt; an in-progress one can't. Illegal states
    unrepresentable, not merely unlikely. isInProgress / isFinished guards. The
    seq doc comment carries D1's reasoning at the exact spot someone would try
    to "simplify" it back to startedAt.
  - src/domain/teams.ts — ten-team roster, all example-scenario teams present.
  - src/domain/ordering.ts — totalGoals, compareInProgress, compareFinished,
    summariseInProgress, summariseFinished. Both selectors filter by status
    internally, so exactly one place can get "finished must not appear" wrong.
  - src/domain/ordering.test.ts — 13 tests.

  Two deviations from the PDR, both recorded

  - PDR sketched flat home/away on Match. Implemented as nested score: Score —
    the undo snapshot in D4 is a Score, so one shape beats two shapes that
    happen to agree.
  - Match.homeTeam is string, not the Team union. A real deployment loads the
    roster from a feed; the domain model shouldn't couple to a list hard-coded
    for an exercise. Team stays exported for the picker.

  Test quality checked, not assumed

  13 green proves little when the same tool wrote code and tests. Re-ran against
  a mutant with the tiebreak reversed (a.seq - b.seq) — 5 failed, including the
  example-scenario test. The suite catches what it exists to catch.

  npm test 13 passed · tsc -b clean · oxlint clean · build green.

  README

  Untouched from here on. My draft sits uncommitted in the working tree — keep
  it as a base or discard it. Note git checkout README.md restores Vite
  boilerplate, so discarding costs you the run instructions. PDR commit plan now
  ends at commit 8 docs: finalise README, marked authored by the candidate, not
  generated.

  Proposed message:

  feat: match domain model and summary ordering

  Models a match as a discriminated union of in-progress and finished
  rather than a status field beside a nullable finish time, so a finished
  match always carries one and an in-progress match cannot.

  Ordering is a pure function over a monotonic registration sequence
  rather than a wall-clock timestamp. Timestamps collide within a
  millisecond and their relative order is not recoverable once state has
  been serialised to localStorage and read back, so "tied on goals and on
  start time" would otherwise be reachable and unresolvable. Finished
  matches are ordered most recently finished first, which the brief leaves
  open.

  Both summary selectors filter by status internally so there is exactly
  one place that can get "finished matches must not appear in the
  summary" wrong.

  Tests reproduce the brief's example scenario exactly, and assert the
  ordering survives arriving in a different array order -- the rehydrate
  case, where insertion order is gone and sort stability cannot help.

  Approve and I commit, then start commit 3 (zustand store, validation,
  persistence).

✻ Crunched for 1m 29s · done 3:28 PM

❯ add emoji flags for dummy countries to make UI more interactive

● Folding into commit 2 since it's uncommitted — flags belong with the roster.

  Two risks worth naming before I write it: flag emoji must be aria-hidden with
  the team name as real text beside them (screen readers announce
  regional-indicator pairs inconsistently — "regional indicator symbol letter
  A"), and Windows Chrome doesn't render them at all, showing letter pairs
  instead. Both are documentable, neither is a reason not to do it.

  Ran 2 shell commands (ctrl+o to expand)

● Flags added to commit 2 (still uncommitted).

  src/domain/teams.ts — TEAMS is now { name, flag }[]; Team derives from it as
  (typeof TEAMS)[number]['name']. flagFor(name) is built from the roster, not a
  second literal beside it, so a team can't be added without a flag. Unknown
  name returns undefined, not a placeholder — a match persisted under an older
  roster renders its name plainly instead of borrowing another country's flag.

  src/domain/teams.test.ts — 6 tests: all ten example teams present, no
  duplicate names, alphabetical (so the picker needs no sort of its own), every
  flag exactly two codepoints in U+1F1E6–U+1F1FF and distinct, flagFor
  round-trips, unknown returns undefined.

  That codepoint test earns its place — a stray ASCII letter or a half-formed
  pair renders as plain text, which looks like a styling bug and would otherwise
  slip through.

  Two constraints now baked in, documented in PDR D6

  - Flags are decorative: aria-hidden, team name beside them as real text. Never
    a team's only label. Keeps them on the right side of the graded a11y
    requirement instead of quietly working against it.
  - Windows Chrome renders no flag glyphs — shows "AR", "BR". Degrades to a
    readable abbreviation, not a broken box, so it's an accepted trade-off. Goes
    in the README as known, because a reviewer hitting it on their own machine
    marks it down if it looks accidental.

  Enforcement lands in commit 4 (UI), where the aria-hidden actually gets
  written.

  npm test 19 passed · tsc -b clean · oxlint clean · build green.

  Commit message adds one paragraph:

  Each team carries a regional-indicator flag emoji as a scanning aid --
  an operator watching six cards picks out a flag faster than a name. The
  flag is decorative: it is rendered aria-hidden with the team name beside
  it as real text, because screen readers announce regional indicator
  pairs inconsistently and a flag must never be a team's only label. The
  lookup is derived from the roster rather than duplicated beside it, so a
  team cannot be added without one.

  Approve and I commit, then start commit 3 (zustand store, validation,
  persistence).

✻ Baked for 38s · done 3:32 PM

❯ ok, commit and then proceed with the next one

  Ran 1 shell command (ctrl+o to expand)

● Committed 1bd7377. Starting commit 3 — store, validation, persistence.

  Read 1 file, ran 9 shell commands (ctrl+o to expand)

● Probed rather than assumed: version mismatch with no migrate discards state
  and starts empty (logs "State loaded from storage couldn't be migrated since
  no migrate function was provided"). Fail-safe, and it pins the baseline for
  commit 6's v1→v2 migration. Adding it as a real test.

  Ran 2 shell commands (ctrl+o to expand)

● Commit 3 done, not committed.

  What landed

  - src/domain/validation.ts — validateStartMatch returns an error code or null;
    teamsInPlay exported separately because the picker needs it (disable at the
    point of choice, not reject on submit). A test pins that "no duplicate
    fixture" needs no rule of its own — it falls out of "a team plays one match
    at a time" — so the redundant third rule can't be added back without a test
    objecting. Finished matches release their teams, so a fixture can be
    replayed.
  - src/store/safe-persist-storage.ts — D8's "must not white-screen" made
    concrete. createJSONStorage parses whatever's under the key and trusts it;
    this validates envelope and state, and on failure removes the key. Also
    guards storage access (localStorage throws outright in a private window or
    with site data blocked) and swallows quota errors, so the board keeps
    working in memory and merely stops surviving a reload.
  - src/store/scoreboard.ts — matches keyed by id. Every score change funnels
    through one updateInProgress, so "finished is immutable" is enforced in one
    place instead of three call sites where one eventually gets forgotten.
    No-ops return the identical state object, so they re-render nothing.

  Three things the PDR didn't anticipate

  - crypto.randomUUID doesn't exist outside a secure context — including hitting
    the dev server from a phone on the LAN, exactly what you'd do to check the
    responsive layout. Falls back instead of throwing.
  - Probed rather than assumed: zustand with no migrate discards
    version-mismatched state and starts empty, logging a warning. Right failure
    mode, now pinned by a test so commit 6's v1→v2 migration has a baseline to
    replace.
  - No reset action. Tests use the factory; component tests can use zustand's
    built-in setState. A production reset is another operation a reviewer could
    count against "exactly one" — same argument the PDR already makes against
    "clear finished".

  Test quality

  69 passing proves little when one tool wrote both sides. Four mutants, all
  caught:

  ┌───────────────────────────────┬──────────┐
  │            mutant             │ failures │
  ├───────────────────────────────┼──────────┤
  │ terminal-finish guard removed │ 3        │
  ├───────────────────────────────┼──────────┤
  │ zero floor removed            │ 1        │
  ├───────────────────────────────┼──────────┤
  │ start validation bypassed     │ 3        │
  ├───────────────────────────────┼──────────┤
  │ no-op short-circuit removed   │ 1        │
  └───────────────────────────────┴──────────┘

  tsc -b clean · oxlint clean · build green.

  feat: scoreboard store with localStorage persistence

  Adds the state layer: start, update score and finish, with the two
  validation rules and persistence across reloads.

  Every score change funnels through one in-progress guard, so "a finished
  match is immutable" is enforced in a single place rather than repeated
  at three call sites and eventually forgotten at one of them. No-ops --
  removing a goal at zero, finishing an already-finished match -- return
  the identical state object so they re-render nothing.

  Rehydration is guarded rather than trusted. The default JSON storage
  parses whatever sits under the key and hands it back, so a truncated or
  stale value rehydrates into a shape the selectors do not expect and the
  operator gets a blank screen on every reload with no way to clear it
  from the UI. Anything that fails to parse or fails validation is
  discarded and the app starts empty. Storage access itself is guarded
  too, since localStorage throws in a private window, and a failed write
  is swallowed so the scoreboard keeps working in memory.

  startMatch returns an outcome rather than throwing: a rejected start is
  an expected result of operator input and the caller needs the reason in
  order to render it.

  Approve and I commit, then start commit 4 (UI: dialogs, <ol> grid, cards,
  finished group, a11y).

✻ Sautéed for 2m 43s · done 3:36 PM

※ recap: Building the Sportradar World Cup scoreboard commit by commit against the PDR. Commit 3 (zustand store, validation, guarded persistence) is written and green but uncommitted, waiting on your approval. Say go and I commit it, then start commit 4, the UI. (disable recaps in /config)

❯ ok, commit and proceed with next commit. all tests pass

  Ran 1 shell command (ctrl+o to expand)

● Committed c7ca84a. Commit 4 — UI. Reading the vendored components first.

  Searched for 1 pattern, ran 3 shell commands (ctrl+o to expand)

● shallow handles Set via its entries() path, so useTeamsInPlay is referentially
  stable. Writing components.

  Ran 2 shell commands (ctrl+o to expand)

● Caught a mistake in what I just wrote: I put aria-hidden on the score, which
  hides it from screen readers entirely, and compensated by stuffing "currently
  N" into every button label. Wrong trade — the score should be readable text.

  Ran 6 shell commands (ctrl+o to expand)

● Now RTL tests. Probing the Radix Select interaction in jsdom first, since
  that's the risky part.

  Ran 1 shell command (ctrl+o to expand)

● Radix Select works in jsdom with the existing shims — 7/7. Writing the rest.
  Ran 1 shell command (ctrl+o to expand)

● Real finding, not a test bug: shadcn Card renders a <div>, so my
  aria-labelledby sits on a roleless element and announces nothing. Checking
  what the component allows.

  Ran 1 shell command (ctrl+o to expand)

● Card and CardTitle are plain <div>s with no polymorphism, so aria-labelledby
  on them announces nothing. Better fix than adding role="article": give each
  card a real <h3>, which is how screen reader users actually navigate a list of
  cards.

  Ran 2 shell commands (ctrl+o to expand)

● That selector was badly written on my part. The Finish button's accessible
  name already includes the fixture — that's what the sr-only span is for.

  Ran 3 shell commands (ctrl+o to expand)

● All 5 UI mutants caught. Checking whether I can smoke-test in a real browser
  rather than only jsdom.

  Ran 3 shell commands (ctrl+o to expand)

● Real browser, driven entirely through the UI — 5 dialogs and 34 goal clicks —
  produces the brief's exact expected ordering, no console errors. Checking the
  layout.

  Read 2 files (ctrl+o to expand)

● Narrow layout works. But the Australia row looks like it's missing its −
  button while Argentina has one — verifying rather than squinting at a PNG.

  Ran 1 shell command (ctrl+o to expand)

● Empty board — new browser context has no localStorage. Re-running with seeding
  in the same session.

  Ran 1 shell command (ctrl+o to expand)

● Verified: both − buttons present, visible, enabled, same x-position (298). The
  earlier screenshot was a PNG rendering artifact, not a bug.

  Ran 3 shell commands (ctrl+o to expand)

● Commit 4 done, not committed. The app works end to end.

  Verified in a real browser, not just jsdom

  Drove the full example scenario through the built app in headless Chromium — 5
  dialogs, 34 goal clicks — result: [Uruguay, Spain, Mexico, Argentina,
  Germany], no console errors. Screenshots at 1280px (3 columns) and 390px (1
  column) both clean.

  One row looked like it was missing its − button in the screenshot. Measured it
  in the browser rather than guessing: present, visible, enabled, same
  x-position. PNG artifact.

  Two accessibility things worth your attention

  I made and caught a real bug mid-commit. First version marked the score
  aria-hidden and compensated by stuffing "currently 2" into every button label.
  That hides the score from screen readers entirely and makes each button read
  like a sentence. Now the score is ordinary readable text and labels are plain:
  "Add a goal for Spain".

  The PDR was wrong about card labelling. It assumed aria-labelledby on cards.
  The vendored shadcn Card/CardTitle are plain <div>s with no polymorphism, so
  aria-labelledby on them points at nothing announceable. Each card now carries
  a real <h3> — which is also how screen reader users actually navigate a list
  of cards. A test pins the h1→h2→h3 hierarchy.

  One documented compromise for your README: − at zero uses real disabled, which
  removes it from the tab order. aria-disabled keeps focus but needs manual
  click suppression and an explanation of why nothing happened. Chosen
  knowingly.

  What's in the tree

  src/store/selectors.ts (summaries return ids; card owns its match, board owns
  the order) · src/a11y/ (one polite live region; announcements read back from
  the store so they can't disagree with the screen; zero-width-space trick so an
  identical score change is announced twice) · five components · vite.config.ts
  now pins TZ: 'UTC' so time assertions don't depend on the machine.

  Test quality

  97 passing. Five mutants, all caught:

  ┌─────────────────────────────────┬──────────┐
  │             mutant              │ failures │
  ├─────────────────────────────────┼──────────┤
  │ − never disabled                │ 1        │
  ├─────────────────────────────────┼──────────┤
  │ flag exposed to assistive tech  │ 1        │
  ├─────────────────────────────────┼──────────┤
  │ rank badges reversed            │ 1        │
  ├─────────────────────────────────┼──────────┤
  │ focus not returned after finish │ 1        │
  ├─────────────────────────────────┼──────────┤
  │ finish skips confirmation       │ 5        │
  └─────────────────────────────────┴──────────┘

  tsc -b clean · oxlint clean · build green.

  feat: start, update score and finish UI

  The summary is an ordered list laid out with CSS grid, not a grid of
  divs. The grid is what an operator watching several matches wants to
  look at; the list is what carries the ranking to anyone not looking at
  it, and every card states its own position rather than leaving the
  reader to infer it from where it sits. Each card also shows its total
  goals and start time, so the ordering rule can be checked on sight.

  Cards carry a real heading rather than aria-labelledby. The vendored
  Card and CardTitle are plain divs, so aria-labelledby on them points at
  nothing announceable, and headings are how a screen reader user moves
  through a list of cards anyway. A test pins the heading hierarchy.

  One polite live region for the whole board rather than one per card,
  which would interrupt whatever is being read every time any match
  scores. Announcements read the score back from the store rather than
  predicting it, so they cannot disagree with the screen.

  Finishing asks for confirmation, because it is the one action a
  mis-click cannot walk back, and hands focus to the summary heading
  afterwards so a keyboard user is not dropped on the document body when
  the card unmounts.

  Teams already in a live match are disabled in the picker with the reason
  shown, rather than accepted and then rejected on submit.

  Approve and I commit, then start commit 5 (undo — the §5 additional
  operation).

✻ Cooked for 5m 41s · done 3:45 PM

※ recap: Building the Sportradar World Cup scoreboard commit by commit against the PDR; commit 4 (the UI) is finished, tested, and verified in a real browser but not yet committed. Next: your approval to commit it, then commit 5 adds undo. (disable recaps in /config)

❯ add some minor transition when re-ordering matches for better UX, otherwise
  users can accidently click a wrong match to update the goal because the
  re-order is very quick, while also respecting the reduced motion for a11y

● Pushing back on one part of the premise before I write it: a transition makes
  the movement legible — the eye can follow where a card went — but it doesn't
  by itself stop the mis-click, because the target is still moving while you
  click. So I'm adding the piece that actually closes the window: pointer events
  are held on the list for the ~180ms cards are in flight. A swallowed click is
  recoverable (click again); a mis-click records a goal against the wrong team
  and needs undo. Keyboard is unaffected — pointer-events doesn't touch it, and
  keyboard users aren't the ones mis-clicking.

  Ran 2 shell commands (ctrl+o to expand)

● 8/8. Now verifying in a real browser — jsdom mocks prove the logic, not that
  it actually animates.

  Ran 1 shell command (ctrl+o to expand)

● Real browser confirms it works — 4 animations and pointer-events: none
  mid-reorder, auto once settled, and under reduce my hook correctly stays out
  of it.

  But it also surfaced a gap: 2 animations still run under reduce. Not mine
  (pointer-events stayed auto) — they're the tw-animate-css dialog animations,
  which ignore the preference. PDR D9 claims reduced motion is respected, so
  that claim is currently false app-wide.

  Searched for 1 pattern, ran 1 shell command (ctrl+o to expand)

● Fixed: under reduce it's now 0 animations and pointer events stay auto;
  ordering still correct both ways.

  Ran 3 shell commands (ctrl+o to expand)

● Reorder animation folded into commit 4 (still uncommitted).

  What I built

  FLIP via the Web Animations API — measure, invert, play. 180ms ease-out, in
  use-reorder-animation.ts, encapsulated in the board so no call site changed.

  Two details that matter: positions are re-measured after every render, not
  only when order changes, so a viewport resize can't leave stale coordinates
  that produce a nonsense animation later; and any in-flight animation is
  cancelled before measuring, since a running transform would otherwise be read
  as a card's settled position.

  The browser check found a real gap in the PDR

  jsdom has no layout engine and no Web Animations API, so the 8 unit tests run
  against mocks — they prove logic, not behaviour. So I drove it in headless
  Chromium with motion emulated both ways.

  Under reduce, 2 animations were still running. Not mine — the hook correctly
  stayed out, pointer-events stayed auto. They were tw-animate-css dialog/card
  animations, which don't consult the preference. PDR D9 has claimed since the
  design phase that reduced motion was respected, and that claim was false for
  most of the app's motion.

  Added a global @media (prefers-reduced-motion: reduce) rule collapsing those
  durations (collapsed, not zeroed, so end events still fire). Re-verified:

  ┌──────────────┬─────────────────────┬─────────────────────────┬─────────┐
  │              │     animations      │     pointer-events      │ settled │
  │              │     mid-reorder     │       mid-reorder       │         │
  ├──────────────┼─────────────────────┼─────────────────────────┼─────────┤
  │ motion       │ 4                   │ none                    │ auto    │
  │ allowed      │                     │                         │         │
  ├──────────────┼─────────────────────┼─────────────────────────┼─────────┤
  │ reduce       │ 0                   │ auto                    │ auto    │
  └──────────────┴─────────────────────┴─────────────────────────┴─────────┘

  Ordering correct in both.

  105 tests · tsc -b clean · oxlint clean · build green.

  Commit message gains:

  Cards animate to their new positions when a goal changes the ranking.
  Without it the board teleports: the card the operator was aiming at is
  replaced under the cursor by a different match and the next click lands
  on the wrong team.

  The animation alone does not fix that, since during it the target is
  still moving, so pointer events are held on the list while cards are in
  flight. A click swallowed for 180ms costs a second click; a click
  landing on the wrong match records a goal against the wrong team. The
  cheaper failure is the one to choose. Keyboard interaction is untouched.

  Reduced motion is respected in two places, because one was not enough.
  The re-order checks the preference in JavaScript, and a global rule
  collapses the tw-animate-css dialog and card animations, which do not
  consult it on their own -- without which the app claimed to respect the
  preference while still animating.

  Approve and I commit, then start commit 5 (undo — the §5 additional
  operation).

✻ Crunched for 2m 4s · done 4:06 PM

❯ looks ok, commit and proceed with next commit

  Ran 1 shell command (ctrl+o to expand)

● Committed 059dd2c. Commit 5 — undo, the §5 operation.

  Ran 2 shell commands (ctrl+o to expand)

● Found a real bug in what I just wrote: the migration is dead code. The
  safe-storage validator rejects v1 state (no lastChange) before zustand's
  version gate runs, so migrate never fires. The validator's job is "is this
  recoverable", not "does this match today's type exactly" — migration is what
  makes it current.

  Ran 7 shell commands (ctrl+o to expand)

● Likely cause: that replace had no assertion, so it may have silently no-opped.

  Searched for 1 pattern, ran 1 shell command (ctrl+o to expand)

● Real a11y bug found: the accessible name computed as "Undolast score change:
  Spain versus Brazil". The name algorithm trims each text node before
  concatenating, so the leading space inside an sr-only span is dropped. "Finish
  match" escaped it only because its sr-only text starts with :.

  Switching both buttons to aria-label, which composes without whitespace games,
  and pinning the names in tests.
  Ran 2 shell commands (ctrl+o to expand)

● All 5 mutants caught. Verifying undo in a real browser — including whether
  Chromium's actual accessibility tree agrees with the polyfill on those names.

  Ran 1 shell command (ctrl+o to expand)

● undo found in real AX tree: false is a race in my script, not the app —
  count() ran before the card mounted, and the very next line auto-waited and
  succeeded. Re-checking cleanly rather than leaving an ambiguous result.

  Ran 1 shell command (ctrl+o to expand)

● Confirmed: exactly 1 match in Chromium's real accessibility tree, all button
  names correct.

  Ran 1 shell command (ctrl+o to expand)

● Commit 5 done, not committed. Undo is the §5 operation: one snapshot per
  match, reverted once, then disarmed.

  Two bugs I wrote and caught in the same commit

  The migration was dead code. Adding lastChange as required meant bumping
  storage to v2 with a v1→v2 migration, so an operator reloading mid-matchday
  keeps their board. It never ran — commit 3's safe-storage guard validates
  against the current shape and runs before zustand's version gate, so v1 state
  was discarded at the storage layer and migrate never saw it. Fix was a
  correction of responsibility, not a patch: the storage guard answers "is this
  recoverable", not "does this match today's type"; migration is what makes it
  current. A test now asserts a v1 payload migrates and is usable.

  An accessible name came out as one word. Composing Undo's name from visible
  text + sr-only span computed as "Undolast score change: Spain versus Brazil" —
  the name algorithm trims each text node before joining, so a span starting
  with a space loses it. Finish had the identical construction and escaped only
  because its hidden text starts with :. Both now use aria-label; both names
  pinned exactly.

  That second one deserves attention: it renders fine, it would pass any review
  that read the JSX, and the suite was green — my test used a regex that
  happened to match. Only computing the name the way a screen reader does
  exposed it.

  Verification

  ┌────────────┬────────────────────────────────────────────────────────────┐
  │   check    │                           result                           │
  ├────────────┼────────────────────────────────────────────────────────────┤
  │ tests      │ 119 passed                                                 │
  ├────────────┼────────────────────────────────────────────────────────────┤
  │            │ 5/5 caught — goals never arm undo (7), undo doesn't disarm │
  │ mutants    │  (2), finished keeps history (1), migration removed (1),   │
  │            │ button never disabled (2)                                  │
  ├────────────┼────────────────────────────────────────────────────────────┤
  │ real       │ disabled fresh → enabled by goal → restores score →        │
  │ browser    │ disables again → announces → gone once finished; storage   │
  │            │ version: 2                                                 │
  ├────────────┼────────────────────────────────────────────────────────────┤
  │ Chromium   │ exactly 1 match for the full name, not just the polyfill   │
  │ AX tree    │                                                            │
  └────────────┴────────────────────────────────────────────────────────────┘

  Deviation recorded in PDR D8: v2 was reserved for the event log; undo needed
  it first, so the log becomes v3.

  feat: undo last score change

  Adds the one additional operation the brief allows: a single snapshot
  per match, reverted once, then disarmed until the next change. One
  snapshot rather than a stack, so the event log that follows can be added
  on top instead of replacing a history mechanism in a second, slightly
  different shape.

  Undo and the minus button are not the same action and are not labelled
  as though they were. Minus says the score is genuinely lower -- a goal
  disallowed, or awarded to the wrong side. Undo says the last entry was a
  mistake. Same arithmetic, different claim about what happened.

  Undo cannot reach a finished match, since finishing is terminal, and a
  finished match does not carry the history at all rather than carrying it
  unusable.

  Persisted state moves to version 2 with a migration, because an operator
  who reloads into a new build mid-matchday should not lose the board they
  are watching. The storage guard now tolerates state written before undo
  existed: it validates that data is recoverable, not that it matches
  today's type, and migration is what brings it current. Without that the
  guard rejected version 1 before the version gate ran and the migration
  was unreachable.

  Both footer buttons compose their accessible names with aria-label. The
  name algorithm trims each text node before joining them, so composing
  from visible text plus a hidden span beginning with a space produced
  "Undolast score change". Tests pin both names exactly.

  Approve and I commit, then start commit 6 — the distinct feature commit:
  per-match event log with audit trail.

✻ Cogitated for 3m 36s · done 4:12 PM

※ recap: Building the Sportradar World Cup scoreboard commit-by-commit against the PDR; commit 5 (undo) is finished, tested, and verified but not yet committed. Next: your approval to commit it, then start commit 6, the per-match event log feature. (disable recaps in /config)

❯ commit and proceed with next commit

  Ran 1 shell command (ctrl+o to expand)

● Committed f94a0c4. Now commit 6 — the distinct feature commit: per-match event
  log.

  Ran 5 shell commands (ctrl+o to expand)

● Two problems, one real: the shared id() generator now serves both match ids
  and event ids, so match-2 became an event id. Splitting it — the store mints
  two kinds of identifier and ScoreboardDeps should say so. Production wires
  both to the same generator; tests get independent, readable sequences.

  Ran 4 shell commands (ctrl+o to expand)

● Now the UI for the log.

  Ran 1 shell command (ctrl+o to expand)

● Nested event-log lists now live inside each summary <li>, so that assertion
  counts them too. Scoping it to direct children — the intent is "the summary
  has 5 items", not "there are 5 list items anywhere in it".

  Ran 2 shell commands (ctrl+o to expand)

● textContent includes aria-hidden content, so that assertion was testing the
  wrong thing. Asserting on the marker element itself.

  Ran 2 shell commands (ctrl+o to expand)

● All 5 caught. Verifying the log in a real browser.

  Read 1 file, ran 3 shell commands (ctrl+o to expand)

● The pkill exit code aborted that chain before the doc updates ran. Re-running
  them.

  Ran 1 shell command (ctrl+o to expand)

● Commit 6 done — the distinct feature commit. Not committed.

  Why this feature

  It's the one that makes an earlier claim real rather than asserted. Since
  round 3 the design has justified undo existing alongside − by saying they make
  different claims about reality. Without a record, that was a story told in a
  README about behaviour the app couldn't demonstrate. Now GOAL_REMOVED ("the
  goal didn't count") and UNDO ("the previous entry was a mistake, and here's
  which one") are distinguishable after the fact — exactly what reconciling a
  disputed scoreline needs.

  The rule that mattered most: undo appends, never subtracts. Deleting the
  reverted entry would leave a log indistinguishable from one where the mistake
  never happened. A mutant that deleted instead of appending failed 6 tests.

  Decided while building, not while designing

  - Two id generators. The log started minting event ids from the shared
    generator, which silently shifted every match id in tests — the second match
    became match-3. Rather than paper over it in fixtures, ScoreboardDeps now
    declares matchId and eventId. Production wires both to the same source; the
    split exists because the store genuinely mints two kinds of identifier.
  - lastChange grew to { score, eventId } so an UNDO names what it reverted
    instead of inferring it from position.
  - Migrated v2 matches get one seeded MATCH_STARTED, from their own startedAt.
    Goals scored before the upgrade are absent because they were never recorded.
    Inventing a plausible history so the log looked complete was the obvious
    alternative and the wrong one — a fabricated audit trail is worse than an
    admittedly partial one.
  - Collapsed by default, count on the summary line — an open log on every card
    would cost the height that made the grid worth having. List is the scroll
    container with tabIndex={0} and a name. No colour coding: the wording
    carries the distinction, the marker glyph is aria-hidden.

  Verification

  Real browser, log opened, newest first:

  ↶ 16:20  Undone: Goal — Brazil    0-0
  + 16:20  Goal — Brazil            0-1
  − 16:20  Goal removed — Spain     0-0
  + 16:20  Goal — Spain             1-0
  · 16:20  Match started            0-0

  Keyboard-focusable region, finished card keeps its full log, storage version:
  3, no page errors.

  141 tests · 5/5 mutants caught (undo deleting what it reverted 6, removed goal
  logged as ordinary goal 2, oldest-first 5, region not focusable 1, migration
  seeding empty log 1) · tsc -b, oxlint, build all clean.

  feat: per-match event log with audit trail

  Adds the chosen feature: every match keeps a record of what happened to
  it, readable on the card and outliving the match itself.

  The score says where a match stands but nothing about how it got there,
  and this app offers two ways to take a goal off the board that are
  arithmetically identical. A goal removed asserts the goal did not count
  -- disallowed, overturned, awarded to the wrong side. An undo asserts
  the previous entry was a data-entry error, and names the entry it
  reverted. Without a record there is no way to tell those apart
  afterwards, which is exactly what reconciling a disputed scoreline
  requires.

  Undo appends and never subtracts. Deleting the entry it reverted would
  leave a log indistinguishable from one where the mistake never happened,
  which is the opposite of an audit trail.

  Persisted state moves to version 3. Matches carried forward get a log
  seeded with the one entry that can be reconstructed truthfully -- when
  they started. Goals scored before the upgrade are absent because they
  were never recorded; inventing a plausible history so the log looked
  complete would make it worthless as a record.

  The store now takes separate match and event id generators. Production
  wires both to the same source, but the store mints two kinds of
  identifier and saying so keeps ids stable under test.

  The log is collapsed by default with its count on the summary line, so a
  board of cards stays scannable. The list is the scroll container and
  takes keyboard focus, because a scrollable region that cannot be focused
  is content only a mouse can read. Entries are told apart by wording
  rather than colour or glyph.

  Approve and I commit, then start commit 7 (Playwright e2e, 3 flows).

✻ Baked for 4m 12s · done 4:20 PM

※ recap: You're building the Sportradar scoreboard exercise commit by commit against PDR.md. Commit 6, the per-match event log feature, is written and verified with 141 tests passing but not yet committed. Next: approve it so I commit, then start the Playwright e2e commit.

❯ yes, looks good. commit and continue

  Ran 1 shell command (ctrl+o to expand)

● Committed 34c1c73. Commit 7 — Playwright e2e, 3 flows.

  Ran 1 shell command (ctrl+o to expand)

● 6 passed (3 flows × desktop + Pixel 5) in 9.3s. Verifying they'd actually
  catch a regression and that npm test still excludes them.

  Ran 1 shell command (ctrl+o to expand)

● E2E catches the regression (reversed tiebreak → ordering flow fails), and npm
  test stays at 141 — the specs are excluded as intended.

  Ran 1 shell command (ctrl+o to expand)

● Commit 7 done, not committed.

  Three flows, chosen as the ones unit tests can't stand in for

  1. The example scenario through real clicks — 5 dialogs, 34 goal buttons, not
     seeded into the store. Vitest proves the comparator; this proves an
     operator can actually reach that ordering through the interface.
  2. A finished match leaving the summary and keeping its record — including
     opening its log and finding the finish entry.
  3. State surviving a page reload — which jsdom cannot exercise at all. Real
     storage round-trip, and undo still armed and correct on the other side.

  What the e2e run confirmed that nothing else could

  While cards animate, the list stops receiving pointer events — so Playwright
  waits rather than clicking whatever slid under the cursor. That's the same
  protection D11 gives a human operator, observed from outside the
  implementation instead of asserted by a test that mocks it.

  Verification

  ┌───────────────────────────┬──────────────────────────────────────────────┐
  │           check           │                    result                    │
  ├───────────────────────────┼──────────────────────────────────────────────┤
  │ npm run test:e2e          │ 6 passed (3 flows × desktop + Pixel 5), 9.3s │
  ├───────────────────────────┼──────────────────────────────────────────────┤
  │ mutant: reversed tiebreak │ ordering spec fails — not vacuous            │
  ├───────────────────────────┼──────────────────────────────────────────────┤
  │ npm test                  │ 141, unchanged — specs correctly excluded    │
  ├───────────────────────────┼──────────────────────────────────────────────┤
  │ tsc -b / oxlint           │ clean                                        │
  └───────────────────────────┴──────────────────────────────────────────────┘

  Kept cheap on purpose: behind npm run test:e2e, never part of npm test, so a
  reviewer who clones and runs the test command can't be tripped by a missing
  browser download. An optional extra that breaks a first-time run is worse than
  not having it.

  test: playwright end-to-end coverage for core flows

  Three specs, run against the production build on desktop Chrome and a
  Pixel 5. They were chosen as the flows the unit tests cannot stand in
  for rather than as a second pass over the same ground: the example
  scenario driven through real clicks instead of seeded into the store, a
  finished match leaving the summary and keeping its record, and state
  surviving a page reload, which jsdom cannot exercise at all.

  Kept behind its own script and out of `npm test`, so a reviewer who
  clones the repository and runs the tests cannot be tripped by a missing
  browser download. An optional extra that breaks a first run would be
  worse than not having it.

  Approve and I commit. That leaves commit 8: docs: finalise README — which is
  yours to write, per your call earlier. My uncommitted draft is still sitting
  in the working tree as a starting point if you want it; the material worth
  pulling in from the PDR is the requirement→implementation map, the
  accessibility compromises (disabled vs aria-disabled, flag emoji on Windows),
  the localStorage documentation citing the brief's "Data:" line, and the
  feature explanation.

✻ Cooked for 1m 26s · done 4:25 PM

❯ please add a single snapshot with the test case from the brief into docs,
  which is being tested e2e
● Two things that matter for a committed screenshot: it must not churn on every
  run, and it should show the tiebreak rather than just the order. Freezing the
  clock per kickoff gives both — five distinct kickoff times, so "most recently
  started first" is visible on the two 12-goal and 4-goal ties.

  Read 1 file, ran 1 shell command (ctrl+o to expand)

● Two defects in that image: it was captured mid-animation (cards #4/#5
  overlapping), and the times are machine-local (20:00, not 19:00) so
  regenerating elsewhere would churn. Fixing both — pin the browser timezone,
  and wait for animations to drain before capturing.

  Read 1 file, ran 1 shell command (ctrl+o to expand)

● Clean, and both ties are now legible: Uruguay 19:15 above Spain 19:05 on 12
  goals, Argentina 19:20 above Germany 19:10 on 4. Verifying it's byte-stable so
  it doesn't churn the diff on every run.

  Ran 1 shell command (ctrl+o to expand)

● Byte-identical across runs — no diff churn.

  Ran 1 shell command (ctrl+o to expand)

● PDR anchor didn't match (the AI.md entry did append). Locating the real text.

  Ran 2 shell commands (ctrl+o to expand)

● Screenshot added, generated by the e2e spec.

  Why from the test, not by hand

  A pasted screenshot is a claim frozen at the moment someone took it, and it
  rots silently. Written by the spec that drives the scenario through the
  interface, it can't disagree with the behaviour — if ordering broke, the spec
  fails before it reaches the capture.

  The staggered kickoffs earn their place

  Pinning the clock per match was needed for determinism, but the better half is
  that it makes the rule visible, not just its result:

  ┌─────┬─────────────────────────┬───────┬────────────┐
  │  #  │          match          │ goals │ kicked off │
  ├─────┼─────────────────────────┼───────┼────────────┤
  │ 1   │ Uruguay 6–6 Italy       │ 12    │ 19:15      │
  ├─────┼─────────────────────────┼───────┼────────────┤
  │ 2   │ Spain 10–2 Brazil       │ 12    │ 19:05      │
  ├─────┼─────────────────────────┼───────┼────────────┤
  │ 3   │ Mexico 0–5 Canada       │ 5     │ 19:00      │
  ├─────┼─────────────────────────┼───────┼────────────┤
  │ 4   │ Argentina 3–1 Australia │ 4     │ 19:20      │
  ├─────┼─────────────────────────┼───────┼────────────┤
  │ 5   │ Germany 2–2 France      │ 4     │ 19:10      │
  └─────┴─────────────────────────┴───────┴────────────┘

  Both ties are legible in the image itself.

  One real defect, not a precaution

  The first capture was a picture of two cards overlapping in mid-air. The final
  assertion passes as soon as the text settles — which is before the cards have
  finished sliding into place. Nothing in the suite was wrong; the test was
  asking a different question than the screenshot was. Now it waits for
  document.getAnimations() to drain.

  Also pinned: browser timezone to UTC (times were rendering machine-local —
  20:00 instead of 19:00), and the viewport fixed in the config rather than
  inherited from Playwright's device preset. Written from the desktop project
  only, so it's one snapshot rather than whichever browser finished last. Re-ran
  and confirmed byte-identical (0382fd8e…).

  docs/example-scenario.png, 1280×720, 68K. Referenced from PDR D1 — grab the
  same path for your README.

  Commit message gains:

  The ordering spec also writes docs/example-scenario.png, the screenshot
  used in the documentation. Generating it from the test rather than
  capturing it by hand means the picture cannot drift from the behaviour:
  a broken ordering fails the spec before it reaches the screenshot.

  Kickoff times are staggered so the image shows the tiebreak being
  applied rather than only its result, the clock and browser timezone are
  pinned so the file does not change between runs or machines, and the
  capture waits for the re-order animation to settle -- without which it
  caught two cards overlapping mid-flight.

  Approve and I commit. Then only commit 8 remains: docs: finalise README, which
  is yours.

✻ Sautéed for 1m 48s · done 4:30 PM

❯ commit and then I actually need AI.md to have a brief summary because it got
  a bit too long so in the final commit I want to be a lot more brief because I
  will also be adding a prompt history in there (myself). Also please edit
  readme to use my voice and a briefly described everything like asked in brief
  and from our conversation based on my decisions and I will edit it on top
  myself

  Ran 1 shell command (ctrl+o to expand)

● Committed 5e934f6. Now condensing AI.md and writing the README in your voice.

  Read 1 file, ran 1 shell command (ctrl+o to expand)

● Prettier isn't a project dependency (this repo lints with oxlint) — that
  warning is from the ad-hoc npx, ignoring it.

  Ran 1 shell command (ctrl+o to expand)

● Committed 5e934f6 earlier. Commit 8 ready, not committed.

  AI.md — 251 → 47 lines

  Cut the running commentary. Kept four things a reviewer actually needs:

  - How I used AI — as an adversarial reviewer of the plan before any code
    existed, not as a generator.
  - Decisions I held against pushback (table): grid over ranked column, undo
    before the log, terminal finish, +1/−1 only — each with the objection and
    why it didn't move me.
  - Corrections I accepted: Date.now(), the zustand performance argument, one
    live region, and the two model criticisms that turned out to be wrong on
    inspection.
  - Bugs the method caught — the argument for the working method rather than for
    the tool.

  ## Prompt history is left with an HTML comment placeholder at the bottom for
  you.

  README.md — 113 lines, first person

  Covers every brief requirement: run instructions, assumptions, non-obvious
  decisions, the §5 operation, the feature + why, accessibility with compromises
  named, localStorage documented, testing, trade-offs and limitations. Opens
  with the generated screenshot so the graded ordering requirement is the first
  thing demonstrated.

  Three things in there worth your eye before you edit, since they're claims in
  your voice:

  - I wrote the limitations section honestly — empty board on load, ten clicks
    to reach a score of 10, hard-coded team list, no mock API. Soften or cut if
    you'd rather not lead with them.
  - The zustand paragraph explicitly disclaims performance as the reason. That's
    the defensible version, but it's a deliberate posture.
  - "141 tests" and "6 Playwright tests" are hard numbers that will drift if you
    add any.

  Verification

  npm test 141 · npm run test:e2e 6 · tsc -b, oxlint, build clean. Screenshot
  byte-unchanged — git diff docs/ is empty, so the regenerated image matched.

  docs: finalise README, condense AI.md

  Writes the README the brief asks for: how to run everything, the
  assumptions, the decisions that are not self-evident from the code, the
  additional operation, the chosen feature and why, the accessibility
  compromises, the localStorage documentation, the testing approach and
  the known limitations. It opens with the generated example-scenario
  screenshot so the ordering requirement is demonstrated before it is
  described.

  Cuts AI.md from a running commentary to a summary: the working method,
  the decisions that changed and why, and the class of bug that method
  caught. Leaves a placeholder for the prompt history.

  That's the last commit in the plan — the PDR's commit table is fully green
  after this.

✻ Cogitated for 1m 13s · done 4:34 PM

※ recap: Goal: finish the Sportradar scoreboard take-home. Seven commits are in; the final one, rewriting README in your voice and cutting AI.md to 47 lines, is staged in the working tree awaiting your approval. Next: approve and I commit it.

❯ there is no need for PDR anymore since everything is being explained in
  readme

● Fair — and it's the divergence risk I flagged when you first asked for PDR.md.

  One thing worth knowing before it goes: PDR holds material the README
  deliberately doesn't — the rejected alternatives and the per-commit progress
  log. That's useful interview prep, since the brief says they'll walk through
  trade-offs. It stays in git history (2b349c7 onward), so it's recoverable;
  just don't expect to have it to hand as a file.

  Checking what references it.

  Searched for 1 pattern, ran 1 shell command (ctrl+o to expand)

● git rm refused because of my uncommitted edits to it — those were just the
  commit-8 progress note, which is going away regardless.

  Ran 1 shell command (ctrl+o to expand)

● PDR removed, references cleaned.

  Changes

  - PDR.md deleted. Stays in git history from 2b349c7 if you ever want it back.
  - README.md — the Documentation section (which linked both docs) collapsed to
    a single closing line pointing at AI.md. Nothing else lost; the README
    already carried the decisions.
  - AI.md — the line "Only after that did we write PDR.md, and every commit
    since has been built against it" now reads "Only once it had settled did I
    write the design up and start building against it, commit by commit." Still
    true, no dangling link.

  Repo is now exactly what the brief asks for: README.md and AI.md.

  Grep confirms no remaining PDR references. npm test 141 · tsc -b, oxlint,
  build clean.

  docs: finalise README, condense AI.md, drop PDR

  Writes the README the brief asks for: how to run everything, the
  assumptions, the decisions that are not self-evident from the code, the
  additional operation, the chosen feature and why, the accessibility
  compromises, the localStorage documentation, the testing approach and
  the known limitations. It opens with the generated example-scenario
  screenshot so the ordering requirement is demonstrated before it is
  described.

  Cuts AI.md from a running commentary to a summary: the working method,
  the decisions that changed and why, and the class of bug that method
  caught. Leaves a placeholder for the prompt history.

  Removes PDR.md. It served its purpose as the design record to build
  against, but the README now covers the same decisions for the audience
  that needs them, and two documents over the same ground can only drift
  apart. It remains in the history for anyone who wants the rejected
  alternatives and the per-commit reasoning.

  Say the word and I commit. That's the final commit — after it the repo is
  submission-ready, minus your own README edits and the prompt history in AI.md.

✻ Worked for 27s · done 4:39 PM

※ recap: You're building the Sportradar scoreboard exercise commit by commit; all code is done and the final docs commit is staged (README rewritten, AI.md condensed, PDR deleted). Next action: your approval to make that commit.

❯ worth adding the example scenario png in the readme

● Already in there — top of the README, right after the intro. Verifying the
  path resolves rather than just asserting it.

  Ran 2 shell commands (ctrl+o to expand)

● You're right and I was wrong — the ![...](...) markup got stripped when the
  file was written, leaving only the alt text as a plain sentence. Fixing with a
  writer that won't mangle it.

  Ran 1 shell command (ctrl+o to expand)

● Fixed. The image now renders instead of sitting there as a stray sentence, and
  I checked every link and image path in the README resolves — both do.

  Worth noting the same mangling hit the AI.md heredoc too, so I checked it:

  Ran 1 shell command (ctrl+o to expand)

● AI.md has no links by design — the PDR reference there became prose when we
  dropped the file. Nothing else mangled.

  Final state for commit 8:

  - README.md — 113 lines, your voice, opens with the example-scenario
    screenshot now actually rendering.
  - AI.md — 47 lines, with the prompt-history placeholder for you.
  - PDR.md — deleted, references cleaned.

  npm test 141 · tsc -b, oxlint, build clean · e2e 6 passed · screenshot
  byte-unchanged.

  docs: finalise README, condense AI.md, drop PDR

  Writes the README the brief asks for: how to run everything, the
  assumptions, the decisions that are not self-evident from the code, the
  additional operation, the chosen feature and why, the accessibility
  compromises, the localStorage documentation, the testing approach and
  the known limitations. It opens with the generated example-scenario
  screenshot so the ordering requirement is demonstrated before it is
  described.

  Cuts AI.md from a running commentary to a summary: the working method,
  the decisions that changed and why, and the class of bug that method
  caught. Leaves a placeholder for the prompt history.

  Removes PDR.md. It served its purpose as the design record to build
  against, but the README now covers the same decisions for the audience
  that needs them, and two documents over the same ground can only drift
  apart. It remains in the history for anyone who wants the rejected
  alternatives and the per-commit reasoning.

  Say go and I commit — that's the last one.

✻ Cooked for 27s · done 4:46 PM

※ recap: Goal: ship the Sportradar scoreboard exercise. All code, tests and e2e are committed; commit 8 (README finalised, AI.md condensed, PDR deleted) is staged but not committed. Next: say go and I commit it.
```
