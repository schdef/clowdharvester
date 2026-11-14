/**
 * Cloud Harvesters - CouncilEngine Core Simulation
 * Sealed-bid auction system for 30 Sky-Council shares in Weeks 4, 8, and 12.
 * Rivals:
 * 1. The Daredevil (Der Draufgänger) - Aggressive bids in Week 4
 * 2. The Calculator (Der Rechner) - Expected value optimizer, hoards credits for W8/12
 * 3. The Tracker (Die Spürnase) - Focuses on rare Aurora pockets (+1 council share)
 */

export type RivalType = 'daredevil' | 'calculator' | 'tracker';

export interface BidderProfile {
  id: string;
  name: string;
  type: 'player' | RivalType;
  credits: number;
  sharesWon: number;
}

export class CouncilEngine {
  public static readonly TOTAL_SHARES = 30;
  public static readonly SESSIONS = [4, 8, 12] as const;

  private bidders: BidderProfile[] = [
    { id: 'player', name: 'Player', type: 'player', credits: 250, sharesWon: 0 },
    { id: 'daredevil', name: 'Der Draufgänger', type: 'daredevil', credits: 200, sharesWon: 0 },
    { id: 'calculator', name: 'Der Rechner', type: 'calculator', credits: 350, sharesWon: 0 },
    { id: 'tracker', name: 'Die Spürnase', type: 'tracker', credits: 220, sharesWon: 0 },
  ];

  public getBidders(): BidderProfile[] {
    return this.bidders;
  }

  public isCouncilWeek(week: number): boolean {
    return (CouncilEngine.SESSIONS as readonly number[]).includes(week);
  }
}
