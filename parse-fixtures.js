const fs = require("fs");
const p = "C:/Users/user/Desktop/fifa-fixtures-raw.json";
const raw = fs.readFileSync(p, "utf8");
const transformed = raw
  .replace(/([\[{,\s])([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
  .replace(/\bundefined\b/g, 'null')
  .replace(/\u2026/g, '');
try {
  const data = JSON.parse(transformed);
  console.log('parsed', typeof data, Array.isArray(data), data && data.length);
} catch (err) {
  console.error('parse error', err.message);
  console.log(transformed.slice(0,2000));
}
