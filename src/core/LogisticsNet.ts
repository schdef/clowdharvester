/**
 * Cloud Harvesters - LogisticsNet Core Simulation
 * Models condensers, pipe networks, tank balloons, and throughput bottlenecks.
 * Bottleneck formula: Actual Flow = min(Condenser Rate, Pipe Capacity)
 */

export type PipeStatus = 'active' | 'full' | 'blocked' | 'idle';

export type UpgradeEquipmentType = 'condenser' | 'pipe' | 'tank' | 'drone';

export interface PipeNode {
  id: string;
  x: number;
  y: number;
  capacity: number; // units / sec
  currentFlow: number;
  isBlocked: boolean;
}

export interface TankBalloon {
  id: string;
  x: number;
  y: number;
  capacity: number;
  storedAmount: number;
  resourceType: 'frost' | 'skywater' | 'storm' | 'none';
}

export const CONDENSER_RATES: Record<number, number> = {
  1: 6,
  2: 12,
  3: 24,
};

export const PIPE_CAPACITIES: Record<number, number> = {
  1: 10,
  2: 20,
  3: 40,
};

export const TANK_CAPACITIES: Record<number, number> = {
  1: 40,
  2: 80,
  3: 160,
};

export const UPGRADE_COSTS: Record<UpgradeEquipmentType, Record<number, number>> = {
  condenser: { 2: 200, 3: 450 },
  pipe: { 2: 150, 3: 350 },
  tank: { 2: 100, 3: 250 },
  drone: { 2: 300 },
};

export class LogisticsNet {
  private pipes: PipeNode[] = [];
  private tanks: TankBalloon[] = [];
  private isBlocked = false;

  /**
   * Returns condenser collection rate based on equipment level (Stufe 1: 6, Stufe 2: 12, Stufe 3: 24 E/s)
   */
  public static getCondenserRate(level: number): number {
    return CONDENSER_RATES[level] ?? CONDENSER_RATES[1];
  }

  /**
   * Returns pipe throughput capacity based on equipment level (Stufe 1: 10, Stufe 2: 20, Stufe 3: 40 E/s)
   */
  public static getPipeCapacity(level: number): number {
    return PIPE_CAPACITIES[level] ?? PIPE_CAPACITIES[1];
  }

  /**
   * Returns storage balloon capacity based on equipment level (Stufe 1: 40, Stufe 2: 80, Stufe 3: 160 units)
   */
  public static getTankCapacity(level: number): number {
    return TANK_CAPACITIES[level] ?? TANK_CAPACITIES[1];
  }

  /**
   * Returns upgrade cost for equipment to reach the target level, or null if already maxed
   */
  public static getUpgradeCost(type: UpgradeEquipmentType, targetLevel: number): number | null {
    const table = UPGRADE_COSTS[type];
    return table[targetLevel] ?? null;
  }

  /**
   * Engpass-Formel (Bottleneck formula):
   * Tatsächliche Förderrate = min(kondensatorRate, rohrKapazitaet)
   */
  public calculateEffectiveFlow(condenserRate: number, pipeCapacity: number): number {
    if (this.isBlocked) return 0;
    return Math.min(condenserRate, pipeCapacity);
  }

  /**
   * Determines current status for visual cues:
   * - 'blocked': Warning triangle & dashed line
   * - 'full': Solid line with lock symbol
   * - 'active': Flowing dot particles
   * - 'idle': Subtle standby line
   */
  public getNetworkStatus(isExtracting: boolean, isFull: boolean): PipeStatus {
    if (this.isBlocked) return 'blocked';
    if (isFull) return 'full';
    if (isExtracting) return 'active';
    return 'idle';
  }

  public setBlocked(blocked: boolean): void {
    this.isBlocked = blocked;
  }

  public isNetworkBlocked(): boolean {
    return this.isBlocked;
  }

  public addTank(tank: TankBalloon): void {
    this.tanks.push(tank);
  }

  public getTanks(): TankBalloon[] {
    return this.tanks;
  }

  public addPipe(pipe: PipeNode): void {
    this.pipes.push(pipe);
  }

  public getPipes(): PipeNode[] {
    return this.pipes;
  }
}
