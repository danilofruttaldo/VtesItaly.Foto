import { describe, it, expect } from 'vitest';
import { albumValue, filterOptions, matches, readSelection } from '../src/utils/album-filter';
import type { Album } from '../src/utils/albums';

const album = (slug: string, date: string, city: string, type: string): Album => ({
  slug,
  title: slug,
  date,
  city,
  type,
  cover: { src: '/c.webp', thumb: '/c-t.webp', width: 480, height: 480, kind: 'poster' },
  photos: [],
});

const albums = [
  album('a', '2026-05-02', 'bologna', 'gp'),
  album('b', '2025-07-13', 'modena', 'torneo'),
  album('c', '2026-02-15', 'modena', 'tour'),
  album('d', '2005-11-06', 'budapest', 'ec'),
];

describe('filterOptions', () => {
  it('lists cities and types by name, years newest first, with counts', () => {
    const o = filterOptions(albums);
    expect(o.citta.map((c) => `${c.label} ${c.count}`)).toEqual(['Bologna 1', 'Budapest 1', 'Modena 2']);
    expect(o.anno.map((y) => y.value)).toEqual(['2026', '2025', '2005']);
    expect(o.tipo.map((t) => t.label)).toEqual(['European Championship', 'Grand Prix', 'Torneo', 'Tour']);
  });
});

describe('readSelection', () => {
  const known = { citta: new Set(['modena', 'bologna']), anno: new Set(['2026']), tipo: new Set(['tour']) };

  it('keeps known values and drops the rest', () => {
    expect(readSelection(new URLSearchParams('citta=modena&anno=1999&tipo=tour'), known)).toEqual({
      citta: 'modena',
      tipo: 'tour',
    });
  });

  it('opens an old ?principati= address on its first city', () => {
    expect(readSelection(new URLSearchParams('principati=bologna,modena'), known)).toEqual({ citta: 'bologna' });
  });
});

describe('matches', () => {
  const values = (a: Album) => ({
    citta: albumValue(a, 'citta'),
    anno: albumValue(a, 'anno'),
    tipo: albumValue(a, 'tipo'),
  });

  it('combines the chosen filters, an empty selection keeps all', () => {
    expect(albums.filter((a) => matches(values(a), {})).length).toBe(4);
    expect(albums.filter((a) => matches(values(a), { citta: 'modena' })).map((a) => a.slug)).toEqual(['b', 'c']);
    expect(albums.filter((a) => matches(values(a), { citta: 'modena', anno: '2026' })).map((a) => a.slug)).toEqual([
      'c',
    ]);
    expect(albums.filter((a) => matches(values(a), { tipo: 'ec', anno: '2026' }))).toEqual([]);
  });
});
