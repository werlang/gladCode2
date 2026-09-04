# Synty runtime assets

The Three.js battle replay (`script/render2/`) consumes selected files from the
Synty POLYGON packs dropped into this folder. The runtime never scans the packs
dynamically: every consumed FBX or texture is registered by path in one of the
config modules listed below, and `tests/render2/asset-packs.test.mjs` asserts
that each registered path exists on disk.

| Pack folder | Used for | Registered in |
| --- | --- | --- |
| `synty-modular-heroes/` | Modular gladiator bodies (meshes, rig, palette atlases) and the original melee weapon pool | `script/render2/synty-hero-config.js`, `script/render2/synty-hero-assets.js` |
| `bow-crossbow/` | Bow and crossbow models for ranged fighters plus the arrow projectile mesh | `synty-hero-config.js` (equipment), `synty-hero-assets.js` (`ARROW_ASSET_FILE`) |
| `sword-combat/` | Combat animation clips: attack families, hit reacts, staggers, stuns, deaths, guard idles and fidgets | `script/render2/animation-library.js` (`CLIP_SOURCES`) |
| `base-locomotion/` | Gendered walk, run, sprint, crouch idle and crouch-walk cycles | `script/render2/animation-library.js` (`CLIP_SOURCES`) |
| `ancient-empire/` | Colonnade pillars, statues, lion statues and classical weapons/shields | `script/render2/synty-prop-packs.js` (`PROP_REGISTRY`), `synty-hero-config.js` (`empire:` entries) |
| `dungeon-pack/` | Arena dressing (braziers, torches, banners, throne, portcullis, weapon racks, obelisks, bone piles) and expanded weapon/shield pools | `synty-prop-packs.js` (`PROP_REGISTRY`), `synty-hero-config.js` (`dungeon:` entries) |

## Runtime loading

`script/render2.js` parses three asset groups in parallel before the renderer
starts, each degrading independently on failure:

- `SyntyHeroAssets` — the combined character FBX, hero palette textures and
  every equipment FBX (through `script/render2/weapon-library.js`).
- `SyntyAnimationLibrary` — the curated clip list.
- `SyntyPropAssets` — the arena dressing pieces.

## Texture notes

The newer pack FBXs reference their atlas textures by stale names (`.psd`
files, pre-rename atlas names) that do not exist on disk.
`weapon-library.js` installs a `LoadingManager` URL modifier that rewrites
those requests onto the shipped PNGs (for example `Dungeons_Texture.psd` →
`dungeons-pack/Textures/Dungeons_Texture_01.png` and the Ancient Empire
`PolygonAncientWorlds_Texture_01*` variants → `Textures/Alts/…_01_A.png`).
Arena props additionally convert every material to `MeshStandardMaterial`
(`side: DoubleSide` so flat pieces such as banners never vanish) with a
per-prop tint fallback for untextured slots.

## Rig and animation contract

The combined hero FBX repeats identity-wrapped skeleton branches per modular
part. `synty-hero-assets.js` rebinds the selected meshes onto one canonical
per-hero skeleton; `synty-hero-animation.js` applies deterministic combat
poses, and loaded clips are retargeted so they can only bind to those
consolidated `GC_`-prefixed bones. Do not drive all skeleton copies by bone
name and do not reuse the FBX's generic `Take 001` sequence as an action clip.

This repository does not define the third-party asset license. Keep each
pack's purchase or distribution terms with the project before redistributing
these files.
