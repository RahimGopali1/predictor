export interface Team {
  id: string;
  name: string;
  flag: string;
  group: string;
  elo: number;
  fifaRank: number;
  star: string;
  starDOB: string;
  value: string;
  penRate: number;
  host: boolean;
  climate: string;
  fifaName?: string;
}

export interface RecentMatch {
  date: string;
  home: string;
  away: string;
  sH: number;
  sA: number;
  type: string;
  k: number;
  rec: number;
}

export interface MatchResult {
  tA: Team;
  tB: Team;
  sA: number;
  sB: number;
  et: boolean;
  pens: boolean;
  pA: number;
  pB: number;
  winner: Team | null;
}

export interface SimResult {
  team: Team;
  r32: number;
  r16: number;
  qf: number;
  sf: number;
  fin: number;
  champ: number;
}

export interface BracketData {
  r32: MatchResult[];
  r16: MatchResult[];
  qf: MatchResult[];
  sf: MatchResult[];
  final: MatchResult;
}

export interface UserPrediction {
  id: string;
  userName: string;
  championId: string;
  championName: string;
  championFlag: string;
  topPicks: { id: string; name: string; pct: number }[];
  simsRun: number;
  createdAt: string;
}
