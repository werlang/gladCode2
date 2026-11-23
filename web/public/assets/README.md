# Synty runtime assets

The Three.js replay (`web/public/script/render2/`) and the editor's gladiator creator load selected FBX
and texture files from the Synty packs placed in `web/public/assets/synty/`. That `synty/` subfolder is
gitignored; production mounts it into the web container from the host. This README stays tracked in
`web/public/assets/`.

**Catalogue:** [`docs/synty-assets/`](../../../docs/synty-assets/README.md) indexes every pack, FBX and
texture (units, pivots, material lists, clips) and explains which loader uses each pack. Regenerate it with
`build-catalog.mjs` after changing a pack.

## Loaders

| Loader | Uses |
| :--- | :--- |
| `render2/synty-model.js` (`SyntyLibrary`, `loadSynty`) | Modular Heroes bodies, gear and animations; the battle fighters and the editor creator. |
| `render2/synty-outfit.js` | The pure LPC-to-Synty outfit mapping. |
| `render2/synty-arena.js` (`loadSyntyArena`, `loadSyntyKit`) | Ancient Empire, Dungeon, Mini Fantasy and prop pieces for the coliseum and the countryside. |
| `render2/synty-floor.js` | The Meadow Forest floor textures. |
| `render2/synty-landscape.js` | The Meadow Forest terrain, roads, trees and buildings. |
| `render2/synty-crowd.js` | The Ancient Empire spectators and their baked animation clips. |

The runtime never scans `web/public/assets/synty/`: every consumed path is registered in a loader (paths
above are under `web/public/script/`), and the catalogue is the reference for paths and units.
`special-effects/` supplies the particle textures and `fantasy-warrior-hud/` the HUD sprites.

## Licence

This repository does not define the third-party asset licence. Keep each pack's purchase or distribution
terms with the project before redistributing these files.
