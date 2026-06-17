import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay, switchMap, timer } from 'rxjs';

export interface EspnMatchEvent {
  id: string;
  type: string;
  text: string;
  minute: string;
  minuteValue: number;
  teamId: string;
  teamAbbreviation: string;
  teamName: string;
  ownGoal: boolean;
  penaltyKick: boolean;
  yellowCard: boolean;
  redCard: boolean;
  playerName: string;
  playerNumber: string;
  playerPosition: string;
}

export interface EspnMatchOdds {
  homeMoneyline?: string;
  awayMoneyline?: string;
  drawMoneyline?: string;
  spreadLine?: string;
  overLine?: string;
  overOdds?: string;
  underOdds?: string;
  drawOddsBackup?: string;
}

export interface EspnTeamStats {
  possessionPct?: number;
  totalShots?: number;
  shotsOnTarget?: number;
  wonCorners?: number;
  foulsCommitted?: number;
  goalAssists?: number;
}

export interface EspnCompetitor {
  teamId: string;
  abbreviation: string;
  displayName: string;
  logo: string;
  primaryColor: string;
  altColor: string;
  score: number;
  winner: boolean;
  form: string;
  record: string;
  statistics: EspnTeamStats;
}

export interface EspnMatch {
  id: string;
  name: string;
  statusName: string;
  displayClock: string;
  shortDetail: string;
  seasonSlug: string;
  groupLabel: string;
  venue: string;
  kickoff: string;
  kickoffIso: string;
  home: EspnCompetitor;
  away: EspnCompetitor;
  odds?: EspnMatchOdds;
  broadcasts: string[];
  recapHeadline: string;
  recapShortHeadline: string;
  details: EspnMatchEvent[];
}

@Injectable({ providedIn: 'root' })
export class EspnMatchService {
  private readonly http = inject(HttpClient);
  private readonly directUrl = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
  private readonly proxyUrl = '/api/espn-scores';

  private fetchFrom(url: string): Observable<EspnMatch[]> {
    return this.http.get<any>(url).pipe(
      map((response) => this.mapResponse(response))
    );
  }

  private readonly teamsCache = new Map<string, { name: string; flag: string }>();

  readonly allMatches$: Observable<EspnMatch[]> = timer(0, 60000).pipe(
    switchMap(() =>
      // Try direct ESPN URL first, fall back to proxy, then tournament data
      this.fetchFrom(this.directUrl).pipe(
        catchError(() => this.fetchFrom(this.proxyUrl)),
        catchError(() =>
          forkJoin({
            status: this.http.get<any>('/api/fixtures/status'),
            teams: this.http.get<any>('/api/teams')
          }).pipe(
            map(({ status, teams }) => {
              if (Array.isArray(teams?.teams)) {
                teams.teams.forEach((t: any) => {
                  if (t.id) this.teamsCache.set(t.id, { name: t.name || t.id, flag: t.flag || '' });
                });
              }
              return this.mapTournamentToEspn(status);
            }),
            catchError((error) => {
              console.error('EspnMatchService: all sources failed', error);
              return of([] as EspnMatch[]);
            })
          )
        )
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly liveMatches$: Observable<EspnMatch[]> = this.allMatches$.pipe(
    map((matches) => matches.filter((match) => this.isLive(match)))
  );

  readonly completedMatches$: Observable<EspnMatch[]> = this.allMatches$.pipe(
    map((matches) => matches.filter((match) => this.isCompleted(match)))
  );

  readonly upcomingMatches$: Observable<EspnMatch[]> = this.allMatches$.pipe(
    map((matches) => matches.filter((match) => this.isUpcoming(match)))
  );

  getLiveEventTicker(match: EspnMatch): EspnMatchEvent[] {
    return [...match.details].sort((a, b) => a.minuteValue - b.minuteValue).slice(-3);
  }

  private mapTournamentToEspn(status: any): EspnMatch[] {
    const fixtures = Array.isArray(status?.allFixtures) ? status.allFixtures : [];
    return fixtures.map((f: any) => {
      const isFinished = f.finished === true;
      const hTeam = this.teamsCache.get(f.home);
      const aTeam = this.teamsCache.get(f.away);
      const homeName = f.homeTeam || hTeam?.name || f.home;
      const awayName = f.awayTeam || aTeam?.name || f.away;
      const homeFlag = hTeam?.flag || '';
      const awayFlag = aTeam?.flag || '';

      const home: EspnCompetitor = {
        teamId: f.home,
        abbreviation: f.home,
        displayName: homeName,
        logo: homeFlag,
        primaryColor: '',
        altColor: '',
        score: f.homeScore ?? 0,
        winner: isFinished && f.winnerId === f.home,
        form: '',
        record: '',
        statistics: { possessionPct: 0, totalShots: 0, shotsOnTarget: 0, wonCorners: 0, foulsCommitted: 0 }
      };

      const away: EspnCompetitor = {
        teamId: f.away,
        abbreviation: f.away,
        displayName: awayName,
        logo: awayFlag,
        primaryColor: '',
        altColor: '',
        score: f.awayScore ?? 0,
        winner: isFinished && f.winnerId === f.away,
        form: '',
        record: '',
        statistics: { possessionPct: 0, totalShots: 0, shotsOnTarget: 0, wonCorners: 0, foulsCommitted: 0 }
      };

      const stage = f.stage || 'Group';
      const groupLabel = f.group ? `Group ${f.group}` : stage;
      const statusName = isFinished ? 'STATUS_FULL_TIME' : 'STATUS_SCHEDULED';
      const shortDetail = isFinished ? `FT · ${f.homeScore}–${f.awayScore}` : `${f.date} · ${f.time}`;

      return {
        id: String(f.id),
        name: `${homeName} vs ${awayName}`,
        statusName,
        displayClock: '',
        shortDetail,
        seasonSlug: stage,
        groupLabel,
        venue: `${f.venue}, ${f.city}`,
        kickoff: '',
        kickoffIso: '',
        home,
        away,
        odds: undefined,
        broadcasts: [],
        recapHeadline: '',
        recapShortHeadline: '',
        details: []
      };
    });
  }

  private mapResponse(response: any): EspnMatch[] {
    const events = Array.isArray(response?.events) ? response.events : [];
    return events
      .map((event: any) => this.mapEvent(event))
      .filter((match: EspnMatch | null): match is EspnMatch => !!match);
  }

  private mapEvent(event: any): EspnMatch | null {
    const competition = event?.competitions?.[0];
    if (!competition) {
      return null;
    }

    const statusType = event?.status?.type ?? {};
    const statusName = String(statusType.name ?? '').toUpperCase();
    const displayClock = String(event?.status?.displayClock ?? '').trim();
    const shortDetail = String(statusType.shortDetail ?? '').trim();
    const seasonSlug = String(event?.season?.slug ?? '').trim();
    const groupLabel = String(competition?.altGameNote ?? '').trim();

    const venueName = String(competition?.venue?.fullName ?? '').trim();
    const city = String(competition?.venue?.address?.city ?? '').trim();
    const country = String(competition?.venue?.address?.country ?? '').trim();
    const venue = [venueName, city, country].filter(Boolean).join(', ');

    const kickoffIso = String(event?.date ?? '').trim();
    const kickoff = kickoffIso ? new Date(kickoffIso).toISOString() : '';

    const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
    const homeCompetitor = competitors.find((c: any) => c?.homeAway === 'home') ?? competitors[0];
    const awayCompetitor = competitors.find((c: any) => c?.homeAway === 'away') ?? competitors[1] ?? competitors[0];
    if (!homeCompetitor || !awayCompetitor) {
      return null;
    }

    const home = this.mapCompetitor(homeCompetitor);
    const away = this.mapCompetitor(awayCompetitor);

    const details = this.mapDetails(Array.isArray(competition?.details) ? competition.details : []);
    const broadcasts = Array.isArray(competition?.broadcasts) && competition.broadcasts[0] && Array.isArray(competition.broadcasts[0].names)
      ? competition.broadcasts[0].names.filter((name: any) => !!name).map((name: any) => String(name))
      : [];

    const oddsSource = Array.isArray(competition?.odds) ? competition.odds[0] : competition?.odds;
    const odds = oddsSource ? this.mapOdds(oddsSource) : undefined;

    const recapHeadline = String(competition?.headlines?.[0]?.description ?? '').trim();
    const recapShortHeadline = String(competition?.headlines?.[0]?.shortLinkText ?? '').trim();

    return {
      id: String(event?.id ?? `${home.teamId}-${away.teamId}`),
      name: String(event?.name ?? `${home.displayName} vs ${away.displayName}`),
      statusName,
      displayClock,
      shortDetail,
      seasonSlug,
      groupLabel,
      venue,
      kickoff,
      kickoffIso,
      home,
      away,
      odds,
      broadcasts,
      recapHeadline,
      recapShortHeadline,
      details
    };
  }

  private mapCompetitor(competitor: any): EspnCompetitor {
    const team = competitor?.team ?? {};
    return {
      teamId: String(team.id ?? ''),
      abbreviation: String(team.abbreviation ?? '').trim(),
      displayName: String(team.displayName ?? team.name ?? '').trim(),
      logo: String(team.logo ?? ''),
      primaryColor: String(team.color ?? '').trim(),
      altColor: String(team.alternateColor ?? '').trim(),
      score: Number(competitor?.score ?? 0),
      winner: Boolean(competitor?.winner),
      form: String(competitor?.form ?? '').trim(),
      record: String(competitor?.records?.[0]?.summary ?? '').trim(),
      statistics: this.extractStats(Array.isArray(competitor?.statistics) ? competitor.statistics : [])
    };
  }

  private mapDetails(details: any[]): EspnMatchEvent[] {
    return details
      .filter((detail) => !!detail?.type?.text)
      .map((detail: any, index: number) => {
        const typeText = String(detail.type.text ?? '').trim();
        const clockValue = String(detail?.clock?.displayValue ?? '').trim();
        const minuteValue = this.parseMinute(clockValue);
        const athlete = Array.isArray(detail?.athletesInvolved) ? detail.athletesInvolved[0] : null;
        const teamId = String(detail?.team?.id ?? '').trim();
        const teamAbbreviation = String(detail?.team?.abbreviation ?? '').trim();
        const teamName = String(detail?.team?.displayName ?? detail?.team?.name ?? '').trim();

        return {
          id: `${detail?.id ?? index}-${teamId}`,
          type: typeText,
          text: typeText,
          minute: clockValue || detail?.displayValue || '',
          minuteValue,
          teamId,
          teamAbbreviation,
          teamName,
          ownGoal: Boolean(detail?.ownGoal),
          penaltyKick: Boolean(detail?.penaltyKick),
          yellowCard: Boolean(detail?.yellowCard),
          redCard: Boolean(detail?.redCard),
          playerName: String(athlete?.displayName ?? '').trim(),
          playerNumber: String(athlete?.jersey ?? '').trim(),
          playerPosition: String(athlete?.position ?? '').trim()
        };
      });
  }

  private mapOdds(odds: any): EspnMatchOdds {
    return {
      homeMoneyline: String(odds?.moneyline?.home?.current?.odds ?? '').trim() || undefined,
      awayMoneyline: String(odds?.moneyline?.away?.current?.odds ?? '').trim() || undefined,
      drawMoneyline: String(odds?.moneyline?.draw?.current?.odds ?? '').trim() || undefined,
      spreadLine: String(odds?.pointSpread?.home?.current?.line ?? '').trim() || undefined,
      overLine: String(odds?.total?.over?.current?.line ?? '').trim() || undefined,
      overOdds: String(odds?.total?.over?.current?.odds ?? '').trim() || undefined,
      underOdds: String(odds?.total?.under?.current?.odds ?? '').trim() || undefined,
      drawOddsBackup: String(odds?.drawOdds?.moneyLine ?? '').trim() || undefined
    };
  }

  private extractStats(stats: any[]): EspnTeamStats {
    const result: EspnTeamStats = {};
    for (const stat of stats) {
      const key = String(stat?.name ?? '').trim();
      const value = this.parseStatValue(stat);
      if (key === 'possessionPct') {
        result.possessionPct = value;
      } else if (key === 'totalShots') {
        result.totalShots = value;
      } else if (key === 'shotsOnTarget') {
        result.shotsOnTarget = value;
      } else if (key === 'wonCorners') {
        result.wonCorners = value;
      } else if (key === 'foulsCommitted') {
        result.foulsCommitted = value;
      } else if (key === 'goalAssists') {
        result.goalAssists = value;
      }
    }
    return result;
  }

  private parseStatValue(stat: any): number {
    const raw = stat?.value ?? stat?.displayValue ?? stat?.displayValue ?? '';
    if (typeof raw === 'number') {
      return raw;
    }
    if (typeof raw === 'string') {
      const trimmed = raw.replace('%', '').replace('+', '').trim();
      return Number(trimmed) || 0;
    }
    return 0;
  }

  private parseMinute(clock: string): number {
    const match = String(clock || '').match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  private isLive(match: EspnMatch): boolean {
    return ['STATUS_FIRST_HALF', 'STATUS_HALFTIME', 'STATUS_SECOND_HALF'].includes(match.statusName);
  }

  private isCompleted(match: EspnMatch): boolean {
    return match.statusName === 'STATUS_FULL_TIME';
  }

  private isUpcoming(match: EspnMatch): boolean {
    return match.statusName === 'STATUS_SCHEDULED';
  }
}
