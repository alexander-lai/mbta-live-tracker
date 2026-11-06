import { describe, expect, it } from 'vitest';
import { decodePolyline } from './polyline';
import { formatAgo, formatEta } from './time';

describe('decodePolyline', () => {
  it('decodes the reference example from the Google spec', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]);
  });

  it('returns an empty array for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});

describe('formatEta', () => {
  const now = Date.parse('2026-01-01T12:00:00Z');
  const at = (s: number) => new Date(now + s * 1000).toISOString();

  it('says Now for arrivals under a minute away', () => {
    expect(formatEta(at(20), now)).toBe('Now');
  });
  it('rounds to minutes', () => {
    expect(formatEta(at(150), now)).toBe('3 min');
  });
  it('drops arrivals that are well in the past', () => {
    expect(formatEta(at(-120), now)).toBeNull();
  });
});

describe('formatAgo', () => {
  const now = 1_000_000;
  it('formats seconds and minutes', () => {
    expect(formatAgo(now - 2_000, now)).toBe('just now');
    expect(formatAgo(now - 15_000, now)).toBe('15s ago');
    expect(formatAgo(now - 190_000, now)).toBe('3m ago');
  });
});
