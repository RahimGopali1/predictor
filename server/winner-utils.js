/**
 * Winner resolution utilities for tournament fixture calculations.
 *
 * Two formulas are used depending on match stage:
 *
 * GROUP STAGE: Accepts stored winner only if it's one of the two teams playing.
 *              Falls back to score-based winner (null for draws).
 *
 * KNOCKOUT:    Accepts stored winner only if it agrees with the score outcome,
 *              OR if the match is a draw (penalty winner scenario - stored winner
 *              is one of the two teams).
 *              Falls back to score-based winner (null for draws).
 *
 * These functions are pure - they depend only on their arguments.
 */

/**
 * Resolve winner for a group stage match.
 * @param {string|null} storedWinner - The winner stored in fixture-results.json
 * @param {number} homeScore - Home team's score
 * @param {number} awayScore - Away team's score
 * @param {string} home - Home team ID
 * @param {string} away - Away team ID
 * @returns {string|null} The resolved winner ID, or null for draws
 */
function resolveGroupWinner(storedWinner, homeScore, awayScore, home, away) {
  const scoreWinner = homeScore > awayScore ? home : awayScore > homeScore ? away : null;
  const valid = storedWinner && (storedWinner === home || storedWinner === away) ? storedWinner : null;
  return valid || scoreWinner;
}

/**
 * Resolve winner for a knockout stage match.
 * Accepts stored winner only if it matches the score outcome,
 * OR if the match is a draw (KO penalty winner - stored winner is one of the two teams).
 * Rejects stored winners that contradict the score (e.g., stored winner is the team
 * that clearly lost based on goals).
 * @param {string|null} storedWinner - The winner stored in fixture-results.json
 * @param {number} homeScore - Home team's score
 * @param {number} awayScore - Away team's score
 * @param {string} home - Home team ID
 * @param {string} away - Away team ID
 * @returns {string|null} The resolved winner ID, or null for draws without penalty winner
 */
function resolveKOWinner(storedWinner, homeScore, awayScore, home, away) {
  const scoreWinner = homeScore > awayScore ? home : awayScore > homeScore ? away : null;
  // Accept stored winner if it matches score, OR if draw and winner is one of the teams (penalties)
  const valid = storedWinner && (storedWinner === scoreWinner || (!scoreWinner && (storedWinner === home || storedWinner === away))) ? storedWinner : null;
  return valid || scoreWinner;
}

module.exports = { resolveGroupWinner, resolveKOWinner };
