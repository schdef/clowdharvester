import './style.css';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { AuctionScene } from './scenes/AuctionScene';
import { SkyHarvestScene } from './scenes/SkyHarvestScene';
import { ResponsiveLayout } from './ui/ResponsiveLayout';
import { ToolBar } from './ui/ToolBar';
import { DesktopRadar } from './ui/DesktopRadar';
import { MarketTicker } from './ui/MarketTicker';
import { TutorialModal } from './ui/TutorialModal';
import { HarborModal } from './ui/HarborModal';
import { CouncilModal } from './ui/CouncilModal';
import { SummaryModal } from './ui/SummaryModal';
import { PilotModal } from './ui/PilotModal';
import { AudioManager } from './audio/AudioManager';
import { getLanguage, setLanguage, t, onLanguageChange } from './i18n/i18n';
import { GameState } from './core/GameState';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker for offline capabilities
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('New Cloud Harvesters update available');
    },
    onOfflineReady() {
      console.log('Cloud Harvesters ready for offline harvesting');
    },
  });
}

// Global Game State placeholders
let currentSeason = 1;
let currentWeek = 1;
let currentSpeedIndex = 1;
const speedOptions = ['0.5x', '1.0x', '2.0x', 'PAUSE'];
const speedMultiplierMap: Record<string, number> = {
  '0.5x': 0.5,
  '1.0x': 1.0,
  '2.0x': 2.0,
  'PAUSE': 0,
};

// Initialize UI Managers
const responsive = ResponsiveLayout.getInstance();
const toolBar = new ToolBar();
const desktopRadar = new DesktopRadar();
const marketTicker = new MarketTicker();
const tutorialModal = TutorialModal.getInstance();
const harborModal = HarborModal.getInstance();
const councilModal = CouncilModal.getInstance();
const summaryModal = SummaryModal.getInstance();
const pilotModal = PilotModal.getInstance();

let phaserGameInstance: Phaser.Game | null = null;

// Mount UI Shell Components
function initUI(): void {
  const leftSidebar = document.getElementById('desktop-left-sidebar');
  if (leftSidebar) {
    desktopRadar.mount(leftSidebar);
    desktopRadar.setTime(currentSeason, currentWeek);
  }

  const rightSidebar = document.getElementById('desktop-right-sidebar');
  if (rightSidebar) {
    marketTicker.mount(rightSidebar);
  }

  const mobileDock = document.getElementById('mobile-thumb-dock');
  if (mobileDock) {
    toolBar.mount(mobileDock);
  }

  const tutorialContainer = document.getElementById('tutorial-container');
  if (tutorialContainer) {
    tutorialModal.mount(tutorialContainer);
    tutorialModal.checkAutoOpen();
  }

  const harborContainer = document.getElementById('harbor-modal-container');
  if (harborContainer) {
    harborModal.mount(harborContainer);
  }

  const councilContainer = document.getElementById('council-modal-container');
  if (councilContainer) {
    councilModal.mount(councilContainer);
  }

  const summaryContainer = document.getElementById('summary-modal-container');
  if (summaryContainer) {
    summaryModal.mount(summaryContainer);
  }

  const pilotContainer = document.getElementById('pilot-modal-container');
  if (pilotContainer) {
    pilotModal.mount(pilotContainer);
  }

  // Setup Pilot Profile Button
  const pilotProfileBtn = document.getElementById('btn-pilot-profile');
  if (pilotProfileBtn) {
    pilotProfileBtn.addEventListener('click', () => {
      AudioManager.getInstance().playUiClick();
      pilotModal.open();
    });
  }

  // Setup Game Mode Switcher Button (Solo Sector vs Shared Arena)
  const modeBtn = document.getElementById('btn-mode-toggle');
  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      AudioManager.getInstance().playUiClick();
      const currentMode = GameState.getInstance().getGameMode();
      const nextMode = currentMode === 'solo' ? 'arena' : 'solo';
      GameState.getInstance().setGameMode(nextMode);
      updateHeaderLabels();
      if (phaserGameInstance) {
        phaserGameInstance.events.emit('gamemode:change', nextMode);
        const scene = phaserGameInstance.scene.getScene('SkyHarvestScene') as SkyHarvestScene | undefined;
        if (scene && typeof scene.setGameMode === 'function') {
          scene.setGameMode(nextMode);
        }
      }
    });
  }

  // Setup Tutorial Button
  const tutorialBtn = document.getElementById('btn-tutorial-toggle');
  if (tutorialBtn) {
    tutorialBtn.addEventListener('click', () => {
      tutorialModal.open(1);
    });
  }

  // Setup Council Button (Dossier Mode)
  const councilBtn = document.getElementById('btn-council-toggle');
  if (councilBtn) {
    councilBtn.addEventListener('click', () => {
      AudioManager.getInstance().playUiClick();
      councilModal.open('dossier');
    });
  }

  // Setup Header Buttons
  const langBtn = document.getElementById('btn-lang-toggle');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      AudioManager.getInstance().playUiClick();
      const current = getLanguage();
      const next = current === 'de' ? 'en' : 'de';
      setLanguage(next);
      langBtn.textContent = next.toUpperCase();
    });
  }

  const audioBtn = document.getElementById('btn-audio-toggle');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      AudioManager.getInstance().init();
      const isMuted = AudioManager.getInstance().toggleMute();
      audioBtn.classList.toggle('text-rose-400', isMuted);
      audioBtn.classList.toggle('text-slate-300', !isMuted);
    });
  }

  const speedBtn = document.getElementById('btn-speed-toggle');
  if (speedBtn) {
    speedBtn.addEventListener('click', () => {
      AudioManager.getInstance().playUiClick();
      currentSpeedIndex = (currentSpeedIndex + 1) % speedOptions.length;
      const chosen = speedOptions[currentSpeedIndex];
      speedBtn.textContent = chosen;
      GameState.getInstance().setGameSpeed(speedMultiplierMap[chosen]);
    });
  }

  // Update Header text on language change
  const updateHeaderLabels = () => {
    const seasonEl = document.getElementById('header-season-label');
    const weekEl = document.getElementById('header-week-label');
    const creditsEl = document.getElementById('header-credits');
    const auctionLabelEl = document.getElementById('header-auction-label');
    const councilLabelEl = document.getElementById('header-council-label');
    const councilBadgeEl = document.getElementById('header-council-badge');
    const helpLabelEl = document.getElementById('header-help-label');
    const langBtn = document.getElementById('btn-lang-toggle');
    const pilotNameEl = document.getElementById('header-pilot-name');
    const modeIconEl = document.getElementById('header-mode-icon');
    const modeLabelEl = document.getElementById('header-mode-label');
    const modeBtnEl = document.getElementById('btn-mode-toggle');

    const gs = GameState.getInstance().getData();
    if (seasonEl) seasonEl.textContent = `${t('header.season')} ${gs.season}`;
    if (weekEl) weekEl.textContent = `${t('header.week')} ${gs.week}/12`;
    if (creditsEl) creditsEl.textContent = gs.credits.toString();
    if (auctionLabelEl) auctionLabelEl.textContent = t('header.auction').toUpperCase();
    if (councilLabelEl) councilLabelEl.textContent = t('header.council');
    if (councilBadgeEl) councilBadgeEl.textContent = `${gs.councilShares}/30`;
    if (helpLabelEl) helpLabelEl.textContent = t('header.help');
    if (langBtn) langBtn.textContent = getLanguage().toUpperCase();
    if (pilotNameEl) pilotNameEl.textContent = gs.playerName || 'Captain Sky';

    const isSolo = (gs.gameMode ?? 'solo') === 'solo';
    if (modeIconEl) modeIconEl.textContent = isSolo ? '🛡️' : '⚔️';
    if (modeLabelEl) modeLabelEl.textContent = isSolo ? t('header.modeSolo') : t('header.modeArena');
    if (modeBtnEl) {
      modeBtnEl.title = isSolo ? t('header.modeSoloDesc') : t('header.modeArenaDesc');
    }
  };

  pilotModal.onNameChange(() => updateHeaderLabels());

  onLanguageChange(updateHeaderLabels);
  updateHeaderLabels();
}

// Phaser 3 Full-Screen Game Configuration
const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-game',
  backgroundColor: '#0F172A',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  scene: [BootScene, AuctionScene, SkyHarvestScene],
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
};

// Start UI and Phaser Engine
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  const game = new Phaser.Game(phaserConfig);
  phaserGameInstance = game;

  // Setup Auction Button to open/restart Auction Scene
  const auctionBtn = document.getElementById('btn-auction-toggle');
  if (auctionBtn) {
    auctionBtn.addEventListener('click', () => {
      AudioManager.getInstance().playUiClick();
      const leftSidebar = document.getElementById('desktop-left-sidebar');
      const rightSidebar = document.getElementById('desktop-right-sidebar');
      const mobileDock = document.getElementById('mobile-thumb-dock');
      if (leftSidebar) leftSidebar.style.display = 'none';
      if (rightSidebar) rightSidebar.style.display = 'none';
      if (mobileDock) mobileDock.style.display = 'none';
      game.scene.stop('SkyHarvestScene');
      game.scene.start('AuctionScene');
    });
  }

  // Forward Toolbar and Drill Head events to Phaser game & active scene
  toolBar.onToolChange((tool) => {
    game.events.emit('tool:change', tool);
    if (tool === 'sell') {
      harborModal.open('market');
    }
    const scene = game.scene.getScene('SkyHarvestScene') as SkyHarvestScene | undefined;
    if (scene && typeof scene.setTool === 'function') {
      scene.setTool(tool);
    }
  });

  game.events.on('harbor:open', (tab?: 'market' | 'upgrades') => {
    harborModal.open(tab ?? 'market');
  });

  toolBar.onDrillHeadChange((head) => {
    game.events.emit('drillhead:change', head);
    const scene = game.scene.getScene('SkyHarvestScene') as SkyHarvestScene | undefined;
    if (scene && typeof scene.setDrillHead === 'function') {
      scene.setDrillHead(head);
    }
  });

  toolBar.onScanToolChange((scanTool) => {
    game.events.emit('scantool:change', scanTool);
    const scene = game.scene.getScene('SkyHarvestScene') as SkyHarvestScene | undefined;
    if (scene && typeof scene.setScanTool === 'function') {
      scene.setScanTool(scanTool);
    }
  });

  // Resize handler to notify Phaser when layout adapts
  responsive.onLayoutChange(() => {
    game.scale.refresh();
  });

  // Enable Web Audio on first user interaction anywhere
  const unlockAudio = () => {
    AudioManager.getInstance().init();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
});
