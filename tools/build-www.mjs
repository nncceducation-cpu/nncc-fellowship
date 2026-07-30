/* Assemble the web bundle Capacitor ships as the native app.
   Copies the portal's HTML/CSS/JS/images into www/. Course, webinar and
   forum CONTENT is fetched live from Supabase at runtime, so it is not
   bundled — only the page shells are. */
import { readdirSync, mkdirSync, copyFileSync, rmSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const OUT = "www";
const KEEP_EXT = new Set([".html", ".css", ".js", ".png", ".jpg", ".jpeg",
  ".gif", ".webp", ".svg", ".ico", ".webmanifest", ".woff", ".woff2"]);
// files that are source/config/deploy artifacts, never shipped in the app
const SKIP_FILES = new Set([
  "netlify.toml", "sitemap.xml", "robots.txt", "CNAME",
  "download-images.ps1", "google54eec4e34bccf4d2.html", "download",
  "capacitor.config.json", "package.json", "package-lock.json"
]);
const SKIP_DIRS = new Set(["www", "ios", "android", "node_modules", ".git",
  ".github", "tools", "scripts", "supabase", "resources", "store"]);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let n = 0;
for (const name of readdirSync(".")) {
  if (SKIP_DIRS.has(name) || SKIP_FILES.has(name)) continue;
  let st; try { st = statSync(name); } catch { continue; }
  if (st.isDirectory()) continue;               // top-level only; site is flat
  if (!KEEP_EXT.has(extname(name).toLowerCase())) continue;
  copyFileSync(name, join(OUT, name));
  n++;
}
console.log(`build-www: copied ${n} files into ${OUT}/`);
