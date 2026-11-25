import assert from "node:assert/strict";
import test from "node:test";
import { drills as library, starterDrills as drills } from "../.test-build/catalog.js";
import { exportTimeline, feedRate, validateTrack } from "../.test-build/generator.js";
import { estimateRhythm } from "../.test-build/rhythm.js";
import { detectMusicMarkers } from "../.test-build/music.js";
import { readTimeline, suggestTimeline } from "../.test-build/score.js";
import { novaPatterns, prepareAutoDrill, validateAutoBalls } from "../.test-build/autoDrills.js";
import { indexMsync, msyncHighlight } from "../.test-build/msyncHighlight.js";
import { autoCuesToBlocks } from "../.test-build/autoTransfer.js";
import { musicGuidance } from "../.test-build/musicGuidance.js";
import { compileManualScore, initialBall, loadBuiltInBalls } from "../.test-build/manualScore.js";

const track = { filename: "pulse.wav", durationMs: 24000, sha256: "a".repeat(64), rhythm: { bpm: 120 }, markers: [{ timeMs: 0, kind: "section" }, { timeMs: 250, kind: "hit" }, { timeMs: 1320, kind: "hit" }] };
const rhythm = { bpm: 120, firstBeatMs: 250 };
const profile = { pace: "steady", handedness: "right" };

test("music guidance joins beat, accent, and estimated phrase labels and keeps beats optional", () => {
  const hitMarkers = Array.from({ length: 23 }, (_, i) => ({ kind: "hit", timeMs: 250 + i * 500, strength: .9 }));
  const audio = { ...track, rhythm: { bpm: 120, firstBeatMs: 250 }, markers: hitMarkers };
  const hidden = musicGuidance(audio, false);
  assert.ok(hidden.every(marker => marker.labels.every(label => label.kind !== "beat")));
  assert.equal(hidden[0].labels[0].text, "Start");
  assert.equal(hidden.at(-1).labels[0].text, "End");
  const combined = musicGuidance(audio, true).find(marker => marker.timeMs === 4250);
  assert.deepEqual(combined.labels.map(label => label.kind), ["accent", "beat", "phrase"]);
  assert.ok(musicGuidance({ ...audio, rhythm: null }, true).every(marker => marker.labels.every(label => label.kind !== "beat")));
});

test("contrasting sections between similar passages receive the same estimated repeat label", () => {
  const section = (timeMs, level, brightness) => ({ timeMs, kind: "section", profile: { level, brightness, hitsPerSecond: 1 } });
  const markers = musicGuidance({ ...track, markers: [
    section(0, .1, .1), section(8000, .3, .24), section(16000, .103, .105),
  ] }, false);
  assert.ok(markers[0].labels.some(label => label.text === "Section A (estimated repeat)"));
  assert.ok(markers[2].labels.some(label => label.text === "Section A (estimated repeat)"));
});

test("copying Auto cues preserves cue times and actual ball values in independent blocks", () => {
  const left = { ...profile, handedness: "left" };
  const native = novaPatterns.find(drill => drill.name === "Forehand Drive");
  const original = { ...native, parameters: [{ ...native.parameters[0], REPS: 2 }] };
  const { cues, feedBpm } = compile([original], left);
  const blocks = autoCuesToBlocks(cues, left, feedBpm);
  assert.deepEqual(blocks.map(block => block.timeMs), cues.map(cue => cue.timeMs));
  assert.equal(blocks.at(-1).kind, "STOP");
  assert.ok(blocks.slice(0, -1).every(block => block.kind === "CDRILL" && block.once));
  assert.equal(blocks[0].balls[0].DROP, -5);
  assert.equal(blocks[0].balls[0].REPS, 2);
  blocks[0].balls[0].DROP = -4;
  assert.equal(blocks[1].balls[0].DROP, -5);
  assert.equal(original.parameters[0].DROP, 5);
  assert.deepEqual(compileManualScore(track, blocks).issues, []);
});

test("Auto uses Nova Level 1 as its starting preset and enforces player and robot limits", () => {
  const base = novaPatterns.find(drill => drill.name === "Forehand Drive");
  assert.equal(new Set(novaPatterns.map(drill => drill.id)).size, novaPatterns.length);
  const novice = prepareAutoDrill(base, { ...profile, skill: "Novice" });
  assert.deepEqual(novice.parameters, base.parameters);
  const amateur = prepareAutoDrill(base, { ...profile, skill: "Amateur" });
  assert.equal(amateur.parameters[0].SPEED, 3.5);
  assert.throws(() => validateAutoBalls([{ ...amateur.parameters[0], SPEED: 5 }], "Amateur"), /Amateur limit/);
  assert.throws(() => validateAutoBalls([{ ...amateur.parameters[0], SPEED: 8, SPIN: 5 }], "Pro"), /robot limit/);
  const edited = { ...amateur, parameters: [{ ...amateur.parameters[0], HEIGHT: 35, DROP: 4, REPS: 2 }] };
  const result = compile([edited], profile);
  assert.match(exportTimeline(track, result.cues, profile, result.feedBpm), /HEIGHT=35;DROP=4;BPM=54;REPS=2/);
});

const manualBlocks = [
  { id: 1, timeMs: 0, kind: "CDRILL", name: "Loopers", balls: [initialBall, { ...initialBall, BPM: 70 }], random: false, note: "Start" },
  { id: 2, timeMs: 0, kind: "FLAVOR", name: "Fast", flavor: { SPEED: 3.5, BPM: 65, SPIN: 2.5, HEIGHT: 38 }, note: "" },
  { id: 3, timeMs: 5000, kind: "IDLE", seconds: 4, note: "" },
  { id: 5, timeMs: 10000, kind: "STOP", note: "" },
];

test("editor FLAG bookmarks are excluded from MSYNC even beside another cue or after STOP", () => {
  const initial = compileManualScore(track, manualBlocks);
  const flags = [0, 2000, 12000].map((timeMs, index) => ({
    ...manualBlocks[0], id: 30 + index, timeMs, kind: "FLAG", name: "Practice here",
  }));
  assert.deepEqual(compileManualScore(track, [...manualBlocks, ...flags]), initial);
  const onlyFlags = compileManualScore(track, flags);
  assert.doesNotMatch(onlyFlags.source, /FLAG|Practice here/);
  assert.match(onlyFlags.issues.join(" "), /CDRILL/);
});

test("MSYNC highlights match the exported cue and the correct definition", () => {
  const { source } = compileManualScore(track, manualBlocks);
  const lines = source.split("\n");
  const index = indexMsync(source);
  const drill = msyncHighlight(index, 0, "INLINE");
  const flavor = msyncHighlight(index, 0, "FLAVOR");
  assert.match(lines[drill.cue], /^00:00\.000 INLINE=/);
  assert.match(lines[drill.definition], /^\[INLINE:/);
  assert.match(lines[flavor.cue], /^00:00\.000 FLAVOR=/);
  assert.match(lines[flavor.definition], /^\[FLAVOR:/);
  const idle = msyncHighlight(index, 7000);
  assert.match(lines[idle.cue], /IDLE$/);
  assert.equal(idle.definition, undefined);
  assert.deepEqual(msyncHighlight(index, 8000, "INLINE"), { cue: undefined, definition: undefined });
});

test("manual SESSION uses custom values and flags invalid fields", () => {
  const session = { COUNTDOWN: "6", CYCLE_PAUSE: "0.125", ROBOT_LEAD: "1.25" };
  const ready = compileManualScore(track, manualBlocks, session);
  assert.deepEqual(ready.issues, []);
  assert.match(ready.source, /\[SESSION\]\nCOUNTDOWN=6\nCYCLE_PAUSE=0\.125\nROBOT_LEAD=1\.25\n\n\[AUDIO\]/u);
  const invalid = compileManualScore(track, manualBlocks, { COUNTDOWN: "2.5", CYCLE_PAUSE: "", ROBOT_LEAD: "5.001" });
  assert.equal(invalid.issues.length, 3);
});

test("manual drill definitions use the inherited name unless named and separate each group", () => {
  const first = { ...manualBlocks[0], name: "", inheritedName: "Drive FH" };
  const second = { ...first, id: 8, timeMs: 3000, name: "My pattern" };
  const { source, issues } = compileManualScore(track, [first, second, manualBlocks.at(-1)]);
  assert.deepEqual(issues, []);
  assert.match(source, /# Drill: Drive FH\n\[INLINE:INL_DRIVE_FH_1\]\nNAME=Drive FH/u);
  assert.match(source, /REPS=1\n\n# Drill: My pattern\n\[INLINE:INL_MY_PATTERN_8\]\nNAME=My pattern/u);
});

test("the editor shares identical INLINE definitions while keeping cue times and ONCE separate", () => {
  const first = { ...manualBlocks[0], once: true };
  const second = { ...first, id: 8, timeMs: 3000, once: false, note: "Another cue" };
  const changed = { ...first, id: 9, timeMs: 6000, balls: first.balls.map(ball => ({ ...ball, HEIGHT: 35 })) };
  const { source, issues } = compileManualScore(track, [first, second, changed, manualBlocks.at(-1)]);
  assert.deepEqual(issues, []);
  assert.equal((source.match(/^\[INLINE:/gm) ?? []).length, 2);
  assert.match(source, /^00:00\.000 INLINE=INL_LOOPERS_1;ONCE$/m);
  assert.match(source, /^00:03\.000 INLINE=INL_LOOPERS_1$/m);
  assert.match(source, /^00:06\.000 INLINE=INL_LOOPERS_9;ONCE$/m);
});

test("manual export writes the header, numbered inline balls, and all four flavor fields", async () => {
  const { source, issues } = compileManualScore(track, manualBlocks);
  assert.deepEqual(issues, []);
  assert.match(source, /^# pulse - SpinPhony MSYNC v1\n# Soundtrack of a Loop/u);
  assert.match(source, /\[SESSION\]\nCOUNTDOWN=4\nCYCLE_PAUSE=1\nROBOT_LEAD=0\n\n\[AUDIO\]/u);
  assert.match(source, /\[INLINE:INL_LOOPERS_1\][\s\S]*BALL=2;SPEED=3;SPIN=2;TYPE=top;HEIGHT=20;DROP=0;BPM=70;REPS=1/u);
  assert.match(source, /\[FLAVOR:FLV_FAST\]\nFLV_SPEED=3.5\nFLV_BPM=65\nFLV_SPIN=2.5\nFLV_HEIGHT=38/u);
  assert.match(source, /00:05\.000 IDLE[\s\S]*00:10\.000 STOP/u);
  if (process.env.MSYNC_VALIDATOR) {
    const { validateMsyncSource } = await import(process.env.MSYNC_VALIDATOR);
    const result = validateMsyncSource(source);
    assert.equal(result.valid, true, JSON.stringify(result.errors));
  }
});

test("loading built-in patterns fills consecutive balls without changing the earlier entries", () => {
  const first = loadBuiltInBalls([initialBall], 0, "drive(f)-drive(b)", 1);
  assert.equal(first.length, 2);
  assert.deepEqual(first.map(ball => ball.DROP), [5, -5]);
  const second = loadBuiltInBalls([...first, initialBall], 2, "push(f)-drive(f)", 2);
  assert.equal(second.length, 4);
  assert.deepEqual(second.slice(0, 2), first);
  assert.deepEqual(second.slice(2).map(ball => ball.TYPE), ["back", "top"]);
  const existing = Array(10).fill(initialBall);
  assert.throws(() => loadBuiltInBalls(existing, 9, "drive(f)-drive(b)", 1), /10-ball limit/);
  assert.deepEqual(existing, Array(10).fill(initialBall));
});

test("manual draft stays visible and reports invalid pauses, parameters, ball counts, and cues after STOP", () => {
  const cases = [
    [[...manualBlocks, { ...manualBlocks[0], id: 6, timeMs: 6000 }], /reserved IDLE/],
    [[{ ...manualBlocks[0], balls: [{ ...initialBall, SPEED: 10 }] }, ...manualBlocks.slice(1)], /Spin exceeds/],
    [[{ ...manualBlocks[0], balls: Array(11).fill(initialBall) }], /1–10 ball entries/],
    [[...manualBlocks, { ...manualBlocks[0], id: 6, timeMs: 11000 }], /after STOP/],
  ];
  for (const [blocks, expected] of cases) {
    const { source, issues } = compileManualScore(track, blocks);
    assert.match(issues.join("\n"), expected);
    assert.match(source, /\[AUDIO\][\s\S]*\[CUES\]/u);
  }
});

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
  const feedBpm = feedRate(configured);
  const text = suggestTimeline(audio, selected, feedBpm);
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
  assert.deepEqual(detectMusicMarkers([new Float32Array(rate * 10)], rate), [
    { timeMs: 0, kind: "section", profile: { level: 0, brightness: 0, hitsPerSecond: 0 } },
  ]);
});

test("Auto preserves musical markers and schedules finite cycles instead of firing each hit", () => {
  const one = compile([drills[0]]);
  const two = compile([drills[1], drills[2]]);
  assert.deepEqual(one.lines.map(line => line.timeMs), [0, 250, 1320, 24000]);
  assert.deepEqual(two.lines.map(line => line.timeMs), one.lines.map(line => line.timeMs));
  const source = exportTimeline(track, two.cues, profile, two.feedBpm);
  assert.ok(source.includes("SHA256=" + track.sha256));
  assert.match(source, /^00:00\.000 INLINE=INL_ALTERNATE;ONCE/m);
  assert.doesNotMatch(source, /^00:(00\.250|01\.320) INLINE=/m);
  assert.ok(two.lines.filter(line => line.kind === "HIT").every(line => !line.drill));
  assert.match(source, /00:24\.000 STOP\n$/);
});

test("Auto reuses recognizable passages, preserves quiet gaps, and keeps feed independent of song tempo", () => {
  const acoustic = (level, brightness, hitsPerSecond) => ({ level, brightness, hitsPerSecond });
  const form = { ...track, durationMs: 57000, markers: [
    { kind: "section", timeMs: 0, profile: acoustic(.035, .03, 1) },
    { kind: "section", timeMs: 10000, profile: acoustic(.2, .1, 2) },
    { kind: "section", timeMs: 23000, profile: acoustic(.008, .006, .1) },
    { kind: "hit", timeMs: 24000, strength: .2 },
    { kind: "section", timeMs: 30000, profile: acoustic(.195, .095, 2.1) },
    { kind: "section", timeMs: 45000, profile: acoustic(.065, .04, 1.2) },
    { kind: "section", timeMs: 56000, profile: acoustic(.055, .04, 1) },
  ] };
  const slow = compile(drills, profile, { ...form, rhythm: { bpm: 70 } });
  const fast = compile(drills, profile, { ...form, rhythm: { bpm: 170 } });
  assert.equal(slow.feedBpm, fast.feedBpm);
  assert.equal(slow.text, fast.text);
  const sections = slow.lines.filter(line => line.kind === "SECTION");
  assert.equal(sections[1].drill, sections[3].drill);
  assert.match(sections[3].note, /Similar passage/);
  assert.match(sections[2].note, /no feeds scheduled/);
  assert.match(sections.at(-1).note, /No complete cycle/);
  assert.ok(slow.cues.every(cue => cue.timeMs < 23000 || cue.timeMs >= 30000));
  for (const [i, cue] of slow.cues.slice(0, -1).entries()) {
    const next = slow.cues[i + 1];
    assert.ok(next.timeMs - cue.timeMs >= cue.drill.balls.length * 60000 / slow.feedBpm + 1999);
  }
});

test("a 3:47 single-section track schedules full work blocks with recovery instead of three isolated balls", () => {
  const footlooseLength = { ...track, durationMs: 227207, markers: [
    { kind: "section", timeMs: 0, profile: { level: .14, brightness: .08, hitsPerSecond: 2 } },
    { kind: "hit", timeMs: 1200, strength: .8 },
  ] };
  const { cues, lines, feedBpm } = compile([drills[0]], { ...profile, pace: "active" }, footlooseLength);
  const deliveries = cues.filter(cue => cue.command === "INLINE");
  assert.equal(deliveries.length, 125);
  assert.ok(deliveries.every(cue => cue.once && cue.drill === drills[0]));
  assert.ok(lines.filter(line => line.note.includes("Practice block")).length > 1);
  assert.match(lines.at(-2).note, /Final recovery/);
  assert.equal(lines.at(-2).timeMs, 222207);
  assert.ok(deliveries.every((cue, i) => i === 0 || cue.timeMs - deliveries[i - 1].timeMs <= 12000));
  assert.match(exportTimeline(footlooseLength, cues, profile, feedBpm), /03:47\.207 STOP\n$/);
});

test("a section assignment distributes exactly five cycles and preserves hit lines", () => {
  const start = compile(drills);
  const edited = start.text.replace(/SECTION \| [^\n]+/, "SECTION | Forehand drive x5 | Chorus");
  const result = readTimeline(edited, track.durationMs, drills, 60);
  assert.equal(result.lines.filter(line => line.kind === "HIT").length, 2);
  assert.deepEqual(result.cues.map(cue => cue.timeMs), [0, 4800, 9600, 14400, 19200, 24000]);
  assert.ok(result.cues.slice(0, -1).every(cue => cue.once && cue.drill === drills[0]));
  assert.match(exportTimeline(track, result.cues, profile, 60), /Chorus · Repeat 5 of 5/);
});

test("text validation reports line numbers for unknown drills and repeats that do not fit", () => {
  const start = compile(drills);
  assert.throws(() => readTimeline(start.text.replace("Forehand drive", "Unknown drill"), 24000, drills, 60), /Line 1/);
  assert.throws(() => readTimeline(start.text.replace(/SECTION \| [^|]+/, "SECTION | Falkenberg x50 "), 24000, drills, 60), /Line 1/);
  assert.throws(() => readTimeline(start.text.replace("00:24.000", "00:23.000"), 24000, drills, 60), /Line 4/);
});

test("export reflects handedness and checks audio identity", () => {
  const left = { ...profile, handedness: "left", pace: "active" };
  const { cues, feedBpm } = compile([drills[0]], left);
  assert.match(exportTimeline(track, cues, left, feedBpm), /DROP=-4;BPM=50/);
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
  assert.match(source, /# Drill: Forehand drive[^\n]*\n\[INLINE:INL_FOREHAND\]/);
  assert.match(source, /# Forehand drive — Forehand multiball 00:02\.000 STOP\n00:00\.000 INLINE=INL_FOREHAND;ONCE/);
  assert.match(source, /# End of track\n00:24\.000 STOP/);
  assert.doesNotMatch(source, /^00:02\.000 STOP$/m);
});
