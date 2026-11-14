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

// Initialize UI Managers
const responsive = ResponsiveLayout.getInstance();
const toolBar = new ToolBar();
const desktopRadar = new DesktopRadar();
const marketTicker = new MarketTicker();
const tutorialModal = TutorialModal.getInstance();

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

  // Setup Tutorial Button
  const tutorialBtn = document.getElementById('btn-tutorial-toggle');
  if (tutorialBtn) {
    tutorialBtn.addEventListener('click', () => {
      tutorialModal.open(1);
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
      speedBtn.textContent = speedOptions[currentSpeedIndex];
    });
  }

  // Update Header text on language change
  const updateHeaderLabels = () => {
    const seasonEl = document.getElementById('header-season-label');
    const weekEl = document.getElementById('header-week-label');
    const creditsEl = document.getElementById('header-credits');
    const auctionLabelEl = document.getElementById('header-auction-label');
    const helpLabelEl = document.getElementById('header-help-label');
    const langBtn = document.getElementById('btn-lang-toggle');

    if (seasonEl) seasonEl.textContent = `${t('header.season')} ${currentSeason}`;
    if (weekEl) weekEl.textContent = `${t('header.week')} ${currentWeek}`;
    if (creditsEl) creditsEl.textContent = GameState.getInstance().getData().credits.toString();
    if (auctionLabelEl) auctionLabelEl.textContent = t('header.auction').toUpperCase();
    if (helpLabelEl) helpLabelEl.textContent = t('header.help');
    if (langBtn) langBtn.textContent = getLanguage().toUpperCase();
  };

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
    const scene = game.scene.getScene('SkyHarvestScene') as SkyHarvestScene | undefined;
    if (scene && typeof scene.setTool === 'function') {
      scene.setTool(tool);
    }
  });

  toolBar.onDrillHeadChange((head) => {
    game.events.emit('drillhead:change', head);
    const scene = game.scene.getScene('SkyHarvestScene') as SkyHarvestScene | undefined;
    if (scene && typeof scene.setDrillHead === 'function') {
      scene.setDrillHead(head);
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
