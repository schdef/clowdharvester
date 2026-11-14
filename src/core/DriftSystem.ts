import { ZoneType } from '../gfx/ColorPalette';

/**
 * Cloud Harvesters - DriftSystem
 * Implements the 4-week pendulum drift cycle:
 * High Zone: 3 cols/week (East)
 * Mid Zone: 2 cols/week (West)
 * Low Zone: 1 col/week (East)
 */

export interface DriftVector {
  speedColsPerWeek: number;
  direction: 'east' | 'west';
}

export class DriftSystem {
  public static getDriftVector(zone: ZoneType): DriftVector {
    switch (zone) {
      case 'high':
        return { speedColsPerWeek: 3, direction: 'east' };
      case 'mid':
        return { speedColsPerWeek: 2, direction: 'west' };
      case 'low':
        return { speedColsPerWeek: 1, direction: 'east' };
    }
  }

  /**
   * Calculates the pendulum offset (columns) for a given zone and week (1-12)
   * The cycle returns to 0 every 4 weeks.
   */
  public static getPendulumOffset(zone: ZoneType, week: number): number {
    const phase = ((week - 1) % 4); // 0, 1, 2, 3
    const vector = this.getDriftVector(zone);
    const sign = vector.direction === 'east' ? 1 : -1;

    // Harmonic pendulum pattern: 0 -> 1 -> 2 -> 1 -> 0
    let step = phase;
    if (phase === 3) step = 1;

    return sign * step * vector.speedColsPerWeek;
  }
}
