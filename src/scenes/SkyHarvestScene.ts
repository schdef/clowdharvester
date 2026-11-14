import Phaser from 'phaser';
import { ColorPalette } from '../gfx/ColorPalette';
import { AudioManager } from '../audio/AudioManager';
import { CloudGrid, CondensatePocket } from '../core/CloudGrid';
import { ProbePhysics, DrillHeadType } from '../core/ProbePhysics';
import { ToolType } from '../ui/ToolBar';
import { GameState } from '../core/GameState';
import { CloudBand } from '../core/AuctionEngine';
import { t } from '../i18n/i18n';

interface CloudInstance {
  sprite: Phaser.GameObjects.Sprite;
  speed: number;
  initialY: number;
  bobOffset: number;
}

interface ExtractionDrop {
  t: number;          // 0.0 (probe head) to 1.0 (platform winch)
  speed: number;
  color: number;
  size: number;
}

interface SonarPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: number;
}

export class SkyHarvestScene extends Phaser.Scene {
  // Core Simulation
  private cloudGrid!: CloudGrid;
  private activeTool: ToolType = 'drill';
  private activeDrillHead: DrillHeadType = 'fog';

  // Game Objects & Layers
  private clouds: CloudInstance[] = [];
  private platform!: Phaser.GameObjects.Container;
  private probeHead!: Phaser.GameObjects.Sprite;
  private skyBackgroundGraphics!: Phaser.GameObjects.Graphics;
  private skyBoundaryGraphics!: Phaser.GameObjects.Graphics;
  private zoneLabels: Phaser.GameObjects.Text[] = [];
  private harborGraphics!: Phaser.GameObjects.Graphics;
  private harborDockLabel!: Phaser.GameObjects.Text;
  private harborBeacon!: Phaser.GameObjects.Arc;
  private cableGraphics!: Phaser.GameObjects.Graphics;
  private channelGraphics!: Phaser.GameObjects.Graphics;
  private pocketsGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;
  private cuttingEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Probe Dynamics
  private probeCurrentX = 270;
  private probeCurrentY = 160;
  private probeTargetX = 270;
  private probeTargetY = 160;
  private isPointerActive = false;
  private isDocked = false;
  private dockedPocket: CondensatePocket | null = null;
  private timeElapsed = 0;

  // Extraction Droplets & Sonar
  private extractionDroplets: ExtractionDrop[] = [];
  private activeSonarPulses: SonarPulse[] = [];
  private sonarHintText!: Phaser.GameObjects.Text;
  private sonarHintTimer = 0;

  // Progress & Inventory
  private tankStored = 0;
  private readonly tankMax = 100;
  private currentWeek = 1;
  private activeBand: CloudBand | null = null;

  constructor() {
    super({ key: 'SkyHarvestScene' });
  }

  public init(data?: { cloudBand?: CloudBand }): void {
    if (data?.cloudBand) {
      this.activeBand = data.cloudBand;
      GameState.getInstance().setActiveCloudBand(data.cloudBand);
    } else {
      this.activeBand = GameState.getInstance().getActiveCloudBand();
    }
  }

  public create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. Initialize Simulation Model with custom pockets from active cloud band if present
    const customPockets = this.activeBand?.actualData.pockets;
    this.cloudGrid = new CloudGrid(customPockets, width, height);
    this.probeCurrentX = width / 2;
    this.probeTargetX = width / 2;

    // 2. Sky Background Graphics & Dynamic Zones
    this.skyBackgroundGraphics = this.add.graphics();
    this.skyBackgroundGraphics.setDepth(0);
    this.skyBoundaryGraphics = this.add.graphics();
    this.skyBoundaryGraphics.setDepth(1);
    this.buildSkyBackground(width, height);

    // 3. Floating Zone Ambient Emitters
    this.createZoneEmitters(width, height);

    // 4. Multi-Layer Drifting Cloud Sprites
    this.createZoneClouds(width, height);

    // 5. Channel Carving Trail Graphics (Kanalspur)
    this.channelGraphics = this.add.graphics();
    this.channelGraphics.setDepth(3);

    // 6. Condensate Pockets Graphics
    this.pocketsGraphics = this.add.graphics();
    this.pocketsGraphics.setDepth(5);

    // 7. Harbor Skyline Silhouette at Bottom
    this.harborGraphics = this.add.graphics();
    this.harborGraphics.setDepth(6);
    this.buildHarborSkyline(width, height);

    // 8. Braided Suspension Cable Graphics
    this.cableGraphics = this.add.graphics();
    this.cableGraphics.setDepth(7);

    // 9. FX & Sonar Graphics
    this.fxGraphics = this.add.graphics();
    this.fxGraphics.setDepth(9);

    // 10. Suspended Platform at Top
    this.createSuspendedPlatform(width);

    // 11. Interactive Drill Probe Head
    this.createProbeHead();

    // 12. Cutting Mist Particles Emitter
    this.createCuttingParticles();

    // 13. Windfühler Sonar Floating Hint Badge
    this.createSonarHUD(width);

    // 14. Pointer & Touch Input Handling
    this.setupInputHandlers();

    // 15. Listen to Tool & Drill Head changes from ToolBar
    this.setupToolBarListeners();

    // 16. Dynamic Full-Screen Resize Listener
    this.scale.on('resize', this.handleResize, this);

    // 17. Show arrival banner if active cloud band was acquired
    if (this.activeBand) {
      this.showBandArrivalBanner(width);
    }

    // Fade in camera
    this.cameras.main.fadeIn(500, 15, 23, 42);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;

    this.cameras.main.setViewport(0, 0, width, height);
    this.cloudGrid.setDimensions(width, height);

    this.buildSkyBackground(width, height);
    this.buildHarborSkyline(width, height);

    if (this.platform) {
      this.platform.setPosition(width / 2, 50);
    }

    if (this.sonarHintText) {
      this.sonarHintText.setPosition(width / 2, 120);
    }

    // Keep probe inside screen bounds
    this.probeCurrentX = Phaser.Math.Clamp(this.probeCurrentX, 30, width - 30);
    this.probeCurrentY = Phaser.Math.Clamp(this.probeCurrentY, 80, height - 90);
    this.probeTargetX = this.probeCurrentX;
    this.probeTargetY = this.probeCurrentY;
    if (this.probeHead) {
      this.probeHead.setPosition(this.probeCurrentX, this.probeCurrentY);
    }
  }

  private showBandArrivalBanner(width: number): void {
    if (!this.activeBand) return;
    const bannerContainer = this.add.container(width / 2, 80);
    bannerContainer.setDepth(50);

    const bg = this.add.graphics();
    bg.fillStyle(0x0F172A, 0.88);
    bg.fillRoundedRect(-180, -22, 360, 44, 8);
    bg.lineStyle(1.5, ColorPalette.uiHarbor.brassNum, 0.9);
    bg.strokeRoundedRect(-180, -22, 360, 44, 8);
    bannerContainer.add(bg);

    const titleText = this.add.text(0, -6, `☁ ${this.activeBand.name}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#F8FAFC',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    bannerContainer.add(titleText);

    const subText = this.add.text(0, 10, `${this.activeBand.zone.toUpperCase()} ZONE • ${this.activeBand.estimatedSize} • BUNDEL-AUKTION`, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: ColorPalette.uiHarbor.brass,
    }).setOrigin(0.5);
    bannerContainer.add(subText);

    this.tweens.add({
      targets: bannerContainer,
      alpha: 0,
      y: 60,
      delay: 3800,
      duration: 700,
      onComplete: () => bannerContainer.destroy(),
    });
  }

  private buildSkyBackground(width: number, height: number): void {
    this.skyBackgroundGraphics.clear();
    this.skyBoundaryGraphics.clear();

    const highHeight = height * 0.40;
    const midHeight = height * 0.28;
    const midEnd = highHeight + midHeight;

    // Layer 1: High Zone (0 to highHeight)
    this.skyBackgroundGraphics.fillGradientStyle(
      ColorPalette.uiHarbor.deepBlackNum,
      ColorPalette.uiHarbor.deepBlackNum,
      0x1E2B45,
      0x1E2B45,
      1
    );
    this.skyBackgroundGraphics.fillRect(0, 0, width, highHeight);

    // Layer 2: Mid Zone (highHeight to midEnd)
    this.skyBackgroundGraphics.fillGradientStyle(
      0x1E2B45,
      0x1E2B45,
      0x241C48,
      0x241C48,
      1
    );
    this.skyBackgroundGraphics.fillRect(0, highHeight, width, midHeight);

    // Layer 3: Low Zone (midEnd to height)
    this.skyBackgroundGraphics.fillGradientStyle(
      0x241C48,
      0x241C48,
      ColorPalette.lowZone.twilightVioletNum,
      ColorPalette.lowZone.stormIndigoNum,
      1
    );
    this.skyBackgroundGraphics.fillRect(0, midEnd, width, height - midEnd);

    // Subtle Zone Boundary Lines spanning full width
    this.skyBoundaryGraphics.lineStyle(1, 0x38B2AC, 0.25);
    this.skyBoundaryGraphics.lineBetween(0, highHeight, width, highHeight);
    this.skyBoundaryGraphics.lineStyle(1, 0xFBBF24, 0.25);
    this.skyBoundaryGraphics.lineBetween(0, midEnd, width, midEnd);

    // Zone labels in Neo-Pastell aesthetic
    this.zoneLabels.forEach((lbl) => lbl.destroy());
    this.zoneLabels = [];

    const l1 = this.add.text(16, highHeight * 0.35, 'HOCHZONE (FROSTKRISTALLE)', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#7DD3FC',
      letterSpacing: 2,
    }).setAlpha(0.65).setDepth(1);

    const l2 = this.add.text(16, highHeight + midHeight * 0.2, 'MITTELZONE (SKYWATER)', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#93C5FD',
      letterSpacing: 2,
    }).setAlpha(0.65).setDepth(1);

    const l3 = this.add.text(16, midEnd + (height - midEnd) * 0.15, 'TIEFZONE (STURMLADUNG)', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#F472B6',
      letterSpacing: 2,
    }).setAlpha(0.65).setDepth(1);

    this.zoneLabels.push(l1, l2, l3);
  }

  private createZoneClouds(width: number, height: number): void {
    const highY = height * 0.22;
    const midY = height * 0.52;
    const lowY = height * 0.78;

    // High Zone Clouds (Drift Right, +3 cols/week)
    const highConfigs = [
      { x: width * 0.15, y: highY - 20, speed: 18, scale: 0.9, alpha: 0.85 },
      { x: width * 0.55, y: highY + 30, speed: 22, scale: 1.1, alpha: 0.8 },
      { x: width * 0.90, y: highY - 10, speed: 16, scale: 0.85, alpha: 0.75 },
    ];
    highConfigs.forEach((cfg, i) => {
      const spr = this.add.sprite(cfg.x, cfg.y, 'cloud-high');
      spr.setScale(cfg.scale);
      spr.setAlpha(cfg.alpha);
      spr.setDepth(2);
      this.clouds.push({ sprite: spr, speed: cfg.speed, initialY: cfg.y, bobOffset: i * 1.5 });
    });

    // Mid Zone Clouds (Drift Left, -2 cols/week)
    const midConfigs = [
      { x: width * 0.10, y: midY - 25, speed: -14, scale: 1.0, alpha: 0.85 },
      { x: width * 0.50, y: midY + 25, speed: -12, scale: 1.15, alpha: 0.8 },
      { x: width * 0.85, y: midY - 15, speed: -16, scale: 0.95, alpha: 0.75 },
    ];
    midConfigs.forEach((cfg, i) => {
      const spr = this.add.sprite(cfg.x, cfg.y, 'cloud-mid');
      spr.setScale(cfg.scale);
      spr.setAlpha(cfg.alpha);
      spr.setDepth(2);
      this.clouds.push({ sprite: spr, speed: cfg.speed, initialY: cfg.y, bobOffset: (i + 3) * 1.2 });
    });

    // Low Zone Clouds (Drift Right, +1 col/week)
    const lowConfigs = [
      { x: width * 0.25, y: lowY - 20, speed: 8, scale: 1.1, alpha: 0.8 },
      { x: width * 0.70, y: lowY + 20, speed: 10, scale: 1.2, alpha: 0.85 },
    ];
    lowConfigs.forEach((cfg, i) => {
      const spr = this.add.sprite(cfg.x, cfg.y, 'cloud-low');
      spr.setScale(cfg.scale);
      spr.setAlpha(cfg.alpha);
      spr.setDepth(2);
      this.clouds.push({ sprite: spr, speed: cfg.speed, initialY: cfg.y, bobOffset: (i + 6) * 1.1 });
    });
  }

  private createZoneEmitters(width: number, height: number): void {
    // Sparkles in High Zone
    const highParticles = this.add.particles(0, 0, 'particle-drop', {
      x: { min: 0, max: width },
      y: { min: height * 0.12, max: height * 0.38 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: ColorPalette.highZone.turquoiseCrystalNum,
      speedY: { min: -10, max: 10 },
      speedX: { min: 5, max: 20 },
      lifespan: 2400,
      frequency: 220,
      blendMode: Phaser.BlendModes.ADD,
    });
    highParticles.setDepth(1);

    // Glowing Embers in Low Zone
    const lowParticles = this.add.particles(0, 0, 'particle-spark', {
      x: { min: 0, max: width },
      y: { min: height * 0.68, max: height * 0.88 },
      scale: { start: 0.5, end: 0.1 },
      alpha: { start: 0.8, end: 0 },
      tint: ColorPalette.lowZone.glowGoldNum,
      speedY: { min: -25, max: -5 },
      speedX: { min: -8, max: 8 },
      lifespan: 3000,
      frequency: 320,
      blendMode: Phaser.BlendModes.ADD,
    });
    lowParticles.setDepth(1);
  }

  private buildHarborSkyline(width: number, height: number): void {
    this.harborGraphics.clear();
    this.harborGraphics.fillStyle(ColorPalette.uiHarbor.deepBlackNum, 0.96);
    this.harborGraphics.fillRect(0, height - 70, width, 70);

    // Silhouetted hangars and spires across full width
    this.harborGraphics.beginPath();
    this.harborGraphics.moveTo(40, height - 70);
    this.harborGraphics.lineTo(60, height - 120);
    this.harborGraphics.lineTo(80, height - 70);

    this.harborGraphics.moveTo(width - 120, height - 70);
    this.harborGraphics.lineTo(width - 90, height - 135);
    this.harborGraphics.lineTo(width - 60, height - 70);
    this.harborGraphics.fill();

    // Harbor beacon light
    if (!this.harborBeacon) {
      this.harborBeacon = this.add.circle(width - 90, height - 138, 4, ColorPalette.uiHarbor.brassNum);
      this.harborBeacon.setDepth(7);
      this.tweens.add({
        targets: this.harborBeacon,
        alpha: 0.2,
        duration: 1200,
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.harborBeacon.setPosition(width - 90, height - 138);
    }

    if (!this.harborDockLabel) {
      this.harborDockLabel = this.add.text(width / 2, height - 35, 'HIMMELSHAFEN & ANLEGESTELLE', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#64748B',
        letterSpacing: 2,
      }).setOrigin(0.5);
      this.harborDockLabel.setDepth(7);
    } else {
      this.harborDockLabel.setPosition(width / 2, height - 35);
    }
  }

  private createSuspendedPlatform(width: number): void {
    this.platform = this.add.container(width / 2, 50);
    const platformSprite = this.add.sprite(0, 0, 'platform');
    this.platform.add(platformSprite);
    this.platform.setDepth(10);
  }

  private createProbeHead(): void {
    this.probeHead = this.add.sprite(this.probeCurrentX, this.probeCurrentY, 'probe-head-fog');
    this.probeHead.setDepth(8);
  }

  private createCuttingParticles(): void {
    this.cuttingEmitter = this.add.particles(0, 0, 'particle-drop', {
      scale: { start: 0.5, end: 0.0 },
      alpha: { start: 0.75, end: 0.0 },
      speed: { min: 20, max: 70 },
      lifespan: 380,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.cuttingEmitter.setDepth(4);
  }

  private createSonarHUD(width: number): void {
    this.sonarHintText = this.add.text(width / 2, 120, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#F8FAFC',
      fontStyle: 'bold',
      backgroundColor: '#0F172ACC',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(20).setAlpha(0);
  }

  private setupToolBarListeners(): void {
    this.game.events.on('tool:change', (tool: ToolType) => {
      this.activeTool = tool;
      if (tool !== 'drill') {
        AudioManager.getInstance().stopDrill();
      }
    });

    this.game.events.on('drillhead:change', (head: DrillHeadType) => {
      this.activeDrillHead = head;
      this.updateProbeTexture();
    });
  }

  public setTool(tool: ToolType): void {
    this.activeTool = tool;
    if (tool !== 'drill') {
      AudioManager.getInstance().stopDrill();
    }
  }

  public setDrillHead(head: DrillHeadType): void {
    this.activeDrillHead = head;
    this.updateProbeTexture();
  }

  private updateProbeTexture(): void {
    if (!this.probeHead) return;
    let texKey = 'probe-head-fog';
    if (this.activeDrillHead === 'ice') texKey = 'probe-head-ice';
    if (this.activeDrillHead === 'charge') texKey = 'probe-head-charge';

    if (this.textures.exists(texKey)) {
      this.probeHead.setTexture(texKey);
    }
  }

  private setupInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      AudioManager.getInstance().init();
      this.isPointerActive = true;
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;

      // Scan Tool (Windfühler) Trigger
      if (this.activeTool === 'scan') {
        this.triggerWindSensor(pointer.x, pointer.y);
        return;
      }

      // Drill Tool (Full Available Screen Steer)
      if (this.activeTool === 'drill') {
        this.probeTargetX = Phaser.Math.Clamp(pointer.x, 30, width - 30);
        this.probeTargetY = Phaser.Math.Clamp(pointer.y, 80, height - 90);

        // If clicked far from docked pocket, unlatch
        if (this.isDocked && this.dockedPocket) {
          const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.dockedPocket.x, this.dockedPocket.y);
          if (dist > 85) {
            this.isDocked = false;
            this.dockedPocket = null;
            AudioManager.getInstance().playCableRelease();
          }
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.isPointerActive && this.activeTool === 'drill') {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.probeTargetX = Phaser.Math.Clamp(pointer.x, 30, width - 30);
        this.probeTargetY = Phaser.Math.Clamp(pointer.y, 80, height - 90);
      }
    });

    this.input.on('pointerup', () => {
      this.isPointerActive = false;
      AudioManager.getInstance().stopDrill();
    });
  }

  /**
   * Activates Windfühler Sonar Ping and displays warmer/colder indicator
   */
  private triggerWindSensor(x: number, y: number): void {
    const nearest = this.cloudGrid.findNearestPocket(x, y);
    const maxPingRadius = 160;

    let distanceRatio = 1.0;
    let hintMsg = t('scan.colder');
    let pingColor: number = ColorPalette.highZone.turquoiseCrystalNum;

    if (nearest) {
      distanceRatio = nearest.distance / maxPingRadius;

      if (nearest.distance < 70) {
        hintMsg = `${t('scan.hot')} (${nearest.pocket.name})`;
        pingColor = ColorPalette.lowZone.glowGoldNum;
      } else if (nearest.distance < maxPingRadius) {
        hintMsg = `${t('scan.warmer')} (${nearest.pocket.name})`;
        pingColor = ColorPalette.midZone.condensateDropNum;
      } else {
        hintMsg = `${t('scan.colder')} • Signal schwach`;
      }
    }

    AudioManager.getInstance().playSonarPing(distanceRatio);

    this.activeSonarPulses.push({
      x,
      y,
      radius: 10,
      maxRadius: maxPingRadius,
      alpha: 0.9,
      color: pingColor,
    });

    const height = this.cameras.main.height;
    this.sonarHintText.setText(hintMsg);
    this.sonarHintText.setPosition(this.cameras.main.width / 2, Phaser.Math.Clamp(y - 45, 110, height - 120));
    this.sonarHintText.setAlpha(1.0);
    this.sonarHintTimer = 2.4;
  }

  public update(_time: number, delta: number): void {
    const dt = Math.min(0.1, delta / 1000);
    this.timeElapsed += dt;
    const width = this.cameras.main.width;

    // 1. Gently sway suspended platform
    const swayAngle = Math.sin(this.timeElapsed * 1.2) * 1.5;
    const swayY = Math.sin(this.timeElapsed * 2.0) * 2;
    this.platform.setAngle(swayAngle);
    this.platform.setY(50 + swayY);
    const winchX = width / 2;
    const winchY = 50 + swayY + 12;

    // 2. Update CloudGrid (carve channel healing and pocket drift)
    this.cloudGrid.update(dt, this.currentWeek, (this.timeElapsed % 60) / 60);

    // 3. Probe Dynamics & Layer Resistance
    this.updateProbeMotion(dt, winchX, winchY);

    // 4. Pocket Collision, Docking & Extraction
    this.updatePocketsAndExtraction(dt, winchX, winchY);

    // 5. Render Carved Channel (Kanalspur)
    this.renderCarvedChannel();

    // 6. Render Condensate Pockets
    this.renderPockets();

    // 7. Render Suspended Braided Cable & Droplets
    this.renderCableAndDroplets(winchX, winchY, dt);

    // 8. Render Sonar Waves & HUD
    this.renderSonarFX(dt);

    // 9. Update background drifting clouds
    this.updateClouds(width, dt);
  }

  /**
   * Updates probe motion, dynamic speed braking, and cheerful drilling acoustics
   */
  private updateProbeMotion(dt: number, _winchX: number, _winchY: number): void {
    const dy = this.probeTargetY - this.probeCurrentY;
    const dx = this.probeTargetX - this.probeCurrentX;

    const currentZone = this.cloudGrid.getZoneAtWorldY(this.probeCurrentY);
    const isMatching = ProbePhysics.isMatchingHead(this.activeDrillHead, currentZone);
    const isCarved = this.cloudGrid.isCarvedAt(this.probeCurrentX, this.probeCurrentY);
    const baseDensity = this.cloudGrid.getEffectiveDensityAt(this.probeCurrentX, this.probeCurrentY);

    let isDrilling = false;

    // Vertical Motion
    if (dy > 1.5) {
      // Moving Downwards into Cloud Layers
      const advanceSpeed = ProbePhysics.calculateAdvanceSpeed(baseDensity, isMatching, isCarved);
      const stepY = Math.min(dy, advanceSpeed * dt);
      this.probeCurrentY += stepY;

      if (!isCarved && this.activeTool === 'drill') {
        // Active drilling through cloud mist!
        isDrilling = true;
        this.cloudGrid.carveAt(this.probeCurrentX, this.probeCurrentY, 20);

        // Cutting mist particle burst
        this.cuttingEmitter.setParticleTint(
          currentZone === 'high'
            ? ColorPalette.highZone.turquoiseCrystalNum
            : currentZone === 'mid'
            ? ColorPalette.midZone.condensateDropNum
            : ColorPalette.lowZone.glowGoldNum
        );
        this.cuttingEmitter.emitParticleAt(this.probeCurrentX, this.probeCurrentY + 16, 1);
      }
    } else if (dy < -1.5) {
      // Reeling in upwards (fast retrieval)
      const retractSpeed = 420;
      const stepY = Math.min(-dy, retractSpeed * dt);
      this.probeCurrentY -= stepY;
    }

    // Horizontal steering
    this.probeCurrentX += dx * 6.5 * dt;

    // Update Probe Head Sprite
    this.probeHead.setPosition(this.probeCurrentX, this.probeCurrentY);
    const wobbleAngle = isDrilling
      ? Math.sin(this.timeElapsed * 24) * 3.5
      : Math.sin(this.timeElapsed * 3) * 1.5;
    this.probeHead.setAngle(wobbleAngle);

    // Audio update (cheerful kalimba plings & water bubbles)
    if (this.activeTool === 'drill') {
      AudioManager.getInstance().updateDrillSound(isDrilling, currentZone, isMatching);
    } else {
      AudioManager.getInstance().updateDrillSound(false, currentZone, isMatching);
    }
  }

  /**
   * Handles condensate pocket docking and extraction flow
   */
  private updatePocketsAndExtraction(dt: number, winchX: number, _winchY: number): void {
    const pockets = this.cloudGrid.getPockets();

    // Check collision with pockets
    for (const p of pockets) {
      if (p.isDepleted) continue;

      const dist = Phaser.Math.Distance.Between(this.probeCurrentX, this.probeCurrentY, p.x, p.y);

      // Docking trigger
      if (!this.isDocked && dist < p.radius + 14) {
        this.isDocked = true;
        this.dockedPocket = p;
        AudioManager.getInstance().playPocketHit();
        this.activeSonarPulses.push({
          x: p.x,
          y: p.y,
          radius: 12,
          maxRadius: 55,
          alpha: 1.0,
          color: ColorPalette.highZone.frostGlowNum,
        });
        break;
      }
    }

    // Process docked extraction & elastic follow
    if (this.isDocked && this.dockedPocket) {
      const p = this.dockedPocket;

      // Safe release if user drags far away or pocket drifts beyond screen stretch
      const dragDist = Phaser.Math.Distance.Between(this.probeTargetX, this.probeTargetY, p.x, p.y);
      const cableSpan = Math.abs(p.x - winchX);
      const maxSpan = Math.max(160, this.cameras.main.width * 0.45);

      if (dragDist > 95 || cableSpan > maxSpan || p.isDepleted) {
        this.isDocked = false;
        this.dockedPocket = null;
        AudioManager.getInstance().playCableRelease();
      } else {
        // Elastic lock to pocket center
        this.probeCurrentX = Phaser.Math.Linear(this.probeCurrentX, p.x, 8 * dt);
        this.probeCurrentY = Phaser.Math.Linear(this.probeCurrentY, p.y, 8 * dt);
        this.probeTargetX = this.probeCurrentX;
        this.probeTargetY = this.probeCurrentY;
        this.probeHead.setPosition(this.probeCurrentX, this.probeCurrentY);

        // Visible Extraction Flow
        if (p.currentVolume > 0 && this.tankStored < this.tankMax) {
          const rate = 14.0;
          const extracted = this.cloudGrid.extractFromPocket(p.id, rate, dt);
          this.tankStored = Math.min(this.tankMax, this.tankStored + extracted);
          this.updateTankDisplay();

          // Spawn sparkling beads traveling up cable
          if (Math.random() < dt * 7.0) {
            let color: number = ColorPalette.midZone.condensateDropNum;
            if (p.resourceType === 'frost') color = ColorPalette.highZone.turquoiseCrystalNum;
            if (p.resourceType === 'storm') color = ColorPalette.lowZone.glowGoldNum;

            this.extractionDroplets.push({
              t: 0.0,
              speed: 0.9 + Math.random() * 0.35,
              color,
              size: 4 + Math.random() * 2,
            });
          }
        }
      }
    }
  }

  /**
   * Renders the visible carved channel (Kanalspur) into cloud layers
   */
  private renderCarvedChannel(): void {
    this.channelGraphics.clear();

    const cols = this.cloudGrid.columns;
    const layers = this.cloudGrid.layers;
    const colWidth = this.cloudGrid.width / cols;
    const layerHeight = (this.cloudGrid.gridBottomY - this.cloudGrid.gridTopY) / layers;

    for (let r = 0; r < layers; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = this.cloudGrid.getCell(c, r);
        if (!cell || cell.carveFactor <= 0.04) continue;

        const f = cell.carveFactor;
        const w = Math.max(22, colWidth * 0.85) * f;
        const h = Math.max(50, layerHeight * 0.98);

        // Clear borehole cutout showing deep sky behind
        this.channelGraphics.fillStyle(0x0A0F1D, 0.78 * f);
        this.channelGraphics.fillRect(cell.worldX - w / 2, cell.worldY - h / 2, w, h);

        // Glowing channel boundary contours
        let borderColor: number = ColorPalette.highZone.turquoiseCrystalNum;
        if (cell.zone === 'mid') borderColor = ColorPalette.midZone.condensateDropNum;
        if (cell.zone === 'low') borderColor = ColorPalette.lowZone.glowGoldNum;

        this.channelGraphics.lineStyle(1.5, borderColor, 0.55 * f);
        this.channelGraphics.lineBetween(cell.worldX - w / 2, cell.worldY - h / 2, cell.worldX - w / 2, cell.worldY + h / 2);
        this.channelGraphics.lineBetween(cell.worldX + w / 2, cell.worldY - h / 2, cell.worldX + w / 2, cell.worldY + h / 2);
      }
    }
  }

  /**
   * Renders the floating condensate pockets with volume and states
   */
  private renderPockets(): void {
    this.pocketsGraphics.clear();
    const pockets = this.cloudGrid.getPockets();

    for (const p of pockets) {
      const volumeRatio = p.currentVolume / p.maxCapacity;
      const isDepleted = p.isDepleted;

      if (isDepleted) {
        this.pocketsGraphics.lineStyle(1.5, 0x64748B, 0.4);
        this.pocketsGraphics.strokeCircle(p.x, p.y, p.radius * 0.7);
        continue;
      }

      // Outer aura glow
      let primaryColor: number = ColorPalette.midZone.condensateDropNum;
      let accentColor: number = ColorPalette.midZone.pastelAzureNum;

      if (p.resourceType === 'frost') {
        primaryColor = ColorPalette.highZone.turquoiseCrystalNum;
        accentColor = ColorPalette.highZone.frostGlowNum;
      } else if (p.resourceType === 'storm') {
        primaryColor = ColorPalette.lowZone.stormIndigoNum;
        accentColor = ColorPalette.lowZone.glowGoldNum;
      }

      const pulse = Math.sin(this.timeElapsed * 3 + p.baseY * 0.05) * 2;
      const effectiveRadius = (p.radius + pulse) * (0.6 + volumeRatio * 0.4);

      // Soft glow aura
      this.pocketsGraphics.fillStyle(accentColor, 0.25);
      this.pocketsGraphics.fillCircle(p.x, p.y, effectiveRadius + 6);

      // Core liquid / crystal body
      this.pocketsGraphics.fillStyle(primaryColor, 0.85);
      this.pocketsGraphics.fillCircle(p.x, p.y, effectiveRadius);

      // Inner jewel highlight
      this.pocketsGraphics.fillStyle(accentColor, 0.9);
      this.pocketsGraphics.fillCircle(p.x - effectiveRadius * 0.3, p.y - effectiveRadius * 0.3, effectiveRadius * 0.28);

      // Docked indicator ring
      if (this.isDocked && this.dockedPocket === p) {
        this.pocketsGraphics.lineStyle(2, ColorPalette.uiHarbor.brassNum, 0.95);
        this.pocketsGraphics.strokeCircle(p.x, p.y, effectiveRadius + 4);
      }
    }
  }

  /**
   * Renders dynamic catenary braided cable and ascending extraction drops
   */
  private renderCableAndDroplets(winchX: number, winchY: number, dt: number): void {
    this.cableGraphics.clear();

    const currentZone = this.cloudGrid.getZoneAtWorldY(this.probeCurrentY);
    const curveData = ProbePhysics.calculateCableCurve(
      winchX,
      winchY,
      this.probeCurrentX,
      this.probeCurrentY - 18,
      this.timeElapsed,
      currentZone
    );

    const cableCurve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(curveData.startX, curveData.startY),
      new Phaser.Math.Vector2(curveData.controlX, curveData.controlY),
      new Phaser.Math.Vector2(curveData.endX, curveData.endY)
    );

    const cableColor = this.isDocked
      ? ColorPalette.highZone.turquoiseCrystalNum
      : ColorPalette.uiHarbor.brassNum;
    this.cableGraphics.lineStyle(2.5, cableColor, 0.95);
    const points = cableCurve.getPoints(20);
    this.cableGraphics.strokePoints(points);

    // Animate and render extraction droplets
    for (let i = this.extractionDroplets.length - 1; i >= 0; i--) {
      const drop = this.extractionDroplets[i];
      drop.t += drop.speed * dt;

      if (drop.t >= 1.0) {
        AudioManager.getInstance().playExtractDrop();
        GameState.getInstance().addCredits(1);
        this.updateCreditsDisplay();
        this.extractionDroplets.splice(i, 1);
        continue;
      }

      const pt = cableCurve.getPoint(1.0 - drop.t);
      this.cableGraphics.fillStyle(drop.color, 0.95);
      this.cableGraphics.fillCircle(pt.x, pt.y, drop.size);
      this.cableGraphics.fillStyle(0xFFFFFF, 0.8);
      this.cableGraphics.fillCircle(pt.x, pt.y, drop.size * 0.4);
    }
  }

  /**
   * Renders expanding sonar rings and floating hint badge
   */
  private renderSonarFX(dt: number): void {
    this.fxGraphics.clear();

    for (let i = this.activeSonarPulses.length - 1; i >= 0; i--) {
      const p = this.activeSonarPulses[i];
      p.radius += 160 * dt;
      p.alpha = Math.max(0, 1.0 - p.radius / p.maxRadius);

      this.fxGraphics.lineStyle(2, p.color, p.alpha);
      this.fxGraphics.strokeCircle(p.x, p.y, p.radius);

      if (p.radius >= p.maxRadius) {
        this.activeSonarPulses.splice(i, 1);
      }
    }

    if (this.sonarHintTimer > 0) {
      this.sonarHintTimer -= dt;
      if (this.sonarHintTimer <= 0) {
        this.sonarHintText.setAlpha(0);
      } else if (this.sonarHintTimer < 0.5) {
        this.sonarHintText.setAlpha(this.sonarHintTimer / 0.5);
      }
    }
  }

  /**
   * Updates background cloud drift and bounds wrapping across full screen
   */
  private updateClouds(width: number, dt: number): void {
    this.clouds.forEach((c) => {
      c.sprite.x += c.speed * dt;
      c.sprite.y = c.initialY + Math.sin(this.timeElapsed + c.bobOffset) * 4;

      if (c.speed > 0 && c.sprite.x - 180 > width) {
        c.sprite.x = -160;
      } else if (c.speed < 0 && c.sprite.x + 180 < 0) {
        c.sprite.x = width + 160;
      }
    });
  }

  private updateCreditsDisplay(): void {
    const creditsEl = document.getElementById('header-credits');
    if (creditsEl) {
      creditsEl.textContent = GameState.getInstance().getData().credits.toString();
    }
  }

  private updateTankDisplay(): void {
    const tankEl = document.getElementById('header-tank');
    if (tankEl) {
      tankEl.textContent = `${Math.floor(this.tankStored)} / ${this.tankMax}`;
    }
  }
}
