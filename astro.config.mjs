import { defineConfig, passthroughImageService } from 'astro/config';

export default defineConfig({
  site: 'https://foto.vtesitaly.com',
  // Same rule as vtesitaly.com: every address ends with a slash.
  trailingSlash: 'always',
  // Photos are resized by scripts/build-photos.mjs, not by Astro.
  image: { service: passthroughImageService() },
  vite: {
    // esbuild (the wasm build, see package.json) instead of lightningcss, whose
    // unsigned native module Smart App Control blocks on the dev machine. Same
    // choice as vtesitaly.com.
    build: { cssMinify: 'esbuild' },
  },
});
