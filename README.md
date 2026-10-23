# Foto VTES Italy

Photo archive of the Italian VTES community, published at **https://foto.vtesitaly.com** (GitHub Pages).
vtesitaly.com reads `/albums.json` at build time to show each event's gallery.

## Adding an album

```bash
npm run add-album -- "C:\path\to\the\photos" grand-prix-2026 --title "Grand Prix 2026" --date 2026-05-02 --city bologna --event https://vtesitaly.com/grand-prix/grand-prix-2026/
```

- Photos are turned upright, resized to 1600 px on the long side and saved as WebP in `albums/<slug>/`. EXIF (GPS included) is removed.
- `albums/<slug>/album.json` holds `title`, `date` (YYYY-MM-DD), `city` (principato slug) and, optionally, `event` (the vtesitaly.com page), `cover` (a file name), `description` and `captions` (`{ "file.webp": "text" }`).
- Run it again on the same slug to add more photos. Commit and push: CI checks every photo, builds and deploys.

## How it works

- `scripts/build-photos.mjs` (prebuild) checks `albums/` against `scripts/photo-rules.mjs`, copies photos to `public/p/`, makes thumbnails and writes `src/data/manifest.json`. All of these are generated and git-ignored.
- Pages: `/` (albums by year), `/<slug>/` (grid with a full-screen viewer), `/albums.json`.
- CI warns at 750 MB and stops at 900 MB of `dist/`, below the 1 GB GitHub Pages limit.

## Scripts

`npm run dev` (port 4323) · `npm run build` · `npm test` · `npm run ci:verify` (run by the pre-push hook).
