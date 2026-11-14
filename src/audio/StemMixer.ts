/**
 * Cloud Harvesters - StemMixer
 * Manages 4 multi-stems with smooth crossfades and low-pass filtering.
 * Features built-in procedural Web Audio synthesizers as zero-asset fallbacks.
 * Designed with a warm, cheerful, soothing soundtrack aesthetic
 * inspired by Animal Crossing, Townscaper, and Monument Valley.
 */

export type StemId = 'ambient' | 'melody' | 'depth' | 'tension';

export class StemMixer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private stemGains: Map<StemId, GainNode> = new Map();
  private filterNode: BiquadFilterNode | null = null;
  private isSynthesizing = false;
  private synthInterval: number | null = null;
  private chimeInterval: number | null = null;
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
      gain.gain.setValueAtTime(stem === 'ambient' ? 0.55 : 0, this.ctx.currentTime);
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
    // 20000 Hz at surface down to 750 Hz at deep zone
    const freq = 20000 - Math.min(1, Math.max(0, depthRatio)) * 19250;
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
   * Procedural ambient sound generator using Web Audio oscillators & envelopes.
   * Creates a warm, cheerful, peaceful neo-classical sky ambiance
   * with soothing pads, friendly marimba arpeggios, and wind-chime sparkles.
   */
  private startProceduralAmbient(): void {
    if (!this.ctx || this.isSynthesizing) return;
    this.isSynthesizing = true;

    // Stem A: Warm, Cozy Cloud Pad (D maj9 harmony: D3, A3, F#4, C#5)
    const ambientGain = this.stemGains.get('ambient');
    if (ambientGain) {
      const padFrequencies = [146.83, 220.00, 369.99, 554.37]; // D3, A3, F#4, C#5
      padFrequencies.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const padFilter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(800, this.ctx.currentTime);

        // Very gentle warm bed
        gain.gain.setValueAtTime(0.045 / padFrequencies.length, this.ctx.currentTime);

        osc.connect(padFilter);
        padFilter.connect(gain);
        gain.connect(ambientGain);
        osc.start();
      });
    }

    // Stem B: Friendly, Relaxing Marimba & Kalimba Melody (D Major Pentatonic Motifs)
    // Motifs designed for a cozy, peaceful Animal Crossing / Townscaper atmosphere
    const motifs = [
      [293.66, 369.99, 440.00, 587.33], // D4, F#4, A4, D5 (Ascending sunrise)
      [440.00, 369.99, 329.63, 293.66], // A4, F#4, E4, D4 (Gentle float down)
      [369.99, 493.88, 587.33, 739.99], // F#4, B4, D5, F#5 (Bright sky breeze)
      [587.33, 440.00, 493.88, 369.99], // D5, A4, B4, F#4 (Playful hop)
    ];

    let motifIdx = 0;
    this.synthInterval = window.setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      const melodyGain = this.stemGains.get('melody');
      if (!melodyGain || melodyGain.gain.value <= 0.05) return;

      const motif = motifs[motifIdx % motifs.length];
      motifIdx++;

      // Play each note of the motif gently separated by 240ms
      motif.forEach((noteFreq, notePos) => {
        if (!this.ctx) return;
        const noteTime = this.ctx.currentTime + notePos * 0.24;

        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(noteFreq, noteTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, noteTime);

        // Marimba-like percussive gentle envelope
        env.gain.setValueAtTime(0.0001, noteTime);
        env.gain.linearRampToValueAtTime(0.07, noteTime + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.4);

        osc.connect(filter);
        filter.connect(env);
        env.connect(melodyGain);

        osc.start(noteTime);
        osc.stop(noteTime + 1.45);
      });
    }, 3600);

    // Stem C: Periodic Wind-Chime Sparkle (Zarte Windspiel-Glocken)
    const chimeFrequencies = [1174.66, 1318.51, 1479.98, 1760.00, 2217.46]; // D6, E6, F#6, A6, C#7
    this.chimeInterval = window.setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      const ambientGain = this.stemGains.get('ambient');
      if (!ambientGain || ambientGain.gain.value <= 0.05) return;

      // Random high chime note
      const chimeFreq = chimeFrequencies[Math.floor(Math.random() * chimeFrequencies.length)];
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(chimeFreq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.025, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

      osc.connect(gain);
      gain.connect(ambientGain);

      osc.start(now);
      osc.stop(now + 2.1);
    }, 5400);
  }

  public destroy(): void {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.chimeInterval) {
      clearInterval(this.chimeInterval);
      this.chimeInterval = null;
    }
    this.stemGains.clear();
  }
}
