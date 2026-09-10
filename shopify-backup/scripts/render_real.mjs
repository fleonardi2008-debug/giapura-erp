// Renderiza pagina.liquid con un interprete real de Liquid, simulando lo
// minimo que Shopify aporta: collections.all.products.first (con .url) y
// el filtro asset_url/file_url (no usados aca, ya son URLs literales).
import { Liquid } from "liquidjs";
import fs from "node:fs";
import path from "node:path";

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ""));
const src = fs.readFileSync(path.join(dir, "pagina-slim.liquid"), "utf8");

const engine = new Liquid();
const ctx = {
  collections: { all: { products: { first: { url: "/products/pack-1-y-1" } } } },
};

const html = await engine.parseAndRender(src, ctx);

const full = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Giapura - pagina completa (Shopify)</title>
<style>body{margin:0;background:#ece1cc;overflow-x:hidden}</style>
</head><body>
${html}
</body></html>`;

fs.writeFileSync(path.join(dir, "harness_slim", "index.html"), full);
console.log("harness_full/index.html escrito,", html.length, "caracteres de HTML resuelto");

// contar cuantas <img> de testimonios salieron (debe ser 27 x 2 = 54)
const testiCount = (html.match(/t\d\d\.jpg/g) || []).length;
console.log("referencias a t##.jpg en el HTML final:", testiCount, "(esperado: 54, 27 en el carrusel + 27 en la grilla)");
const pendLiquid = html.match(/\{[{%][^}]*[}%]\}/g);
console.log("liquid sin resolver:", pendLiquid ? pendLiquid.slice(0,5) : "ninguno");
