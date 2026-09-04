# Synty modular hero runtime assets

The Three.js replay builds every gladiator body from the user-provided Synty
POLYGON Fantasy Hero Characters pack:

- `FBX/ModularCharactersFixedScale.fbx`
- the thirteen non-mask `Textures/PolygonFantasyHero_Texture_*.png` atlases
- the rigid `FBX/Weapons/SK_Wep_*.fbx` pieces referenced by the `hero:` keys
  in `script/render2/synty-hero-config.js`

`script/render2/synty-hero-assets.js` is the runtime ownership boundary. It
parses the combined character once, shares geometry, and keeps only the
modular parts selected for each gladiator. Equipment from the newer packs
(bow-crossbow, dungeon-pack, ancient-empire) is loaded and shaded separately —
see `../README.md` for the full pack map.

The combined FBX repeats identity-wrapped skeleton branches for its modular
parts. The runtime rebinds selected meshes to one canonical per-hero skeleton;
`script/render2/synty-hero-animation.js` then applies deterministic combat
poses for every engine action, while sword-combat and base-locomotion clips
drive the states they cover. Do not drive all copies by bone name or reuse the
FBX's generic `Take 001` pose sequence as a battle-action clip.

This repository does not define the third-party asset license. Keep the pack's
purchase or distribution terms with the project before redistributing these
files.
