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

    // 5. Drill Probe Head Texture
    if (!this.textures.exists('probe-head')) {
      const probeCanvas = this.textures.createCanvas('probe-head', 36, 48);
      if (probeCanvas) {
        const ctx = probeCanvas.getContext();
        // Probe cone diamond
        ctx.fillStyle = ColorPalette.uiHarbor.brass;
        ctx.beginPath();
        ctx.moveTo(18, 44);
        ctx.lineTo(32, 18);
        ctx.lineTo(18, 6);
        ctx.lineTo(4, 18);
        ctx.closePath();
        ctx.fill();

        // Center jewel / sensor
        ctx.fillStyle = ColorPalette.highZone.turquoiseCrystal;
        ctx.beginPath();
        ctx.arc(18, 22, 5, 0, Math.PI * 2);
        ctx.fill();

        probeCanvas.refresh();
      }
    }

    // 6. Condensate Droplet / Sparkle particle
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
  }
}
