import { t, onLanguageChange } from '../i18n/i18n';
import { ColorPalette } from '../gfx/ColorPalette';

export interface CommodityPrice {
  nameKey: string;
  price: number;
  change: number; // percentage change e.g. +2.4
  color: string;
}

export class MarketTicker {
  private containerElement: HTMLElement | null = null;
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

  public render(): void {
    if (!this.containerElement) return;

    this.containerElement.innerHTML = `
      <div class="h-full flex flex-col space-y-5 text-slate-300 font-sans select-none">
        <!-- Header -->
        <div class="border-b border-slate-800 pb-3">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h2 class="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              ${t('market.title')}
            </h2>
          </div>
          <p class="text-sm font-medium text-slate-200 mt-1">
            ${t('market.ticker')} & Kurstrends
          </p>
        </div>

        <!-- Commodity Prices -->
        <div class="space-y-2">
          ${this.prices.map((c) => {
            const isPositive = c.change >= 0;
            const changeColor = isPositive ? 'text-emerald-400' : 'text-rose-400';
            const changeSign = isPositive ? '+' : '';

            return `
              <div class="bg-slate-800/50 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between">
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
            <span class="font-mono text-slate-400">Spekulations-Schutz</span>
          </div>
        </div>

        <!-- Sky-Council Dossier -->
        <div class="bg-slate-800/40 rounded-xl p-3 border border-slate-800 space-y-3 flex-1 overflow-y-auto">
          <div class="flex justify-between items-center">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-amber-400">
              ${t('market.councilDossier')}
            </h3>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
              Woche 4, 8, 12
            </span>
          </div>

          <p class="text-[11px] text-slate-400 leading-relaxed">
            30 Ratsanteile bestimmen die Vorherrschaft im Sky-Council.
          </p>

          <div class="space-y-2 pt-1">
            <!-- Player -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-300 font-medium">Spieler (Du)</span>
              <span class="font-mono font-bold text-emerald-400">${this.playerShares} / 30</span>
            </div>
            <!-- Rival 1: Daredevil -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">${t('rivals.daredevil')}</span>
              <span class="font-mono text-slate-300">${this.daredevilShares}</span>
            </div>
            <!-- Rival 2: Calculator -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">${t('rivals.calculator')}</span>
              <span class="font-mono text-slate-300">${this.calculatorShares}</span>
            </div>
            <!-- Rival 3: Tracker -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">${t('rivals.tracker')}</span>
              <span class="font-mono text-slate-300">${this.trackerShares}</span>
            </div>
          </div>
        </div>

        <!-- Bottom Status -->
        <div class="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
          <span>Hafenstatus:</span>
          <span class="text-emerald-400 font-mono">Bereit zum Umschlag</span>
        </div>
      </div>
    `;
  }
}
