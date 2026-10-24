/**
 * Deadline Heavyweight - Procedural Web Audio API Synthesizer
 * 100% offline audio synthesis for visceral impacts and sub-bass thuds.
 */

class ProceduralImpactAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Generates a deep, physical sub-bass thud with metallic transient bite.
   * @param {number} velocity Impact velocity magnitude (e.g. 5 to 30)
   * @param {number} mass Cube mass in kg (e.g. 5 to 450)
   * @param {string} stressLevel 'calm' | 'elevated' | 'critical'
   */
  playImpact(velocity = 10.0, mass = 50.0, stressLevel = 'calm') {
    if (!this.enabled) return;
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    
    // Normalize impact energy
    const speedRatio = Math.min(1.0, Math.max(0.1, velocity / 18.0));
    const massRatio = Math.min(1.0, Math.max(0.1, mass / 120.0));
    const impactVolume = Math.min(1.0, speedRatio * 0.65 + massRatio * 0.55);

    if (impactVolume < 0.08) return;

    // 1. Sub-bass Body Oscillator (Heavy Thump)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    // Heavier cubes produce deeper sub-bass pitch
    const startFreq = Math.max(40, 130 - (massRatio * 65));
    const endFreq = Math.max(22, 38 - (massRatio * 16));

    subOsc.type = stressLevel === 'critical' ? 'sawtooth' : 'sine';
    subOsc.frequency.setValueAtTime(startFreq, now);
    subOsc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.32);

    subGain.gain.setValueAtTime(impactVolume * 0.85, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    // Low-pass filter for deep chest-thumping bass
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(stressLevel === 'critical' ? 320 : 200, now);
    filter.frequency.exponentialRampToValueAtTime(55, now + 0.35);

    subOsc.connect(filter);
    filter.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + 0.40);

    // 2. High-Frequency Impact Click / Crack Transient
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04); // 40ms burst
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(stressLevel === 'critical' ? 1200 : 800, now);
    noiseFilter.Q.setValueAtTime(2.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(impactVolume * 0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start(now);
  }
}

window.ProceduralImpactAudio = ProceduralImpactAudio;
