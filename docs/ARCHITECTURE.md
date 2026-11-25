# SpinPhony architecture

## Browser application

React, TypeScript and Vite provide a standalone static app. Audio stays local. Web Audio decodes the track at 12 kHz and Web Crypto hashes the original bytes. Inputs must be browser-decodable, 8 seconds to 6 minutes, at most 32 MiB, with a plain filename and extension for export. SpinPhony authors files for Nova Prime. Live robot control remains outside scope.

## Track analysis and Auto generation

The analyzer detects short loudness/brightness increases and compares adjacent two-second windows to find sustained changes. It profiles section loudness, brightness and hit density. The Music markers list uses these detections as timing guidance. Phrase and returning-section labels are estimates. The separate Music Map and exposed beat grid were removed for now.

Auto chooses from selected patterns. It favors lower movement demand, reuses a choice for similar eligible middle passages and can leave quiet or too-short spans empty. Long active sections of at least 45 seconds are divided into finite practice blocks of up to 20 seconds with planned recovery of at least eight seconds between blocks. Repeat counts must fit by actual per-ball BPM and REPS. These settings and acoustic thresholds are provisional.

The [coaching design](COACHING_SPEC_V1.md) is the target. Today, one drill can dominate the generated score even when the pool contains several. The first implementation uses finite INLINE activations. Full adaptive workload, richer variants and exact next-ball recovery need further development and validation.

## Drill data

The Music library exposes the 34 Nova patterns reflected in Nova Prime’s verified catalog snapshot, plus browser-local Custom drills. Auto starts from Nova Level 1 or a saved Custom pattern. It applies the selected skill ceiling, the speed-dependent spin limit and the feed plan independently of music BPM. Handedness mirrors lateral placement on Auto export. Placement is a parameter for review, since file-level checks do not establish physical landing.

The editor can load level-specific Nova ball data starting at a selected BALL, or copy a full existing INLINE definition. Custom saves keep editable ball settings for future Auto generation. Older manual-derived and coaching patterns remain in source for regression coverage. The visible library uses Nova Drills and Custom.

## Editor, Preview and MSYNC v1

Music generation populates an editable draft as independent placed blocks and opens Preview. Manual placement and edits use the same state. The editor and Preview read the same compiled file and use the selected audio clock for cue highlights. The editor adds sticky block controls, cue-map seeking, validation, and compact SESSION fields. FLAGs are editor-only bookmarks.

A CDRILL exports a numbered INLINE sequence of up to ten ball entries. Identical names, RANDOM and ordered ball settings share an INLINE definition. Cue time, comment and ONCE belong to the placed block. FLAVOR applies four editable values to an active drill. IDLE exports a bare command, with a separate editor-only duration reservation. STOP ends the authored score. REST and NDRILL are outside the current editor toolbar.

The frozen v1 parser and validator bundled from the Nova Prime reference at `0add69de48c1720f61da6d807ee23e88e979d69c` check the exact file, including audio identity and command ordering. SpinPhony has no build-time or runtime dependency on the Nova Prime repository. The Pages workflow builds and tests the static site from `main` on manual dispatch.
