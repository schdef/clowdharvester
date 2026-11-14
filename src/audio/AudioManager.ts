import { StemMixer, StemId } from './StemMixer';
import { ZoneType } from '../gfx/ColorPalette';

/**
 * Cloud Harvesters - Audio & Haptics Manager
 * Handles Web Audio API lifecycle, cheerful friendly Foley effects,
 * cozy Animal Crossing / Monument Valley style acoustics,
 * rhythmic playful Kalimba/Marimba cloud-carving feedback, and micro-haptics.
 */
export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private mixer: StemMixer;
  private isInitialized = false;

  // Cheerful Cloud Carving / Drilling Acoustic State (No harsh buzz or monotone drone!)
  private isDrillActive = false;
  private lastPlingTime = 0;
  private plingStep = 0;
  private lastHapticTime = 0;

  // Pentatonic notes for playful Kalimba/Marimba plings (D Major Pentatonic: D4, E4, F#4, A4, B4, D5, E5, F#5, A5)
  private readonly kalimbaNotes = [
    293.66, // D4
    329.63, // E4
    369.99, // F#4
    440.00, // A4
    493.88, // B4
    587.33, // D5
    659.25, // E5
    739.99, // F#5
    880.00, // A5
  ];

  private constructor() {
    this.mixer = new StemMixer();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Initializes Web Audio Context on user gesture to adhere to browser policy.
   */
  public init(): void {
    if (this.isInitialized) return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.mixer.init(this.ctx);
      this.isInitialized = true;

      // Start warm ambient stems gently
      this.mixer.setStemVolume('ambient', 0.5, 1.2);
      this.mixer.setStemVolume('melody', 0.45, 2.0);
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
    }
  }

  public getMixer(): StemMixer {
    return this.mixer;
  }

  public setStemVolume(stem: StemId, vol: number, fadeTimeSec = 0.5): void {
    this.mixer.setStemVolume(stem, vol, fadeTimeSec);
  }

  public toggleMute(): boolean {
    return this.mixer.toggleMute();
  }

  /**
   * Updates cheerful, friendly cloud carving feedback.
   * Completely replaces harsh continuous drone with playful Kalimba/Marimba plings
   * and soft water droplet bubbling.
   */
  public updateDrillSound(isDrilling: boolean, zone: ZoneType, isMatching: boolean): void {
    if (!this.ctx) {
      if (isDrilling) this.init();
      return;
    }

    if (!isDrilling) {
      this.isDrillActive = false;
      return;
    }

    this.isDrillActive = true;
    const now = performance.now();

    // Rhythmic pling interval: every ~150ms while carving through cloud mist
    const plingInterval = isMatching ? 145 : 185;
    if (now - this.lastPlingTime >= plingInterval) {
      this.lastPlingTime = now;
      this.playCloudCarvePling(zone, isMatching);

      // Micro-haptic pulsation during active carving
      if (now - this.lastHapticTime > 160) {
        this.lastHapticTime = now;
        if (zone === 'high') {
          this.triggerHaptic([6, 10]);
        } else if (zone === 'mid') {
          this.triggerHaptic([10, 14]);
        } else {
          this.triggerHaptic([14, 18]);
        }
      }
    }
  }

  /**
   * Returns whether drill is actively carving.
   */
  public getIsDrilling(): boolean {
    return this.isDrillActive;
  }

  /**
   * Stop drill / carving sound immediately.
   */
  public stopDrill(): void {
    this.isDrillActive = false;
  }

  /**
   * Plays a gentle, playful Kalimba / Marimba pling + water droplet gluckern.
   * Cheerful, delicate, and pleasant (like Animal Crossing / Townscaper).
   */
  private playCloudCarvePling(zone: ZoneType, isMatching: boolean): void {
    if (!this.ctx) return;
    const audioTime = this.ctx.currentTime;

    // Pick note from pentatonic scale based on zone and step
    let noteOffset = 0;
    if (zone === 'high') {
      // High zone: bright, crystal, upper register
      noteOffset = 4;
    } else if (zone === 'mid') {
      // Mid zone: sweet middle marimba register
      noteOffset = 2;
    } else {
      // Low zone: warm, mellow lower kalimba register
      noteOffset = 0;
    }

    const noteIndex = (noteOffset + (this.plingStep % 5)) % this.kalimbaNotes.length;
    this.plingStep++;
    const freq = this.kalimbaNotes[noteIndex];

    // 1. Gentle Kalimba / Marimba Pling Node
    const plingOsc = this.ctx.createOscillator();
    const plingGain = this.ctx.createGain();
    const plingFilter = this.ctx.createBiquadFilter();

    plingFilter.type = 'lowpass';
    plingFilter.frequency.setValueAtTime(isMatching ? 3200 : 1600, audioTime);

    if (zone === 'high') {
      // Crystalline bell shimmer (pure sine + soft bell chime)
      plingOsc.type = 'sine';
    } else if (zone === 'mid') {
      // Soft wooden marimba (triangle wave with smooth roll-off)
      plingOsc.type = 'triangle';
    } else {
      // Warm kalimba tine
      plingOsc.type = isMatching ? 'sine' : 'triangle';
    }

    const baseFreq = isMatching ? freq : freq * 0.94; // non-matching is slightly mellow/subdued
    plingOsc.frequency.setValueAtTime(baseFreq, audioTime);

    // Friendly attack & decay envelope (snappy gentle click, smooth warm ring)
    const vol = isMatching ? 0.08 : 0.05;
    plingGain.gain.setValueAtTime(0.001, audioTime);
    plingGain.gain.linearRampToValueAtTime(vol, audioTime + 0.008);
    plingGain.gain.exponentialRampToValueAtTime(0.0001, audioTime + 0.16);

    plingOsc.connect(plingFilter);
    plingFilter.connect(plingGain);
    plingGain.connect(this.ctx.destination);

    plingOsc.start(audioTime);
    plingOsc.stop(audioTime + 0.18);

    // 2. Playful Water Droplet Gluckern (Zartes Wassertröpfchen)
    if (this.plingStep % 2 === 0) {
      const dropOsc = this.ctx.createOscillator();
      const dropGain = this.ctx.createGain();

      dropOsc.type = 'sine';
      // Quick pitch slide downward gives the delightful "bloop / plop" droplet sensation
      const dropStartFreq = 540 + (Math.random() * 120);
      dropOsc.frequency.setValueAtTime(dropStartFreq, audioTime);
      dropOsc.frequency.exponentialRampToValueAtTime(dropStartFreq * 0.48, audioTime + 0.06);

      dropGain.gain.setValueAtTime(0.035, audioTime);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, audioTime + 0.065);

      dropOsc.connect(dropGain);
      dropGain.connect(this.ctx.destination);

      dropOsc.start(audioTime);
      dropOsc.stop(audioTime + 0.07);
    }
  }

  /**
   * Play procedural Foley UI Click sound
   */
  public playUiClick(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.035);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);

    this.triggerHaptic([6]);
  }

  /**
   * Play Auction Gavel (Auktionshammer) double-strike sound
   */
  public playAuctionGavel(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const playStrike = (time: number, freq: number, vol: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.16);

      const snapOsc = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snapOsc.type = 'triangle';
      snapOsc.frequency.setValueAtTime(520, time);
      snapOsc.frequency.exponentialRampToValueAtTime(110, time + 0.05);

      snapGain.gain.setValueAtTime(vol * 0.7, time);
      snapGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

      snapOsc.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snapOsc.start(time);
      snapOsc.stop(time + 0.07);
    };

    playStrike(now, 220, 0.28);
    playStrike(now + 0.11, 180, 0.35);

    this.triggerHaptic([20, 35, 40]);
  }

  /**
   * Play Auction Bell / Chime (Glocke) for round start / bid reveal
   */
  public playAuctionBell(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Brass chime fundamental (E6 - ~1318 Hz)
    const bell1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    bell1.type = 'sine';
    bell1.frequency.setValueAtTime(1318.5, now);
    gain1.gain.setValueAtTime(0.16, now);
    gain1.gain.exponentialRampToValueAtTime(0.0005, now + 1.2);
    bell1.connect(gain1);
    gain1.connect(this.ctx.destination);
    bell1.start(now);
    bell1.stop(now + 1.25);

    // Harmonic overtone (B6 - ~1975 Hz)
    const bell2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    bell2.type = 'sine';
    bell2.frequency.setValueAtTime(1975.5, now);
    gain2.gain.setValueAtTime(0.09, now);
    gain2.gain.exponentialRampToValueAtTime(0.0005, now + 0.9);
    bell2.connect(gain2);
    gain2.connect(this.ctx.destination);
    bell2.start(now);
    bell2.stop(now + 0.95);

    this.triggerHaptic([12, 25]);
  }

  /**
   * Play high-tech telemetry scan audio sweep
   */
  public playScanTelemetry(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1600, now + 0.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.linearRampToValueAtTime(2000, now + 0.2);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);

    this.triggerHaptic([15, 25]);
  }

  /**
   * Play Windfühler Sonar Ping sound (Harmonic bell ping)
   */
  public playSonarPing(distanceRatio = 1.0): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Friendly, pure sine chime that shifts higher when closer to target
    const baseFreq = 784 + (1.0 - Math.min(1.0, distanceRatio)) * 520; // G5 upwards
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.33, now + 0.07);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);

    this.triggerHaptic([10, 16]);
  }

  /**
   * Play extraction droplet ascending tick
   */
  public playExtractDrop(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100 + Math.random() * 350, now);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  /**
   * Play pocket hit (satisfying crystalline plop)
   */
  public playPocketHit(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Plop fundamental
    const plopOsc = this.ctx.createOscillator();
    const plopGain = this.ctx.createGain();
    plopOsc.type = 'sine';
    plopOsc.frequency.setValueAtTime(320, now);
    plopOsc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    plopGain.gain.setValueAtTime(0.18, now);
    plopGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    plopOsc.connect(plopGain);
    plopGain.connect(this.ctx.destination);
    plopOsc.start(now);
    plopOsc.stop(now + 0.16);

    // Crystalline overtone
    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(1174.66, now + 0.04); // D6
    bellGain.gain.setValueAtTime(0.12, now + 0.04);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    bellOsc.connect(bellGain);
    bellGain.connect(this.ctx.destination);
    bellOsc.start(now + 0.04);
    bellOsc.stop(now + 0.65);

    this.triggerHaptic([20, 35, 20]);
  }

  /**
   * Play cable release / elastic snap
   */
  public playCableRelease(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);

    this.triggerHaptic([12, 16]);
  }

  /**
   * Play cheerful harbor commodity sale chime (coin chimes)
   */
  public playHarborSale(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.08, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.3);
    });

    this.triggerHaptic([10, 20, 30]);
  }

  /**
   * Play mechanical brass upgrade ratchet sound
   */
  public playUpgradeBought(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.16);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);

    this.triggerHaptic([25, 40]);
  }

  /**
   * Taptic / Haptic feedback wrapper
   */
  public triggerHaptic(pattern: number | number[]): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore vibration errors
      }
    }
  }
}
