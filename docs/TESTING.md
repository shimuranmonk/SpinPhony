# SpinPhony testing

| Date | Revision or worktree | Check | Result | Evidence and limits |
| --- | --- | --- | --- | --- |
| 2026-11-22 | `main` at `1d4429629c38ca934e4d994eeabf992104d82142` | Inspect GitHub head and initial commit inventory | Passed | README-only baseline. |
| 2026-11-22 | PCON initialization snapshot against the baseline above | Run `python skills/project-continuum/scripts/validate.py .` from the snapshot root | Passed | Six documentation roles. Structural check only. |
| 2026-11-22 | Same snapshot | Resolve local Markdown links and identify the first action using only repository files | Passed | Documentation review only. |
| 2026-11-22 | `feat/browser-generator` pre-commit checkout based on `31ee5d1` | `npm run build` | Passed | TypeScript and Vite 6.4.6 built the static bundle with relative asset paths. |
| 2026-11-22 | Same checkout | `npm test` with `MSYNC_VALIDATOR` set to the frozen validator file URL | 7 passed | Covers periodic and irregular signals, input validation, timing, pace and handedness. Synthetic exports were accepted with zero warnings for both hands. |
| 2026-11-22 | Production preview from the same checkout | Chrome at 390 × 844 with a generated 24-second WAV | Passed | Detected 120 BPM and 250 ms offset. Generated, downloaded and validated the file against the original audio hash. Manual fallback, invalid-file recovery, narrow layout and zero page errors also passed. |
| Pending | Deployment unavailable at initialization | GitHub Pages build and served-site smoke check | Not run | Capture deployed revision and target when authorized. |

The optional compatibility test loads `validateMsyncSource` from the file URL in `MSYNC_VALIDATOR`. It uses the frozen reference revision recorded in [architecture](ARCHITECTURE.md). Ordinary local tests can run without that reference.

Real-music accuracy, other browser/audio codec combinations, timeline editing and hosted deployment remain pending.
