import Phaser from 'phaser';
import { ColorPalette } from '../gfx/ColorPalette';
import { generateCloudTexture } from '../gfx/CloudShader';

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
    // Fade out and transition smoothly to SkyHarvestScene
    this.cameras.main.fadeOut(400, 15, 23, 42);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('SkyHarvestScene');
    });
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
  }
}
