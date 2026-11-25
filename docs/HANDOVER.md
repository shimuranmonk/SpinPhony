# SpinPhony handover

## Current checkpoint (2026-11-26)

The [current release](https://github.com/shimuranmonk/SpinPhony/pull/12) combines form-aware Auto with the block editor. Music holds audio, Training Profile and the Nova/Custom library. Generate Timeline opens Preview and fills the MSYNC Editor with the same planned cues. Replacing an existing draft requires confirmation. Preview, cue highlights and downloads follow the current editor draft.

The editor supports CDRILL, FLAVOR, IDLE, STOP and yellow FLAG bookmarks. It can load a Nova drill and level starting at the chosen ball or reuse a complete INLINE definition from the draft. Identical definitions are shared. Block edits are independent, so changing a ball can split a definition without changing other blocks. Save as Custom stores a named pattern in the browser. CLEAR removes blocks and keeps the selected audio and SESSION fields. The separate Music Map is paused. Music markers remain available as drop targets.

## What Auto can do today

Auto detects accents and acoustically distinct sections, schedules finite cycles, and uses provisional work and recovery budgets when sections are long. Nova Level 1 and saved Custom settings are starting points for ball parameters. Player skill bounds speed and spin, while the robot envelope further limits legal combinations. Auto still tends to prefer one low-demand drill per section and can underuse a selected pool. The thresholds need annotated-music and player/robot validation.

The [coaching contract](COACHING_SPEC_V1.md) describes the target behavior. The current release implements an initial subset. Full adaptive phase/workload policy, timed Auto FLAVOR changes, and exact next-ball recovery remain open. See the [architecture](ARCHITECTURE.md) and [testing](TESTING.md) for implemented behavior and observed checks.

## Resume

1. Read [continuation](CONTINUATION.md), compare the checkout with GitHub, and recover the verified revision from the release PR.
2. Use annotated diverse tracks to assess section boundaries and planned cycle distribution. Investigate why multiple selected drills may collapse to one, including long single-section tracks.
3. Verify MSYNC consumer timing and actual placements when robot testing is authorized. Keep validator results distinct from runtime and hardware observations.
4. If hosted deployment is requested, configure GitHub Pages for Actions and dispatch **Publish SpinPhony** from `main`. Verify the served revision and a valid download with a local audio file.
