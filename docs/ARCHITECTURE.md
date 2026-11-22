# SpinPhony architecture

## Browser generator

React, TypeScript and Vite provide a standalone static app. The browser hashes the original bytes with Web Crypto and decodes the file with Web Audio at 12 kHz. Inputs must be browser-decodable, 8 seconds to 6 minutes long and at most 32 MiB. A plain filename with an extension is required for export.

The rhythm estimator measures energy rises in 10 ms windows across all channels. It requires at least five onsets and 70% agreement of inter-onset intervals around their median. It estimates a single steady tempo between 40 and 180 BPM and the first matching onset. The user can enter tempo and beat offset directly for silent, irregular or misdetected tracks. The estimator does not identify downbeats or follow tempo changes.

A profile chooses pace, racket hand, work length and recovery length. The generator rotates selected drills in catalog order and starts each work block on the beat grid. Each block requires at least two seconds of remaining audio. Recovery emits IDLE and the timeline ends with STOP at the decoded duration. The feed rate divides the music tempo by the smallest whole number that fits the selected pace cap, rounds to a whole rate and uses a minimum of 30 balls per minute. The caps are 60 for Steady and 90 for Active. Feed rate and timeline cue timing are separate.

## Drill provenance

- Forehand drive and alternating forehand/backhand drive are based on the Nova S Pro programmed combinations described in section 3.4 of the [PONGBOT manual](https://tennis2table.com/wp-content/uploads/2025/12/PONGBOT-NOVA-S-PRO-OPERATION-MANUAL.pdf).
- Falkenberg follows Larry Hodges's [coaching description](https://www.tabletenniscoaching.com/node/1183), with two feeds to the backhand side and one to the wide forehand.
- The catalog encodes placement patterns using SpinPhony's inline parameters. Verification covers pattern provenance and file acceptance. Exact manufacturer presets, calibration and physical landing positions are outside that evidence.

## MSYNC v1 export

The format reference is the frozen community v1 parser and validator identified in Nova Prime's `docs/MSYNC.md` and exercised read-only at revision `0add69de48c1720f61da6d807ee23e88e979d69c`. SpinPhony has no dependency on that repository at build time or runtime. The exporter uses a narrow subset with `MSYNC_VERSION=1`, `[AUDIO]` filename/SHA-256/duration, referenced `[INLINE:...]` definitions and strictly increasing `[CUES]` timestamps. Inline definitions make the files independent of a consumer's built-in drill IDs. SHA-256 and duration are tied to the selected file.

The editor keeps generated cue order and the final Stop at the track duration. Drill cues can be reassigned within the selection. Work and recovery times can be edited, and export is disabled until cue times are valid. The inline definitions are generated from the edited timeline.

The Pages workflow builds and tests the site from `main` on manual dispatch and deploys only the static `dist/` artifact. Nova Prime integration and live robot control are out of scope.
