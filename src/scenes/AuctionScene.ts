import Phaser from 'phaser';
import { ColorPalette, getZoneColors } from '../gfx/ColorPalette';
import { AudioManager } from '../audio/AudioManager';
import {
  AuctionEngine,
  CloudBand,
  RoundResult,
  SCAN_TOOLS,
  ScanToolType,
  ParticipantId,
} from '../core/AuctionEngine';
import { GameState } from '../core/GameState';
import { t } from '../i18n/i18n';

export class AuctionScene extends Phaser.Scene {
  private engine!: AuctionEngine;
  private currentRoundBands: CloudBand[] = [];
  private playerBids: Record<string, number> = {};

  // UI Layers & Containers
  private mainContainer!: Phaser.GameObjects.Container;
  private cardContainers: Phaser.GameObjects.Container[] = [];
  private revealContainer: Phaser.GameObjects.Container | null = null;
  private summaryContainer: Phaser.GameObjects.Container | null = null;
  private creditsText!: Phaser.GameObjects.Text;
  private roundTitleText!: Phaser.GameObjects.Text;
  private rivalAvatars: Phaser.GameObjects.Container[] = [];

  // Selected band for season handoff
  private selectedBandForHarvest: CloudBand | null = null;

  constructor() {
    super({ key: 'AuctionScene' });
  }

  public create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Initialize AuctionEngine with GameState starting credits (1000 CR)
    const startingCredits = GameState.getInstance().getData().credits || AuctionEngine.INITIAL_CREDITS;
    this.engine = new AuctionEngine(startingCredits);

    // Background Gradient
    this.createBackground(width, height);

    // Root UI container
    this.mainContainer = this.add.container(0, 0);

    // Header bar
    this.createHeader(width);

    // Setup Round 1
    this.loadRound(1);

    // Setup Rival Strip at Bottom
    this.createRivalStrip(width);

    // Play welcome bell chime
    AudioManager.getInstance().playAuctionBell();

    // Camera fade in
    this.cameras.main.fadeIn(400, 15, 23, 42);

    // Dynamic resize handler
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;
    this.cameras.main.setViewport(0, 0, width, height);

    if (this.summaryContainer) {
      this.summaryContainer.destroy();
      this.summaryContainer = null;
      this.showAuctionSummary();
      return;
    }

    if (this.revealContainer) {
      return;
    }

    this.mainContainer.removeAll(true);
    this.createBackground(width, height);
    this.createHeader(width);
    this.loadRound(this.engine.getCurrentRound());
    this.createRivalStrip(width);
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(
      ColorPalette.uiHarbor.deepBlackNum,
      ColorPalette.uiHarbor.deepBlackNum,
      0x111827,
      0x0F172A,
      1
    );
    bg.fillRect(0, 0, width, height);

    // Subtle atmospheric decorative lines
    const deco = this.add.graphics();
    deco.lineStyle(1, 0x334155, 0.25);
    for (let y = 100; y < height; y += 80) {
      deco.moveTo(0, y);
      deco.lineTo(width, y);
    }
    deco.strokePath();
  }

  private createHeader(width: number): void {
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0F172A, 0.95);
    headerBg.fillRect(0, 0, width, 70);
    headerBg.lineStyle(1, 0x334155, 0.8);
    headerBg.moveTo(0, 70);
    headerBg.lineTo(width, 70);
    headerBg.strokePath();

    // App Title & Round Badge
    this.roundTitleText = this.add.text(16, 14, `${t('auction.title')} • ${t('auction.round')} 1 / 3`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: ColorPalette.uiHarbor.brass,
      fontStyle: 'bold',
    });

    const subText = this.add.text(16, 38, t('auction.subtitle'), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#94A3B8',
    });

    // Player Credits Display (Emerald Box)
    const creditsBox = this.add.graphics();
    creditsBox.fillStyle(0x064E3B, 0.8);
    creditsBox.fillRoundedRect(width - 150, 16, 134, 38, 8);
    creditsBox.lineStyle(1.5, 0x10B981, 0.8);
    creditsBox.strokeRoundedRect(width - 150, 16, 134, 38, 8);

    const crIcon = this.add.text(width - 142, 26, 'CR', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#34D399',
      fontStyle: 'bold',
    });

    const playerCredits = this.engine.getParticipant('player').credits;
    this.creditsText = this.add.text(width - 24, 26, playerCredits.toString(), {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#6EE7B7',
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.mainContainer.add([headerBg, this.roundTitleText, subText, creditsBox, crIcon, this.creditsText]);
  }

  private updateCreditsDisplay(): void {
    const playerCredits = this.engine.getParticipant('player').credits;
    this.creditsText.setText(playerCredits.toString());

    // Also sync with global GameState
    GameState.getInstance().setCredits(playerCredits);
    const headerCreditsEl = document.getElementById('header-credits');
    if (headerCreditsEl) {
      headerCreditsEl.textContent = playerCredits.toString();
    }
  }

  private loadRound(roundNumber: 1 | 2 | 3): void {
    // Clear old card containers
    this.cardContainers.forEach((c) => c.destroy());
    this.cardContainers = [];

    this.currentRoundBands = this.engine.getBandsForCurrentRound();
    this.playerBids = {};
    this.currentRoundBands.forEach((b) => {
      this.playerBids[b.id] = 0;
    });

    // Update Header Text
    this.roundTitleText.setText(`${t('auction.title')} • ${t('auction.round')} ${roundNumber} / 3`);

    const width = this.cameras.main.width;

    // Render Band 1 (Top Card, Y: 82)
    const card1 = this.createBandCard(this.currentRoundBands[0], width, 82);
    this.cardContainers.push(card1);
    this.mainContainer.add(card1);

    // Render Band 2 (Bottom Card, Y: 372)
    const card2 = this.createBandCard(this.currentRoundBands[1], width, 372);
    this.cardContainers.push(card2);
    this.mainContainer.add(card2);

    // Render Seal & Reveal Action Button (Y: 664)
    this.createSubmitButton(width, 664);

    this.updateCreditsDisplay();
  }

  private createBandCard(band: CloudBand, screenWidth: number, yPos: number): Phaser.GameObjects.Container {
    const cardWidth = Math.min(540, screenWidth - 28);
    const cardX = (screenWidth - cardWidth) / 2;
    const card = this.add.container(cardX, yPos);
    const cardHeight = 276;
    const zoneColors = getZoneColors(band.zone);

    // 1. Card Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1E293B, 0.95);
    bg.fillRoundedRect(0, 0, cardWidth, cardHeight, 10);
    bg.lineStyle(1.5, zoneColors.accentNum, 0.7);
    bg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 10);
    card.add(bg);

    // 2. Zone Header Badge
    const zoneBadge = this.add.graphics();
    zoneBadge.fillStyle(zoneColors.accentNum, 0.2);
    zoneBadge.fillRoundedRect(12, 12, 90, 22, 4);
    zoneBadge.lineStyle(1, zoneColors.accentNum, 0.8);
    zoneBadge.strokeRoundedRect(12, 12, 90, 22, 4);
    card.add(zoneBadge);

    const zoneLabel = this.add.text(57, 23, band.zone.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: zoneColors.accent,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    card.add(zoneLabel);

    // Band Name & Details
    const nameText = this.add.text(110, 14, band.name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#F8FAFC',
      fontStyle: 'bold',
    });
    card.add(nameText);

    const metaText = this.add.text(110, 32, `${t('auction.size')}: ${band.estimatedSize} • ${t('auction.baseValue')}: ${band.baseValue} CR`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#94A3B8',
    });
    card.add(metaText);

    // 3. 4-Week Wind Forecast Strip
    const forecastBg = this.add.graphics();
    forecastBg.fillStyle(0x0F172A, 0.7);
    forecastBg.fillRoundedRect(12, 46, cardWidth - 24, 28, 6);
    card.add(forecastBg);

    band.weatherForecast.forEach((fc, idx) => {
      const colX = 20 + idx * ((cardWidth - 40) / 4);
      const arrow = fc.direction === 'east' ? '➔' : '⬅';
      const turbIcon = fc.turbulence === 'stormy' ? '⚡' : fc.turbulence === 'moderate' ? '≋' : '☼';
      const fcText = this.add.text(colX, 52, `W${fc.week}: ${arrow} ${fc.speed}px ${turbIcon}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: fc.turbulence === 'stormy' ? '#F87171' : '#38BDF8',
      });
      card.add(fcText);
    });

    // 4. Initial Hint
    const hintText = this.add.text(14, 82, `👁 ${t(band.initialHint)}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#CBD5E1',
      wordWrap: { width: cardWidth - 28 },
    });
    card.add(hintText);

    // 5. Scan Tools Row
    const toolsRowY = 118;
    const toolTypes: ScanToolType[] = ['wind_sensor', 'echo_drone', 'spectral_scan'];
    const toolWidth = (cardWidth - 36) / 3;

    toolTypes.forEach((tool, idx) => {
      const toolX = 12 + idx * (toolWidth + 6);
      const info = SCAN_TOOLS[tool];
      const isScanned = this.engine.hasScan('player', band.id, tool);

      const btnBg = this.add.graphics();
      const drawBtn = (hover = false) => {
        btnBg.clear();
        if (isScanned) {
          btnBg.fillStyle(0x064E3B, 0.9);
          btnBg.fillRoundedRect(toolX, toolsRowY, toolWidth, 42, 6);
          btnBg.lineStyle(1.5, 0x10B981, 0.9);
          btnBg.strokeRoundedRect(toolX, toolsRowY, toolWidth, 42, 6);
        } else {
          btnBg.fillStyle(hover ? 0x334155 : 0x1E293B, 0.9);
          btnBg.fillRoundedRect(toolX, toolsRowY, toolWidth, 42, 6);
          btnBg.lineStyle(1, 0x475569, 0.8);
          btnBg.strokeRoundedRect(toolX, toolsRowY, toolWidth, 42, 6);
        }
      };
      drawBtn();
      card.add(btnBg);

      const titleLabel = this.add.text(toolX + toolWidth / 2, toolsRowY + 10, isScanned ? `✓ ${t(info.nameKey)}` : t(info.nameKey), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        color: isScanned ? '#34D399' : '#E2E8F0',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      card.add(titleLabel);

      const costLabel = this.add.text(toolX + toolWidth / 2, toolsRowY + 26, isScanned ? 'AKTIV' : `${info.cost} CR`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: isScanned ? '#6EE7B7' : '#FBBF24',
      }).setOrigin(0.5);
      card.add(costLabel);

      // Interactive hit area
      const hitZone = this.add.zone(toolX + toolWidth / 2, toolsRowY + 21, toolWidth, 42);
      hitZone.setInteractive({ useHandCursor: !isScanned });

      hitZone.on('pointerover', () => {
        if (!isScanned) drawBtn(true);
      });
      hitZone.on('pointerout', () => {
        if (!isScanned) drawBtn(false);
      });
      hitZone.on('pointerdown', () => {
        if (isScanned) return;
        const res = this.engine.purchaseScan('player', band.id, tool);
        if (res.success) {
          AudioManager.getInstance().playScanTelemetry();
          this.updateCreditsDisplay();
          // Reload round to refresh scan telemetry displays
          this.loadRound(this.engine.getCurrentRound());
        } else {
          AudioManager.getInstance().playUiClick();
          // Flash red on failure
          btnBg.clear();
          btnBg.fillStyle(0x7F1D1D, 0.9);
          btnBg.fillRoundedRect(toolX, toolsRowY, toolWidth, 42, 6);
          this.time.delayedCall(300, () => drawBtn());
        }
      });
      card.add(hitZone);
    });

    // 6. Dynamic Telemetry Result Display
    const telemetry = this.engine.getScanTelemetry('player', band.id);
    const telemetryLines: string[] = [];
    if (telemetry.hasWindSensor) {
      telemetryLines.push(`📡 Dichte: ${t(telemetry.densityEstimate || '')} • ${telemetry.pocketsCount} Taschen`);
    }
    if (telemetry.hasEchoDrone) {
      telemetryLines.push(`🚁 Tiefe: Schicht ${telemetry.layerDepth} • ${t(telemetry.locationHint || '')}`);
    }
    if (telemetry.hasSpectralScan) {
      const qualityStars = '⭐'.repeat(telemetry.quality || 1);
      const auroraTxt = telemetry.hasAurora ? t('auction.telemetry.auroraYes') : t('auction.telemetry.auroraNo');
      telemetryLines.push(`🔬 Güte: ${qualityStars} • ${auroraTxt}`);
    }

    const telemBox = this.add.graphics();
    telemBox.fillStyle(0x0F172A, 0.8);
    telemBox.fillRoundedRect(12, 168, cardWidth - 24, 46, 6);
    card.add(telemBox);

    const telemText = this.add.text(
      20,
      172,
      telemetryLines.length > 0 ? telemetryLines.join('\n') : 'Keine zusätzlichen Scans gekauft. Biete nach Windradar & Vorab-Hinweis.',
      {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: telemetryLines.length > 0 ? '#38BDF8' : '#64748B',
        lineSpacing: 3,
      }
    );
    card.add(telemText);

    // 7. Player Bid Input Controls Row
    const bidRowY = 224;
    const bidLabel = this.add.text(14, bidRowY + 14, t('auction.yourBid') + ':', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#CBD5E1',
      fontStyle: 'bold',
    });
    card.add(bidLabel);

    const bidValText = this.add.text(105, bidRowY + 12, '0 CR', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#FBBF24',
      fontStyle: 'bold',
    });
    card.add(bidValText);

    const updateBidDisplay = () => {
      bidValText.setText(`${this.playerBids[band.id]} CR`);
    };

    // Stepper Buttons: [-50], [-10], [+10], [+50], [MAX], [0]
    const buttons = [
      { label: '-50', delta: -50 },
      { label: '-10', delta: -10 },
      { label: '+10', delta: 10 },
      { label: '+50', delta: 50 },
      { label: '0', isZero: true },
      { label: 'MAX', isMax: true },
    ];

    const btnStartX = 180;
    const btnW = 34;

    buttons.forEach((btnInfo, bIdx) => {
      const bx = btnStartX + bIdx * (btnW + 4);
      const bGraphic = this.add.graphics();
      bGraphic.fillStyle(0x334155, 0.9);
      bGraphic.fillRoundedRect(bx, bidRowY + 4, btnW, 30, 4);
      bGraphic.lineStyle(1, 0x475569, 0.9);
      bGraphic.strokeRoundedRect(bx, bidRowY + 4, btnW, 30, 4);
      card.add(bGraphic);

      const bText = this.add.text(bx + btnW / 2, bidRowY + 19, btnInfo.label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#F8FAFC',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      card.add(bText);

      const bZone = this.add.zone(bx + btnW / 2, bidRowY + 19, btnW, 30);
      bZone.setInteractive({ useHandCursor: true });
      bZone.on('pointerdown', () => {
        AudioManager.getInstance().playUiClick();
        const playerCredits = this.engine.getParticipant('player').credits;
        const currentOtherBids = Object.entries(this.playerBids)
          .filter(([bId]) => bId !== band.id)
          .reduce((sum, [, val]) => sum + val, 0);
        const maxAvailable = Math.max(0, playerCredits - currentOtherBids);

        if (btnInfo.isZero) {
          this.playerBids[band.id] = 0;
        } else if (btnInfo.isMax) {
          this.playerBids[band.id] = maxAvailable;
        } else if (btnInfo.delta) {
          const next = this.playerBids[band.id] + btnInfo.delta;
          this.playerBids[band.id] = Math.max(0, Math.min(next, maxAvailable));
        }
        updateBidDisplay();
      });
      card.add(bZone);
    });

    return card;
  }

  private createSubmitButton(screenWidth: number, yPos: number): void {
    const btnContainer = this.add.container(screenWidth / 2, yPos);
    const btnW = Math.min(540, screenWidth - 28);
    const btnH = 46;

    const btnBg = this.add.graphics();
    const renderBtnBg = (hover = false) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0xD97706 : 0xB45309, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      btnBg.lineStyle(2, 0xFBBF24, 0.9);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    };
    renderBtnBg();
    btnContainer.add(btnBg);

    const btnText = this.add.text(0, 0, `🔨 ${t('auction.sealAndReveal').toUpperCase()}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0.5);
    btnContainer.add(btnText);

    const hitZone = this.add.zone(0, 0, btnW, btnH);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on('pointerover', () => renderBtnBg(true));
    hitZone.on('pointerout', () => renderBtnBg(false));
    hitZone.on('pointerdown', () => {
      this.handleRoundSubmission();
    });
    btnContainer.add(hitZone);

    this.cardContainers.push(btnContainer);
    this.mainContainer.add(btnContainer);
  }

  private createRivalStrip(screenWidth: number): void {
    const height = this.cameras.main.height;
    const stripY = Math.max(724, height - 236);
    const rivalsBg = this.add.graphics();
    rivalsBg.fillStyle(0x0F172A, 0.9);
    rivalsBg.fillRect(0, stripY, screenWidth, 236);
    rivalsBg.lineStyle(1, 0x334155, 0.7);
    rivalsBg.moveTo(0, stripY);
    rivalsBg.lineTo(screenWidth, stripY);
    rivalsBg.strokePath();
    this.mainContainer.add(rivalsBg);

    const totalWidth = Math.min(540, screenWidth - 28);
    const startX = (screenWidth - totalWidth) / 2;

    const title = this.add.text(startX, stripY + 8, 'KI-RIVALEN (FAIRE AUTONOME BIETER)', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#94A3B8',
      fontStyle: 'bold',
    });
    this.mainContainer.add(title);

    const rivalIds: ParticipantId[] = ['daredevil', 'calculator', 'tracker'];
    const rivalWidth = (totalWidth - 8) / 3;

    rivalIds.forEach((rId, idx) => {
      const rx = startX + idx * (rivalWidth + 4);
      const participant = this.engine.getParticipant(rId);

      const rCard = this.add.container(rx, stripY + 28);
      const bg = this.add.graphics();
      bg.fillStyle(0x1E293B, 0.85);
      bg.fillRoundedRect(0, 0, rivalWidth, 190, 8);
      bg.lineStyle(1, 0x475569, 0.6);
      bg.strokeRoundedRect(0, 0, rivalWidth, 190, 8);
      rCard.add(bg);

      // Avatar Sprite
      if (this.textures.exists(participant.avatarKey)) {
        const avatar = this.add.image(rivalWidth / 2, 42, participant.avatarKey);
        avatar.setDisplaySize(54, 54);
        rCard.add(avatar);
      }

      // Rival Name
      const name = this.add.text(rivalWidth / 2, 78, participant.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#F8FAFC',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      rCard.add(name);

      // Credits badge
      const crText = this.add.text(rivalWidth / 2, 94, `${participant.credits} CR`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#34D399',
      }).setOrigin(0.5);
      rCard.add(crText);

      // Persona / Quote text
      const quoteText = this.add.text(8, 110, participant.lastQuote ? `"${t(participant.lastQuote)}"` : participant.personality, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        color: '#94A3B8',
        wordWrap: { width: rivalWidth - 16 },
      });
      rCard.add(quoteText);

      this.rivalAvatars.push(rCard);
      this.mainContainer.add(rCard);
    });
  }

  private handleRoundSubmission(): void {
    const playerBidsPayload = Object.entries(this.playerBids).map(([bandId, amount]) => ({
      bandId,
      amount,
    }));

    try {
      // 1. Play Gavel Strike sound
      AudioManager.getInstance().playAuctionGavel();

      // 2. Execute Round in Engine
      const roundResult = this.engine.executeRound(playerBidsPayload);

      // 3. Display Animated Reveal Modal
      this.showRevealOverlay(roundResult);
    } catch (err: unknown) {
      console.warn('Bid submission error:', err);
      AudioManager.getInstance().playUiClick();
    }
  }

  /**
   * Animated Reveal Overlay: Reveals bids for both bands, highlights the winner,
   * shows rival reactions with voice quotes, and provides the step button.
   */
  private showRevealOverlay(roundResult: RoundResult): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.revealContainer = this.add.container(0, 0);
    this.revealContainer.setDepth(100);

    // Dark backdrop
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x020617, 0.88);
    backdrop.fillRect(0, 0, width, height);
    this.revealContainer.add(backdrop);

    // Header Title
    const title = this.add.text(width / 2, 40, `🔨 ENTHÜLLUNG • RUNDE ${roundResult.round} / 3`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: ColorPalette.uiHarbor.brass,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.revealContainer.add(title);

    // Cards for both results
    roundResult.results.forEach((res, idx) => {
      const cardY = 80 + idx * 270;
      const cardW = width - 32;
      const cardH = 250;
      const zoneColors = getZoneColors(res.band.zone);

      const resCard = this.add.container(16, cardY);
      const bg = this.add.graphics();
      bg.fillStyle(0x1E293B, 0.98);
      bg.fillRoundedRect(0, 0, cardW, cardH, 10);
      bg.lineStyle(2, res.winnerId === 'player' ? 0x10B981 : zoneColors.accentNum, 0.9);
      bg.strokeRoundedRect(0, 0, cardW, cardH, 10);
      resCard.add(bg);

      // Band Name
      const bName = this.add.text(14, 12, res.band.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#F8FAFC',
        fontStyle: 'bold',
      });
      resCard.add(bName);

      // Winner Badge
      const isPlayerWinner = res.winnerId === 'player';
      const winnerName = this.engine.getParticipant(res.winnerId).name;
      const winnerBadge = this.add.text(
        cardW - 14,
        14,
        isPlayerWinner ? '🎉 DU HAST GEWONNEN!' : `ZUSCHLAG: ${winnerName}`,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          color: isPlayerWinner ? '#34D399' : '#FBBF24',
          fontStyle: 'bold',
        }
      ).setOrigin(1, 0);
      resCard.add(winnerBadge);

      // Bids List
      const bidsBox = this.add.graphics();
      bidsBox.fillStyle(0x0F172A, 0.7);
      bidsBox.fillRoundedRect(12, 38, cardW - 24, 110, 6);
      resCard.add(bidsBox);

      res.bids.forEach((bid, bIdx) => {
        const bidder = this.engine.getParticipant(bid.participantId);
        const by = 48 + bIdx * 24;
        const isWinningBid = bid.participantId === res.winnerId;

        const nameLabel = this.add.text(24, by, bidder.name, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: isWinningBid ? '#FBBF24' : '#94A3B8',
          fontStyle: isWinningBid ? 'bold' : 'normal',
        });
        resCard.add(nameLabel);

        const amountLabel = this.add.text(cardW - 24, by, `${bid.amount} CR ${isWinningBid ? '🏆' : ''}`, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: isWinningBid ? '#34D399' : '#64748B',
          fontStyle: 'bold',
        }).setOrigin(1, 0);
        resCard.add(amountLabel);
      });

      // Rival Situational Quote Box
      const quoteParticipant = this.engine.getParticipant(res.quote.participantId);
      const quoteBox = this.add.graphics();
      quoteBox.fillStyle(0x334155, 0.4);
      quoteBox.fillRoundedRect(12, 158, cardW - 24, 76, 6);
      resCard.add(quoteBox);

      // Mini Avatar
      if (this.textures.exists(quoteParticipant.avatarKey)) {
        const qAvatar = this.add.image(36, 196, quoteParticipant.avatarKey);
        qAvatar.setDisplaySize(42, 42);
        resCard.add(qAvatar);
      }

      const qName = this.add.text(66, 166, quoteParticipant.name + ':', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#CBD5E1',
        fontStyle: 'bold',
      });
      resCard.add(qName);

      const qText = this.add.text(66, 182, `"${t(res.quote.quoteKey)}"`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#FDE68A',
        fontStyle: 'italic',
        wordWrap: { width: cardW - 90 },
      });
      resCard.add(qText);

      this.revealContainer?.add(resCard);
    });

    // Advance / Finish Button
    const isComplete = this.engine.isAuctionComplete();
    const nextBtnContainer = this.add.container(width / 2, height - 70);
    const nextBtnW = width - 40;
    const nextBtnH = 48;

    const nBg = this.add.graphics();
    nBg.fillStyle(0x047857, 1);
    nBg.fillRoundedRect(-nextBtnW / 2, -nextBtnH / 2, nextBtnW, nextBtnH, 8);
    nBg.lineStyle(2, 0x34D399, 0.9);
    nBg.strokeRoundedRect(-nextBtnW / 2, -nextBtnH / 2, nextBtnW, nextBtnH, 8);
    nextBtnContainer.add(nBg);

    const nLabel = isComplete ? t('auction.viewSummary').toUpperCase() : `${t('auction.nextRound').toUpperCase()} (${roundResult.round + 1} / 3)`;
    const nText = this.add.text(0, 0, `➡ ${nLabel}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    nextBtnContainer.add(nText);

    const nHit = this.add.zone(0, 0, nextBtnW, nextBtnH);
    nHit.setInteractive({ useHandCursor: true });
    nHit.on('pointerdown', () => {
      AudioManager.getInstance().playAuctionBell();
      this.revealContainer?.destroy();
      this.revealContainer = null;

      if (isComplete) {
        this.showAuctionSummary();
      } else {
        this.loadRound(this.engine.getCurrentRound());
      }
    });
    nextBtnContainer.add(nHit);

    this.revealContainer.add(nextBtnContainer);
  }

  /**
   * Final Auction Summary Screen:
   * Displays all 6 bands, allows the player to choose their starter cloud band,
   * and transitions into SkyHarvestScene.
   */
  private showAuctionSummary(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.summaryContainer = this.add.container(0, 0);
    this.summaryContainer.setDepth(150);

    const bg = this.add.graphics();
    bg.fillStyle(0x0F172A, 0.98);
    bg.fillRect(0, 0, width, height);
    this.summaryContainer.add(bg);

    // Title
    const title = this.add.text(width / 2, 34, 'AUKTION BEENDET • DEINE HIMMELSLIZENZEN', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: ColorPalette.uiHarbor.brass,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.summaryContainer.add(title);

    const sub = this.add.text(width / 2, 54, t('auction.selectBand'), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#94A3B8',
    }).setOrigin(0.5);
    this.summaryContainer.add(sub);

    const allBands = this.engine.getAllBands();
    const playerWonBands = this.engine.getPlayerWonBands();

    // Default selection: First won band or first band
    this.selectedBandForHarvest = playerWonBands.length > 0 ? playerWonBands[0] : allBands[0];

    // Band Cards Grid (6 bands, 2 columns x 3 rows)
    const cardW = (width - 36) / 2;
    const cardH = 180;
    const startY = 74;

    allBands.forEach((band, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = 14 + col * (cardW + 8);
      const by = startY + row * (cardH + 10);
      const isPlayerWinner = band.winner === 'player';
      const zoneColors = getZoneColors(band.zone);

      const bContainer = this.add.container(bx, by);

      const bBg = this.add.graphics();
      const drawCard = () => {
        bBg.clear();
        const isSelected = this.selectedBandForHarvest?.id === band.id;
        if (isSelected) {
          bBg.fillStyle(0x1E293B, 1);
          bBg.fillRoundedRect(0, 0, cardW, cardH, 8);
          bBg.lineStyle(2.5, 0xF59E0B, 1); // Gold highlight
          bBg.strokeRoundedRect(0, 0, cardW, cardH, 8);
        } else if (isPlayerWinner) {
          bBg.fillStyle(0x064E3B, 0.4);
          bBg.fillRoundedRect(0, 0, cardW, cardH, 8);
          bBg.lineStyle(1.5, 0x10B981, 0.8);
          bBg.strokeRoundedRect(0, 0, cardW, cardH, 8);
        } else {
          bBg.fillStyle(0x1E293B, 0.5);
          bBg.fillRoundedRect(0, 0, cardW, cardH, 8);
          bBg.lineStyle(1, 0x475569, 0.5);
          bBg.strokeRoundedRect(0, 0, cardW, cardH, 8);
        }
      };
      drawCard();
      bContainer.add(bBg);

      // Zone tag
      const zTag = this.add.text(10, 10, band.zone.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: zoneColors.accent,
        fontStyle: 'bold',
      });
      bContainer.add(zTag);

      // Winner Tag
      const wTag = this.add.text(
        cardW - 10,
        10,
        isPlayerWinner ? 'DEIN BAND' : this.engine.getParticipant(band.winner || 'player').name,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '9px',
          color: isPlayerWinner ? '#34D399' : '#94A3B8',
          fontStyle: 'bold',
        }
      ).setOrigin(1, 0);
      bContainer.add(wTag);

      // Band Name
      const bName = this.add.text(10, 28, band.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#F8FAFC',
        fontStyle: 'bold',
        wordWrap: { width: cardW - 20 },
      });
      bContainer.add(bName);

      // Resource & Quality
      const rInfo = this.add.text(
        10,
        64,
        `${band.primaryResource.toUpperCase()} • ${'⭐'.repeat(band.actualData.quality)} • ${band.actualData.pocketsCount} Taschen`,
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#38BDF8',
        }
      );
      bContainer.add(rInfo);

      // Aurora Badge
      if (band.actualData.hasAurora) {
        const aBadge = this.add.text(10, 84, '✨ AURORA-FUND', {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#F472B6',
          fontStyle: 'bold',
        });
        bContainer.add(aBadge);
      }

      // Winning bid cost
      const costTxt = this.add.text(10, cardH - 26, `Zuschlag: ${band.winningBid} CR`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#FBBF24',
      });
      bContainer.add(costTxt);

      // Hit area
      const bHit = this.add.zone(cardW / 2, cardH / 2, cardW, cardH);
      bHit.setInteractive({ useHandCursor: true });
      bHit.on('pointerdown', () => {
        AudioManager.getInstance().playUiClick();
        this.selectedBandForHarvest = band;
        this.showAuctionSummary(); // Refresh selection outline
      });
      bContainer.add(bHit);

      this.summaryContainer?.add(bContainer);
    });

    // Start Season Launch Button
    const launchBtnContainer = this.add.container(width / 2, height - 74);
    const lBtnW = width - 36;
    const lBtnH = 52;

    const lBg = this.add.graphics();
    lBg.fillStyle(0x059669, 1);
    lBg.fillRoundedRect(-lBtnW / 2, -lBtnH / 2, lBtnW, lBtnH, 10);
    lBg.lineStyle(2, 0x6EE7B7, 0.95);
    lBg.strokeRoundedRect(-lBtnW / 2, -lBtnH / 2, lBtnW, lBtnH, 10);
    launchBtnContainer.add(lBg);

    const chosenName = this.selectedBandForHarvest?.name || 'Standard-Band';
    const lText = this.add.text(0, 0, `🚀 ${t('auction.startSeason').toUpperCase()}\n(${chosenName})`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);
    launchBtnContainer.add(lText);

    const lHit = this.add.zone(0, 0, lBtnW, lBtnH);
    lHit.setInteractive({ useHandCursor: true });
    lHit.on('pointerdown', () => {
      this.handleSeasonStart();
    });
    launchBtnContainer.add(lHit);

    this.summaryContainer.add(launchBtnContainer);
  }

  private handleSeasonStart(): void {
    if (!this.selectedBandForHarvest) {
      this.selectedBandForHarvest = this.engine.getAllBands()[0];
    }

    // Persist won bands and selected active band to GameState
    const state = GameState.getInstance();
    state.setActiveCloudBand(this.selectedBandForHarvest);
    this.engine.getPlayerWonBands().forEach((band) => {
      state.addWonBand(band);
    });

    // Deduct remaining credits
    const playerCredits = this.engine.getParticipant('player').credits;
    state.setCredits(playerCredits);

    // Audio chime
    AudioManager.getInstance().playAuctionBell();

    // Transition smoothly to SkyHarvestScene with active cloud band
    this.cameras.main.fadeOut(500, 15, 23, 42);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('SkyHarvestScene', { cloudBand: this.selectedBandForHarvest });
    });
  }
}
