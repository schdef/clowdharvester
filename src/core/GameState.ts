/**
 * Cloud Harvesters - GameState
 * Central state container for the 12-week season progression, credits, logistics inventory, and upgrades.
 */

import { CloudBand } from './AuctionEngine';
import { LogisticsNet, UpgradeEquipmentType } from './LogisticsNet';
import { MarketEconomy, ResourceType } from './MarketEconomy';

export interface InventoryState {
  frost: number;
  skywater: number;
  storm: number;
}

export interface UpgradeState {
  condenserLevel: number;
  pipeLevel: number;
  tankLevel: number;
  droneLevel: number;
}

export interface GameStateData {
  season: number;
  week: number;
  credits: number;
  storedVolume: number;
  councilShares: number;
  region: 'spring_winds' | 'summer_drifts' | 'storm_season';
  stars: number;
  activeCloudBand: CloudBand | null;
  wonBands: CloudBand[];
  inventory: InventoryState;
  upgrades: UpgradeState;
}

const STORAGE_KEY = 'cloud_harvesters_gamestate_v2';

export class GameState {
  private static instance: GameState;
  private data: GameStateData;
  private marketEconomy: MarketEconomy;

  private constructor() {
    this.marketEconomy = new MarketEconomy();
    this.data = this.loadState() ?? {
      season: 1,
      week: 1,
      credits: 1000,
      storedVolume: 0,
      councilShares: 0,
      region: 'spring_winds',
      stars: 0,
      activeCloudBand: null,
      wonBands: [],
      inventory: {
        frost: 0,
        skywater: 0,
        storm: 0,
      },
      upgrades: {
        condenserLevel: 1,
        pipeLevel: 1,
        tankLevel: 1,
        droneLevel: 1,
      },
    };
  }

  public static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  public getData(): Readonly<GameStateData> {
    return this.data;
  }

  public getMarketEconomy(): MarketEconomy {
    return this.marketEconomy;
  }

  public getInventory(): Readonly<InventoryState> {
    return this.data.inventory;
  }

  public getUpgrades(): Readonly<UpgradeState> {
    return this.data.upgrades;
  }

  public getTotalStored(): number {
    return this.data.inventory.frost + this.data.inventory.skywater + this.data.inventory.storm;
  }

  public getMaxStorageCapacity(): number {
    return LogisticsNet.getTankCapacity(this.data.upgrades.tankLevel);
  }

  /**
   * Adds harvested resource into storage tanks up to current max capacity.
   * Returns actual amount stored.
   */
  public addResource(resource: ResourceType, amount: number): number {
    if (amount <= 0) return 0;
    const currentTotal = this.getTotalStored();
    const maxCapacity = this.getMaxStorageCapacity();
    const available = Math.max(0, maxCapacity - currentTotal);
    const toAdd = Math.min(amount, available);

    if (toAdd > 0) {
      this.data.inventory[resource] += toAdd;
      this.data.storedVolume = this.getTotalStored();
      this.saveState();
    }
    return toAdd;
  }

  /**
   * Applies continuous weekly evaporation (2% per week) to all stored resources
   */
  public applyEvaporation(): void {
    this.data.inventory.frost = this.marketEconomy.applyEvaporation(this.data.inventory.frost);
    this.data.inventory.skywater = this.marketEconomy.applyEvaporation(this.data.inventory.skywater);
    this.data.inventory.storm = this.marketEconomy.applyEvaporation(this.data.inventory.storm);
    this.data.storedVolume = this.getTotalStored();
    this.saveState();
  }

  /**
   * Sells specified amount of a commodity on the harbor market.
   * If units is omitted, sells entire inventory of that resource.
   */
  public sellResource(resource: ResourceType, units?: number): number {
    const available = this.data.inventory[resource];
    if (available <= 0) return 0;

    const toSell = units === undefined ? available : Math.min(units, available);
    if (toSell <= 0) return 0;

    const earnings = this.marketEconomy.executeSale(resource, toSell);
    this.data.inventory[resource] = Math.max(0, available - toSell);
    this.data.storedVolume = this.getTotalStored();
    this.addCredits(earnings);
    return earnings;
  }

  /**
   * Sells all stored inventory across all 3 resources
   */
  public sellAll(): { totalEarnings: number; items: Record<ResourceType, { units: number; earnings: number }> } {
    const result = {
      totalEarnings: 0,
      items: {
        frost: { units: this.data.inventory.frost, earnings: 0 },
        skywater: { units: this.data.inventory.skywater, earnings: 0 },
        storm: { units: this.data.inventory.storm, earnings: 0 },
      },
    };

    if (this.data.inventory.frost > 0) {
      result.items.frost.earnings = this.sellResource('frost');
      result.totalEarnings += result.items.frost.earnings;
    }
    if (this.data.inventory.skywater > 0) {
      result.items.skywater.earnings = this.sellResource('skywater');
      result.totalEarnings += result.items.skywater.earnings;
    }
    if (this.data.inventory.storm > 0) {
      result.items.storm.earnings = this.sellResource('storm');
      result.totalEarnings += result.items.storm.earnings;
    }

    return result;
  }

  /**
   * Returns upgrade cost for equipment or null if already maxed
   */
  public getUpgradeCost(type: UpgradeEquipmentType): number | null {
    let nextLevel = 2;
    if (type === 'condenser') nextLevel = this.data.upgrades.condenserLevel + 1;
    if (type === 'pipe') nextLevel = this.data.upgrades.pipeLevel + 1;
    if (type === 'tank') nextLevel = this.data.upgrades.tankLevel + 1;
    if (type === 'drone') nextLevel = this.data.upgrades.droneLevel + 1;

    return LogisticsNet.getUpgradeCost(type, nextLevel);
  }

  /**
   * Purchases equipment upgrade from harbor shop
   */
  public upgradeEquipment(type: UpgradeEquipmentType): boolean {
    const cost = this.getUpgradeCost(type);
    if (cost === null || this.data.credits < cost) return false;

    if (this.deductCredits(cost)) {
      if (type === 'condenser') this.data.upgrades.condenserLevel += 1;
      if (type === 'pipe') this.data.upgrades.pipeLevel += 1;
      if (type === 'tank') this.data.upgrades.tankLevel += 1;
      if (type === 'drone') this.data.upgrades.droneLevel += 1;
      this.saveState();
      return true;
    }
    return false;
  }

  public addCredits(amount: number): void {
    this.data.credits += amount;
    this.saveState();
  }

  public deductCredits(amount: number): boolean {
    if (this.data.credits >= amount) {
      this.data.credits -= amount;
      this.saveState();
      return true;
    }
    return false;
  }

  public setCredits(amount: number): void {
    this.data.credits = Math.max(0, amount);
    this.saveState();
  }

  public setActiveCloudBand(band: CloudBand | null): void {
    this.data.activeCloudBand = band;
    this.saveState();
  }

  public getActiveCloudBand(): CloudBand | null {
    return this.data.activeCloudBand;
  }

  public addWonBand(band: CloudBand): void {
    if (!this.data.wonBands.some((b) => b.id === band.id)) {
      this.data.wonBands.push(band);
      this.saveState();
    }
  }

  public getWonBands(): CloudBand[] {
    return [...this.data.wonBands];
  }

  public resetSeason(startingCredits = 1000): void {
    this.data.week = 1;
    this.data.credits = startingCredits;
    this.data.storedVolume = 0;
    this.data.inventory = { frost: 0, skywater: 0, storm: 0 };
    this.data.upgrades = { condenserLevel: 1, pipeLevel: 1, tankLevel: 1, droneLevel: 1 };
    this.data.activeCloudBand = null;
    this.data.wonBands = [];
    this.marketEconomy.resetRates();
    this.saveState();
  }

  public advanceWeek(): void {
    this.applyEvaporation();
    this.marketEconomy.stepWeeklyRecovery();

    if (this.data.week < 12) {
      this.data.week += 1;
    } else {
      this.data.week = 1;
      this.data.season += 1;
    }
    this.saveState();
  }

  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  private loadState(): GameStateData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Ensure nested structure defaults
        parsed.inventory = parsed.inventory ?? { frost: 0, skywater: 0, storm: 0 };
        parsed.upgrades = parsed.upgrades ?? { condenserLevel: 1, pipeLevel: 1, tankLevel: 1, droneLevel: 1 };
        return parsed;
      }
    } catch {
      // Return null on failure
    }
    return null;
  }
}
