/**
 * Date display helpers used across the application.
 *
 * Dates are stored as ISO date strings (YYYY-MM-DD) and times as HH:mm.
 */

/**
 * Extract the year from an ISO date string.
 * Returns '' when the input is falsy.
 */
export function yearFromDate(dateStr) {
  if (!dateStr) return '';
  return dateStr.slice(0, 4);
}

/**
 * Build a short display string for birth/death on nodes & snapshots.
 *
 * Examples:
 *   birthDate='1990-05-12', deathDate=''          → '1990'
 *   birthDate='1990-05-12', deathDate='2020-03-01' → '1990 - 2020'
 *   birthDate='', deathDate='2020-03-01'           → '? - 2020'
 */
export function formatNodeDates(data) {
  const birthYear = yearFromDate(data.birthDate);
  const deathYear = yearFromDate(data.deathDate);

  if (deathYear) {
    return `${birthYear || '?'} - ${deathYear}`;
  }
  return birthYear;
}

/**
 * Format a full birth date + time for a detail view.
 *
 * Examples:
 *   '1990-05-12', '14:30' → '12/05/1990 14:30'
 *   '1990-05-12', ''      → '12/05/1990'
 *   '', ''                → ''
 */
export function formatFullBirthDate(dateStr, timeStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const base = `${d}/${m}/${y}`;
  return timeStr ? `${base} ${timeStr}` : base;
}

/**
 * Format a full death date for a detail view.
 */
export function formatFullDeathDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Return true when the node is marked as deceased (has a deathDate).
 */
export function isDeceased(data) {
  return Boolean(data.deathDate);
}
