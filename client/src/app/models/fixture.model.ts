export interface TournamentFixture {
  id: number;
  stage: string;
  matchday?: number;
  date: string;
  time: string;
  group?: string;
  home: string;
  away: string;
  venue: string;
  city: string;
  label?: string;
  homeTeam?: string | null;
  awayTeam?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status: string;
  finished: boolean;
}

export interface NextMatchInfo {
  id: number;
  stage: string;
  label: string;
  date: string;
  time: string;
  group: string | null;
  venue: string;
  city: string;
  home: string;
  away: string;
  isHome: boolean;
  finished?: boolean;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: string;
}

export interface TeamNextMatch {
  teamId: string;
  status: 'active' | 'eliminated' | 'champion' | 'waiting';
  match: NextMatchInfo | null;
  message: string | null;
}

export interface FixtureStatus {
  teamStatus: Record<string, { id: string; status: string; stage: string }>;
  nextMatches: Record<string, TeamNextMatch>;
  champion: string | null;
  groupStageComplete: boolean;
  resultsSyncedAt: string | null;
  finishedMatches: number;
  totalMatches: number;
  allFixtures?: TournamentFixture[];
}

export interface UpcomingMatch {
  fixture: NextMatchInfo;
  selectedId: string;
  opponentId: string;
  isHome: boolean;
  teamStatus: TeamNextMatch['status'];
  statusMessage: string | null;
  isSandbox?: boolean;
}
