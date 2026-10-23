import type { APIRoute } from 'astro';
import { loadAlbums, publicIndex } from '../utils/albums';

/** The index vtesitaly.com reads at build time to show each event's gallery. */
export const GET: APIRoute = ({ site }) =>
  new Response(JSON.stringify(publicIndex(loadAlbums(), site!.href)), {
    headers: { 'Content-Type': 'application/json' },
  });
