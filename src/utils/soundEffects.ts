/**
 * Sound synthesis engine using Web Audio API
 * Generates gameshow sound effects with zero external audio assets.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmGain: GainNode | null = null;
  private isBgmPlaying: boolean = false;

  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoiceURI: string | null = null;
  private voiceRate: number = 1.0;
  private voicePitch: number = 1.05;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.voices = window.speechSynthesis.getVoices();
        };
      }
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.voices;
  }

  public getVietnameseVoices(): SpeechSynthesisVoice[] {
    const all = this.getAvailableVoices();
    return all.filter(
      (v) =>
        v.lang.toLowerCase().includes('vi') ||
        v.lang.toLowerCase().includes('vn') ||
        v.name.toLowerCase().includes('vietnam') ||
        v.name.toLowerCase().includes('tiếng việt') ||
        v.name.toLowerCase().includes('hoaimy') ||
        v.name.toLowerCase().includes('namminh') ||
        v.name.toLowerCase().includes('linh')
    );
  }

  public setPreferredVoice(uri: string | null) {
    this.selectedVoiceURI = uri;
  }

  public getPreferredVoice(): string | null {
    return this.selectedVoiceURI;
  }

  public setVoiceRate(rate: number) {
    this.voiceRate = Math.max(0.7, Math.min(1.4, rate));
  }

  public setVoicePitch(pitch: number) {
    this.voicePitch = Math.max(0.7, Math.min(1.4, pitch));
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isBgmPlaying) {
      this.stopBGM();
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(this.volume * 0.15, this.ctx?.currentTime || 0);
    }
  }

  public getVolume() {
    return this.volume;
  }

  /**
   * Snappy click/tick sound for wheel segments or fast cycling
   */
  public playSpinTick(pitch = 1) {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450 * pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150 * pitch, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio autoplay policy handled silently
    }
  }

  /**
   * Suspense countdown tick (3, 2, 1, GO)
   */
  public playCountdownBeep(isFinal = false) {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isFinal ? 'square' : 'sine';
      const freq = isFinal ? 880 : 523.25;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const duration = isFinal ? 0.35 : 0.15;
      gain.gain.setValueAtTime(0.3 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore
    }
  }

  /**
   * Triumphant Winner Fanfare chord progression
   */
  public playWinnerFanfare() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      // Fanfare sequence: C4, E4, G4, C5 arpeggio, then held triumphal chord
      const notes = [
        { f: 523.25, t: 0, d: 0.12 },     // C5
        { f: 659.25, t: 0.12, d: 0.12 },  // E5
        { f: 783.99, t: 0.24, d: 0.16 },  // G5
        { f: 1046.50, t: 0.40, d: 0.8 },  // C6 grand finish
      ];

      notes.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, ctx.currentTime + t);

        gain.gain.setValueAtTime(0.3 * this.volume, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + d);
      });

      // Extra sparkle chime
      setTimeout(() => {
        if (this.isMuted) return;
        this.playSparkle();
      }, 450);
    } catch {
      // Ignore
    }
  }

  /**
   * Magical sparkle shimmer (magic hat, gifts, treasure)
   */
  public playSparkle() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const freqs = [1200, 1500, 1800, 2100, 2400];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = ctx.currentTime + idx * 0.06;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15 * this.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Mystery gift box open sound
   */
  public playGiftOpen() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.25 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      this.playSparkle();
    } catch {
      // Ignore
    }
  }

  /**
   * Bubble pop effect
   */
  public playBubblePop() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startFreq = 400 + Math.random() * 200;
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 2.5, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.35 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Ignore
    }
  }

  /**
   * Rocket whoosh and acceleration sound
   */
  public playRocketLaunch() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 1.2);

      gain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {
      // Ignore
    }
  }

  /**
   * Robot cybernetic beep & scan
   */
  public playRobotScan() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const steps = [440, 880, 660, 1100, 770];
      steps.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        const start = ctx.currentTime + i * 0.07;
        osc.frequency.setValueAtTime(f, start);

        gain.gain.setValueAtTime(0.12 * this.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.06);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Duck Quack Sound for "Bắt vịt" (Vịt kêu Cạp cạp)
   */
  public playDuckQuack() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      [0, 0.18].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        const start = ctx.currentTime + delay;
        osc.frequency.setValueAtTime(320, start);
        osc.frequency.exponentialRampToValueAtTime(200, start + 0.14);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, start);
        filter.Q.setValueAtTime(4.5, start);

        gain.gain.setValueAtTime(0.3 * this.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.15);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Chicken Cluck for "Bắt gà" (Gà kêu Cục tác)
   */
  public playChickenCluck() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const notes = [480, 520, 620, 440];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.09;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, start + 0.08);

        gain.gain.setValueAtTime(0.25 * this.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.08);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Golden Egg Crack & Hatch for "Trộm trứng"
   */
  public playEggCrack() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      // High crisp crunch
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.3 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);

      setTimeout(() => this.playSparkle(), 140);
    } catch {
      // Ignore
    }
  }

  /**
   * Goat Bleat & Bell for "Bịt mắt bắt dê" (Dê kêu Be he he)
   */
  public playGoatBleat() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      // Vibrato bleat
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);

      // 12Hz tremolo/vibrato for goat
      lfo.frequency.setValueAtTime(12, ctx.currentTime);
      lfoGain.gain.setValueAtTime(30, ctx.currentTime);
      lfo.connect(osc.frequency);

      gain.gain.setValueAtTime(0.25 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      lfo.start();
      osc.start();
      lfo.stop(ctx.currentTime + 0.45);
      osc.stop(ctx.currentTime + 0.45);

      // Bell chime
      setTimeout(() => {
        if (this.isMuted) return;
        const bell = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bell.type = 'sine';
        bell.frequency.setValueAtTime(1800, ctx.currentTime);
        bellGain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
        bellGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        bell.connect(bellGain);
        bellGain.connect(ctx.destination);
        bell.start();
        bell.stop(ctx.currentTime + 0.3);
      }, 200);
    } catch {
      // Ignore
    }
  }

  /**
   * Xóc Đĩa Ceramic Bowl & Coins Rattle (Lách cách lách cách)
   */
  public playXocDiaShake() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      // Rapid coin / ceramic impact clinks
      for (let i = 0; i < 6; i++) {
        const start = ctx.currentTime + i * 0.06;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const freqs = [920, 1280, 1650, 1100, 1420, 1850];
        osc.frequency.setValueAtTime(freqs[i % freqs.length], start);

        gain.gain.setValueAtTime(0.25 * this.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.045);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.05);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Bowl lid lift reveal for Xóc đĩa
   */
  public playBowlOpen() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.25 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
      setTimeout(() => this.playSparkle(), 120);
    } catch {
      // Ignore
    }
  }

  /**
   * Treasure chest opening coin sound
   */
  public playTreasureChest() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      // Low creak
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(80, ctx.currentTime);
      osc1.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.25);
      gain1.gain.setValueAtTime(0.18 * this.volume, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.3);

      // Coins clink
      setTimeout(() => {
        this.playSparkle();
      }, 150);
    } catch {
      // Ignore
    }
  }

  /**
   * Cheerful background gameshow melody (looping synthetic rhythm)
   */
  public toggleBGM(): boolean {
    if (this.isBgmPlaying) {
      this.stopBGM();
      return false;
    } else {
      this.startBGM();
      return true;
    }
  }

  public isBgmActive() {
    return this.isBgmPlaying;
  }

  public startBGM() {
    if (this.isMuted || this.isBgmPlaying) return;
    try {
      const ctx = this.initContext();
      this.isBgmPlaying = true;

      // Create a master gain for BGM
      const bgmGain = ctx.createGain();
      bgmGain.gain.setValueAtTime(this.volume * 0.08, ctx.currentTime);
      bgmGain.connect(ctx.destination);
      this.bgmGain = bgmGain;

      // Play a cheerful repeating marimba-like sequence
      const loopNotes = [
        261.63, 329.63, 392.00, 523.25, // C E G C
        392.00, 329.63, 440.00, 392.00, // G E A G
        349.23, 440.00, 523.25, 440.00, // F A C A
        392.00, 349.23, 329.63, 293.66  // G F E D
      ];

      let noteIdx = 0;
      const intervalId = window.setInterval(() => {
        if (!this.isBgmPlaying || this.isMuted) {
          clearInterval(intervalId);
          return;
        }
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          const freq = loopNotes[noteIdx % loopNotes.length];
          osc.frequency.setValueAtTime(freq, ctx.currentTime);

          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

          osc.connect(gain);
          gain.connect(bgmGain);

          osc.start();
          osc.stop(ctx.currentTime + 0.2);
          noteIdx++;
        } catch {
          // Ignore
        }
      }, 240);

      (this as unknown as { bgmInterval: number }).bgmInterval = intervalId;
    } catch {
      this.isBgmPlaying = false;
    }
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    const interval = (this as unknown as { bgmInterval?: number }).bgmInterval;
    if (interval) {
      clearInterval(interval);
      (this as unknown as { bgmInterval?: number }).bgmInterval = undefined;
    }
  }

  /**
   * Dramatic heartbeat thud for countdown suspense
   */
  public playHeartbeat() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      [0, 0.12].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = ctx.currentTime + offset;
        osc.frequency.setValueAtTime(80, start);
        osc.frequency.exponentialRampToValueAtTime(35, start + 0.18);

        gain.gain.setValueAtTime(0.4 * this.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Sound of paper sliding and opening sealed envelope
   */
  public playPaperSlide() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      // Bandpass filtered noise for paper friction
      const bufferSize = ctx.sampleRate * 0.35;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 0.35);
    } catch {
      // Ignore
    }
  }

  /**
   * Lottery balls tumbling in metal wire drum
   */
  public playLotteryTumble() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      for (let i = 0; i < 5; i++) {
        const start = ctx.currentTime + i * 0.05 + Math.random() * 0.02;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600 + Math.random() * 800, start);
        gain.gain.setValueAtTime(0.18 * this.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.05);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Heavy mechanical slot reel stop lock
   */
  public playSlotStop() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.35 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Ignore
    }
  }

  /**
   * Virtual MC Speech in Vietnamese using Web Speech API with explicit Vietnamese voice priority
   * and NFC diacritic normalization for clear tone pronunciation (sắc, huyền, hỏi, ngã, nặng).
   */
  public speakVirtualMC(
    text: string,
    voiceURIOverride?: string,
    rateOverride?: number,
    pitchOverride?: number
  ) {
    if (this.isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();

      // Normalize Vietnamese text (NFC Unicode, expand abbreviations, remove obstructive emojis)
      const normalized = text
        .normalize('NFC')
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ' ')
        .replace(/\bHS\b/gi, 'học sinh')
        .replace(/\bSTT\b/gi, 'số thứ tự')
        .replace(/\s+/g, ' ')
        .trim();

      const utter = new SpeechSynthesisUtterance(normalized);
      utter.lang = 'vi-VN';
      // Rate 0.95 gives optimal clarity for Vietnamese tones without rushing
      utter.rate = rateOverride || this.voiceRate || 0.96;
      utter.pitch = pitchOverride || this.voicePitch || 1.02;
      utter.volume = Math.max(0.1, this.volume);

      const targetURI = voiceURIOverride || this.selectedVoiceURI;
      const allVoices = this.getAvailableVoices();

      let matchedVoice: SpeechSynthesisVoice | undefined;

      // 1. Try matching explicit user-selected voice URI
      if (targetURI) {
        matchedVoice = allVoices.find((v) => v.voiceURI === targetURI);
      }

      // 2. If no voice or voice is not Vietnamese, look for Vietnamese voices
      if (
        !matchedVoice ||
        (!matchedVoice.lang.toLowerCase().includes('vi') &&
          !matchedVoice.lang.toLowerCase().includes('vn'))
      ) {
        const viVoices = this.getVietnameseVoices();
        if (viVoices.length > 0) {
          // Priority order: Natural/Online/Neural (Hoài My, Nam Minh, An, Google Tiếng Việt, Linh)
          matchedVoice =
            viVoices.find((v) => v.name.includes('HoaiMy') || v.name.includes('Hoài My')) ||
            viVoices.find((v) => v.name.includes('NamMinh') || v.name.includes('Nam Minh')) ||
            viVoices.find((v) => v.name.includes('Google') || v.name.toLowerCase().includes('tiếng việt')) ||
            viVoices.find((v) => v.name.includes('Natural') || v.name.includes('Online')) ||
            viVoices.find((v) => v.name.includes('Linh')) ||
            viVoices[0];
        }
      }

      if (matchedVoice) {
        utter.voice = matchedVoice;
        utter.lang = matchedVoice.lang || 'vi-VN';
      }

      window.speechSynthesis.speak(utter);
    } catch {
      // Audio autoplay or TTS handled gracefully
    }
  }

  /**
   * Physics Firework Rocket Launch Whistle (Ascending whoosh)
   */
  public playFireworkLaunch(pitch = 1) {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(250 * pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800 * pitch, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08 * this.volume, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15 * this.volume, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    } catch {
      // Audio autoplay policy handled silently
    }
  }

  /**
   * Physics Firework Explosion Boom & Sparkle Crackle
   */
  public playFireworkBurst(depth = 1) {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      
      // Low boom
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 * depth, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35 * depth, ctx.currentTime + 0.45);

      gain.gain.setValueAtTime(0.35 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.48);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.48);

      // Sparkling crackles
      const sparkleOsc = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkleOsc.type = 'sawtooth';
      sparkleOsc.frequency.setValueAtTime(1800, ctx.currentTime + 0.05);
      sparkleOsc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);

      sparkleGain.gain.setValueAtTime(0.08 * this.volume, ctx.currentTime + 0.05);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(ctx.destination);
      sparkleOsc.start(ctx.currentTime + 0.05);
      sparkleOsc.stop(ctx.currentTime + 0.3);
    } catch {
      // Ignore
    }
  }

  /**
   * Party popper pop & applause cheer for teacher praise ("Pháo tay khen ngợi")
   */
  public playApplausePopper() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      // Popper pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.4 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);

      // Clapping sequence (3 rapid, rhythmic hand claps)
      [0.08, 0.18, 0.28].forEach((delay) => {
        const clapOsc = ctx.createOscillator();
        const clapGain = ctx.createGain();
        clapOsc.type = 'sine';
        clapOsc.frequency.setValueAtTime(900 + Math.random() * 300, ctx.currentTime + delay);
        clapOsc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + delay + 0.06);

        clapGain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime + delay);
        clapGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.06);

        clapOsc.connect(clapGain);
        clapGain.connect(ctx.destination);
        clapOsc.start(ctx.currentTime + delay);
        clapOsc.stop(ctx.currentTime + delay + 0.06);
      });

      this.playSparkle();
    } catch {
      // Ignore
    }
  }
}

export const sound = new SoundEngine();
