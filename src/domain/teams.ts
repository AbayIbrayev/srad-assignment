export interface TeamOption {
  readonly name: string
  /**
   * Regional-indicator flag emoji, used as a scanning aid only.
   *
   * Two constraints follow from that and are load-bearing wherever these are
   * rendered:
   *
   * 1. The flag is decorative. It must be marked `aria-hidden` with the team
   *    name beside it as real text — screen readers announce regional
   *    indicator pairs inconsistently, from the country name to "regional
   *    indicator symbol letter A". A flag must never be a team's only label.
   * 2. Windows Chrome ships no glyphs for these and renders the underlying
   *    letter pair ("AR", "BR") instead. That degrades to a readable
   *    abbreviation rather than a broken box, which is why this is an
   *    accepted trade-off and not a blocker.
   */
  readonly flag: string
}

/**
 * The roster the operator picks from.
 *
 * Free-text entry is deliberately not offered: it invites typos that would
 * split one team across two spellings, and it makes the "a team cannot be in
 * two in-progress matches at once" rule unenforceable in practice.
 *
 * The list contains every team from the brief's example scenario, so the
 * documented ordering can be reproduced by hand in the running app.
 *
 * `Match` stores team names as plain strings rather than the `Team` union
 * below: a real deployment would load the roster from a feed, and the domain
 * model should not be coupled to a list that happens to be hard-coded for the
 * exercise.
 */
export const TEAMS = [
  { name: 'Argentina', flag: '🇦🇷' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'Brazil', flag: '🇧🇷' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'Italy', flag: '🇮🇹' },
  { name: 'Mexico', flag: '🇲🇽' },
  { name: 'Spain', flag: '🇪🇸' },
  { name: 'Uruguay', flag: '🇺🇾' },
] as const satisfies readonly TeamOption[]

export type Team = (typeof TEAMS)[number]['name']

const FLAGS_BY_NAME = new Map<string, string>(TEAMS.map(({ name, flag }) => [name, flag]))

/**
 * Derived from `TEAMS` rather than kept as a second literal, so a team can
 * never be added without its flag.
 *
 * Returns `undefined` for an unknown name instead of a placeholder glyph:
 * a match persisted under an older roster should render its team name plainly,
 * not decorated with the wrong country's flag or a question mark.
 */
export const flagFor = (team: string): string | undefined => FLAGS_BY_NAME.get(team)
