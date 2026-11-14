/**
 * Cloud Harvesters - LogisticsNet Core Simulation
 * Models condensers, pipe networks, tank balloons, and throughput bottlenecks.
 * Bottleneck formula: Actual Flow = min(Condenser Rate, Pipe Capacity)
 */

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

export class LogisticsNet {
  private pipes: PipeNode[] = [];
  private tanks: TankBalloon[] = [];

  public calculateEffectiveFlow(condenserRate: number, pipeCapacity: number): number {
    return Math.min(condenserRate, pipeCapacity);
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
