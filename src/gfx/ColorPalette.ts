/**
 * Cloud Harvesters - Neo-Pastell & Monument Valley Color Palette
 * Defined per height zones and UI elements
 */

export interface ZoneColorSet {
  primary: string;
  primaryNum: number;
  secondary: string;
  secondaryNum: number;
  accent: string;
  accentNum: number;
  highlight: string;
  highlightNum: number;
}

export const ColorPalette = {
  // Hochzone (Kristallin, hell, federleicht - Frostkristalle)
  highZone: {
    glacierMist: '#E0F4FF', // Gletscher-Dunst
    glacierMistNum: 0xE0F4FF,
    iceBlue: '#BEE3F8',     // Eisblau
    iceBlueNum: 0xBEE3F8,
    turquoiseCrystal: '#38B2AC', // Türkis-Kristall
    turquoiseCrystalNum: 0x38B2AC,
    frostGlow: '#FFFFFF',   // Frostglanz
    frostGlowNum: 0xFFFFFF,
  },

  // Mittelzone (Ausgeglichen, beruhigend - Skywater)
  midZone: {
    softSky: '#C7D2FE',     // Sanfter Himmel
    softSkyNum: 0xC7D2FE,
    pastelAzure: '#93C5FD', // Pastell-Azur
    pastelAzureNum: 0x93C5FD,
    condensateDrop: '#3B82F6', // Kondensattropfen
    condensateDropNum: 0x3B82F6,
    featherCloud: '#F8FAFC', // Federwolke
    featherCloudNum: 0xF8FAFC,
  },

  // Tiefzone (Geheimnisvoll, dicht, elektrisch - Sturmladung)
  lowZone: {
    twilightViolet: '#4C1D95', // Dämmerungsviolett
    twilightVioletNum: 0x4C1D95,
    stormIndigo: '#5B21B6',    // Sturmindigo
    stormIndigoNum: 0x5B21B6,
    glowGold: '#FBBF24',       // Glimmgold
    glowGoldNum: 0xFBBF24,
    auroraPink: '#F472B6',     // Aurora-Rosa
    auroraPinkNum: 0xF472B6,
  },

  // UI & Hafen (Präzise, warm, lesbar)
  uiHarbor: {
    darkSlate: '#1E293B',    // Dunkler Schiefer
    darkSlateNum: 0x1E293B,
    deepBlack: '#0F172A',    // Tiefschwarz
    deepBlackNum: 0x0F172A,
    brass: '#F59E0B',        // Messing-Beschläge
    brassNum: 0xF59E0B,
    emerald: '#10B981',      // Smaragd-Credits
    emeraldNum: 0x10B981,
  },
} as const;

export type ZoneType = 'high' | 'mid' | 'low';

/**
 * Returns the zone color set for a specific zone type
 */
export function getZoneColors(zone: ZoneType): ZoneColorSet {
  switch (zone) {
    case 'high':
      return {
        primary: ColorPalette.highZone.glacierMist,
        primaryNum: ColorPalette.highZone.glacierMistNum,
        secondary: ColorPalette.highZone.iceBlue,
        secondaryNum: ColorPalette.highZone.iceBlueNum,
        accent: ColorPalette.highZone.turquoiseCrystal,
        accentNum: ColorPalette.highZone.turquoiseCrystalNum,
        highlight: ColorPalette.highZone.frostGlow,
        highlightNum: ColorPalette.highZone.frostGlowNum,
      };
    case 'mid':
      return {
        primary: ColorPalette.midZone.softSky,
        primaryNum: ColorPalette.midZone.softSkyNum,
        secondary: ColorPalette.midZone.pastelAzure,
        secondaryNum: ColorPalette.midZone.pastelAzureNum,
        accent: ColorPalette.midZone.condensateDrop,
        accentNum: ColorPalette.midZone.condensateDropNum,
        highlight: ColorPalette.midZone.featherCloud,
        highlightNum: ColorPalette.midZone.featherCloudNum,
      };
    case 'low':
      return {
        primary: ColorPalette.lowZone.stormIndigo,
        primaryNum: ColorPalette.lowZone.stormIndigoNum,
        secondary: ColorPalette.lowZone.twilightViolet,
        secondaryNum: ColorPalette.lowZone.twilightVioletNum,
        accent: ColorPalette.lowZone.glowGold,
        accentNum: ColorPalette.lowZone.glowGoldNum,
        highlight: ColorPalette.lowZone.auroraPink,
        highlightNum: ColorPalette.lowZone.auroraPinkNum,
      };
  }
}

/**
 * Maps a grid layer index (0 to 11) to its corresponding zone type:
 * Layer 0-3: High Zone
 * Layer 4-7: Mid Zone
 * Layer 8-11: Low Zone
 */
export function getZoneFromLayer(layerY: number): ZoneType {
  if (layerY < 4) return 'high';
  if (layerY < 8) return 'mid';
  return 'low';
}
