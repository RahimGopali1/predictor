const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'client', 'src', 'app', 'pages', 'predictor', 'predictor.component.html');
let h = fs.readFileSync(file, 'utf8');

h = h.replace('id="guide-btn"', '(click)="toggleGuides()"');
h = h.replace('id="senior-btn"', '(click)="toggleSenior()"');
h = h.replace('📖 GUIDES: ON', '{{ guidesVisible() ? "📖 GUIDES: ON" : "📖 GUIDES: OFF" }}');
h = h.replace('⚙️ ACCESSIBILITY', '{{ seniorMode() ? "⚙️ SENIOR MODE: ON" : "⚙️ ACCESSIBILITY" }}');
h += '\n<a routerLink="/admin" class="btn-sm" style="position:fixed;bottom:24px;right:24px;z-index:99;text-decoration:none;">🔐 ADMIN</a>\n';

for (let i = 1; i <= 6; i++) {
  h = h.replace(
    `data-step="${i}"`,
    `data-step="${i}" (click)="goStep(${i})" [class.active]="currentStep() === ${i}"`
  );
  h = h.replace(
    `id="panel-${i}"`,
    `id="panel-${i}" [class.active]="currentStep() === ${i}"`
  );
}

h = h.replace(/class="guide show"/g, '[class]="guidesVisible() ? \'guide show\' : \'guide\'"');
h = h.replace(/class="guide"(?! )/g, '[class]="guidesVisible() ? \'guide show\' : \'guide\'"');

h = h.replace(/onclick="goStep\((\d+)\)"/g, '(click)="goStep($1)"');

h = h.replace(
  'onclick="showSubTab(\'ratings\')"',
  '(click)="showSubTab(\'ratings\')" [class.active]="subTab() === \'ratings\'"'
);
h = h.replace(
  'onclick="showSubTab(\'form\')"',
  '(click)="showSubTab(\'form\')" [class.active]="subTab() === \'form\'"'
);
h = h.replace('id="subtab-ratings"', '*ngIf="subTab() === \'ratings\'" id="subtab-ratings"');
h = h.replace('id="subtab-form" style="display:none;"', '*ngIf="subTab() === \'form\'" id="subtab-form"');

h = h.replace('id="team-search"', '[(ngModel)]="teamSearch" id="team-search"');
h = h.replace(' oninput="renderRatings()"', '');

h = h.replace('id="sb-a" onchange="updateMath()"', 'id="sb-a" [(ngModel)]="sbTeamA" (ngModelChange)="updateMath()"');
h = h.replace('id="sb-b" onchange="updateMath()"', 'id="sb-b" [(ngModel)]="sbTeamB" (ngModelChange)="updateMath()"');
h = h.replace('onclick="startMatch()"', '(click)="startMatch()" [disabled]="playDisabled"');

const mathMap = {
  'm-elo-a': 'math.eloA', 'm-elo-b': 'math.eloB', 'm-host-a': 'math.hostA', 'm-host-b': 'math.hostB',
  'm-form-a': 'math.formA', 'm-form-b': 'math.formB', 'm-gap': 'math.gap', 'm-la': 'math.la',
  'm-lb': 'math.lb', 'm-rho': 'math.rho', 'm-odds': 'math.odds'
};
for (const [id, val] of Object.entries(mathMap)) {
  h = h.replace(new RegExp(`id="${id}">—</span>`, 'g'), `id="${id}">{{ ${val} }}</span>`);
}

h = h.replace('id="sb-name-a">—</div>', 'id="sb-name-a">{{ sbNameA }}</div>');
h = h.replace('id="sb-name-b">—</div>', 'id="sb-name-b">{{ sbNameB }}</div>');
h = h.replace('id="sb-flag-a">🏳️</div>', 'id="sb-flag-a">{{ sbFlagA }}</div>');
h = h.replace('id="sb-flag-b">🏳️</div>', 'id="sb-flag-b">{{ sbFlagB }}</div>');
h = h.replace('id="sb-score-a">0</div>', 'id="sb-score-a">{{ sbScoreA }}</div>');
h = h.replace('id="sb-score-b">0</div>', 'id="sb-score-b">{{ sbScoreB }}</div>');

h = h.replace('onclick="runSims()"', '(click)="runSims()" [disabled]="simRunning()"');
h = h.replace('id="prog-bar"', 'id="prog-bar" [style.width.%]="progPct()"');
h = h.replace('id="prog-text">0 / 50,000</span>', 'id="prog-text">{{ simsRun().toLocaleString() }} / 50,000</span>');
h = h.replace('id="sim-leader" style="font-size:20px;color:var(--text);">—</div>', 'id="sim-leader" style="font-size:20px;color:var(--text);">{{ simLeader() }}</div>');
h = h.replace('id="sim-pct">—</div>', 'id="sim-pct">{{ simPct() }}</div>');
h = h.replace('id="sim-count">0</div>', 'id="sim-count">{{ simsRun().toLocaleString() }}</div>');

h = h.replace('onclick="showTab(\'odds\')"', '(click)="showTab(\'odds\')" [class.active]="oddsTab() === \'odds\'"');
h = h.replace('onclick="showTab(\'bracket\')"', '(click)="showTab(\'bracket\')" [class.active]="oddsTab() === \'bracket\'"');
h = h.replace('onclick="showTab(\'compare\')"', '(click)="showTab(\'compare\')" [class.active]="oddsTab() === \'compare\'"');
h = h.replace('id="tabpanel-odds"', '*ngIf="oddsTab() === \'odds\'" id="tabpanel-odds"');
h = h.replace('id="tabpanel-bracket" style="display:none;"', '*ngIf="oddsTab() === \'bracket\'" id="tabpanel-bracket"');
h = h.replace('id="tabpanel-compare" style="display:none;"', '*ngIf="oddsTab() === \'compare\'" id="tabpanel-compare"');

h = h.replace(
  /<div style="font-family:var\(--font-head\);font-size:48px;color:var\(--blue\);letter-spacing:\.04em;">48<\/div>\s*<div style="font-size:12px;color:var\(--text3\);margin-top:4px;">TEAMS IN 2026 TOURNAMENT<\/div>/,
  '<div style="font-family:var(--font-head);font-size:48px;color:var(--blue);letter-spacing:.04em;">{{ teams().length }}</div>\n            <div style="font-size:12px;color:var(--text3);margin-top:4px;">TEAMS IN 2026 TOURNAMENT ({{ syncSource() }})</div>'
);

// Dynamic table bodies - replace empty tbody with ngFor blocks
const ratingsRows = `              <tbody>
                <tr *ngFor="let t of filteredTeams(); let i = index">
                  <td style="color:var(--text3);font-family:var(--font-mono);font-size:12px;">{{ i + 1 }}</td>
                  <td><div class="team-cell"><span class="flag">{{ t.flag }}</span><span style="color:var(--text);font-weight:500;">{{ t.name }}</span><span *ngIf="t.host" class="host-dot" title="Host"></span></div></td>
                  <td><span class="badge badge-blue">Grp {{ t.group }}</span></td>
                  <td style="color:var(--text2);font-family:var(--font-mono);font-size:12px;">#{{ t.fifaRank }}</td>
                  <td style="color:var(--text2);font-size:12px;">{{ t.star }}</td>
                  <td style="color:var(--text3);font-family:var(--font-mono);font-size:12px;">{{ t.value }}</td>
                  <td><span class="badge badge-gold">{{ (t.penRate * 100).toFixed(0) }}%</span></td>
                  <td><span class="badge badge-gold">{{ t.elo }}</span></td>
                </tr>
              </tbody>`;

h = h.replace(/<table id="ratings-table">[\s\S]*?<\/table>/,
  `<table id="ratings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Country</th>
                  <th>Group</th>
                  <th>FIFA</th>
                  <th>Star Player</th>
                  <th>Squad Value</th>
                  <th>Pen. Rate</th>
                  <th>Elo</th>
                </tr>
              </thead>
${ratingsRows}
            </table>`);

const formRows = `              <tbody>
                <tr *ngFor="let m of recentMatches()">
                  <td style="font-family:var(--font-mono);font-size:11px;color:var(--text3);">{{ m.date }}</td>
                  <td><div style="display:flex;align-items:center;justify-content:center;gap:8px;">{{ teamForMatch(m.home).flag }} {{ teamForMatch(m.home).name }} <span style="color:var(--text3);">vs</span> {{ teamForMatch(m.away).flag }} {{ teamForMatch(m.away).name }}</div></td>
                  <td style="text-align:center;font-family:var(--font-head);font-size:18px;color:var(--gold);">{{ m.sH }}–{{ m.sA }}</td>
                  <td><span class="badge" [ngClass]="m.k >= 60 ? 'badge-gold' : m.k >= 40 ? 'badge-blue' : 'badge-green'">{{ m.type }}</span></td>
                  <td style="font-family:var(--font-mono);font-size:12px;color:var(--text3);">K×{{ m.k }}</td>
                  <td><span class="badge badge-blue">{{ (m.rec * 100).toFixed(0) }}%</span></td>
                </tr>
              </tbody>`;

h = h.replace(/<table id="form-table">[\s\S]*?<\/table>/,
  `<table id="form-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Matchup</th>
                  <th>Score</th>
                  <th>Type</th>
                  <th>K-Weight</th>
                  <th>Recency</th>
                </tr>
              </thead>
${formRows}
            </table>`);

const oddsRows = `              <tbody>
                <tr *ngFor="let item of oddsList()">
                  <td><div class="team-cell"><span class="flag">{{ item.team.flag }}</span><span style="color:var(--text);font-weight:500;">{{ item.team.name }}</span></div></td>
                  <td style="font-family:var(--font-mono);font-size:12px;">{{ pct(item, 'r32') }}</td>
                  <td style="font-family:var(--font-mono);font-size:12px;">{{ pct(item, 'r16') }}</td>
                  <td style="font-family:var(--font-mono);font-size:12px;">{{ pct(item, 'qf') }}</td>
                  <td style="font-family:var(--font-mono);font-size:12px;">{{ pct(item, 'sf') }}</td>
                  <td style="font-family:var(--font-mono);font-size:12px;">{{ pct(item, 'fin') }}</td>
                  <td>
                    <div class="pct-bar">
                      <span style="font-family:var(--font-head);font-size:18px;color:var(--gold);">{{ simsRun() > 0 ? champPct(item).toFixed(1) + '%' : '—' }}</span>
                      <div class="pct-track" *ngIf="simsRun() > 0"><div class="pct-fill" [style.width.%]="Math.max(2, Math.min(100, champPct(item) * 3.5))"></div></div>
                    </div>
                  </td>
                  <td><span class="ci-pill">{{ champCi(item) }}</span></td>
                </tr>
              </tbody>`;

h = h.replace(/<table id="odds-table">[\s\S]*?<\/table>/,
  `<table id="odds-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>R32</th>
                  <th>R16</th>
                  <th>QF</th>
                  <th>SF</th>
                  <th>Final</th>
                  <th>Champion 🏆</th>
                  <th>±95% CI</th>
                </tr>
              </thead>
${oddsRows}
            </table>`);

const compareRows = `              <tbody>
                <tr *ngFor="let item of oddsList()">
                  <td><div class="team-cell"><span class="flag">{{ item.team.flag }}</span><span style="color:var(--text);font-weight:500;">{{ item.team.name }}</span></div></td>
                  <td style="font-family:var(--font-head);font-size:18px;color:var(--gold);">{{ simsRun() > 0 ? champPct(item).toFixed(1) + '%' : '—' }}</td>
                  <td style="font-family:var(--font-mono);font-size:12px;color:var(--text2);">{{ benchFor(item.team.id).opta.toFixed(1) }}%</td>
                  <td style="font-family:var(--font-mono);font-size:12px;color:var(--text2);">{{ benchFor(item.team.id).market.toFixed(1) }}%</td>
                  <td style="font-family:var(--font-mono);font-size:12px;color:var(--text3);">#{{ item.team.fifaRank }}</td>
                  <td [class.diff-pos]="simsRun() > 0 && champPct(item) - benchFor(item.team.id).opta > 0" [class.diff-neg]="simsRun() > 0 && champPct(item) - benchFor(item.team.id).opta < 0">
                    {{ simsRun() > 0 ? ((champPct(item) - benchFor(item.team.id).opta) > 0 ? '+' : '') + (champPct(item) - benchFor(item.team.id).opta).toFixed(1) + '%' : '—' }}
                  </td>
                </tr>
              </tbody>`;

h = h.replace(/<table id="compare-table">[\s\S]*?<\/table>/,
  `<table id="compare-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Our Model</th>
                  <th>Opta</th>
                  <th>Markets</th>
                  <th>FIFA Rank</th>
                  <th>Diff vs Opta</th>
                </tr>
              </thead>
${compareRows}
            </table>`);

// Sandbox options
h = h.replace(
  /<select id="sb-a"[\s\S]*?<\/select>/,
  `<select id="sb-a" [(ngModel)]="sbTeamA" (ngModelChange)="updateMath()">
              <option *ngFor="let t of sortedTeamsByName()" [value]="t.id">{{ t.flag }} {{ t.name }} (Elo {{ t.elo }})</option>
            </select>`
);
h = h.replace(
  /<select id="sb-b"[\s\S]*?<\/select>/,
  `<select id="sb-b" [(ngModel)]="sbTeamB" (ngModelChange)="updateMath()">
              <option *ngFor="let t of sortedTeamsByName()" [value]="t.id">{{ t.flag }} {{ t.name }} (Elo {{ t.elo }})</option>
            </select>`
);

// Commentary feed
h = h.replace(
  /<div class="commentary-feed" id="comm-feed">[\s\S]*?<\/div>/,
  `<div class="commentary-feed" id="comm-feed">
                <div *ngIf="commLines.length === 0" style="padding:24px;text-align:center;color:var(--text3);font-size:13px;">Select two teams and hit Simulate Match to watch a minute-by-minute text simulation.</div>
                <div *ngFor="let line of commLines" class="ev-line" [ngClass]="line.cls">
                  <span class="ev-min">{{ line.min }}'</span>
                  <span [innerHTML]="line.html"></span>
                </div>
              </div>`
);

// Astro grid
h = h.replace(
  /<div class="astro-grid" id="astro-grid"><\/div>/,
  `<div class="astro-grid" id="astro-grid">
          <div class="star-card" *ngFor="let t of topAstroTeams()">
            <div class="star-flag">{{ t.flag }}</div>
            <div class="star-country">{{ t.name }}</div>
            <div class="star-player">{{ t.star }}</div>
            <div class="zodiac-sign">{{ zodiac(t).emoji }}</div>
            <div class="zodiac-name">{{ zodiac(t).sign }} · {{ zodiac(t).element }}</div>
            <div class="luck-bar-wrap">
              <div class="luck-bar-label"><span>Cosmic Score</span><span [style.color]="cosmicColor(cosmicScore(t))" style="font-family:var(--font-mono);">{{ cosmicScore(t) }}/100</span></div>
              <div class="luck-bar-track"><div class="luck-bar-fill" [style.width.%]="cosmicScore(t)" [style.background]="cosmicColor(cosmicScore(t))"></div></div>
            </div>
            <div style="font-size:10px;color:var(--text3);margin-top:4px;">2026 Planet Mod: <span [style.color]="astroService.getPlanetMod(zodiac(t).sign) > 0 ? 'var(--green)' : 'var(--red)'" style="font-family:var(--font-mono);">{{ astroService.getPlanetMod(zodiac(t).sign) > 0 ? '+' : '' }}{{ (astroService.getPlanetMod(zodiac(t).sign) * 100).toFixed(0) }}pts</span></div>
          </div>
        </div>`
);

// Fix astro - expose astroService in component instead
h = h.replace(/astroService\.getPlanetMod/g, 'planetMod');

const astroTableRows = `              <tbody>
                <tr *ngFor="let t of topAstroTable()">
                  <td><div class="team-cell"><span class="flag">{{ t.flag }}</span><span style="color:var(--text);font-weight:500;">{{ t.name }}</span></div></td>
                  <td style="font-size:12px;color:var(--text2);">{{ t.star }}</td>
                  <td><span style="font-size:18px;">{{ zodiac(t).emoji }}</span> <span class="zodiac-name" style="font-size:11px;">{{ zodiac(t).sign }}</span></td>
                  <td><span class="cosmic-score" [style.color]="cosmicColor(cosmicScore(t))">{{ cosmicScore(t) }}</span><span style="font-size:10px;color:var(--text3);">/100</span></td>
                  <td style="font-family:var(--font-mono);font-size:13px;color:var(--gold);">{{ simsRun() > 0 ? champPct(simRes()[t.id]).toFixed(1) + '%' : '—' }}</td>
                  <td style="font-family:var(--font-head);font-size:20px;color:var(--purple);">{{ blendedOdds(t) }}</td>
                </tr>
              </tbody>`;

h = h.replace(/<table class="astro-blend-table" id="astro-table">[\s\S]*?<\/table>/,
  `<table class="astro-blend-table" id="astro-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Star Player</th>
                  <th>Sign</th>
                  <th>Cosmic Score</th>
                  <th>Stat Odds</th>
                  <th>Blended Odds</th>
                </tr>
              </thead>
${astroTableRows}
            </table>`);

// Bracket view
const bracketTpl = `<div class="bracket-outer" id="bracket-view">
            <div *ngIf="!modalBracket()" style="text-align:center;color:var(--text3);padding:48px;">Run simulations to view the modal bracket.</div>
            <div *ngIf="modalBracket()" class="bracket-container">
              <div class="b-round" *ngFor="let round of [['r32','Round of 32'],['r16','Round of 16'],['qf','Quarter-Final'],['sf','Semi-Final']]">
                <div class="b-match" *ngFor="let m of modalBracket()![round[0]]">
                  <div class="b-match-label">{{ round[1] }}</div>
                  <div class="b-team" [class.win]="isWinner(m, true)">
                    <div style="display:flex;align-items:center;gap:5px;"><span>{{ m.tA.flag }}</span><span>{{ m.tA.name }}</span></div>
                    <span class="b-score">{{ scoreDisplay(m, true) }}</span>
                  </div>
                  <div class="b-team" [class.win]="isWinner(m, false)">
                    <div style="display:flex;align-items:center;gap:5px;"><span>{{ m.tB.flag }}</span><span>{{ m.tB.name }}</span></div>
                    <span class="b-score">{{ scoreDisplay(m, false) }}</span>
                  </div>
                </div>
              </div>
              <div class="b-round b-round-final">
                <div class="b-match">
                  <div class="b-match-label" style="color:var(--gold);background:rgba(232,184,75,.1);">🏆 GRAND FINAL</div>
                  <div class="b-team" [class.win]="isWinner(modalBracket()!.final, true)">
                    <div style="display:flex;align-items:center;gap:5px;"><span>{{ modalBracket()!.final.tA.flag }}</span><span>{{ modalBracket()!.final.tA.name }}</span></div>
                    <span class="b-score">{{ scoreDisplay(modalBracket()!.final, true) }}</span>
                  </div>
                  <div class="b-team" [class.win]="isWinner(modalBracket()!.final, false)">
                    <div style="display:flex;align-items:center;gap:5px;"><span>{{ modalBracket()!.final.tB.flag }}</span><span>{{ modalBracket()!.final.tB.name }}</span></div>
                    <span class="b-score">{{ scoreDisplay(modalBracket()!.final, false) }}</span>
                  </div>
                  <div style="padding:8px 10px;font-family:var(--font-head);font-size:13px;color:var(--gold);letter-spacing:.06em;text-align:center;">CHAMPION: {{ modalBracket()!.final.winner?.flag }} {{ modalBracket()!.final.winner?.name }}</div>
                </div>
              </div>
            </div>
          </div>`;

h = h.replace(/<div class="bracket-outer" id="bracket-view">[\s\S]*?<\/div>\s*<\/div>/, bracketTpl);

fs.writeFileSync(file, h, 'utf8');
console.log('Template transformed successfully');
