import { ZoneType } from '../gfx/ColorPalette';

/**
 * Cloud Harvesters - ProbePhysics
 * Models drag friction, elastic cable tension, and turbulence wobble.
 */

export interface ProbeState {
  x: number;
  y: number;
  targetY: number;
  velocity: number;
  isDocked: boolean;
  dockedPocketId: string | null;
  currentZone: ZoneType;
  dragForce: number;
}

export class ProbePhysics {
  public static calculateBrakingForce(baseFriction: number, layerDensity: number, isMatchingHead: boolean): number {
    const headMultiplier = isMatchingHead ? 1.0 : 2.0; // 50% speed penalty if wrong drill head
    return baseFriction * layerDensity * headMultiplier;
  }
}
