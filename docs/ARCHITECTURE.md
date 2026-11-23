# SpinPhony architecture

## Complete Customization

The manual editor consumes detections as timing suggestions and stores its own authored blocks. It does not call the automatic planner. It compiles library-backed and custom presets to inline drill definitions, Flavor to a supported field override, Rest to a timed cue, Idle to a bare cue with an editor-only timing reservation, and Stop to an explicit session end. Its export checks cue order, activations, pause overlaps and frozen ball ranges. Device calibration and built-in identifiers require separate verification.

## Browser generator

React, TypeScript and Vite provide a standalone static app. The browser hashes the original bytes with Web Crypto and decodes the file with Web Audio at 12 kHz. Inputs must be browser-decodable, 8 seconds to 6 minutes long and at most 32 MiB. A plain filename with an extension is required for export.

Audio analysis finds hits from local loudness and brightness increases. It compares adjacent two-second windows to suggest boundaries at sustained changes in level or texture. Candidate boundaries are labeled Section 1, Section 2, and so on. Semantic verse, chorus and drop labels require human review. Marker times come from the audio and remain independent of drill choices and BPM.

A profile chooses pace and racket hand. Estimated tempo only helps calculate feed rate within the pace cap. The generator suggests drills at detected hits. A hit emits an MSYNC `INLINE;ONCE` action. An assigned section schedules the requested number of cycles across its span and supersedes individual hit actions there while preserving their text markers. A repeat count that cannot fit at the current feed rate produces a line error. The score ends at the decoded audio duration.

## Drill provenance

- The searchable library includes 37 adaptations from the [PONGBOT Nova S Pro manual](https://device.report/m/5844640969b9ba563c817978f1836deee83beee7bd85481c94e34c2dbfffc368.pdf), including the readable §3.4.2 table, the 2×2 example and the §3.5.10 repetition example. Repeated rows and identical standard and near-net patterns share one entry. The advertised 264 combinations include app presets that the public table does not enumerate.
- Five entries come from coaching sources, including [Falkenberg](https://www.tabletenniscoaching.com/node/1183), [Larry Hodges's practice sessions](https://www.tabletenniscoaching.com/node/18) and [footwork coaching](https://www.youtube.com/watch?v=1Nv8ZFfiDFo). These are established practice exercises. No comparative efficacy claims are made.
- Inline export preserves sequence, lateral targets, spin kind, and random versus sequential ordering. Short versus long feeds use distinct starting speeds. Random manufacturer patterns are represented by example randomized feed targets. Exact preset parameters, robot placement, and physical depth require separate validation.

## MSYNC v1 export

The format reference is the frozen community v1 parser and validator identified in Nova Prime's `docs/MSYNC.md` and exercised read-only at revision `0add69de48c1720f61da6d807ee23e88e979d69c`. SpinPhony has no dependency on that repository at build time or runtime. The exporter uses a narrow subset with `MSYNC_VERSION=1`, `[AUDIO]` filename/SHA-256/duration, referenced `[INLINE:...]` definitions and strictly increasing `[CUES]` timestamps. Inline definitions make the files independent of a consumer's built-in drill IDs. SHA-256 and duration are tied to the selected file.

The text editor accepts marker edits, selected drill names, section repeat counts and comments. It reports invalid lines and disables export until the edited score is valid. Inline definitions are generated from the actions in the edited score.

Preview highlights the current cue using the local audio element's clock. The cue list scrolls independently of the playback controls. Optional cue notes and automatically generated descriptions use full-line hash comments supported by MSYNC v1.

The Pages workflow builds and tests the site from `main` on manual dispatch and deploys only the static `dist/` artifact. Nova Prime integration and live robot control are out of scope.

If the onset intervals disagree, a second pass looks for repeated patterns in the onset signal. It estimates a beat period and phase when the pattern clears confidence thresholds. Manual timing remains available.
