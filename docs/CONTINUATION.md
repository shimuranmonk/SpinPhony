# SpinPhony continuation

- **Ball editor Speed/Spin limits** · Each CDRILL ball shows compact labels such as `SPEED-mx10` and `SPIN-mx8`. The Spin label follows the current Speed. Committing Speed or Spin applies the shared frozen MSYNC v1 table and adjusts values to valid half steps. Imported files are still checked by the strict validator.

- **Checkpoint (2026-11-26)** · The [form-aware Auto and editor release](https://github.com/shimuranmonk/SpinPhony/pull/12) includes skill-aware generation, Custom drills, FLAG bookmarks, shared INLINE definitions and a taller read-only Preview of the editor draft.
- **Current workflow** · Music configures the track and Auto. Generate Timeline opens Preview and populates MSYNC Editor after confirming draft replacement. Manual editing, validation and saving Custom drills happen in the editor. The separate Music Map and beat toggle are removed for now.
- **Open** · Real-song form accuracy, balanced use of multiple chosen drills, coaching workload calibration, physical landing and consumer timing remain pending. The full coaching design is recorded in [Coaching Specification v1](COACHING_SPEC_V1.md).
- **First next action** · Compare generated workloads for annotated tracks with sparse, changing and repeating passages. Record complete cycles per selected drill, start/end recovery and longest no-feed gaps. Success is a valid file with meaningful practice and visible reasons for unused selections.
- **Verification** · The release candidate passed the build and 26 automated tests. See [testing](TESTING.md) for targeted Chrome evidence. Hosted deployment and hardware validation remain pending.

Read [handover](HANDOVER.md), [decisions](DECISIONS.md) and [architecture](ARCHITECTURE.md) for details.
