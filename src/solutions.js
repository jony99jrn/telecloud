// An entry can hold several solutions for the same question. They are stored inside the one code
// file in Telegram, separated by a marker line. An older entry has no marker, so it simply counts
// as one solution and keeps working exactly as before.

export const SOLUTION_MARK = '#--TELECLOUD-SOLUTION--#';

const SPLIT = new RegExp(`\\r?\\n${SOLUTION_MARK}\\r?\\n`);

/** One string from Telegram -> list of solutions (always at least one). */
export function splitSolutions(code) {
  return String(code ?? '').split(SPLIT);
}

/** List of solutions -> the one string saved in Telegram. */
export function joinSolutions(list) {
  return list.join(`\n${SOLUTION_MARK}\n`);
}
