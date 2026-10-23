import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALBUM_TYPES, type AlbumType } from './album-types';

export interface Photo {
  file: string;
  src: string;
  thumb: string;
  /** The thumb at half size (320 px), for the grid's srcset. */
  thumbSmall?: string;
  width: number;
  height: number;
  caption?: string;
  /** Title of the album section the photo is in (album.json `sections`). */
  section?: string;
}

export interface Cover {
  src: string;
  /** Square for a poster or a principato header, the photo thumb otherwise. */
  thumb: string;
  width: number;
  height: number;
  /** Size of `src` itself (the poster, header or photo). */
  srcWidth?: number;
  srcHeight?: number;
  kind: 'poster' | 'city' | 'photo';
}

/** Base.astro's social preview props for an album cover. */
export function coverImage(cover: Cover): { image: string; imageWidth?: number; imageHeight?: number } {
  return { image: cover.src, imageWidth: cover.srcWidth, imageHeight: cover.srcHeight };
}

/**
 * Twitter/X card for a preview image: the large card crops to about 1.91:1,
 * which would cut a vertical poster to a strip and a 1600x350 principato
 * header to its middle, so those get the small (square) card. Landscape
 * photos, and images of unknown size, keep the large one.
 */
export function twitterCard(width?: number, height?: number): 'summary' | 'summary_large_image' {
  if (!width || !height) return 'summary_large_image';
  const ratio = width / height;
  return ratio >= 1.3 && ratio <= 2.5 ? 'summary_large_image' : 'summary';
}

export interface Album {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  city: string;
  /** Key of ALBUM_TYPES (src/utils/album-types.ts). */
  type: string;
  /** The event page on vtesitaly.com. */
  event?: string;
  description?: string;
  /** The card image: event poster or logo, principato header, or a photo (scripts/build-photos.mjs). */
  cover: Cover;
  photos: Photo[];
}

/** Albums written by scripts/build-photos.mjs, newest first; none before it has run. */
export function loadAlbums(file = resolve('src/data/manifest.json')): Album[] {
  if (!existsSync(file)) return [];
  return (JSON.parse(readFileSync(file, 'utf8')) as { albums: Album[] }).albums;
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
      cover: abs(a.cover.thumb),
      photos: a.photos.map((p) => ({
        src: abs(p.src),
        thumb: abs(p.thumb),
        width: p.width,
        height: p.height,
        ...(p.caption ? { caption: p.caption } : {}),
        ...(p.section ? { section: p.section } : {}),
      })),
    })),
  };
}
