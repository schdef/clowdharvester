/**
 * Cloud Harvesters - GameState
 * Central state container for the 12-week season progression, credits, and persistence.
 */

export interface GameStateData {
  season: number;
  week: number;
  credits: number;
  storedVolume: number;
  councilShares: number;
  region: 'spring_winds' | 'summer_drifts' | 'storm_season';
  stars: number;
}

const STORAGE_KEY = 'cloud_harvesters_gamestate_v1';

export class GameState {
  private static instance: GameState;
  private data: GameStateData;

  private constructor() {
    this.data = this.loadState() ?? {
      season: 1,
      week: 1,
      credits: 250,
      storedVolume: 0,
      councilShares: 0,
      region: 'spring_winds',
      stars: 0,
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
