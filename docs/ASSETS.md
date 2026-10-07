# Asset register

The release contains original procedural game assets, the user-supplied AUIS emblem, and licensed fonts and dependencies.

| Asset | Location | Origin / license |
| --- | --- | --- |
| Terrain, bridge, beacon, targets and reactive world props | `src/game/world.js` | Original geometry authored for this project |
| Subject architecture, arched halls, factory roofs, equipment, clinic and greenhouse | `src/game/architecture.js` | Original procedural geometry |
| Sculpted mountain ranges, botanical instances, rocks and animated water | `src/game/landscape.js` | Original procedural geometry and shader effects |
| Detailed explorer/NPC faces, hair, hands, clothing, packs and articulated animation | `src/game/characters.js` | Original procedural geometry and animation |
| Gentle sixteen-note melody, synthesized tones and reward chime | `src/game/audio.js` | Original composition and Web Audio synthesis |
| Functional puzzle schematics | `src/game/activities.js` | Original SVG scientific/learning diagrams |
| Map and minimap | `src/main.js` | Original functional SVG maps derived from world coordinates |
| AUIS header logo and favicon | `public/auis-logo.png` | User-supplied AUIS emblem (`auis logo.png`), bundled byte-for-byte unchanged; university mark, not an original project asset |
| DM Sans fonts | `public/fonts/dm-sans-*.ttf` | SIL Open Font License; included `DM-Sans-OFL.txt` |
| Libre Caslon Display | `public/fonts/libre-caslon-display.ttf` | SIL Open Font License; included `Libre-Caslon-Display-OFL.txt` |
| Interface icons | `lucide` package | ISC license; npm package license included in dependencies |
| 3D rendering engine | `three` package | MIT license |

Typeface sources: Google Fonts official distribution (`fonts.gstatic.com`), with license texts from the Google Fonts repository. No external font or image request is needed at runtime. Official source links intentionally navigate to AUIS when clicked.

The interface palette is sampled from the supplied logo: navy `#182b55`, gold `#c89921` and white `#ffffff`. UI surfaces, text, controls, map drawings, puzzle diagrams and world labels use these colors and related navy/blue tints. This is an adaptation of the provided image, not a claim to reproduce an official brand guide.

Screenshots in `public/screenshots/` are captures of the running game and its interfaces. Academic names and paraphrased facts are attributed through official links in the archive and source register. No faculty portrait photographs, recorded voices, third-party music, Zelda names, artwork, maps, characters or assets are used.
