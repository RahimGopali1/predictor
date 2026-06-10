const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'fixture-status.json');
const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const s = JSON.parse(raw);
const bad = [];
for (const [id, nm] of Object.entries(s.nextMatches)) {
  const m = nm.match;
  if (!m) continue;
  if ((m.home === id && !m.isHome) || (m.away === id && m.isHome)) bad.push({ id, match: m });
}
console.log('bad', bad.length);
if (bad.length) console.log(JSON.stringify(bad, null, 2));
