# SpinPhony decisions

The MVP baseline below comes from the Spinphony v1 planning handoff for `shimuranmonk/SpinPhony`. The approved coaching requirements and provisional values are recorded in [Coaching Specification v1](COACHING_SPEC_V1.md).

| ID | Status | Decision | Evidence |
| --- | --- | --- | --- |
| SP-001 | MVP baseline | SpinPhony MVP v0.1 is a standalone music-driven table tennis training generator. Nova Prime integration and live robot control are outside MVP scope. | MVP designation and boundaries in the planning handoff. |
| SP-002 | MVP baseline | Use React, TypeScript and Vite with browser-based audio analysis. | Development baseline in the planning handoff. |
| SP-003 | MVP baseline | Use a curated catalog of Nova S Pro and established coaching drills, configurable training profiles, and choreography generation. | Development baseline and priority list in the planning handoff. |
| SP-004 | MVP baseline | Produce validated MSYNC v1 `.msync` files. The editor and GitHub Pages deployment follow the generation and validation work in the recorded sequence. | Development baseline and priority list in the planning handoff. |
| SP-005 | First slice, timing superseded by SP-006 | Use Web Audio and SHA-256 for local tracks, conservative steady-tempo detection with manual timing, a source-backed drill catalog and self-contained inline MSYNC v1. | [Architecture](ARCHITECTURE.md) records the limits and format reference. |
| SP-006 | Timing retained, UI superseded by SP-007 | Detect musical hits and section changes before assigning actions. The initial editable text timeline supported playback highlighting and section repeats. | Maintainer requested music-led cues and text editing. |
| SP-007 | Implemented | Generate into MSYNC Editor blocks and open a shared read-only Preview. Keep FLAG bookmarks editor-only. The separate Music Map is paused. | [Current architecture](ARCHITECTURE.md). |
| SP-008 | Implemented with provisional calibration | Auto uses Nova Level 1 or a saved Custom pattern and the Novice, Amateur, Expert or Pro ceiling. Music BPM stays independent of ball feed. The visible library exposes Nova Drills and Custom. | [Coaching Specification v1](COACHING_SPEC_V1.md) and [testing](TESTING.md). |
| SP-009 | Target design | Apply the coaching policies only to Auto. Keep complete manual customization available within MSYNC constraints. | [Coaching Specification v1](COACHING_SPEC_V1.md). |

Any change to the MVP baseline needs maintainer approval. Preserve the prior entry and link its replacement when superseding a decision.
