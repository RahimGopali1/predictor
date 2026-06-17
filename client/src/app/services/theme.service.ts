import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly isDark = signal(true);

  constructor() {
    const saved = localStorage.getItem('wc_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = saved ? saved === 'dark' : prefersDark;
    this.isDark.set(initialDark);
    this.applyTheme(initialDark);

    effect(() => {
      const dark = this.isDark();
      localStorage.setItem('wc_theme', dark ? 'dark' : 'light');
      this.applyTheme(dark);
    });
  }

  toggle(): void {
    this.isDark.update(v => !v);
  }

  private applyTheme(dark: boolean): void {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
}
