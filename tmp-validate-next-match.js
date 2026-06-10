const fs = require('fs');
const openingFixtures = JSON.parse(fs.readFileSync('data/opening-fixtures.json', 'utf8'));
const teamsCache = JSON.parse(fs.readFileSync('data/teams-cache.json', 'utf8'));
const teamsList = teamsCache.teams;

const groupTeams = {};
openingFixtures.forEach(match => {
  const grp = match.group;
  if (!groupTeams[grp]) groupTeams[grp] = new Set();
  groupTeams[grp].add(match.home);
  groupTeams[grp].add(match.away);
});

const groupStage = openingFixtures.map(m => ({
  ...m,
  finished: false,
  homeScore: null,
  awayScore: null,
  status: 'Scheduled',
  matchday: 1
}));

const nextMatches = {};
teamsList.forEach(t => nextMatches[t.id] = { teamId: t.id, status: 'waiting', match: null, message: 'Match schedule loading...' });

groupStage.forEach(match => {
  if (!match.finished) {
    const updateNextMatch = (teamId) => {
      if (!nextMatches[teamId]) return;
      const current = nextMatches[teamId];
      if (!current || current.status === 'waiting') {
        nextMatches[teamId] = { teamId, status: 'scheduled', match, message: 'Next scheduled match' };
      }
    };
    updateNextMatch(match.home);
    updateNextMatch(match.away);
  }
});

console.log('ALG next match:', nextMatches['ALG']);
console.log('CPV next match:', nextMatches['CPV']);
console.log('MEX next match:', nextMatches['MEX']);
