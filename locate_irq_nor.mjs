import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const data = new Uint8Array(fs.readFileSync('fwc26-schedule.pdf'));
const doc = await pdfjsLib.getDocument({ data }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();
for (const item of content.items) {
  if (item.str === 'IRQ' || item.str === 'NOR' || item.str === 'I' || item.str === '18' || item.str === '18:00') {
    console.log(item.str, item.transform[4].toFixed(1), item.transform[5].toFixed(1));
  }
}
