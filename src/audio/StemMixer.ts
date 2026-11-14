/**
 * Cloud Harvesters - StemMixer
 * Manages 4 multi-stems with smooth crossfades and low-pass filtering.
 * Features built-in procedural Web Audio synthesizers as zero-asset fallbacks.
 */

export type StemId = 'ambient' | 'melody' | 'depth' | 'tension';

export class StemMixer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private stemGains: Map<StemId, GainNode> = new Map();
  private filterNode: BiquadFilterNode | null = null;
  private isSynthesizing = false;
  private synthInterval: number | null = null;
  private isMuted = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init(context: AudioContext): void {
    this.ctx = context;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    // Master low-pass filter (for deep-dive probe submersion)
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(20000, this.ctx.currentTime);

    this.masterGain.connect(this.filterNode);
    this.filterNode.connect(this.ctx.destination);

    // Initialize 4 stems
    const stems: StemId[] = ['ambient', 'melody', 'depth', 'tension'];
    stems.forEach((stem) => {
      if (!this.ctx || !this.masterGain) return;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(stem === 'ambient' ? 0.6 : 0, this.ctx.currentTime);
      gain.connect(this.masterGain);
      this.stemGains.set(stem, gain);
    });

    this.startProceduralAmbient();
  }

  /**
   * Set volume for a specific stem with smooth linear ramp
   */
  public setStemVolume(stem: StemId, volume: number, fadeTimeSec = 0.5): void {
    if (!this.ctx) return;
    const gainNode = this.stemGains.get(stem);
    if (gainNode) {
      const now = this.ctx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)), now + fadeTimeSec);
    }
  }

  /**
   * Adjust low-pass filter frequency based on probe depth (0 = surface, 1 = deep)
   */
  public setDepthFilter(depthRatio: number): void {
    if (!this.ctx || !this.filterNode) return;
    // 20000 Hz at surface down to 600 Hz at deep zone
    const freq = 20000 - Math.min(1, Math.max(0, depthRatio)) * 19400;
    this.filterNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.2);
  }

  public setMasterVolume(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : vol, this.ctx.currentTime);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * Procedural ambient sound generator using Web Audio oscillators & noise buffer
   * Creates a delicate Neo-Classical / Monument Valley style soundscape
   */
  private startProceduralAmbient(): void {
    if (!this.ctx || this.isSynthesizing) return;
    this.isSynthesizing = true;

    // Stem A: Gentle Wind / Pad Drone
    const ambientGain = this.stemGains.get('ambient');
    if (ambientGain) {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const padGain = this.ctx.createGain();
      padGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(146.83, this.ctx.currentTime); // D3
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(220.0, this.ctx.currentTime);  // A3

      osc1.connect(padGain);
      osc2.connect(padGain);
      padGain.connect(ambientGain);

      osc1.start();
      osc2.start();
    }

    // Stem B: Minimalist Piano / Chime notes (D maj / F# min pentatonic)
    const notes = [293.66, 329.63, 369.99, 440.0, 554.37, 587.33]; // D4, E4, F#4, A4, C#5, D5
    let noteIdx = 0;
    this.synthInterval = window.setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      const melodyGain = this.stemGains.get('melody');
      if (!melodyGain || melodyGain.gain.value <= 0.05) return;

      const freq = notes[noteIdx % notes.length];
      noteIdx = (noteIdx + 1) % notes.length;

      const now = this.ctx.currentTime;
      const noteOsc = this.ctx.createOscillator();
      const noteEnv = this.ctx.createGain();

      noteOsc.type = 'sine';
      noteOsc.frequency.setValueAtTime(freq, now);

      noteEnv.gain.setValueAtTime(0.001, now);
      noteEnv.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
      noteEnv.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      noteOsc.connect(noteEnv);
      noteEnv.connect(melodyGain);

      noteOsc.start(now);
      noteOsc.stop(now + 2.3);
    }, 2800);
  }

  public destroy(): void {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    this.stemGains.clear();
  }
}
