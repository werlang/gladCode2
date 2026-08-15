# Synty modular hero runtime assets

The Three.js replay uses selected source files from the user-provided Synty
POLYGON Fantasy Hero Characters pack:

- `FBX/ModularCharactersFixedScale.fbx`
- `FBX/Weapons/SK_Wep_Joust_01.fbx`
- `FBX/Weapons/SK_Wep_Staff_01.fbx`
- `FBX/Weapons/SK_Wep_Sword_01.fbx`
- the thirteen non-mask `Textures/PolygonFantasyHero_Texture_*.png` atlases

`script/render2/synty-hero-assets.js` is the runtime ownership boundary. It
parses the combined character once, shares geometry, and keeps only the
modular parts selected for each gladiator. Other pack files are source-library
material and are not required by the replay.

The combined FBX repeats identity-wrapped skeleton branches for its modular
parts. The runtime rebinds selected meshes to one canonical per-hero skeleton;
`script/render2/synty-hero-animation.js` then applies deterministic combat poses
for every engine action. Do not drive all copies by bone name or reuse the
FBX's generic `Take 001` pose sequence as a battle-action clip.

This repository does not define the third-party asset license. Keep the pack's
purchase or distribution terms with the project before redistributing these
files.
