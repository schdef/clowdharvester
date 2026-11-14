/**
 * Cloud Harvesters - CouncilEngine Core Simulation
 * Sealed-bid auction system for 30 Sky-Council shares across Weeks 4, 8, and 12 (10 shares per session).
 * Rivals:
 * 1. The Daredevil (Der Draufgänger) - Aggressive bids in Week 4, early dominance strategy
 * 2. The Calculator (Der Rechner) - Expected value optimizer, hoards credits for massive strikes in Weeks 8 & 12
 * 3. The Tracker (Die Spürnase) - Focuses on rare Aurora pockets (+1 council share) and situative tactical bids
 */

export type RivalType = 'daredevil' | 'calculator' | 'tracker';

export interface BidderProfile {
  id: string;
  name: string;
  type: 'player' | RivalType;
  credits: number;
  sharesWon: number;
  auroraShares: number;
  avatarKey: string;
}

export interface CouncilBidSubmission {
  participantId: string;
  bidPerShare: number;
  requestedShares: number;
}

export interface CouncilBidResult {
  participantId: string;
  name: string;
  type: 'player' | RivalType;
  bidPerShare: number;
  requestedShares: number;
  sharesWon: number;
  totalCost: number;
}

export interface CouncilRankingEntry {
  rank: number;
  participantId: string;
  name: string;
  type: 'player' | RivalType;
  sharesWon: number;
  auroraShares: number;
  totalShares: number;
  credits: number;
  stars: number;
}

export interface CouncilSessionResult {
  week: number;
  sessionNumber: 1 | 2 | 3;
  sharesAvailable: number;
  sharesDistributed: number;
  bids: CouncilBidResult[];
  rankings: CouncilRankingEntry[];
}

export type CampaignRegion = 'spring_winds' | 'summer_drifts' | 'storm_season';

export class CouncilEngine {
  public static readonly SESSIONS = [4, 8, 12] as const;
  public static readonly SHARES_PER_SESSION = 10;
  public static readonly TOTAL_SHARES = 30;

  private bidders: Map<string, BidderProfile> = new Map();
  private sessionHistory: CouncilSessionResult[] = [];
  private completedSessions: Set<number> = new Set();

  constructor(playerStartingCredits = 1000) {
    this.initBidders(playerStartingCredits);
  }

  public initBidders(playerCredits = 1000): void {
    this.bidders.clear();
    this.bidders.set('player', {
      id: 'player',
      name: 'Player',
      type: 'player',
      credits: playerCredits,
      sharesWon: 0,
      auroraShares: 0,
      avatarKey: 'avatar-player',
    });
    this.bidders.set('daredevil', {
      id: 'daredevil',
      name: 'Der Draufgänger',
      type: 'daredevil',
      credits: 1000,
      sharesWon: 0,
      auroraShares: 0,
      avatarKey: 'avatar-daredevil',
    });
    this.bidders.set('calculator', {
      id: 'calculator',
      name: 'Der Rechner',
      type: 'calculator',
      credits: 1000,
      sharesWon: 0,
      auroraShares: 0,
      avatarKey: 'avatar-calculator',
    });
    this.bidders.set('tracker', {
      id: 'tracker',
      name: 'Die Spürnase',
      type: 'tracker',
      credits: 1000,
      sharesWon: 0,
      auroraShares: 0,
      avatarKey: 'avatar-tracker',
    });
    this.sessionHistory = [];
    this.completedSessions.clear();
  }

  public getBidder(id: string): BidderProfile | undefined {
    return this.bidders.get(id);
  }

  public getAllBidders(): BidderProfile[] {
    return Array.from(this.bidders.values());
  }

  /**
   * Returns participants relevant for given campaign region:
   * - spring_winds: 1 rival (daredevil)
   * - summer_drifts: 2 rivals (daredevil, calculator)
   * - storm_season: 3 rivals (daredevil, calculator, tracker)
   */
  public getActiveBidders(region: CampaignRegion = 'spring_winds'): BidderProfile[] {
    const activeIds: string[] = ['player'];
    if (region === 'spring_winds') {
      activeIds.push('daredevil');
    } else if (region === 'summer_drifts') {
      activeIds.push('daredevil', 'calculator');
    } else {
      activeIds.push('daredevil', 'calculator', 'tracker');
    }
    return activeIds.map((id) => this.bidders.get(id)!).filter(Boolean);
  }

  public isCouncilWeek(week: number): boolean {
    return (CouncilEngine.SESSIONS as readonly number[]).includes(week);
  }

  public getSessionNumber(week: number): 1 | 2 | 3 | null {
    if (week === 4) return 1;
    if (week === 8) return 2;
    if (week === 12) return 3;
    return null;
  }

  public isSessionCompleted(week: number): boolean {
    return this.completedSessions.has(week);
  }

  public setPlayerCredits(credits: number): void {
    const player = this.bidders.get('player');
    if (player) player.credits = credits;
  }

  /**
   * Adds Aurora discovery bonus share (+1 council share)
   */
  public awardAuroraShare(participantId = 'player', count = 1): void {
    const b = this.bidders.get(participantId);
    if (b) {
      b.auroraShares += count;
    }
  }

  /**
   * Weekly passive earnings for rivals from automated field operations
   */
  public stepRivalsWeeklyIncome(): void {
    const daredevil = this.bidders.get('daredevil');
    const calculator = this.bidders.get('calculator');
    const tracker = this.bidders.get('tracker');

    if (daredevil) daredevil.credits += 45;   // Inefficient due to neglecting maintenance
    if (calculator) calculator.credits += 95; // Highly optimized extraction algorithms
    if (tracker) tracker.credits += 65;       // Medium efficiency + anomaly discovery
  }

  /**
   * Generates AI bid for an active rival according to their distinct personality and week
   */
  public generateRivalBid(rivalId: RivalType, week: number, availableShares = 10): CouncilBidSubmission {
    const rival = this.bidders.get(rivalId);
    if (!rival || rival.credits <= 0) {
      return { participantId: rivalId, bidPerShare: 0, requestedShares: 0 };
    }

    const sessionNum = this.getSessionNumber(week) ?? 1;
    let targetSpendRatio = 0.4;
    let targetPricePerShare = 25;
    let requestedShares = Math.min(availableShares, 5);

    if (rivalId === 'daredevil') {
      // 1. Der Draufgänger: Aggressive in Week 4, high early bids
      if (sessionNum === 1) {
        targetSpendRatio = 0.75;
        targetPricePerShare = 38 + Math.floor(Math.random() * 8); // 38-45 CR
        requestedShares = Math.min(availableShares, 7 + Math.floor(Math.random() * 4)); // 7-10 shares
      } else if (sessionNum === 2) {
        targetSpendRatio = 0.45;
        targetPricePerShare = 26 + Math.floor(Math.random() * 6); // 26-31 CR
        requestedShares = Math.min(availableShares, 4 + Math.floor(Math.random() * 3));
      } else {
        targetSpendRatio = 0.50;
        targetPricePerShare = 20 + Math.floor(Math.random() * 6);
        requestedShares = Math.min(availableShares, 3 + Math.floor(Math.random() * 3));
      }
    } else if (rivalId === 'calculator') {
      // 2. Der Rechner: Conservative EV in Week 4, saves credits, strikes massively in Week 8 & 12
      if (sessionNum === 1) {
        targetSpendRatio = 0.22;
        targetPricePerShare = 20 + Math.floor(Math.random() * 4); // 20-23 CR
        requestedShares = Math.min(availableShares, 3 + Math.floor(Math.random() * 2)); // 3-4 shares
      } else if (sessionNum === 2) {
        targetSpendRatio = 0.60;
        targetPricePerShare = 36 + Math.floor(Math.random() * 8); // 36-43 CR
        requestedShares = Math.min(availableShares, 5 + Math.floor(Math.random() * 3));
      } else {
        // Week 12: Final blitz!
        targetSpendRatio = 0.90;
        targetPricePerShare = 52 + Math.floor(Math.random() * 12); // 52-63 CR
        requestedShares = Math.min(availableShares, 7 + Math.floor(Math.random() * 4));
      }
    } else if (rivalId === 'tracker') {
      // 3. Die Spürnase: Hunts Aurora bonuses, tactical situative bids
      const bonusAdvantage = rival.auroraShares;
      if (sessionNum === 1) {
        targetSpendRatio = 0.45;
        targetPricePerShare = 28 + Math.floor(Math.random() * 5);
        requestedShares = Math.min(availableShares, 4 + Math.floor(Math.random() * 3));
      } else if (sessionNum === 2) {
        targetSpendRatio = bonusAdvantage > 0 ? 0.40 : 0.55;
        targetPricePerShare = 30 + Math.floor(Math.random() * 6);
        requestedShares = Math.min(availableShares, 4 + Math.floor(Math.random() * 3));
      } else {
        targetSpendRatio = 0.70;
        targetPricePerShare = 36 + Math.floor(Math.random() * 8);
        requestedShares = Math.min(availableShares, 5 + Math.floor(Math.random() * 4));
      }
    }

    // Budget constraints validation
    const maxBudget = Math.floor(rival.credits * targetSpendRatio);
    let bidPrice = Math.max(1, targetPricePerShare);
    let shares = Math.min(requestedShares, availableShares);

    if (bidPrice * shares > maxBudget) {
      // Adjust shares or price within budget
      shares = Math.max(1, Math.floor(maxBudget / bidPrice));
      if (shares <= 0) {
        bidPrice = Math.max(1, Math.min(maxBudget, 15));
        shares = Math.min(availableShares, Math.max(1, Math.floor(rival.credits / bidPrice)));
      }
    }

    // Hard clamp to current credits
    if (bidPrice * shares > rival.credits) {
      shares = Math.max(0, Math.floor(rival.credits / bidPrice));
    }

    return {
      participantId: rivalId,
      bidPerShare: bidPrice,
      requestedShares: shares,
    };
  }

  /**
   * Executes a sealed-bid Council session in week 4, 8, or 12.
   * Exactly 10 shares are auctioned.
   * Sealed bids are ranked by bidPerShare descending.
   * Winners receive shares up to their requested amount, paying their bid per share won.
   */
  public executeSession(
    week: number,
    playerBid: { bidPerShare: number; requestedShares: number },
    region: CampaignRegion = 'spring_winds'
  ): CouncilSessionResult {
    const sessionNum = this.getSessionNumber(week);
    if (!sessionNum) {
      throw new Error(`Week ${week} is not a valid Council session week (must be 4, 8, or 12).`);
    }

    const availableShares = CouncilEngine.SHARES_PER_SESSION;
    const activeBidders = this.getActiveBidders(region);

    // Collect all bids
    const bidsSubmitted: CouncilBidSubmission[] = [];

    // Player Bid (validated against player balance)
    const player = this.bidders.get('player')!;
    const sanitizedPlayerBidPrice = Math.max(0, Math.floor(playerBid.bidPerShare));
    let sanitizedPlayerShares = Math.max(0, Math.min(availableShares, Math.floor(playerBid.requestedShares)));

    if (sanitizedPlayerBidPrice > 0 && sanitizedPlayerShares > 0) {
      const totalRequestedCost = sanitizedPlayerBidPrice * sanitizedPlayerShares;
      if (totalRequestedCost > player.credits) {
        sanitizedPlayerShares = Math.floor(player.credits / sanitizedPlayerBidPrice);
      }
    } else {
      sanitizedPlayerShares = 0;
    }

    bidsSubmitted.push({
      participantId: 'player',
      bidPerShare: sanitizedPlayerBidPrice,
      requestedShares: sanitizedPlayerShares,
    });

    // AI Rivals Bids
    for (const b of activeBidders) {
      if (b.type !== 'player') {
        const rivalBid = this.generateRivalBid(b.type, week, availableShares);
        bidsSubmitted.push(rivalBid);
      }
    }

    // Sort bids descending by bidPerShare
    // Tie-breaker: Highest remaining credits, then participantId
    const sortedBids = [...bidsSubmitted].sort((a, b) => {
      if (b.bidPerShare !== a.bidPerShare) {
        return b.bidPerShare - a.bidPerShare;
      }
      const creditsA = this.bidders.get(a.participantId)?.credits ?? 0;
      const creditsB = this.bidders.get(b.participantId)?.credits ?? 0;
      if (creditsB !== creditsA) {
        return creditsB - creditsA;
      }
      return a.participantId.localeCompare(b.participantId);
    });

    // Allocate the 10 shares
    let remainingShares = availableShares;
    const bidResultsMap = new Map<string, CouncilBidResult>();

    // Initialize results map
    for (const sub of bidsSubmitted) {
      const bidder = this.bidders.get(sub.participantId)!;
      bidResultsMap.set(sub.participantId, {
        participantId: sub.participantId,
        name: bidder.name,
        type: bidder.type,
        bidPerShare: sub.bidPerShare,
        requestedShares: sub.requestedShares,
        sharesWon: 0,
        totalCost: 0,
      });
    }

    for (const bid of sortedBids) {
      if (remainingShares <= 0) break;
      if (bid.bidPerShare <= 0 || bid.requestedShares <= 0) continue;

      const bidder = this.bidders.get(bid.participantId)!;
      const affordableShares = Math.floor(bidder.credits / bid.bidPerShare);
      const wanted = Math.min(bid.requestedShares, remainingShares, affordableShares);

      if (wanted > 0) {
        const cost = wanted * bid.bidPerShare;
        bidder.sharesWon += wanted;
        bidder.credits = Math.max(0, bidder.credits - cost);
        remainingShares -= wanted;

        const res = bidResultsMap.get(bid.participantId)!;
        res.sharesWon = wanted;
        res.totalCost = cost;
      }
    }

    const sharesDistributed = availableShares - remainingShares;
    const rankings = this.calculateRankings(region);

    const sessionResult: CouncilSessionResult = {
      week,
      sessionNumber: sessionNum,
      sharesAvailable: availableShares,
      sharesDistributed,
      bids: Array.from(bidResultsMap.values()),
      rankings,
    };

    this.sessionHistory.push(sessionResult);
    this.completedSessions.add(week);

    return sessionResult;
  }

  /**
   * Calculates standings and rankings.
   * Primary metric: totalShares (sharesWon + auroraShares) descending.
   * Tie-breaker: credits descending.
   * Stars:
   * Rank 1: 3 Stars ⭐⭐⭐
   * Rank 2: 2 Stars ⭐⭐
   * Rank 3: 1 Star ⭐
   * Rank 4: 0 Stars
   */
  public calculateRankings(region: CampaignRegion = 'spring_winds'): CouncilRankingEntry[] {
    const activeBidders = this.getActiveBidders(region);

    const entries: CouncilRankingEntry[] = activeBidders.map((b) => {
      const totalShares = b.sharesWon + b.auroraShares;
      return {
        rank: 1,
        participantId: b.id,
        name: b.name,
        type: b.type,
        sharesWon: b.sharesWon,
        auroraShares: b.auroraShares,
        totalShares,
        credits: b.credits,
        stars: 0,
      };
    });

    // Sort: totalShares DESC, then credits DESC, then name
    entries.sort((a, b) => {
      if (b.totalShares !== a.totalShares) {
        return b.totalShares - a.totalShares;
      }
      if (b.credits !== a.credits) {
        return b.credits - a.credits;
      }
      return a.participantId.localeCompare(b.participantId);
    });

    // Assign rank numbers and star awards
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
      if (entry.rank === 1) {
        entry.stars = 3;
      } else if (entry.rank === 2) {
        entry.stars = 2;
      } else if (entry.rank === 3) {
        entry.stars = 1;
      } else {
        entry.stars = 0;
      }
    });

    return entries;
  }

  public getSessionHistory(): CouncilSessionResult[] {
    return [...this.sessionHistory];
  }

  public getTotalSeasonSharesDistributed(): number {
    return this.sessionHistory.reduce((sum, s) => sum + s.sharesDistributed, 0);
  }
}
