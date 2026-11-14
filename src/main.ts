import './style.css';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { SkyHarvestScene } from './scenes/SkyHarvestScene';
import { ResponsiveLayout } from './ui/ResponsiveLayout';
import { ToolBar } from './ui/ToolBar';
import { DesktopRadar } from './ui/DesktopRadar';
import { MarketTicker } from './ui/MarketTicker';
import { AudioManager } from './audio/AudioManager';
import { getLanguage, setLanguage, t, onLanguageChange } from './i18n/i18n';
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

// Global Game State placeholders for Phase 0 Shell
let currentSeason = 1;
let currentWeek = 1;
let currentCredits = 250;
let currentSpeedIndex = 1;
const speedOptions = ['0.5x', '1.0x', '2.0x', 'PAUSE'];

// Initialize UI Managers
const responsive = ResponsiveLayout.getInstance();
const toolBar = new ToolBar();
const desktopRadar = new DesktopRadar();
const marketTicker = new MarketTicker();

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
    if (seasonEl) seasonEl.textContent = `${t('header.season')} ${currentSeason}`;
    if (weekEl) weekEl.textContent = `${t('header.week')} ${currentWeek}`;
    if (creditsEl) creditsEl.textContent = currentCredits.toString();
  };

  onLanguageChange(updateHeaderLabels);
  updateHeaderLabels();
}

// Phaser 3 Game Configuration
const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-game',
  width: 540,
  height: 960,
  backgroundColor: '#0F172A',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, SkyHarvestScene],
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
