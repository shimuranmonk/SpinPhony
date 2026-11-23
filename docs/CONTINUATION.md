# SpinPhony continuation

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
