import { describe, expect, it } from 'vitest';

import {
  buildIdNumber,
  buildMobileNumber,
  clampCount,
  computeIdChecksum,
  formatDate,
  formatRecordTsv,
  generateMany,
  generateOne,
  MAX_COUNT,
  MIN_COUNT,
  pickRandomCounty,
  pickRandomDateBetween,
  pickRandomGender,
  pickRandomName,
  RECORD_TSV_HEADER,
} from './identityUtils';
import { ALL_COUNTIES, ALL_NAMES } from './seedData';

/**
 * Deterministic PRNG so tests can drive the random branches without
 * flaking. Each call returns the values from the supplied script in turn,
 * cycling once exhausted.
 */
function scriptedRandom(values: number[]): () => number {
  let index = 0;
  return () => {
    const next = values[index % values.length];
    index += 1;
    return next;
  };
}

describe('computeIdChecksum', () => {
  it('matches the published GB 11643 example (110105194912310020 → checksum X)', () => {
    expect(computeIdChecksum('11010519491231002')).toBe('X');
  });

  it('produces every checksum letter from a 17-digit numeric input', () => {
    // Just sanity — the result is always a single letter from the table.
    expect(computeIdChecksum('00000000000000000')).toMatch(/^[0-9X]$/);
    expect(computeIdChecksum('99999999999999999')).toMatch(/^[0-9X]$/);
  });

  it('rejects non-numeric or wrong-length inputs', () => {
    expect(() => computeIdChecksum('1234')).toThrow();
    expect(() => computeIdChecksum('abcdefghijklmnopq')).toThrow();
  });
});

describe('buildIdNumber', () => {
  const sampleArea = '110105'; // 朝阳区
  const sampleDate = new Date(2001, 2, 15); // 2001-03-15 local

  it('produces an 18-digit string with the right area / date / gender encoding', () => {
    const id = buildIdNumber(sampleArea, sampleDate, 'male', 137);
    expect(id).toHaveLength(18);
    expect(id.slice(0, 6)).toBe('110105');
    expect(id.slice(6, 14)).toBe('20010315');
    // Last digit of the sequence (positions 15..17) decides gender — odd for male.
    const seqLast = Number(id[16]);
    expect(seqLast % 2).toBe(1);
    // Round-trip the checksum.
    expect(computeIdChecksum(id.slice(0, 17))).toBe(id[17]);
  });

  it('forces an even sequence tail for female ids', () => {
    const id = buildIdNumber(sampleArea, sampleDate, 'female', 137);
    expect(Number(id[16]) % 2).toBe(0);
  });

  it('rejects malformed area codes', () => {
    expect(() => buildIdNumber('11010', sampleDate, 'male', 1)).toThrow();
    expect(() => buildIdNumber('abcdef', sampleDate, 'male', 1)).toThrow();
  });
});

describe('buildMobileNumber', () => {
  it('generates a plausible mainland China mobile number', () => {
    expect(buildMobileNumber(scriptedRandom([0, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]))).toBe('13001234567');
    expect(buildMobileNumber(() => 0.999)).toMatch(/^1[3-9]\d{9}$/);
  });
});

describe('pickRandomCounty', () => {
  it('returns the exact county when countyId matches', () => {
    const target = ALL_COUNTIES[42];
    expect(pickRandomCounty({ countyId: target.id })).toEqual(target);
  });

  it('narrows by city when cityId is set', () => {
    const cityId = ALL_COUNTIES[0].cityId;
    const cityPool = ALL_COUNTIES.filter((county) => county.cityId === cityId);
    const picked = pickRandomCounty({ cityId }, () => 0);
    expect(cityPool).toContainEqual(picked);
  });

  it('narrows by province when only provinceId is set', () => {
    const provinceId = ALL_COUNTIES[0].provinceId;
    const provincePool = ALL_COUNTIES.filter((county) => county.provinceId === provinceId);
    const picked = pickRandomCounty({ provinceId }, () => 0);
    expect(provincePool).toContainEqual(picked);
  });

  it('falls back to the global pool when filters narrow to empty', () => {
    const picked = pickRandomCounty({ provinceId: '999999' }, () => 0);
    expect(ALL_COUNTIES).toContainEqual(picked);
  });
});

describe('pickRandomDateBetween', () => {
  it('returns the lower bound when from === to', () => {
    const day = new Date(2024, 0, 1);
    expect(pickRandomDateBetween(day, day).getTime()).toBe(day.getTime());
  });

  it('clamps inverted ranges to the start date', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2020, 0, 1);
    expect(pickRandomDateBetween(start, end).getFullYear()).toBe(2024);
  });

  it('produces a date within the inclusive range for arbitrary random values', () => {
    const start = new Date(2000, 0, 1);
    const end = new Date(2010, 11, 31);
    for (const random of [0, 0.25, 0.5, 0.75, 0.999]) {
      const picked = pickRandomDateBetween(start, end, () => random);
      expect(picked.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(picked.getTime()).toBeLessThanOrEqual(end.getTime() + 24 * 60 * 60 * 1000);
    }
  });
});

describe('pickRandomGender / pickRandomName', () => {
  it('flips a coin on the supplied random source', () => {
    expect(pickRandomGender(() => 0)).toBe('male');
    expect(pickRandomGender(() => 0.99)).toBe('female');
  });

  it('returns a real seed-pool name', () => {
    const name = pickRandomName(() => 0);
    expect(ALL_NAMES).toContain(name);
  });
});

describe('generateOne / generateMany', () => {
  it('produces a record whose ID encodes the chosen filters', () => {
    const record = generateOne(
      {
        countyId: '110105',
        gender: 'female',
        birthFrom: new Date(2001, 0, 1),
        birthTo: new Date(2001, 0, 1),
      },
      () => 0.42,
    );

    expect(record.idNumber.slice(0, 6)).toBe('110105');
    expect(record.idNumber.slice(6, 14)).toBe('20010101');
    expect(record.gender).toBe('female');
    expect(record.region.countyId).toBe('110105');
    expect(record.birthDate).toBe('2001-01-01');
    expect(ALL_NAMES).toContain(record.name);
    expect(record.mobileNumber).toMatch(/^1[3-9]\d{9}$/);
    // Checksum holds.
    expect(computeIdChecksum(record.idNumber.slice(0, 17))).toBe(record.idNumber[17]);
  });

  it('honours an inverted random sequence per call', () => {
    // First call gets randomFn = 0 → male, second call → female.
    const [first, second] = generateMany(
      { count: 2 },
      scriptedRandom([0, 0, 0, 0, 0.5, 0.99, 0.99, 0.99, 0.99, 0.5]),
    );
    expect(first.gender).not.toBe(second.gender);
  });

  it('clamps count to [MIN_COUNT, MAX_COUNT]', () => {
    expect(clampCount(-5)).toBe(MIN_COUNT);
    expect(clampCount(0)).toBe(MIN_COUNT);
    expect(clampCount(MAX_COUNT + 1000)).toBe(MAX_COUNT);
    expect(clampCount(Number.NaN)).toBe(MIN_COUNT);
    expect(clampCount(7.9)).toBe(7);
  });

  it('does not exceed MAX_COUNT even when the caller asks for more', () => {
    const records = generateMany({ count: MAX_COUNT + 250 });
    expect(records).toHaveLength(MAX_COUNT);
  });
});

describe('formatRecordTsv', () => {
  it('joins the canonical column order with tabs and matches the header', () => {
    const row = formatRecordTsv({
      name: '王子涵',
      gender: 'male',
      birthDate: '2001-03-15',
      region: {
        provinceName: '北京市',
        cityName: '北京市辖区',
        countyName: '朝阳区',
        countyId: '110105',
      },
      idNumber: '11010520010315001X',
      mobileNumber: '13001234567',
    });

    expect(row).toBe('王子涵\tmale\t2001-03-15\t北京市/北京市辖区/朝阳区\t11010520010315001X\t13001234567');
    expect(RECORD_TSV_HEADER.split('\t')).toHaveLength(6);
  });
});

describe('formatDate', () => {
  it('emits zero-padded YYYY-MM-DD', () => {
    expect(formatDate(new Date(2024, 0, 5))).toBe('2024-01-05');
    const earlyYear = new Date(2024, 8, 9);
    earlyYear.setFullYear(7);
    expect(formatDate(earlyYear)).toBe('0007-09-09');
  });
});
