import { Liquid } from "liquidjs";
import fs from "node:fs";
import path from "node:path";
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ""));
const src = fs.readFileSync(path.join(dir, "newsletter-footer.liquid"), "utf8");
const engine = new Liquid();
const html = await engine.parseAndRender(src, {});
const full = "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\">" +
  "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
  "<title>Giapura - newsletter footer</title>" +
  "<style>body{margin:0}</style></head><body>" + html + "</body></html>";
fs.writeFileSync(path.join(dir, "harness_newsletter.html"), full);
console.log("harness_newsletter.html escrito,", html.length, "caracteres");
