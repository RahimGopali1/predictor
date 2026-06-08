import { Injectable } from '@angular/core';
import { Team } from '../models/team.model';

interface ZodiacSign {
  sign: string;
  emoji: string;
  element: string;
  dates: [{ m: number; d: number }, { m: number; d: number }];
  baseEnergy: number;
}

@Injectable({ providedIn: 'root' })
export class AstroService {
  private readonly zodiac: ZodiacSign[] = [
    { sign: 'Aries', emoji: '♈', element: 'Fire', dates: [{ m: 3, d: 21 }, { m: 4, d: 19 }], baseEnergy: 0.78 },
    { sign: 'Taurus', emoji: '♉', element: 'Earth', dates: [{ m: 4, d: 20 }, { m: 5, d: 20 }], baseEnergy: 0.62 },
    { sign: 'Gemini', emoji: '♊', element: 'Air', dates: [{ m: 5, d: 21 }, { m: 6, d: 20 }], baseEnergy: 0.85 },
    { sign: 'Cancer', emoji: '♋', element: 'Water', dates: [{ m: 6, d: 21 }, { m: 7, d: 22 }], baseEnergy: 0.72 },
    { sign: 'Leo', emoji: '♌', element: 'Fire', dates: [{ m: 7, d: 23 }, { m: 8, d: 22 }], baseEnergy: 0.88 },
    { sign: 'Virgo', emoji: '♍', element: 'Earth', dates: [{ m: 8, d: 23 }, { m: 9, d: 22 }], baseEnergy: 0.70 },
    { sign: 'Libra', emoji: '♎', element: 'Air', dates: [{ m: 9, d: 23 }, { m: 10, d: 22 }], baseEnergy: 0.76 },
    { sign: 'Scorpio', emoji: '♏', element: 'Water', dates: [{ m: 10, d: 23 }, { m: 11, d: 21 }], baseEnergy: 0.83 },
    { sign: 'Sagittarius', emoji: '♐', element: 'Fire', dates: [{ m: 11, d: 22 }, { m: 12, d: 21 }], baseEnergy: 0.80 },
    { sign: 'Capricorn', emoji: '♑', element: 'Earth', dates: [{ m: 12, d: 22 }, { m: 1, d: 19 }], baseEnergy: 0.68 },
    { sign: 'Aquarius', emoji: '♒', element: 'Air', dates: [{ m: 1, d: 20 }, { m: 2, d: 18 }], baseEnergy: 0.79 },
    { sign: 'Pisces', emoji: '♓', element: 'Water', dates: [{ m: 2, d: 19 }, { m: 3, d: 20 }], baseEnergy: 0.74 }
  ];

  private readonly planetMods: Record<string, number> = {
    Aries: 0.04, Taurus: -0.02, Gemini: 0.12, Cancer: 0.06,
    Leo: 0.10, Virgo: -0.01, Libra: 0.07, Scorpio: 0.05,
    Sagittarius: 0.08, Capricorn: -0.03, Aquarius: 0.09, Pisces: 0.07
  };

  getZodiac(dob: string): ZodiacSign {
    const parts = dob.split('-');
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    for (const z of this.zodiac) {
      const [s, e] = z.dates;
      if (s.m === e.m) {
        if (m === s.m && d >= s.d && d <= e.d) return z;
      } else if (m === s.m && d >= s.d) return z;
      else if (m === e.m && d <= e.d) return z;
    }
    return this.zodiac[9];
  }

  getCosmicScore(team: Team): number {
    const z = this.getZodiac(team.starDOB);
    const planet = this.planetMods[z.sign] || 0;
    return Math.round((z.baseEnergy + planet) * 100);
  }

  getPlanetMod(sign: string): number {
    return this.planetMods[sign] || 0;
  }

  cosmicBarColor(score: number): string {
    if (score >= 80) return 'var(--green)';
    if (score >= 65) return 'var(--gold)';
    if (score >= 50) return 'var(--amber)';
    return 'var(--red)';
  }
}
