# Foto VTES Italy

Photo archive of the Italian VTES community, published at **https://foto.vtesitaly.com** (GitHub Pages).
vtesitaly.com reads `/albums.json` at build time to show each event's gallery.

## Adding an album

```bash
npm run add-album -- "C:\path\to\the\photos" grand-prix-2026 --title "Grand Prix 2026" --date 2026-05-02 --city bologna --type gp --event https://vtesitaly.com/grand-prix/grand-prix-2026/ --cover "C:\path\to\poster.jpg"
```

- Photos are turned upright, resized to 1600 px on the long side and saved as WebP in `albums/<slug>/`. EXIF (GPS included) is removed.
- Album cover: the event poster or logo (`--cover`, saved as `albums/<slug>/cover.webp`), else the principato header in `covers/<city>.webp`, else a photo.
- `albums/<slug>/album.json` holds `title`, `date` (YYYY-MM-DD), `city` (principato slug, or a town with its header in `covers/`), `type` (gp, nazionale, tour, torneo, lega, evento) and, optionally, `event` (the vtesitaly.com page), `cover` (a photo file name, to use a photo instead of the principato header), `description`, `captions` (`{ "file.webp": "text" }`) and `sections` (`[{ "title": "Finale", "photos": ["file.webp"] }]`).
- Run it again on the same slug to add more photos. Commit and push: CI checks every photo, builds and deploys.

## Removing or renaming an album

The slug is the album's address here and the key vtesitaly.com links it by, so the site has to follow.

1. Delete `albums/<slug>/` (or rename the folder, and the `<slug>-NN.webp` files and `album.json` references with it), commit and push. The build deletes the old copies under `public/p/`, and `/albums.json` drops the old slug at the next deploy.
2. In VtesItaly.Site, remove `album: <slug>` from the posts that name it (or change it to the new slug), then run `npm run albums` to refresh the committed snapshot `src/data/albums.json`, and commit both. Otherwise `scripts/fetch-albums.mjs` stops the site build (a post names an album the archive no longer has), and the snapshot it falls back on points to photos that are now 404.

## How it works

- `scripts/build-photos.mjs` (prebuild) checks `albums/` against `scripts/photo-rules.mjs`, copies photos to `public/p/`, makes thumbnails and writes `src/data/manifest.json`. All of these are generated and git-ignored.
- Pages: `/` (albums by year), `/<slug>/` (grid with a full-screen viewer), `/albums.json`.
- CI warns at 750 MB and stops at 900 MB of `dist/`, below the 1 GB GitHub Pages limit.

## Removing a photo on request

The footer promises removal to anyone who asks (info@vtesitaly.com). Deleting the file is not enough: the repo is public and the photo stays in its history.

1. Delete `albums/<slug>/<file>.webp` (and its `captions`/`sections` entries in `album.json`), commit and push: the site and `/albums.json` drop it at the next deploy, and vtesitaly.com follows.
2. Purge it from history: `git filter-repo --invert-paths --path albums/<slug>/<file>.webp`, then `git push --force` on `main` (re-add the `origin` remote first: filter-repo removes it).
3. Ask GitHub Support to drop cached views of the old commits ("Remove sensitive data"), since forks and cached commit URLs keep them otherwise.

## Scripts

`npm run dev` (port 4323) · `npm run build` · `npm test` · `npm run ci:verify` (run by the pre-push hook).
