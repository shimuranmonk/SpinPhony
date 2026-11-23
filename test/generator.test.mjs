import assert from "node:assert/strict";
import test from "node:test";
import { drills as library, starterDrills as drills } from "../.test-build/catalog.js";
import { exportTimeline, feedRate, validateTrack } from "../.test-build/generator.js";
import { estimateRhythm } from "../.test-build/rhythm.js";
import { detectMusicMarkers } from "../.test-build/music.js";
import { readTimeline, suggestTimeline } from "../.test-build/score.js";

const track = { filename: "pulse.wav", durationMs: 24000, sha256: "a".repeat(64), rhythm: { bpm: 120 }, markers: [{ timeMs: 0, kind: "section" }, { timeMs: 250, kind: "hit" }, { timeMs: 1320, kind: "hit" }] };
const rhythm = { bpm: 120, firstBeatMs: 250 };
const profile = { pace: "steady", handedness: "right" };

test("periodic transients produce a tempo and first beat, even with opposite-phase stereo", () => {
  const rate = 12000;
  const channel = new Float32Array(10 * rate);
  for (let sample = rate / 4; sample < channel.length; sample += rate / 2) {
    channel.fill(0.6, sample, sample + 120);
  }
  assert.deepEqual(estimateRhythm([channel, channel.map(sample => -sample)], rate), rhythm);
});

test("silence and uneven transients need manual tempo", () => {
  const rate = 12000;
  const channel = new Float32Array(10 * rate);
  assert.equal(estimateRhythm([channel], rate), null);
  for (const second of [0.25, 0.55, 1.4, 2.9, 4.25, 5.2, 7.05]) {
    channel.fill(0.6, Math.round(second * rate), Math.round(second * rate) + 120);
  }
  assert.equal(estimateRhythm([channel], rate), null);
});

test("repeated rhythmic accents survive extra offbeat transients", () => {
  const rate = 12000;
  const channel = new Float32Array(12 * rate);
  for (let beat = 0; beat < 21; beat++) {
    const sample = 3000 + beat * 6000;
    channel.fill(0.6, sample, sample + 120);
    const pickup = sample + [2400, 3360, 2760][beat % 3];
    channel.fill(0.5, pickup, pickup + 120);
  }
  const result = estimateRhythm([channel], rate);
  assert.ok(result);
  assert.ok(Math.abs(result.bpm - 120) <= 1);
  assert.ok(Math.abs(result.firstBeatMs - 250) <= 20);
});

function compile(selected, configured = profile, audio = track) {
  const feedBpm = feedRate(audio, configured);
  const text = suggestTimeline(audio, selected);
  return { ...readTimeline(text, audio.durationMs, selected, feedBpm), feedBpm, text };
}

test("detector finds irregular opening accents and a sustained section change", () => {
  const rate = 12000;
  const channel = new Float32Array(16 * rate);
  for (const time of [0.45, 1.55, 1.78, 2.02, 3.35, 3.73]) {
    const start = Math.round(time * rate);
    channel.fill(0.65, start, start + 180);
  }
  for (let i = rate * 7; i < channel.length; i++) channel[i] = 0.25 * Math.sin(i * 0.24);
  const markers = detectMusicMarkers([channel], rate);
  for (const expected of [450, 1550, 1780, 2020, 3350, 3730]) {
    assert.ok(markers.some(marker => marker.kind === "hit" && Math.abs(marker.timeMs - expected) <= 20), expected);
  }
  assert.ok(markers.some(marker => marker.kind === "section" && Math.abs(marker.timeMs - 7000) <= 220));
  assert.deepEqual(detectMusicMarkers([new Float32Array(rate * 10)], rate), [{ timeMs: 0, kind: "section" }]);
});

test("drill choices leave musical marker times unchanged and each hit exports ONCE", () => {
  const one = compile([drills[0]]);
  const two = compile([drills[1], drills[2]]);
  assert.deepEqual(one.lines.map(line => line.timeMs), [0, 250, 1320, 24000]);
  assert.deepEqual(two.lines.map(line => line.timeMs), one.lines.map(line => line.timeMs));
  const source = exportTimeline(track, two.cues, profile, two.feedBpm);
  assert.ok(source.includes("SHA256=" + track.sha256));
  assert.match(source, /00:00\.250 INLINE=INL_ALTERNATE;ONCE/);
  assert.match(source, /00:01\.320 INLINE=INL_FALKENBERG;ONCE/);
  assert.match(source, /00:24\.000 STOP\n$/);
});

test("a section assignment distributes exactly five cycles and preserves hit lines", () => {
  const start = compile(drills);
  const edited = start.text.replace("SECTION | - | Section 1", "SECTION | Forehand drive x5 | Chorus");
  const result = readTimeline(edited, track.durationMs, drills, 60);
  assert.equal(result.lines.filter(line => line.kind === "HIT").length, 2);
  assert.deepEqual(result.cues.map(cue => cue.timeMs), [0, 4800, 9600, 14400, 19200, 24000]);
  assert.ok(result.cues.slice(0, -1).every(cue => cue.once && cue.drill === drills[0]));
  assert.match(exportTimeline(track, result.cues, profile, 60), /Chorus · Repeat 5 of 5/);
});

test("text validation reports line numbers for unknown drills and repeats that do not fit", () => {
  const start = compile(drills);
  assert.throws(() => readTimeline(start.text.replace("Forehand drive", "Unknown drill"), 24000, drills, 60), /Line 2/);
  assert.throws(() => readTimeline(start.text.replace("SECTION | -", "SECTION | Falkenberg x50"), 24000, drills, 60), /Line 1/);
  assert.throws(() => readTimeline(start.text.replace("00:24.000", "00:23.000"), 24000, drills, 60), /Line 4/);
});

test("export reflects handedness and checks audio identity", () => {
  const left = { ...profile, handedness: "left", pace: "active" };
  const { cues, feedBpm } = compile([drills[0]], left);
  assert.match(exportTimeline(track, cues, left, feedBpm), /DROP=-4;BPM=60/);
  assert.throws(() => validateTrack({ ...track, filename: ".wav" }));
  assert.throws(() => validateTrack({ ...track, filename: "music\n[CUES].wav" }));
  assert.throws(() => validateTrack({ ...track, sha256: "123" }));
});

test("all catalog entries produce timelines accepted by a supplied frozen v1 validator", {
  skip: !process.env.MSYNC_VALIDATOR,
}, async () => {
  const { validateMsyncSource } = await import(process.env.MSYNC_VALIDATOR);
  for (const handedness of ["right", "left"]) {
    const configured = { ...profile, handedness };
    const { cues, feedBpm } = compile(drills, configured);
    cues[0] = { timeMs: 500, command: "INLINE", drill: drills[2] };
    const source = exportTimeline(track, cues, configured, feedBpm);
    const result = validateMsyncSource(source, {
      track: {
        filename: track.filename,
        metadata: { sha256: track.sha256 },
        duration: track.durationMs / 1000,
      },
    });
    assert.equal(result.valid, true, JSON.stringify(result.errors));
    assert.equal(result.warnings.length, 0, JSON.stringify(result.warnings));
    for (const drill of library) {
      const single = compile([drill], configured);
      const output = exportTimeline(track, single.cues, configured, single.feedBpm);
      const validated = validateMsyncSource(output);
      assert.equal(validated.valid, true, drill.name + ": " + JSON.stringify(validated.errors));
      assert.equal(validated.warnings.length, 0, drill.name + ": " + JSON.stringify(validated.warnings));
    }
  }
});

test("library exports short backspin and random feeds as distinct settings", () => {
  assert.equal(new Set(library.map(drill => drill.id)).size, library.length);
  const drill = library.find(drill => drill.id === "INL_ALL_RANDOM");
  const result = compile([drill]);
  const source = exportTimeline(track, result.cues, profile, result.feedBpm);
  assert.match(source, /RANDOM=true/);
  assert.match(source, /SPEED=3;SPIN=2;TYPE=back/);
  assert.match(source, /SPEED=5;SPIN=2;TYPE=top/);
});

test("editing a cue changes the export and invalid times block it", () => {
  const { cues, feedBpm } = compile([drills[0]]);
  cues[0] = { timeMs: 500, command: "INLINE", drill: drills[2] };
  assert.match(exportTimeline(track, cues, profile, feedBpm), /00:00\.500 INLINE=INL_FALKENBERG/);
  for (const timeMs of [NaN, -1, 0.1, cues[1].timeMs, cues[1].timeMs + 1]) {
    assert.throws(() => exportTimeline(track, [{ ...cues[0], timeMs }, ...cues.slice(1)], profile, feedBpm));
  }
});

test("drill descriptions and cue notes stay on separate MSYNC comment lines", () => {
  const { cues, feedBpm } = compile([drills[0]]);
  cues[0].note = "Forehand multiball\n00:02.000 STOP";
  const source = exportTimeline(track, cues, profile, feedBpm);
  assert.match(source, /\[INLINE:INL_FOREHAND\]\n# Drill: Forehand drive/);
  assert.match(source, /# Forehand drive — Forehand multiball 00:02\.000 STOP\n00:00\.250 INLINE=INL_FOREHAND;ONCE/);
  assert.match(source, /# End of track\n00:24\.000 STOP/);
  assert.doesNotMatch(source, /^00:02\.000 STOP$/m);
});
