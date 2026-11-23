export type MusicMarker = { timeMs: number; kind: "hit" | "section" };

export function detectMusicMarkers(channels: Float32Array[], sampleRate: number): MusicMarker[] {
  const frameSamples = Math.round(sampleRate / 100);
  const frameMs = frameSamples * 1000 / sampleRate;
  const length = Math.floor(channels[0].length / frameSamples);
  const level = new Float64Array(length);
  const brightness = new Float64Array(length);
  const attack = new Float64Array(length);

  for (let frame = 0; frame < length; frame++) {
    const start = frame * frameSamples;
    let energy = 0;
    let highEnergy = 0;
    for (const channel of channels) {
      for (let i = start; i < start + frameSamples; i++) {
        energy += channel[i] ** 2;
        highEnergy += (channel[i] - (channel[i - 1] ?? 0)) ** 2;
      }
    }
    level[frame] = Math.sqrt(energy / (frameSamples * channels.length));
    brightness[frame] = Math.sqrt(highEnergy / (frameSamples * channels.length));
    const previous = Math.max(0, frame - 2);
    attack[frame] = Math.max(0, level[frame] - (frame ? level[previous] : 0))
      + Math.max(0, brightness[frame] - (frame ? brightness[previous] : 0));
  }

  const markers: MusicMarker[] = [{ timeMs: 0, kind: "section" }];
  const peak = attack.reduce((max, value) => Math.max(max, value), 0);
  const hits: number[] = [];
  const lookaround = 20;
  for (let i = 0; i < length - 1; i++) {
    let local = 0;
    const first = Math.max(0, i - lookaround);
    const last = Math.min(length - 1, i + lookaround);
    for (let j = first; j <= last; j++) local += attack[j];
    if (attack[i] < Math.max(0.004, peak * 0.09, local / (last - first + 1) * 2.7)
      || attack[i] <= (attack[i - 1] ?? 0) || attack[i] < attack[i + 1]) continue;
    const previous = hits.at(-1);
    if (previous === undefined || (i - previous) * frameMs >= 110) hits.push(i);
    else if (attack[i] > attack[previous]) hits[hits.length - 1] = i;
  }

  // Compare adjacent two-second windows for sustained changes in loudness and texture.
  const width = Math.round(2000 / frameMs);
  const levelSum = new Float64Array(length + 1);
  const brightSum = new Float64Array(length + 1);
  for (let i = 0; i < length; i++) {
    levelSum[i + 1] = levelSum[i] + level[i];
    brightSum[i + 1] = brightSum[i] + brightness[i];
  }
  const candidates: { frame: number; score: number }[] = [];
  const step = Math.max(1, Math.round(100 / frameMs));
  for (let i = width; i + width <= length; i += step) {
    const before = (levelSum[i] - levelSum[i - width]) / width;
    const after = (levelSum[i + width] - levelSum[i]) / width;
    if (Math.max(before, after) < 0.012) continue;
    const brightBefore = (brightSum[i] - brightSum[i - width]) / width;
    const brightAfter = (brightSum[i + width] - brightSum[i]) / width;
    const score = Math.abs(Math.log((after + 0.008) / (before + 0.008)))
      + 0.65 * Math.abs(Math.log((brightAfter / (after + 0.008) + 0.05)
        / (brightBefore / (before + 0.008) + 0.05)));
    if (score > 0.9) candidates.push({ frame: i, score });
  }

  const sections = [0];
  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    if (sections.some(frame => Math.abs(frame - candidate.frame) * frameMs < 3500)
      || (length - candidate.frame) * frameMs < 2500) continue;
    const nearby = hits.filter(frame => Math.abs(frame - candidate.frame) * frameMs <= 220);
    const boundary = nearby.reduce((best, frame) =>
      attack[frame] > attack[best] ? frame : best, nearby[0] ?? candidate.frame);
    sections.push(boundary);
    markers.push({ timeMs: Math.round(boundary * frameMs), kind: "section" });
  }
  for (const hit of hits) {
    markers.push({ timeMs: Math.round(hit * frameMs), kind: "hit" });
  }
  return markers.sort((a, b) => a.timeMs - b.timeMs);
}
