import fs from "node:fs";
import path from "node:path";
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ""));
const src = fs.readFileSync(path.join(dir, "producto-extra-src.liquid"), "utf8");

const zonas = [];
for (const et of ["script", "style"]) {
  const re = new RegExp("<" + et + "[^>]*>.*?</" + et + ">", "gis");
  for (const m of src.matchAll(re)) zonas.push({ ini: m.index, fin: m.index + m[0].length, et });
}
function zonaDe(i) {
  for (const z of zonas) { if (i >= z.ini && i < z.fin) return z.et; }
  return "html";
}

let out = "";
let cambios = { html: 0, script: 0, style: 0 };
for (let i = 0; i < src.length; i++) {
  const c = src[i];
  const cp = c.codePointAt(0);
  if (cp < 128) { out += c; continue; }
  const z = zonaDe(i);
  cambios[z]++;
  if (z === "script") out += String.fromCharCode(92) + "u" + cp.toString(16).toUpperCase().padStart(4, "0");
  else if (z === "style") out += String.fromCharCode(92) + cp.toString(16).toUpperCase() + " ";
  else out += "&#" + cp + ";";
}

const dest = path.join(dir, "producto-extra.liquid");
fs.writeFileSync(dest, out, "utf8");

const restantes = [...out].filter((c) => c.codePointAt(0) > 127).length;
console.log("convertidos ->", JSON.stringify(cambios));
console.log("no-ASCII restantes:", restantes);
console.log("tamano:", Buffer.byteLength(out), "bytes");
