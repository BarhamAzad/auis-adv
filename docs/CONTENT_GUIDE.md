# Adding and editing content

Academic information, region definitions, 3D targets, activities and the interface live in small JavaScript modules. Run `npm run dev` while editing and `npm run build` before sharing a release.

| What to change | File |
| --- | --- |
| Verified academic units, programs, minors, faculty specialties and official sources | `src/data/academics.js` |
| Verification evidence, naming conflicts and unresolved questions | `docs/ACADEMIC_SOURCES.md` |
| Official unit display names, world accent colors and map positions | `src/game/regions.js` |
| Supplied AUIS logo used in the header and favicon | `public/auis-logo.png`, `src/main.js`, `index.html` |
| Navy/gold/white UI palette and responsive logo sizing | `src/ui/style.css`, `src/ui/activities.css` |
| Terrain, movement, collision volumes, interaction positions and visible rewards | `src/game/world.js` |
| Subject-specific buildings, arched halls, equipment and clinic/greenhouse forms | `src/game/architecture.js` |
| Articulated characters, appearances, distance detail and movement/idle animation | `src/game/characters.js` |
| Sculpted mountains, instanced botanical scenery and animated water | `src/game/landscape.js` |
| Conversations, archive presentation, journal and region-to-activity mapping | `src/main.js` |
| Activity definitions, puzzle behavior and feedback | `src/game/activities.js` |
| Activity styling | `src/ui/activities.css` |
| Saved progress, allowed quest IDs and beacon counting | `src/game/state.js` |

## Logo and UI palette

The logo PNG is the unchanged user-supplied image. UI palette tokens come from its navy `#182b55`, gold `#c89921` and white `#ffffff`; keep text and control contrast readable when adjusting their tints. Activity diagrams define a shared palette in `activities.js`, and canvas world-label colors are in `world.js`. Region `color` fields still describe scenery/character accents, while UI maps use the brand palette and numbered full-name selectors.

## Editing academic information

Find the record by its stable `id`, such as `engineering`. The legacy `fantasy` property now repeats the official `unit` name for save/content compatibility. Keep fictional quest descriptions and scenery separate from these academic labels. `type` must reflect the institution's actual classification: `department`, `college`, `preparatory program` or `library`. APP and the library have separate exports rather than entries in the nine academic-region array.

The records use this structure:

```js
{
  id: 'engineering',
  unit: 'Department of Engineering',
  type: 'department',
  fantasy: 'Department of Engineering',
  summary: 'A short paraphrase of verified academic information.',
  degrees: [{ name: 'Civil Engineering', type: 'Bachelor of Science (B.S.)',
              url: 'https://www.auis.edu.krd/bs-civil-engineering',
              verifiedAt: '2026-10-06' }],
  minors: [],
  subjects: ['engineering design'],
  faculty: [{ name: 'Nathaniel Switzner', specialty: 'Verified specialty summary.',
              url: 'https://www.auis.edu.krd/nathaniel-switzner',
              verifiedAt: '2026-10-06' }],
  sources: [{ title: 'Engineering department',
              url: 'https://www.auis.edu.krd/department-engineering',
              verifiedAt: '2026-10-06' }]
}
```

The existing `program`, `faculty` and `source` helpers reduce repetition. They apply the shared `VERIFIED_AT` date. Advance that shared date only after rechecking every record it covers; for a partial refresh, assign the actual date explicitly on the changed records. A `note` on a program records a naming or link uncertainty for maintainers.

Follow the official source links before changing facts. Confirm program names and degree levels on their degree pages, and confirm faculty affiliations on both the unit list and faculty profile. Record specialty statements only when the profile supports them. Paraphrase briefly, preserve an official URL and the actual review date, and document conflicts in the source record. A failed retrieval is an uncertainty, not proof that a page or program does not exist.

The overview's eight-department claim conflicts with its seven department links and the seven-department catalog statement. Keep that audit visible until an official source resolves it. Do not add an inferred eighth department, count an older department name twice, or count APP as a degree-granting department. Empty arrays mean this release displays no offering of that type from its selected source scope; they do not prove the university offers none elsewhere.

Keep invented lore and dialogue outside these factual records. Real faculty roles and appearances in the game are fictional adaptations. Do not add invented personal history, attributed quotations or endorsements. Clinical and pharmacy activities should remain educational simulations; fictional mixtures should be labeled as fictional and use imaginary ingredients.

## Editing characters and conversations

In `world.js`, interaction targets are created with `addTarget`. Its coordinates are horizontal world `x` and `z`; terrain height supplies `y`. Passing `true` creates a character. The final color controls the character's clothes.

```js
addTarget({
  id: 'engineering-support',
  type: 'support',
  regionId: 'engineering',
  name: 'Tavi · Workshop assistant',
  label: 'Talk to Tavi',
}, 18.4, -2.3, true, '#ba805f');
```

Use unique target IDs and an existing `regionId`. `name` supplies the floating label and conversation title for supporting characters; `label` supplies the nearby interaction prompt. Place characters near accessible paths, with room for the player and camera, rather than inside collidable props.

Engineering's two professor targets are explicit `addTarget` calls. The other eight academic destinations use the `otherGuides` array; each row names the region, faculty guide, activity ID, activity label and original supporting character. Update that row when replacing a guide, and update the corresponding verified faculty record in `academics.js`.

`main.js` resolves a faculty target to the region's first `faculty` record. Engineering's `engineer-switzner` and `engineer-energy` IDs have explicit selection rules in `resolveGuide`. If adding a second guide elsewhere, add an equally explicit selection rule; otherwise the conversation will show the first verified faculty member regardless of the world label. Match the world label, conversation title and academic profile.

Short regional dialogue is in the `dialog` object inside `openConversation`. The deeper “Tell me about this field” response comes from the verified academic summary and faculty specialty. Task choices and hints use `regionActivities` and the activity definitions. Keep introductory dialogue brief and place optional explanation behind the field and archive choices. Characters can share a regional activity while offering different fictional perspectives.

## Creating an activity

Every activity needs a stable ID, a definition, playable controls, useful result feedback and a world target. A question should let the player change something, test the choice and observe a result. A wrong attempt should explain what to reconsider and allow a retry; provide a hint. On success, explain the academic subject represented by the simplified simulation.

The interface reads these definition fields:

```js
newActivity: {
  id: 'newActivity',
  title: 'A title that describes the task',
  regionId: 'engineering',
  subject: 'Engineering design',
  description: 'What the player can change, test and discover.',
  hint: 'A useful clue about the relationship being tested.',
  reward: 'A discovery recorded in the archive.',
}
```

Add the definition and a puzzle renderer in `activities.js`, then add that renderer to the mapping near the bottom of the file. Each renderer receives `(root, { feedback })` and returns `{ reset, test, dispose?, hint? }`. `reset` restores the puzzle model. `test` returns or awaits `{ success: boolean, message: string }`. `dispose`, when needed, cancels renderer timers and listeners. Follow an existing puzzle with similar controls.

The shared `mountActivity(id, container, options)` wrapper receives `onComplete`, `onClose` and `completed`, and returns a cleanup function. It calls `onComplete` with the activity definition after a successful test, once per unfinished activity. `completed` supports replay without granting another reward. Completion updates saved progress, the journal, archive discoveries and `world.setProgress`; the shared completion handler also ignores repeated completion IDs.

Add an approachable activity target to `world.js`:

```js
addTarget({ id: 'newActivity', type: 'activity', regionId: 'engineering',
            name: 'Workshop experiment', label: 'Try the experiment' }, x, z);
```

Add the ID to the region's `regionActivities` list in `main.js` so the task appears in conversations, the journal and archive. Add it to `questIds` in `state.js`, or loading a saved game will discard its completion. Decide whether it is required for that region's beacon lantern: `lanternCount` groups the required IDs, with both `bridge` and `energy` needed for Engineering. Optional activities should not silently change the main-story requirement.

Add a visible result in `world.js`'s `setProgress` where appropriate: show repaired objects, light a mechanism, change a character arrangement or open a route. Initialize the result from saved completion IDs so it survives reloading. Update colliders when an object actually opens or closes a path. Do not place reward logic only in a transient completion toast.

## Creating a region

Add a region record to `regions.js` with a unique `id`, official academic `name`, `subtitle`, `color`, `x`, `z` and `unitId`. Academic region IDs currently match the `academics` IDs; `village` is handled separately using `preparatory`. Keep that linkage explicit if introducing another non-academic place.

Build its landmark and plaza in `architecture.js`, using the geometry helpers passed from `world.js`. Keep interactive targets and reactive rewards in `world.js`. Add colliders to solid buildings and props. Give it at least one faculty guide, one original supporting character and one playable activity. Reuse geometry and materials where practical and keep object counts bounded. Place the region within the current terrain and map dimensions unless you also extend those systems.

For a new academic region, add its verified content in `academics.js` and its activities in `regionActivities`, `questIds` and the beacon groups. The current nine-lantern total is also written into the HUD and beacon text in `main.js`; update those labels and the map's accessibility description when changing the number of regions. A new fantasy location alone should not imply a newly verified AUIS academic unit.

## Checking a content change

Build with `npm run build`, then open the game in a real browser. Walk to the changed target and check its prompt, world label, title, field explanation, hint and archive sources. Try an unsuccessful puzzle attempt and a successful one; inspect the visible reward. Reload the game and confirm the saved result, then retry the activity to check that rewards are not counted twice. Confirm that the source links and unit/program/minor labels still match the verification record.

For new geometry, also test approach paths, collisions, jumping and camera movement. For a new region or expensive visual effect, record the browser, device and observed performance with the release checks.

## Geometry and performance in version 2

`architecture.js` builds field-specific halls and equipment, including arches with real openings, sawtooth factory roofs, a slotted observatory dome, clinic chairs and curved greenhouse glazing. Its returned `floors` define the actual paving heights used by walking physics. Register opaque walls and equipment with `addCollider`; leave entrances and station approaches clear. The harbor pier is a separate walkable deck at x=41, z=64–88, y=0.82. Keep those bounds synchronized with its geometry.

`characters.js` exports `createCharacter`, `updateCharacter` and `setCharacterDistance`. Appearance is seeded from the stable target ID and region, with original skin, hair, clothing and accessories. Every faculty appearance remains invented. Nearby figures have eleven articulated batches for torso, head, cape, shoulders/elbows and hips/knees. Middle-distance NPCs use one simplified batch; distant figures and nonessential animation are culled. Feet sit at local y=0. Never merge articulated parts into a rigid full model near the camera.

`landscape.js` creates connected ridged mountain height fields and instanced trunks, branches, crown clusters, conifers, rocks, meadow plants and reeds. Nearby leaf clusters use more geometry and shadows; distant foliage uses a simpler instance batch. Water adds gentle procedural ripples and respects reduced motion. The world batches static opaque geometry by spatial cell, surface roughness, side and shadow behavior; transparent glazing and reward materials stay separate.

Use `terrainSurface` for interaction and movement placement: it interpolates the same triangle surface as the rendered ground. Architecture floors and the repaired bridge override natural ground heights. Camera obstruction checks both opaque collider volumes and intervening terrain along the line to the explorer’s feet. It rises over ridges and chooses a clear side when nearby equipment would collapse the boom into the avatar. World labels and markers retain their authored size at a distance and cap their screen size near the camera. `restorePosition` finds a safe nearby position when new scenery overlaps an older save location. Region/quest IDs, the v1 save schema and `auis-lanterns-v1` key remain stable.

For screenshots, debug `setCamera({yaw,pitch,distance})` adjusts a review view; `debug.floors`, `debug.colliders`, `debug.targets` and `debug.clearApproach` support regression audits. This bridge is for inspection and repeatable tests. Keep the actual-keyboard route suite independent of debug repositioning.
