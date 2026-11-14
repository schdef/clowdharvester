import { StemMixer, StemId } from './StemMixer';

/**
 * Cloud Harvesters - Audio & Haptics Manager
 * Handles Web Audio API lifecycle, Foley effects, and adaptive background stems.
 */
export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private mixer: StemMixer;
  private isInitialized = false;

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
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.mixer.init(this.ctx);
      this.isInitialized = true;

      // Start melody stem gently
      this.mixer.setStemVolume('ambient', 0.5, 1.0);
      this.mixer.setStemVolume('melody', 0.4, 2.0);
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
