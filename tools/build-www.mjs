/* Assemble the web bundle Capacitor ships as the native app.
   Copies the portal's HTML/CSS/JS/images into www/. The native app's
   index.html is replaced with a launcher that opens the member login,
   so the app opens to the app - NOT the public marketing website. */
import { readdirSync, mkdirSync, copyFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const OUT = "www";
const KEEP_EXT = new Set([".html", ".css", ".js", ".png", ".jpg", ".jpeg",
  ".gif", ".webp", ".svg", ".ico", ".webmanifest", ".woff", ".woff2"]);
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
  if (st.isDirectory()) continue;
  if (!KEEP_EXT.has(extname(name).toLowerCase())) continue;
  copyFileSync(name, join(OUT, name));
  n++;
}

// The real marketing homepage was copied as index.html; in the APP we don't
// want the public website. Replace the app's entry point with a launcher that
// jumps straight to the member sign-in (which itself forwards to the portal
// if already signed in). The website's own index.html is untouched.
const LAUNCH = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<title>NNCC Portal</title><style>html,body{margin:0;height:100%;background:#0c2a4d}</style>' +
  '<script>location.replace("login.html");</script></head><body></body></html>';
writeFileSync(join(OUT, "index.html"), LAUNCH);

console.log(`build-www: copied ${n} files into ${OUT}/ (+ app launcher index.html)`);
