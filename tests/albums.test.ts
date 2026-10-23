import { describe, it, expect } from 'vitest';
import {
  byYear,
  citiesOf,
  cityName,
  formatDate,
  loadAlbums,
  publicIndex,
  twitterCard,
  typeLabel,
  type Album,
} from '../src/utils/albums';

const photo = (file: string) => ({ file, src: `/p/a/${file}`, thumb: `/p/a/${file}-t`, width: 1600, height: 1067 });
const album = (slug: string, date: string, extra: Partial<Album> = {}): Album => ({
  slug,
  title: slug,
  date,
  city: 'bologna',
  type: 'torneo',
  cover: { src: '/p/a/cover.webp', thumb: '/p/a/cover-thumb.webp', width: 480, height: 480, kind: 'poster' },
  photos: [photo('1.webp'), photo('2.webp')],
  ...extra,
});

describe('albums', () => {
  it('gives vertical posters and wide headers the small social card', () => {
    expect(twitterCard(1600, 1067)).toBe('summary_large_image');
    expect(twitterCard(1200, 630)).toBe('summary_large_image');
    expect(twitterCard(848, 1200)).toBe('summary');
    expect(twitterCard(1600, 350)).toBe('summary');
    expect(twitterCard(720, 720)).toBe('summary');
    expect(twitterCard()).toBe('summary_large_image');
  });

  it('groups by year, newest year first, keeping the order inside', () => {
    const groups = byYear([album('c', '2026-05-01'), album('b', '2026-01-01'), album('a', '2025-12-01')]);
    expect(groups.map((g) => g.year)).toEqual(['2026', '2025']);
    expect(groups[0].albums.map((a) => a.slug)).toEqual(['c', 'b']);
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
    expect(a.cover).toBe('https://foto.vtesitaly.com/p/a/cover-thumb.webp');
    expect(a.photos[0]).toEqual({
      src: 'https://foto.vtesitaly.com/p/a/1.webp',
      thumb: 'https://foto.vtesitaly.com/p/a/1.webp-t',
      width: 1600,
      height: 1067,
    });
    expect(a.event).toBe('https://vtesitaly.com/x/');
    expect(
      publicIndex(
        [album('s', '2026-01-01', { photos: [{ ...photo('1.webp'), section: 'Finale' }] })],
        'https://foto.vtesitaly.com/',
      ).albums[0].photos[0].section,
    ).toBe('Finale');
  });

  it('lists the principati with albums, by name, with their counts', () => {
    const list = citiesOf([
      album('a', '2026-01-01'),
      album('b', '2026-02-01', { city: 'firenze' }),
      album('c', '2025-01-01'),
    ]);
    expect(list).toEqual([
      { slug: 'bologna', name: 'Bologna', count: 2 },
      { slug: 'firenze', name: 'Firenze', count: 1 },
    ]);
  });

  it('labels album types', () => {
    expect(typeLabel('gp')).toBe('Grand Prix');
    expect(typeLabel('torneo')).toBe('Torneo');
    expect(typeLabel('altro')).toBe('altro');
  });

  it('has no albums before build-photos has run', () => {
    expect(loadAlbums('/nowhere/manifest.json')).toEqual([]);
  });
});
