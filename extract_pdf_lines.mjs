import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const data = new Uint8Array(fs.readFileSync('fwc26-schedule.pdf'));
const doc = await pdfjsLib.getDocument({ data }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();
const lines = new Map();
for (const item of content.items) {
  const y = Math.round(item.transform[5]);
  if (!lines.has(y)) lines.set(y, []);
  lines.get(y).push({x: item.transform[4], str: item.str});
}
const sorted = [...lines.entries()].sort((a,b)=>b[0]-a[0]);
for (const [y, items] of sorted.slice(0,80)) {
  const text = items.sort((a,b)=>a.x - b.x).map(i=>i.str).join(' | ');
  console.log(y, text);
}
console.log('LINE COUNT', sorted.length);
