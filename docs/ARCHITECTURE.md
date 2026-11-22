# SpinPhony architecture

## Planned MVP

React, TypeScript and Vite provide the standalone browser app. Browser audio analysis supplies timing information for choreography. A curated Nova S Pro and coaching drill catalog and configurable training profiles inform drill selection. The generator produces a timed sequence for editing and MSYNC v1 validation and export.

```text
Audio -> browser analysis -> choreography -> editor -> MSYNC validation -> .msync
                                ^
                     Drill catalog + training profile
```

The planned deployment target is GitHub Pages. Nova Prime integration and live robot control are excluded from the MVP. Platform interfaces, analysis algorithms and the export contract remain to be specified. The diagram describes intended data flow.

## Delivery sequence

1. Establish repository structure and continuity documents.
2. Implement the audio-analysis MVP.
3. Implement the curated drill catalog and training-profile engine.
4. Implement choreography generation and MSYNC v1 validation.
5. Add the editor and set up GitHub Pages deployment.

See [decisions](DECISIONS.md) for scope and [testing](TESTING.md) for pending evidence.
