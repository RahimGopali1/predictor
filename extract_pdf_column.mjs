import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const data = new Uint8Array(fs.readFileSync('fwc26-schedule.pdf'));
const doc = await pdfjsLib.getDocument({ data }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();
const rows = [];
for (const item of content.items) {
  const y = Math.round(item.transform[5]);
  if (y >= 500 && y <= 540) rows.push({x:item.transform[4], y, str:item.str});
}
rows.sort((a,b)=>b.y - a.y || a.x - b.x);
for (const r of rows) console.log(r.y, r.x.toFixed(1), JSON.stringify(r.str));
console.log('COUNT', rows.length);
