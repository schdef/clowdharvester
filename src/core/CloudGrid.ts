import { ZoneType, getZoneFromLayer } from '../gfx/ColorPalette';

/**
 * Cloud Harvesters - CloudGrid Core Simulation
 * 24 horizontal columns x 12 vertical layers
 * Layer 0-3: High Zone (Frostkristalle)
 * Layer 4-7: Mid Zone (Skywater)
 * Layer 8-11: Low Zone (Sturmladung)
 */

export const GRID_COLUMNS = 24;
export const GRID_LAYERS = 12;

export interface CloudCell {
  x: number;
  y: number;
  zone: ZoneType;
  density: number;      // 0.0 to 1.0 (resistance to drilling)
  hasPocket: boolean;   // Whether this cell contains a condensate pocket
  resourceType: 'frost' | 'skywater' | 'storm' | 'none';
  amount: number;       // Resource volume
}

export class CloudGrid {
  public readonly columns = GRID_COLUMNS;
  public readonly layers = GRID_LAYERS;
  private cells: CloudCell[][] = [];

  constructor() {
    this.initGrid();
  }

  private initGrid(): void {
    this.cells = [];
    for (let y = 0; y < this.layers; y++) {
      const row: CloudCell[] = [];
      const zone = getZoneFromLayer(y);

      for (let x = 0; x < this.columns; x++) {
        row.push({
          x,
          y,
          zone,
          density: 0.2 + (y / this.layers) * 0.6,
          hasPocket: false,
          resourceType: 'none',
          amount: 0,
        });
      }
      this.cells.push(row);
    }
  }

  public getCell(x: number, y: number): CloudCell | null {
    if (x < 0 || x >= this.columns || y < 0 || y >= this.layers) {
      return null;
    }
    return this.cells[y][x];
  }

  public getZoneForLayer(y: number): ZoneType {
    return getZoneFromLayer(y);
  }
}
