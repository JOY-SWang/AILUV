# AI-LUV Patient Mock

Standalone, local-only mobile mock of the **M1.3 Checkpoint Patient ·
2026-07-30** workflow.

## What this mock includes

- fixed demo session code `0730`;
- patient `M1.3 Checkpoint Patient`;
- one task: `I want water`;
- all five `mit-v1` patient stages;
- bundled stage-specific reference audio;
- real microphone capture through `MediaRecorder`;
- optional in-browser voice gain, compression, and live input metering;
- mobile-friendly recording preference: MP3, then M4A/AAC, with WebM fallback;
- local recording playback and download;
- recording Blob persistence in this browser's IndexedDB.

It contains no API base URL and makes no application network requests. It does
not connect to FastAPI, PostgreSQL, MinIO, SoulX, or any other model.

## Local development

```sh
npm ci --ignore-scripts
npm run dev
```

Microphone capture requires HTTPS except on `localhost`.

## Vercel

Use this directory as the Vercel project root, or copy the directory contents
into a new repository root. The included `vercel.json` supplies the Vite build,
SPA fallback, security headers, and `microphone=(self)` permission policy.

Commit `package-lock.json`, but do not commit `node_modules/` or `dist/`. Both
are covered by `.gitignore`. If `node_modules/` was already committed, remove it
from Git tracking before the next deployment:

```sh
git rm -r --cached node_modules dist
git add .gitignore package.json package-lock.json vercel.json
git commit -m "Fix clean Vercel dependency install"
git push
```

After deployment, open:

```text
https://YOUR-PROJECT.vercel.app/patient/code
```

Use code `0730`. Recordings never leave the current browser. Use **Start over**
to delete the local mock session and all IndexedDB recordings.
