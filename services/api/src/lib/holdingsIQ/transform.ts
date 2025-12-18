import { format } from 'date-fns';

/**
 * Transform string for field standard : BISAC, General, LC, Medical
 * if subject includes '--', return array of string
 * 
 * @param subject
 * @returns 
 */
// TODO, split also on | AND --
export function transformSubject(subject: string) {
  if (subject.includes('--')) {
    // split on -- and remove useless space
    return subject.split('--').map((item) => item.trim());
  }
  return subject;
}

/**
 * Transform the array into a string,
 * replacing 'Present' with the 31st of December of the current year and 'No Access' with '0001-01-01'
 * Date as FR format
 *
 * @param coverage coverage data.
 *
 * @returns
 */
export function transformCoverage(coverage: string) {
  if (coverage === 'Present') {
    return `${new Date().getFullYear()}-12-31`;
  }

  if (coverage === 'No Access') {
    return '0001-01-01';
  }

  let updatedArray;

  if (coverage.includes('|')) {
    updatedArray = coverage.split('|');
    return updatedArray.map((item) => (item === 'Present' ? `${new Date().getFullYear()}-12-31` : new Date(item)));
  }

  return new Date(coverage);
}

/**
 * Transform the string into an array
 * 
 * @param coverage coverage data.
 *
 * @returns
 */
export function transformStringToArray(coverage?: string) {
  if (!coverage) {
    return null;
  }
  if (coverage.includes('|')) {
    return coverage.split('|');
  }
  return coverage;
}

/**
 * Convert the embargo so that it has the same unit (month).
 *
 * @param embargo type of embargo.
 *
 * @returns
 */
export function transformEmbargo(embargo: string | undefined) {
  const time = embargo;

  if (!time) {
    return null;
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

  return number * ratio;
}
