import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Photo {
  file: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
  caption?: string;
}

export interface Album {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  city: string;
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
