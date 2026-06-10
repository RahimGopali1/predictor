import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const data = new Uint8Array(fs.readFileSync('fwc26-schedule.pdf'));
const doc = await pdfjsLib.getDocument({ data }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();
content.items.slice(0,200).forEach((item,i)=>{
  console.log(i, item.str, item.transform[5].toFixed(1), item.transform[4].toFixed(1));
});
console.log('TOTAL', content.items.length);
