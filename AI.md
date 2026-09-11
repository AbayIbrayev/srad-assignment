# AI.md

Required by the brief: a short summary of how AI tools were used, plus prompt history and context that shows the process.

## Summary of how AI was used

All AI work for this exercise ran through **Claude Code (Opus 5)** in a terminal session against this repository.

The deliberate choice was **not** to use AI as a code generator working from a one-line prompt. The brief says the requirements "intentionally include open questions and design choices" and that part of the task is deciding how to handle them, so the first session was spent using the model as an **adversarial reviewer of my own plan** before any application code existed. The opening instruction was, in short: *be brutally honest and skeptical, attack this plan rather than build it, find where I misread the brief or contradicted myself, and argue me out of bad ideas while it is still cheap.*

That produced four rounds of pushback and trade-off questions, recorded below. Several of my initial decisions survived the challenge (the card grid, the commit ordering, terminal finish). Several did not (`Date.now()` as an ordering key, the performance justification for zustand, per-card live regions). One decision reversed twice under argument and landed somewhere better than where it started (the score control).

Only after that did we write [PDR.md](./PDR.md), which the implementation commits are built against. This file is appended in every subsequent commit rather than reconstructed at the end.

**What the AI was used for:** interrogating the brief, surfacing unstated decisions, arguing both sides of trade-offs, and writing implementation code and tests against an agreed design.

**What it was not used for:** deciding the product. Every decision below was made by me, including the ones where I overruled the model's recommendation.

---

## Prompt history and process notes

### Round 1 — brief review and plan grilling

**What I asked for**

Review the exercise PDF; be brutally honest and skeptical of my approach; treat my plan as something to attack, not something to build. Find where I misread the brief, contradicted it, or planned work that would lose points. Ask clarifying questions with trade-offs on the ambiguous points. Do not produce a plan until after a brainstorm — then a project overview, then a PDR, and wait for my approval before writing anything. Keep this AI.md going from the first reply: what I asked, what was pushed back on, what changed and why. Implement commit by commit against the PDR.

**My original plan, as submitted**

Vite React + TS bootstrap with a few shadcn components pre-added for accessibility; Vitest for unit and integration tests; Playwright for the most important flows only. The user is an operator monitoring live World Cup matches, so they land on a dashboard with a "Start match" button opening a modal with home/away team selects. Started matches render as cards on a grid, grouped into in-progress and finished. Each card has buttons to change goals and to finish the match. The one additional operation is **undo**, because operators make mistakes and goals get miscounted. The distinct feature commit is a **scrollable event list** per card, because that is more useful to an operator than a bare score; undo appears in that list for audit rather than deleting the original entry. Ordering is most goals first, then start time — with an open question about what happens on an exact tie. zustand was already installed for persistence, since an accidental refresh should not lose the operator's progress and the brief allows localStorage if documented. I argued localStorage is infrastructure rather than the section 5 operation. zustand also gives per-card selector subscriptions so only one card re-renders. World Cup matchdays are around six matches, so no virtualisation.

**What was pushed back on**

1. **The card grid undermines the only objectively-graded requirement.** Ordering is the one thing a reviewer can mark right or wrong, and they have an exact expected list. A multi-column grid forces them to decide whether it flows row-major or column-major before they can check. A semantic ranked `<ol>` was proposed instead — it also wins the accessibility point that a grid of `<div>`s does not.
2. **My performance argument contradicted itself.** I had written both "six matches maximum, don't worry about load" and "per-card selectors so we don't re-render everything". Worse: nothing in the app ticks. There are no timers and no feed, so renders only happen on a click, and "all running live simultaneously" is decoration. An interviewer asking "how many cards before context becomes a problem, and did you measure?" would win.
3. **A `−1` button would make undo redundant**, which matters because section 5 grants exactly one additional operation — spending it on a duplicate button wastes the slot.
4. **Commit ordering risk.** Undo and the event log share one history structure. If undo ships a general history stack first, the later event-log commit is mostly rendering code, which undercuts the brief's demand that it be "a second, larger slice of work".
5. **localStorage triple-count risk.** The brief lists "persist to localStorage" as a section 5 example, so calling it a feature anywhere would read as three features. The defence exists in the brief itself — the separate "Data: In-memory state is sufficient; localStorage or a mock API is allowed if you document it" line under Technical expectations — but it has to be cited, and persistence must never be worded as a feature in a heading or a commit message.
6. **`Date.now()` is the wrong ordering key.** Millisecond collisions are trivially reproducible, and `Array.prototype.sort` stability cannot save it because insertion order is lost across a rehydrate. A monotonic `seq` with injected `now()` and `id()` was proposed instead.
7. **The preset team list must contain all ten example teams**, or a reviewer cannot reproduce the expected ordering by hand.
8. **Repository hygiene was already leaking points:** the Vite boilerplate README was committed, `shadcn` sat in `dependencies` rather than `devDependencies`, `src/lib/utils.ts` re-exported a third-party `cn` package instead of the usual `clsx` + `tailwind-merge`, six shadcn components were vendored before any feature existed, and an empty `e2e/` directory was committed.
9. **Decisions I had not made at all** were surfaced: validation rules, score bounds, finished-list ordering, whether undo reaches a finished match, corrupt-localStorage handling, and `aria-live` announcements.

**What changed and why**

- *Layout — I held, the model conceded.* I kept the card grid with an explicit priority indicator per card and a collapsible finished group below, on the grounds that an operator watching several simultaneous matches scans a grid faster than scrolling a column. Accepted on the condition that the DOM element stays `<ol>` / `<li>` with `display: grid`, so semantics and visual order agree, every card carries a visible rank, and the accessibility point is kept. Both concerns are satisfied at once.
- *Commit order — I held, the model conceded.* Undo ships first, the event log second. The brief requires the feature commit to be a larger slice, not a later one. The objection was downgraded to a churn risk, which D4 resolves.
- *Finish — my decision.* Finishing is terminal and finished matches are immutable. The model raised the consequence: a mis-click then becomes unrecoverable, so a confirmation step is required and the rule must be explicit in the README. Accepted.
- *Score model — I rejected increment-only*, because requirement 2 says "change the score", not "add to the score". This temporarily dissolved objection 3. It reversed again in round 3.
- *Ordering key — I accepted the correction.* `seq` replaces `Date.now()`, which also answers the open question I had raised myself: an exact tie on goals and start time is no longer a reachable state.

### Round 2 — trade-off questions

**Decisions I made**

- Score control: a quick `+1` goal button per team plus a way to adjust the score for a readjustment. (Reversed in round 3.)
- Event log placement: a collapsible, scrollable list per card.
- Validation: home ≠ away; a team cannot be in two in-progress matches; no duplicate in-progress fixture. The model noted the third rule is fully subsumed by the second, so one rule is implemented and documented as covering both.
- Undo depth: **single step, permanently**. `lastChange` is a snapshot or null, never an array — which is exactly what keeps the later event-log commit additive instead of a rewrite.

**Cold start — my decision**

No seeding in the product. A Vitest test asserts the exact example ordering and a Playwright flow drives it through the real UI, with the README pointing at both. This adds zero product surface, so nothing can be miscounted as a fifth operation. Accepted cost: the board is empty on first load.

Rejected alternatives: a dev-only "load example scenario" button (a reviewer skimming the source still sees it and may ask), and shipping the example as the default state (real product behaviour that would have to be justified, and it muddies whether the app starts empty for a real operator).

### Round 3 — score control reversed

**My decision**

Drop the adjust input and dialog entirely. `+1` / `−1` buttons per team only. Reason: the adjustment path was over-complicating things, and two quick-action buttons cover the use case.

**What was pushed back on**

This walked straight back into objection 3 from round 1: with `−1` present, undo looks redundant, and since section 5 grants exactly one additional operation, a redundant undo wastes the only slot. The model accepted the simplification on its merits — it removes NaN, empty-field and paste guards, commit-on-blur buffering and a third dialog, and keeps cards dense, which was the grid's whole rationale — but re-raised the redundancy problem rather than letting it pass.

The defence offered: `−1` and undo make **different claims about reality**. `GOAL_REMOVED` asserts the score is genuinely lower — a goal disallowed, overturned, or awarded to the wrong side — and stays in the record as a real match event. `UNDO` asserts the previous entry was a data-entry error and references the event it reverted. Same arithmetic, different audit meaning. It only holds if the log renders them distinctly and the README says so.

**Also asserted and accepted**

`−1` disabled at 0 rather than clamping silently. Event vocabulary: `MATCH_STARTED`, `GOAL`, `GOAL_REMOVED`, `UNDO { revertedEventId }`, `MATCH_FINISHED` — the log records start and finish too, not only scores, which makes it a real audit trail and makes the feature commit substantive. Undo reverts the last score change of either kind. Cards always show rank, teams, scores, total goals and start time, so the ordering rule is auditable at a glance. Finished group ordered most-recently-finished first, collapsed by default with a count. Grid of 1 / 2 / 3 columns. No retention policy, documented as an accepted trade-off rather than fixed with a "clear finished" button that would invite feature-count questions. One application-level live region rather than six.

### Round 4 — undo's identity

**My decision**

Keep undo with the sharpened `GOAL_REMOVED` versus `UNDO` semantics. Additional reason of my own: it future-proofs the approach, since other event kinds beyond goals could later become undoable.

Rejected alternatives: swapping section 5 to a filter-by-team-name box (unambiguously distinct and listed in the brief, but a weaker operator story that does nothing for the audit-trail narrative), and dropping `−1` so undo is load-bearing by construction (already rejected a round earlier, and it would record a disallowed goal and a mis-click identically).

**What was pushed back on**

A guard on my future-proofing rationale: keep the event type union open so undo can reach other kinds later, but build no reverter-registry abstraction for events that do not exist — speculative generality is a review flag. And my own terminal-finish rule already fences the scope: `MATCH_FINISHED` is explicitly not undoable, and the README must say so.

**Outcome**

Brainstorm converged. [PDR.md](./PDR.md) was written and agreed, and implementation proceeds commit by commit against it.

### Round 5 — documentation split

I asked for the agreed plan to be committed as `PDR.md` and for this file to be brought up to date.

**What was pushed back on:** the brief requires `README.md` and `AI.md`; `PDR.md` is additional. That is fine and shows process, but it must not become a second, diverging copy of the README. Agreed split — `PDR.md` is the design record (decisions, rationale, rejected alternatives), `README.md` is reviewer-facing (assumptions, trade-offs, requirement map, feature explanation, accessibility compromises, run instructions), and `AI.md` is the process record. `PDR.md` links to `README.md` and not the reverse, so a reviewer who reads only the README misses nothing required.

### Round 6 — commit 2, and two pieces of AI pushback that turned out to be wrong

I asked for the agreed plan committed as `PDR.md`, this file brought up to date, and implementation started commit by commit — with the PDR's progress kept current at every commit so the work stays on track.

**What changed:** a Status column and a Progress log were added to `PDR.md`, updated as part of each commit rather than reconstructed afterwards.

**Where the AI's earlier criticism did not survive inspection.** Three of the "repository hygiene" items raised in round 1 were checked against the actual repository before acting on them, and two were wrong:

- *"`src/lib/utils.ts` uses an unusual third-party `cn` package instead of `clsx` + `tailwind-merge`."* Wrong. `cn` is [`shadcn-ui/cn`](https://github.com/shadcn-ui/cn) — first-party shadcn tooling, a compiled drop-in replacement for that exact pair, and what the current shadcn CLI generates. Nothing to fix; it is documented in the README instead.
- *"`shadcn` is in `dependencies` and belongs in `devDependencies`."* Wrong. `src/index.css` imports `shadcn/tailwind.css`, so the package is a build input to the production bundle. Moving it would break `npm ci --omit=dev`. Also documented rather than changed.
- *"The empty `e2e/` directory is committed."* A non-issue — git does not track empty directories, and `playwright.config.ts` points `testDir` at it, so it stays until the end-to-end commit.

This is worth recording honestly rather than quietly dropping, because it is the same lesson in both directions: the model's confident criticism needed verifying against the repository exactly as much as my own plan needed challenging. The instruction to be skeptical cuts both ways, and a plausible-sounding review finding is still a claim to check, not a fact.

**On the README:** I decided the README is mine to write, not something to generate — it carries my assumptions, my trade-offs and my reasoning, which is exactly the part of the exercise being assessed. It is therefore deferred to the end and left out of the implementation commits. The three tooling notes above are facts worth putting in it, but the text is mine.

### Round 7 — commit 2, the domain model

Implementation started. Domain layer only: no store, no UI.

`Match` was modelled as a **discriminated union** of `InProgressMatch` and `FinishedMatch` rather than a status field sitting beside a nullable `finishedAt`. A finished match always has a finish time and an in-progress one never does, so the illegal combinations stop being merely unlikely and become unrepresentable.

Two deliberate deviations from `PDR.md` were made during implementation and recorded in its progress log rather than silently absorbed:

- The PDR sketch had flat `home` / `away` goal fields on `Match`. The implementation nests them as `score: Score`, because the undo snapshot in D4 is exactly a `Score` — better one shape than two shapes that happen to agree.
- `Match.homeTeam` is a plain `string`, not a union of the ten hard-coded team names. A real deployment loads its roster from a feed, and the domain model should not be coupled to a list that exists only for this exercise. The union is exported separately for the team picker.

**Test quality was checked rather than assumed.** Thirteen tests passing proves very little on its own, so the suite was re-run against a deliberately broken build with the ordering tiebreak reversed. Five tests failed, including the one that reproduces the brief's example scenario. The suite catches the regression it exists to catch instead of passing vacuously. This is a habit worth keeping for every test the AI writes: a green suite written by the same tool that wrote the code is evidence of agreement, not of correctness.

### Round 8 — team flags

I asked for emoji flags on the teams to make the UI more interactive. This was folded into the domain commit rather than queued as a later change, because it belongs with the roster it describes.

**What was pushed back on — not the idea, but two consequences of it:**

- **Screen readers.** Regional indicator pairs are announced inconsistently, anywhere from the country name to "regional indicator symbol letter A". A flag can therefore never be a team's only label. Every flag is marked `aria-hidden` with the team name beside it as real text, so the flags stay on the right side of the brief's accessibility requirement instead of quietly working against it.
- **Windows Chrome renders no flag glyphs at all** and falls back to the underlying letter pair, so "🇦🇷" shows as "AR". That degrades to a readable abbreviation rather than a broken box, which makes it an accepted trade-off rather than a blocker — but it is the kind of thing a reviewer discovers on their own machine and marks down if it looks unintentional, so it goes in the README as a known limitation.

**Implementation note.** The flag lookup is derived from the roster rather than written as a second literal beside it, so a team cannot be added without a flag. It returns `undefined` for an unknown name rather than a placeholder, so a match persisted under an older roster renders its team name plainly instead of borrowing another country's flag. Tests assert each flag is exactly two codepoints in the regional-indicator range — a stray ASCII letter or a half-formed pair renders as text and would otherwise slip through unnoticed.
