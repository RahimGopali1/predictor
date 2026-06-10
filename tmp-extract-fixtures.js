const fs = require('fs');
const path = require('path');
const input = 'C:/Users/user/Desktop/fifa-fixtures-raw.json';
const outPath = path.join(__dirname, 'data', 'opening-fixtures.json');
const raw = fs.readFileSync(input, 'utf8');
const lines = raw.split(/\r?\n/).map(l => l.trim());
const matches = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.includes('IdMatch')) continue;
  // find value in next few lines
  const m = { rawIndex: i };
  const getValue = (start) => {
    for (let j = start; j < start + 8 && j < lines.length; j++) {
      const candidate = lines[j].replace(/^"|"$/g, '').trim();
      if (candidate === ':' || candidate === '') continue;
      // skip tokens like 'Home' or '{' etc
      if (/^[\[\]\{\}]$/.test(candidate)) continue;
      return candidate.replace(/^,|,$/g, '').replace(/^"|"$/g, '');
    }
    return null;
  };
  // IdMatch value
  m.IdMatch = getValue(i+1);
  // scan next 120 lines for properties
  for (let j = i; j < i + 200 && j < lines.length; j++) {
    const t = lines[j];
    if (t.includes('Date')) m.Date = getValue(j+1) || m.Date;
    if (t.includes('LocalDate')) m.LocalDate = getValue(j+1) || m.LocalDate;
    if (t.includes('MatchNumber')) m.MatchNumber = getValue(j+1) || m.MatchNumber;
    if (t.includes('GroupName')) {
      // look ahead for Description line
      for (let k = j; k < j+20 && k < lines.length; k++) {
        if (lines[k].includes('Description')) { m.Group = getValue(k+1); break; }
      }
    }
    if (t.includes('Home')) {
      // find Abbreviation within next 20 lines
      for (let k = j; k < j+20 && k < lines.length; k++) {
        if (lines[k].includes('Abbreviation')) { m.HomeAbbr = getValue(k+1); break; }
        if (lines[k].includes('IdTeam') && !m.HomeId) { m.HomeId = getValue(k+1); }
      }
    }
    if (t.includes('Away')) {
      for (let k = j; k < j+20 && k < lines.length; k++) {
        if (lines[k].includes('Abbreviation')) { m.AwayAbbr = getValue(k+1); break; }
        if (lines[k].includes('IdTeam') && !m.AwayId) { m.AwayId = getValue(k+1); }
      }
    }
    if (t.includes('Stadium')) {
      // find Name Description and CityName Description
      for (let k = j; k < j+40 && k < lines.length; k++) {
        if (lines[k].includes('Name') && lines[k+1] && lines[k+1].includes('Description')) {
          m.StadiumName = getValue(k+1); break;
        }
      }
      for (let k = j; k < j+40 && k < lines.length; k++) {
        if (lines[k].includes('CityName') && lines[k+1] && lines[k+1].includes('Description')) {
          m.StadiumCity = getValue(k+1); break;
        }
      }
    }
  }
  matches.push(m);
}
// Deduplicate by IdMatch while preserving order
const uniq = [];
const seen = new Set();
for (const mm of matches) {
  if (!mm.IdMatch) continue;
  if (seen.has(mm.IdMatch)) continue;
  seen.add(mm.IdMatch);
  uniq.push(mm);
}
// Try to sort by MatchNumber if present
uniq.sort((a,b)=>{
  const na = parseInt(a.MatchNumber||'0');
  const nb = parseInt(b.MatchNumber||'0');
  if (na && nb) return na - nb;
  return 0;
});
// Keep first 24
const opening = uniq.slice(0,24).map((m,idx)=>{
  // parse date/time
  let iso = m.Date || m.LocalDate || '';
  let dt = iso ? new Date(iso) : null;
  const fmtDate = dt ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(dt) : (m.LocalDate||'');
  const fmtTime = dt ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12:false, timeZone: 'UTC' }).format(dt) + ' UTC' : '';
  const group = (m.Group || '').replace(/.*Group\s*/i, '').trim();
  return {
    id: idx+1,
    date: fmtDate,
    time: fmtTime,
    group: group || '',
    home: (m.HomeAbbr || m.HomeId || '').replace(/^"|"$/g,''),
    away: (m.AwayAbbr || m.AwayId || '').replace(/^"|"$/g,''),
    venue: m.StadiumName || 'TBD',
    city: m.StadiumCity || 'TBD'
  };
});
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(opening, null, 2), 'utf8');
console.log('wrote', outPath, 'matches', opening.length);
console.log(opening.map(m=>`${m.id}: ${m.home} vs ${m.away} @ ${m.city} ${m.date} ${m.time}`));
