import fs from "node:fs";

const staged = JSON.parse(fs.readFileSync(process.argv[3] || "upload.json", "utf8"));
const filePath = process.argv[2];
const fileBuf = fs.readFileSync(filePath);
const filename = filePath.split(/[\\/]/).pop();

const boundary = "----giaboundary" + Date.now();
const parts = [];
for (const p of staged.parameters) {
  parts.push(
    `--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"\r\n\r\n${p.value}\r\n`
  );
}
parts.push(
  `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`
);
const head = Buffer.from(parts.join(""), "utf8");
const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
const body = Buffer.concat([head, fileBuf, tail]);

const res = await fetch(staged.url, {
  method: "POST",
  headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
  body,
});
console.log("status", res.status);
console.log(await res.text());
console.log("resourceUrl:", staged.resourceUrl);
