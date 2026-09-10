// Deja el .liquid en ASCII puro. Cada zona necesita un escape distinto:
//   HTML  -> entidad decimal   (&#241;)
//   <script> -> escape Unicode (ñ)   ... dentro de cadenas JS
//   <style>  -> escape CSS     (\F1 )     ... solo aplica en content/nombres
// Las etiquetas Liquid quedan intactas porque ya son ASCII.
import fs from "node:fs";
import path from "node:path";

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ""));
const src = fs.readFileSync(path.join(dir, "pagina-slim-src.liquid"), "utf8");

// Ubica los tramos <script> y <style> para saber en qué zona cae cada char.
const zonas = [];
for (const et of ["script", "style"]) {
  const re = new RegExp(`<${et}[^>]*>[\\s\\S]*?<\\/${et}>`, "gi");
  for (const m of src.matchAll(re)) zonas.push({ ini: m.index, fin: m.index + m[0].length, et });
}
const zonaDe = (i) => zonas.find((z) => i >= z.ini && i < z.fin)?.et ?? "html";

let out = "";
let cambios = { html: 0, script: 0, style: 0 };
for (let i = 0; i < src.length; i++) {
  const c = src[i];
  const cp = c.codePointAt(0);
  if (cp < 128) { out += c; continue; }
  const z = zonaDe(i);
  cambios[z]++;
  if (z === "script") out += "\\u" + cp.toString(16).toUpperCase().padStart(4, "0");
  else if (z === "style") out += "\\" + cp.toString(16).toUpperCase() + " ";
  else out += "&#" + cp + ";";
}

const dest = path.join(dir, "pagina-slim.liquid");
fs.writeFileSync(dest, out, "utf8");

const restantes = [...out].filter((c) => c.codePointAt(0) > 127).length;
console.log("convertidos ->", JSON.stringify(cambios));
console.log("no-ASCII restantes:", restantes);
console.log("tamano:", Buffer.byteLength(out), "bytes");
