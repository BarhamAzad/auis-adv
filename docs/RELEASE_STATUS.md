# Version 2 release status

The visual and gameplay improvement release is implemented. The starting area is the Academic Preparatory Program. All nine academic region names use the official AUIS unit names; the Moulakis Archive retains its fictional name. Internal region/quest IDs and the v1 save key remain compatible with existing journeys.

| Area | Scenery and learning space | Activities |
| --- | --- | --- |
| Academic Preparatory Program | Arched study hall, classroom, reading tables and starting plaza | Study-skills investigation |
| Department of Engineering | Sawtooth fabrication workshop, structural tests, trusses, machinery, renewable-energy installations and repaired bridge | Bridge design; solar energy |
| Department of Computing and Informatics | Network hall, server racks, terminals, antenna and articulated robot equipment | Programming and debugging |
| Department of Business Administration | Trading hall, meeting table, budget desk, market canopies and walkable harbor pier | Market allocation |
| Department of English | Reading hall, writing tables, translation boards, newspaper office and printing equipment | Evaluate conflicting reports |
| Department of Medical & Health Sciences | Glazed laboratory, specimen tables and observation equipment | Simulated microscope samples |
| Department of Social Sciences and Law | Council chamber, civic archive, debate seating and agreement flags | Water-sharing negotiation |
| Department of Mathematics and Natural Sciences | Slotted observatory dome, telescope, laboratory and geometric experiments | Reflected-light alignment |
| College of Dentistry | Teaching clinic, simulation chairs and shaped oversized molar model | Assemble tooth structures |
| College of Pharmacy | Research/formulation laboratory, curved glass greenhouse and botanical beds | Imaginary ingredient formulation |

Characters now have shaped faces, ears, noses, eyes, fingers, layered clothing, boots, padded backpacks and articulated shoulders/elbows/hips/knees. Guide appearances vary by stable seed and region, with reading, inspecting, working and guiding idle poses. Faculty faces, clothes, roles and dialogue are original fictional adaptations.

The landscape uses connected multi-peak mountain surfaces, contoured hills, branching trees, conifers, shaped rocks, riverbank reeds, meadow vegetation, a real harbor basin and animated ripples. Static scenery is spatially batched; foliage is instanced with distance-dependent crown detail, and NPCs switch to one-batch distant figures. High/Balanced/Low presets cap rendering resolution and use sensible shadows.

## Corrected behavior

Opaque walls now block proximity conversation as well as movement. Camera clipping applies after smoothing and checks the viewing line to the explorer’s feet, rising over intervening terrain. Nearby equipment moves the view to a clear side rather than collapsing the camera into the character. Characters and paths use the rendered triangle surface; building floors, the harbor pier and repaired bridge provide explicit walkable heights. Workshop/plaza props and an intersecting reading-hall tree were moved to keep approaches clear.

Paused or consumed input cannot leak into movement. Native focused buttons retain Space/arrow behavior; blur and lost pointer capture release movement/orbit input. Partial settings updates preserve reduced motion, sensitivity and shadow preferences. Dialog focus returns to its opener and remains inside the active panel. Map selectors and long official names wrap at small widths. Nearby world labels and markers have screen-size caps so they cannot fill the view. Phone interaction prompts sit below the explorer and clear the touch controls; all activity range inputs fit their panels.

Music has one output connection, resumes after pointer or keyboard gestures, cancels old voices immediately when disabled, and handles resume/disable races. Reduced motion reaches scenery, interface and activities. Failed retests clear stale success feedback; replay preserves reward counts. Saving captures the exact current position, reports unavailable storage, validates corrupt fields and keeps successful-save timestamps accurate.

## Verification and package

The production build and all browser suites run in installed Google Chrome with hardware-backed WebGL. All eleven activities have been solved through their controls. The route suite reaches every guide, companion and activity with actual keyboard walking, repairs the crossing through its UI and continues on foot across the bridge. Separate world and interface suites cover collision/camera/input, floors, saves, focus, audio, responsive layouts and academic classifications.

See [TEST_REPORT.md](TEST_REPORT.md), machine-readable `*-results.json`, and the inspected screenshots in `public/screenshots/`. The refreshed production site is `dist/`; the complete source/build/documentation package is `AUIS-Lanterns-of-Learning-v2.zip`.

## Known limits

No failing game check or visible blocking defect remains in the tested Chrome build. Firefox, Safari, native mobile GPUs, controllers, screen-reader playability, cross-device saves and sustained long-session performance have not been separately accepted. Automated real touch input verifies layout and input release, rather than native-device GPU performance. Shader warm-up can affect the first frames; benchmark values are short warmed samples on one device.

The AUIS overview's eight-department claim still conflicts with its links and verified catalog supporting seven departments and two colleges. This remains documented and visible in the archive; APP is a preparatory program and contributes no academic lantern. No new academic claims were added. Laboratory and pharmacy activities remain simplified fictional teaching simulations.
