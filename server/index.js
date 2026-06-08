const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ADMIN_KEY = process.env.ADMIN_KEY || 'wc2026admin';

const DATA_DIR = path.join(__dirname, '..', 'data');
const TEAMS_CACHE_PATH = path.join(DATA_DIR, 'teams-cache.json');
const TEAMS_METADATA_PATH = path.join(DATA_DIR, 'teams-metadata.json');
const RECENT_MATCHES_PATH = path.join(DATA_DIR, 'recent-matches.json');
const OPENING_FIXTURES_PATH = path.join(DATA_DIR, 'opening-fixtures.json');
const FIXTURE_RESULTS_PATH = path.join(DATA_DIR, 'fixture-results.json');
const PREDICTIONS_PATH = path.join(DATA_DIR, 'predictions.json');
const SANDBOX_SIMS_PATH = path.join(DATA_DIR, 'sandbox-sims.json');

// Helper functions for file operations
function readJson(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) return defaultValue;
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
  }
}

// Ensure all database files exist
if (!fs.existsSync(PREDICTIONS_PATH)) {
  writeJson(PREDICTIONS_PATH, []);
}
if (!fs.existsSync(SANDBOX_SIMS_PATH)) {
  writeJson(SANDBOX_SIMS_PATH, []);
}
if (!fs.existsSync(FIXTURE_RESULTS_PATH)) {
  writeJson(FIXTURE_RESULTS_PATH, { _syncedAt: null });
}

// -------------------------------------------------------------
// TOURNAMENT BRACKET GENERATION LOGIC
// -------------------------------------------------------------

// Generate the 72 group stage matches dynamically
function getGroupStageMatches() {
  const openingFixtures = readJson(OPENING_FIXTURES_PATH, []);
  if (openingFixtures.length === 0) return [];

  // Group matches by group letter A-L
  const groupTeams = {};
  openingFixtures.forEach(match => {
    const grp = match.group;
    if (!groupTeams[grp]) groupTeams[grp] = new Set();
    groupTeams[grp].add(match.home);
    groupTeams[grp].add(match.away);
  });

  const fullGroupStage = [];
  // Load original opening fixtures as Matchday 1 (IDs 1-24)
  fullGroupStage.push(...openingFixtures.map(m => ({
    ...m,
    finished: false,
    homeScore: null,
    awayScore: null,
    status: 'Scheduled',
    matchday: 1
  })));

  // Venues and cities to assign for dynamically generated matches
  const venues = [
    { venue: 'MetLife Stadium', city: 'New York/New Jersey' },
    { venue: 'SoFi Stadium', city: 'Los Angeles' },
    { venue: 'AT&T Stadium', city: 'Dallas' },
    { venue: 'Estadio Azteca', city: 'Mexico City' },
    { venue: 'NRG Stadium', city: 'Houston' },
    { venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
    { venue: 'Lumen Field', city: 'Seattle' },
    { venue: 'Gillette Stadium', city: 'Boston' },
    { venue: 'Lincoln Financial Field', city: 'Philadelphia' },
    { venue: 'Hard Rock Stadium', city: 'Miami' },
    { venue: 'Levi\'s Stadium', city: 'San Francisco Bay Area' },
    { venue: 'Arrowhead Stadium', city: 'Kansas City' },
    { venue: 'BMO Field', city: 'Toronto' },
    { venue: 'BC Place', city: 'Vancouver' },
    { venue: 'Estadio BBVA', city: 'Monterrey' },
    { venue: 'Estadio Akron', city: 'Guadalajara' }
  ];

  let matchIdCounter = 25;
  let venueIndex = 0;

  // Generate Matchday 2 and Matchday 3 for groups A-L
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  groupLetters.forEach(grp => {
    const teams = Array.from(groupTeams[grp] || []);
    if (teams.length < 4) return;

    // Find Matchday 1 matches for this group
    const md1 = openingFixtures.filter(m => m.group === grp);
    if (md1.length < 2) return;

    // T1, T2 from match 1; T3, T4 from match 2
    const T1 = md1[0].home;
    const T2 = md1[0].away;
    const T3 = md1[1].home;
    const T4 = md1[1].away;

    // Matchday 2: T1 vs T3, T2 vs T4
    const v1 = venues[venueIndex++ % venues.length];
    fullGroupStage.push({
      id: matchIdCounter++,
      date: 'Jun 19, 2026',
      time: '6:00 PM ET',
      group: grp,
      home: T1,
      away: T3,
      venue: v1.venue,
      city: v1.city,
      finished: false,
      homeScore: null,
      awayScore: null,
      status: 'Scheduled',
      matchday: 2
    });

    const v2 = venues[venueIndex++ % venues.length];
    fullGroupStage.push({
      id: matchIdCounter++,
      date: 'Jun 20, 2026',
      time: '9:00 PM ET',
      group: grp,
      home: T2,
      away: T4,
      venue: v2.venue,
      city: v2.city,
      finished: false,
      homeScore: null,
      awayScore: null,
      status: 'Scheduled',
      matchday: 2
    });

    // Matchday 3: T1 vs T4, T2 vs T3
    const v3 = venues[venueIndex++ % venues.length];
    fullGroupStage.push({
      id: matchIdCounter++,
      date: 'Jun 24, 2026',
      time: '4:00 PM ET',
      group: grp,
      home: T1,
      away: T4,
      venue: v3.venue,
      city: v3.city,
      finished: false,
      homeScore: null,
      awayScore: null,
      status: 'Scheduled',
      matchday: 3
    });

    const v4 = venues[venueIndex++ % venues.length];
    fullGroupStage.push({
      id: matchIdCounter++,
      date: 'Jun 25, 2026',
      time: '8:00 PM ET',
      group: grp,
      home: T2,
      away: T3,
      venue: v4.venue,
      city: v4.city,
      finished: false,
      homeScore: null,
      awayScore: null,
      status: 'Scheduled',
      matchday: 3
    });
  });

  return fullGroupStage.sort((a, b) => a.id - b.id);
}

// Deteministic pairing for best third-place teams (from simulation.service.ts)
function pairThirds(winners, thirds) {
  const allowed = {
    A: ['C', 'E', 'F', 'H', 'I'], B: ['E', 'F', 'G', 'I', 'J'],
    D: ['B', 'E', 'F', 'I', 'J'], E: ['A', 'B', 'C', 'D', 'F'],
    G: ['A', 'E', 'H', 'I', 'J'], I: ['C', 'D', 'F', 'G', 'H'],
    K: ['D', 'E', 'I', 'J', 'L'], L: ['E', 'H', 'I', 'J', 'K']
  };
  const wks = ['A', 'B', 'D', 'E', 'G', 'I', 'K', 'L'];
  const matched = {};
  const bt = (idx) => {
    if (idx === wks.length) return true;
    const wk = wks[idx];
    for (const tp of thirds) {
      if (!tp) continue;
      if (Object.values(matched).some(m => m && m.id === tp.id)) continue;
      if (allowed[wk]?.includes(tp.group) && tp.group !== wk) {
        matched[wk] = tp;
        if (bt(idx + 1)) return true;
        delete matched[wk];
      }
    }
    return false;
  };
  if (bt(0)) return matched;
  const fb = {};
  const used = new Set();
  for (const wk of wks) {
    for (const tp of thirds) {
      if (!tp || used.has(tp.id)) continue;
      if (tp.group !== wk) { fb[wk] = tp; used.add(tp.id); break; }
    }
    if (!fb[wk]) for (const tp of thirds) {
      if (!tp || used.has(tp.id)) continue;
      fb[wk] = tp; used.add(tp.id); break;
    }
  }
  return fb;
}

// Calculate standings and generate Round of 32
function generateRoundOf32(groupStageMatches, teamsList) {
  const teamsMap = {};
  teamsList.forEach(t => {
    teamsMap[t.id] = t;
  });

  const stats = {};
  teamsList.forEach(t => {
    stats[t.id] = { id: t.id, pts: 0, gf: 0, ga: 0, gd: 0, group: t.group, elo: t.elo };
  });

  // Accumulate group stage results
  groupStageMatches.forEach(m => {
    if (!m.finished) return;
    const sA = m.homeScore;
    const sB = m.awayScore;
    stats[m.home].gf += sA;
    stats[m.home].ga += sB;
    stats[m.home].gd += (sA - sB);
    stats[m.away].gf += sB;
    stats[m.away].ga += sA;
    stats[m.away].gd += (sB - sA);
    if (sA > sB) {
      stats[m.home].pts += 3;
    } else if (sB > sA) {
      stats[m.away].pts += 3;
    } else {
      stats[m.home].pts += 1;
      stats[m.away].pts += 1;
    }
  });

  // Group standings
  const groups = {};
  teamsList.forEach(t => {
    if (!groups[t.group]) groups[t.group] = [];
    groups[t.group].push(stats[t.id]);
  });

  const winners = {};
  const runnersUp = {};
  const thirds = [];

  for (const gk in groups) {
    groups[gk].sort((a, b) => {
      if (a.pts !== b.pts) return b.pts - a.pts;
      if (a.gd !== b.gd) return b.gd - a.gd;
      if (a.gf !== b.gf) return b.gf - a.gf;
      return b.elo - a.elo;
    });

    winners[gk] = teamsMap[groups[gk][0].id];
    runnersUp[gk] = teamsMap[groups[gk][1].id];
    if (groups[gk][2]) {
      thirds.push(groups[gk][2]);
    }
  }

  // Sort and pick best 8 third-place teams
  thirds.sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.gd !== b.gd) return b.gd - a.gd;
    return b.elo - a.elo;
  });

  const bestThirdsTeams = thirds.slice(0, 8).map(t => teamsMap[t.id]);
  const mt = pairThirds(winners, bestThirdsTeams);

  // Helper to fallback if winner/third is missing
  const safe = (team) => team || teamsList[0];

  const r32Pairings = [
    [safe(winners['A']), safe(mt['A']), 'R32-1'],
    [safe(winners['B']), safe(mt['B']), 'R32-2'],
    [safe(winners['C']), safe(runnersUp['F']), 'R32-3'],
    [safe(winners['D']), safe(mt['D']), 'R32-4'],
    [safe(winners['E']), safe(mt['E']), 'R32-5'],
    [safe(winners['F']), safe(runnersUp['C']), 'R32-6'],
    [safe(winners['G']), safe(mt['G']), 'R32-7'],
    [safe(winners['H']), safe(runnersUp['J']), 'R32-8'],
    [safe(winners['I']), safe(mt['I']), 'R32-9'],
    [safe(winners['J']), safe(runnersUp['H']), 'R32-10'],
    [safe(winners['K']), safe(mt['K']), 'R32-11'],
    [safe(winners['L']), safe(mt['L']), 'R32-12'],
    [safe(runnersUp['A']), safe(runnersUp['B']), 'R32-13'],
    [safe(runnersUp['E']), safe(runnersUp['I']), 'R32-14'],
    [safe(runnersUp['K']), safe(runnersUp['L']), 'R32-15'],
    [safe(runnersUp['D']), safe(runnersUp['G']), 'R32-16']
  ];

  return r32Pairings.map((pair, index) => ({
    id: 73 + index,
    stage: 'Round of 32',
    label: pair[2],
    date: 'Jun 28, 2026',
    time: '4:00 PM ET',
    home: pair[0].id,
    away: pair[1].id,
    homeTeam: pair[0].name,
    awayTeam: pair[1].name,
    venue: 'MetLife Stadium',
    city: 'New York/New Jersey',
    finished: false,
    homeScore: null,
    awayScore: null,
    status: 'Scheduled'
  }));
}

// Generate the next knockout stages dynamically based on previous stage results
function generateNextKnockoutStage(stageName, prevMatches, startId, labelPrefix) {
  const winners = prevMatches.map(m => m.winnerId);
  const matches = [];

  const venues = [
    { venue: 'SoFi Stadium', city: 'Los Angeles' },
    { venue: 'MetLife Stadium', city: 'New Jersey' },
    { venue: 'AT&T Stadium', city: 'Dallas' },
    { venue: 'Estadio Azteca', city: 'Mexico City' },
    { venue: 'NRG Stadium', city: 'Houston' },
    { venue: 'Mercedes-Benz Stadium', city: 'Atlanta' }
  ];

  if (stageName === 'Round of 16') {
    // 8 matches from 16 winners of R32
    // R16-1: W(R32-1) vs W(R32-13)
    // R16-2: W(R32-3) vs W(R32-14)
    // R16-3: W(R32-5) vs W(R32-15)
    // R16-4: W(R32-7) vs W(R32-16)
    // R16-5: W(R32-2) vs W(R32-4)
    // R16-6: W(R32-6) vs W(R32-8)
    // R16-7: W(R32-9) vs W(R32-11)
    // R16-8: W(R32-10) vs W(R32-12)
    const pairings = [
      [0, 12], [2, 13], [4, 14], [6, 15],
      [1, 3], [5, 7], [8, 10], [9, 11]
    ];
    pairings.forEach((pair, idx) => {
      const home = winners[pair[0]] || 'TBD';
      const away = winners[pair[1]] || 'TBD';
      matches.push({
        id: startId + idx,
        stage: stageName,
        label: `${labelPrefix}-${idx + 1}`,
        date: 'Jul 2, 2026',
        time: '6:00 PM ET',
        home,
        away,
        venue: venues[idx % venues.length].venue,
        city: venues[idx % venues.length].city,
        finished: false,
        homeScore: null,
        awayScore: null,
        status: 'Scheduled'
      });
    });
  } else if (stageName === 'Quarter-Final') {
    // 4 matches from 8 winners of R16
    for (let idx = 0; idx < 4; idx++) {
      const home = winners[idx * 2] || 'TBD';
      const away = winners[idx * 2 + 1] || 'TBD';
      matches.push({
        id: startId + idx,
        stage: stageName,
        label: `${labelPrefix}-${idx + 1}`,
        date: 'Jul 6, 2026',
        time: '3:00 PM ET',
        home,
        away,
        venue: venues[idx % venues.length].venue,
        city: venues[idx % venues.length].city,
        finished: false,
        homeScore: null,
        awayScore: null,
        status: 'Scheduled'
      });
    }
  } else if (stageName === 'Semi-Final') {
    // 2 matches from 4 winners of QF
    for (let idx = 0; idx < 2; idx++) {
      const home = winners[idx * 2] || 'TBD';
      const away = winners[idx * 2 + 1] || 'TBD';
      matches.push({
        id: startId + idx,
        stage: stageName,
        label: `${labelPrefix}-${idx + 1}`,
        date: 'Jul 10, 2026',
        time: '8:00 PM ET',
        home,
        away,
        venue: venues[idx % venues.length].venue,
        city: venues[idx % venues.length].city,
        finished: false,
        homeScore: null,
        awayScore: null,
        status: 'Scheduled'
      });
    }
  } else if (stageName === 'Finals') {
    // ID 103: Third place (Loser SF-1 vs Loser SF-2)
    // ID 104: Grand Final (Winner SF-1 vs Winner SF-2)
    const sf1 = prevMatches[0];
    const sf2 = prevMatches[1];
    const w1 = sf1.winnerId || 'TBD';
    const w2 = sf2.winnerId || 'TBD';
    const l1 = sf1.home === w1 ? sf1.away : sf1.home;
    const l2 = sf2.home === w2 ? sf2.away : sf2.home;

    matches.push({
      id: 103,
      stage: 'Third Place',
      label: 'Third Place',
      date: 'Jul 18, 2026',
      time: '3:00 PM ET',
      home: l1,
      away: l2,
      venue: 'Hard Rock Stadium',
      city: 'Miami',
      finished: false,
      homeScore: null,
      awayScore: null,
      status: 'Scheduled'
    });

    matches.push({
      id: 104,
      stage: 'Grand Final',
      label: 'Grand Final',
      date: 'Jul 19, 2026',
      time: '8:00 PM ET',
      home: w1,
      away: w2,
      venue: 'MetLife Stadium',
      city: 'New York/New Jersey',
      finished: false,
      homeScore: null,
      awayScore: null,
      status: 'Scheduled'
    });
  }

  return matches;
}

// -------------------------------------------------------------
// CORE FIXTURES CALCULATION API
// -------------------------------------------------------------
function calculateFixturesAndStatus() {
  const teamsCache = readJson(TEAMS_CACHE_PATH, null);
  let teamsList = [];
  if (teamsCache && teamsCache.teams) {
    teamsList = teamsCache.teams;
  } else {
    // If cache not initialized, read metadata
    const meta = readJson(TEAMS_METADATA_PATH, {});
    teamsList = Object.entries(meta).map(([id, val]) => ({ id, ...val }));
  }

  const results = readJson(FIXTURE_RESULTS_PATH, {});
  const groupMatches = getGroupStageMatches();

  // 1. Map group stage results
  groupMatches.forEach(m => {
    const res = results[m.id];
    if (res) {
      m.homeScore = res.homeScore;
      m.awayScore = res.awayScore;
      m.finished = true;
      m.status = 'Finished';
      m.winnerId = res.winner || (res.homeScore > res.awayScore ? m.home : res.awayScore > res.homeScore ? m.away : null);
    }
  });

  const allFixtures = [...groupMatches];
  let groupStageComplete = groupMatches.every(m => m.finished);

  // 2. Round of 32
  let r32Matches = [];
  if (groupStageComplete) {
    r32Matches = generateRoundOf32(groupMatches, teamsList);
    r32Matches.forEach(m => {
      const res = results[m.id];
      if (res) {
        m.homeScore = res.homeScore;
        m.awayScore = res.awayScore;
        m.finished = true;
        m.status = 'Finished';
        m.winnerId = res.winner || (res.homeScore > res.awayScore ? m.home : m.away);
      }
    });
    allFixtures.push(...r32Matches);
  }

  // 3. Round of 16
  let r16Matches = [];
  const r32Complete = r32Matches.length > 0 && r32Matches.every(m => m.finished);
  if (r32Complete) {
    r16Matches = generateNextKnockoutStage('Round of 16', r32Matches, 89, 'R16');
    r16Matches.forEach(m => {
      const res = results[m.id];
      if (res) {
        m.homeScore = res.homeScore;
        m.awayScore = res.awayScore;
        m.finished = true;
        m.status = 'Finished';
        m.winnerId = res.winner || (res.homeScore > res.awayScore ? m.home : m.away);
      }
    });
    allFixtures.push(...r16Matches);
  }

  // 4. Quarter-Finals
  let qfMatches = [];
  const r16Complete = r16Matches.length > 0 && r16Matches.every(m => m.finished);
  if (r16Complete) {
    qfMatches = generateNextKnockoutStage('Quarter-Final', r16Matches, 97, 'QF');
    qfMatches.forEach(m => {
      const res = results[m.id];
      if (res) {
        m.homeScore = res.homeScore;
        m.awayScore = res.awayScore;
        m.finished = true;
        m.status = 'Finished';
        m.winnerId = res.winner || (res.homeScore > res.awayScore ? m.home : m.away);
      }
    });
    allFixtures.push(...qfMatches);
  }

  // 5. Semi-Finals
  let sfMatches = [];
  const qfComplete = qfMatches.length > 0 && qfMatches.every(m => m.finished);
  if (qfComplete) {
    sfMatches = generateNextKnockoutStage('Semi-Final', qfMatches, 101, 'SF');
    sfMatches.forEach(m => {
      const res = results[m.id];
      if (res) {
        m.homeScore = res.homeScore;
        m.awayScore = res.awayScore;
        m.finished = true;
        m.status = 'Finished';
        m.winnerId = res.winner || (res.homeScore > res.awayScore ? m.home : m.away);
      }
    });
    allFixtures.push(...sfMatches);
  }

  // 6. Finals (Third place and Grand Final)
  let finalMatches = [];
  const sfComplete = sfMatches.length > 0 && sfMatches.every(m => m.finished);
  if (sfComplete) {
    finalMatches = generateNextKnockoutStage('Finals', sfMatches, 103, '');
    finalMatches.forEach(m => {
      const res = results[m.id];
      if (res) {
        m.homeScore = res.homeScore;
        m.awayScore = res.awayScore;
        m.finished = true;
        m.status = 'Finished';
        m.winnerId = res.winner || (res.homeScore > res.awayScore ? m.home : m.away);
      }
    });
    allFixtures.push(...finalMatches);
  }

  // Determine champion
  const grandFinal = finalMatches.find(m => m.id === 104);
  const champion = grandFinal && grandFinal.finished ? grandFinal.winnerId : null;

  // Determine team states & stages
  const teamStatus = {};
  const nextMatches = {};
  const teamsMap = {};
  teamsList.forEach(t => {
    teamsMap[t.id] = t;
    teamStatus[t.id] = { id: t.id, status: 'active', stage: 'Group' };
  });

  // Calculate next matches
  teamsList.forEach(t => {
    // Find next match that isn't finished and involves this team
    const nextMatch = allFixtures.find(m => !m.finished && (m.home === t.id || m.away === t.id));

    if (champion) {
      if (champion === t.id) {
        teamStatus[t.id].status = 'champion';
        teamStatus[t.id].stage = 'Grand Final';
        nextMatches[t.id] = { teamId: t.id, status: 'champion', match: null, message: 'CHAMPION 🏆' };
      } else {
        teamStatus[t.id].status = 'eliminated';
        teamStatus[t.id].stage = 'Grand Final';
        nextMatches[t.id] = { teamId: t.id, status: 'eliminated', match: null, message: 'Runner-up / Finals complete' };
      }
      return;
    }

    if (nextMatch) {
      // If we find a scheduled match, it is active
      const opponentId = nextMatch.home === t.id ? nextMatch.away : nextMatch.home;
      const opponentName = teamsMap[opponentId] ? teamsMap[opponentId].name : opponentId;
      const isHome = nextMatch.home === t.id;

      // Map dynamic names for KO
      const homeTeamName = teamsMap[nextMatch.home] ? teamsMap[nextMatch.home].name : nextMatch.homeTeam || nextMatch.home;
      const awayTeamName = teamsMap[nextMatch.away] ? teamsMap[nextMatch.away].name : nextMatch.awayTeam || nextMatch.away;

      const nextInfo = {
        id: nextMatch.id,
        stage: nextMatch.stage,
        label: nextMatch.label || `Group ${nextMatch.group}`,
        date: nextMatch.date,
        time: nextMatch.time,
        group: nextMatch.group || null,
        venue: nextMatch.venue,
        city: nextMatch.city,
        home: nextMatch.home,
        away: nextMatch.away,
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        isHome
      };

      teamStatus[t.id].status = 'active';
      teamStatus[t.id].stage = nextMatch.stage;
      nextMatches[t.id] = {
        teamId: t.id,
        status: 'active',
        match: nextInfo,
        message: opponentId !== 'TBD' ? `Next match vs ${opponentName} in ${nextMatch.city}` : 'Awaiting opponent'
      };
    } else {
      // No upcoming match scheduled.
      // Has this team been eliminated?
      let isEliminated = false;
      let eliminatedStage = 'Group';

      if (groupStageComplete) {
        // Group stage is finished. Check if team qualified for R32
        const r32MatchesGenerated = allFixtures.filter(m => m.stage === 'Round of 32');
        const inR32 = r32MatchesGenerated.some(m => m.home === t.id || m.away === t.id);
        if (!inR32) {
          isEliminated = true;
          eliminatedStage = 'Group';
        }
      }

      // Check knockout losses
      const finishedKO = allFixtures.filter(m => m.finished && m.stage !== 'Group' && m.stage !== 'Third Place');
      finishedKO.forEach(m => {
        if ((m.home === t.id || m.away === t.id) && m.winnerId !== t.id) {
          isEliminated = true;
          eliminatedStage = m.stage;
        }
      });

      if (isEliminated) {
        teamStatus[t.id].status = 'eliminated';
        teamStatus[t.id].stage = eliminatedStage;
        nextMatches[t.id] = {
          teamId: t.id,
          status: 'eliminated',
          match: null,
          message: `Eliminated in ${eliminatedStage}`
        };
      } else {
        // Still active but waiting (e.g. won their match but next round isn't drawn yet)
        teamStatus[t.id].status = 'active';
        teamStatus[t.id].stage = 'Knockouts';
        nextMatches[t.id] = {
          teamId: t.id,
          status: 'waiting',
          match: null,
          message: 'Awaiting other matches to complete...'
        };
      }
    }
  });

  const finishedMatches = allFixtures.filter(m => m.finished).length;

  return {
    teamStatus,
    nextMatches,
    champion,
    groupStageComplete,
    resultsSyncedAt: results._syncedAt || null,
    finishedMatches,
    totalMatches: allFixtures.length,
    allFixtures
  };
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// GET /api/teams
app.get('/api/teams', (req, res) => {
  let cache = readJson(TEAMS_CACHE_PATH, null);
  if (!cache || !cache.teams) {
    const meta = readJson(TEAMS_METADATA_PATH, {});
    const teams = Object.entries(meta).map(([id, val]) => ({ id, ...val }));
    cache = {
      syncedAt: null,
      source: 'local',
      teamCount: teams.length,
      teams
    };
    writeJson(TEAMS_CACHE_PATH, cache);
  }
  res.json(cache);
});

// POST /api/teams/sync
app.post('/api/teams/sync', (req, res) => {
  let cache = readJson(TEAMS_CACHE_PATH, null);
  if (!cache || !cache.teams) {
    const meta = readJson(TEAMS_METADATA_PATH, {});
    const teams = Object.entries(meta).map(([id, val]) => ({ id, ...val }));
    cache = {
      syncedAt: null,
      source: 'local',
      teamCount: teams.length,
      teams
    };
  }

  // Perturb ELOs of 3-5 random teams slightly (+/- 15 ELO points) to simulate live FIFA updates
  const updatedTeams = cache.teams.map(t => ({ ...t }));
  const countToModify = Math.floor(Math.random() * 3) + 3; // 3 to 5
  for (let i = 0; i < countToModify; i++) {
    const rIndex = Math.floor(Math.random() * updatedTeams.length);
    const change = Math.floor(Math.random() * 31) - 15; // -15 to +15
    updatedTeams[rIndex].elo = Math.max(1200, updatedTeams[rIndex].elo + change);
  }

  cache.teams = updatedTeams;
  cache.syncedAt = new Date().toISOString();
  cache.source = 'FIFA Sync / Google Search Hints';

  writeJson(TEAMS_CACHE_PATH, cache);
  res.json(cache);
});

// GET /api/recent-matches
app.get('/api/recent-matches', (req, res) => {
  const recent = readJson(RECENT_MATCHES_PATH, []);
  res.json(recent);
});

// GET /api/fixtures/status
app.get('/api/fixtures/status', (req, res) => {
  const status = calculateFixturesAndStatus();
  // Don't return allFixtures to save payload size, match client expectation
  delete status.allFixtures;
  res.json(status);
});

// Helper for Poisson goal sampling
function simulateScore(homeElo, awayElo) {
  const diff = homeElo - awayElo;
  const lA = Math.max(0.1, Math.min(5.5, 1.3 * Math.exp(diff / 600)));
  const lB = Math.max(0.1, Math.min(5.5, 1.3 * Math.exp(-diff / 600)));

  const sampleGoals = (lambda) => {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L && k < 15);
    return k - 1;
  };

  return {
    homeScore: sampleGoals(lA),
    awayScore: sampleGoals(lB)
  };
}

// POST /api/fixtures/sync
app.post('/api/fixtures/sync', (req, res) => {
  const status = calculateFixturesAndStatus();
  const results = readJson(FIXTURE_RESULTS_PATH, {});

  // Find the first 2 unfinished matches in the schedule
  const unfinished = status.allFixtures.filter(m => !m.finished && m.home !== 'TBD' && m.away !== 'TBD');

  if (unfinished.length > 0) {
    const countToSim = Math.min(2, unfinished.length);
    const teamsCache = readJson(TEAMS_CACHE_PATH, null);
    const teamsList = teamsCache ? teamsCache.teams : [];
    const teamsMap = {};
    teamsList.forEach(t => { teamsMap[t.id] = t; });

    for (let i = 0; i < countToSim; i++) {
      const match = unfinished[i];
      const eloA = teamsMap[match.home] ? teamsMap[match.home].elo : 1600;
      const eloB = teamsMap[match.away] ? teamsMap[match.away].elo : 1600;

      const score = simulateScore(eloA, eloB);
      let winner = null;

      if (match.stage !== 'Group') {
        // Tie breaker for knockout
        if (score.homeScore === score.awayScore) {
          winner = Math.random() < 0.5 ? match.home : match.away;
        } else {
          winner = score.homeScore > score.awayScore ? match.home : match.away;
        }
      } else {
        if (score.homeScore > score.awayScore) winner = match.home;
        else if (score.awayScore > score.homeScore) winner = match.away;
      }

      results[match.id] = {
        homeScore: score.homeScore,
        awayScore: score.awayScore,
        winner
      };
    }
  }

  results._syncedAt = new Date().toISOString();
  writeJson(FIXTURE_RESULTS_PATH, results);

  const updatedStatus = calculateFixturesAndStatus();
  delete updatedStatus.allFixtures;

  res.json({ status: updatedStatus });
});

// POST /api/admin/fixtures/result
app.post('/api/admin/fixtures/result', (req, res) => {
  const { matchId, homeScore, awayScore, winner } = req.body;
  if (matchId === undefined || homeScore === undefined || awayScore === undefined) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const results = readJson(FIXTURE_RESULTS_PATH, {});
  results[matchId] = {
    homeScore: parseInt(homeScore),
    awayScore: parseInt(awayScore),
    winner: winner || (homeScore > awayScore ? undefined : undefined) // will be determined by stage later if not specified
  };

  writeJson(FIXTURE_RESULTS_PATH, results);
  const updatedStatus = calculateFixturesAndStatus();
  delete updatedStatus.allFixtures;

  res.json({ status: updatedStatus });
});

// POST /api/predictions
app.post('/api/predictions', (req, res) => {
  const { userName, championId, championName, championFlag, topPicks, simsRun } = req.body;
  if (!userName || !championId || !topPicks) {
    return res.status(400).json({ error: 'Missing prediction parameters' });
  }

  const predictions = readJson(PREDICTIONS_PATH, []);
  const newPrediction = {
    id: require('crypto').randomUUID ? require('crypto').randomUUID() : `pred_${Math.random().toString(36).slice(2, 9)}`,
    userName,
    championId,
    championName,
    championFlag,
    topPicks,
    simsRun: parseInt(simsRun),
    createdAt: new Date().toISOString()
  };

  predictions.unshift(newPrediction);
  // Cap at 200 items to keep file sizes responsive
  if (predictions.length > 200) {
    predictions.pop();
  }

  writeJson(PREDICTIONS_PATH, predictions);
  res.json({ success: true, prediction: newPrediction });
});

// POST /api/sandbox-sims
app.post('/api/sandbox-sims', (req, res) => {
  const { teamA, teamB, scoreA, scoreB, userName } = req.body;
  if (!teamA || !teamB || scoreA === undefined || scoreB === undefined) {
    return res.status(400).json({ error: 'Missing sandbox parameter' });
  }

  const sandbox = readJson(SANDBOX_SIMS_PATH, []);
  const newSim = {
    id: `sim_${Math.random().toString(36).slice(2, 9)}`,
    teamA,
    teamB,
    scoreA: parseInt(scoreA),
    scoreB: parseInt(scoreB),
    userName: userName || 'Anonymous',
    createdAt: new Date().toISOString()
  };

  sandbox.unshift(newSim);
  if (sandbox.length > 500) {
    sandbox.pop();
  }

  writeJson(SANDBOX_SIMS_PATH, sandbox);
  res.json({ success: true });
});

// Auth middleware for admin endpoints
function adminAuth(req, res, next) {
  const clientKey = req.headers['x-admin-key'];
  if (clientKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized admin key' });
  }
  next();
}

// GET /api/admin/predictions
app.get('/api/admin/predictions', adminAuth, (req, res) => {
  const predictions = readJson(PREDICTIONS_PATH, []);
  res.json(predictions);
});

// GET /api/admin/stats
app.get('/api/admin/stats', adminAuth, (req, res) => {
  const predictions = readJson(PREDICTIONS_PATH, []);
  const sandbox = readJson(SANDBOX_SIMS_PATH, []);
  const teamsCache = readJson(TEAMS_CACHE_PATH, null);
  const teamsList = teamsCache ? teamsCache.teams : [];
  const teamsMap = {};
  teamsList.forEach(t => { teamsMap[t.id] = t; });

  const totalPredictions = predictions.length;

  // Calculate unique users
  const uniqueUserNames = new Set();
  predictions.forEach(p => uniqueUserNames.add(p.userName));
  sandbox.forEach(s => uniqueUserNames.add(s.userName));
  const uniqueUsers = uniqueUserNames.size;

  // Calculate champion statistics
  const champCounts = {};
  predictions.forEach(p => {
    champCounts[p.championId] = (champCounts[p.championId] || 0) + 1;
  });

  const championStats = teamsList.map(t => {
    const count = champCounts[t.id] || 0;
    const pct = totalPredictions > 0 ? (count / totalPredictions) * 100 : 0;
    return {
      id: t.id,
      name: t.name,
      flag: t.flag,
      count,
      pct
    };
  }).sort((a, b) => b.count - a.count);

  // Calculate sandbox simulation counts
  const sandboxCounts = {};
  sandbox.forEach(s => {
    sandboxCounts[s.teamA] = (sandboxCounts[s.teamA] || 0) + 1;
    sandboxCounts[s.teamB] = (sandboxCounts[s.teamB] || 0) + 1;
  });

  const sandboxStats = teamsList.map(t => {
    const count = sandboxCounts[t.id] || 0;
    return {
      id: t.id,
      name: t.name,
      flag: t.flag,
      count
    };
  }).sort((a, b) => b.count - a.count);

  res.json({
    totalPredictions,
    uniqueUsers,
    championStats,
    sandboxStats,
    totalSandboxSims: sandbox.length,
    recent: predictions.slice(0, 10)
  });
});

app.listen(PORT, () => {
  console.log(`World Cup Predictor API server running on http://localhost:${PORT}`);
});
