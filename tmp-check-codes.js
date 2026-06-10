const fs = require('fs');
const teams = JSON.parse(fs.readFileSync('data/teams-cache.json', 'utf8')).teams.map(t => t.id);
const fx = JSON.parse(fs.readFileSync('data/opening-fixtures.json', 'utf8'));
const missing = [...new Set(fx.flatMap(m => [m.home, m.away]))].filter(code => !teams.includes(code));
console.log('teamIds', teams.length);
console.log('fixtureCodes', [...new Set(fx.flatMap(m => [m.home, m.away]))].length);
console.log('missing', missing);
