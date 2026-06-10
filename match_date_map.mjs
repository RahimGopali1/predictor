import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const data = new Uint8Array(fs.readFileSync('fwc26-schedule.pdf'));
const doc = await pdfjsLib.getDocument({ data }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();
const items = content.items.map(item => ({str:item.str, x:item.transform[4], y:item.transform[5]}));
const headers = items.filter(i=>i.y>720 && /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/.test(i.str));
const dates = items.filter(i=>i.y>720 && /\d{1,2}\s+June/.test(i.str));
const headerCols = headers.map(h=>({x:h.x, day:h.str}));
console.log('HEADER days', headerCols.length);
for (const d of dates) console.log('DATE', d.y.toFixed(1), d.x.toFixed(1), d.str);
for (let id=1; id<=24; id++) {
  const matches = items.filter(i=>i.str===String(id) && i.y<700 && i.y>180);
  if (matches.length===0) continue;
  const m = matches[0];
  const closest = dates.reduce((best,cur)=> Math.abs(cur.x-m.x) < Math.abs(best.x-m.x) ? cur : best, dates[0]);
  console.log('ID', id, 'x', m.x.toFixed(1), 'y', m.y.toFixed(1), 'closestDate', closest.str, 'dayY', closest.y.toFixed(1));
}
