const fs = require('fs');
const vm = require('vm');
const inputPath = 'C:/Users/user/Desktop/fifa-fixtures-raw.json';
const raw = fs.readFileSync(inputPath, 'utf8');
let cleaned = raw
  .replace(/([\[{,\s])([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
  .replace(/,\s*([}\]])/g, '$1')
  .replace(/\u2026/g, '')
  .replace(/\r?\n/g, ' ');
try {
  const data = vm.runInNewContext('(' + cleaned + ')');
  console.log('parsed', typeof data, Array.isArray(data), data && data.Results && data.Results.length);
  const first = data && data.Results && data.Results[0];
  console.log('first home', first && first.Home && first.Home.IdTeam, first && first.Home && first.Home.TeamName && first.Home.TeamName[0] && first.Home.TeamName[0].Description);
  console.log('first away', first && first.Away && first.Away.IdTeam, first && first.Away && first.Away.TeamName && first.Away.TeamName[0] && first.Away.TeamName[0].Description);
  if (data && data.Results) {
    console.log('examples:', data.Results.slice(0, 3).map(r => ({ id: r.IdMatch, date: r.Date, home: r.Home.Abbreviation, away: r.Away.Abbreviation })));
  }
} catch (err) {
  console.error('eval error', err.message);
  console.error(cleaned.slice(0, 2000));
}
