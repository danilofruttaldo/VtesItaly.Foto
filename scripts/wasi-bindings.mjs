/* Installs on Windows the WebAssembly builds of Astro 7's native modules.
 *
 * Why: the Astro compiler (`@astrojs/compiler-binding`) and the markdown
 * processor (`satteri`) are Rust modules loaded as unsigned `.node` files.
 * Smart App Control blocks them, and `astro dev`, `astro build` and the
 * pre-push hook die with "Cannot find native binding", the same problem that
 * already moved esbuild to esbuild-wasm.
 *
 * Both loaders fall back on their own to the `*-wasm32-wasi` package when the
 * native one fails. npm never installs those packages, though: they declare
 * `cpu: wasm32`, which matches no machine. Adding them as dependencies with
 * `--force` doesn't help either, since `npm ci` then fails with EBADPLATFORM
 * on the Linux pipeline too.
 *
 * So they are fetched and unpacked by hand, at the version pinned in
 * package-lock, and follow Astro upgrades on their own. Their dependencies
 * (`@napi-rs/wasm-runtime`, `@emnapi/*`, `tslib`) are optional and only
 * required by these packages, so npm skips them too: they are resolved from
 * package-lock the way npm would (nested folder first, then the parents) and
 * unpacked the same way. Outside Windows it does nothing. Ported from
 * danilofruttaldo.Site (compilatore-wasi.mjs).
 *
 * Each tarball is checked against the sha512 `integrity` package-lock pins,
 * as npm itself would: a mismatch stops the install before it is unpacked.
 *
 * Runs as postinstall, after every `npm install` or `npm ci`.
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const PACKAGES = ['@astrojs/compiler-binding-wasm32-wasi', '@bruits/satteri-wasm32-wasi'];

if (process.platform !== 'win32') process.exit(0);

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')).packages;

// The lock path that `dep`, required from the package at `from`, resolves to.
function resolve(from, dep) {
  for (let base = from; ; base = base.slice(0, base.lastIndexOf('/node_modules/'))) {
    const candidate = `${base}/node_modules/${dep}`;
    if (lock[candidate]) return candidate;
    if (!base.includes('/node_modules/')) return lock[`node_modules/${dep}`] ? `node_modules/${dep}` : null;
  }
}

const queue = PACKAGES.map((pkg) => `node_modules/${pkg}`);
const seen = new Set();

while (queue.length) {
  const lockPath = queue.shift();
  if (seen.has(lockPath)) continue;
  seen.add(lockPath);

  const entry = lock[lockPath];
  if (!entry) {
    console.warn(`${lockPath} is not in package-lock: skipped.`);
    continue;
  }
  for (const dep of Object.keys(entry.dependencies ?? {})) {
    const resolved = resolve(lockPath, dep);
    if (resolved) queue.push(resolved);
  }

  const { version } = entry;
  const name = lockPath.slice(lockPath.lastIndexOf('node_modules/') + 'node_modules/'.length);
  const dir = path.join(...lockPath.split('/'));
  const manifest = path.join(dir, 'package.json');
  if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).version === version) continue;

  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  // Relative paths and cwd inside the folder: Git's tar, when it comes first
  // in PATH over Windows' one, reads `C:...` as a remote host.
  const [{ filename }] = JSON.parse(
    execSync(`npm pack ${name}@${version} --json --pack-destination .`, { cwd: dir, encoding: 'utf8' }),
  );
  const want = entry.integrity?.split(/\s+/).find((h) => h.startsWith('sha512-'));
  const got = `sha512-${createHash('sha512')
    .update(readFileSync(path.join(dir, filename)))
    .digest('base64')}`;
  if (got !== want) {
    rmSync(dir, { recursive: true, force: true });
    console.error(`${name}@${version}: the tarball's ${got} is not package-lock's ${want ?? '(no sha512)'}: stopped.`);
    process.exit(1);
  }
  execSync(`tar -xzf ${filename} --strip-components=1`, { cwd: dir });
  rmSync(path.join(dir, filename));

  console.log(`${name}@${version} installed (WebAssembly fallback).`);
}
