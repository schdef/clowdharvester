/**
 * Cloud Harvesters - GameState
 * Central state container for the 12-week season progression, credits, and persistence.
 */

import { CloudBand } from './AuctionEngine';

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
}

const STORAGE_KEY = 'cloud_harvesters_gamestate_v1';

export class GameState {
  private static instance: GameState;
  private data: GameStateData;

  private constructor() {
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
    this.data.activeCloudBand = null;
    this.data.wonBands = [];
    this.saveState();
  }

  public advanceWeek(): void {
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
      if (raw) return JSON.parse(raw);
    } catch {
      // Return null on failure
    }
    return null;
  }
}
