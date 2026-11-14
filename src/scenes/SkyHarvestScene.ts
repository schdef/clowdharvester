import Phaser from 'phaser';
import { ColorPalette } from '../gfx/ColorPalette';
import { AudioManager } from '../audio/AudioManager';

interface CloudInstance {
  sprite: Phaser.GameObjects.Sprite;
  speed: number;
  initialY: number;
  bobOffset: number;
}

export class SkyHarvestScene extends Phaser.Scene {
  private clouds: CloudInstance[] = [];
  private platform!: Phaser.GameObjects.Container;
  private cableGraphics!: Phaser.GameObjects.Graphics;
  private probeHead!: Phaser.GameObjects.Sprite;
  private probeTargetY = 160;
  private probeCurrentY = 160;
  private timeElapsed = 0;

  constructor() {
    super({ key: 'SkyHarvestScene' });
  }

  public create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Render Sky Zone Background Gradient
    this.createSkyBackground(width, height);

    // 2. Add Floating Zone Ambience (Particles / Mists)
    this.createZoneEmitters(width);

    // 3. Spawn Multi-Layer Drifting Clouds across the 3 Zones
    this.createZoneClouds(width);

    // 4. Harbor Skyline Silhouette at Bottom
    this.createHarborSkyline(width, height);

    // 5. Cable Graphics
    this.cableGraphics = this.add.graphics();

    // 6. Suspended Platform at Top
    this.createSuspendedPlatform(width);

    // 7. Interactive Drill Probe Head
    this.createProbeHead(width);

    // 8. Pointer / Touch Input Handling for Interactive Demonstration
    this.setupInputHandlers();

    // Camera fade in
    this.cameras.main.fadeIn(500, 15, 23, 42);
  }

  private createSkyBackground(width: number, height: number): void {
    const bg = this.add.graphics();

    // Layer 1: High Zone (0 to 380)
    bg.fillGradientStyle(
      ColorPalette.uiHarbor.deepBlackNum,
      ColorPalette.uiHarbor.deepBlackNum,
      0x1E2B45,
      0x1E2B45,
      1
    );
    bg.fillRect(0, 0, width, 380);

    // Layer 2: Mid Zone (380 to 650)
    bg.fillGradientStyle(
      0x1E2B45,
      0x1E2B45,
      0x241C48,
      0x241C48,
      1
    );
    bg.fillRect(0, 380, width, 270);

    // Layer 3: Low Zone (650 to 960)
    bg.fillGradientStyle(
      0x241C48,
      0x241C48,
      ColorPalette.lowZone.twilightVioletNum,
      ColorPalette.lowZone.stormIndigoNum,
      1
    );
    bg.fillRect(0, 650, width, height - 650);

    // Subtle Zone Boundary Lines
    const lines = this.add.graphics();
    lines.lineStyle(1, 0x38B2AC, 0.2);
    lines.lineBetween(0, 380, width, 380);
    lines.lineStyle(1, 0xFBBF24, 0.2);
    lines.lineBetween(0, 650, width, 650);

    // Zone labels in Neo-Pastell aesthetic
    this.add.text(14, 130, 'HOCHZONE (FROSTKRISTALLE)', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#7DD3FC',
      letterSpacing: 2,
    }).setAlpha(0.6);

    this.add.text(14, 400, 'MITTELZONE (SKYWATER)', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#93C5FD',
      letterSpacing: 2,
    }).setAlpha(0.6);

    this.add.text(14, 670, 'TIEFZONE (STURMLADUNG)', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#F472B6',
      letterSpacing: 2,
    }).setAlpha(0.6);
  }

  private createZoneClouds(width: number): void {
    // High Zone Clouds (Drift Right, fast +3 cols/week proportional)
    const highConfigs = [
      { x: width * 0.2, y: 200, speed: 18, scale: 0.9, alpha: 0.85 },
      { x: width * 0.75, y: 260, speed: 22, scale: 1.1, alpha: 0.8 },
      { x: width * 1.2, y: 180, speed: 16, scale: 0.8, alpha: 0.75 },
    ];
    highConfigs.forEach((cfg, i) => {
      const spr = this.add.sprite(cfg.x, cfg.y, 'cloud-high');
      spr.setScale(cfg.scale);
      spr.setAlpha(cfg.alpha);
      this.clouds.push({ sprite: spr, speed: cfg.speed, initialY: cfg.y, bobOffset: i * 1.5 });
    });

    // Mid Zone Clouds (Drift Left, moderate -2 cols/week)
    const midConfigs = [
      { x: width * 0.15, y: 460, speed: -14, scale: 1.0, alpha: 0.85 },
      { x: width * 0.65, y: 530, speed: -12, scale: 1.15, alpha: 0.8 },
      { x: width * 1.1, y: 480, speed: -16, scale: 0.95, alpha: 0.75 },
    ];
    midConfigs.forEach((cfg, i) => {
      const spr = this.add.sprite(cfg.x, cfg.y, 'cloud-mid');
      spr.setScale(cfg.scale);
      spr.setAlpha(cfg.alpha);
      this.clouds.push({ sprite: spr, speed: cfg.speed, initialY: cfg.y, bobOffset: (i + 3) * 1.2 });
    });

    // Low Zone Clouds (Drift Right, heavy +1 col/week)
    const lowConfigs = [
      { x: width * 0.3, y: 730, speed: 8, scale: 1.1, alpha: 0.8 },
      { x: width * 0.8, y: 790, speed: 10, scale: 1.2, alpha: 0.85 },
    ];
    lowConfigs.forEach((cfg, i) => {
      const spr = this.add.sprite(cfg.x, cfg.y, 'cloud-low');
      spr.setScale(cfg.scale);
      spr.setAlpha(cfg.alpha);
      this.clouds.push({ sprite: spr, speed: cfg.speed, initialY: cfg.y, bobOffset: (i + 6) * 1.1 });
    });
  }

  private createZoneEmitters(width: number): void {
    // Sparkles in High Zone
    const highParticles = this.add.particles(0, 0, 'particle-drop', {
      x: { min: 0, max: width },
      y: { min: 140, max: 370 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: ColorPalette.highZone.turquoiseCrystalNum,
      speedY: { min: -10, max: 10 },
      speedX: { min: 5, max: 20 },
      lifespan: 2400,
      frequency: 200,
      blendMode: Phaser.BlendModes.ADD,
    });
    highParticles.setDepth(1);

    // Glowing Embers in Low Zone
    const lowParticles = this.add.particles(0, 0, 'particle-drop', {
      x: { min: 0, max: width },
      y: { min: 660, max: 850 },
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 0.8, end: 0 },
      tint: ColorPalette.lowZone.glowGoldNum,
      speedY: { min: -25, max: -5 },
      speedX: { min: -8, max: 8 },
      lifespan: 3000,
      frequency: 350,
      blendMode: Phaser.BlendModes.ADD,
    });
    lowParticles.setDepth(1);
  }

  private createHarborSkyline(width: number, height: number): void {
    const harbor = this.add.graphics();
    harbor.fillStyle(ColorPalette.uiHarbor.deepBlackNum, 0.95);

    // Geometric harbor stilt towers & dock promenade
    harbor.fillRect(0, height - 70, width, 70);

    // Silhouetted hangars and spires
    harbor.beginPath();
    harbor.moveTo(40, height - 70);
    harbor.lineTo(60, height - 120);
    harbor.lineTo(80, height - 70);

    harbor.moveTo(width - 120, height - 70);
    harbor.lineTo(width - 90, height - 135);
    harbor.lineTo(width - 60, height - 70);
    harbor.fill();

    // Harbor beacon light
    const beacon = this.add.circle(width - 90, height - 138, 4, ColorPalette.uiHarbor.brassNum);
    this.tweens.add({
      targets: beacon,
      alpha: 0.2,
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    const dockLabel = this.add.text(width / 2, height - 35, 'HIMMELSHAFEN & ANLEGESTELLE', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#64748B',
      letterSpacing: 2,
    }).setOrigin(0.5);
    dockLabel.setDepth(5);
  }

  private createSuspendedPlatform(width: number): void {
    this.platform = this.add.container(width / 2, 50);

    const platformSprite = this.add.sprite(0, 0, 'platform');
    this.platform.add(platformSprite);
    this.platform.setDepth(10);
  }

  private createProbeHead(width: number): void {
    this.probeHead = this.add.sprite(width / 2, this.probeCurrentY, 'probe-head');
    this.probeHead.setDepth(8);
  }

  private setupInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      AudioManager.getInstance().init();
      this.probeTargetY = Phaser.Math.Clamp(pointer.y, 80, 830);
      AudioManager.getInstance().playUiClick();
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.probeTargetY = Phaser.Math.Clamp(pointer.y, 80, 830);
      }
    });
  }

  public update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.timeElapsed += dt;
    const width = this.cameras.main.width;

    // 1. Gently sway suspended platform (Monument Valley aesthetic pendulum)
    const swayAngle = Math.sin(this.timeElapsed * 1.2) * 1.5;
    const swayY = Math.sin(this.timeElapsed * 2.0) * 2;
    this.platform.setAngle(swayAngle);
    this.platform.setY(50 + swayY);

    // 2. Smooth probe vertical motion (interpolated elastic follow)
    const dy = this.probeTargetY - this.probeCurrentY;
    this.probeCurrentY += dy * 8 * dt;
    this.probeHead.setY(this.probeCurrentY);

    // Horizontal wobble following platform sway
    const probeX = width / 2 + Math.sin(this.timeElapsed * 1.8) * 4;
    this.probeHead.setX(probeX);

    // 3. Render Suspended Braided Cable from platform winch to probe head
    this.cableGraphics.clear();
    this.cableGraphics.lineStyle(2, ColorPalette.uiHarbor.brassNum, 0.9);
    // Catenary quadratic curve
    const midCableX = (width / 2 + probeX) / 2 + Math.sin(this.timeElapsed * 3) * 2;
    const midCableY = (50 + swayY + this.probeCurrentY) / 2;
    const cableCurve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(width / 2, 50 + swayY + 12),
      new Phaser.Math.Vector2(midCableX, midCableY),
      new Phaser.Math.Vector2(probeX, this.probeCurrentY - 18)
    );
    const points = cableCurve.getPoints(16);
    this.cableGraphics.strokePoints(points);

    // 4. Update cloud positions and horizontal drift
    this.clouds.forEach((c) => {
      c.sprite.x += c.speed * dt;

      // Soft vertical organic floating bob
      c.sprite.y = c.initialY + Math.sin(this.timeElapsed + c.bobOffset) * 4;

      // Wrap-around screen bounds
      if (c.speed > 0 && c.sprite.x - 150 > width) {
        c.sprite.x = -140;
      } else if (c.speed < 0 && c.sprite.x + 150 < 0) {
        c.sprite.x = width + 140;
      }
    });
  }
}
