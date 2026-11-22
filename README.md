# SpinPhony

SpinPhony turns a local music file into a beat-timed table tennis practice timeline and exports it as MSYNC v1.

## Run locally

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Choose a browser-decodable audio file, check the estimated tempo and first beat, select drills and a training profile, then generate and download the timeline. Audio analysis and SHA-256 hashing happen in the browser. Keep the original audio with the export because the timeline identifies those exact bytes.

`npm test` runs automated checks and `npm run build` creates a static site in `dist/`. Use localhost or HTTPS for browser hashing.

See [continuation](docs/CONTINUATION.md), [architecture](docs/ARCHITECTURE.md) and [testing](docs/TESTING.md) for project status and compatibility evidence.
