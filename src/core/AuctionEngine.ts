import { ZoneType } from '../gfx/ColorPalette';
import { CondensatePocket, GRID_TOP_Y, GRID_BOTTOM_Y, GRID_LAYERS } from './CloudGrid';

export type ScanToolType = 'wind_sensor' | 'echo_drone' | 'spectral_scan';

export interface ScanToolInfo {
  type: ScanToolType;
  cost: number;
  nameKey: string;
  descKey: string;
}

export const SCAN_TOOLS: Record<ScanToolType, ScanToolInfo> = {
  wind_sensor: {
    type: 'wind_sensor',
    cost: 50,
    nameKey: 'auction.scans.windSensor',
    descKey: 'auction.scans.windSensorDesc',
  },
  echo_drone: {
    type: 'echo_drone',
    cost: 150,
    nameKey: 'auction.scans.echoDrone',
    descKey: 'auction.scans.echoDroneDesc',
  },
  spectral_scan: {
    type: 'spectral_scan',
    cost: 400,
    nameKey: 'auction.scans.spectralScan',
    descKey: 'auction.scans.spectralScanDesc',
  },
};

export interface WindForecast {
  week: number;
  direction: 'east' | 'west';
  speed: number;       // drift speed in px/s (15 - 45)
  turbulence: 'calm' | 'moderate' | 'stormy';
}

export interface CloudBandActualData {
  density: number;          // 0.20 to 0.95
  pocketsCount: number;     // 1, 2, or 3
  depthLayer: number;       // 0 to 11
  approximateX: number;     // world X (100 to 440)
  quality: 1 | 2 | 3;       // 1-3 stars
  hasAurora: boolean;       // whether an aurora pocket exists
  pockets: CondensatePocket[];
}

export interface CloudBand {
  id: string;
  name: string;
  zone: ZoneType;
  primaryResource: 'frost' | 'skywater' | 'storm';
  estimatedSize: 'S' | 'M' | 'L';
  baseValue: number;
  weatherForecast: WindForecast[];
  initialHint: string;
  actualData: CloudBandActualData;
  round: 1 | 2 | 3;
  winner: ParticipantId | null;
  winningBid: number | null;
}

export type ParticipantId = 'player' | 'daredevil' | 'calculator' | 'tracker';

export interface Participant {
  id: ParticipantId;
  name: string;
  credits: number;
  avatarKey: string;
  personality: string;
  lastQuote?: string;
}

export interface BidRecord {
  participantId: ParticipantId;
  amount: number;
}

export interface BandRoundResult {
  band: CloudBand;
  bids: BidRecord[];
  winnerId: ParticipantId;
  winningBid: number;
  quote: {
    participantId: ParticipantId;
    quoteKey: string;
  };
}

export interface RoundResult {
  round: 1 | 2 | 3;
  results: BandRoundResult[];
}

export interface TelemetryReading {
  initialHint: string;
  hasWindSensor: boolean;
  densityEstimate?: string;
  densityValue?: number;
  pocketsCount?: number;
  hasEchoDrone: boolean;
  layerDepth?: number;
  approximateX?: number;
  locationHint?: string;
  hasSpectralScan: boolean;
  resourceType?: 'frost' | 'skywater' | 'storm';
  quality?: 1 | 2 | 3;
  hasAurora?: boolean;
}

/**
 * Cloud Harvesters - AuctionEngine
 * Orchestrates 6 procedural cloud bands, 3 sealed bidding rounds (2 bands/round),
 * scan tool acquisitions (Wind Sensor, Echo Drone, Spectral Scan), and three autonomous,
 * non-cheating AI rivals (The Daredevil, The Calculator, The Tracker).
 */
export class AuctionEngine {
  public static readonly INITIAL_CREDITS = 1000;
  public static readonly TOTAL_BANDS = 6;
  public static readonly TOTAL_ROUNDS = 3;

  private cloudBands: CloudBand[] = [];
  private participants: Record<ParticipantId, Participant> = {
    player: {
      id: 'player',
      name: 'Player',
      credits: AuctionEngine.INITIAL_CREDITS,
      avatarKey: 'avatar-player',
      personality: 'Pilot & Fleet Commander',
    },
    daredevil: {
      id: 'daredevil',
      name: 'Der Draufgänger',
      credits: AuctionEngine.INITIAL_CREDITS,
      avatarKey: 'avatar-daredevil',
      personality: 'Aggressive High-Zone Hunter',
    },
    calculator: {
      id: 'calculator',
      name: 'Der Rechner',
      credits: AuctionEngine.INITIAL_CREDITS,
      avatarKey: 'avatar-calculator',
      personality: 'Mathematical Expected-Value Optimizer',
    },
    tracker: {
      id: 'tracker',
      name: 'Die Spürnase',
      credits: AuctionEngine.INITIAL_CREDITS,
      avatarKey: 'avatar-tracker',
      personality: 'Telemetry & Aurora Collector',
    },
  };

  private currentRound: 1 | 2 | 3 = 1;
  private roundHistory: RoundResult[] = [];
  private scansPurchased: Map<string, Set<ScanToolType>> = new Map();

  constructor(startingCredits = AuctionEngine.INITIAL_CREDITS) {
    this.reset(startingCredits);
  }

  /**
   * Resets the entire auction engine with fresh procedural bands and budgets.
   */
  public reset(startingCredits = AuctionEngine.INITIAL_CREDITS): void {
    this.currentRound = 1;
    this.roundHistory = [];
    this.scansPurchased.clear();

    // Reset participants
    const pKeys: ParticipantId[] = ['player', 'daredevil', 'calculator', 'tracker'];
    pKeys.forEach((id) => {
      this.participants[id].credits = startingCredits;
      this.participants[id].lastQuote = undefined;
    });

    this.cloudBands = this.generateProceduralBands();
  }

  public getCurrentRound(): 1 | 2 | 3 {
    return this.currentRound;
  }

  public getBandsForCurrentRound(): CloudBand[] {
    return this.cloudBands.filter((b) => b.round === this.currentRound);
  }

  public getAllBands(): CloudBand[] {
    return [...this.cloudBands];
  }

  public getBand(bandId: string): CloudBand | undefined {
    return this.cloudBands.find((b) => b.id === bandId);
  }

  public getParticipant(id: ParticipantId): Participant {
    return this.participants[id];
  }

  public getAllParticipants(): Participant[] {
    return Object.values(this.participants);
  }

  public hasScan(participantId: ParticipantId, bandId: string, tool: ScanToolType): boolean {
    const key = `${participantId}:${bandId}`;
    return this.scansPurchased.get(key)?.has(tool) ?? false;
  }

  /**
   * Purchases a scan tool for a participant, deducting credits.
   */
  public purchaseScan(
    participantId: ParticipantId,
    bandId: string,
    tool: ScanToolType
  ): { success: boolean; cost: number; error?: string } {
    const participant = this.participants[participantId];
    if (!participant) return { success: false, cost: 0, error: 'Unknown participant' };

    const band = this.getBand(bandId);
    if (!band) return { success: false, cost: 0, error: 'Unknown band' };

    if (this.hasScan(participantId, bandId, tool)) {
      return { success: false, cost: 0, error: 'Already scanned' };
    }

    const toolInfo = SCAN_TOOLS[tool];
    if (participant.credits < toolInfo.cost) {
      return { success: false, cost: toolInfo.cost, error: 'Insufficient credits' };
    }

    participant.credits -= toolInfo.cost;
    const key = `${participantId}:${bandId}`;
    let set = this.scansPurchased.get(key);
    if (!set) {
      set = new Set<ScanToolType>();
      this.scansPurchased.set(key, set);
    }
    set.add(tool);

    return { success: true, cost: toolInfo.cost };
  }

  /**
   * Retrieves the telemetry reading accessible to a participant on a given band.
   * Fair: Only reveals what has actually been unlocked!
   */
  public getScanTelemetry(participantId: ParticipantId, bandId: string): TelemetryReading {
    const band = this.getBand(bandId);
    if (!band) throw new Error(`Band ${bandId} not found`);

    const hasWindSensor = this.hasScan(participantId, bandId, 'wind_sensor');
    const hasEchoDrone = this.hasScan(participantId, bandId, 'echo_drone');
    const hasSpectralScan = this.hasScan(participantId, bandId, 'spectral_scan');

    const reading: TelemetryReading = {
      initialHint: band.initialHint,
      hasWindSensor,
      hasEchoDrone,
      hasSpectralScan,
    };

    if (hasWindSensor) {
      const d = band.actualData.density;
      reading.densityValue = d;
      if (d < 0.35) reading.densityEstimate = 'auction.telemetry.densityLow';
      else if (d < 0.65) reading.densityEstimate = 'auction.telemetry.densityMid';
      else reading.densityEstimate = 'auction.telemetry.densityHigh';
      reading.pocketsCount = band.actualData.pocketsCount;
    }

    if (hasEchoDrone) {
      reading.layerDepth = band.actualData.depthLayer;
      reading.approximateX = band.actualData.approximateX;
      if (band.actualData.approximateX < 200) reading.locationHint = 'auction.telemetry.westFlank';
      else if (band.actualData.approximateX > 340) reading.locationHint = 'auction.telemetry.eastFlank';
      else reading.locationHint = 'auction.telemetry.centerCorridor';
    }

    if (hasSpectralScan) {
      reading.resourceType = band.primaryResource;
      reading.quality = band.actualData.quality;
      reading.hasAurora = band.actualData.hasAurora;
    }

    return reading;
  }

  /**
   * AI Rivals Autonomous Scan Phase:
   * Each AI assesses the round's bands and may purchase scans using its own credits.
   */
  public executeAiScanDecisions(): void {
    const currentBands = this.getBandsForCurrentRound();

    // 1. The Daredevil (Der Draufgänger):
    // Impulsive, rarely buys scans unless credits are very high (> 800) and only Wind Sensor
    const daredevil = this.participants.daredevil;
    currentBands.forEach((band) => {
      if (daredevil.credits >= 800 && Math.random() < 0.15) {
        if (!this.hasScan('daredevil', band.id, 'wind_sensor')) {
          this.purchaseScan('daredevil', band.id, 'wind_sensor');
        }
      }
    });

    // 2. The Calculator (Der Rechner):
    // Buys Wind Sensor (50 CR) or Echo Drone (150 CR) if band has high baseValue (>200) and EV justifies it
    const calculator = this.participants.calculator;
    currentBands.forEach((band) => {
      if (band.baseValue >= 200 && calculator.credits >= 300) {
        if (!this.hasScan('calculator', band.id, 'wind_sensor')) {
          this.purchaseScan('calculator', band.id, 'wind_sensor');
        } else if (calculator.credits >= 500 && !this.hasScan('calculator', band.id, 'echo_drone')) {
          this.purchaseScan('calculator', band.id, 'echo_drone');
        }
      }
    });

    // 3. The Tracker (Die Spürnase):
    // Scan fanatic! Buys Echo Drone or Spectral Scan to search for Aurora pockets and 3-star quality
    const tracker = this.participants.tracker;
    currentBands.forEach((band) => {
      if (tracker.credits >= 600 && !this.hasScan('tracker', band.id, 'spectral_scan')) {
        this.purchaseScan('tracker', band.id, 'spectral_scan');
      } else if (tracker.credits >= 250 && !this.hasScan('tracker', band.id, 'echo_drone')) {
        this.purchaseScan('tracker', band.id, 'echo_drone');
      } else if (tracker.credits >= 100 && !this.hasScan('tracker', band.id, 'wind_sensor')) {
        this.purchaseScan('tracker', band.id, 'wind_sensor');
      }
    });
  }

  /**
   * Computes fair, non-cheating bids for all AI rivals on the current round's bands.
   */
  public calculateAiBids(): Record<ParticipantId, Record<string, number>> {
    const currentBands = this.getBandsForCurrentRound();
    const bids: Record<ParticipantId, Record<string, number>> = {
      player: {},
      daredevil: {},
      calculator: {},
      tracker: {},
    };

    // Calculate Daredevil Bids
    const dCredits = this.participants.daredevil.credits;
    currentBands.forEach((band) => {
      let valuation = band.baseValue;
      if (band.estimatedSize === 'L') valuation *= 1.35;
      else if (band.estimatedSize === 'S') valuation *= 0.85;

      // Aggressive bias for High Zone (Frostkristalle)
      if (band.zone === 'high') {
        valuation *= 1.45;
      } else if (band.zone === 'low') {
        valuation *= 0.8;
      }

      // Daredevil bids 1.1x to 1.35x of valuation on high zone, up to 60% of budget
      let bidAmount = band.zone === 'high' ? Math.round(valuation * 1.25) : Math.round(valuation * 0.75);
      bidAmount = Math.min(bidAmount, Math.floor(dCredits * 0.55));
      bidAmount = Math.max(0, bidAmount);
      bids.daredevil[band.id] = bidAmount;
    });

    // Calculate Calculator Bids
    const cCredits = this.participants.calculator.credits;
    currentBands.forEach((band) => {
      // Calculate Expected Value (EV)
      const telemetry = this.getScanTelemetry('calculator', band.id);

      // Volume estimation
      let estVolume = 140; // Default M
      if (band.estimatedSize === 'S') estVolume = 90;
      if (band.estimatedSize === 'L') estVolume = 220;
      if (telemetry.pocketsCount) {
        estVolume = telemetry.pocketsCount * 70;
      }

      // Unit price expectation
      const unitPrice = band.zone === 'high' ? 25 : band.zone === 'low' ? 18 : 10;
      let estRevenue = estVolume * unitPrice;

      // Quality multiplier
      let qualityFactor = 1.0;
      if (telemetry.quality) {
        qualityFactor = telemetry.quality === 3 ? 1.25 : telemetry.quality === 2 ? 1.0 : 0.8;
      }

      // Weather / Turbulence Risk Penalty
      let riskPenalty = 0;
      band.weatherForecast.forEach((f) => {
        if (f.turbulence === 'stormy') riskPenalty += 0.08;
        if (f.turbulence === 'moderate') riskPenalty += 0.03;
      });

      const netEV = estRevenue * qualityFactor * (1 - riskPenalty);

      // Disciplined bidding ceiling: 40% - 55% of EV, reserving capital for future rounds & council
      let bidAmount = Math.round(netEV * 0.48);
      bidAmount = Math.min(bidAmount, Math.floor(cCredits * 0.45));
      bidAmount = Math.max(0, bidAmount);
      bids.calculator[band.id] = bidAmount;
    });

    // Calculate Tracker Bids
    const tCredits = this.participants.tracker.credits;
    currentBands.forEach((band) => {
      const telemetry = this.getScanTelemetry('tracker', band.id);
      let valuation = band.baseValue;

      // Tracker hunts for Aurora and 3-Star Quality!
      if (telemetry.hasAurora) {
        // Massive +220 valuation premium because 1 Aurora pocket = 1 Council Share!
        valuation += 220;
      }
      if (telemetry.quality === 3) {
        valuation *= 1.4;
      } else if (telemetry.quality === 1 && !telemetry.hasAurora) {
        valuation *= 0.6;
      }

      // If no spectral scan, checks hint
      if (!telemetry.hasSpectralScan) {
        if (band.initialHint.toLowerCase().includes('anomalie') || band.initialHint.toLowerCase().includes('aurora')) {
          valuation *= 1.3;
        }
      }

      let bidAmount = Math.round(valuation * 0.85);
      if (telemetry.hasAurora) {
        bidAmount = Math.min(bidAmount, Math.floor(tCredits * 0.7));
      } else {
        bidAmount = Math.min(bidAmount, Math.floor(tCredits * 0.35));
      }
      bidAmount = Math.max(0, bidAmount);
      bids.tracker[band.id] = bidAmount;
    });

    return bids;
  }

  /**
   * Submits player bids, executes sealed AI bidding, determines winners,
   * deducts winning bid amounts, and advances round.
   */
  public executeRound(playerBids: { bandId: string; amount: number }[]): RoundResult {
    const currentBands = this.getBandsForCurrentRound();
    const player = this.participants.player;

    // Validate player bids
    let totalPlayerBid = 0;
    const playerBidMap: Record<string, number> = {};
    playerBids.forEach((b) => {
      const amount = Math.max(0, Math.floor(b.amount || 0));
      playerBidMap[b.bandId] = amount;
      totalPlayerBid += amount;
    });

    if (totalPlayerBid > player.credits) {
      throw new Error(`Total player bid (${totalPlayerBid} CR) exceeds balance (${player.credits} CR)`);
    }

    // Step 1: Run AI Scan phase
    this.executeAiScanDecisions();

    // Step 2: Compute AI Bids
    const aiBids = this.calculateAiBids();

    // Step 3: Determine winner per band
    const bandResults: BandRoundResult[] = [];

    currentBands.forEach((band) => {
      const pBid = playerBidMap[band.id] || 0;
      const dBid = aiBids.daredevil[band.id] || 0;
      const cBid = aiBids.calculator[band.id] || 0;
      const tBid = aiBids.tracker[band.id] || 0;

      const bids: BidRecord[] = [
        { participantId: 'player', amount: pBid },
        { participantId: 'daredevil', amount: dBid },
        { participantId: 'calculator', amount: cBid },
        { participantId: 'tracker', amount: tBid },
      ];

      // Sort bids descending. Tie breaker: Player first, then participant with highest remaining credits
      bids.sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount;
        if (a.participantId === 'player') return -1;
        if (b.participantId === 'player') return 1;
        return this.participants[b.participantId].credits - this.participants[a.participantId].credits;
      });

      const topBid = bids[0];
      const winnerId = topBid.participantId;
      const winningBid = topBid.amount;

      // Assign winner and deduct cost
      band.winner = winnerId;
      band.winningBid = winningBid;
      this.participants[winnerId].credits -= winningBid;

      // Select contextual situational quote
      const quote = this.generateSituationalQuote(band, winnerId, winningBid);
      this.participants[quote.participantId].lastQuote = quote.quoteKey;

      bandResults.push({
        band,
        bids,
        winnerId,
        winningBid,
        quote,
      });
    });

    const roundResult: RoundResult = {
      round: this.currentRound,
      results: bandResults,
    };
    this.roundHistory.push(roundResult);

    // Advance to next round if available
    if (this.currentRound < 3) {
      this.currentRound = (this.currentRound + 1) as 1 | 2 | 3;
    }

    return roundResult;
  }

  public isAuctionComplete(): boolean {
    return this.roundHistory.length >= 3;
  }

  public getPlayerWonBands(): CloudBand[] {
    return this.cloudBands.filter((b) => b.winner === 'player');
  }

  public getRoundHistory(): RoundResult[] {
    return this.roundHistory;
  }

  public getAuctionSummary(): {
    totalBands: number;
    playerWonCount: number;
    bands: CloudBand[];
  } {
    return {
      totalBands: this.cloudBands.length,
      playerWonCount: this.getPlayerWonBands().length,
      bands: [...this.cloudBands],
    };
  }

  /**
   * Generates a context-aware quote for a rival based on the round outcome.
   */
  private generateSituationalQuote(
    band: CloudBand,
    winnerId: ParticipantId,
    winningBid: number
  ): { participantId: ParticipantId; quoteKey: string } {
    if (winnerId === 'daredevil') {
      if (band.zone === 'high') {
        return { participantId: 'daredevil', quoteKey: 'auction.quotes.daredevilHighWin' };
      }
      return { participantId: 'daredevil', quoteKey: 'auction.quotes.daredevilGeneralWin' };
    }

    if (winnerId === 'calculator') {
      return { participantId: 'calculator', quoteKey: 'auction.quotes.calculatorWin' };
    }

    if (winnerId === 'tracker') {
      if (band.actualData.hasAurora) {
        return { participantId: 'tracker', quoteKey: 'auction.quotes.trackerAuroraWin' };
      }
      return { participantId: 'tracker', quoteKey: 'auction.quotes.trackerWin' };
    }

    // Player won: Determine which rival reacts with disappointment
    if (band.zone === 'high') {
      return { participantId: 'daredevil', quoteKey: 'auction.quotes.daredevilHighLoss' };
    } else if (winningBid > band.baseValue * 1.3) {
      return { participantId: 'calculator', quoteKey: 'auction.quotes.calculatorLoss' };
    } else {
      return { participantId: 'tracker', quoteKey: 'auction.quotes.trackerLoss' };
    }
  }

  /**
   * Generates 6 diverse, balanced procedural cloud bands (2 High, 2 Mid, 2 Low).
   */
  private generateProceduralBands(): CloudBand[] {
    const layerHeight = (GRID_BOTTOM_Y - GRID_TOP_Y) / GRID_LAYERS;

    // Fixed zone distribution across rounds:
    // Round 1: High + Mid
    // Round 2: Low + High
    // Round 3: Mid + Low
    const configs: Array<{
      id: string;
      name: string;
      zone: ZoneType;
      resource: 'frost' | 'skywater' | 'storm';
      size: 'S' | 'M' | 'L';
      baseVal: number;
      round: 1 | 2 | 3;
      hint: string;
      hasAurora: boolean;
      depthLayer: number;
      density: number;
    }> = [
      // Round 1
      {
        id: 'band-1',
        name: 'Gletscher-Zirrus Alpha',
        zone: 'high',
        resource: 'frost',
        size: 'M',
        baseVal: 220,
        round: 1,
        hint: 'auction.hints.highGlacierGlance',
        hasAurora: false,
        depthLayer: 1,
        density: 0.26,
      },
      {
        id: 'band-2',
        name: 'Azur-Stratum Nebelmeer',
        zone: 'mid',
        resource: 'skywater',
        size: 'L',
        baseVal: 180,
        round: 1,
        hint: 'auction.hints.midCalmFlow',
        hasAurora: false,
        depthLayer: 5,
        density: 0.48,
      },
      // Round 2
      {
        id: 'band-3',
        name: 'Donner-Kumulus Vortex',
        zone: 'low',
        resource: 'storm',
        size: 'M',
        baseVal: 200,
        round: 2,
        hint: 'auction.hints.lowStaticHum',
        hasAurora: true, // Aurora opportunity!
        depthLayer: 9,
        density: 0.82,
      },
      {
        id: 'band-4',
        name: 'Silberfrost-Spitze',
        zone: 'high',
        resource: 'frost',
        size: 'S',
        baseVal: 260,
        round: 2,
        hint: 'auction.hints.highThinCrystal',
        hasAurora: false,
        depthLayer: 2,
        density: 0.22,
      },
      // Round 3
      {
        id: 'band-5',
        name: 'Opal-Federwolke West',
        zone: 'mid',
        resource: 'skywater',
        size: 'M',
        baseVal: 160,
        round: 3,
        hint: 'auction.hints.midSoftReservoir',
        hasAurora: false,
        depthLayer: 6,
        density: 0.52,
      },
      {
        id: 'band-6',
        name: 'Sturm-Amboss Titan',
        zone: 'low',
        resource: 'storm',
        size: 'L',
        baseVal: 240,
        round: 3,
        hint: 'auction.hints.lowDenseSurge',
        hasAurora: false,
        depthLayer: 10,
        density: 0.90,
      },
    ];

    return configs.map((cfg, idx) => {
      // 4-Week wind forecast
      const forecast: WindForecast[] = [
        { week: 1, direction: idx % 2 === 0 ? 'east' : 'west', speed: 25 + (idx * 5) % 20, turbulence: 'calm' },
        { week: 2, direction: idx % 2 === 0 ? 'east' : 'west', speed: 30 + (idx * 4) % 15, turbulence: 'moderate' },
        { week: 3, direction: idx % 2 === 0 ? 'west' : 'east', speed: 20 + (idx * 3) % 25, turbulence: cfg.zone === 'low' ? 'stormy' : 'moderate' },
        { week: 4, direction: idx % 2 === 0 ? 'west' : 'east', speed: 35 + (idx * 6) % 15, turbulence: 'calm' },
      ];

      // Pocket generation matching CloudGrid interface
      const pocketsCount = cfg.size === 'S' ? 1 : cfg.size === 'M' ? 2 : 3;
      const pockets: CondensatePocket[] = [];

      const quality: 1 | 2 | 3 = idx === 0 || idx === 3 ? 3 : idx === 2 ? 2 : 1;

      for (let p = 0; p < pocketsCount; p++) {
        const pocketX = 140 + p * 120 + ((idx * 37) % 60);
        const pocketY = GRID_TOP_Y + (cfg.depthLayer + 0.5) * layerHeight;
        const capacity = cfg.size === 'S' ? 85 : cfg.size === 'M' ? 130 : 210;

        pockets.push({
          id: `pocket-${cfg.id}-${p + 1}`,
          name: `${cfg.name} - Tasche ${p + 1}`,
          zone: cfg.zone,
          resourceType: cfg.resource,
          baseX: pocketX,
          baseY: pocketY,
          x: pocketX,
          y: pocketY,
          radius: 26 + p * 4,
          maxCapacity: capacity,
          currentVolume: capacity,
          isDepleted: false,
          valuePerUnit: (cfg.hasAurora && p === 0) ? 75 : cfg.zone === 'high' ? 10 : cfg.zone === 'mid' ? 22 : 40,
          isAurora: cfg.hasAurora && p === 0,
          hasAwardedAurora: false,
          discoveryState: 'concealed',
          quality,
          sizeCategory: cfg.size,
        });
      }

      return {
        id: cfg.id,
        name: cfg.name,
        zone: cfg.zone,
        primaryResource: cfg.resource,
        estimatedSize: cfg.size,
        baseValue: cfg.baseVal,
        weatherForecast: forecast,
        initialHint: cfg.hint,
        actualData: {
          density: cfg.density,
          pocketsCount,
          depthLayer: cfg.depthLayer,
          approximateX: pockets[0].baseX,
          quality,
          hasAurora: cfg.hasAurora,
          pockets,
        },
        round: cfg.round,
        winner: null,
        winningBid: null,
      };
    });
  }

  /**
   * Generates a freshly replenished procedural cloud band for week advance / replenishment.
   */
  public static createReplenishedBand(week: number, _season: number = 1): CloudBand {
    const layerHeight = (GRID_BOTTOM_Y - GRID_TOP_Y) / GRID_LAYERS;
    const bandId = `band-week-${week}-${Date.now()}`;
    const nameIndex = (week - 1) % 4;
    const bandNames = [
      'Aether-Nimbus Stratum',
      'Kristall-Zirrus Wanderer',
      'Cumulus Vitalis',
      'Aurora-Boreal Drifter',
    ];
    const name = `${bandNames[nameIndex]} (Woche ${week})`;

    const pockets: CondensatePocket[] = [
      {
        id: `pocket-replenish-${week}-1`,
        name: `${name} - Frostader`,
        zone: 'high',
        resourceType: 'frost',
        baseX: 160 + ((week * 43) % 90),
        baseY: GRID_TOP_Y + 1.5 * layerHeight,
        x: 160 + ((week * 43) % 90),
        y: GRID_TOP_Y + 1.5 * layerHeight,
        radius: 28,
        maxCapacity: 120 + week * 5,
        currentVolume: 120 + week * 5,
        isDepleted: false,
        valuePerUnit: 10,
        discoveryState: 'concealed',
        quality: (((week % 3) + 1) as 1 | 2 | 3),
        sizeCategory: 'M',
      },
      {
        id: `pocket-replenish-${week}-2`,
        name: `${name} - Himmelssee`,
        zone: 'mid',
        resourceType: 'skywater',
        baseX: 320 + ((week * 29) % 80),
        baseY: GRID_TOP_Y + 5.5 * layerHeight,
        x: 320 + ((week * 29) % 80),
        y: GRID_TOP_Y + 5.5 * layerHeight,
        radius: 32,
        maxCapacity: 150 + week * 5,
        currentVolume: 150 + week * 5,
        isDepleted: false,
        valuePerUnit: 22,
        discoveryState: 'concealed',
        quality: 2,
        sizeCategory: 'L',
      },
      {
        id: `pocket-replenish-${week}-3`,
        name: `${name} - Sturmkristall`,
        zone: 'low',
        resourceType: 'storm',
        baseX: 240 + ((week * 67) % 110),
        baseY: GRID_TOP_Y + 9.5 * layerHeight,
        x: 240 + ((week * 67) % 110),
        y: GRID_TOP_Y + 9.5 * layerHeight,
        radius: 34,
        maxCapacity: 170 + week * 5,
        currentVolume: 170 + week * 5,
        isDepleted: false,
        valuePerUnit: 40,
        discoveryState: 'concealed',
        quality: 3,
        sizeCategory: 'M',
      },
    ];

    const forecast: WindForecast[] = [
      { week, direction: week % 2 === 0 ? 'east' : 'west', speed: 28, turbulence: 'calm' },
    ];

    return {
      id: bandId,
      name,
      zone: week % 2 === 0 ? 'high' : 'mid',
      primaryResource: week % 2 === 0 ? 'frost' : 'skywater',
      estimatedSize: 'L',
      baseValue: 200 + week * 10,
      weatherForecast: forecast,
      initialHint: 'auction.hints.midCalmFlow',
      actualData: {
        density: 0.5,
        pocketsCount: 3,
        depthLayer: 5,
        approximateX: 270,
        quality: 2,
        hasAurora: week % 4 === 0,
        pockets,
      },
      round: 1,
      winner: 'player',
      winningBid: 0,
    };
  }
}
