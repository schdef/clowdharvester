import { t, onLanguageChange } from '../i18n/i18n';
import { ColorPalette } from '../gfx/ColorPalette';

export class DesktopRadar {
  private containerElement: HTMLElement | null = null;
  private currentWeek = 1;
  private currentSeason = 1;

  constructor() {
    onLanguageChange(() => this.render());
  }

  public mount(container: HTMLElement): void {
    this.containerElement = container;
    this.render();
  }

  public setTime(season: number, week: number): void {
    this.currentSeason = season;
    this.currentWeek = week;
    this.render();
  }

  public render(): void {
    if (!this.containerElement) return;

    const pendulumPhase = ((this.currentWeek - 1) % 4) + 1;

    this.containerElement.innerHTML = `
      <div class="h-full flex flex-col space-y-5 text-slate-300 font-sans select-none">
        <!-- Header -->
        <div class="border-b border-slate-800 pb-3">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <h2 class="text-xs font-semibold uppercase tracking-widest text-cyan-400">
              ${t('radar.title')}
            </h2>
          </div>
          <p class="text-sm font-medium text-slate-200 mt-1">
            ${t('radar.forecast')} – ${t('header.season')} ${this.currentSeason}, ${t('header.week')} ${this.currentWeek}
          </p>
        </div>

        <!-- 4-Week Pendulum Drift Indicator -->
        <div class="bg-slate-800/50 rounded-xl p-3 border border-slate-800">
          <div class="flex justify-between items-center text-xs mb-2 text-slate-400 font-mono">
            <span>${t('radar.pendulumCycle')}</span>
            <span class="text-amber-400 font-semibold">${pendulumPhase} / 4</span>
          </div>
          <div class="grid grid-cols-4 gap-1.5 h-2">
            <div class="rounded-full ${pendulumPhase >= 1 ? 'bg-amber-400' : 'bg-slate-700'} transition-colors"></div>
            <div class="rounded-full ${pendulumPhase >= 2 ? 'bg-amber-400' : 'bg-slate-700'} transition-colors"></div>
            <div class="rounded-full ${pendulumPhase >= 3 ? 'bg-amber-400' : 'bg-slate-700'} transition-colors"></div>
            <div class="rounded-full ${pendulumPhase >= 4 ? 'bg-amber-400' : 'bg-slate-700'} transition-colors"></div>
          </div>
          <p class="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Vorhersage-Fenster stabil. Drift kehrt alle 4 Wochen exakt zur Ursprungsposition zurück.
          </p>
        </div>

        <!-- Layer & Wind Breakdown -->
        <div class="space-y-3 flex-1 overflow-y-auto pr-1">
          <span class="text-xs font-medium uppercase tracking-wider text-slate-400">
            ${t('radar.layerAnalysis')}
          </span>

          <!-- High Zone Card -->
          <div class="rounded-xl p-3 border border-cyan-800/40 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
            <div class="flex justify-between items-start">
              <span class="text-xs font-bold text-sky-200 flex items-center space-x-1">
                <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${ColorPalette.highZone.turquoiseCrystal}"></span>
                <span>${t('zones.high')}</span>
              </span>
              <span class="text-[11px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-mono">
                +3 Sp./Woche →
              </span>
            </div>
            <div class="mt-2 text-xs text-slate-400 flex justify-between">
              <span>${t('zones.resourceHigh')}</span>
              <span class="text-slate-300 font-mono">25 CR Basis</span>
            </div>
          </div>

          <!-- Mid Zone Card -->
          <div class="rounded-xl p-3 border border-blue-800/40 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
            <div class="flex justify-between items-start">
              <span class="text-xs font-bold text-blue-200 flex items-center space-x-1">
                <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${ColorPalette.midZone.condensateDrop}"></span>
                <span>${t('zones.mid')}</span>
              </span>
              <span class="text-[11px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 font-mono">
                -2 Sp./Woche ←
              </span>
            </div>
            <div class="mt-2 text-xs text-slate-400 flex justify-between">
              <span>${t('zones.resourceMid')}</span>
              <span class="text-slate-300 font-mono">10 CR Basis</span>
            </div>
          </div>

          <!-- Low Zone Card -->
          <div class="rounded-xl p-3 border border-purple-800/40 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
            <div class="flex justify-between items-start">
              <span class="text-xs font-bold text-purple-200 flex items-center space-x-1">
                <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${ColorPalette.lowZone.glowGold}"></span>
                <span>${t('zones.low')}</span>
              </span>
              <span class="text-[11px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 font-mono">
                +1 Sp./Woche →
              </span>
            </div>
            <div class="mt-2 text-xs text-slate-400 flex justify-between">
              <span>${t('zones.resourceLow')}</span>
              <span class="text-slate-300 font-mono">18 CR Basis</span>
            </div>
          </div>
        </div>

        <!-- Hotkey quick legend -->
        <div class="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div class="flex justify-between">
            <span>Sonde / Bohrkopf:</span>
            <span class="font-mono text-slate-300">[2] oder Klick</span>
          </div>
          <div class="flex justify-between">
            <span>Tempo 0.5x / 1x / 2x:</span>
            <span class="font-mono text-slate-300">[Space]</span>
          </div>
        </div>
      </div>
    `;
  }
}
