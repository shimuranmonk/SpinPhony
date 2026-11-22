# SpinPhony handover

## Checkpoint

PCON v1 is installed locally and bundled in the repository. The six continuity roles passed the bundled validator on the existing initialization branch. The reviewed `main` was the README-only commit `1d4429629c38ca934e4d994eeabf992104d82142`. The existing initialization commit `31ee5d1ab945e169af596d6d1af2d019d578e117` was preserved and opened for review in [PR #1](https://github.com/shimuranmonk/SpinPhony/pull/1). Development started from a clean, separate SpinPhony checkout of that branch.

The standalone browser generator decodes local audio, estimates a steady rhythm, accepts manual timing, rotates selected drill patterns on a beat grid, previews cues and downloads MSYNC v1. The [architecture](ARCHITECTURE.md) records format and catalog provenance and the [testing record](TESTING.md) records build, automated and browser checks.

The 2026-11-23 follow-up adds editing for generated work and recovery times and drill assignments. The downloaded file reflects those edits. The Pages workflow is ready for review and requires a manual run from the default branch.

## Resume

1. Inspect current branch heads and PR state. Merge decisions belong to the maintainer. After each parent lands, confirm the next PR targets the intended base and its diff contains only its own changes.
2. Once the application reaches `main`, set the Pages publishing source to GitHub Actions and run **Publish SpinPhony** from `main`. Verify the hosted revision with a real audio file and an MSYNC download.
3. Expand the recorded-music checks across genres, browsers and codecs. Record tempo and beat offset against labeled references and record tracks that require manual timing.
