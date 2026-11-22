const hopSeconds = 0.01;
const minDuration = 8;
const maxDuration = 360;
const maxBytes = 32 * 1024 * 1024;

export type Rhythm = { bpm: number; firstBeatMs: number };
export type Track = {
  filename: string;
  durationMs: number;
  sha256: string;
  rhythm: Rhythm | null;
};

export function estimateRhythm(channels: Float32Array[], sampleRate: number): Rhythm | null {
  const hop = Math.round(sampleRate * hopSeconds);
  const secondsPerHop = hop / sampleRate;
  const frames = Math.floor(channels[0].length / hop);
  const novelty = new Float64Array(frames);
  let previous = 0;
  let total = 0;
  let peak = 0;
  for (let frame = 0; frame < frames; frame++) {
    let energy = 0;
    for (const channel of channels) {
      for (let i = frame * hop; i < (frame + 1) * hop; i += 4) {
        energy += channel[i] ** 2;
      }
    }
    const loudness = Math.sqrt(energy / (channels.length * Math.ceil(hop / 4)));
    if (frame > 0) {
      const change = Math.max(0, loudness - previous);
      novelty[frame] = change;
      total += change;
      peak = Math.max(peak, change);
    }
    previous = loudness;
  }

  const threshold = Math.max(peak * 0.15, total / frames * 3, 0.002);
  const onsets: number[] = [];
  for (let i = 1; i < frames - 1; i++) {
    if (novelty[i] >= threshold && novelty[i] > novelty[i - 1] && novelty[i] >= novelty[i + 1]
      && (onsets.length === 0 || (i - onsets[onsets.length - 1]) * secondsPerHop >= 0.18)) {
      onsets.push(i);
    }
  }

  if (onsets.length < 5) return null;
  const gaps = onsets.slice(1).map((onset, index) => (onset - onsets[index]) * secondsPerHop);
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const matching = gaps.filter(gap => Math.abs(gap - median) <= median * 0.08);
  const period = matching.reduce((sum, gap) => sum + gap, 0) / matching.length;
  if (matching.length / gaps.length < 0.7 || period < 1 / 3 - 0.005 || period > 1.5 + 0.005) {
    return null;
  }
  const firstMatchingGap = gaps.findIndex(gap => Math.abs(gap - median) <= median * 0.08);
  return {
    bpm: Math.min(180, Math.max(40, Math.round(60 / period * 10) / 10)),
    firstBeatMs: Math.round(onsets[firstMatchingGap] * secondsPerHop * 1000),
  };
}

export async function analyzeFile(file: File): Promise<Track> {
  if (!file.size || file.size > maxBytes) throw new Error("Choose an audio file up to 32 MiB.");
  if (!globalThis.crypto?.subtle) throw new Error("Open SpinPhony over HTTPS or localhost.");
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const context = new AudioContext({ sampleRate: 12000 });
  try {
    const audio = await context.decodeAudioData(bytes).catch(() => {
      throw new Error("This browser could not decode the file. Try a WAV or MP3.");
    });
    if (audio.duration < minDuration || audio.duration > maxDuration) {
      throw new Error("Choose audio between 8 seconds and 6 minutes.");
    }
    const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
    return {
      filename: file.name,
      sha256,
      durationMs: Math.round(audio.duration * 1000),
      rhythm: estimateRhythm(channels, audio.sampleRate),
    };
  } finally {
    await context.close();
  }
}
