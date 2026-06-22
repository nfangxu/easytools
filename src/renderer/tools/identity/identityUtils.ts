import { ALL_COUNTIES, ALL_NAMES, type FlatCounty } from './seedData';

export type Gender = 'male' | 'female';

export interface IdentityRecord {
  name: string;
  gender: Gender;
  /** ISO YYYY-MM-DD birthdate (calendar-precision; no time-of-day). */
  birthDate: string;
  region: {
    provinceName: string;
    cityName: string;
    countyName: string;
    countyId: string;
  };
  /** 18-digit GB 11643-1999 resident identity card number. */
  idNumber: string;
  /** Plausible mainland China mobile number for test data. */
  mobileNumber: string;
}

export interface IdentityFilters {
  /** Province / municipality id (level-1 GB/T 2260 code), or undefined for any. */
  provinceId?: string;
  /** City id (level-2). Ignored when provinceId is missing or doesn't match. */
  cityId?: string;
  /** County id (level-3). When set, takes precedence over the others. */
  countyId?: string;
  /**
   * Birth-date range, inclusive on both ends. Either bound may be omitted —
   * a missing `from` means "no lower bound" (we cap at 1950-01-01) and a
   * missing `to` means "up to today".
   */
  birthFrom?: Date;
  birthTo?: Date;
  /** Force a specific gender; leave undefined for a coin flip. */
  gender?: Gender;
}

export interface GenerateOptions extends IdentityFilters {
  count: number;
}

/**
 * The minimum count we accept; below this generation is a no-op.
 * The cap is enforced at this layer so the UI can surface it to the user
 * without having to special-case in two places.
 */
export const MIN_COUNT = 1;
export const MAX_COUNT = 500;

/** Default lower bound for birth dates when the user leaves the field blank. */
export const DEFAULT_BIRTH_FROM = new Date('1950-01-01T00:00:00Z');

const ID_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2] as const;
const ID_CHECKSUM_CHARS = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
const MOBILE_PREFIXES = [
  '130',
  '131',
  '132',
  '133',
  '135',
  '136',
  '137',
  '138',
  '139',
  '150',
  '151',
  '152',
  '157',
  '158',
  '159',
  '170',
  '171',
  '172',
  '178',
  '180',
  '181',
  '182',
  '183',
  '185',
  '186',
  '187',
  '188',
  '198',
  '199',
] as const;

/**
 * Compute the mod-11 weighted checksum digit for the first 17 digits of a
 * resident identity card number. Per GB 11643-1999.
 */
export function computeIdChecksum(first17: string): string {
  if (first17.length !== 17 || /[^0-9]/.test(first17)) {
    throw new Error('first17 must be a 17-character numeric string');
  }
  let sum = 0;
  for (let index = 0; index < 17; index += 1) {
    sum += Number(first17[index]) * ID_WEIGHTS[index];
  }
  return ID_CHECKSUM_CHARS[sum % 11];
}

/**
 * Build an 18-digit ID number from its parts. The trailing 3-digit sequence
 * is adjusted so its last digit's parity matches the requested gender
 * (odd = male, even = female), preserving the input's variation otherwise.
 */
export function buildIdNumber(
  areaCode: string,
  birthDate: Date,
  gender: Gender,
  rawSequence: number,
): string {
  if (areaCode.length !== 6 || /[^0-9]/.test(areaCode)) {
    throw new Error('areaCode must be a 6-digit numeric string');
  }
  const yyyy = String(birthDate.getFullYear()).padStart(4, '0');
  const mm = String(birthDate.getMonth() + 1).padStart(2, '0');
  const dd = String(birthDate.getDate()).padStart(2, '0');
  const sequence = adjustSequenceForGender(rawSequence, gender);
  const seq = String(sequence).padStart(3, '0');
  const first17 = `${areaCode}${yyyy}${mm}${dd}${seq}`;
  return first17 + computeIdChecksum(first17);
}

function adjustSequenceForGender(rawSequence: number, gender: Gender): number {
  // Map any input into the 1..999 range — we reserve 000 as a value that
  // would read as "no individual" in the wild and skip it here.
  let seq = ((Math.floor(rawSequence) % 1000) + 1000) % 1000;
  const wantOdd = gender === 'male';
  const isOdd = seq % 2 === 1;
  if (isOdd !== wantOdd) {
    seq = (seq + 1) % 1000;
  }
  if (seq === 0) {
    seq = wantOdd ? 1 : 2;
  }
  return seq;
}

export function buildMobileNumber(randomFn: () => number = Math.random): string {
  const prefix = MOBILE_PREFIXES[Math.floor(randomFn() * MOBILE_PREFIXES.length)];
  let suffix = '';
  for (let index = 0; index < 8; index += 1) {
    suffix += String(Math.floor(randomFn() * 10));
  }
  return `${prefix}${suffix}`;
}

/**
 * Pick a county-level area for a given filter. Specificity is honoured in
 * order: an exact `countyId` wins, otherwise narrow by `cityId`, otherwise
 * by `provinceId`, otherwise the global pool. Empty post-filter pools fall
 * back to the global pool — the user has asked for "any" by setting fields
 * we can't satisfy, so we honour the spirit instead of failing.
 */
export function pickRandomCounty(
  filter: Pick<IdentityFilters, 'provinceId' | 'cityId' | 'countyId'>,
  randomFn: () => number = Math.random,
): FlatCounty {
  if (filter.countyId) {
    const exact = ALL_COUNTIES.find((county) => county.id === filter.countyId);
    if (exact) {
      return exact;
    }
  }
  let pool: ReadonlyArray<FlatCounty> = ALL_COUNTIES;
  if (filter.cityId) {
    const cityPool = pool.filter((county) => county.cityId === filter.cityId);
    if (cityPool.length > 0) {
      pool = cityPool;
    }
  } else if (filter.provinceId) {
    const provincePool = pool.filter((county) => county.provinceId === filter.provinceId);
    if (provincePool.length > 0) {
      pool = provincePool;
    }
  }
  return pool[Math.floor(randomFn() * pool.length)];
}

export function pickRandomName(randomFn: () => number = Math.random): string {
  return ALL_NAMES[Math.floor(randomFn() * ALL_NAMES.length)];
}

/**
 * Pick a calendar date uniformly between `from` and `to`, inclusive.
 * The result is normalised to local midnight; callers shouldn't rely on
 * the time component.
 */
export function pickRandomDateBetween(from: Date, to: Date, randomFn: () => number = Math.random): Date {
  const fromMs = startOfDay(from).getTime();
  const toMs = startOfDay(to).getTime();
  if (toMs <= fromMs) {
    return new Date(fromMs);
  }
  const days = Math.floor((toMs - fromMs) / (24 * 60 * 60 * 1000));
  const offset = Math.floor(randomFn() * (days + 1));
  return new Date(fromMs + offset * 24 * 60 * 60 * 1000);
}

function startOfDay(date: Date): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function pickRandomGender(randomFn: () => number = Math.random): Gender {
  return randomFn() < 0.5 ? 'male' : 'female';
}

export function generateOne(filters: IdentityFilters, randomFn: () => number = Math.random): IdentityRecord {
  const county = pickRandomCounty(filters, randomFn);
  const fromDate = filters.birthFrom ?? DEFAULT_BIRTH_FROM;
  const toDate = filters.birthTo ?? new Date();
  const birthDate = pickRandomDateBetween(fromDate, toDate, randomFn);
  const gender = filters.gender ?? pickRandomGender(randomFn);
  const sequence = Math.floor(randomFn() * 1000);
  const idNumber = buildIdNumber(county.id, birthDate, gender, sequence);
  const name = pickRandomName(randomFn);
  const mobileNumber = buildMobileNumber(randomFn);

  return {
    name,
    gender,
    birthDate: formatDate(birthDate),
    region: {
      provinceName: county.provinceName,
      cityName: county.cityName,
      countyName: county.name,
      countyId: county.id,
    },
    idNumber,
    mobileNumber,
  };
}

export function generateMany(options: GenerateOptions, randomFn: () => number = Math.random): IdentityRecord[] {
  const count = clampCount(options.count);
  const result: IdentityRecord[] = [];
  for (let index = 0; index < count; index += 1) {
    result.push(generateOne(options, randomFn));
  }
  return result;
}

export function clampCount(count: number): number {
  if (!Number.isFinite(count)) {
    return MIN_COUNT;
  }
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.floor(count)));
}

export function formatDate(date: Date): string {
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Format an identity record as a single TSV row for bulk-copy. */
export function formatRecordTsv(record: IdentityRecord): string {
  return [
    record.name,
    record.gender,
    record.birthDate,
    `${record.region.provinceName}/${record.region.cityName}/${record.region.countyName}`,
    record.idNumber,
    record.mobileNumber,
  ].join('\t');
}

/** Header row for the TSV export — matches `formatRecordTsv` columns. */
export const RECORD_TSV_HEADER = ['name', 'gender', 'birth', 'region', 'id', 'mobile'].join('\t');
