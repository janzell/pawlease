// Produces a Vercel Build Output API bundle (.vercel/output):
//   static/            the Vite-built SPA
//   functions/api.func the Express API bundled into one ESM file
// Vercel uses this directory as-is, so no framework detection is involved.
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const out = ".vercel/output";
rmSync(out, { recursive: true, force: true });

cpSync("dist", `${out}/static`, { recursive: true });

const fn = `${out}/functions/api.func`;
mkdirSync(fn, { recursive: true });
await build({
  entryPoints: ["api/index.ts"],
  outfile: `${fn}/index.mjs`,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  minify: true,
  // Express and friends are CommonJS and call require() on Node builtins.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});
writeFileSync(
  `${fn}/.vc-config.json`,
  JSON.stringify({ runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", shouldAddHelpers: false, maxDuration: 15 }, null, 2),
);

writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/assets/(.*)$", headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true },
        { src: "^/sw\\.js$", headers: { "cache-control": "no-cache" }, continue: true },
        { src: "^/api(/.*)?$", dest: "/api" },
        { handle: "filesystem" },
        { src: "^/(.*)$", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log("Wrote", out);
