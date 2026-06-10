import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const data = new Uint8Array(fs.readFileSync('fwc26-schedule.pdf'));
const doc = await pdfjsLib.getDocument({ data }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();
const text = content.items.map(item => item.str).join(' ');
const regex = /\b(\d{1,2})\s+([A-Z]{2,3})\s+v\s+([A-Z]{2,3})\s+([A-L])\s+(\d{1,2})\s+(\d{2}:\d{2})\b/g;
const matches = [];
let m;
while ((m = regex.exec(text)) !== null) {
  matches.push({id: m[1], home: m[2], away: m[3], group: m[4], day: m[5], time: m[6]});
}
console.log('TOTAL', matches.length);
for (const row of matches) console.log(row.id, row.home, 'v', row.away, row.group, row.day, row.time);
