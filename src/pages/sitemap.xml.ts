import type { APIRoute } from 'astro';
import { citiesOf, loadAlbums } from '../utils/albums';

/** Every page of the archive, for search engines (listed in robots.txt). */
export const GET: APIRoute = ({ site }) => {
  const albums = loadAlbums();
  const pages = [
    { path: '/', lastmod: albums[0]?.date },
    ...citiesOf(albums).map((c) => ({
      path: `/principati/${c.slug}/`,
      lastmod: albums.find((a) => a.city === c.slug)?.date,
    })),
    ...albums.map((a) => ({ path: `/${a.slug}/`, lastmod: a.date })),
  ];
  const urls = pages
    .map(
      (p) =>
        `  <url><loc>${new URL(p.path, site).href}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>`,
    )
    .join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
