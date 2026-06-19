const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const serverless = require('serverless-http');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Netlify functions route `/api/*` -> `/.netlify/functions/api/:splat`.
// When requests arrive inside the function the leading `/api` may be stripped,
// so normalize common endpoints by prefixing `/api` when necessary so existing
// route handlers (which use `/api/...`) continue to work unchanged.
app.use((req, res, next) => {
  try {
    const p = req.path || req.url || '';
    if (!p.startsWith('/api')) {
      // If the path looks like one of our top-level endpoints, prefix with /api
      const topEndpoints = ['/fixtures', '/teams', '/recent-matches', '/predictions', '/sandbox-sims', '/admin', '/teams', '/recent-matches', '/leaderboard'];
      for (const ep of topEndpoints) {
        if (p.startsWith(ep)) {
          req.url = '/api' + req.url;
          break;
        }
      }
    }
  } catch (e) {
    // no-op
  }
  next();
});

const ADMIN_KEY = process.env.ADMIN_KEY || 'wc2026admin';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || 'app_store';
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const supabase = useSupabase
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })
  : null;

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const TEAMS_CACHE_PATH = path.join(DATA_DIR, 'teams-cache.json');
const TEAMS_METADATA_PATH = path.join(DATA_DIR, 'teams-metadata.json');
const RECENT_MATCHES_PATH = path.join(DATA_DIR, 'recent-matches.json');
const OPENING_FIXTURES_PATH = path.join(DATA_DIR, 'opening-fixtures.json');
const FIXTURE_RESULTS_PATH = path.join(DATA_DIR, 'fixture-results.json');
const PREDICTIONS_PATH = path.join(DATA_DIR, 'predictions.json');
const SANDBOX_SIMS_PATH = path.join(DATA_DIR, 'sandbox-sims.json');

function wrapAsync(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function readLocalJson(filePath, defaultValue = []) {
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

function writeLocalJson(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

async function readStore(key, defaultValue = []) {
  if (!useSupabase) {
    return defaultValue;
  }

  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`Supabase read error for ${key}:`, error.message || error);
    return defaultValue;
  }

  return data?.value ?? defaultValue;
}

async function writeStore(key, value) {
  if (!useSupabase) {
    return;
  }

  const { error } = await supabase
    .from(SUPABASE_TABLE)
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) {
    console.error(`Supabase write error for ${key}:`, error.message || error);
  }
}

async function readJsonData(key, filePath, defaultValue = []) {
  if (useSupabase) {
    return await readStore(key, defaultValue);
  }
  return readLocalJson(filePath, defaultValue);
}

async function writeJsonData(key, filePath, data) {
  if (useSupabase) {
    await writeStore(key, data);
    return;
  }
  writeLocalJson(filePath, data);
}

async function ensureFallbackCache() {
  let cache = await readJsonData('teams_cache', TEAMS_CACHE_PATH, null);
  if (cache && cache.teams) {
    return cache;
  }

  const meta = readLocalJson(TEAMS_METADATA_PATH, {});
  const teams = Object.entries(meta).map(([id, val]) => ({ id, ...val }));
  cache = {
    syncedAt: null,
    source: 'local',
    teamCount: teams.length,
    teams
  };

  await writeJsonData('teams_cache', TEAMS_CACHE_PATH, cache);
  return cache;
}

async function readPredictions() {
  return await readJsonData('predictions', PREDICTIONS_PATH, []);
}

async function writePredictions(predictions) {
  await writeJsonData('predictions', PREDICTIONS_PATH, predictions);
}

async function readSandboxSims() {
  return await readJsonData('sandbox_sims', SANDBOX_SIMS_PATH, []);
}

async function writeSandboxSims(sandbox) {
  await writeJsonData('sandbox_sims', SANDBOX_SIMS_PATH, sandbox);
}

async function readFixtureResults() {
  return await readJsonData('fixture_results', FIXTURE_RESULTS_PATH, { _syncedAt: null });
}

async function writeFixtureResults(results) {
  await writeJsonData('fixture_results', FIXTURE_RESULTS_PATH, results);
}

async function readRecentMatches() {
  return await readJsonData('recent_matches', RECENT_MATCHES_PATH, []);
}

async function writeRecentMatches(recentMatches) {
  await writeJsonData('recent_matches', RECENT_MATCHES_PATH, recentMatches);
}

function getGroupStageMatches() {
  const openingFixtures = readLocalJson(OPENING_FIXTURES_PATH, []);
  if (openingFixtures.length === 0) return [];

  const groupTeams = {};
  openingFixtures.forEach(match => {
    const grp = match.group;
    if (!groupTeams[grp]) groupTeams[grp] = new Set();
    groupTeams[grp].add(match.home);
    groupTeams[grp].add(match.away);
  });

  const fullGroupStage = [];
  fullGroupStage.push(...openingFixtures.map(m => ({
    ...m,
    finished: false,
    homeScore: null,
    awayScore: null,
    status: 'Scheduled',
    matchday: 1
  })));

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

  // Use ids from opening-fixtures.json so existing data/fixture-results.json (keyed by opening-fixtures ids) matches.
  // This prevents “exact results” from not being applied.
  let matchIdCounter = 25;
  let venueIndex = 0;


  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  groupLetters.forEach(grp => {
    const teams = Array.from(groupTeams[grp] || []);
    if (teams.length < 4) return;

    const md1 = openingFixtures.filter(m => m.group === grp);
    if (md1.length < 2) return;

    const T1 = md1[0].home;
    const T2 = md1[0].away;
    const T3 = md1[1].home;
    const T4 = md1[1].away;

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

function generateRoundOf32(groupStageMatches, teamsList) {
  const teamsMap = {};
  teamsList.forEach(t => { teamsMap[t.id] = t; });

  const stats = {};
  teamsList.forEach(t => { stats[t.id] = { id: t.id, pts: 0, gf: 0, ga: 0, gd: 0, group: t.group, elo: t.elo }; });

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

  thirds.sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.gd !== b.gd) return b.gd - a.gd;
    return b.elo - a.elo;
  });

  const bestThirdsTeams = thirds.slice(0, 8).map(t => teamsMap[t.id]);
  const mt = pairThirds(winners, bestThirdsTeams);

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

async function calculateFixturesAndStatus() {
  const teamsCache = await ensureFallbackCache();
  const teamsList = teamsCache.teams || [];
  const results = await readFixtureResults();
  const groupMatches = getGroupStageMatches();

  const applyResult = (match) => {
    const result = results[match.id];
    if (!result) return match;
    const updated = { ...match, finished: true, homeScore: result.homeScore, awayScore: result.awayScore };
    if (result.homeScore !== null && result.awayScore !== null) {
      // Validate winner: only accept stored winner if it agrees with score outcome, or if draw (KO penalty winner)
      const scoreWinner = updated.homeScore > updated.awayScore ? updated.home : updated.awayScore > updated.homeScore ? updated.away : null;
      const rawWinner = result.winner;
      const validWinner = rawWinner && (rawWinner === scoreWinner || (!scoreWinner && (rawWinner === updated.home || rawWinner === updated.away))) ? rawWinner : null;
      updated.winnerId = validWinner || scoreWinner;
      updated.winner = updated.winnerId;
      updated.status = 'Finished';
    }
    return updated;
  };

  const groupStage = groupMatches.map(applyResult);
  const groupStageComplete = groupStage.filter(m => !m.finished).length === 0;

  const allFixtures = [...groupStage];

  // 2. Round of 32
  let r32Matches = [];
  if (groupStageComplete) {
    r32Matches = generateRoundOf32(groupStage, teamsList);
    r32Matches = r32Matches.map(applyResult);
    allFixtures.push(...r32Matches);
  }

  // 3. Round of 16
  let r16Matches = [];
  const r32Complete = r32Matches.length > 0 && r32Matches.every(m => m.finished);
  if (r32Complete) {
    r16Matches = generateNextKnockoutStage('Round of 16', r32Matches, 89, 'R16');
    r16Matches = r16Matches.map(applyResult);
    allFixtures.push(...r16Matches);
  }

  // 4. Quarter-Finals
  let qfMatches = [];
  const r16Complete = r16Matches.length > 0 && r16Matches.every(m => m.finished);
  if (r16Complete) {
    qfMatches = generateNextKnockoutStage('Quarter-Final', r16Matches, 97, 'QF');
    qfMatches = qfMatches.map(applyResult);
    allFixtures.push(...qfMatches);
  }

  // 5. Semi-Finals
  let sfMatches = [];
  const qfComplete = qfMatches.length > 0 && qfMatches.every(m => m.finished);
  if (qfComplete) {
    sfMatches = generateNextKnockoutStage('Semi-Final', qfMatches, 101, 'SF');
    sfMatches = sfMatches.map(applyResult);
    allFixtures.push(...sfMatches);
  }

  // 6. Finals (Third place and Grand Final)
  let finalMatches = [];
  const sfComplete = sfMatches.length > 0 && sfMatches.every(m => m.finished);
  if (sfComplete) {
    finalMatches = generateNextKnockoutStage('Finals', sfMatches, 103, '');
    finalMatches = finalMatches.map(applyResult);
    allFixtures.push(...finalMatches);
  }

  // Determine champion
  const champion = finalMatches.find(m => m.id === 104)?.winner || null;

  // Determine team states & stages
  const teamStatus = {};
  const nextMatches = {};
  const teamsMap = {};
  teamsList.forEach(t => {
    teamsMap[t.id] = t;
    teamStatus[t.id] = { id: t.id, status: 'active', stage: 'Group' };
  });

  teamsList.forEach(t => {
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
      const opponentId = nextMatch.home === t.id ? nextMatch.away : nextMatch.home;
      const opponentName = teamsMap[opponentId] ? teamsMap[opponentId].name : opponentId;
      const isHome = nextMatch.home === t.id;

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
      let isEliminated = false;
      let eliminatedStage = 'Group';

      if (groupStageComplete) {
        const r32Generated = allFixtures.filter(m => m.stage === 'Round of 32');
        const inR32 = r32Generated.some(m => m.home === t.id || m.away === t.id);
        if (!inR32) {
          isEliminated = true;
          eliminatedStage = 'Group';
        }
      }

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

// Calibrated base lambda for Poisson goal sampling
const BASE_LAMBDA = 1.35;

// Parse squad value string (e.g. "€750M", "€1.2B") into millions
function parseValue(value) {
  const raw = String(value || '').replace(/[€\s]/g, '');
  if (raw.endsWith('B')) return parseFloat(raw) * 1000;
  if (raw.endsWith('M')) return parseFloat(raw);
  return parseFloat(raw.replace(/[^\d.]/g, '')) || 0;
}

// Squad value modifier: ±15 ELO adjustment based on market value
function valueMod(value) {
  const valM = parseValue(value);
  if (valM <= 0) return 0;
  const mod = (Math.log10(valM) - 2.0) * 14;
  return Math.max(-15, Math.min(15, mod));
}

function simulateScore(homeTeam, awayTeam) {
  const eloA = (homeTeam && homeTeam.elo) || 1600;
  const eloB = (awayTeam && awayTeam.elo) || 1600;
  // Apply squad value adjustment (mirrors the client-side simulation engine)
  const eA = eloA + valueMod(homeTeam ? homeTeam.value : '');
  const eB = eloB + valueMod(awayTeam ? awayTeam.value : '');
  const diff = eA - eB;
  const lA = Math.max(0.1, Math.min(5.5, BASE_LAMBDA * Math.exp(diff / 600)));
  const lB = Math.max(0.1, Math.min(5.5, BASE_LAMBDA * Math.exp(-diff / 600)));

  const sampleGoals = (lambda) => {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L && k < 15);
    return k - 1;
  };

  return {
    homeScore: sampleGoals(lA),
    awayScore: sampleGoals(lB)
  };
}

function adminAuth(req, res, next) {
  const clientKey = req.headers['x-admin-key'];
  if (clientKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized admin key' });
  }
  next();
}

app.get('/api/teams', wrapAsync(async (req, res) => {
  const cache = await ensureFallbackCache();
  res.json(cache);
}));

app.post('/api/teams/sync', wrapAsync(async (req, res) => {
  const cache = await ensureFallbackCache();
  const updatedTeams = cache.teams.map(t => ({ ...t }));
  const countToModify = Math.floor(Math.random() * 3) + 3;
  for (let i = 0; i < countToModify; i++) {
    const rIndex = Math.floor(Math.random() * updatedTeams.length);
    const change = Math.floor(Math.random() * 31) - 15;
    updatedTeams[rIndex].elo = Math.max(1200, updatedTeams[rIndex].elo + change);
  }

  const syncedCache = {
    ...cache,
    teams: updatedTeams,
    syncedAt: new Date().toISOString(),
    source: 'FIFA Sync / Google Search Hints'
  };

  await writeJsonData('teams_cache', TEAMS_CACHE_PATH, syncedCache);
  res.json(syncedCache);
}));

app.get('/api/recent-matches', wrapAsync(async (req, res) => {
  const recent = await readRecentMatches();
  res.json(recent);
}));

app.get('/api/fixtures/status', wrapAsync(async (req, res) => {
  const status = await calculateFixturesAndStatus();
  // allFixtures is intentionally included - needed by the predictor component for upcoming matchups
  res.json(status);
}));

app.post('/api/fixtures/sync', wrapAsync(async (req, res) => {
  const status = await calculateFixturesAndStatus();
  const results = await readFixtureResults();
  const unfinished = status.allFixtures.filter(m => !m.finished && m.home !== 'TBD' && m.away !== 'TBD');

  if (unfinished.length > 0) {
    const countToSim = Math.min(2, unfinished.length);
    const teamsCache = await ensureFallbackCache();
    const teamsList = teamsCache.teams || [];
    const teamsMap = {};
    teamsList.forEach(t => { teamsMap[t.id] = t; });

    for (let i = 0; i < countToSim; i++) {
      const match = unfinished[i];
      const homeTeam = teamsMap[match.home] || null;
      const awayTeam = teamsMap[match.away] || null;
      const score = simulateScore(homeTeam, awayTeam);
      let winner = null;

      if (match.stage !== 'Group') {
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
  await writeFixtureResults(results);
  const updatedStatus = await calculateFixturesAndStatus();
  // allFixtures is intentionally included - needed by predictor
  res.json({ status: updatedStatus });
}));

app.post('/api/admin/fixtures/result', wrapAsync(async (req, res) => {
  const { matchId, homeScore, awayScore, winner } = req.body;
  if (matchId === undefined || homeScore === undefined || awayScore === undefined) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const results = await readFixtureResults();
  results[matchId] = {
    homeScore: parseInt(homeScore, 10),
    awayScore: parseInt(awayScore, 10),
    winner: winner || (homeScore > awayScore ? undefined : awayScore > homeScore ? undefined : null) // null for draws in group stage
  };

  await writeFixtureResults(results);
  const updatedStatus = await calculateFixturesAndStatus();
  // allFixtures is intentionally included - needed by predictor
  res.json({ status: updatedStatus });
}));

app.get('/api/espn-scores', wrapAsync(async (req, res) => {
  try {
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('ESPN proxy error:', err);
    res.status(502).json({ error: 'Failed to fetch ESPN scores' });
  }
}));

app.post('/api/predictions', wrapAsync(async (req, res) => {
  const { userName, championId, championName, championFlag, topPicks, simsRun } = req.body;
  if (!userName || !championId || !topPicks) {
    return res.status(400).json({ error: 'Missing prediction parameters' });
  }

  const predictions = await readPredictions();
  const newPrediction = {
    id: require('crypto').randomUUID ? require('crypto').randomUUID() : `pred_${Math.random().toString(36).slice(2, 9)}`,
    userName,
    championId,
    championName,
    championFlag,
    topPicks,
    simsRun: parseInt(simsRun, 10),
    createdAt: new Date().toISOString()
  };

  predictions.unshift(newPrediction);
  if (predictions.length > 200) predictions.pop();

  await writePredictions(predictions);
  res.json({ success: true, prediction: newPrediction });
}));

app.post('/api/sandbox-sims', wrapAsync(async (req, res) => {
  const { teamA, teamB, scoreA, scoreB, userName } = req.body;
  if (!teamA || !teamB || scoreA === undefined || scoreB === undefined) {
    return res.status(400).json({ error: 'Missing sandbox parameter' });
  }

  const sandbox = await readSandboxSims();
  const newSim = {
    id: `sim_${Math.random().toString(36).slice(2, 9)}`,
    teamA,
    teamB,
    scoreA: parseInt(scoreA, 10),
    scoreB: parseInt(scoreB, 10),
    userName: userName || 'Anonymous',
    createdAt: new Date().toISOString()
  };

  sandbox.unshift(newSim);
  if (sandbox.length > 500) sandbox.pop();

  await writeSandboxSims(sandbox);
  res.json({ success: true });
}));

// GET /api/leaderboard
app.get('/api/leaderboard', wrapAsync(async (req, res) => {
  const predictions = await readPredictions();
  const teamsCache = await ensureFallbackCache();
  const teamsList = teamsCache.teams || [];
  const teamsMap = {};
  teamsList.forEach(t => { teamsMap[t.id] = t; });

  const status = await calculateFixturesAndStatus();
  const allFixtures = status.allFixtures || [];

  // Map teamId -> furthest stage reached
  const teamStageOrder = ['Group', 'R32', 'R16', 'QF', 'SF', 'Final', 'Champion'];
  const teamStageMap = {};
  teamsList.forEach(t => { teamStageMap[t.id] = 'Group'; });

  allFixtures.forEach(f => {
    if (!f.finished) return;
    let stageName;
    if (f.stage === 'Group' || (!f.stage && f.matchday)) stageName = 'Group';
    else if (f.stage === 'Round of 32') stageName = 'R32';
    else if (f.stage === 'Round of 16') stageName = 'R16';
    else if (f.stage === 'Quarter-Final') stageName = 'QF';
    else if (f.stage === 'Semi-Final') stageName = 'SF';
    else if (f.stage === 'Grand Final') stageName = 'Final';
    else if (f.stage === 'Third Place') stageName = '3rd';
    else stageName = 'Group';

    const stageIdx = teamStageOrder.indexOf(stageName);

    if (stageName === 'Final') {
      if (f.winnerId) {
        const wIdx = teamStageOrder.indexOf(teamStageMap[f.winnerId] || 'Group');
        const championIdx = teamStageOrder.indexOf('Champion');
        if (championIdx > wIdx) teamStageMap[f.winnerId] = 'Champion';
      }
      const loser = f.home === f.winnerId ? f.away : f.home;
      if (loser) {
        const lIdx = teamStageOrder.indexOf(teamStageMap[loser] || 'Group');
        const finalIdx = teamStageOrder.indexOf('Final');
        if (finalIdx > lIdx) teamStageMap[loser] = 'Final';
      }
    } else {
      if (f.winnerId) {
        const wIdx = teamStageOrder.indexOf(teamStageMap[f.winnerId] || 'Group');
        if (stageIdx > wIdx) teamStageMap[f.winnerId] = stageName;
      }
      const loser = f.home === f.winnerId ? f.away : f.home;
      if (loser) {
        const lIdx = teamStageOrder.indexOf(teamStageMap[loser] || 'Group');
        if (stageIdx > lIdx) teamStageMap[loser] = stageName;
      }
    }
  });

  const stagePoints = {
    'Group': 1,
    'R32': 3,
    'R16': 5,
    'QF': 10,
    'SF': 20,
    '3rd': 15,
    'Final': 30,
    'Champion': 50
  };

  const actualChampion = status.champion;

  // Group predictions by user, keep latest
  const userMap = {};
  predictions.forEach(p => {
    const existing = userMap[p.userName];
    if (!existing || new Date(p.createdAt) > new Date(existing.createdAt)) {
      userMap[p.userName] = p;
    }
  });

  const leaderboard = Object.values(userMap).map(p => {
    const championCorrect = p.championId === actualChampion;
    const championPts = championCorrect ? 50 : 0;
    let topPicksPts = 0;
    const pickDetails = (p.topPicks || []).map(pick => {
      const stage = teamStageMap[pick.id] || 'Group';
      const pts = stagePoints[stage] || 0;
      topPicksPts += pts;
      return { id: pick.id, name: pick.name, stage, pts };
    });

    return {
      userName: p.userName,
      championId: p.championId,
      championName: p.championName,
      championFlag: p.championFlag || '',
      championCorrect,
      championPts,
      topPicksPts,
      totalScore: championPts + topPicksPts,
      topPicks: p.topPicks || [],
      pickDetails,
      simsRun: p.simsRun,
      createdAt: p.createdAt
    };
  });

  leaderboard.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.simsRun - a.simsRun;
  });
  leaderboard.forEach((entry, idx) => { entry.rank = idx + 1; });

  res.json({
    champion: actualChampion,
    championName: actualChampion ? (teamsMap[actualChampion] ? teamsMap[actualChampion].name : actualChampion) : null,
    championFlag: actualChampion ? (teamsMap[actualChampion] ? teamsMap[actualChampion].flag : '') : '',
    totalUsers: leaderboard.length,
    leaderboard
  });
}));

app.get('/api/admin/predictions', adminAuth, wrapAsync(async (req, res) => {
  const predictions = await readPredictions();
  res.json(predictions);
}));

app.get('/api/admin/stats', adminAuth, wrapAsync(async (req, res) => {
  const predictions = await readPredictions();
  const sandbox = await readSandboxSims();
  const teamsCache = await ensureFallbackCache();
  const teamsList = teamsCache.teams || [];
  const teamsMap = {};
  teamsList.forEach(t => { teamsMap[t.id] = t; });

  const totalPredictions = predictions.length;
  const uniqueUserNames = new Set();
  predictions.forEach(p => uniqueUserNames.add(p.userName));
  sandbox.forEach(s => uniqueUserNames.add(s.userName));
  const uniqueUsers = uniqueUserNames.size;

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

  const sandboxCounts = {};
  sandbox.forEach(s => {
    sandboxCounts[s.teamA] = (sandboxCounts[s.teamA] || 0) + 1;
    sandboxCounts[s.teamB] = (sandboxCounts[s.teamB] || 0) + 1;
  });

  const sandboxStats = teamsList.map(t => ({
    id: t.id,
    name: t.name,
    flag: t.flag,
    count: sandboxCounts[t.id] || 0
  })).sort((a, b) => b.count - a.count);

  res.json({
    totalPredictions,
    uniqueUsers,
    championStats,
    sandboxStats,
    totalSandboxSims: sandbox.length,
    recent: predictions.slice(0, 10)
  });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports.handler = serverless(app);
