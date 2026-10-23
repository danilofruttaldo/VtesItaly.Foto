import { describe, it, expect } from 'vitest';
import { albumErrors, leakedMetadata, nextPhotoNumber } from '../scripts/photo-rules.mjs';
import { ALBUM_TYPES } from '../src/utils/album-types';

const valid = { title: 'Praxis Seizure', date: '2026-07-12', city: 'bologna', type: 'torneo' };

describe('photo rules', () => {
  it('numbers new photos after the highest one, not after the count', () => {
    expect(nextPhotoNumber([], 'gp')).toBe(1);
    expect(nextPhotoNumber(['gp-01.webp', 'gp-03.webp', 'cover.webp', 'album.json'], 'gp')).toBe(4);
    expect(nextPhotoNumber(['gp-2-09.webp', 'gp-02.webp'], 'gp')).toBe(3);
  });

  it('names the metadata blocks a photo would leak', () => {
    expect(leakedMetadata({ width: 10, height: 10, icc: Buffer.from('x') })).toEqual([]);
    expect(leakedMetadata({ exif: Buffer.from('x'), xmp: Buffer.from('x') })).toEqual(['exif', 'xmp']);
  });

  it('accepts a complete album.json', () => {
    expect(albumErrors(valid, 'a.json', ALBUM_TYPES)).toEqual([]);
    expect(albumErrors({ ...valid, event: 'https://vtesitaly.com/eventi/x/' }, 'a.json', ALBUM_TYPES)).toEqual([]);
  });

  it('rejects TODO fields, unknown types and foreign event links', () => {
    const errors = albumErrors(
      { title: 'TODO titolo', date: 'TODO-YYYY-MM-DD', city: 'Bologna', type: 'toString', event: 'http://x.it/' },
      'a.json',
      ALBUM_TYPES,
    );
    expect(errors).toHaveLength(5);
  });
});
