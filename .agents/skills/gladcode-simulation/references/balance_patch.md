# Balance Patch Workflow

End-to-end procedure for shipping a simulation rebalance (ability costs,
damages, durations, ranges). Follow every step — each one maps to a past
incident where it was skipped.

## 1. Change the simulation values

Ability tuning lives in two payload files:

- `payload/gladCodeGlobals.c` — `abilitycost[6]`, indexed by the
  `ABILITY_*` defines in the same file (`FIREBALL 0, TELEPORT 1, CHARGE 2,
  BLOCK 3, ASSASSINATE 4, AMBUSH 5`).
- `payload/gladCodeServerAPI.c` — damage multipliers, durations passed to
  `addBuff()`, ranges. Watch for values expressed in **two places**
  (e.g. teleport range appears in both the in-range check and the
  max-distance clamp).

`ptbrFunc.c`, `gladCodeAPI.c` and `gladCodeAPI.py` are thin wrappers and do
not need changes for pure number tuning.

## 2. Recompile the server (verify, no image rebuild)

No image rebuild is required: `back_simulation.php` copies `/app/payload/*`
(repo `payload/`, same inode as `./Payload` mount) into every run folder and
`socket_compile.sh` runs
`gcc -o gladCodeServerMain gladCodeServerMain.c -lm -lpthread`, which
`#include`s the whole server. "Recompile" therefore means **prove the tree
compiles and runs**:

```bash
# compile check (apache image ships gcc; mirrors socket_compile.sh)
docker run --rm -v "$PWD/payload:/w" -w /w gladcode2-apache \
  gcc -o /tmp/gladCodeServerMain gladCodeServerMain.c -lm -lpthread -Wall
# only pre-existing warnings in untouched functions are acceptable

# end-to-end sim: C bots must start with `#include "gladCodeCore.c"` plus a
# setup() block (setName/setSTR/setAGI/setINT/setSlots), exactly as
# back_simulation.php generates them; loop with while(1) like production
# (a for-loop that exits yields CLIENT TIMEOUT and an empty simlog, which is
# only flushed at sim end). Lower timeLimit in a /tmp COPY (never the repo)
# and run socket_compile.sh detached, then confirm errorc.txt holds no errors
# and simlog is non-empty.
```

## 3. Update the manual and function docs

Ability prose lives in `public_html/script/functions/<ability>.json`
(`description.long`); costs and the ability summary table live in
`public_html/manual.php` (`#nav-hab` table). After editing the source JSONs,
**regenerate the bundle** served by `script/function.js` and `script/docs.js`
with the project's own script (do not hand-edit the bundle):

```bash
docker run --rm -v "$PWD/public_html:/var/www/html" -w /var/www/html \
  gladcode2-apache php compress_functions.php
```

Then verify only the intended keys changed (key order may shuffle; the key
set must be identical):

```bash
git show HEAD:public_html/script/functions.json > /tmp/functions_old.json
docker run --rm -v "$PWD/public_html/script/functions.json:/new.json:ro" \
  -v /tmp/functions_old.json:/old.json:ro node:20-alpine node -e \
  "const o=require('/old.json'),n=require('/new.json');
   for(const k of Object.keys(o))
     if(JSON.stringify(o[k])!==JSON.stringify(n[k]))console.log('DIFFERS:',k)"
```

Also bump `public_html/version` (plain `x.y.z`, no trailing newline):
`back_glad.php` stamps it onto saved gladiators, `back_simulation.php`
cancels duels whose gladiators predate it and stamps it on battle logs.

For non-breaking bumps, ship a carry-forward migration
`runner/migrations/NNN_bump_gladiators_to_X_Y_Z.sql` updating only rows on
the replaced version (see Database Migrations); omit it for BREAKING bumps.

## 4. Publish the patch-notes news post

`back_news.php` reads the `news` table (`id, title, time, post`); there is no
admin UI, so ship the post as versioned SQL in `public_html/dev-tools/` and
apply it to the **production** database:

```bash
docker compose exec -T mysql mysql -u root -p gladcode < public_html/dev-tools/news-<version>.sql
```

Write the body in PT-BR HTML following the 2.9.1/2.9.2 posts: one
`Balanceamento` section, each item naming the ability (linked to
`https://gladcode.dev/function/<name>`), old → new values in bold, and a
short motive in italics. Do not invent statistics; keep motives qualitative
unless fight data was actually consulted.

Gotchas: `*.sql` is gitignored (keeps DB dumps out) and no `.sql` file is
versioned, so the news file needs `git add -f` — deliberate, flag it in the
handoff. `TODO.MD` is likewise gitignored scratch (matched by the `TODO.md`
pattern), so its checkboxes live on disk only and cannot ride along in a
commit.

## 5. Pre-commit checklist (places people forget)

- [ ] Both expressions of a two-spot value (e.g. teleport range check + clamp)
- [ ] `abilitycost` index matches the `ABILITY_*` define, not position guesswork
- [ ] `manual.php` cost/description cells for every touched ability
- [ ] Source ability JSONs edited AND `functions.json` regenerated via the script
- [ ] `version` bumped (+ carry-forward migration unless the bump is BREAKING)
- [ ] News SQL added under `public_html/dev-tools/`
- [ ] TODO.MD balance items checked off
- [ ] Full `tests/render2/` suite still green (unrelated but cheap)
