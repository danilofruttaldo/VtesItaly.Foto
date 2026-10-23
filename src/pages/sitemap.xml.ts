import type { APIRoute } from 'astro';
import { citiesOf, loadAlbums } from '../utils/albums';

/** Every page of the archive, for search engines (listed in robots.txt). No
 * lastmod: the album date is the event's, not the day its photos last changed. */
export const GET: APIRoute = ({ site }) => {
  const albums = loadAlbums();
  const paths = ['/', ...citiesOf(albums).map((c) => `/principati/${c.slug}/`), ...albums.map((a) => `/${a.slug}/`)];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, site).href}</loc></url>`).join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
