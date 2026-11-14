import { ZoneType, getZoneFromLayer } from '../gfx/ColorPalette';
import { DriftSystem } from './DriftSystem';

/**
 * Cloud Harvesters - CloudGrid Core Simulation
 * 24 horizontal columns x 12 vertical layers
 * Layer 0-3: High Zone (Frostkristalle)
 * Layer 4-7: Mid Zone (Skywater)
 * Layer 8-11: Low Zone (Sturmladung)
 */

export const GRID_COLUMNS = 24;
export const GRID_LAYERS = 12;
export const WORLD_WIDTH = 540;
export const WORLD_HEIGHT = 960;
export const GRID_TOP_Y = 120;
export const GRID_BOTTOM_Y = 880;
export const CHANNEL_HEAL_DURATION_SEC = 60.0; // 60 seconds = 1 game week

export interface CloudCell {
  x: number;            // Column 0..23
  y: number;            // Layer 0..11
  worldX: number;       // Center X in pixels
  worldY: number;       // Center Y in pixels
  zone: ZoneType;
  baseDensity: number;  // 0.0 to 1.0 (inherent cloud density)
  carveFactor: number;  // 1.0 = fully open cut, 0.0 = healed solid cloud
  carveTimer: number;   // Remaining seconds until fully healed
}

export interface CondensatePocket {
  id: string;
  name: string;
  zone: ZoneType;
  resourceType: 'frost' | 'skywater' | 'storm';
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  radius: number;
  maxCapacity: number;
  currentVolume: number;
  isDepleted: boolean;
  valuePerUnit: number;
}

export class CloudGrid {
  public readonly columns = GRID_COLUMNS;
  public readonly layers = GRID_LAYERS;
  private cells: CloudCell[][] = [];
  private pockets: CondensatePocket[] = [];

  constructor() {
    this.initGrid();
    this.initPockets();
  }

  private initGrid(): void {
    this.cells = [];
    const colWidth = WORLD_WIDTH / this.columns;
    const layerHeight = (GRID_BOTTOM_Y - GRID_TOP_Y) / this.layers;

    for (let y = 0; y < this.layers; y++) {
      const row: CloudCell[] = [];
      const zone = getZoneFromLayer(y);

      // Zone base densities: High: ~0.25, Mid: ~0.50, Low: ~0.85
      let density = 0.25;
      if (zone === 'high') {
        density = 0.2 + (y / 4) * 0.12; // 0.20 to 0.32
      } else if (zone === 'mid') {
        density = 0.45 + ((y - 4) / 4) * 0.15; // 0.45 to 0.60
      } else {
        density = 0.75 + ((y - 8) / 4) * 0.2; // 0.75 to 0.95
      }

      for (let x = 0; x < this.columns; x++) {
        row.push({
          x,
          y,
          worldX: (x + 0.5) * colWidth,
          worldY: GRID_TOP_Y + (y + 0.5) * layerHeight,
          zone,
          baseDensity: density,
          carveFactor: 0.0,
          carveTimer: 0.0,
        });
      }
      this.cells.push(row);
    }
  }

  private initPockets(): void {
    this.pockets = [
      {
        id: 'pocket-high-1',
        name: 'Frostkristall-Grotte',
        zone: 'high',
        resourceType: 'frost',
        baseX: 180,
        baseY: 240,
        x: 180,
        y: 240,
        radius: 28,
        maxCapacity: 100,
        currentVolume: 100,
        isDepleted: false,
        valuePerUnit: 25,
      },
      {
        id: 'pocket-mid-1',
        name: 'Skywater-Reservoir',
        zone: 'mid',
        resourceType: 'skywater',
        baseX: 350,
        baseY: 510,
        x: 350,
        y: 510,
        radius: 34,
        maxCapacity: 120,
        currentVolume: 120,
        isDepleted: false,
        valuePerUnit: 10,
      },
      {
        id: 'pocket-low-1',
        name: 'Sturmladungs-Kondensat',
        zone: 'low',
        resourceType: 'storm',
        baseX: 230,
        baseY: 760,
        x: 230,
        y: 760,
        radius: 30,
        maxCapacity: 90,
        currentVolume: 90,
        isDepleted: false,
        valuePerUnit: 18,
      },
    ];
  }

  public getCell(col: number, row: number): CloudCell | null {
    if (col < 0 || col >= this.columns || row < 0 || row >= this.layers) {
      return null;
    }
    return this.cells[row][col];
  }

  public getCellAtWorldPos(worldX: number, worldY: number): CloudCell | null {
    if (worldY < GRID_TOP_Y || worldY > GRID_BOTTOM_Y || worldX < 0 || worldX > WORLD_WIDTH) {
      return null;
    }
    const colWidth = WORLD_WIDTH / this.columns;
    const layerHeight = (GRID_BOTTOM_Y - GRID_TOP_Y) / this.layers;
    const col = Math.floor(worldX / colWidth);
    const row = Math.floor((worldY - GRID_TOP_Y) / layerHeight);
    return this.getCell(col, row);
  }

  public getZoneForLayer(y: number): ZoneType {
    return getZoneFromLayer(y);
  }

  public getZoneAtWorldY(worldY: number): ZoneType {
    if (worldY < 380) return 'high';
    if (worldY < 650) return 'mid';
    return 'low';
  }

  public getPockets(): CondensatePocket[] {
    return this.pockets;
  }

  public getPocketById(id: string): CondensatePocket | null {
    return this.pockets.find((p) => p.id === id) ?? null;
  }

  /**
   * Returns effective density at world coordinates, factoring in carved channel state.
   */
  public getEffectiveDensityAt(worldX: number, worldY: number): number {
    const cell = this.getCellAtWorldPos(worldX, worldY);
    if (!cell) {
      // Above top grid layer, no resistance
      if (worldY < GRID_TOP_Y) return 0.05;
      return 0.8;
    }
    return cell.baseDensity * Math.max(0, 1.0 - cell.carveFactor);
  }

  /**
   * Checks if a point is within an already opened carved channel.
   */
  public isCarvedAt(worldX: number, worldY: number): boolean {
    const cell = this.getCellAtWorldPos(worldX, worldY);
    if (!cell) return worldY < GRID_TOP_Y;
    return cell.carveFactor > 0.35;
  }

  /**
   * Carves the cloud field at (worldX, worldY) with given radius.
   * Returns true if fresh cloud was carved, false if already open channel.
   */
  public carveAt(worldX: number, worldY: number, radius = 22): boolean {
    let freshCarved = false;
    const colWidth = WORLD_WIDTH / this.columns;
    const layerHeight = (GRID_BOTTOM_Y - GRID_TOP_Y) / this.layers;

    const minCol = Math.max(0, Math.floor((worldX - radius) / colWidth));
    const maxCol = Math.min(this.columns - 1, Math.floor((worldX + radius) / colWidth));
    const minRow = Math.max(0, Math.floor((worldY - radius - GRID_TOP_Y) / layerHeight));
    const maxRow = Math.min(this.layers - 1, Math.floor((worldY + radius - GRID_TOP_Y) / layerHeight));

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cell = this.cells[r][c];
        const dx = cell.worldX - worldX;
        const dy = cell.worldY - worldY;
        if (dx * dx + dy * dy <= radius * radius) {
          if (cell.carveFactor < 0.35) {
            freshCarved = true;
          }
          cell.carveFactor = 1.0;
          cell.carveTimer = CHANNEL_HEAL_DURATION_SEC;
        }
      }
    }
    return freshCarved;
  }

  /**
   * Update channel healing over time and update pocket drift positions.
   * dt: delta time in seconds.
   */
  public update(dt: number, week: number, weekProgress: number): void {
    // 1. Channel healing (gradually closes over 60 seconds)
    for (let r = 0; r < this.layers; r++) {
      for (let c = 0; c < this.columns; c++) {
        const cell = this.cells[r][c];
        if (cell.carveTimer > 0) {
          cell.carveTimer = Math.max(0, cell.carveTimer - dt);
          cell.carveFactor = cell.carveTimer / CHANNEL_HEAL_DURATION_SEC;
        }
      }
    }

    // 2. Drift Condensate Pockets along with their zone's pendulum drift
    const colWidth = WORLD_WIDTH / this.columns;
    this.pockets.forEach((p) => {
      const vector = DriftSystem.getDriftVector(p.zone);
      const pendulumOffset = DriftSystem.getPendulumOffset(p.zone, week);
      const sign = vector.direction === 'east' ? 1 : -1;
      const smoothDrift = pendulumOffset + sign * vector.speedColsPerWeek * weekProgress;

      // Wrap-around coordinate inside playable screen margin
      let targetX = p.baseX + smoothDrift * colWidth;
      const margin = 40;
      const span = WORLD_WIDTH - margin * 2;
      targetX = margin + ((((targetX - margin) % span) + span) % span);

      p.x = targetX;
    });
  }

  /**
   * Extract resource from a pocket. Returns actual amount extracted.
   */
  public extractFromPocket(pocketId: string, rateUnitsPerSec: number, dt: number): number {
    const pocket = this.getPocketById(pocketId);
    if (!pocket || pocket.isDepleted) return 0;

    const requested = rateUnitsPerSec * dt;
    const actual = Math.min(requested, pocket.currentVolume);
    pocket.currentVolume = Math.max(0, pocket.currentVolume - actual);

    if (pocket.currentVolume <= 0.01) {
      pocket.isDepleted = true;
      pocket.currentVolume = 0;
    }
    return actual;
  }

  /**
   * Finds nearest pocket to a point (for Windfühler sonar).
   */
  public findNearestPocket(worldX: number, worldY: number): { pocket: CondensatePocket; distance: number } | null {
    let nearest: CondensatePocket | null = null;
    let minDistance = Infinity;

    for (const p of this.pockets) {
      if (p.isDepleted) continue;
      const dx = p.x - worldX;
      const dy = p.y - worldY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDistance) {
        minDistance = d;
        nearest = p;
      }
    }

    if (!nearest) return null;
    return { pocket: nearest, distance: minDistance };
  }
}
