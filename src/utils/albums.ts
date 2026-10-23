import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALBUM_TYPES, type AlbumType } from './album-types';

export interface Photo {
  file: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
  caption?: string;
  /** Title of the album section the photo is in (album.json `sections`). */
  section?: string;
}

export interface Album {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  city: string;
  /** Key of ALBUM_TYPES (scripts/album-types.mjs). */
  type: string;
  /** The event page on vtesitaly.com. */
  event?: string;
  description?: string;
  /** File name of the cover photo. */
  cover: string;
  photos: Photo[];
}

/** Albums written by scripts/build-photos.mjs, newest first; none before it has run. */
export function loadAlbums(file = resolve('src/data/manifest.json')): Album[] {
  if (!existsSync(file)) return [];
  return (JSON.parse(readFileSync(file, 'utf8')) as { albums: Album[] }).albums;
}

export function coverOf(album: Album): Photo {
  return album.photos.find((p) => p.file === album.cover) ?? album.photos[0];
}

/** Albums grouped by year, newest year first, keeping the order within each. */
export function byYear(albums: Album[]): { year: string; albums: Album[] }[] {
  const groups = new Map<string, Album[]>();
  for (const a of albums) {
    const year = a.date.slice(0, 4);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year)!.push(a);
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([year, list]) => ({ year, albums: list }));
}

/** Consecutive photos of the same section, each with its index in the whole album. */
export function sectionsOf(photos: Photo[]): { title?: string; photos: { photo: Photo; index: number }[] }[] {
  const out: { title?: string; photos: { photo: Photo; index: number }[] }[] = [];
  photos.forEach((photo, index) => {
    const last = out[out.length - 1];
    if (last && last.title === photo.section) last.photos.push({ photo, index });
    else out.push({ title: photo.section, photos: [{ photo, index }] });
  });
  return out;
}

/** Principati with at least one album, by name, with how many albums each has. */
export function citiesOf(albums: Album[]): { slug: string; name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const a of albums) counts.set(a.city, (counts.get(a.city) ?? 0) + 1);
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, name: cityName(slug), count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

/** Card label of an album type ("Grand Prix" for "gp"); the raw value when unknown. */
export function typeLabel(type: string): string {
  return ALBUM_TYPES[type as AlbumType] ?? type;
}

/** "Bologna" from the principato slug "bologna". */
export function cityName(city: string): string {
  return city
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** "19 dicembre 2026" from "2026-12-19", whatever the build machine's timezone. */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/**
 * /albums.json: what vtesitaly.com reads to show an event's gallery. URLs are
 * absolute, so the site can use them as they are.
 */
export function publicIndex(albums: Album[], site: string) {
  const abs = (path: string) => new URL(path, site).href;
  return {
    albums: albums.map((a) => ({
      slug: a.slug,
      title: a.title,
      date: a.date,
      city: a.city,
      url: abs(`/${a.slug}/`),
      ...(a.event ? { event: a.event } : {}),
      cover: abs(coverOf(a).thumb),
      photos: a.photos.map((p) => ({
        src: abs(p.src),
        thumb: abs(p.thumb),
        width: p.width,
        height: p.height,
        ...(p.caption ? { caption: p.caption } : {}),
      })),
    })),
  };
}
