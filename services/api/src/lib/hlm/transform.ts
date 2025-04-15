/**
 * Convert coverage to Array of string.
 *
 * @param coverage coverage data.
 *
 * @returns
 */
export function transformCoverage(coverage: string) {
  if (coverage.includes('|')) {
    return coverage.split('|');
  }
  return coverage;
}

/**
 * Convert the embargo so that it has the same unit.
 *
 * @param embargo type of embargo.
 *
 * @returns
 */
export function transformEmbargo(embargo: string) {
  const time = embargo;

  if (!time) {
    return time;
  }

  const separate = time.split(' ');
  const number = Number.parseInt(separate[0], 10);
  const indicator = separate[1].toUpperCase();

  let ratio = 1;
  if (indicator === 'YEARS') {
    ratio = 12;
  }
  if (indicator === 'DAYS') {
    ratio = 0.3;
  }

  return `${number * ratio} mois`;
}
