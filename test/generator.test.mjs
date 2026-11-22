import assert from "node:assert/strict";
import test from "node:test";
import { drills as library, starterDrills as drills } from "../.test-build/catalog.js";
import { exportTimeline, generate } from "../.test-build/generator.js";
import { estimateRhythm } from "../.test-build/rhythm.js";

const track = { filename: "pulse.wav", durationMs: 24000, sha256: "a".repeat(64), rhythm: null };
const rhythm = { bpm: 120, firstBeatMs: 250 };
const profile = { pace: "steady", handedness: "right", workBeats: 8, recoveryBeats: 4 };

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

test("timeline alternates drills, aligns recovery to beats, and stops at audio end", () => {
  const result = generate(track, rhythm, [...drills], profile);
  assert.deepEqual(result.cues.map(cue => [cue.timeMs, cue.command]), [
    [250, "INLINE"], [4250, "IDLE"], [6250, "INLINE"], [10250, "IDLE"],
    [12250, "INLINE"], [16250, "IDLE"], [18250, "INLINE"], [22250, "IDLE"], [24000, "STOP"],
  ]);
  const source = exportTimeline(track, result.cues, profile, result.feedBpm);
  assert.match(source, /^MSYNC_VERSION=1\n\n\[AUDIO\]/);
  assert.ok(source.includes("SHA256=" + track.sha256));
  assert.match(source, /00:24\.000 STOP\n$/);
  assert.equal(result.feedBpm, 60);
});

test("export includes only used drills and mirrors placements for left-handed training", () => {
  const left = {
    ...profile, handedness: "left", recoveryBeats: 0, pace: "active",
  };
  const result = generate(track, { bpm: 80, firstBeatMs: 22000 }, [...drills], left);
  const source = exportTimeline(track, result.cues, left, result.feedBpm);
  assert.equal(result.cues.length, 2);
  assert.match(source, /DROP=-4;BPM=80/);
  assert.doesNotMatch(source, /INL_ALTERNATE|INL_FALKENBERG/);
});

test("invalid audio identity, tempo, offset, profile and empty drill selection fail", () => {
  assert.throws(() => generate({ ...track, filename: ".wav" }, rhythm, [...drills], profile));
  assert.throws(() => generate({ ...track, filename: "music\n[CUES].wav" }, rhythm, [...drills], profile));
  assert.throws(() => generate({ ...track, sha256: "123" }, rhythm, [...drills], profile));
  assert.throws(() => generate(track, { ...rhythm, bpm: 0 }, [...drills], profile));
  assert.throws(() => generate(track, { ...rhythm, firstBeatMs: 23000 }, [...drills], profile));
  assert.throws(() => generate(track, rhythm, [...drills], { ...profile, workBeats: 0 }));
  assert.throws(() => generate(track, rhythm, [], profile));
});

test("steady and active profiles choose different feed rates on fast music", () => {
  const fast = { ...rhythm, bpm: 150 };
  assert.equal(generate(track, fast, [...drills], profile).feedBpm, 50);
  assert.equal(generate(track, fast, [...drills], { ...profile, pace: "active" }).feedBpm, 75);
});

test("all catalog entries produce timelines accepted by a supplied frozen v1 validator", {
  skip: !process.env.MSYNC_VALIDATOR,
}, async () => {
  const { validateMsyncSource } = await import(process.env.MSYNC_VALIDATOR);
  for (const handedness of ["right", "left"]) {
    const configured = { ...profile, handedness };
    const { cues, feedBpm } = generate(track, rhythm, [...drills], configured);
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
      const single = generate(track, rhythm, [drill], configured);
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
  const result = generate(track, rhythm, [drill], profile);
  const source = exportTimeline(track, result.cues, profile, result.feedBpm);
  assert.match(source, /RANDOM=true/);
  assert.match(source, /SPEED=3;SPIN=2;TYPE=back/);
  assert.match(source, /SPEED=5;SPIN=2;TYPE=top/);
});

test("editing a cue changes the export and invalid times block it", () => {
  const { cues, feedBpm } = generate(track, rhythm, [drills[0]], profile);
  cues[0] = { timeMs: 500, command: "INLINE", drill: drills[2] };
  assert.match(exportTimeline(track, cues, profile, feedBpm), /00:00\.500 INLINE=INL_FALKENBERG/);
  for (const timeMs of [NaN, -1, 0.1, cues[1].timeMs, cues[1].timeMs + 1]) {
    assert.throws(() => exportTimeline(track, [{ ...cues[0], timeMs }, ...cues.slice(1)], profile, feedBpm));
  }
});
