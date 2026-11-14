import Phaser from 'phaser';
import { ColorPalette } from '../gfx/ColorPalette';
import { AudioManager } from '../audio/AudioManager';
import { CloudGrid, CondensatePocket } from '../core/CloudGrid';
import { ProbePhysics, DrillHeadType } from '../core/ProbePhysics';
import { ToolType, ScanToolType } from '../ui/ToolBar';
import { GameState } from '../core/GameState';
import { CloudBand, AuctionEngine } from '../core/AuctionEngine';
import { LogisticsNet, PipeStatus } from '../core/LogisticsNet';
import { ResourceType } from '../core/MarketEconomy';
import { t, onLanguageChange } from '../i18n/i18n';
import { CouncilModal } from '../ui/CouncilModal';
import { SummaryModal } from '../ui/SummaryModal';
import { HarborModal } from '../ui/HarborModal';
import { TutorialModal } from '../ui/TutorialModal';

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
  resourceType: ResourceType;
}

interface PipeDrop {
  t: number;          // 0.0 to 1.0 along pipe
  speed: number;
  color: number;
  destination: 'leftTank' | 'rightTank' | 'harbor';
}

interface SonarPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: number;
}

interface DroneScan {
  x: number;
  y: number;
  targetX: number;
  layer: number;
  speed: number;
  pulseTimer: number;
}

interface SpectralScan {
  x: number;
  y: number;
  currentRadius: number;
  maxRadius: number;
  alpha: number;
}

interface PocketLabelGroup {
  hintText: Phaser.GameObjects.Text;
  symbolText: Phaser.GameObjects.Text;
  qualityText: Phaser.GameObjects.Text;
}

export interface CustomPipe {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  sourceType: 'platform' | 'tank' | 'pocket' | 'balloon';
  targetType: 'platform' | 'tank' | 'pocket' | 'balloon';
  sourcePocketId?: string;
  targetPocketId?: string;
  flowTimer: number;
}

export interface CustomBalloon {
  id: string;
  x: number;
  y: number;
  capacity: number;
  bobPhase: number;
}

export interface SkyRival {
  id: 'daredevil' | 'calculator' | 'tracker';
  nameKey: string;
  symbol: string;
  x: number;
  y: number;
  baseXRatio: number;
  baseY: number;
  color: number;
  accentColor: number;
  flagColor: number;
  totalHarvested: number;
  targetPocketId: string | null;
  drillX: number;
  drillY: number;
  cableT: number;
  isDrilling: boolean;
  drillTimer: number;
  decisionCooldown: number;
  nameText?: Phaser.GameObjects.Text;
  counterText?: Phaser.GameObjects.Text;
}

export class SkyHarvestScene extends Phaser.Scene {
  // Core Simulation
  private cloudGrid!: CloudGrid;
  private logisticsNet: LogisticsNet = new LogisticsNet();
  private activeTool: ToolType = 'drill';
  private activeDrillHead: DrillHeadType = 'fog';
  private activeScanTool: ScanToolType = 'wind_sensor';

  // Interactive Logistics (Slot 3: Rohr & Slot 4: Speicher)
  private customPipes: CustomPipe[] = [];
  private customBalloons: CustomBalloon[] = [];
  private pipeDragStart: { x: number; y: number; type: 'platform' | 'tank' | 'pocket' | 'balloon'; pocketId?: string } | null = null;
  private isBuildingPipe = false;
  private pointerCurrentX = 0;
  private pointerCurrentY = 0;
  private logisticsInteractiveGraphics!: Phaser.GameObjects.Graphics;

  // Sky Arena - KI-Rivalen
  private skyRivals: SkyRival[] = [];
  private rivalsGraphics!: Phaser.GameObjects.Graphics;
  private rivalCablesGraphics!: Phaser.GameObjects.Graphics;
  private rivalParticles: Array<{ x: number; y: number; targetX: number; targetY: number; t: number; color: number }> = [];
  private lastContestedAlertTimer = 0;

  // Cloud Replenishment & Platform Relocation
  private replenishBannerContainer: Phaser.GameObjects.Container | null = null;
  private isReplenishingDrift = false;
  private platformOffsetX = 0;

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
  private pipesGraphics!: Phaser.GameObjects.Graphics;
  private tanksGraphics!: Phaser.GameObjects.Graphics;
  private logisticsStatusGraphics!: Phaser.GameObjects.Graphics;
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

  // Extraction Droplets, Pipe Droplets & Sonar/Scans
  private extractionDroplets: ExtractionDrop[] = [];
  private pipeDroplets: PipeDrop[] = [];
  private activeSonarPulses: SonarPulse[] = [];
  private activeDroneScans: DroneScan[] = [];
  private activeSpectralScans: SpectralScan[] = [];
  private pocketLabels: Map<string, PocketLabelGroup> = new Map();
  private sonarHintText!: Phaser.GameObjects.Text;
  private sonarHintTimer = 0;

  // Logistics & Network Status
  private currentNetworkStatus: PipeStatus = 'idle';
  private weekTimer = 0;

  // Starthilfe Tooltip
  private startHintContainer: Phaser.GameObjects.Container | null = null;
  private startHintText: Phaser.GameObjects.Text | null = null;
  private hasDismissedStartHint = false;
  private langListener: (() => void) | null = null;

  // Progress & Inventory (Delegated to GameState for Phase 2)
  private get tankStored(): number {
    return GameState.getInstance().getTotalStored();
  }
  private get tankMax(): number {
    return GameState.getInstance().getMaxStorageCapacity();
  }
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

    // Ensure sidebars and mobile dock are visible in SkyHarvestScene
    const leftSidebar = document.getElementById('desktop-left-sidebar');
    const rightSidebar = document.getElementById('desktop-right-sidebar');
    const mobileDock = document.getElementById('mobile-thumb-dock');
    if (leftSidebar) leftSidebar.style.display = '';
    if (rightSidebar) rightSidebar.style.display = '';
    if (mobileDock) mobileDock.style.display = '';

    // 1. Initialize Simulation Model with custom pockets from active cloud band if present
    const customPockets = this.activeBand?.actualData.pockets;
    this.cloudGrid = new CloudGrid(customPockets, width, height);
    this.initPocketLabels();
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

    // 7b. Conduit & Pipes Graphics (Slot 3)
    this.pipesGraphics = this.add.graphics();
    this.pipesGraphics.setDepth(7);

    // 8. Braided Suspension Cable Graphics
    this.cableGraphics = this.add.graphics();
    this.cableGraphics.setDepth(8);

    // 9. FX & Sonar Graphics
    this.fxGraphics = this.add.graphics();
    this.fxGraphics.setDepth(9);

    // 10. Suspended Platform at Top
    this.createSuspendedPlatform(width);

    // 10b. Floating Tank Balloons Graphics (Slot 4)
    this.tanksGraphics = this.add.graphics();
    this.tanksGraphics.setDepth(11);

    // 10c. Logistics Status Graphics (Lock, Warning, Flowing Dots)
    this.logisticsStatusGraphics = this.add.graphics();
    this.logisticsStatusGraphics.setDepth(12);

    // 10d. Interactive Logistics Graphics (Pipe building, custom pipes & balloons)
    this.logisticsInteractiveGraphics = this.add.graphics();
    this.logisticsInteractiveGraphics.setDepth(13);

    // 10e. Sky Arena - AI Rivals Graphics & Cables
    this.rivalCablesGraphics = this.add.graphics();
    this.rivalCablesGraphics.setDepth(7);
    this.rivalsGraphics = this.add.graphics();
    this.rivalsGraphics.setDepth(10);
    this.initSkyRivals(width);

    // 10f. Cloud Replenishment & Platform Relocation Action Banner
    this.createReplenishBanner(width);

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

    // 17. Starthilfe Tooltip
    this.createStartHintTooltip(width);

    // 18. Show arrival banner if active cloud band was acquired
    if (this.activeBand) {
      this.showBandArrivalBanner(width);
    }

    // 19. Language change listener
    this.langListener = onLanguageChange(() => this.handleLanguageChange());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.langListener) {
        this.langListener();
        this.langListener = null;
      }
      this.pocketLabels.forEach((grp) => {
        grp.hintText.destroy();
        grp.symbolText.destroy();
        grp.qualityText.destroy();
      });
      this.pocketLabels.clear();
      this.skyRivals.forEach((r) => {
        r.nameText?.destroy();
        r.counterText?.destroy();
      });
      this.skyRivals = [];
      if (this.replenishBannerContainer) {
        this.replenishBannerContainer.destroy();
        this.replenishBannerContainer = null;
      }
    });

    // Initial display updates
    this.updateCreditsDisplay();
    this.updateTankDisplay();

    // Fade in camera
    this.cameras.main.fadeIn(500, 15, 23, 42);
  }

  private handleLanguageChange(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.buildSkyBackground(width, height);
    if (this.harborDockLabel) {
      this.harborDockLabel.setText(t('harvest.harborTitle'));
    }
    if (this.startHintText) {
      this.startHintText.setText(t('harvest.startHint'));
    }
    this.createReplenishBanner(width);
    for (const rival of this.skyRivals) {
      if (rival.nameText) {
        rival.nameText.setText(`${rival.symbol} ${t(rival.nameKey)}`);
      }
    }
  }

  private createStartHintTooltip(width: number): void {
    if (this.hasDismissedStartHint) return;

    this.startHintContainer = this.add.container(width / 2, 118);
    this.startHintContainer.setDepth(25);

    const hintBg = this.add.graphics();
    hintBg.fillStyle(0x0F172A, 0.95);
    hintBg.fillRoundedRect(-180, -18, 360, 36, 18);
    hintBg.lineStyle(1.5, ColorPalette.highZone.turquoiseCrystalNum, 0.9);
    hintBg.strokeRoundedRect(-180, -18, 360, 36, 18);
    this.startHintContainer.add(hintBg);

    this.startHintText = this.add.text(0, 0, t('harvest.startHint'), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#38BDF8',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.startHintContainer.add(this.startHintText);

    // Gently pulsing animation
    this.tweens.add({
      targets: this.startHintContainer,
      y: 122,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private dismissStartHint(): void {
    if (this.startHintContainer && !this.hasDismissedStartHint) {
      this.hasDismissedStartHint = true;
      this.tweens.add({
        targets: this.startHintContainer,
        alpha: 0,
        y: 104,
        duration: 350,
        ease: 'Power2',
        onComplete: () => {
          this.startHintContainer?.destroy();
          this.startHintContainer = null;
          this.startHintText = null;
        },
      });
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;

    this.cameras.main.setViewport(0, 0, width, height);
    this.cloudGrid.setDimensions(width, height);

    this.buildSkyBackground(width, height);
    this.buildHarborSkyline(width, height);

    if (this.platform) {
      this.platform.setPosition(width / 2, 80);
    }

    if (this.sonarHintText) {
      this.sonarHintText.setPosition(width / 2, 120);
    }

    if (this.replenishBannerContainer) {
      this.replenishBannerContainer.setPosition(width / 2, 140);
    }

    // Keep probe inside screen bounds
    this.probeCurrentX = Phaser.Math.Clamp(this.probeCurrentX, 30, width - 30);
    this.probeCurrentY = Phaser.Math.Clamp(this.probeCurrentY, 105, height - 90);
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

    const zoneName = t(`zones.${this.activeBand.zone}Short`).toUpperCase();
    const zoneLabel = t('zones.zone').toUpperCase();
    const bundleLabel = t('auction.bundleAuction');
    const subText = this.add.text(0, 10, `${zoneName} ${zoneLabel} • ${this.activeBand.estimatedSize} • ${bundleLabel}`, {
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

    const l1 = this.add.text(16, highHeight * 0.35, t('zones.highFull'), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#7DD3FC',
      letterSpacing: 2,
    }).setAlpha(0.65).setDepth(1);

    const l2 = this.add.text(16, highHeight + midHeight * 0.2, t('zones.midFull'), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#93C5FD',
      letterSpacing: 2,
    }).setAlpha(0.65).setDepth(1);

    const l3 = this.add.text(16, midEnd + (height - midEnd) * 0.15, t('zones.lowFull'), {
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
      this.harborDockLabel = this.add.text(width / 2, height - 35, `${t('harvest.harborTitle')} • [${t('harbor.tabMarket')}]`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#64748B',
        letterSpacing: 2,
      }).setOrigin(0.5);
      this.harborDockLabel.setDepth(7);
    } else {
      this.harborDockLabel.setPosition(width / 2, height - 35);
      this.harborDockLabel.setText(`${t('harvest.harborTitle')} • [${t('harbor.tabMarket')}]`);
    }

    // Make harbor clickable to open Harbor Market & Outfitter modal
    this.harborGraphics.setInteractive(
      new Phaser.Geom.Rectangle(0, height - 70, width, 70),
      Phaser.Geom.Rectangle.Contains
    );
    this.harborGraphics.removeAllListeners('pointerdown');
    this.harborGraphics.on('pointerdown', () => {
      AudioManager.getInstance().playUiClick();
      this.game.events.emit('harbor:open', 'market');
    });
    if (this.harborGraphics.input) {
      this.harborGraphics.input.cursor = 'pointer';
    }

    this.harborDockLabel.setInteractive({ useHandCursor: true });
    this.harborDockLabel.removeAllListeners('pointerdown');
    this.harborDockLabel.on('pointerdown', () => {
      AudioManager.getInstance().playUiClick();
      this.game.events.emit('harbor:open', 'market');
    });
  }

  private createSuspendedPlatform(width: number): void {
    this.platform = this.add.container(width / 2, 80);
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
      this.setTool(tool);
    });

    this.game.events.on('drillhead:change', (head: DrillHeadType) => {
      this.activeDrillHead = head;
      this.updateProbeTexture();
    });

    this.game.events.on('scantool:change', (scanTool: ScanToolType) => {
      this.activeScanTool = scanTool;
    });
  }

  public setTool(tool: ToolType): void {
    this.activeTool = tool;
    if (tool !== 'drill') {
      AudioManager.getInstance().stopDrill();
    }
    if (tool !== 'pipe') {
      this.pipeDragStart = null;
      this.isBuildingPipe = false;
    }
    if (tool === 'sell') {
      this.game.events.emit('harbor:open', 'market');
    }
  }

  public getActiveTool(): ToolType {
    return this.activeTool;
  }

  public setDrillHead(head: DrillHeadType): void {
    this.activeDrillHead = head;
    this.updateProbeTexture();
  }

  public setScanTool(scanTool: ScanToolType): void {
    this.activeScanTool = scanTool;
  }

  private initPocketLabels(): void {
    this.pocketLabels.forEach((grp) => {
      grp.hintText.destroy();
      grp.symbolText.destroy();
      grp.qualityText.destroy();
    });
    this.pocketLabels.clear();

    const pockets = this.cloudGrid?.getPockets() ?? [];
    for (const p of pockets) {
      const hintText = this.add.text(p.x, p.y, '(?)', {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#7DD3FC',
        stroke: '#0F172A',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(8).setVisible(false);

      const symbol = p.resourceType === 'frost' ? '❄' : p.resourceType === 'skywater' ? '💧' : '⚡';
      const symbolText = this.add.text(p.x, p.y - 4, symbol, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#FFFFFF',
        stroke: '#0F172A',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(8).setVisible(false);

      const stars = p.quality === 3 ? '⭐⭐⭐' : p.quality === 2 ? '⭐⭐' : '⭐';
      const qualityText = this.add.text(p.x, p.y + 11, stars, {
        fontFamily: 'sans-serif',
        fontSize: '9px',
        color: '#FDE047',
        stroke: '#0F172A',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(8).setVisible(false);

      this.pocketLabels.set(p.id, { hintText, symbolText, qualityText });
    }
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
      this.dismissStartHint();
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;

      // Scan Tool Trigger
      if (this.activeTool === 'scan') {
        this.handleScanAction(pointer.x, pointer.y);
        return;
      }

      // Interactive Pipe Tool (Slot 3)
      if (this.activeTool === 'pipe') {
        this.handlePipePointerDown(pointer.x, pointer.y);
        return;
      }

      // Interactive Tank Tool (Slot 4)
      if (this.activeTool === 'tank') {
        this.handleTankPointerDown(pointer.x, pointer.y);
        return;
      }

      // Drill Tool (Full Available Screen Steer)
      if (this.activeTool === 'drill') {
        this.probeTargetX = Phaser.Math.Clamp(pointer.x, 30, width - 30);
        this.probeTargetY = Phaser.Math.Clamp(pointer.y, 105, height - 90);

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
      this.pointerCurrentX = pointer.x;
      this.pointerCurrentY = pointer.y;

      if (pointer.isDown && this.isPointerActive && this.activeTool === 'drill') {
        this.dismissStartHint();
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.probeTargetX = Phaser.Math.Clamp(pointer.x, 30, width - 30);
        this.probeTargetY = Phaser.Math.Clamp(pointer.y, 105, height - 90);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.isPointerActive = false;
      AudioManager.getInstance().stopDrill();

      if (this.activeTool === 'pipe' && this.isBuildingPipe && this.pipeDragStart) {
        this.handlePipePointerUp(pointer.x, pointer.y);
      }
    });
  }

  public showScanBanner(msg: string, yPos: number, color = '#F8FAFC', bgColor = '#0F172ACC'): void {
    const height = this.cameras.main.height;
    this.sonarHintText.setText(msg);
    this.sonarHintText.setColor(color);
    this.sonarHintText.setBackgroundColor(bgColor);
    this.sonarHintText.setPosition(this.cameras.main.width / 2, Phaser.Math.Clamp(yPos - 45, 110, height - 120));
    this.sonarHintText.setAlpha(1.0);
    this.sonarHintTimer = 2.8;
  }

  private showInsufficientFundsToast(required: number): void {
    AudioManager.getInstance().playUiClick();
    this.showScanBanner(`⚠️ ${t('scan.notEnoughCredits')} (${required} CR)`, 200, '#FCA5A5', '#450A0ACC');
  }

  /**
   * Interactive Pipeline Builder (Slot 3: Rohr)
   */
  public handlePipePointerDown(x: number, y: number): void {
    const height = this.cameras.main.height;

    // Check if clicked on/near a pocket
    const nearestPocket = this.cloudGrid?.getPockets().find((p) => Math.hypot(p.x - x, p.y - y) < Math.max(35, p.radius + 12));
    if (nearestPocket) {
      this.pipeDragStart = { x: nearestPocket.x, y: nearestPocket.y, type: 'pocket', pocketId: nearestPocket.id };
      this.isBuildingPipe = true;
      return;
    }

    // Check if clicked near custom balloon
    const nearestBalloon = this.customBalloons.find((b) => Math.hypot(b.x - x, b.y - y) < 30);
    if (nearestBalloon) {
      this.pipeDragStart = { x: nearestBalloon.x, y: nearestBalloon.y, type: 'balloon' };
      this.isBuildingPipe = true;
      return;
    }

    // Check if clicked near platform
    const platformX = this.platform?.x ?? 270;
    const platformY = this.platform?.y ?? 80;
    if (Math.hypot(platformX - x, platformY - y) < 75) {
      this.pipeDragStart = { x: platformX, y: platformY + 10, type: 'platform' };
      this.isBuildingPipe = true;
      return;
    }

    // Default sky start point
    this.pipeDragStart = { x, y: Phaser.Math.Clamp(y, 75, height - 80), type: 'platform' };
    this.isBuildingPipe = true;
  }

  public handlePipePointerUp(x: number, y: number): void {
    if (!this.pipeDragStart) return;

    const dist = Math.hypot(x - this.pipeDragStart.x, y - this.pipeDragStart.y);
    if (dist < 20) {
      this.pipeDragStart = null;
      this.isBuildingPipe = false;
      return;
    }

    let targetX = x;
    let targetY = y;
    let targetType: 'platform' | 'tank' | 'pocket' | 'balloon' = 'pocket';
    let targetPocketId: string | undefined = undefined;

    const nearestPocket = this.cloudGrid?.getPockets().find((p) => Math.hypot(p.x - x, p.y - y) < Math.max(35, p.radius + 12));
    if (nearestPocket) {
      targetX = nearestPocket.x;
      targetY = nearestPocket.y;
      targetType = 'pocket';
      targetPocketId = nearestPocket.id;
    } else {
      const nearestBalloon = this.customBalloons.find((b) => Math.hypot(b.x - x, b.y - y) < 30);
      if (nearestBalloon) {
        targetX = nearestBalloon.x;
        targetY = nearestBalloon.y;
        targetType = 'balloon';
      }
    }

    this.buildPipe(
      this.pipeDragStart.x,
      this.pipeDragStart.y,
      targetX,
      targetY,
      this.pipeDragStart.type,
      targetType,
      this.pipeDragStart.pocketId,
      targetPocketId
    );

    this.pipeDragStart = null;
    this.isBuildingPipe = false;
  }

  public buildPipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    sourceType: 'platform' | 'tank' | 'pocket' | 'balloon' = 'platform',
    targetType: 'platform' | 'tank' | 'pocket' | 'balloon' = 'pocket',
    sourcePocketId?: string,
    targetPocketId?: string
  ): boolean {
    const gs = GameState.getInstance();
    const pipeCost = 30;
    if (gs.getCredits() < pipeCost) {
      this.showScanBanner(t('logisticsTool.notEnoughCreditsPipe'), (startY + endY) / 2, '#FCA5A5', '#450A0ACC');
      AudioManager.getInstance().playUiClick();
      return false;
    }

    gs.deductCredits(pipeCost);
    this.updateCreditsDisplay();
    AudioManager.getInstance().playValveOpen();

    this.customPipes.push({
      id: `pipe-${Date.now()}-${this.customPipes.length + 1}`,
      startX,
      startY,
      endX,
      endY,
      sourceType,
      targetType,
      sourcePocketId,
      targetPocketId,
      flowTimer: 0,
    });

    this.showScanBanner(t('logisticsTool.pipeConnected'), (startY + endY) / 2, '#67E8F9', '#083344EE');
    return true;
  }

  /**
   * Interactive Storage Balloon Placement (Slot 4: Speicher)
   */
  public handleTankPointerDown(x: number, y: number): void {
    const width = this.cameras.main.width;
    const ghostX = Phaser.Math.Clamp(x, 40, width - 40);
    const ghostY = Phaser.Math.Clamp(y, 70, 120);
    this.placeStorageBalloon(ghostX, ghostY);
  }

  public placeStorageBalloon(x: number, y: number): boolean {
    const gs = GameState.getInstance();
    const tankCost = 100;
    if (gs.getCredits() < tankCost) {
      this.showScanBanner(t('logisticsTool.notEnoughCreditsTank'), y, '#FCA5A5', '#450A0ACC');
      AudioManager.getInstance().playUiClick();
      return false;
    }

    gs.deductCredits(tankCost);
    gs.expandStorage(40);
    this.updateCreditsDisplay();
    this.updateTankDisplay();
    AudioManager.getInstance().playCableRelease();

    this.customBalloons.push({
      id: `balloon-${Date.now()}-${this.customBalloons.length + 1}`,
      x,
      y: Phaser.Math.Clamp(y, 70, 120),
      capacity: 40,
      bobPhase: Math.random() * Math.PI * 2,
    });

    this.showScanBanner(t('logisticsTool.tankAnchored'), y + 30, '#FDE047', '#451A03EE');
    return true;
  }

  public getCustomPipes(): ReadonlyArray<CustomPipe> {
    return this.customPipes;
  }

  public getCustomBalloons(): ReadonlyArray<CustomBalloon> {
    return this.customBalloons;
  }

  public getSkyRivals(): ReadonlyArray<SkyRival> {
    return this.skyRivals;
  }

  public getReplenishBannerVisible(): boolean {
    return this.replenishBannerContainer?.visible ?? false;
  }

  /**
   * Dispatches the 3 graduated scanning mechanics (Windfühler, Echo-Drohne, Spektralscan)
   */
  public handleScanAction(x: number, y: number): void {
    const gs = GameState.getInstance();

    // 1. Windfühler (50 CR)
    if (this.activeScanTool === 'wind_sensor') {
      const cost = 50;
      if (!gs.deductCredits(cost)) {
        this.showInsufficientFundsToast(cost);
        return;
      }
      this.updateCreditsDisplay();

      const maxPingRadius = 160;
      const nearest = this.cloudGrid.findNearestPocket(x, y);
      let distanceRatio = 1.0;
      let hintMsg = t('sonar.colder');
      let pingColor: number = ColorPalette.highZone.turquoiseCrystalNum;

      if (nearest) {
        distanceRatio = nearest.distance / maxPingRadius;
        if (nearest.distance < 70) {
          hintMsg = `${t('sonar.veryHot')} (${nearest.pocket.name})`;
          pingColor = ColorPalette.lowZone.glowGoldNum;
        } else if (nearest.distance < maxPingRadius) {
          hintMsg = `${t('sonar.warmer')} (${nearest.pocket.name})`;
          pingColor = ColorPalette.midZone.condensateDropNum;
        } else {
          hintMsg = `${t('sonar.colder')} • ${t('sonar.signalWeak')}`;
        }
      }

      AudioManager.getInstance().playSonarPing(distanceRatio);

      // Hint all concealed pockets within 160px
      this.cloudGrid.hintPocketsInRadius(x, y, maxPingRadius);

      this.activeSonarPulses.push({
        x,
        y,
        radius: 10,
        maxRadius: maxPingRadius,
        alpha: 0.9,
        color: pingColor,
      });

      this.showScanBanner(hintMsg, y, '#E2E8F0', '#0F172ACC');
      return;
    }

    // 2. Echo-Drohne (150 CR)
    if (this.activeScanTool === 'echo_drone') {
      const cost = 150;
      if (!gs.deductCredits(cost)) {
        this.showInsufficientFundsToast(cost);
        return;
      }
      this.updateCreditsDisplay();

      AudioManager.getInstance().playScanTelemetry();

      const layerHeight = (this.cloudGrid.gridBottomY - this.cloudGrid.gridTopY) / this.cloudGrid.layers;
      const layerIdx = Phaser.Math.Clamp(Math.floor((y - this.cloudGrid.gridTopY) / layerHeight), 0, 11);
      const layerCenterY = this.cloudGrid.gridTopY + (layerIdx + 0.5) * layerHeight;

      // Hint all concealed pockets in this altitude layer
      this.cloudGrid.hintPocketsInLayer(layerIdx);

      // Spawn animated horizontal drone scan flight
      const width = this.cameras.main.width;
      this.activeDroneScans.push({
        x: 0,
        y: layerCenterY,
        targetX: width + 40,
        layer: layerIdx,
        speed: (width + 80) / 1.3,
        pulseTimer: 0,
      });

      this.showScanBanner(`🚁 ${t('scan.droneScanning')} (${t('header.layer') || 'Layer'} ${layerIdx + 1}/12)`, layerCenterY, '#5EEAD4', '#042F2ECC');
      return;
    }

    // 3. Spektralscan (400 CR)
    if (this.activeScanTool === 'spectral_scan') {
      const cost = 400;
      if (!gs.deductCredits(cost)) {
        this.showInsufficientFundsToast(cost);
        return;
      }
      this.updateCreditsDisplay();

      AudioManager.getInstance().playScanTelemetry();

      const scanRadius = 200;
      const revealed = this.cloudGrid.revealPocketsInRadius(x, y, scanRadius);
      if (revealed.length > 0) {
        AudioManager.getInstance().playPocketHit();
      }

      this.activeSpectralScans.push({
        x,
        y,
        currentRadius: 10,
        maxRadius: scanRadius,
        alpha: 1.0,
      });

      const bannerText = revealed.length > 0
        ? `${t('scan.spectralFound')} (${revealed.map((p) => p.name).join(', ')})`
        : t('scan.spectralEmpty');

      this.showScanBanner(bannerText, y, '#D8B4FE', '#2E1065CC');
      return;
    }
  }

  /**
   * Backward-compatible Windfühler trigger
   */
  public triggerWindSensor(x: number, y: number): void {
    this.activeScanTool = 'wind_sensor';
    this.handleScanAction(x, y);
  }

  public update(_time: number, delta: number): void {
    const isModalOpen = CouncilModal.getInstance().isOpen() || SummaryModal.getInstance().isOpen() || HarborModal.getInstance().isOpen() || TutorialModal.getInstance().isOpen();
    const gameSpeed = isModalOpen ? 0 : GameState.getInstance().getGameSpeed();
    if (gameSpeed <= 0) {
      return;
    }

    const dt = Math.min(0.1, (delta / 1000) * gameSpeed);
    this.timeElapsed += dt;
    const width = this.cameras.main.width;

    // 1. Gently sway suspended platform
    const swayAngle = Math.sin(this.timeElapsed * 1.2) * 1.5;
    const swayY = Math.sin(this.timeElapsed * 2.0) * 2;
    this.platform.setAngle(swayAngle);
    this.platform.setY(80 + swayY);
    const winchX = width / 2;
    const winchY = 80 + swayY + 12;

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

    // 7b. Render Logistics Network (Condenser, Pipes, Tanks & Status)
    this.renderLogisticsNetwork(winchX, 80 + swayY, dt);

    // 7c. Render Interactive Logistics (Custom Pipes, Custom Balloons, Reticle & Ghost Balloon)
    this.renderInteractiveLogistics(winchX, 80 + swayY);

    // 7d. Update & Render Sky Arena AI Rivals
    this.updateSkyRivals(dt);
    this.renderSkyRivalsGraphics();

    // 7e. Cloud Replenishment Action Banner
    this.updateReplenishBanner();

    // 8. Render Sonar Waves & HUD
    this.renderSonarFX(dt);

    // 9. Update background drifting clouds
    this.updateClouds(width, dt);

    // 10. Weekly advance & Evaporation cycle (every 60 seconds)
    this.weekTimer += dt;
    GameState.getInstance().setWeekTimer(this.weekTimer);

    // Real-time Header Progress Bar Update
    const weekProgress = Math.min(1.0, this.weekTimer / 60.0);
    const progressBar = document.getElementById('header-week-progressbar');
    const timerText = document.getElementById('header-week-timer-text');
    if (progressBar) {
      progressBar.style.width = `${(weekProgress * 100).toFixed(1)}%`;
    }
    if (timerText) {
      timerText.textContent = `${Math.ceil(60 - this.weekTimer)}s`;
    }

    if (this.weekTimer >= 60.0) {
      this.weekTimer = 0;
      GameState.getInstance().setWeekTimer(0);
      const gs = GameState.getInstance();
      const prevWeek = gs.getData().week;
      gs.advanceWeek();
      const newWeek = gs.getData().week;
      this.currentWeek = newWeek;
      this.updateHeaderLabels();
      this.updateTankDisplay();

      // Trigger Council Session in Week 4, 8, and 12
      if (newWeek === 4 || newWeek === 8 || newWeek === 12) {
        if (!gs.getCouncilEngine().isSessionCompleted(newWeek)) {
          CouncilModal.getInstance().open('session', newWeek);
        }
      }

      // Trigger Season Finale Summary after Week 12 completes
      if (prevWeek === 12) {
        SummaryModal.getInstance().open();
      }
    }
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

      // Docking trigger & blind drill discovery (< 35px or dist < p.radius + 14)
      const dockThreshold = Math.max(35, p.radius + 14);
      if (!this.isDocked && dist < dockThreshold) {
        // Blind Drilling Discovery: immediate reveal
        const wasUnrevealed = p.discoveryState === 'concealed' || p.discoveryState === 'hinted';
        if (wasUnrevealed) {
          p.discoveryState = 'revealed';
          this.showScanBanner(`${t('scan.blindDiscovery')} (${p.name})`, p.y, '#FDE047', '#1E1B4BCC');
        }

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

        // Check Aurora Discovery Bonus (+1 Council Share)
        if (p.isAurora && !p.hasAwardedAurora) {
          p.hasAwardedAurora = true;
          const gs = GameState.getInstance();
          gs.addAuroraShares(1);
          AudioManager.getInstance().playShareWon();
          this.showAuroraNotification();
          this.updateHeaderLabels();
        }
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

        // Visible Extraction Flow via Core Logistics Net (Phase 2)
        const gs = GameState.getInstance();
        const upgrades = gs.getUpgrades();
        const condenserRate = LogisticsNet.getCondenserRate(upgrades.condenserLevel);
        const pipeCapacity = LogisticsNet.getPipeCapacity(upgrades.pipeLevel);
        const effectiveFlow = this.logisticsNet.calculateEffectiveFlow(condenserRate, pipeCapacity);

        const totalStored = gs.getTotalStored();
        const maxCapacity = gs.getMaxStorageCapacity();
        const availableSpace = Math.max(0, maxCapacity - totalStored);

        const isFull = availableSpace <= 0.05;
        this.currentNetworkStatus = this.logisticsNet.getNetworkStatus(!isFull && p.currentVolume > 0, isFull);

        if (!isFull && p.currentVolume > 0) {
          const rateLimit = Math.min(effectiveFlow, availableSpace / Math.max(0.001, dt));
          const extracted = this.cloudGrid.extractFromPocket(p.id, rateLimit, dt);
          if (extracted > 0) {
            gs.addResource(p.resourceType, extracted);
            this.updateTankDisplay();

            // Spawn sparkling beads traveling up cable
            if (Math.random() < dt * 8.5) {
              let color: number = ColorPalette.midZone.condensateDropNum;
              if (p.resourceType === 'frost') color = ColorPalette.highZone.turquoiseCrystalNum;
              if (p.resourceType === 'storm') color = ColorPalette.lowZone.glowGoldNum;

              this.extractionDroplets.push({
                t: 0.0,
                speed: 0.95 + Math.random() * 0.35,
                color,
                size: 4 + Math.random() * 2,
                resourceType: p.resourceType,
              });
            }
          }
        }
      }
    } else {
      const gs = GameState.getInstance();
      const isFull = gs.getTotalStored() >= gs.getMaxStorageCapacity() - 0.05;
      this.currentNetworkStatus = this.logisticsNet.getNetworkStatus(false, isFull);
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
   * Renders the floating condensate pockets across the 4 discovery states:
   * 'concealed' (0% invisible), 'hinted' (pulsing sonar mist + ?),
   * 'revealed' (radiant colors, symbols, stars, fill arc), 'exhausted' (hollow circle)
   */
  private renderPockets(): void {
    this.pocketsGraphics.clear();
    const pockets = this.cloudGrid.getPockets();

    for (const p of pockets) {
      const labelGroup = this.pocketLabels.get(p.id);
      const isDepleted = p.isDepleted || p.discoveryState === 'exhausted';

      // 1. Exhausted state: hollow drained circle
      if (isDepleted) {
        this.pocketsGraphics.lineStyle(1.5, 0x64748B, 0.4);
        this.pocketsGraphics.strokeCircle(p.x, p.y, p.radius * 0.7);
        if (labelGroup) {
          labelGroup.hintText.setVisible(false);
          labelGroup.symbolText.setVisible(false);
          labelGroup.qualityText.setVisible(false);
        }
        continue;
      }

      // 2. Concealed state: completely invisible in cloud layer
      if (p.discoveryState === 'concealed') {
        if (labelGroup) {
          labelGroup.hintText.setVisible(false);
          labelGroup.symbolText.setVisible(false);
          labelGroup.qualityText.setVisible(false);
        }
        continue;
      }

      // 3. Hinted state: pulsating misty fog marker with (?) echo signal
      if (p.discoveryState === 'hinted') {
        const pulse = Math.sin(this.timeElapsed * 4 + p.baseY * 0.05);
        const hintRadius = p.radius + pulse * 2.5;

        // Faint outer sonar ripple
        this.pocketsGraphics.lineStyle(1.5, 0x38BDF8, 0.45 + 0.25 * Math.sin(this.timeElapsed * 5));
        this.pocketsGraphics.strokeCircle(p.x, p.y, hintRadius + 5);

        // Misty translucent nebula core
        this.pocketsGraphics.fillStyle(0x0284C7, 0.2 + 0.08 * Math.sin(this.timeElapsed * 3));
        this.pocketsGraphics.fillCircle(p.x, p.y, hintRadius);

        // Inner dotted/accent ring
        this.pocketsGraphics.lineStyle(1.5, 0x7DD3FC, 0.65);
        this.pocketsGraphics.strokeCircle(p.x, p.y, hintRadius * 0.6);

        if (labelGroup) {
          labelGroup.hintText.setPosition(p.x, p.y).setVisible(true);
          labelGroup.symbolText.setVisible(false);
          labelGroup.qualityText.setVisible(false);
        }
        continue;
      }

      // 4. Revealed state: radiant zone colors, jewel highlight, resource symbol, star quality & fill gauge
      const volumeRatio = p.currentVolume / p.maxCapacity;

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

      // Soft radiant glow aura
      this.pocketsGraphics.fillStyle(accentColor, 0.25);
      this.pocketsGraphics.fillCircle(p.x, p.y, effectiveRadius + 6);

      // Core liquid / crystal body
      this.pocketsGraphics.fillStyle(primaryColor, 0.85);
      this.pocketsGraphics.fillCircle(p.x, p.y, effectiveRadius);

      // Inner jewel highlight
      this.pocketsGraphics.fillStyle(accentColor, 0.9);
      this.pocketsGraphics.fillCircle(p.x - effectiveRadius * 0.3, p.y - effectiveRadius * 0.3, effectiveRadius * 0.28);

      // Fill level gauge arc around pocket
      this.pocketsGraphics.lineStyle(2, 0xE2E8F0, 0.7);
      this.pocketsGraphics.beginPath();
      this.pocketsGraphics.arc(p.x, p.y, effectiveRadius + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * volumeRatio, false);
      this.pocketsGraphics.strokePath();

      // Docked indicator ring
      if (this.isDocked && this.dockedPocket === p) {
        this.pocketsGraphics.lineStyle(2, ColorPalette.uiHarbor.brassNum, 0.95);
        this.pocketsGraphics.strokeCircle(p.x, p.y, effectiveRadius + 5);
      }

      // Aurora Shimmering Ring
      if (p.isAurora) {
        this.pocketsGraphics.lineStyle(2.5, ColorPalette.lowZone.auroraPinkNum, 0.85);
        this.pocketsGraphics.strokeCircle(p.x, p.y, effectiveRadius + 8 + Math.sin(this.timeElapsed * 4) * 2);
      }

      // Text labels for revealed pocket: resource symbol & star quality
      if (labelGroup) {
        labelGroup.hintText.setVisible(false);
        labelGroup.symbolText.setPosition(p.x, p.y - 4).setVisible(true);
        labelGroup.qualityText.setPosition(p.x, p.y + 11).setVisible(true);
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
        this.spawnPipeDroplet(drop.color);
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
   * Spawns flowing pearl droplet traveling through platform pipes to tank balloons
   */
  private spawnPipeDroplet(color: number): void {
    const dest = Math.random() < 0.5 ? 'leftTank' : 'rightTank';
    this.pipeDroplets.push({
      t: 0.0,
      speed: 1.4 + Math.random() * 0.4,
      color,
      destination: dest,
    });
  }

  /**
   * Renders the complete Logistics Network (Phase 2):
   * Condenser unit on platform, floating tank balloons on flanks with fill gauges,
   * pipelines connecting condenser to tanks and harbor, flowing droplet particles,
   * and visual status indicators (active dots, full lock symbol 🔒, blocked warning triangle ⚠️).
   */
  private renderLogisticsNetwork(platformX: number, platformY: number, dt: number): void {
    this.pipesGraphics.clear();
    this.tanksGraphics.clear();
    this.logisticsStatusGraphics.clear();

    const gs = GameState.getInstance();
    const upgrades = gs.getUpgrades();
    const inventory = gs.getInventory();
    const totalStored = gs.getTotalStored();
    const maxCapacity = gs.getMaxStorageCapacity();
    const fillRatio = Math.min(1.0, totalStored / maxCapacity);
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Tank Ballon dimensions & coordinates (scales with tank upgrade level)
    const tankRadius = 14 + upgrades.tankLevel * 4;
    const leftTankX = platformX - 70 - (upgrades.tankLevel - 1) * 3;
    const rightTankX = platformX + 70 + (upgrades.tankLevel - 1) * 3;
    const leftTankY = platformY + Math.sin(this.timeElapsed * 1.8) * 2;
    const rightTankY = platformY + Math.sin(this.timeElapsed * 1.8 + 1.2) * 2;

    // 1. Structural suspension struts from platform to balloon tanks
    this.pipesGraphics.lineStyle(1.5, 0x475569, 0.65);
    this.pipesGraphics.lineBetween(platformX - 40, platformY, leftTankX, leftTankY);
    this.pipesGraphics.lineBetween(platformX + 40, platformY, rightTankX, rightTankY);

    // 2. Pipelines (Slot 3)
    const manifoldX = platformX;
    const manifoldY = platformY + 8;

    const leftPipeCurve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(manifoldX, manifoldY),
      new Phaser.Math.Vector2(platformX - 35, platformY + 16),
      new Phaser.Math.Vector2(leftTankX, leftTankY + tankRadius * 0.5)
    );

    const rightPipeCurve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(manifoldX, manifoldY),
      new Phaser.Math.Vector2(platformX + 35, platformY + 16),
      new Phaser.Math.Vector2(rightTankX, rightTankY + tankRadius * 0.5)
    );

    const harborPipeCurve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(rightTankX, rightTankY + tankRadius * 0.5),
      new Phaser.Math.Vector2(width - 45, height * 0.5),
      new Phaser.Math.Vector2(width - 90, height - 70)
    );

    // Pipe stroke styling based on status
    if (this.currentNetworkStatus === 'blocked') {
      this.pipesGraphics.lineStyle(2, 0xF59E0B, 0.9);
    } else if (this.currentNetworkStatus === 'full') {
      this.pipesGraphics.lineStyle(2.5, 0x64748B, 0.85);
    } else if (this.currentNetworkStatus === 'active') {
      const glow = 0.75 + Math.sin(this.timeElapsed * 7) * 0.25;
      this.pipesGraphics.lineStyle(3, 0x38BDF8, glow);
    } else {
      this.pipesGraphics.lineStyle(2, 0x334155, 0.6);
    }

    const ptsLeft = leftPipeCurve.getPoints(16);
    const ptsRight = rightPipeCurve.getPoints(16);
    const ptsHarbor = harborPipeCurve.getPoints(24);
    this.pipesGraphics.strokePoints(ptsLeft);
    this.pipesGraphics.strokePoints(ptsRight);
    this.pipesGraphics.strokePoints(ptsHarbor);

    // Pipe Droplets (pearl particles traveling in pipes)
    for (let i = this.pipeDroplets.length - 1; i >= 0; i--) {
      const drop = this.pipeDroplets[i];
      drop.t += drop.speed * dt;
      if (drop.t >= 1.0) {
        this.pipeDroplets.splice(i, 1);
        continue;
      }
      const curve = drop.destination === 'leftTank' ? leftPipeCurve : rightPipeCurve;
      const pt = curve.getPoint(drop.t);
      this.pipesGraphics.fillStyle(drop.color, 0.95);
      this.pipesGraphics.fillCircle(pt.x, pt.y, 3.5);
      this.pipesGraphics.fillStyle(0xFFFFFF, 0.8);
      this.pipesGraphics.fillCircle(pt.x, pt.y, 1.5);
    }

    // Active flowing dots (fließende Punkte) along the pipes
    if (this.currentNetworkStatus === 'active') {
      for (let dot = 0; dot < 4; dot++) {
        const tVal = ((this.timeElapsed * 1.5 + dot * 0.25) % 1.0);
        const ptL = leftPipeCurve.getPoint(tVal);
        const ptR = rightPipeCurve.getPoint(tVal);
        this.pipesGraphics.fillStyle(0x7DD3FC, 0.8);
        this.pipesGraphics.fillCircle(ptL.x, ptL.y, 2.5);
        this.pipesGraphics.fillCircle(ptR.x, ptR.y, 2.5);
      }
    }

    // 3. Floating Balloon Tanks (Slot 4)
    let dominantColor: number = ColorPalette.midZone.condensateDropNum;
    if (inventory.frost > inventory.skywater && inventory.frost > inventory.storm) {
      dominantColor = ColorPalette.highZone.turquoiseCrystalNum;
    } else if (inventory.storm > inventory.skywater && inventory.storm > inventory.frost) {
      dominantColor = ColorPalette.lowZone.glowGoldNum;
    }

    const drawTank = (bx: number, by: number) => {
      // Outer balloon hull
      this.tanksGraphics.fillStyle(0x0F172A, 0.88);
      this.tanksGraphics.fillCircle(bx, by, tankRadius);
      this.tanksGraphics.lineStyle(1.5, 0x64748B, 0.8);
      this.tanksGraphics.strokeCircle(bx, by, tankRadius);

      // Fluid fill level
      if (fillRatio > 0.02) {
        const effectiveFillRadius = tankRadius * Math.min(1.0, 0.35 + fillRatio * 0.65);
        this.tanksGraphics.fillStyle(dominantColor, 0.85);
        this.tanksGraphics.fillCircle(bx, by + (tankRadius - effectiveFillRadius) * 0.35, effectiveFillRadius);
      }

      // Glass specular highlight arc
      this.tanksGraphics.lineStyle(1.5, 0xFFFFFF, 0.5);
      this.tanksGraphics.beginPath();
      this.tanksGraphics.arc(bx - tankRadius * 0.3, by - tankRadius * 0.3, tankRadius * 0.5, -Math.PI * 0.7, -Math.PI * 0.1);
      this.tanksGraphics.stroke();

      // Brass bottom valve collar
      this.tanksGraphics.fillStyle(ColorPalette.uiHarbor.brassNum, 0.95);
      this.tanksGraphics.fillRect(bx - 3, by + tankRadius - 1, 6, 4);
    };

    drawTank(leftTankX, leftTankY);
    drawTank(rightTankX, rightTankY);

    // 4. Platform Condenser Unit
    // Housing
    this.tanksGraphics.fillStyle(ColorPalette.uiHarbor.darkSlateNum, 0.95);
    this.tanksGraphics.fillRoundedRect(platformX - 16, platformY - 8, 32, 14, 3);
    this.tanksGraphics.lineStyle(1.5, ColorPalette.uiHarbor.brassNum, 0.9);
    this.tanksGraphics.strokeRoundedRect(platformX - 16, platformY - 8, 32, 14, 3);

    // Condenser Coils (visual cue for condenser level)
    for (let c = 0; c < upgrades.condenserLevel; c++) {
      this.tanksGraphics.lineStyle(1.5, 0x38BDF8, 0.8);
      this.tanksGraphics.lineBetween(platformX - 10 + c * 8, platformY - 6, platformX - 10 + c * 8, platformY + 4);
    }

    // 5. Logistics Status Symbol (aktiv = fließende Punkte, voll = Schloss, blockiert = Warndreieck)
    const statusX = platformX;
    const statusY = platformY + 24;

    if (this.currentNetworkStatus === 'full') {
      // Schloss-Symbol (Lock icon 🔒)
      // Shackle
      this.logisticsStatusGraphics.lineStyle(2, 0xF59E0B, 1.0);
      this.logisticsStatusGraphics.beginPath();
      this.logisticsStatusGraphics.arc(statusX, statusY - 5, 5, -Math.PI, 0);
      this.logisticsStatusGraphics.stroke();
      // Body
      this.logisticsStatusGraphics.fillStyle(0xF59E0B, 1.0);
      this.logisticsStatusGraphics.fillRoundedRect(statusX - 7, statusY - 3, 14, 11, 2);
      // Keyhole
      this.logisticsStatusGraphics.fillStyle(0x0F172A, 1.0);
      this.logisticsStatusGraphics.fillCircle(statusX, statusY + 2, 1.8);
    } else if (this.currentNetworkStatus === 'blocked') {
      // Warndreieck (Warning triangle ⚠️)
      this.logisticsStatusGraphics.fillStyle(0xF59E0B, 1.0);
      this.logisticsStatusGraphics.fillTriangle(statusX, statusY - 9, statusX - 8, statusY + 6, statusX + 8, statusY + 6);
      this.logisticsStatusGraphics.fillStyle(0x0F172A, 1.0);
      this.logisticsStatusGraphics.fillRect(statusX - 1, statusY - 4, 2, 5);
      this.logisticsStatusGraphics.fillCircle(statusX, statusY + 3.5, 1.2);
    } else if (this.currentNetworkStatus === 'active') {
      // Flowing green/cyan pulse
      const dotPulse = 0.6 + Math.sin(this.timeElapsed * 10) * 0.4;
      this.logisticsStatusGraphics.fillStyle(0x10B981, dotPulse);
      this.logisticsStatusGraphics.fillCircle(statusX, statusY, 4.5);
    } else {
      // Idle standby dot
      this.logisticsStatusGraphics.fillStyle(0x475569, 0.6);
      this.logisticsStatusGraphics.fillCircle(statusX, statusY, 3);
    }
  }

  private updateHeaderLabels(): void {
    const seasonEl = document.getElementById('header-season-label');
    const weekEl = document.getElementById('header-week-label');
    const councilBadge = document.getElementById('header-council-badge');
    const gs = GameState.getInstance().getData();
    if (seasonEl) seasonEl.textContent = `${t('header.season')} ${gs.season}`;
    if (weekEl) weekEl.textContent = `${t('header.week')} ${gs.week}/12`;
    if (councilBadge) councilBadge.textContent = `${gs.councilShares}/30`;
    this.updateCreditsDisplay();
  }

  private showAuroraNotification(): void {
    const width = this.cameras.main.width;
    const notify = this.add.text(width / 2, 175, t('council.auroraFoundNotice'), {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#F472B6',
      backgroundColor: '#1E1B4B',
      padding: { x: 12, y: 6 },
    });
    notify.setOrigin(0.5);
    notify.setDepth(45);
    this.tweens.add({
      targets: notify,
      y: 125,
      alpha: 0,
      duration: 2600,
      ease: 'Power1',
      onComplete: () => notify.destroy(),
    });
  }

  /**
   * Renders expanding sonar rings, flying echo drone acoustic waves, and spectral scan grids
   */
  private renderSonarFX(dt: number): void {
    this.fxGraphics.clear();

    // 1. Windfühler Sonar expanding rings
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

    // 2. Echo Drone horizontal layer sweeps & animated drone
    for (let i = this.activeDroneScans.length - 1; i >= 0; i--) {
      const d = this.activeDroneScans[i];
      d.x += d.speed * dt;
      d.pulseTimer += dt;

      // Trailing acoustic wave across the layer
      this.fxGraphics.lineStyle(2.5, 0x14B8A6, 0.75);
      this.fxGraphics.lineBetween(0, d.y, Math.min(d.x, this.cameras.main.width), d.y);

      // Trailing sonar ripple
      this.fxGraphics.lineStyle(1.5, 0x2DD4BF, 0.45);
      this.fxGraphics.strokeCircle(Math.max(0, d.x - 22), d.y, 10 + Math.sin(d.pulseTimer * 12) * 4);

      // Animated drone chassis
      this.fxGraphics.fillStyle(0x0F172A, 0.95);
      this.fxGraphics.fillRoundedRect(d.x - 12, d.y - 6, 24, 12, 3);
      this.fxGraphics.lineStyle(1.5, 0x2DD4BF, 1.0);
      this.fxGraphics.strokeRoundedRect(d.x - 12, d.y - 6, 24, 12, 3);

      // Rotor blades spinning
      const rotor = Math.sin(this.timeElapsed * 35) * 8;
      this.fxGraphics.lineBetween(d.x - 13 - rotor, d.y - 7, d.x - 13 + rotor, d.y - 7);
      this.fxGraphics.lineBetween(d.x + 13 - rotor, d.y - 7, d.x + 13 + rotor, d.y - 7);

      // Forward sensor beam
      this.fxGraphics.fillStyle(0x5EEAD4, 0.35);
      this.fxGraphics.fillTriangle(d.x + 10, d.y, d.x + 40, d.y - 12, d.x + 40, d.y + 12);

      if (d.x >= d.targetX) {
        this.activeDroneScans.splice(i, 1);
      }
    }

    // 3. Spectral Scan precision deep-scan rings & grid
    for (let i = this.activeSpectralScans.length - 1; i >= 0; i--) {
      const s = this.activeSpectralScans[i];
      s.currentRadius += (s.maxRadius / 0.8) * dt;
      s.alpha = Math.max(0, 1.0 - s.currentRadius / s.maxRadius);

      // Shimmering outer rings
      this.fxGraphics.lineStyle(2, 0xA855F7, s.alpha);
      this.fxGraphics.strokeCircle(s.x, s.y, s.currentRadius);
      this.fxGraphics.lineStyle(1.5, 0x38BDF8, s.alpha * 0.8);
      this.fxGraphics.strokeCircle(s.x, s.y, s.currentRadius * 0.65);

      // Scanning crosshairs
      this.fxGraphics.lineStyle(1, 0xE0E7FF, s.alpha * 0.5);
      this.fxGraphics.lineBetween(s.x - s.currentRadius, s.y, s.x + s.currentRadius, s.y);
      this.fxGraphics.lineBetween(s.x, s.y - s.currentRadius, s.x, s.y + s.currentRadius);

      // Soft purple holographic aura
      this.fxGraphics.fillStyle(0x7C3AED, s.alpha * 0.12);
      this.fxGraphics.fillCircle(s.x, s.y, s.currentRadius);

      if (s.currentRadius >= s.maxRadius) {
        this.activeSpectralScans.splice(i, 1);
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

  /**
   * Initializes the 3 visible AI Rivals in the sky arena
   */
  private initSkyRivals(width: number): void {
    this.skyRivals.forEach((r) => {
      r.nameText?.destroy();
      r.counterText?.destroy();
    });

    this.skyRivals = [
      {
        id: 'daredevil',
        nameKey: 'rivals.daredevil',
        symbol: '⚡',
        x: width * 0.16,
        y: 95,
        baseXRatio: 0.16,
        baseY: 95,
        color: 0xEF4444, // Red aerostat
        accentColor: 0xF59E0B, // Brass
        flagColor: 0xDC2626,
        totalHarvested: 0,
        targetPocketId: null,
        drillX: 0,
        drillY: 0,
        cableT: 0,
        isDrilling: false,
        drillTimer: 0,
        decisionCooldown: 3.5,
      },
      {
        id: 'calculator',
        nameKey: 'rivals.calculator',
        symbol: '📐',
        x: width * 0.84,
        y: 100,
        baseXRatio: 0.84,
        baseY: 100,
        color: 0x10B981, // Emerald aerostat
        accentColor: 0xD97706, // Brass
        flagColor: 0x059669,
        totalHarvested: 0,
        targetPocketId: null,
        drillX: 0,
        drillY: 0,
        cableT: 0,
        isDrilling: false,
        drillTimer: 0,
        decisionCooldown: 5.0,
      },
      {
        id: 'tracker',
        nameKey: 'rivals.tracker',
        symbol: '🔬',
        x: width * 0.68,
        y: 115,
        baseXRatio: 0.68,
        baseY: 115,
        color: 0x8B5CF6, // Amethyst aerostat
        accentColor: 0x06B6D4, // Turquoise
        flagColor: 0x7C3AED,
        totalHarvested: 0,
        targetPocketId: null,
        drillX: 0,
        drillY: 0,
        cableT: 0,
        isDrilling: false,
        drillTimer: 0,
        decisionCooldown: 7.0,
      },
    ];

    for (const rival of this.skyRivals) {
      rival.nameText = this.add.text(rival.x, rival.y - 26, `${rival.symbol} ${t(rival.nameKey)}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#F8FAFC',
        stroke: '#0F172A',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(11);

      rival.counterText = this.add.text(rival.x, rival.y - 14, `0 E`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#FDE047',
        stroke: '#0F172A',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(11);
    }
  }

  /**
   * Updates autonomous AI rival drilling, decision making, and tug-of-war contests
   */
  private updateSkyRivals(dt: number): void {
    const width = this.cameras.main.width;
    if (this.lastContestedAlertTimer > 0) {
      this.lastContestedAlertTimer -= dt;
    }

    for (let idx = 0; idx < this.skyRivals.length; idx++) {
      const rival = this.skyRivals[idx];
      rival.x = width * rival.baseXRatio + Math.cos(this.timeElapsed * 1.2 + idx * 2) * 5;
      rival.y = rival.baseY + Math.sin(this.timeElapsed * 1.6 + idx * 1.7) * 3;

      if (rival.nameText) {
        rival.nameText.setPosition(rival.x, rival.y - 26);
      }
      if (rival.counterText) {
        rival.counterText.setPosition(rival.x, rival.y - 14);
        rival.counterText.setText(`${Math.floor(rival.totalHarvested)} E`);
      }

      // Autonomous drilling decision AI
      if (!rival.isDrilling) {
        rival.decisionCooldown -= dt;
        if (rival.decisionCooldown <= 0) {
          const candidates = this.cloudGrid?.getPockets().filter((p) => !p.isDepleted && p.currentVolume > 2) ?? [];
          if (candidates.length > 0) {
            let target = candidates[0];
            if (rival.id === 'daredevil') {
              candidates.sort((a, b) => (b.quality ?? 1) - (a.quality ?? 1) || Math.abs(a.x - rival.x) - Math.abs(b.x - rival.x));
              target = candidates[0];
            } else if (rival.id === 'calculator') {
              candidates.sort((a, b) => b.currentVolume - a.currentVolume);
              target = candidates[0];
            } else {
              candidates.sort((a, _b) => (a.zone === 'mid' ? -1 : 1));
              target = candidates[0];
            }

            rival.targetPocketId = target.id;
            rival.drillX = target.x;
            rival.drillY = target.y;
            rival.cableT = 0;
            rival.isDrilling = true;
            rival.drillTimer = 7.0 + Math.random() * 5.0;
          } else {
            rival.decisionCooldown = 4.0;
          }
        }
      } else {
        // Active drilling & lowering cable
        rival.cableT = Math.min(1.0, rival.cableT + dt * 1.4);
        const targetPocket = this.cloudGrid?.getPocketById(rival.targetPocketId || '');

        if (!targetPocket || targetPocket.isDepleted || targetPocket.currentVolume <= 0.05) {
          rival.isDrilling = false;
          rival.targetPocketId = null;
          rival.decisionCooldown = 4.0 + Math.random() * 3.0;
        } else {
          rival.drillX = targetPocket.x;
          rival.drillY = targetPocket.y;

          if (rival.cableT >= 1.0) {
            const rivalRate = 4.5;
            const extracted = this.cloudGrid.extractFromPocket(targetPocket.id, rivalRate, dt);
            rival.totalHarvested += extracted;

            // Spawn ascending droplet particle towards rival platform
            if (Math.random() < dt * 6.5) {
              let pColor = 0x38BDF8;
              if (targetPocket.resourceType === 'frost') pColor = 0x7DD3FC;
              if (targetPocket.resourceType === 'storm') pColor = 0xFDE047;
              this.rivalParticles.push({
                x: targetPocket.x,
                y: targetPocket.y,
                targetX: rival.x,
                targetY: rival.y,
                t: 0,
                color: pColor,
              });
            }

            // Tug-of-War contest: Is player also drilling this pocket?
            if (this.isDocked && this.dockedPocket && this.dockedPocket.id === targetPocket.id) {
              if (this.lastContestedAlertTimer <= 0) {
                AudioManager.getInstance().playTensionRise();
                const rivalName = t(rival.nameKey);
                this.showScanBanner(
                  t('arena.rivalContestedNamed').replace('{name}', rivalName),
                  targetPocket.y - 35,
                  '#FCA5A5',
                  '#7F1D1DEE'
                );
                this.lastContestedAlertTimer = 5.0;
              }

              // Spark particles clashing
              this.fxGraphics.fillStyle(0xFDE047, 0.85);
              this.fxGraphics.fillCircle(
                targetPocket.x + (Math.random() - 0.5) * 14,
                targetPocket.y + (Math.random() - 0.5) * 14,
                2
              );
            }

            rival.drillTimer -= dt;
            if (rival.drillTimer <= 0) {
              rival.isDrilling = false;
              rival.targetPocketId = null;
              rival.decisionCooldown = 4.0 + Math.random() * 4.0;
            }
          }
        }
      }
    }

    // Update rising rival particles
    for (let i = this.rivalParticles.length - 1; i >= 0; i--) {
      const p = this.rivalParticles[i];
      p.t += dt * 1.5;
      if (p.t >= 1.0) {
        this.rivalParticles.splice(i, 1);
      }
    }
  }

  /**
   * Renders the visible AI Rival Harvester Platforms, cables, and extraction particles
   */
  private renderSkyRivalsGraphics(): void {
    if (!this.rivalsGraphics || !this.rivalCablesGraphics) return;
    this.rivalsGraphics.clear();
    this.rivalCablesGraphics.clear();

    for (let idx = 0; idx < this.skyRivals.length; idx++) {
      const rival = this.skyRivals[idx];

      // Draw drill cable if drilling
      if (rival.isDrilling && rival.cableT > 0) {
        const curDrillX = rival.x + (rival.drillX - rival.x) * rival.cableT;
        const curDrillY = rival.y + 12 + (rival.drillY - (rival.y + 12)) * rival.cableT;

        this.rivalCablesGraphics.lineStyle(1.8, 0x64748B, 0.9);
        this.rivalCablesGraphics.lineBetween(rival.x, rival.y + 10, curDrillX, curDrillY);

        // Drill head at tip
        this.rivalCablesGraphics.fillStyle(rival.accentColor, 1.0);
        this.rivalCablesGraphics.fillTriangle(
          curDrillX - 4,
          curDrillY - 6,
          curDrillX + 4,
          curDrillY - 6,
          curDrillX,
          curDrillY + 4
        );
      }

      // Draw Aerostat Balloon Hull
      this.rivalsGraphics.fillStyle(rival.color, 0.9);
      this.rivalsGraphics.fillEllipse(rival.x, rival.y, 38, 26);
      this.rivalsGraphics.lineStyle(1.5, rival.accentColor, 0.9);
      this.rivalsGraphics.strokeEllipse(rival.x, rival.y, 38, 26);

      // Specular highlight on balloon
      this.rivalsGraphics.lineStyle(1.5, 0xFFFFFF, 0.5);
      this.rivalsGraphics.beginPath();
      this.rivalsGraphics.arc(rival.x - 7, rival.y - 4, 10, -Math.PI * 0.7, -Math.PI * 0.1);
      this.rivalsGraphics.stroke();

      // Gondola basket underneath
      this.rivalsGraphics.fillStyle(0x0F172A, 0.95);
      this.rivalsGraphics.fillRoundedRect(rival.x - 9, rival.y + 10, 18, 9, 2);
      this.rivalsGraphics.lineStyle(1.2, rival.accentColor, 0.9);
      this.rivalsGraphics.strokeRoundedRect(rival.x - 9, rival.y + 10, 18, 9, 2);

      // Suspension cords to gondola
      this.rivalsGraphics.lineStyle(1, 0x64748B, 0.75);
      this.rivalsGraphics.lineBetween(rival.x - 12, rival.y + 4, rival.x - 8, rival.y + 10);
      this.rivalsGraphics.lineBetween(rival.x + 12, rival.y + 4, rival.x + 8, rival.y + 10);

      // Specific Visual Flavors
      if (rival.id === 'daredevil') {
        const flagWave = Math.sin(this.timeElapsed * 7) * 4;
        this.rivalsGraphics.lineStyle(1.5, 0xCBD5E1, 1.0);
        this.rivalsGraphics.lineBetween(rival.x, rival.y - 13, rival.x, rival.y - 23);
        this.rivalsGraphics.fillStyle(rival.flagColor, 0.95);
        this.rivalsGraphics.fillTriangle(
          rival.x,
          rival.y - 23,
          rival.x + 10 + flagWave,
          rival.y - 18,
          rival.x,
          rival.y - 13
        );
      } else if (rival.id === 'calculator') {
        const gearAngle = this.timeElapsed * 2.5;
        const gx = rival.x;
        const gy = rival.y - 14;
        this.rivalsGraphics.lineStyle(1.5, 0xF59E0B, 0.85);
        this.rivalsGraphics.strokeCircle(gx, gy, 5);
        this.rivalsGraphics.lineBetween(
          gx + Math.cos(gearAngle) * 5,
          gy + Math.sin(gearAngle) * 5,
          gx - Math.cos(gearAngle) * 5,
          gy - Math.sin(gearAngle) * 5
        );
      } else if (rival.id === 'tracker') {
        const radarAngle = this.timeElapsed * 3.5;
        const rx = rival.x;
        const ry = rival.y - 14;
        this.rivalsGraphics.lineStyle(1.5, 0x06B6D4, 0.9);
        this.rivalsGraphics.beginPath();
        this.rivalsGraphics.arc(rx, ry, 6, radarAngle, radarAngle + Math.PI * 0.8);
        this.rivalsGraphics.stroke();
      }
    }

    // Render ascending particles along rival cables
    for (const p of this.rivalParticles) {
      const curX = p.x + (p.targetX - p.x) * p.t;
      const curY = p.y + (p.targetY - p.y) * p.t;
      this.rivalCablesGraphics.fillStyle(p.color, 0.9);
      this.rivalCablesGraphics.fillCircle(curX, curY, 2.5);
    }
  }

  /**
   * Renders user-built Custom Pipelines, Custom Storage Balloons, and active tool previews
   */
  private renderInteractiveLogistics(platformX: number, platformY: number): void {
    if (!this.logisticsInteractiveGraphics) return;
    this.logisticsInteractiveGraphics.clear();
    const width = this.cameras.main.width;

    // 1. Render all Custom Pipes
    for (let i = 0; i < this.customPipes.length; i++) {
      const p = this.customPipes[i];
      const midX = (p.startX + p.endX) / 2;
      const midY = (p.startY + p.endY) / 2 + Math.min(22, Math.hypot(p.endX - p.startX, p.endY - p.startY) * 0.1);

      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(p.startX, p.startY),
        new Phaser.Math.Vector2(midX, midY),
        new Phaser.Math.Vector2(p.endX, p.endY)
      );

      // Cyan outer glow
      this.logisticsInteractiveGraphics.lineStyle(4, 0x0891B2, 0.4);
      this.logisticsInteractiveGraphics.strokePoints(curve.getPoints(16));

      // Crisp Cyan metallic core
      this.logisticsInteractiveGraphics.lineStyle(2, 0x38BDF8, 0.9);
      this.logisticsInteractiveGraphics.strokePoints(curve.getPoints(16));

      // Metallic brass joints at start and end
      this.logisticsInteractiveGraphics.fillStyle(0xF59E0B, 0.95);
      this.logisticsInteractiveGraphics.fillCircle(p.startX, p.startY, 4);
      this.logisticsInteractiveGraphics.fillCircle(p.endX, p.endY, 4);

      // Flowing droplets along pipe
      for (let dot = 0; dot < 2; dot++) {
        const tVal = (this.timeElapsed * 1.4 + i * 0.3 + dot * 0.5) % 1.0;
        const pt = curve.getPoint(tVal);
        this.logisticsInteractiveGraphics.fillStyle(0x67E8F9, 0.9);
        this.logisticsInteractiveGraphics.fillCircle(pt.x, pt.y, 2.5);
      }
    }

    // 2. Render all Custom Balloons
    const totalStored = this.tankStored;
    const maxCapacity = this.tankMax;
    const fillRatio = Math.min(1.0, totalStored / maxCapacity);

    for (let i = 0; i < this.customBalloons.length; i++) {
      const b = this.customBalloons[i];
      const currY = b.y + Math.sin(this.timeElapsed * 1.8 + b.bobPhase) * 2;

      // Suspension cable to platform
      this.logisticsInteractiveGraphics.lineStyle(1.5, 0x475569, 0.7);
      this.logisticsInteractiveGraphics.lineBetween(platformX, platformY, b.x, currY);

      // Outer hull
      this.logisticsInteractiveGraphics.fillStyle(0x0F172A, 0.9);
      this.logisticsInteractiveGraphics.fillCircle(b.x, currY, 16);
      this.logisticsInteractiveGraphics.lineStyle(1.8, 0xF59E0B, 0.9);
      this.logisticsInteractiveGraphics.strokeCircle(b.x, currY, 16);

      // Fluid fill
      if (fillRatio > 0.02) {
        const fillR = 16 * Math.min(1.0, 0.35 + fillRatio * 0.65);
        this.logisticsInteractiveGraphics.fillStyle(0x38BDF8, 0.85);
        this.logisticsInteractiveGraphics.fillCircle(b.x, currY + (16 - fillR) * 0.35, fillR);
      }

      // Specular highlight
      this.logisticsInteractiveGraphics.lineStyle(1.2, 0xFFFFFF, 0.5);
      this.logisticsInteractiveGraphics.beginPath();
      this.logisticsInteractiveGraphics.arc(b.x - 5, currY - 5, 8, -Math.PI * 0.7, -Math.PI * 0.1);
      this.logisticsInteractiveGraphics.stroke();

      // Brass bottom collar
      this.logisticsInteractiveGraphics.fillStyle(0xF59E0B, 1.0);
      this.logisticsInteractiveGraphics.fillRect(b.x - 3, currY + 14, 6, 4);
    }

    // 3. Interactive Pipe Tool Reticle & Dashed Preview Line
    if (this.activeTool === 'pipe') {
      const px = this.pointerCurrentX;
      const py = this.pointerCurrentY;

      // Cyan Reticle
      this.logisticsInteractiveGraphics.lineStyle(1.5, 0x38BDF8, 0.85);
      this.logisticsInteractiveGraphics.strokeCircle(px, py, 10);
      this.logisticsInteractiveGraphics.lineBetween(px - 14, py, px - 6, py);
      this.logisticsInteractiveGraphics.lineBetween(px + 6, py, px + 14, py);
      this.logisticsInteractiveGraphics.lineBetween(px, py - 14, px, py - 6);
      this.logisticsInteractiveGraphics.lineBetween(px, py + 6, px, py + 14);

      // Preview Line if Dragging
      if (this.isBuildingPipe && this.pipeDragStart) {
        const sx = this.pipeDragStart.x;
        const sy = this.pipeDragStart.y;
        const midX = (sx + px) / 2;
        const midY = (sy + py) / 2 + 16;
        const curve = new Phaser.Curves.QuadraticBezier(
          new Phaser.Math.Vector2(sx, sy),
          new Phaser.Math.Vector2(midX, midY),
          new Phaser.Math.Vector2(px, py)
        );

        const pts = curve.getPoints(12);
        this.logisticsInteractiveGraphics.lineStyle(2, 0x38BDF8, 0.8);
        for (let j = 0; j < pts.length - 1; j += 2) {
          this.logisticsInteractiveGraphics.lineBetween(pts[j].x, pts[j].y, pts[j + 1].x, pts[j + 1].y);
        }
      }
    }

    // 4. Interactive Ghost Balloon for Tank Tool
    if (this.activeTool === 'tank') {
      const gx = Phaser.Math.Clamp(this.pointerCurrentX, 40, width - 40);
      const gy = Phaser.Math.Clamp(this.pointerCurrentY, 70, 120);

      this.logisticsInteractiveGraphics.fillStyle(0x0F172A, 0.45);
      this.logisticsInteractiveGraphics.fillCircle(gx, gy, 16);
      this.logisticsInteractiveGraphics.lineStyle(1.8, 0xF59E0B, 0.85);
      this.logisticsInteractiveGraphics.strokeCircle(gx, gy, 16);

      this.logisticsInteractiveGraphics.lineStyle(1, 0x94A3B8, 0.5);
      this.logisticsInteractiveGraphics.lineBetween(platformX, platformY, gx, gy);

      this.logisticsInteractiveGraphics.fillStyle(0xF59E0B, 0.8);
      this.logisticsInteractiveGraphics.fillRect(gx - 3, gy + 14, 6, 4);
    }
  }

  /**
   * Action Banner when cloud band is depleted (Nächste Woche / Plattform umsetzen)
   */
  private createReplenishBanner(width: number): void {
    if (this.replenishBannerContainer) {
      this.replenishBannerContainer.destroy();
      this.replenishBannerContainer = null;
    }

    const container = this.add.container(width / 2, 140).setDepth(22).setVisible(false);

    // Background card (Rule 7: Dark theme)
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x0F172A, 0.94);
    cardBg.fillRoundedRect(-180, -32, 360, 64, 8);
    cardBg.lineStyle(1.5, 0x38BDF8, 0.9);
    cardBg.strokeRoundedRect(-180, -32, 360, 64, 8);
    container.add(cardBg);

    // Title Text
    const titleText = this.add.text(0, -18, t('cloudReplenish.depletedBanner'), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#FDE047',
    }).setOrigin(0.5);
    container.add(titleText);

    // Button 1: Nächste Woche
    const btn1Bg = this.add.graphics();
    btn1Bg.fillStyle(0x0369A1, 0.9);
    btn1Bg.fillRoundedRect(-165, -2, 155, 24, 5);
    btn1Bg.lineStyle(1, 0x38BDF8, 0.8);
    btn1Bg.strokeRoundedRect(-165, -2, 155, 24, 5);
    container.add(btn1Bg);

    const btn1Text = this.add.text(-87, 10, t('cloudReplenish.advanceWeekBtn'), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add(btn1Text);

    const hitZone1 = this.add.zone(-87, 10, 155, 24).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    hitZone1.on('pointerdown', (e: Phaser.Input.Pointer) => {
      e.event?.stopPropagation?.();
      this.advanceWeekAndReplenish();
    });
    container.add(hitZone1);

    // Button 2: Plattform umsetzen (50 CR)
    const btn2Bg = this.add.graphics();
    btn2Bg.fillStyle(0x78350F, 0.9);
    btn2Bg.fillRoundedRect(10, -2, 155, 24, 5);
    btn2Bg.lineStyle(1, 0xF59E0B, 0.8);
    btn2Bg.strokeRoundedRect(10, -2, 155, 24, 5);
    container.add(btn2Bg);

    const btn2Text = this.add.text(87, 10, t('cloudReplenish.relocateBtn'), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#FDE047',
    }).setOrigin(0.5);
    container.add(btn2Text);

    const hitZone2 = this.add.zone(87, 10, 155, 24).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    hitZone2.on('pointerdown', (e: Phaser.Input.Pointer) => {
      e.event?.stopPropagation?.();
      this.relocatePlatform();
    });
    container.add(hitZone2);

    this.replenishBannerContainer = container;
  }

  private updateReplenishBanner(): void {
    const allDepleted = this.cloudGrid?.isAllDepleted() ?? false;
    if (allDepleted && !this.isReplenishingDrift) {
      if (this.replenishBannerContainer && !this.replenishBannerContainer.visible) {
        this.replenishBannerContainer.setVisible(true);
      }
    } else {
      if (this.replenishBannerContainer?.visible) {
        this.replenishBannerContainer.setVisible(false);
      }
    }
  }

  public advanceWeekAndReplenish(): void {
    AudioManager.getInstance().playUiClick();
    this.isReplenishingDrift = true;
    if (this.replenishBannerContainer) {
      this.replenishBannerContainer.setVisible(false);
    }

    const gs = GameState.getInstance();
    gs.advanceWeek();
    const newWeek = gs.getData().week;
    this.currentWeek = newWeek;
    this.updateHeaderLabels();
    this.updateTankDisplay();

    // Trigger smooth horizontal parallax drift
    const newBand = AuctionEngine.createReplenishedBand(newWeek, gs.getData().season);
    gs.setActiveCloudBand(newBand);
    this.activeBand = newBand;

    if (this.cameras?.main) {
      this.tweens?.add({
        targets: this.cameras.main,
        alpha: 0.7,
        duration: 350,
        yoyo: true,
        onYoyo: () => {
          this.cloudGrid?.loadCloudBand(newBand);
          this.initPocketLabels();
          AudioManager.getInstance().playAuctionBell();
          this.showScanBanner(`${t('cloudReplenish.replenished')} ${newWeek}!`, 150, '#7DD3FC', '#0C4A6EEE');
        },
        onComplete: () => {
          this.isReplenishingDrift = false;
        },
      });
    } else {
      this.cloudGrid?.loadCloudBand(newBand);
      this.initPocketLabels();
      this.isReplenishingDrift = false;
    }
  }

  public relocatePlatform(): boolean {
    const gs = GameState.getInstance();
    const cost = 50;
    if (gs.getCredits() < cost) {
      this.showScanBanner(t('cloudReplenish.notEnoughCreditsRelocate'), 140, '#FCA5A5', '#450A0ACC');
      AudioManager.getInstance().playUiClick();
      return false;
    }

    gs.deductCredits(cost);
    this.updateCreditsDisplay();
    AudioManager.getInstance().playSteamVent();

    const shift = 180;
    this.platformOffsetX = (this.platformOffsetX + shift) % (this.cameras?.main?.width || 540);
    this.cloudGrid?.shiftPockets(shift);
    this.initPocketLabels();

    if (this.platform) {
      this.tweens?.add({
        targets: this.platform,
        y: this.platform.y - 10,
        yoyo: true,
        duration: 180,
        ease: 'Quad.easeInOut',
      });
    }

    this.showScanBanner(t('cloudReplenish.relocated'), 140, '#FDE047', '#451A03EE');
    return true;
  }
}
