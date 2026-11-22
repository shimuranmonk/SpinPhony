# SpinPhony decisions

The MVP baseline below comes from the Spinphony v1 planning handoff for `shimuranmonk/SpinPhony`. The recoverable record supplies the scope summarized here. The project has no detailed requirements approval artifact at the reviewed base.

| ID | Status | Decision | Evidence |
| --- | --- | --- | --- |
| SP-001 | MVP baseline | SpinPhony MVP v0.1 is a standalone music-driven table tennis training generator. Nova Prime integration and live robot control are outside MVP scope. | MVP designation and boundaries in the planning handoff. |
| SP-002 | MVP baseline | Use React, TypeScript and Vite with browser-based audio analysis. | Development baseline in the planning handoff. |
| SP-003 | MVP baseline | Use a curated catalog of Nova S Pro and established coaching drills, configurable training profiles, and choreography generation. | Development baseline and priority list in the planning handoff. |
| SP-004 | MVP baseline | Produce validated MSYNC v1 `.msync` files. The editor and GitHub Pages deployment follow the generation and validation work in the recorded sequence. | Development baseline and priority list in the planning handoff. |
| SP-005 | Implemented and verified for the first slice | Use Web Audio and SHA-256 for local tracks, conservative steady-tempo detection with manual timing, a source-backed drill catalog and self-contained inline MSYNC v1. | [Architecture](ARCHITECTURE.md) records the limits and format reference. [Testing](TESTING.md) records compatibility checks. |

Any change to the MVP baseline needs maintainer approval. Preserve the prior entry and link its replacement when superseding a decision.
