# Synty asset reference (for agents)

**Read this before picking, loading or placing any 3D asset for the render2 battle renderer.** The packs live in
`public_html/assets/synty/<pack>/` (gitignored, never commit them; served at `/assets/synty/<pack>/`). This folder
indexes everything in them so you can find a model, know its real size, pivot, cost and textures, and load it the
way the renderer already does, without opening FBX files by hand.

## Files here

| File | What it holds |
| :--- | :--- |
| `INDEX.md` | Generated overview: per pack the FBX/image counts, FBX unit, skinned and animated counts, material lists, atlases and categories. Start here. |
| `<pack>.tsv` | Generated, one line per FBX. Columns: `path` (under the pack), `category` (MaterialList folder, else parent folder), `size_x_m size_y_m size_z_m` (bounds in metres), `min_x_m min_y_m min_z_m` (bounds minimum: where the pivot sits relative to the model), `tris`, `meshes`, `bones` (skinned rig), `clips` (animation `name:duration`), `fbx_materials` (material names inside the FBX), `materiallist_slots` (`Slot (Texture)` from the pack's MaterialList txt, in slot order). |
| `<pack>.textures.tsv` | Generated, every image of the pack with its pixel size (PNG/TGA). |
| `build-catalog.mjs` | Regenerates all of the above. Run after adding or updating a pack (command below). |
| `README.md` | This guide (hand-written: conventions, loaders, what each pack is for). |

Regenerate (Docker only, there is no Node on the host; takes several minutes for ~7,700 FBX):

```bash
docker run --rm -v "$PWD":/w -w /w node:22-alpine sh -c \
  'cd /tmp && npm i -s three@0.185.1 >/dev/null 2>&1 && THREE_DIR=/tmp/node_modules/three node --max-old-space-size=4096 /w/docs/synty-assets/build-catalog.mjs'
```

## Finding assets

```bash
# Every tree across the packs, with sizes and triangle counts
grep -i 'tree' docs/synty-assets/*.tsv | cut -f1-5,9
# Ancient Empire building pieces under 300 triangles
awk -F'\t' '$2 ~ /Building/ && $9 < 300' docs/synty-assets/ancient-empire.tsv | cut -f1,3-5,9
# Which texture a material slot uses (the MaterialList slots column)
grep 'SM_Bld_Roof_Base_Peak_01' docs/synty-assets/ancient-empire.tsv | cut -f13,14
# Animation clips and their lengths
grep -i 'attack' docs/synty-assets/sword-combat.tsv | cut -f1,12
```

To **see** pieces before using them, open the dev viewer (Apache must be up) and screenshot it with agent-browser:
`http://localhost:8085/dev-tools/synty-viewer.html?pack=ancient-empire&p=Buildings/SM_Bld_Wall_01@0@0@0,Buildings/SM_Bld_Roof_Base_Peak_01@0@0@0@3&cam=3,6,8&t=1.2,2,-1`
(`p` takes `path@x@z@ryDegrees@y` in native metres; axes: red +X, green +Y, blue +Z; `window.done` turns true when
rendered). In the running battle, `window.threeBattleRenderer.setDebugView({ position, target })` pins the camera
anywhere and `getDebugSnapshot().render` gives draw calls and triangles.

## Conventions that matter

- **Units.** Synty FBX are authored in **centimetres** (scale by `0.01`), except **`dungeon-pack` (metres)**. The TSV
  sizes are already in metres. `INDEX.md` lists the unit per pack.
- **Scale of the world.** The arena's people (fighters and crowd) stand about **0.9 m**, roughly half Synty's native
  human. The coliseum pieces are used at native scale; countryside props and buildings at `PROP_SCALE` 0.55
  (`landscape-layout.js`); POLYGON Mini Fantasy models are tabletop-sized (a house is ~1 m) and need ×5 or more.
- **Pivots.** Read `min_*`: a min of `0` on an axis means the pivot is on that edge. Ancient Empire walls pivot at
  their left end (`min_x 0`, span +X), roof tiles at a corner (span +X / −Z), most props and trees at their base
  centre. `kit.instances(name, placements, { center: true })` moves a pivot to the bottom centre when needed.
- **Materials.** The material names inside the FBX files are the artist's (`Roof`, `Stucco`, `lambert1132`,
  `GlassSHD`, ...), not the MaterialList slot names; they match the `materiallist_slots` column **in order**. Map them
  to textures by name: `MATERIAL_TEXTURES` in `synty-arena.js` (coliseum) and `BUILDING_TEXTURES` in
  `synty-landscape.js` (houses). Anything unmapped falls back to the pack's colour atlas, which is right for props and
  wrong for tiled building surfaces (they show the whole atlas). The texture paths baked into the FBX are stale and
  `.psd`/`.tga` can't be read: loaders blank them with a URL modifier and rebuild materials by name.
- **Atlases.** Most props share one colour atlas per pack (see `INDEX.md`); building surfaces (stucco, brick, marble,
  roof tiles, windows) use the tiling textures in `ancient-empire/Textures/BuildingAlts/`.
- **Cost.** Check `tris` before scattering: an Ancient Empire `Tree_Cluster` is ~2.4k triangles, `Tree_03` 280, a
  door wall 1k, a plain wall 20. Everything is drawn instanced (one draw call per piece and material), but the
  triangles add up; far away use the light models.

## Packs and how render2 uses them

| Pack | Contents / good for | Loader in render2 | Used for |
| :--- | :--- | :--- | :--- |
| `ancient-empire` | Roman buildings (modular: walls 2.5×3 m on a 2.5 m grid, `Roof_Base_*` 2.5 m gable/slope tiles, `*_Large` 7.5 m roof system, pillars, trims, steps, doors, windows, amphitheatre seating), props (braziers, statues, carts, furniture, banners), environment (Mediterranean trees, cypresses `Tree_Thin`, bushes, roads, cobbles, crop rows, straw fields, fences, cliffs), Synty cloud rings, citizen and soldier characters. | `synty-arena.js` `loadSyntyKit(THREE, pieces, extraTextures)` (`loadSyntyArena` for the coliseum set) | Coliseum (`synty-coliseum.js`), crowd characters (`synty-crowd.js`), countryside, town and temple (`synty-landscape.js`, `landscape-layout.js` `housePieces` / `templePieces`). |
| `dungeon-pack` | Dungeon architecture in metres: archways, portcullis, tunnels, wall torches. | `loadSyntyKit` with the `dungeon:` prefix | Coliseum gates and torches. |
| `dungeon-realms` | Dark-fantasy props, weapons, the skeleton body, head props. | `synty-model.js` / `synty-outfit.js` | Fighter weapons, skeleton body, bandanas/hair props. |
| `goblin-war-camp`, `viking-realm` | Weapons, shields, camp and Norse props/buildings. | `synty-outfit.js` (`WEAPON_MODELS`, `SHIELD_MODELS`) | Fighter weapons and shields. |
| `bow-crossbow` | Bows (skinned, with a string bone) and crossbows. | `synty-outfit.js` `bowModel` | Archer bows. |
| `synty-modular-heroes` | Modular fantasy hero parts (bodies, armour, hair, beards, attachments) on one rig. | `synty-model.js` `loadSynty` | Fighter bodies and outfits. |
| `base-locomotion`, `sword-combat` | Animation clips (`A_*`, masculine/feminine): walk/run/strafe/turn/idle, sword attacks, block, hit, stun, death. | `synty-model.js` (retargeted), `synty-crowd.js` (baked) | Fighter and crowd motion. |
| `meadow-forest` | Nature: terrain textures (`Textures/Terrain/`: grass, dirt, mud, gravel, cobbles, paving with normals), rocks, grass, flowers, trees, fences. | `synty-floor.js`, `synty-landscape.js` (`GROUND_TEXTURES`) | Arena sand splat, countryside ground. |
| `special-effects` | Particle textures (sparkle, smoke, rings, ritual circles, portals, hexagon) and FX meshes. | `effects.js` `FX_TEXTURES`, `fire.js` | All battle VFX and fires. |
| `fantasy-warrior-hud` | HUD sprites (frames, bars, gems, icons). No FBX. | `hud.js` `ART`, `playback-render2.css` | Battle HUD and playback chrome. |
| `fantasy-pack` (POLYGON Mini Fantasy) | Tabletop-scale (~1 m) fantasy village/castle/pirate/viking/western/samurai buildings, hex/cube tiles, and flat painted **background ranges** (`SM_Background_*`, 14 m cards). Medieval/fantasy styling, not Roman. | `loadSyntyKit` with the `mini:` prefix (atlas `PolygonMinis_Texture_01.png`) | Mountain backdrops on the horizon. |

When something new is needed, prefer (1) a pack and loader already in use, (2) the Roman look (`ancient-empire`)
for anything in or around the coliseum, (3) light models for anything far away. Procedural geometry is the last
resort, only where no pack has the shape.
