# SpinPhony architecture

## Browser generator

React, TypeScript and Vite provide a standalone static app. The browser hashes the original bytes with Web Crypto and decodes the file with Web Audio at 12 kHz. Inputs must be browser-decodable, 8 seconds to 6 minutes long and at most 32 MiB. A plain filename with an extension is required for export.

The rhythm estimator measures energy rises in 10 ms windows across all channels. It requires at least five onsets and 70% agreement of inter-onset intervals around their median. It estimates a single steady tempo between 40 and 180 BPM and the first matching onset. The user can enter tempo and beat offset directly for silent, irregular or misdetected tracks. The estimator does not identify downbeats or follow tempo changes.

A profile chooses pace, racket hand, work length and recovery length. The generator rotates selected drills in catalog order and starts each work block on the beat grid. Each block requires at least two seconds of remaining audio. Recovery emits IDLE and the timeline ends with STOP at the decoded duration. The feed rate divides the music tempo by the smallest whole number that fits the selected pace cap, rounds to a whole rate and uses a minimum of 30 balls per minute. The caps are 60 for Steady and 90 for Active. Feed rate and timeline cue timing are separate.

## Drill provenance

- The searchable library includes 37 adaptations from the [PONGBOT Nova S Pro manual](https://device.report/m/5844640969b9ba563c817978f1836deee83beee7bd85481c94e34c2dbfffc368.pdf), including the readable §3.4.2 table, the 2×2 example and the §3.5.10 repetition example. Repeated rows and identical standard and near-net patterns share one entry. The advertised 264 combinations include app presets that the public table does not enumerate.
- Five entries come from coaching sources, including [Falkenberg](https://www.tabletenniscoaching.com/node/1183), [Larry Hodges's practice sessions](https://www.tabletenniscoaching.com/node/18) and [footwork coaching](https://www.youtube.com/watch?v=1Nv8ZFfiDFo). These are established practice exercises. No comparative efficacy claims are made.
- Inline export preserves sequence, lateral targets, spin kind, and random versus sequential ordering. Short versus long feeds use distinct starting speeds. Random manufacturer patterns are represented by example randomized feed targets. Exact preset parameters, robot placement, and physical depth require separate validation.

## MSYNC v1 export

The format reference is the frozen community v1 parser and validator identified in Nova Prime's `docs/MSYNC.md` and exercised read-only at revision `0add69de48c1720f61da6d807ee23e88e979d69c`. SpinPhony has no dependency on that repository at build time or runtime. The exporter uses a narrow subset with `MSYNC_VERSION=1`, `[AUDIO]` filename/SHA-256/duration, referenced `[INLINE:...]` definitions and strictly increasing `[CUES]` timestamps. Inline definitions make the files independent of a consumer's built-in drill IDs. SHA-256 and duration are tied to the selected file.

The editor keeps generated cue order and the final Stop at the track duration. Drill cues can be reassigned within the selection. Work and recovery times can be edited, and export is disabled until cue times are valid. The inline definitions are generated from the edited timeline.

The Pages workflow builds and tests the site from `main` on manual dispatch and deploys only the static `dist/` artifact. Nova Prime integration and live robot control are out of scope.

If the onset intervals disagree, a second pass looks for repeated patterns in the onset signal. It estimates a beat period and phase when the pattern clears confidence thresholds. Manual timing remains available.
