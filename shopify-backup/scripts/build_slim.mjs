// Reconstruye pagina.css, pagina.js y pagina-slim-src.liquid a partir de
// pagina-src.liquid (que tiene <style>/<script> inline). Mantiene las
// gia_css_url/gia_js_url que ya estaban en pagina-slim-src.liquid (las URLs
// del CDN vigente) para no romper nada hasta que se suba el nuevo CSS.
import fs from "node:fs";
import path from "node:path";

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ""));
const src = fs.readFileSync(path.join(dir, "pagina-src.liquid"), "utf8");
const slimActual = fs.readFileSync(path.join(dir, "pagina-slim-src.liquid"), "utf8");

const cssUrlLine = slimActual.match(/\{%-?\s*assign gia_css_url = '[^']*' -?%\}/)[0];
const jsUrlLine = slimActual.match(/\{%-?\s*assign gia_js_url = '[^']*' -?%\}/)[0];

const styleMatch = src.match(/<style>([\s\S]*?)<\/style>/);
const scriptMatch = src.match(/<script>([\s\S]*?)<\/script>/);
if (!styleMatch || !scriptMatch) throw new Error("no se encontro <style> o <script> en pagina-src.liquid");

fs.writeFileSync(path.join(dir, "pagina.css"), styleMatch[1].trim() + "\n", "utf8");
fs.writeFileSync(path.join(dir, "pagina.js"), scriptMatch[1].trim() + "\n", "utf8");

let slimSrc = src
  .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="{{ gia_css_url }}">')
  .replace(/<script>[\s\S]*?<\/script>/, '<script src="{{ gia_js_url }}" defer></script>');

// Inserta las asignaciones de gia_css_url/gia_js_url antes del primer <link preconnect>
slimSrc = slimSrc.replace(
  /\n<link rel="preconnect"/,
  `\n${cssUrlLine}\n${jsUrlLine}\n\n<link rel="preconnect"`
);

fs.writeFileSync(path.join(dir, "pagina-slim-src.liquid"), slimSrc, "utf8");
console.log("pagina.css:", Buffer.byteLength(styleMatch[1]), "bytes");
console.log("pagina.js:", Buffer.byteLength(scriptMatch[1]), "bytes");
console.log("pagina-slim-src.liquid reescrito,", Buffer.byteLength(slimSrc), "bytes");
console.log("cssUrlLine:", cssUrlLine);
console.log("jsUrlLine:", jsUrlLine);
