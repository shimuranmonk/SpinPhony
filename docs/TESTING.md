# SpinPhony testing

- The Music tab and CDRILL pattern revision passed the production build and all 15 tests. Chrome verified loading two balls at BALL 1, adding BALL 3, loading two more balls there, retaining BALL 1 and BALL 2, and downloading validator-accepted INLINE output identical to the preview.

- The built-in NDRILL follow-up passed the production build and all 15 automated tests. Chrome verified the Drive FH feed rate changes from 54 to 72 when switching from level 1 to 3, and the exported file matched the live preview and passed validation with Nova Prime’s catalog loaded. No hardware was operated.

- Chrome at 390 px verified corner removal updates both the cue map and live MSYNC, a second drill at the same timestamp is blocked, and the block tray stays visible with playback controls. The resulting download matched the preview and passed the frozen validator.

## Customization revision (2026-11-24)

- Production build and all 14 automated tests passed with the read-only MSYNC validator loaded. Coverage includes pasted NDRILL references, numbered CDRILL lines, all four FLAVOR fields, invalid drafts and export headers.
- Chrome at 390 px verified a dragged CDRILL, five colored timeline indicators, the ten-ball cap, sticky audio on scroll, and a validator-accepted download byte-for-byte equal to the live text. No physical robot or controller-library tests were run.

## Complete Customization checkpoint (2026-11-23)

- The editor worktree based on local Preview revision `b759606` passed the production build and all 14 automated tests with the MSYNC validator loaded from the read-only reference checkout. Coverage includes simultaneous Drill/Flavor, timed Rest, bare Idle, early Stop, illegal coupled ball parameters, overlapping pauses and export validation.
- Chrome at 390 px with a generated 24-second WAV verified drag-and-drop for Drill, click-to-add for Idle and Stop, editable intensity and duration, tab persistence, no horizontal overflow and a validator-accepted download. This was a browser/file check. Physical robot behavior and verified built-in identifiers are pending.

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

## Timeline editor checkpoint (2026-11-23)

- The pre-commit editor checkout based on `933a339` passed the production build and all eight automated tests with the frozen validator loaded.
- Chrome at 390 × 844 blocked a duplicate cue time, then accepted a corrected first cue at 500 ms assigned to Falkenberg. The downloaded file passed the frozen validator with zero warnings.
- Chrome decoded the Ogg Vorbis [Maple Leaf Rag piano-roll transfer](https://commons.wikimedia.org/wiki/File:Maple_Leaf_Rag_-_played_by_Scott_Joplin_1916_sample.ogg). The estimator returned no BPM or offset. Manual entry enabled generation. The second recording was unavailable after HTTP 429, so this is one musical sample without reference beat annotations.
- The Pages workflow is prepared. Hosted deployment and broader browser and music coverage are pending.

The rhythm follow-up passed the production build and all nine tests with the frozen validator loaded. In Chrome, a 14.972-second local rock MP3 previously requiring manual entry generated a timeline at an estimated 176.5 BPM and 260 ms. No reference beat labels were available. The source audio stayed local.

The training library passed the production build and all ten tests with the frozen validator loaded. All 42 patterns exported without warnings for both racket hands. Chrome at 390 px verified the source filter, drill search, cue reassignment and mixed-spin randomized download. Physical landing accuracy remains unverified.

Chrome at 390 px verified keyboard tab navigation, cue and comment editing, audio-clock highlights, pause and resume position, Stop clearing the highlight, automatic scrolling, and fixed controls during list scrolling. The resulting download passed the frozen MSYNC validator with zero warnings.

The music-led build and all 12 tests passed with the frozen validator loaded. Synthetic fixtures verified irregular accents, a sustained section boundary, stable marker placement across drill selections, and five-cycle section compilation. Chrome verified editable text, line errors, the five-cycle download, audio highlighting, and pinned controls. A local rock MP3 exercised end-to-end detection and generation. Annotated-song accuracy and physical feed timing remain unverified.

The event panel passed the production build and all 12 existing automated tests. Chrome verified side-by-side panels at 1280 px, a stacked layout at 390 px, candidate preservation after deleting a score line, scheduled section cycles, synchronized highlights and auto-scrolling, and Pause, Resume and Stop.
