# SpinPhony continuation

- **Skill-aware Auto and Custom drills** · Auto starts from Nova Level 1 or a locally saved Custom pattern, applies the player’s speed/spin ceiling, and allows per-ball Preview edits before export. Music shows Nova Drills and Custom. Physical landing checks and automated FLAVOR cues remain future work.

- **Long-section Auto fallback** · For active passages at least 45 seconds long, Auto schedules finite practice blocks up to 20 seconds, with at least eight seconds of planned recovery between blocks. A 3:47 one-section Forehand Drive test at 50 balls/min schedules 125 feeds. The planning values and physical timing remain provisional.

- **Form-aware Auto slice (2026-11-25)** · Auto assigns finite repeat cycles by section, retains hit candidates, and uses feed settings independent of music BPM. The manual MSYNC Editor still authors its own score. Validate the provisional acoustic thresholds and workload choices against annotated tracks before adding motif recognition or more detailed coaching.

- **MSYNC validation** · The editor validates its live text against the bundled frozen v1 parser and validator from Nova Prime revision `0add69de48c1720f61da6d807ee23e88e979d69c`. It reports file issues alongside draft issues. Built-in ball imports supply an unnamed drill’s fallback name.

- **Editor follow-up** · The sticky transport includes Add and the block tray. Cue-map selection brings both fixed-height lists to the selected timestamp. Manual SESSION controls above the live preview default to 4, 1 and 0 and validate against MSYNC v1.

- **Music and MSYNC Editor revision** · Music owns the shared audio picker and Training Library. MSYNC Editor offers CDRILLS, FLAVOR, IDLE and STOP. CDRILLS load level-specific built-in patterns at the selected BALL entry and export editable INLINE definitions. The earlier NDRILL workflow is superseded.

- **Built-in NDRILLS** · The manual picker uses a read-only snapshot of the 34 Nova Prime built-in drills and their three levels. Manual exports include the requested SESSION defaults. Auto Generate is labeled experimental.

- **Timeline follow-up** · [PR #10](https://github.com/shimuranmonk/SpinPhony/pull/10) adds corner removal and prevents multiple drill blocks at the same timestamp. The audio player, cue map and block tray stay together while scrolling. NDRILL ball values require controller catalog data.

- **Customization revision (2026-11-24)** · [PR #10](https://github.com/shimuranmonk/SpinPhony/pull/10) now carries NDRILLS, CDRILLS, FLAVOR, IDLE and STOP, a sticky player, a colored cue strip and live MSYNC text. Both download paths include the temporary tagline. REST and ADRILLS are outside the current manual editor.
- **Next check** · Verify pasted NDRILL identifiers against the target controller's catalog, then incorporate the maintainer-supplied robot-specific limits. File-level validation and Chrome export checks are recorded in [testing](TESTING.md).

- **Complete Customization (2026-11-23)** · The separate manual tab supports dragging or adding editable blocks, audio preview, and validated MSYNC export. The coaching specification in [PR #9](https://github.com/shimuranmonk/SpinPhony/pull/9) applies to automatic generation only.
- **Next action for the manual editor** · Review the editor branch, then verify hardware bounds and built-in drill IDs once the maintainer supplies device data. Current drill exports use inline definitions and frozen file limits. See [handover](HANDOVER.md).

- **Checkpoint (2026-11-23)** · [Continuity PR #1](https://github.com/shimuranmonk/SpinPhony/pull/1) and [generator PR #2](https://github.com/shimuranmonk/SpinPhony/pull/2) were open at the start of the editor slice. `feat/timeline-editor` builds on generator commit `933a339bf0e5c81d24ac6b4d916a23acb33940e9`.
- **State** · Cue timing and drill assignments are editable. The edited browser export passed frozen MSYNC v1 validation. One Ogg recording used manual tempo. The Pages workflow is prepared and deployment is pending.
- **Next action** · Review the stack in order and verify each retargeted diff. After the application reaches `main`, configure Pages to use GitHub Actions, dispatch **Publish SpinPhony** from `main`, and verify the hosted audio-to-export path.

Read the [handover](HANDOVER.md), [decisions](DECISIONS.md), [architecture](ARCHITECTURE.md) and [testing](TESTING.md).

The `fix/music-tempo` follow-up adds a repeated-pattern detector for tracks with uneven onset spacing. The updated local preview estimated timing and generated a timeline for a rock MP3 that previously required manual entry.

The `feat/training-library` follow-up adds 42 searchable, individually sourced drills. The frozen MSYNC validator accepts every drill with either racket hand. Review the library changes on top of the beat-detection branch.

The audio-preview follow-up separates Setup and Preview. The editable cue list follows local audio playback, and MSYNC downloads carry cue comments and inline drill descriptions. Review this branch above the training-library branch. The exact previously agreed tagline is pending confirmation.

The music-led follow-up replaces fixed beat blocks with detected hits and candidate section changes. The text editor supports per-hit drill assignments and numbered repeats across a section. Review this branch above the audio preview, then measure section and hit accuracy against annotated reference tracks.

The event-panel follow-up shows detected markers beside the editable score, with reasons and actual drill assignments. Both panels highlight and scroll from the same playback clock. Review this branch above the music-led changes.
