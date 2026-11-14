import { t, onLanguageChange } from '../i18n/i18n';
import { ColorPalette } from '../gfx/ColorPalette';
import { AudioManager } from '../audio/AudioManager';

export interface CommodityPrice {
  nameKey: string;
  price: number;
  change: number; // percentage change e.g. +2.4
  color: string;
}

export class MarketTicker {
  private containerElement: HTMLElement | null = null;
  private isCollapsed = true;
  private prices: CommodityPrice[] = [
    { nameKey: 'zones.resourceHigh', price: 25, change: 1.8, color: ColorPalette.highZone.turquoiseCrystal },
    { nameKey: 'zones.resourceMid', price: 10, change: -0.5, color: ColorPalette.midZone.condensateDrop },
    { nameKey: 'zones.resourceLow', price: 18, change: 4.2, color: ColorPalette.lowZone.glowGold },
  ];
  private playerShares = 0;
  private daredevilShares = 0;
  private calculatorShares = 0;
  private trackerShares = 0;

  constructor() {
    onLanguageChange(() => this.render());
  }

  public mount(container: HTMLElement): void {
    this.containerElement = container;
    this.render();
  }

  public updatePrices(prices: CommodityPrice[]): void {
    this.prices = prices;
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
          id="btn-market-expand"
          class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 text-emerald-400 text-xs font-mono transition shadow-lg cursor-pointer"
          title="${t('market.expandHint')}"
        >
          <span class="text-slate-400 text-[10px]">◀</span>
          <span class="text-sm">📈</span>
          <span class="font-bold">${t('header.market')}</span>
          <span class="text-slate-400 text-[10px]">${this.playerShares} ${t('market.sharesShort')}</span>
        </button>
      `;

      const expandBtn = document.getElementById('btn-market-expand');
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

    this.containerElement.innerHTML = `
      <div class="h-full flex flex-col space-y-4 text-slate-300 font-sans select-none">
        <!-- Header with Collapse Button -->
        <div class="border-b border-slate-800/80 pb-2.5 flex items-start justify-between">
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-sm">📈</span>
              <h2 class="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                ${t('market.title')}
              </h2>
            </div>
            <p class="text-xs font-medium text-slate-300 mt-0.5">
              ${t('market.ticker')} & ${t('market.priceTrends')}
            </p>
          </div>

          <button 
            id="btn-market-collapse"
            class="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition text-[11px] cursor-pointer"
            title="${t('market.collapseHint')}"
          >
            ▶
          </button>
        </div>

        <!-- Commodity Prices -->
        <div class="space-y-2">
          ${this.prices.map((c) => {
            const isPositive = c.change >= 0;
            const changeColor = isPositive ? 'text-emerald-400' : 'text-rose-400';
            const changeSign = isPositive ? '+' : '';

            return `
              <div class="bg-slate-800/50 rounded-xl p-2.5 border border-slate-700/60 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${c.color}"></span>
                  <span class="text-xs font-medium text-slate-200">${t(c.nameKey)}</span>
                </div>
                <div class="text-right">
                  <span class="text-xs font-mono font-bold text-slate-100">${c.price.toFixed(1)} CR</span>
                  <span class="text-[10px] font-mono ml-1.5 ${changeColor}">${changeSign}${c.change.toFixed(1)}%</span>
                </div>
              </div>
            `;
          }).join('')}
          <div class="flex items-center justify-between px-1 text-[11px] text-amber-400/90">
            <span>${t('market.evaporationRate')}</span>
            <span class="font-mono text-slate-400">${t('market.antiHoarding')}</span>
          </div>
        </div>

        <!-- Sky-Council Dossier -->
        <div class="bg-slate-800/40 rounded-xl p-3 border border-slate-700/60 space-y-2.5 flex-1 overflow-y-auto">
          <div class="flex justify-between items-center">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-amber-400">
              ${t('market.councilDossier')}
            </h3>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
              ${t('market.weeksSchedule')}
            </span>
          </div>

          <p class="text-[11px] text-slate-400 leading-relaxed">
            ${t('market.councilRule')}
          </p>

          <div class="space-y-2 pt-1">
            <!-- Player -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-300 font-medium">${t('market.playerYou')}</span>
              <span class="font-mono font-bold text-emerald-400">${this.playerShares} / 30</span>
            </div>
            <!-- Draufgänger -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">${t('rivals.daredevil')}</span>
              <span class="font-mono text-slate-300">${this.daredevilShares} / 30</span>
            </div>
            <!-- Rechner -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">${t('rivals.calculator')}</span>
              <span class="font-mono text-slate-300">${this.calculatorShares} / 30</span>
            </div>
            <!-- Spürnase -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">${t('rivals.tracker')}</span>
              <span class="font-mono text-slate-300">${this.trackerShares} / 30</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const collapseBtn = document.getElementById('btn-market-collapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => this.toggleCollapse());
    }
  }
}
