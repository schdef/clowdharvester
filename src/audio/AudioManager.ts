import { StemMixer, StemId } from './StemMixer';
import { ZoneType } from '../gfx/ColorPalette';

/**
 * Cloud Harvesters - Audio & Haptics Manager
 * Handles Web Audio API lifecycle, Foley effects, adaptive background stems,
 * continuous drilling sounds, and micro-haptic feedback.
 */
export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private mixer: StemMixer;
  private isInitialized = false;

  // Continuous Drilling Sound Nodes
  private drillOsc: OscillatorNode | null = null;
  private drillSubOsc: OscillatorNode | null = null;
  private drillFilter: BiquadFilterNode | null = null;
  private drillGain: GainNode | null = null;
  private isDrillActive = false;
  private lastHapticTime = 0;

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
      this.initDrillAudioGraph();
      this.isInitialized = true;

      // Start melody stem gently
      this.mixer.setStemVolume('ambient', 0.5, 1.0);
      this.mixer.setStemVolume('melody', 0.4, 2.0);
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
    }
  }

  private initDrillAudioGraph(): void {
    if (!this.ctx) return;
    try {
      this.drillGain = this.ctx.createGain();
      this.drillGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      this.drillFilter = this.ctx.createBiquadFilter();
      this.drillFilter.type = 'lowpass';
      this.drillFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
      this.drillFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      // Primary oscillator (mechanical rotor hum)
      this.drillOsc = this.ctx.createOscillator();
      this.drillOsc.type = 'triangle';
      this.drillOsc.frequency.setValueAtTime(110, this.ctx.currentTime);

      // Sub oscillator (deep rumble)
      this.drillSubOsc = this.ctx.createOscillator();
      this.drillSubOsc.type = 'sawtooth';
      this.drillSubOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

      this.drillOsc.connect(this.drillFilter);
      this.drillSubOsc.connect(this.drillFilter);
      this.drillFilter.connect(this.drillGain);
      this.drillGain.connect(this.ctx.destination);

      this.drillOsc.start();
      this.drillSubOsc.start();
    } catch (err) {
      console.warn('Could not setup drill audio graph:', err);
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
   * Updates procedural continuous drilling sound and triggers micro-haptic vibration.
   */
  public updateDrillSound(isDrilling: boolean, zone: ZoneType, isMatching: boolean): void {
    if (!this.ctx || !this.drillGain || !this.drillOsc || !this.drillSubOsc || !this.drillFilter) {
      if (isDrilling) this.init();
      return;
    }

    const now = this.ctx.currentTime;

    if (!isDrilling) {
      if (this.isDrillActive) {
        this.drillGain.gain.setTargetAtTime(0.0001, now, 0.06);
        this.isDrillActive = false;
      }
      return;
    }

    this.isDrillActive = true;

    // Pitch according to zone depth
    let baseFreq = 120;
    let cutoff = 300;
    if (zone === 'high') {
      baseFreq = 160;
      cutoff = 450;
    } else if (zone === 'mid') {
      baseFreq = 110;
      cutoff = 320;
    } else {
      // Low zone deep heavy rumble
      baseFreq = 70;
      cutoff = 220;
    }

    // Unmatched head produces rougher, slightly detuned whine
    if (!isMatching) {
      baseFreq *= 1.25;
      cutoff *= 1.4;
    }

    this.drillOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.drillSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
    this.drillFilter.frequency.setTargetAtTime(cutoff, now, 0.05);

    const targetGain = isMatching ? 0.12 : 0.18;
    this.drillGain.gain.setTargetAtTime(targetGain, now, 0.05);

    // Micro-haptic pulsation during active drilling (~140ms intervals)
    const currentMs = performance.now();
    if (currentMs - this.lastHapticTime > 140) {
      this.lastHapticTime = currentMs;
      if (zone === 'high') {
        this.triggerHaptic([8, 12]);
      } else if (zone === 'mid') {
        this.triggerHaptic([12, 16]);
      } else {
        this.triggerHaptic([16, 24]);
      }
    }
  }

  /**
   * Stop drill sound immediately.
   */
  public stopDrill(): void {
    if (this.ctx && this.drillGain) {
      this.drillGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.04);
    }
    this.isDrillActive = false;
  }

  /**
   * Play procedural Foley UI Click sound
   */
  public playUiClick(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);

    this.triggerHaptic([8]);
  }

  /**
   * Play Windfühler Sonar Ping sound
   */
  public playSonarPing(distanceRatio = 1.0): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Frequency shifts higher when closer to target
    const baseFreq = 880 + (1.0 - Math.min(1.0, distanceRatio)) * 600;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.48);

    this.triggerHaptic([12, 20]);
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
    osc.frequency.setValueAtTime(1200 + Math.random() * 400, now);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
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
    plopGain.gain.setValueAtTime(0.2, now);
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

    this.triggerHaptic([25, 40, 25]);
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

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    this.triggerHaptic([15, 20]);
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
