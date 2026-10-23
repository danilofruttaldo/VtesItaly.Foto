import { describe, it, expect } from 'vitest';
import { byYear, cityName, coverOf, formatDate, loadAlbums, publicIndex, type Album } from '../src/utils/albums';

const photo = (file: string) => ({ file, src: `/p/a/${file}`, thumb: `/p/a/${file}-t`, width: 1600, height: 1067 });
const album = (slug: string, date: string, extra: Partial<Album> = {}): Album => ({
  slug,
  title: slug,
  date,
  city: 'bologna',
  cover: '2.webp',
  photos: [photo('1.webp'), photo('2.webp')],
  ...extra,
});

describe('albums', () => {
  it('groups by year, newest year first, keeping the order inside', () => {
    const groups = byYear([album('c', '2026-05-01'), album('b', '2026-01-01'), album('a', '2025-12-01')]);
    expect(groups.map((g) => g.year)).toEqual(['2026', '2025']);
    expect(groups[0].albums.map((a) => a.slug)).toEqual(['c', 'b']);
  });

  it('picks the cover by name, the first photo otherwise', () => {
    expect(coverOf(album('a', '2026-01-01')).file).toBe('2.webp');
    expect(coverOf(album('a', '2026-01-01', { cover: 'missing.webp' })).file).toBe('1.webp');
  });

  it('formats dates and city names for Italian readers', () => {
    expect(formatDate('2026-12-19')).toBe('19 dicembre 2026');
    expect(cityName('reggio-emilia')).toBe('Reggio Emilia');
  });

  it('publishes absolute URLs for vtesitaly.com', () => {
    const [a] = publicIndex(
      [album('praxis', '2026-07-12', { event: 'https://vtesitaly.com/x/' })],
      'https://foto.vtesitaly.com/',
    ).albums;
    expect(a.url).toBe('https://foto.vtesitaly.com/praxis/');
    expect(a.cover).toBe('https://foto.vtesitaly.com/p/a/2.webp-t');
    expect(a.photos[0]).toEqual({
      src: 'https://foto.vtesitaly.com/p/a/1.webp',
      thumb: 'https://foto.vtesitaly.com/p/a/1.webp-t',
      width: 1600,
      height: 1067,
    });
    expect(a.event).toBe('https://vtesitaly.com/x/');
  });

  it('has no albums before build-photos has run', () => {
    expect(loadAlbums('/nowhere/manifest.json')).toEqual([]);
  });
});
