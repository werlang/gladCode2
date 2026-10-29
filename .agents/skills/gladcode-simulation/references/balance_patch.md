# Balance Patch Workflow

End-to-end procedure for shipping a simulation rebalance (ability costs,
damages, durations, ranges). Follow every step — each one maps to a past
incident where it was skipped.

## 1. Change the simulation values

Ability tuning lives in two payload files:

- `Payload/gladCodeGlobals.c` — `abilitycost[6]`, indexed by the
  `ABILITY_*` defines in the same file (`FIREBALL 0, TELEPORT 1, CHARGE 2,
  BLOCK 3, ASSASSINATE 4, AMBUSH 5`).
- `Payload/gladCodeServerAPI.c` — damage multipliers, durations passed to
  `addBuff()`, ranges. Watch for values expressed in **two places**
  (e.g. teleport range appears in both the in-range check and the
  max-distance clamp).

`ptbrFunc.c`, `gladCodeAPI.c` and `gladCodeAPI.py` are thin wrappers and do
not need changes for pure number tuning.

## 2. Recompile the server (verify, no image rebuild)

No image rebuild is required: the API's `Battle` (`api/model/battle.js`) copies
`Payload/` (mounted read-only at `/payload` in the api container) into every run folder and
`socket_compile.sh` runs
`gcc -o gladCodeServerMain gladCodeServerMain.c -lm -lpthread`, which
`#include`s the whole server. "Recompile" therefore means **prove the tree
compiles and runs**:

```bash
# compile check (the engine image ships gcc; mirrors socket_compile.sh)
docker run --rm -v "$PWD/Payload:/w" -w /w gladcode2-vm \
  gcc -o /tmp/gladCodeServerMain gladCodeServerMain.c -lm -lpthread -Wall
# only pre-existing warnings in untouched functions are acceptable

# end-to-end sim: C bots must start with `#include "gladCodeCore.c"` plus a
# setup() block (setName/setSTR/setAGI/setINT/setSlots), exactly as
# api/helpers/gladiator-code.js generates them; loop with while(1) like production
# (a for-loop that exits yields CLIENT TIMEOUT and an empty simlog, which is
# only flushed at sim end). Lower timeLimit in a /tmp COPY (never the repo)
# and run socket_compile.sh detached, then confirm errorc.txt holds no errors
# and simlog is non-empty. tests/engine/run.sh does the regression battles.
```

## 3. Update the manual and function docs

Ability prose lives in `web/public/script/functions/<ability>.json`
(`description.long`); costs and the ability summary table live in
`web/view/manual.html` (`#nav-hab` table). After editing the source JSONs,
**regenerate the bundle** served by `script/function.js` and `script/docs.js`
with the project's own script (do not hand-edit the bundle):

```bash
docker run --rm -v "$PWD":/w -w /w node:22-alpine node web/scripts/compress-functions.js
```

Then verify only the intended keys changed (key order may shuffle; the key
set must be identical):

```bash
git show HEAD:web/public/script/functions.json > /tmp/functions_old.json
docker run --rm -v "$PWD/web/public/script/functions.json:/new.json:ro" \
  -v /tmp/functions_old.json:/old.json:ro node:22-alpine node -e \
  "const o=require('/old.json'),n=require('/new.json');
   for(const k of Object.keys(o))
     if(JSON.stringify(o[k])!==JSON.stringify(n[k]))console.log('DIFFERS:',k)"
```

Also bump `api/version` (plain `x.y.z`, no trailing newline) and redeploy the API:
it stamps the version onto saved gladiators (`model/gladiator.js`) and battle logs
(`model/battle-log.js`), and ranked battles, duels and tournament picks refuse
gladiators saved on another version (`GLADIATOR_OUTDATED`).

For non-breaking bumps, ship a carry-forward migration
`migrations/NNN_bump_gladiators_to_X_Y_Z.sql` updating only rows on
the replaced version (see Database Migrations); omit it for BREAKING bumps.
Administrators can also carry an older version forward from the `/update` page,
which sends the release email too.

## 4. Publish the patch-notes news post

The API's `/news` reads the `news` table (`id, title, time, post`); there is no
admin UI, so ship the post as versioned SQL in `dev-tools/news/` and
apply it to the **production** database:

```bash
docker compose exec -T mysql mysql -u root -p --default-character-set=utf8mb4 gladcode < dev-tools/news/news-<version>.sql
```

Write the body in PT-BR HTML following the 2.9.1/2.9.2 posts: one
`Balanceamento` section, each item naming the ability (linked to
`https://gladcode.dev/function/<name>`), old → new values in bold, and a
short motive in italics. Do not invent statistics; keep motives qualitative
unless fight data was actually consulted.

Gotchas: `*.sql` is gitignored (keeps DB dumps out), so the news file needs
`git add -f` — deliberate, flag it in the handoff. `TODO.MD` is likewise gitignored scratch (matched by the `TODO.md`
pattern), so its checkboxes live on disk only and cannot ride along in a
commit.

## 5. Pre-commit checklist (places people forget)

- [ ] Both expressions of a two-spot value (e.g. teleport range check + clamp)
- [ ] `abilitycost` index matches the `ABILITY_*` define, not position guesswork
- [ ] `web/view/manual.html` cost/description cells for every touched ability
- [ ] Source ability JSONs edited AND `functions.json` regenerated via the script
- [ ] `api/version` bumped (+ carry-forward migration unless the bump is BREAKING)
- [ ] News SQL added under `dev-tools/news/`
- [ ] TODO.MD balance items checked off
- [ ] Full `tests/render2/` suite still green (unrelated but cheap)
