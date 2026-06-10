import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const data = new Uint8Array(fs.readFileSync('fwc26-schedule.pdf'));
const doc = await pdfjsLib.getDocument({ data }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();
const text = content.items.map(item => item.str).join(' ');
for (const pattern of ['I 18 18:00', 'IRQ  v  NOR 18 18:00', 'NOR  18 18:00', 'I 18 00:00']) {
  console.log(pattern, text.includes(pattern), text.indexOf(pattern));
}
let matches=[];
for (const m of text.matchAll(/\b([A-Z]{2,3})\s+v\s+([A-Z]{2,3})\s+I\s+(\d{1,2})\s+(\d{2}:\d{2})\b/g)) {
  matches.push(m.slice(1));
}
console.log('I match count', matches.length);
for (const m of matches) console.log(m.join(' | '));
