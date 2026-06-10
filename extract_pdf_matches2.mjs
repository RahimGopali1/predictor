import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const data = new Uint8Array(fs.readFileSync('fwc26-schedule.pdf'));
const doc = await pdfjsLib.getDocument({ data }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();
const text = content.items.map(item => item.str).join(' ');
const regex = /\b([A-Z]{2,3})\s+v\s+([A-Z]{2,3})\s+([A-L])\s+(\d{1,2})\s+(\d{2}:\d{2})\b/g;
const matches = [];
let m;
while ((m = regex.exec(text)) !== null) {
  const [full, home, away, group, matchId, time] = m;
  if (parseInt(matchId,10) <= 24) matches.push({ matchId: parseInt(matchId,10), home, away, group, time });
}
matches.sort((a,b)=>a.matchId - b.matchId);
console.log('TOTAL', matches.length);
for (const row of matches) console.log(row.matchId, row.home, 'v', row.away, row.group, row.time);
