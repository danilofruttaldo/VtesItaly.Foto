import { describe, it, expect } from 'vitest';
import { albumErrors, imageErrors, leakedMetadata, nextPhotoNumber, orderBySections } from '../scripts/photo-rules.mjs';
import { ALBUM_TYPES } from '../src/utils/album-types';

const valid = { title: 'Praxis Seizure', date: '2026-07-12', city: 'bologna', type: 'torneo' };

describe('photo rules', () => {
  it('numbers new photos after the highest one, not after the count', () => {
    expect(nextPhotoNumber([], 'gp')).toBe(1);
    expect(nextPhotoNumber(['gp-01.webp', 'gp-03.webp', 'cover.webp', 'album.json'], 'gp')).toBe(4);
    expect(nextPhotoNumber(['gp-2-09.webp', 'gp-02.webp'], 'gp')).toBe(3);
    expect(nextPhotoNumber(['gp-07-premi.webp', 'gp-02.webp'], 'gp')).toBe(8);
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

  it('orders photos by section, unlisted ones last, and reports bad references', () => {
    const photos = ['a.webp', 'b.webp', 'c.webp'].map((file) => ({ file }));
    expect(orderBySections(photos, undefined, 'a.json')).toEqual({ photos, errors: [] });
    const { photos: ordered, errors } = orderBySections(
      photos,
      [{ title: 'Finale', photos: ['c.webp', 'x.webp', 'c.webp'] }],
      'a.json',
    );
    expect(ordered).toEqual([{ file: 'c.webp', section: 'Finale' }, { file: 'a.webp' }, { file: 'b.webp' }]);
    expect(errors).toHaveLength(2);
  });

  it('checks format, size and metadata of an image', () => {
    const ok = { format: 'webp', width: 1600, height: 1067 };
    expect(imageErrors('p.webp', ok, 300 * 1024)).toEqual([]);
    expect(imageErrors('p.webp', { ...ok, width: 2000 }, 300 * 1024)).toHaveLength(1);
    expect(imageErrors('p.webp', ok, 700 * 1024)).toHaveLength(1);
    expect(imageErrors('p.webp', { ...ok, format: 'jpeg', exif: Buffer.from('x') }, 1)).toHaveLength(2);
  });
});
