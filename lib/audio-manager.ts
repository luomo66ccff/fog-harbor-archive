import type { AudioSettings } from "@/store/case-store";

export type SoundCue = "terminal" | "paper" | "tape" | "unlock" | "error" | "horn";

type WebkitAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export class FogAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private interfaceGain: GainNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
  private drone: OscillatorNode | null = null;
  private settings: AudioSettings = { muted: false, volume: 0.42, ambient: true, interface: true };

  async initialize() {
    if (this.context) {
      if (this.context.state === "suspended") await this.context.resume();
      return;
    }
    const AudioCtor = window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext;
    if (!AudioCtor) throw new Error("Web Audio is unavailable");
    const context = new AudioCtor();
    this.context = context;
    this.master = context.createGain();
    this.ambientGain = context.createGain();
    this.interfaceGain = context.createGain();
    this.master.connect(context.destination);
    this.ambientGain.connect(this.master);
    this.interfaceGain.connect(this.master);

    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * 0.32;
    const noise = context.createBufferSource();
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 520;
    noise.buffer = buffer;
    noise.loop = true;
    noise.connect(lowpass).connect(this.ambientGain);
    noise.start();
    this.noise = noise;

    const drone = context.createOscillator();
    const droneGain = context.createGain();
    drone.type = "sine";
    drone.frequency.value = 47;
    droneGain.gain.value = 0.035;
    drone.connect(droneGain).connect(this.ambientGain);
    drone.start();
    this.drone = drone;
    this.applySettings(this.settings);
  }

  applySettings(settings: AudioSettings) {
    this.settings = settings;
    if (!this.context || !this.master || !this.ambientGain || !this.interfaceGain) return;
    const at = this.context.currentTime;
    this.master.gain.setTargetAtTime(settings.muted ? 0 : settings.volume, at, 0.04);
    this.ambientGain.gain.cancelScheduledValues(at);
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, at);
    this.ambientGain.gain.setTargetAtTime(settings.ambient ? 0.17 : 0, at, 0.15);
    this.interfaceGain.gain.setTargetAtTime(settings.interface ? 0.32 : 0, at, 0.04);
  }

  cue(name: SoundCue) {
    if (!this.context || !this.interfaceGain || this.settings.muted || !this.settings.interface) return;
    const presets: Record<SoundCue, [number, number, OscillatorType]> = {
      terminal: [920, 0.035, "square"], paper: [210, 0.055, "triangle"], tape: [116, 0.12, "sawtooth"],
      unlock: [660, 0.22, "sine"], error: [148, 0.16, "square"], horn: [82, 0.7, "sine"],
    };
    const [frequency, duration, type] = presets[name];
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gain.gain.setValueAtTime(name === "horn" ? 0.11 : 0.08, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.interfaceGain);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
  }

  duckAmbient(durationMs = 1_200) {
    if (!this.context || !this.ambientGain || this.settings.muted || !this.settings.ambient) return;
    const at = this.context.currentTime;
    const restoreAt = at + Math.max(250, durationMs) / 1_000;
    this.ambientGain.gain.cancelScheduledValues(at);
    this.ambientGain.gain.setTargetAtTime(0.035, at, 0.06);
    this.ambientGain.gain.setTargetAtTime(0.17, restoreAt, 0.18);
  }

  cueHarborPattern() {
    if (!this.context || !this.ambientGain || this.settings.muted || !this.settings.ambient) return;
    const start = this.context.currentTime;
    const beats: readonly [offset: number, duration: number][] = [
      [0, 0.12], [0.24, 0.12], [0.48, 0.12], [0.9, 0.58],
    ];
    beats.forEach(([offset, duration]) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      const at = start + offset;
      oscillator.type = "sine";
      oscillator.frequency.value = 82;
      gain.gain.setValueAtTime(0.18, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gain).connect(this.ambientGain!);
      oscillator.start(at);
      oscillator.stop(at + duration);
    });
  }

  async destroy() {
    this.noise?.stop();
    this.drone?.stop();
    await this.context?.close();
    this.context = null;
  }
}
