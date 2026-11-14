import { t, onLanguageChange } from '../i18n/i18n';
import { ColorPalette } from '../gfx/ColorPalette';
import { AudioManager } from '../audio/AudioManager';

export class DesktopRadar {
  private containerElement: HTMLElement | null = null;
  private currentWeek = 1;
  private currentSeason = 1;
  private isCollapsed = true;

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

  public toggleCollapse(): boolean {
    this.isCollapsed = !this.isCollapsed;
    AudioManager.getInstance().playUiClick();
    this.render();
    return this.isCollapsed;
  }

  public render(): void {
    if (!this.containerElement) return;

    if (this.isCollapsed) {
      // Compact collapsed mini-tab
      this.containerElement.classList.remove(
        'w-80',
        'max-h-[calc(100vh-8.5rem)]',
        'backdrop-blur-md',
        'bg-slate-900/75',
        'border',
        'border-slate-700/60',
        'rounded-2xl',
        'shadow-2xl',
        'p-4',
        'overflow-y-auto'
      );
      this.containerElement.classList.add('w-auto', 'p-0', 'bg-transparent', 'border-0', 'shadow-none');
      this.containerElement.innerHTML = `
        <button 
          id="btn-radar-expand"
          class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-cyan-300 text-xs font-mono transition shadow-lg cursor-pointer"
          title="${t('radar.expandHint')}"
        >
          <span class="text-sm">📡</span>
          <span class="font-bold">${t('header.radar')}</span>
          <span class="text-slate-400 text-[10px]">${t('header.week')} ${this.currentWeek}</span>
          <span class="text-slate-400 text-[10px]">▶</span>
        </button>
      `;

      const expandBtn = document.getElementById('btn-radar-expand');
      if (expandBtn) {
        expandBtn.addEventListener('click', () => this.toggleCollapse());
      }
      return;
    }

    // Full Expanded Floating Overlay
    this.containerElement.classList.remove('w-auto', 'p-0', 'bg-transparent', 'border-0', 'shadow-none');
    this.containerElement.classList.add(
      'w-80',
      'max-h-[calc(100vh-8.5rem)]',
      'backdrop-blur-md',
      'bg-slate-900/75',
      'border',
      'border-slate-700/60',
      'rounded-2xl',
      'shadow-2xl',
      'p-4',
      'overflow-y-auto'
    );

    const pendulumPhase = ((this.currentWeek - 1) % 4) + 1;

    this.containerElement.innerHTML = `
      <div class="h-full flex flex-col space-y-4 text-slate-300 font-sans select-none">
        <!-- Header with Collapse Button -->
        <div class="border-b border-slate-800/80 pb-2.5 flex items-start justify-between">
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-sm">📡</span>
              <h2 class="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                ${t('radar.title')}
              </h2>
            </div>
            <p class="text-xs font-medium text-slate-300 mt-0.5">
              ${t('radar.forecast')} – ${t('header.season')} ${this.currentSeason}, ${t('header.week')} ${this.currentWeek}
            </p>
          </div>

          <button 
            id="btn-radar-collapse"
            class="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition text-[11px] cursor-pointer"
            title="${t('radar.collapseHint')}"
          >
            ◀
          </button>
        </div>

        <!-- 4-Week Pendulum Drift Indicator -->
        <div class="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
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
            ${t('radar.stableWindow')}
          </p>
        </div>

        <!-- Layer & Wind Breakdown -->
        <div class="space-y-2.5 flex-1 overflow-y-auto pr-1">
          <span class="text-xs font-medium uppercase tracking-wider text-slate-400">
            ${t('radar.layerAnalysis')}
          </span>

          <!-- High Zone Card -->
          <div class="rounded-xl p-2.5 border border-cyan-800/40 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
            <div class="flex justify-between items-start">
              <span class="text-xs font-bold text-sky-200 flex items-center space-x-1.5">
                <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${ColorPalette.highZone.turquoiseCrystal}"></span>
                <span>${t('zones.high')}</span>
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-mono">
                +3 ${t('radar.driftSpeedUnits')} →
              </span>
            </div>
            <div class="mt-1.5 text-xs text-slate-400 flex justify-between">
              <span>${t('zones.resourceHigh')}</span>
              <span class="text-slate-300 font-mono">25 CR ${t('radar.baseValueLabel')}</span>
            </div>
          </div>

          <!-- Mid Zone Card -->
          <div class="rounded-xl p-2.5 border border-blue-800/40 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
            <div class="flex justify-between items-start">
              <span class="text-xs font-bold text-blue-200 flex items-center space-x-1.5">
                <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${ColorPalette.midZone.condensateDrop}"></span>
                <span>${t('zones.mid')}</span>
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 font-mono">
                -2 ${t('radar.driftSpeedUnits')} ←
              </span>
            </div>
            <div class="mt-1.5 text-xs text-slate-400 flex justify-between">
              <span>${t('zones.resourceMid')}</span>
              <span class="text-slate-300 font-mono">10 CR ${t('radar.baseValueLabel')}</span>
            </div>
          </div>

          <!-- Low Zone Card -->
          <div class="rounded-xl p-2.5 border border-purple-800/40 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
            <div class="flex justify-between items-start">
              <span class="text-xs font-bold text-purple-200 flex items-center space-x-1.5">
                <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${ColorPalette.lowZone.glowGold}"></span>
                <span>${t('zones.low')}</span>
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 font-mono">
                +1 ${t('radar.driftSpeedUnits')} →
              </span>
            </div>
            <div class="mt-1.5 text-xs text-slate-400 flex justify-between">
              <span>${t('zones.resourceLow')}</span>
              <span class="text-slate-300 font-mono">18 CR ${t('radar.baseValueLabel')}</span>
            </div>
          </div>
        </div>

        <!-- Hotkey quick legend -->
        <div class="pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-1">
          <div class="flex justify-between">
            <span>${t('radar.switchHead')}</span>
            <span class="font-mono text-slate-300">[Q] [W] [E]</span>
          </div>
          <div class="flex justify-between">
            <span>${t('radar.sonarPing')}</span>
            <span class="font-mono text-slate-300">[1]</span>
          </div>
        </div>
      </div>
    `;

    const collapseBtn = document.getElementById('btn-radar-collapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => this.toggleCollapse());
    }
  }
}
