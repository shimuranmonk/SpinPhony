# SpinPhony

SpinPhony turns a local music file into a table tennis practice timeline based on musical hits and section changes and exports it as MSYNC v1.

## Run locally

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Choose a browser-decodable audio file, select drills and a training profile, then generate the timeline. Audio analysis and SHA-256 hashing happen in the browser. Keep the original audio with the export because the timeline identifies those exact bytes.

In Preview, edit markers as text using `time | HIT or SECTION | drill name or - | optional comment`. Rename section labels in the comment field. An assignment such as `Forehand drive x5` on a SECTION line plays five cycles across that section and takes over from individual hit assignments there. Cue times must stay in order. Changing source inputs or generating again replaces the current edit.

Use **Setup** to configure the session and **Preview** to hear the track with synchronized cue highlighting. Preview also lets you add cue comments. Downloads include those notes and a description of each used inline drill.

`npm test` runs automated checks and `npm run build` creates a static site in `dist/`. Use localhost or HTTPS for browser hashing.

See [continuation](docs/CONTINUATION.md), [architecture](docs/ARCHITECTURE.md) and [testing](docs/TESTING.md) for project status and compatibility evidence.
