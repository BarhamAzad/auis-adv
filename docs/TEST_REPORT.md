# Version 2.1 browser verification

The production release was built with Vite and tested in installed Google Chrome using Playwright's `channel: 'chrome'` and a real WebGL canvas. **182 browser checks passed; no failing checks or browser runtime errors remain.** The state regression suite also passed.

## Browser and hardware

- **Google Chrome 154.0.8037.98**, headless automation, native WebGL rather than forced software rendering.
- **MacBookPro18,3, Apple M1 Pro, 16 GB memory**, macOS **15.5**. Hardware fields were read from the local machine during the test.
- GPU vendor: **Google Inc. (Apple)**. Renderer: **ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)**.
- Desktop viewport **1440 × 900**, device scale **1**; all ten regions sampled.
- Retina viewport **1440 × 900**, device scale **2**; five representative regions in both presets. High renders at **2592 × 1620** (pixel ratio 1.8); Balanced at **1655 × 1035** (pixel ratio 1.15).
- Responsive panels checked at **320, 390, 768, 1024 and 1440 px**. Phone screenshots and real automated touch input use **390 × 844**, with an additional compact welcome/touch check at **320 × 568**.
- Production URL used: `http://127.0.0.1:4180/`. Final measurement time (UTC): `2026-10-07T09:33:37.380Z`.

## Measured performance

Four short stationary samples per view were collected after a warm-up. The final performance run used a separate Chrome process after the gameplay/interface audits closed. Across the sampled views, Three.js reported **63–197 draw calls** and **380,448–530,808 triangles** per frame. Higher geometric detail is maintained through static spatial batches, instanced scenery, simpler distant foliage, and one-batch distant NPCs.

| Desktop, High | FPS | Draw calls | Triangles |
| --- | ---: | ---: | ---: |
| Academic Preparatory Program | 60 | 197 | 530,808 |
| Department of Engineering | 60 | 141 | 471,104 |
| Department of Computing and Informatics | 55–60 | 180 | 479,262 |
| Department of Business Administration | 60 | 65 | 384,048 |
| Department of English | 60 | 70 | 414,256 |
| Department of Medical & Health Sciences | 60 | 87 | 423,914 |
| Department of Social Sciences and Law | 60 | 66 | 389,500 |
| Department of Mathematics and Natural Sciences | 60 | 63 | 380,448 |
| College of Dentistry | 60 | 73 | 397,292 |
| College of Pharmacy | 60 | 90 | 427,800 |

| Retina region | High FPS | Balanced FPS |
| --- | ---: | ---: |
| Academic Preparatory Program | 60 | 60 |
| Department of Engineering | 60 | 60 |
| Department of Computing and Informatics | 60 | 60 |
| Department of Mathematics and Natural Sciences | 60 | 60 |
| College of Pharmacy | 60 | 60 |

These are warmed stationary samples on one Apple M1 Pro, with a 60 Hz frame-rate ceiling. They are not sustained-load, percentile, minimum-device or native-mobile benchmarks. Initial shader compilation can slow the first frames. The complete samples and hardware/GPU strings are in [production-results.json](production-results.json).

## Acceptance coverage

The 7 October 2026 logo/palette update was retested with the activity, UI, branding and production suites. On-foot route and collision/camera evidence is retained from 6 October; geometry, movement, quest IDs and save behavior are unchanged by this update.

| Suite | Passed | Evidence |
| --- | ---: | --- |
| Complete adventure/activity acceptance | 27 | [browser-results.json](browser-results.json) |
| On-foot routes and interactions | 37 | [routes-results.json](routes-results.json) |
| World/movement/camera regressions | 15 | [world-audit-results.json](world-audit-results.json) |
| Content/interface/audio/responsive regressions | 16 | [ui-audit-results.json](ui-audit-results.json) |
| Supplied logo, contrast and responsive branding | 51 | [branding-results.json](branding-results.json) |
| Production interactions, assets and runtime | 36 | [production-results.json](production-results.json) |
| Legacy/corrupt saves and unavailable storage | State suite passed | `tests/state.mjs` |

All eleven activities were solved through the puzzle controls, with failed attempts, hints, retries, completion feedback and replay without duplicate rewards. Both engineering tasks restore one lantern; the final beacon reaches nine. Archive tests retain the seven-department/two-college classification, APP status, degree/minor separation, source URLs and unresolved overview discrepancy.

The route suite starts at APP, walks to all **34** guides, companions and stations with real held WASD/Shift input, repairs the bridge through its UI, and walks across to the northern regions. It uses collision data to plan approximately **554 metres** of routes, with no teleport, testMove or restorePosition calls. Debug positioning is used only for repeatable scenarios in the other suites; quest completion always uses activity controls.

World checks cover actual wall sliding, running/jumping at the unrepaired river, repaired-deck crossing, rendered ground sampling, camera orbit/drag obstruction across all ten regions, foot visibility over a foreground ridge, near-crane camera/body clearance, walkable interior floors, blocked conversations through walls, partial settings, modal pause/landing, HUD-focused E interaction, blur/capture release and real touch input. An independent rendered-terrain raycast check also matched the ground interpolator within 0.000001 metres.

UI checks cover exact official names, long-name maps and archives, native keyboard selection, opener focus and modal focus containment, saving actual position, corrupt/duplicate save recovery, blocked-storage feedback, audio connection count/cancellation/resume races, saved music through keyboard gestures, unavailable audio, OS reduced motion, activity replay/retest feedback, all activity and faculty panels at 390 px, and touch/music/prompt control overlap. The audio check waits for scheduled cancellation to become observable, with a 500 ms failure timeout.

## Logo and palette verification

The user-supplied AUIS PNG is bundled unchanged in the header and browser favicon. Palette colors were sampled from its pixels: navy `#182b55`, gold `#c89921`, white `#ffffff`. Desktop and touch-phone branding checks preserve the square logo and accessible header name, keep all four menus and eleven activity panels usable, and exercise keyboard hints/returns. Computed text contrast for sampled welcome, settings and activity controls is at least 4.5:1; exact measurements are in [branding-results.json](branding-results.json). The final rebuilt site also passed a byte-for-byte served-logo comparison and an automated touch tap on Begin at 320 × 568.

## Inspected screenshots

All captures below are from the running improved release. Visual inspection corrected an intersecting tree crown, a camera inside the explorer near the crane, a foreground ridge hiding feet, phone control/prompt overlaps, and a short-phone welcome card covering the logo. Final captures were reviewed for grounded feet, readable labels, roof/arch forms, scenery and interface layout.

| Capture | File |
| --- | --- |
| AUIS logo and navy/gold desktop welcome | [branding-desktop-welcome.png](../public/screenshots/branding-desktop-welcome.png) |
| Navy/gold academic map | [branding-world-map.png](../public/screenshots/branding-world-map.png) |
| Branded engineering activity and hint | [branding-activity.png](../public/screenshots/branding-activity.png) |
| AUIS logo and welcome on a phone | [branding-mobile-welcome.png](../public/screenshots/branding-mobile-welcome.png) |
| Short-phone welcome with an unobstructed logo | [branding-compact-mobile-welcome.png](../public/screenshots/branding-compact-mobile-welcome.png) |
| Navy/gold phone map | [branding-mobile-map.png](../public/screenshots/branding-mobile-map.png) |
| Explorer face, clothing, hands and travel pack | [19-explorer-detail.png](../public/screenshots/19-explorer-detail.png) |
| APP study halls and starting plaza | [09-app-study-hall.png](../public/screenshots/09-app-study-hall.png) |
| Engineering fabrication and renewable energy | [10-engineering-workshop.png](../public/screenshots/10-engineering-workshop.png) |
| Computing network hall and robotics | [11-computing-robotics.png](../public/screenshots/11-computing-robotics.png) |
| Business trading hall and market | [12-business-trading-hall.png](../public/screenshots/12-business-trading-hall.png) |
| English reading hall and newsroom | [13-english-reading-hall.png](../public/screenshots/13-english-reading-hall.png) |
| Medical observation laboratory | [14-medical-laboratory.png](../public/screenshots/14-medical-laboratory.png) |
| Social sciences and law council spaces | [15-social-council.png](../public/screenshots/15-social-council.png) |
| Mathematics observatory and experiment plaza | [16-mathematics-observatory.png](../public/screenshots/16-mathematics-observatory.png) |
| Dentistry teaching clinic and molar | [17-dentistry-clinic.png](../public/screenshots/17-dentistry-clinic.png) |
| Pharmacy laboratory and greenhouse | [18-pharmacy-greenhouse.png](../public/screenshots/18-pharmacy-greenhouse.png) |
| Harbor water, banks, trees and mountains | [20-harbor-landscape.png](../public/screenshots/20-harbor-landscape.png) |
| Introduction and official APP label | [01-app-start.png](../public/screenshots/01-app-start.png) |
| Restored engineering crossing view | [02-engineering.png](../public/screenshots/02-engineering.png) |
| Solar activity and completion feedback | [03-energy-discovery.png](../public/screenshots/03-energy-discovery.png) |
| Interactive reflection activity | [04-reflection-puzzle.png](../public/screenshots/04-reflection-puzzle.png) |
| Nine-lantern beacon reward | [05-beacon-restored.png](../public/screenshots/05-beacon-restored.png) |
| Sourced Moulakis Archive | [06-moulakis-archive.png](../public/screenshots/06-moulakis-archive.png) |
| Small-screen archive | [07-mobile-archive.png](../public/screenshots/07-mobile-archive.png) |
| Packaged starting scene | [08-production-village.png](../public/screenshots/08-production-village.png) |
| Official world map with readable full names | [09-official-world-map.png](../public/screenshots/09-official-world-map.png) |
| Phone HUD, visible explorer and clear touch controls | [10-mobile-official-region.png](../public/screenshots/10-mobile-official-region.png) |
| Phone world map | [11-mobile-official-map.png](../public/screenshots/11-mobile-official-map.png) |

## Remaining scope limits

No reproducible blocking game issue remains in the tested Chrome release. Firefox, Safari, native mobile GPU performance, controllers, screen-reader playability and long sessions have not been separately accepted. Saves remain browser/device-local. Clinical and pharmaceutical tasks are fictional teaching simulations. The AUIS department-count discrepancy remains documented without inventing a department or treating APP as one.
