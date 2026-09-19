import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pages = fs.readdirSync(root).filter((name) => name.endsWith(".html"));
const failures = [];
let checkedLinks = 0;

for (const page of pages) {
  const source = fs.readFileSync(path.join(root, page), "utf8");
  // Check IDs in the authored markup only. IDs inside mutually exclusive
  // JavaScript templates are validated by the live smoke test instead.
  const markup = source.split(/<script\b/i)[0];
  const ids = [...markup.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const id of new Set(ids)) {
    if (ids.filter((value) => value === id).length > 1) failures.push(`${page}: duplicate id "${id}"`);
  }

  for (const match of source.matchAll(/\s(?:href|src)=["']([^"']+)["']/gi)) {
    const value = match[1].trim();
    if (!value || value.startsWith("#") || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value) || value.includes("${")) continue;
    const pathname = value.split(/[?#]/)[0];
    if (!pathname || pathname.startsWith("//")) continue;
    checkedLinks++;
    const target = path.resolve(root, pathname.replace(/^\//, ""));
    if (!target.startsWith(root) || !fs.existsSync(target)) failures.push(`${page}: missing local asset "${pathname}"`);
  }

  for (const match of source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { new Function(match[1]); }
    catch (error) { failures.push(`${page}: inline script syntax error: ${error.message}`); }
  }
}

if (failures.length) {
  console.error(`Portal validation failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Portal validation passed: ${pages.length} HTML pages and ${checkedLinks} local references checked.`);
