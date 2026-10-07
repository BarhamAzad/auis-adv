# Lanterns of Learning

An original browser-based, third-person fantasy adventure about discovering AUIS academic fields and restoring a damaged knowledge beacon. Built with Three.js and Vite. The world begins in the Academic Preparatory Program and contains, seven department regions and two college regions, with eleven interactive activities and ten verified faculty guides.

## Version 2 release

The improved release replaces generic houses with subject buildings, gives explorers and guides detailed articulated models, and adds sculpted mountain ranges, branching trees, riverbanks and animated water. Regional labels use the official AUIS names throughout the world and interface. Existing v1 browser saves continue to load under the same key; invalid save fields are repaired safely.

The downloadable package is `AUIS-Lanterns-of-Learning-v2.zip`. It includes source, the ready-to-serve `dist/`, tests, documentation, original asset licenses and new screenshots. Unzip it, open a terminal in its folder, then follow the commands below.

## Run locally

Use Node.js 18 or newer (Node.js 20+ recommended) and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173/`. The game starts directly in its 3D world. Press **Begin your journey** to dismiss the introduction.

```sh
npm run build
npm run preview
```

`dist/` is the complete production build: serve it using any static HTTP host. Opening `index.html` through `file://` does not support the JavaScript module/assets path used by the build. No server database, authentication or API keys are required. All fonts, graphics and game code are included; official academic links open AUIS in another tab.

## Play

| Control | Action |
| --- | --- |
| WASD or arrow keys | Walk relative to the camera |
| Shift | Run |
| Space | Jump |
| Mouse drag, left or right | Orbit camera |
| Mouse wheel | Zoom |
| Q / R | Rotate camera with keyboard |
| E | Talk to a nearby character or interact with an object |
| M / J / L | World map / quest journal / Moulakis Archive |
| Escape | Close a panel |

On touch devices, use the directional pad, Jump and Talk buttons; drag the world to turn the camera. Graphics quality, camera sensitivity, reduced motion and original music are adjustable in Settings. Touch layout is supported; native touch hardware and all mobile GPUs have not been benchmarked.

Start with Sera in the village, then follow the east trail to Professor Switzner at the river crossing. Repair the bridge by testing a beam material, supports and deck sections. Cross to Professor Al-Waeli and restore solar power. Completing both engineering tasks restores the first of nine academic lanterns. Explore the other regions, learn from their guides and complete their activities. The completed beacon gives the final story reward.

The map unlocks fast travel after discovering a region on foot. Interactions are short; choose **Tell me about this field** for factual academic information or open its archive entry. Returning to a guide after a successful activity gives feedback. Completed activities can be replayed without duplicate rewards.

Progress, discoveries, player position and settings are automatically saved in this browser’s `localStorage`, under `auis-lanterns-v1`. Settings also offers manual saving and a confirmed reset. Saves stay on the current device/browser; clearing browser site data clears them.

## Content, sources and assets

- [Editing and extension guide](docs/CONTENT_GUIDE.md): characters, facts, regions and new activities.
- [Academic source register](docs/ACADEMIC_SOURCES.md): official URLs, faculty verification and classification notes.
- [Release status](docs/RELEASE_STATUS.md): complete areas and follow-up scope.
- [Browser test report](docs/TEST_REPORT.md): results, device, performance and screenshots.
- [Asset register](docs/ASSETS.md): original procedural geometry/audio, font and dependency licenses.

Academic records are in `src/data/academics.js`, with official source URLs and verification date **2026-10-06**. All fantasy locations, characters other than identified faculty, dialogue, music, quests and visual designs are original. Faculty fantasy roles, appearances and dialogue are explicitly fictional adaptations, without invented histories, quotations or endorsements. The game is an educational adaptation, not an official university product.

The overview claims eight departments while linking seven departments and two colleges. The current academic directory and 2025–26 catalog support seven. The game records the unresolved discrepancy instead of inventing an eighth department. APP remains a preparatory program, the library remains a library, and minors are not displayed as degrees.

## Browser checks

Use installed Google Chrome; all browser suites launch Playwright with `channel: 'chrome'`. Build and test an HTTP-served production release to avoid development hot reload interrupting a journey:

```sh
npm run build
npm run preview
# In another terminal (replace the URL if Vite prints a different port):
npm run test:state
GAME_URL=http://127.0.0.1:4173/ npm run test:browser
GAME_URL=http://127.0.0.1:4173/ npm run test:routes
GAME_URL=http://127.0.0.1:4173/ npm run test:world
GAME_URL=http://127.0.0.1:4173/ npm run test:ui
GAME_URL=http://127.0.0.1:4173/ npm run test:production
```

`test:browser` solves all eleven activities through their controls. `test:routes` walks to all 34 characters and stations with real WASD/Shift input, repairs the crossing through its UI and continues across the bridge; it never repositions the explorer through debug navigation. `test:world` covers collisions, jumping, camera obstruction, input release and target placement; `test:ui` covers names, focus, audio, storage and responsive panels. Scenario tests use the documented `window.__AUIS_GAME__` observability bridge for repeatable setup, without bypassing activity solutions. `test:production` captures each region and records desktop/Retina frame rate, draw calls, triangle counts, browser/GPU and hardware. Run this benchmark on its own for representative timings.

Results are written to `docs/*-results.json`; screenshots are in `public/screenshots/`. On a platform without installed Chrome, install Chrome or explicitly change the launch to Playwright Chromium after `npx playwright install chromium`. The current release was verified on Chrome/Apple M1 Pro; other browser and mobile GPU performance remains unmeasured.
# auis-adv
