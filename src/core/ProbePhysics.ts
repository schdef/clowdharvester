import { ZoneType } from '../gfx/ColorPalette';
import { CondensatePocket } from './CloudGrid';

/**
 * Cloud Harvesters - ProbePhysics
 * Models drag friction, elastic cable tension, catenary curvature, and turbulence wobble.
 */

export type DrillHeadType = 'ice' | 'fog' | 'charge';

export interface ProbeState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
  activeHead: DrillHeadType;
  currentZone: ZoneType;
  isDrilling: boolean;
  isCarvedChannel: boolean;
  isDocked: boolean;
  dockedPocket: CondensatePocket | null;
  effectiveSpeed: number;
  cableTension: number;
}

export class ProbePhysics {
  /**
   * Checks whether the given drill head matches the target height zone.
   * - Eisbohrer ('ice') matches Hochzone ('high')
   * - Nebelfänger ('fog') matches Mittelzone ('mid')
   * - Ladungsspitze ('charge') matches Tiefzone ('low')
   */
  public static isMatchingHead(head: DrillHeadType, zone: ZoneType): boolean {
    switch (zone) {
      case 'high':
        return head === 'ice';
      case 'mid':
        return head === 'fog';
      case 'low':
        return head === 'charge';
    }
  }

  /**
   * Calculates the advance drilling velocity (pixels per second) based on
   * layer density, tool match, and whether an open channel exists.
   */
  public static calculateAdvanceSpeed(
    baseDensity: number,
    isMatching: boolean,
    isCarvedChannel: boolean
  ): number {
    if (isCarvedChannel) {
      // Gliding freely in an open channel has no cloud friction
      return 380;
    }

    // Base speed by density:
    // High Zone (density ~0.25): ~180 px/s
    // Mid Zone (density ~0.50):  ~120 px/s
    // Low Zone (density ~0.85):  ~70 px/s
    const baseSpeed = 220 / (1.0 + baseDensity * 2.2);

    // 50% penalty if the drill head does not match the zone!
    return isMatching ? baseSpeed : baseSpeed * 0.5;
  }

  /**
   * Calculates dynamic catenary sag and turbulence wobble for the braided cable.
   */
  public static calculateCableCurve(
    platformX: number,
    platformY: number,
    probeX: number,
    probeY: number,
    timeElapsed: number,
    zone: ZoneType
  ): { startX: number; startY: number; controlX: number; controlY: number; endX: number; endY: number } {
    const depth = Math.max(0, probeY - platformY);
    const depthRatio = Math.min(1.0, depth / 700);

    // Turbulence amplitude increases with depth & storminess in Low zone
    let turbulenceAmp = 2.5;
    if (zone === 'mid') turbulenceAmp = 4.0;
    if (zone === 'low') turbulenceAmp = 6.5;

    const wobbleX = Math.sin(timeElapsed * 3.5 + depth * 0.015) * turbulenceAmp;
    const wobbleY = Math.cos(timeElapsed * 2.8 + depth * 0.01) * (turbulenceAmp * 0.5);

    // Catenary sag pulls slightly downward-center
    const sagY = Math.sin(depthRatio * Math.PI * 0.8) * 16 + wobbleY;
    const midX = (platformX + probeX) / 2 + wobbleX;
    const midY = (platformY + probeY) / 2 + sagY;

    return {
      startX: platformX,
      startY: platformY,
      controlX: midX,
      controlY: midY,
      endX: probeX,
      endY: probeY,
    };
  }
}
