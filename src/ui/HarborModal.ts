import { AudioManager } from '../audio/AudioManager';
import { GameState } from '../core/GameState';
import { LogisticsNet, UpgradeEquipmentType } from '../core/LogisticsNet';
import { ResourceType } from '../core/MarketEconomy';
import { t, onLanguageChange } from '../i18n/i18n';
import { ColorPalette } from '../gfx/ColorPalette';

export type HarborTab = 'market' | 'upgrades';

/**
 * Cloud Harvesters - HarborModal
 * Harbor marketplace and equipment outfitter dialog.
 * Enables selling harvested Skywater, Frostkristalle, and Sturmladung,
 * and purchasing upgrades for Condensers, Pipes, Tanks, and Maintenance Drones.
 */
export class HarborModal {
  private static instance: HarborModal;
  private isVisible = false;
  private activeTab: HarborTab = 'market';
  private highlightedUpgrade: UpgradeEquipmentType | null = null;
  private containerElement: HTMLElement | null = null;
  private statusMessage: string | null = null;
  private statusTimer: number | null = null;

  private constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    onLanguageChange(() => {
      if (this.isVisible) this.render();
    });
  }

  public static getInstance(): HarborModal {
    if (!HarborModal.instance) {
      HarborModal.instance = new HarborModal();
    }
    return HarborModal.instance;
  }

  public mount(container: HTMLElement): void {
    this.containerElement = container;
  }

  public open(tab: HarborTab = 'market', highlight?: UpgradeEquipmentType): void {
    this.activeTab = tab;
    this.highlightedUpgrade = highlight ?? null;
    this.isVisible = true;
    this.statusMessage = null;
    AudioManager.getInstance().playUiClick();
    this.render();
  }

  public close(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    AudioManager.getInstance().playUiClick();
    if (this.containerElement) {
      this.containerElement.innerHTML = '';
    }
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isVisible) {
      this.close();
    }
  }

  private showToast(message: string): void {
    this.statusMessage = message;
    if (this.statusTimer !== null) {
      window.clearTimeout(this.statusTimer);
    }
    this.statusTimer = window.setTimeout(() => {
      this.statusMessage = null;
      if (this.isVisible) this.render();
    }, 2400);
    this.render();
  }

  private updateHeaderDisplays(): void {
    const creditsEl = document.getElementById('header-credits');
    if (creditsEl) {
      creditsEl.textContent = GameState.getInstance().getData().credits.toString();
    }
    const tankEl = document.getElementById('header-tank');
    if (tankEl) {
      const stored = Math.floor(GameState.getInstance().getTotalStored());
      const max = GameState.getInstance().getMaxStorageCapacity();
      tankEl.textContent = `${stored} / ${max}`;
    }
  }

  private handleSell(resource: ResourceType): void {
    const gameState = GameState.getInstance();
    const inventory = gameState.getInventory();
    const units = inventory[resource];
    if (units <= 0) return;

    const earnings = gameState.sellResource(resource);
    AudioManager.getInstance().playHarborSale();
    this.updateHeaderDisplays();
    this.showToast(`${t('harbor.soldSuccess')} +${earnings.toFixed(1)} CR`);
  }

  private handleSellAll(): void {
    const gameState = GameState.getInstance();
    const totalStored = gameState.getTotalStored();
    if (totalStored <= 0) return;

    const result = gameState.sellAll();
    AudioManager.getInstance().playHarborSale();
    this.updateHeaderDisplays();
    this.showToast(`${t('harbor.allSoldSuccess')} +${result.totalEarnings.toFixed(1)} CR`);
  }

  private handleUpgrade(type: UpgradeEquipmentType): void {
    const gameState = GameState.getInstance();
    const success = gameState.upgradeEquipment(type);
    if (success) {
      AudioManager.getInstance().playUpgradeBought();
      this.updateHeaderDisplays();
      this.showToast(t('harbor.upgradeSuccess'));
    }
  }

  public render(): void {
    if (!this.containerElement || !this.isVisible) return;

    const gameState = GameState.getInstance();
    const credits = gameState.getData().credits;
    const inventory = gameState.getInventory();
    const upgrades = gameState.getUpgrades();
    const market = gameState.getMarketEconomy();

    const frostUnits = inventory.frost;
    const skywaterUnits = inventory.skywater;
    const stormUnits = inventory.storm;
    const totalUnits = frostUnits + skywaterUnits + stormUnits;

    const frostPrice = market.getPrice('frost');
    const skywaterPrice = market.getPrice('skywater');
    const stormPrice = market.getPrice('storm');

    const totalEstValue = (frostUnits * frostPrice) + (skywaterUnits * skywaterPrice) + (stormUnits * stormPrice);

    this.containerElement.innerHTML = `
      <div id="harbor-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none pointer-events-auto">
        <div id="harbor-modal-card" class="relative w-full max-w-2xl bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] overflow-y-auto">
          
          <!-- Top Header Bar -->
          <div class="px-5 py-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <span class="text-2xl">⚓</span>
              <div>
                <h2 class="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                  <span>${t('harbor.title')}</span>
                </h2>
                <p class="text-[11px] text-slate-400">
                  ${t('harbor.subtitle')}
                </p>
              </div>
            </div>

            <div class="flex items-center space-x-3">
              <!-- Player Credits Indicator -->
              <div class="flex items-center space-x-1 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-mono text-xs font-bold shadow-inner">
                <span class="text-emerald-500">CR</span>
                <span id="harbor-credits-display">${credits}</span>
              </div>

              <!-- Close Button -->
              <button 
                id="btn-harbor-close"
                class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 flex items-center justify-center transition cursor-pointer text-sm font-bold"
                title="${t('harbor.close')}"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Tab Selector Bar -->
          <div class="flex border-b border-slate-800/80 bg-slate-950/50 px-5 pt-2">
            <button
              id="tab-btn-market"
              class="flex items-center space-x-2 px-4 py-2.5 font-medium text-xs rounded-t-xl transition cursor-pointer ${
                this.activeTab === 'market'
                  ? 'bg-slate-900 text-amber-300 border-t-2 border-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }"
            >
              <span>📈</span>
              <span>${t('harbor.tabMarket')}</span>
            </button>

            <button
              id="tab-btn-upgrades"
              class="flex items-center space-x-2 px-4 py-2.5 font-medium text-xs rounded-t-xl transition cursor-pointer ${
                this.activeTab === 'upgrades'
                  ? 'bg-slate-900 text-amber-300 border-t-2 border-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }"
            >
              <span>⚙️</span>
              <span>${t('harbor.tabUpgrades')}</span>
            </button>
          </div>

          <!-- Toast Banner -->
          ${
            this.statusMessage
              ? `
            <div class="bg-emerald-950/90 border-b border-emerald-800/70 text-emerald-300 px-4 py-2 text-xs font-medium text-center animate-fade-in flex items-center justify-center space-x-2">
              <span>✨</span>
              <span>${this.statusMessage}</span>
            </div>
          `
              : ''
          }

          <!-- Tab Body -->
          <div class="p-5 overflow-y-auto space-y-4 flex-1">
            ${this.activeTab === 'market' ? this.renderMarketTab(frostUnits, skywaterUnits, stormUnits, frostPrice, skywaterPrice, stormPrice, totalUnits, totalEstValue) : this.renderUpgradesTab(upgrades, credits)}
          </div>

          <!-- Footer Bar -->
          <div class="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
            <div class="flex items-center space-x-2">
              <span class="text-amber-400">💡</span>
              <span class="truncate">${t('harbor.bottleneckRule')}</span>
            </div>
            <button 
              id="btn-harbor-dismiss"
              class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700 text-xs font-medium transition cursor-pointer"
            >
              ${t('harbor.close')}
            </button>
          </div>

        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderMarketTab(
    frostUnits: number,
    skywaterUnits: number,
    stormUnits: number,
    frostPrice: number,
    skywaterPrice: number,
    stormPrice: number,
    totalUnits: number,
    totalEstValue: number
  ): string {
    const market = GameState.getInstance().getMarketEconomy();
    const commodities: Array<{
      id: ResourceType;
      name: string;
      units: number;
      price: number;
      basePrice: number;
      icon: string;
      color: string;
      zoneText: string;
    }> = [
      {
        id: 'frost',
        name: t('zones.resourceHigh'),
        units: frostUnits,
        price: frostPrice,
        basePrice: market.getBasePrice('frost'),
        icon: '❄️',
        color: ColorPalette.highZone.turquoiseCrystal,
        zoneText: t('zones.highFull'),
      },
      {
        id: 'skywater',
        name: t('zones.resourceMid'),
        units: skywaterUnits,
        price: skywaterPrice,
        basePrice: market.getBasePrice('skywater'),
        icon: '💧',
        color: ColorPalette.midZone.condensateDrop,
        zoneText: t('zones.midFull'),
      },
      {
        id: 'storm',
        name: t('zones.resourceLow'),
        units: stormUnits,
        price: stormPrice,
        basePrice: market.getBasePrice('storm'),
        icon: '⚡',
        color: ColorPalette.lowZone.glowGold,
        zoneText: t('zones.lowFull'),
      },
    ];

    return `
      <!-- Commodity Cards Grid -->
      <div class="space-y-3">
        ${commodities
          .map((c) => {
            const hasStock = c.units > 0.05;
            const itemEstValue = c.units * c.price;
            const diffFromBase = ((c.price - c.basePrice) / c.basePrice) * 100;
            const diffSign = diffFromBase >= 0 ? '+' : '';
            const diffColor = diffFromBase >= 0 ? 'text-emerald-400' : 'text-rose-400';

            return `
              <div class="bg-slate-800/50 rounded-xl p-3.5 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-slate-900 border border-slate-700/80 shadow-inner">
                    ${c.icon}
                  </div>
                  <div>
                    <div class="flex items-center space-x-2">
                      <h3 class="text-xs sm:text-sm font-semibold text-slate-100">${c.name}</h3>
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        ${c.zoneText}
                      </span>
                    </div>
                    <div class="flex items-center space-x-3 mt-1 text-xs">
                      <span class="text-slate-400">${t('harbor.inventory')}: <strong class="text-slate-200 font-mono">${c.units.toFixed(1)} ${t('harbor.units')}</strong></span>
                      <span class="text-slate-500">•</span>
                      <span class="text-slate-400">${t('harbor.unitPrice')}: <strong class="text-amber-300 font-mono">${c.price.toFixed(1)} CR</strong> <span class="text-[10px] font-mono ${diffColor}">(${diffSign}${diffFromBase.toFixed(1)}%)</span></span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between sm:justify-end space-x-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                  <div class="text-left sm:text-right">
                    <span class="text-[10px] text-slate-400 block">${t('harbor.value')}</span>
                    <span class="text-xs font-mono font-bold text-emerald-400">${itemEstValue.toFixed(1)} CR</span>
                  </div>

                  <button
                    type="button"
                    data-sell-resource="${c.id}"
                    ${!hasStock ? 'disabled' : ''}
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      hasStock
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-100 shadow-md active:scale-95'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed opacity-50'
                    }"
                  >
                    ${t('harbor.sellUnits')}
                  </button>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>

      <!-- Sell All & Total Summary Banner -->
      <div class="bg-gradient-to-r from-slate-800/80 to-slate-900/90 rounded-xl p-4 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div>
          <span class="text-[11px] uppercase font-mono tracking-wider text-slate-400 block">
            ${t('header.tank')} Gesamtbestand
          </span>
          <div class="flex items-baseline space-x-2 mt-0.5">
            <span class="text-lg font-bold font-mono text-slate-100">${totalUnits.toFixed(1)} ${t('harbor.units')}</span>
            <span class="text-xs text-slate-400">≈ <strong class="text-emerald-400 font-mono">${totalEstValue.toFixed(1)} CR</strong></span>
          </div>
        </div>

        <button
          type="button"
          id="btn-sell-all"
          ${totalUnits <= 0.05 ? 'disabled' : ''}
          class="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-2 ${
            totalUnits > 0.05
              ? 'bg-amber-600 hover:bg-amber-500 text-slate-900 font-extrabold shadow-lg shadow-amber-500/20 active:scale-95'
              : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed opacity-50'
          }"
        >
          <span>💰</span>
          <span>${t('harbor.sellAll')}</span>
        </button>
      </div>

      <!-- Economic Hints & Price Rules -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
        <div class="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-start space-x-2">
          <span class="text-amber-400">📉</span>
          <span>${t('harbor.priceDampingHint')}</span>
        </div>
        <div class="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-start space-x-2">
          <span class="text-sky-400">💨</span>
          <span>${t('harbor.evaporationHint')}</span>
        </div>
      </div>
    `;
  }

  private renderUpgradesTab(upgrades: { condenserLevel: number; pipeLevel: number; tankLevel: number; droneLevel: number }, credits: number): string {
    const items: Array<{
      type: UpgradeEquipmentType;
      name: string;
      desc: string;
      icon: string;
      currentLevel: number;
      maxLevel: number;
      currentStat: string;
      nextStat: string | null;
      cost: number | null;
    }> = [
      {
        type: 'condenser',
        name: t('harbor.condenser'),
        desc: t('harbor.condenserDesc'),
        icon: '🌀',
        currentLevel: upgrades.condenserLevel,
        maxLevel: 3,
        currentStat: `${LogisticsNet.getCondenserRate(upgrades.condenserLevel)} ${t('harbor.unitsPerSec')}`,
        nextStat: upgrades.condenserLevel < 3 ? `${LogisticsNet.getCondenserRate(upgrades.condenserLevel + 1)} ${t('harbor.unitsPerSec')}` : null,
        cost: LogisticsNet.getUpgradeCost('condenser', upgrades.condenserLevel + 1),
      },
      {
        type: 'pipe',
        name: t('harbor.pipe'),
        desc: t('harbor.pipeDesc'),
        icon: '🚰',
        currentLevel: upgrades.pipeLevel,
        maxLevel: 3,
        currentStat: `${LogisticsNet.getPipeCapacity(upgrades.pipeLevel)} ${t('harbor.unitsPerSec')}`,
        nextStat: upgrades.pipeLevel < 3 ? `${LogisticsNet.getPipeCapacity(upgrades.pipeLevel + 1)} ${t('harbor.unitsPerSec')}` : null,
        cost: LogisticsNet.getUpgradeCost('pipe', upgrades.pipeLevel + 1),
      },
      {
        type: 'tank',
        name: t('harbor.tank'),
        desc: t('harbor.tankDesc'),
        icon: '🎈',
        currentLevel: upgrades.tankLevel,
        maxLevel: 3,
        currentStat: `${LogisticsNet.getTankCapacity(upgrades.tankLevel)} ${t('harbor.units')}`,
        nextStat: upgrades.tankLevel < 3 ? `${LogisticsNet.getTankCapacity(upgrades.tankLevel + 1)} ${t('harbor.units')}` : null,
        cost: LogisticsNet.getUpgradeCost('tank', upgrades.tankLevel + 1),
      },
      {
        type: 'drone',
        name: t('harbor.drone'),
        desc: t('harbor.droneDesc'),
        icon: '🤖',
        currentLevel: upgrades.droneLevel,
        maxLevel: 2,
        currentStat: upgrades.droneLevel >= 2 ? t('harbor.autoRepair') : t('harbor.manualRepair'),
        nextStat: upgrades.droneLevel < 2 ? t('harbor.autoRepair') : null,
        cost: LogisticsNet.getUpgradeCost('drone', upgrades.droneLevel + 1),
      },
    ];

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${items
          .map((item) => {
            const isMax = item.currentLevel >= item.maxLevel;
            const canAfford = item.cost !== null && credits >= item.cost;
            const isHighlighted = this.highlightedUpgrade === item.type;
            const highlightClass = isHighlighted ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]' : '';

            return `
              <div class="bg-slate-800/50 rounded-xl p-3.5 border border-slate-700/60 flex flex-col justify-between space-y-3 ${highlightClass}">
                <div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <span class="text-xl">${item.icon}</span>
                      <h3 class="text-xs sm:text-sm font-semibold text-slate-100">${item.name}</h3>
                    </div>
                    <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-700">
                      ${t('harbor.currentLevel')} ${item.currentLevel} / ${item.maxLevel}
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    ${item.desc}
                  </p>
                </div>

                <div class="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span class="text-[10px] text-slate-500 uppercase block">Aktuell</span>
                    <span class="text-slate-200 font-semibold">${item.currentStat}</span>
                  </div>
                  ${
                    item.nextStat
                      ? `
                    <span class="text-slate-500 text-sm">➔</span>
                    <div>
                      <span class="text-[10px] text-amber-400 uppercase block">Stufe ${item.currentLevel + 1}</span>
                      <span class="text-amber-300 font-bold">${item.nextStat}</span>
                    </div>
                  `
                      : `
                    <span class="text-[11px] font-bold text-emerald-400">${t('harbor.maxLevel')}</span>
                  `
                  }
                </div>

                <div class="pt-1">
                  ${
                    isMax
                      ? `
                    <button
                      disabled
                      class="w-full py-2 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 cursor-default"
                    >
                      ✓ ${t('harbor.maxLevel')}
                    </button>
                  `
                      : `
                    <button
                      type="button"
                      data-upgrade-type="${item.type}"
                      ${!canAfford ? 'disabled' : ''}
                      class="w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-500 text-slate-900 font-extrabold shadow-md active:scale-95'
                          : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed opacity-50'
                      }"
                    >
                      <span>⚙️</span>
                      <span>${t('harbor.upgradeTo')} (Stufe ${item.currentLevel + 1}) • ${item.cost} CR</span>
                    </button>
                  `
                  }
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.containerElement) return;

    // Backdrop click dismiss
    const backdrop = this.containerElement.querySelector('#harbor-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.close();
        }
      });
    }

    // Close buttons
    const closeBtn = this.containerElement.querySelector('#btn-harbor-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const dismissBtn = this.containerElement.querySelector('#btn-harbor-dismiss');
    if (dismissBtn) dismissBtn.addEventListener('click', () => this.close());

    // Tab buttons
    const tabMarket = this.containerElement.querySelector('#tab-btn-market');
    if (tabMarket) {
      tabMarket.addEventListener('click', () => {
        this.activeTab = 'market';
        this.highlightedUpgrade = null;
        AudioManager.getInstance().playUiClick();
        this.render();
      });
    }

    const tabUpgrades = this.containerElement.querySelector('#tab-btn-upgrades');
    if (tabUpgrades) {
      tabUpgrades.addEventListener('click', () => {
        this.activeTab = 'upgrades';
        AudioManager.getInstance().playUiClick();
        this.render();
      });
    }

    // Individual Sell buttons
    const sellButtons = this.containerElement.querySelectorAll<HTMLButtonElement>('button[data-sell-resource]');
    sellButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const resource = btn.getAttribute('data-sell-resource') as ResourceType;
        if (resource) this.handleSell(resource);
      });
    });

    // Sell All button
    const sellAllBtn = this.containerElement.querySelector('#btn-sell-all');
    if (sellAllBtn) {
      sellAllBtn.addEventListener('click', () => this.handleSellAll());
    }

    // Upgrade buttons
    const upgradeButtons = this.containerElement.querySelectorAll<HTMLButtonElement>('button[data-upgrade-type]');
    upgradeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-upgrade-type') as UpgradeEquipmentType;
        if (type) this.handleUpgrade(type);
      });
    });
  }
}
