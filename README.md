# SpinPhony — Soundtrack of a Loop

SpinPhony turns a song into a table tennis practice score for the Nova Prime controller. Pick a track, decide where you want to practise and where you want to rest, then download an MSYNC v1 file that Nova Prime can use with that same audio. SpinPhony handles the score in your browser. Keep the original audio file alongside the export, since MSYNC identifies it by its exact contents.

## Make a session

1. **Music.** Open a local audio file and choose drills from **Nova Drills** or your **Custom** library. The Training Library shows each ball's settings. Choose your skill level, pace, and racket hand, then click **Generate Timeline** for a starting draft.
2. **MSYNC Editor.** Build a score from scratch or edit the generated blocks. Drag a CDRILL, FLAVOR, IDLE, STOP, or yellow FLAG onto a music marker, or add one at the playhead. Click a block to change its settings. Flags are private to the draft and make useful bookmarks as you listen.
3. **Preview.** Play the track with the sticky cue map and a tall, read-only view of the current MSYNC file. Click a cue to jump there. The file view highlights the cue and its referenced definition. Use **VALIDATE** in the editor to check the file, then download it from either view.

A CDRILL can have up to ten editable balls. Load a Nova pattern and level into the ball list, reuse an INLINE drill already in the draft, or build your own. Identical drill definitions are written once even when the drill is cued many times. Use **Save as Custom** to keep an adjusted drill in this browser for future generations. You can also edit the session's Countdown, Cycle pause, and Robot lead above the file preview.

## Why Auto still needs a human pass

The hard part is getting useful practice out of what the song gives us. An accent can be a drum hit or a guitar attack. A workable practice block also needs enough time for complete drill cycles and recovery. One early run on a 3:47 track detected just one section and scheduled three forehands about 75 seconds apart. The file was valid and the workout was nearly empty. Long active sections now get multiple work blocks and planned recovery gaps.

Auto still uses estimates for musical boundaries and repeated passages, and can favor one selected drill when several are available. The skill profiles bound generated ball settings and keep feed rate independent of song tempo. A legal file still needs a review for practice volume, drill variety, and whether the ball settings land as intended on your setup. The [coaching spec](docs/COACHING_SPEC_V1.md) records where we want Auto to go. The editor is already there when you want to make the call yourself.

## Run locally

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Use localhost or HTTPS for audio hashing. `npm test` runs the automated checks and `npm run build` produces the static site in `dist/`.

See [current status](docs/CONTINUATION.md), [architecture](docs/ARCHITECTURE.md), and [testing](docs/TESTING.md).
