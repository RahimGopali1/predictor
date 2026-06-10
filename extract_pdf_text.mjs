import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const data = new Uint8Array(fs.readFileSync('fwc26-schedule.pdf'));
const doc = await pdfjsLib.getDocument({ data }).promise;
console.log('PAGES', doc.numPages);
for (let i = 1; i <= Math.min(doc.numPages, 5); i++) {
  const page = await doc.getPage(i);
  const content = await page.getTextContent();
  const text = content.items.map(item => item.str).join(' ');
  console.log('--- PAGE', i, '---');
  console.log(text.substring(0, 2000));
  console.log('--- END ---');
}
