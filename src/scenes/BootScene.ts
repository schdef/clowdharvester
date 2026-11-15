import Phaser from 'phaser';
import { ColorPalette } from '../gfx/ColorPalette';
import { generateCloudTexture } from '../gfx/CloudShader';
import { GameState } from '../core/GameState';
import { CloudBand, WindForecast } from '../core/AuctionEngine';
import { CondensatePocket, GRID_TOP_Y, GRID_BOTTOM_Y, GRID_LAYERS } from '../core/CloudGrid';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Loading Screen Background
    const bg = this.add.graphics();
    bg.fillStyle(ColorPalette.uiHarbor.deepBlackNum, 1);
    bg.fillRect(0, 0, width, height);

    // Title Text
    this.add.text(width / 2, height * 0.42, 'CLOUD HARVESTERS', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: ColorPalette.highZone.glacierMist,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.47, 'Neo-Pastell Sky Logistics', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: ColorPalette.midZone.pastelAzure,
    }).setOrigin(0.5);

    // Progress Bar Container
    const progressBox = this.add.graphics();
    progressBox.fillStyle(ColorPalette.uiHarbor.darkSlateNum, 0.8);
    progressBox.fillRoundedRect(width * 0.2, height * 0.54, width * 0.6, 12, 6);

    const progressBar = this.add.graphics();

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(ColorPalette.uiHarbor.brassNum, 1);
      progressBar.fillRoundedRect(width * 0.2 + 2, height * 0.54 + 2, (width * 0.6 - 4) * value, 8, 4);
    });

    // Generate procedural game textures
    this.generateProceduralAssets();
  }

  public create(): void {
    // Fade out and transition directly to SkyHarvestScene with starter cloud band
    this.cameras.main.fadeOut(400, 15, 23, 42);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      let activeBand = GameState.getInstance().getActiveCloudBand();
      if (!activeBand) {
        activeBand = this.createStarterCloudBand();
        GameState.getInstance().setActiveCloudBand(activeBand);
      }
      this.scene.start('SkyHarvestScene', { cloudBand: activeBand });
    });
  }

  private createStarterCloudBand(): CloudBand {
    const layerHeight = (GRID_BOTTOM_Y - GRID_TOP_Y) / GRID_LAYERS;
    const pockets: CondensatePocket[] = [
      {
        id: 'pocket-starter-1',
        name: 'Stratum Nimbus I - Frosttasche',
        zone: 'high',
        resourceType: 'frost',
        baseX: 180,
        baseY: GRID_TOP_Y + (1 + 0.5) * layerHeight,
        x: 180,
        y: GRID_TOP_Y + (1 + 0.5) * layerHeight,
        radius: 28,
        maxCapacity: 120,
        currentVolume: 120,
        isDepleted: false,
        valuePerUnit: 10,
        discoveryState: 'concealed',
        quality: 2,
        sizeCategory: 'M',
      },
      {
        id: 'pocket-starter-2',
        name: 'Stratum Nimbus I - Skywater-Quelle',
        zone: 'mid',
        resourceType: 'skywater',
        baseX: 360,
        baseY: GRID_TOP_Y + (5 + 0.5) * layerHeight,
        x: 360,
        y: GRID_TOP_Y + (5 + 0.5) * layerHeight,
        radius: 32,
        maxCapacity: 150,
        currentVolume: 150,
        isDepleted: false,
        valuePerUnit: 22,
        discoveryState: 'concealed',
        quality: 1,
        sizeCategory: 'L',
      },
      {
        id: 'pocket-starter-3',
        name: 'Stratum Nimbus I - Gewitterkern',
        zone: 'low',
        resourceType: 'storm',
        baseX: 270,
        baseY: GRID_TOP_Y + (9 + 0.5) * layerHeight,
        x: 270,
        y: GRID_TOP_Y + (9 + 0.5) * layerHeight,
        radius: 34,
        maxCapacity: 180,
        currentVolume: 180,
        isDepleted: false,
        valuePerUnit: 40,
        discoveryState: 'concealed',
        quality: 3,
        sizeCategory: 'S',
      },
    ];

    const forecast: WindForecast[] = [
      { week: 1, direction: 'east', speed: 25, turbulence: 'calm' },
      { week: 2, direction: 'east', speed: 30, turbulence: 'moderate' },
      { week: 3, direction: 'west', speed: 20, turbulence: 'calm' },
      { week: 4, direction: 'west', speed: 35, turbulence: 'calm' },
    ];

    return {
      id: 'band-starter-0',
      name: 'Stratum Nimbus I',
      zone: 'mid',
      primaryResource: 'skywater',
      estimatedSize: 'M',
      baseValue: 180,
      weatherForecast: forecast,
      initialHint: 'auction.hints.midCalmFlow',
      actualData: {
        density: 0.45,
        pocketsCount: 3,
        depthLayer: 5,
        approximateX: 270,
        quality: 2,
        hasAurora: false,
        pockets,
      },
      round: 1,
      winner: 'player',
      winningBid: 0,
    };
  }

  private generateProceduralAssets(): void {
    // 1. High Zone Cloud Texture
    generateCloudTexture(
      this,
      'cloud-high',
      240,
      100,
      ColorPalette.highZone.iceBlueNum,
      ColorPalette.highZone.glacierMistNum
    );

    // 2. Mid Zone Cloud Texture
    generateCloudTexture(
      this,
      'cloud-mid',
      260,
      110,
      ColorPalette.midZone.pastelAzureNum,
      ColorPalette.midZone.softSkyNum
    );

    // 3. Low Zone Cloud Texture
    generateCloudTexture(
      this,
      'cloud-low',
      280,
      120,
      ColorPalette.lowZone.twilightVioletNum,
      ColorPalette.lowZone.stormIndigoNum
    );

    // 4. Suspended Platform Texture
    if (!this.textures.exists('platform')) {
      const pCanvas = this.textures.createCanvas('platform', 180, 48);
      if (pCanvas) {
        const ctx = pCanvas.getContext();
        // Brass / Dark Slate Platform Hull
        ctx.fillStyle = ColorPalette.uiHarbor.darkSlate;
        ctx.beginPath();
        ctx.roundRect(10, 16, 160, 24, 6);
        ctx.fill();

        // Brass Top Beam
        ctx.fillStyle = ColorPalette.uiHarbor.brass;
        ctx.beginPath();
        ctx.roundRect(16, 10, 148, 8, 3);
        ctx.fill();

        // Mechanical Pulley / Winch in center
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.arc(90, 28, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ColorPalette.uiHarbor.brass;
        ctx.beginPath();
        ctx.arc(90, 28, 4, 0, Math.PI * 2);
        ctx.fill();

        // Suspension Cables extending upwards
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(30, 16);
        ctx.moveTo(150, 0);
        ctx.lineTo(150, 16);
        ctx.stroke();

        pCanvas.refresh();
      }
    }

    // 5. Drill Probe Head Textures (Nebelfänger, Eisbohrer, Ladungsspitze)
    // 5a. Eisbohrer ('probe-head-ice') - Diamond crystal sharp tip
    if (!this.textures.exists('probe-head-ice')) {
      const pCanvas = this.textures.createCanvas('probe-head-ice', 40, 52);
      if (pCanvas) {
        const ctx = pCanvas.getContext();
        // Brass / Dark Slate Housing
        ctx.fillStyle = ColorPalette.uiHarbor.darkSlate;
        ctx.beginPath();
        ctx.roundRect(10, 6, 20, 14, 4);
        ctx.fill();
        ctx.strokeStyle = ColorPalette.uiHarbor.brass;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crystalline Ice Drill Diamond
        ctx.fillStyle = ColorPalette.highZone.iceBlue;
        ctx.beginPath();
        ctx.moveTo(20, 48); // Sharp crystal point
        ctx.lineTo(34, 18);
        ctx.lineTo(20, 10);
        ctx.lineTo(6, 18);
        ctx.closePath();
        ctx.fill();

        // Crystal facet highlights
        ctx.strokeStyle = ColorPalette.highZone.turquoiseCrystal;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(20, 10);
        ctx.lineTo(20, 48);
        ctx.moveTo(6, 18);
        ctx.lineTo(20, 26);
        ctx.lineTo(34, 18);
        ctx.stroke();

        // Glowing cyan core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(20, 24, 3, 0, Math.PI * 2);
        ctx.fill();

        pCanvas.refresh();
      }
    }

    // 5b. Nebelfänger ('probe-head-fog') - Scoop / Vortex Mesh Intake
    if (!this.textures.exists('probe-head-fog')) {
      const pCanvas = this.textures.createCanvas('probe-head-fog', 40, 52);
      if (pCanvas) {
        const ctx = pCanvas.getContext();
        // Brass Housing
        ctx.fillStyle = ColorPalette.uiHarbor.darkSlate;
        ctx.beginPath();
        ctx.roundRect(10, 6, 20, 14, 4);
        ctx.fill();
        ctx.strokeStyle = ColorPalette.uiHarbor.brass;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Aerodynamic Scoop Cone
        ctx.fillStyle = ColorPalette.midZone.pastelAzure;
        ctx.beginPath();
        ctx.moveTo(20, 46);
        ctx.quadraticCurveTo(34, 30, 32, 18);
        ctx.lineTo(8, 18);
        ctx.quadraticCurveTo(6, 30, 20, 46);
        ctx.fill();

        // Vortex intake rings
        ctx.strokeStyle = ColorPalette.midZone.condensateDrop;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(20, 24, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(20, 34, 5, 0, Math.PI * 2);
        ctx.stroke();

        // Azure core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(20, 24, 3, 0, Math.PI * 2);
        ctx.fill();

        pCanvas.refresh();
      }
    }

    // 5c. Ladungsspitze ('probe-head-charge') - Electric Prong Needle
    if (!this.textures.exists('probe-head-charge')) {
      const pCanvas = this.textures.createCanvas('probe-head-charge', 40, 52);
      if (pCanvas) {
        const ctx = pCanvas.getContext();
        // Dark Violet Housing
        ctx.fillStyle = ColorPalette.lowZone.twilightViolet;
        ctx.beginPath();
        ctx.roundRect(10, 6, 20, 14, 4);
        ctx.fill();
        ctx.strokeStyle = ColorPalette.uiHarbor.brass;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Forked needle spikes
        ctx.fillStyle = ColorPalette.lowZone.glowGold;
        ctx.beginPath();
        ctx.moveTo(14, 18);
        ctx.lineTo(12, 48);
        ctx.lineTo(17, 30);
        ctx.lineTo(20, 50); // Center longest needle
        ctx.lineTo(23, 30);
        ctx.lineTo(28, 48);
        ctx.lineTo(26, 18);
        ctx.closePath();
        ctx.fill();

        // Golden spark sensor
        ctx.fillStyle = ColorPalette.lowZone.auroraPink;
        ctx.beginPath();
        ctx.arc(20, 22, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(20, 22, 2.5, 0, Math.PI * 2);
        ctx.fill();

        pCanvas.refresh();
      }
    }

    // Default probe head alias
    if (!this.textures.exists('probe-head')) {
      // Alias to probe-head-fog
      const pCanvas = this.textures.createCanvas('probe-head', 40, 52);
      if (pCanvas) {
        const ctx = pCanvas.getContext();
        ctx.fillStyle = ColorPalette.uiHarbor.brass;
        ctx.beginPath();
        ctx.moveTo(20, 46);
        ctx.lineTo(34, 18);
        ctx.lineTo(20, 6);
        ctx.lineTo(6, 18);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = ColorPalette.highZone.turquoiseCrystal;
        ctx.beginPath();
        ctx.arc(20, 22, 5, 0, Math.PI * 2);
        ctx.fill();
        pCanvas.refresh();
      }
    }

    // 6. Condensate Droplet / Sparkle particles
    if (!this.textures.exists('particle-drop')) {
      const partCanvas = this.textures.createCanvas('particle-drop', 16, 16);
      if (partCanvas) {
        const ctx = partCanvas.getContext();
        ctx.fillStyle = ColorPalette.midZone.condensateDrop;
        ctx.beginPath();
        ctx.arc(8, 8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(6, 6, 2, 0, Math.PI * 2);
        ctx.fill();
        partCanvas.refresh();
      }
    }

    // 7. Gold spark particle
    if (!this.textures.exists('particle-spark')) {
      const sparkCanvas = this.textures.createCanvas('particle-spark', 16, 16);
      if (sparkCanvas) {
        const ctx = sparkCanvas.getContext();
        ctx.fillStyle = ColorPalette.lowZone.glowGold;
        ctx.beginPath();
        ctx.arc(8, 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(8, 8, 2, 0, Math.PI * 2);
        ctx.fill();
        sparkCanvas.refresh();
      }
    }

    // 8. Neo-Pastell AI Rival & Player Avatars
    this.generateAvatars();
  }

  private generateAvatars(): void {
    // 8a. Der Draufgänger ('avatar-daredevil') - Coral & Brass Aviator
    if (!this.textures.exists('avatar-daredevil')) {
      const canvas = this.textures.createCanvas('avatar-daredevil', 72, 72);
      if (canvas) {
        const ctx = canvas.getContext();
        // Background Circle
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(36, 36, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#F87171'; // Coral Red border
        ctx.lineWidth = 3;
        ctx.stroke();

        // Aviator Cap / Helmet
        ctx.fillStyle = '#991B1B';
        ctx.beginPath();
        ctx.arc(36, 32, 22, Math.PI, 0, false);
        ctx.fill();

        // Goggles
        ctx.fillStyle = '#F59E0B'; // Brass
        ctx.beginPath();
        ctx.arc(27, 30, 8, 0, Math.PI * 2);
        ctx.arc(45, 30, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#67E8F9'; // Cyan lenses
        ctx.beginPath();
        ctx.arc(27, 30, 5, 0, Math.PI * 2);
        ctx.arc(45, 30, 5, 0, Math.PI * 2);
        ctx.fill();

        // Face & Cocky Smirk
        ctx.fillStyle = '#FDE68A';
        ctx.beginPath();
        ctx.arc(36, 42, 14, 0, Math.PI);
        ctx.fill();

        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(38, 44, 6, 0.2, Math.PI * 0.85);
        ctx.stroke();

        canvas.refresh();
      }
    }

    // 8b. Der Rechner ('avatar-calculator') - Azure Geometric Monocle
    if (!this.textures.exists('avatar-calculator')) {
      const canvas = this.textures.createCanvas('avatar-calculator', 72, 72);
      if (canvas) {
        const ctx = canvas.getContext();
        // Background Circle
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(36, 36, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38BDF8'; // Azure Cyan border
        ctx.lineWidth = 3;
        ctx.stroke();

        // Sleek Head & Hair
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(36, 30, 20, Math.PI, 0, false);
        ctx.fill();

        // Face
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.arc(36, 38, 15, 0, Math.PI);
        ctx.fill();

        // Monocle / HUD Visor on Right Eye
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 2.5;
        ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.beginPath();
        ctx.arc(44, 34, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Analytical Eyes & Straight stoic mouth
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(28, 34, 2, 0, Math.PI * 2);
        ctx.arc(44, 34, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(31, 46);
        ctx.lineTo(41, 46);
        ctx.stroke();

        canvas.refresh();
      }
    }

    // 8c. Die Spürnase ('avatar-tracker') - Violet & Aurora Radar Sensor
    if (!this.textures.exists('avatar-tracker')) {
      const canvas = this.textures.createCanvas('avatar-tracker', 72, 72);
      if (canvas) {
        const ctx = canvas.getContext();
        // Background Circle
        ctx.fillStyle = '#1E1B4B';
        ctx.beginPath();
        ctx.arc(36, 36, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#F472B6'; // Aurora Pink border
        ctx.lineWidth = 3;
        ctx.stroke();

        // Sensor Antenna / Crest
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(36, 14);
        ctx.lineTo(36, 6);
        ctx.arc(36, 5, 3, 0, Math.PI * 2);
        ctx.stroke();

        // Hood & Head
        ctx.fillStyle = '#5B21B6';
        ctx.beginPath();
        ctx.arc(36, 32, 21, Math.PI, 0, false);
        ctx.fill();

        // Face
        ctx.fillStyle = '#FED7AA';
        ctx.beginPath();
        ctx.arc(36, 38, 14, 0, Math.PI);
        ctx.fill();

        // Sensor Visor / Goggles
        ctx.fillStyle = '#F472B6';
        ctx.beginPath();
        ctx.roundRect(22, 28, 28, 10, 4);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(28, 33, 2.5, 0, Math.PI * 2);
        ctx.arc(44, 33, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Inquisitive Smile
        ctx.strokeStyle = '#9333EA';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(36, 43, 4, 0.1, Math.PI * 0.9);
        ctx.stroke();

        canvas.refresh();
      }
    }

    // 8d. Player ('avatar-player') - Navigator Brass Cap
    if (!this.textures.exists('avatar-player')) {
      const canvas = this.textures.createCanvas('avatar-player', 72, 72);
      if (canvas) {
        const ctx = canvas.getContext();
        // Background Circle
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(36, 36, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#F59E0B'; // Brass border
        ctx.lineWidth = 3;
        ctx.stroke();

        // Captain Visor
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(36, 30, 20, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.roundRect(20, 27, 32, 6, 2);
        ctx.fill();

        // Face
        ctx.fillStyle = '#FDE68A';
        ctx.beginPath();
        ctx.arc(36, 38, 14, 0, Math.PI);
        ctx.fill();

        // Determined Eyes & Mouth
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(30, 35, 2, 0, Math.PI * 2);
        ctx.arc(42, 35, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(36, 44, 5, 0.1, Math.PI * 0.9);
        ctx.stroke();

        canvas.refresh();
      }
    }

    // 8e. Balo 🎈 ('avatar-balo') - Cheerful Weather Balloon Advisor
    if (!this.textures.exists('avatar-balo')) {
      const canvas = this.textures.createCanvas('avatar-balo', 72, 72);
      if (canvas) {
        const ctx = canvas.getContext();
        // Warm peach balloon circle
        ctx.fillStyle = '#FB923C';
        ctx.beginPath();
        ctx.arc(36, 36, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FDBA74';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Goggles
        ctx.fillStyle = '#78350F';
        ctx.fillRect(10, 20, 52, 4);
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(26, 22, 8, 0, Math.PI * 2);
        ctx.arc(46, 22, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(26, 22, 5, 0, Math.PI * 2);
        ctx.arc(46, 22, 5, 0, Math.PI * 2);
        ctx.fill();

        // Big kawaii eyes
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(28, 40, 3.5, 0, Math.PI * 2);
        ctx.arc(44, 40, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(27, 39, 1.5, 0, Math.PI * 2);
        ctx.arc(43, 39, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Rosy cheeks
        ctx.fillStyle = '#FDA4AF';
        ctx.beginPath();
        ctx.arc(20, 46, 4, 0, Math.PI * 2);
        ctx.arc(52, 46, 4, 0, Math.PI * 2);
        ctx.fill();

        // Happy smile
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(36, 45, 5, 0.1, Math.PI * 0.9);
        ctx.stroke();

        canvas.refresh();
      }
    }
  }
}
