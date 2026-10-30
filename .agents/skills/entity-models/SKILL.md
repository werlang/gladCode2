---
name: entity-models
description: Write or change gladCode persistence and rules in api/model — the base Model, the entity classes (User, Gladiator, BattleLog), the static domain models (tournaments, trainings, ranked battles, duels, social, potions), ownership filters, row locks and their order. Use whenever a model method reads or writes the database or decides a game rule.
---

# gladCode entity models

Localizes the global `entity-models` skill: follow it for the method; this file holds what is true in gladCode. On project facts, this file wins.

## Where

- `api/model/model.js`: `Model(table, { fields, primaryKey = 'id', insertFields, allowUpdate })` with `key`, `load(field, context)`, `insert(context)`, `update(changes, context)` (only `allowUpdate` columns), `delete(context)`.
- Entities on `Model`: `user.js` (`User`, `isAdmin`, `signInWithGoogle`), `gladiator.js` (`Gladiator`, `findOwned`, `assertSavable`, `saveChecked`), `battle-log.js` (`BattleLog`, log row plus the JSON file in `LOGS_DIR`).
- Domain models as classes of static methods: `battle.js` (`Battle`, builds and runs a battle), `ranked-battle.js`, `duel.js`, `tournament.js`, `tournament-round.js`, `training.js`, `training-round.js`, `friendship.js`, `message.js`, `report.js`, `potion.js`, `ranking.js`, `stats.js`, `news.js`, `notification.js`, `release.js`, `dev-tournament.js`, `sample-gladiator.js`.
- Pure rules live in `api/helpers/` (`battle-results.js`, `battle-stats.js`, `gladiator-code.js`) so they are unit-tested without the database.

## Rules

- Scope every read and write of a master's data by their id in the query (`Gladiator.findOwned(id, masterId)`, `{ cod: messageId, receiver: userId }`, `WHERE id = ? AND (user1 = ? OR user2 = ?)`); a miss is a 404 with the area's code (`GLADIATOR_NOT_FOUND`, `MESSAGE_NOT_FOUND`).
- Anything two requests could do at once runs in `Mysql.withTransaction` with the rows locked first (`SELECT ... FOR UPDATE` or `findOne(..., { opt: { forUpdate: true } })`): silver and potions, team joins, group battles (the `groups`/`training_groups` `locked` column plus `LOCK_SECONDS`), gladiator saves, ranked match claims, rewards. Lock `usuarios` before `gladiators`, in id order, as `saveChecked` and the ranked rewards do.
- Pass the transaction `context` to every helper call inside it; a call without it takes another pool connection.
- Never run a battle inside a transaction: claim under a lock, commit, run, then write the result (see `TournamentRound.fight`, `RankedBattle.fight`).
- Turn rows into API shapes in the model (`toJSON`, explicit mapping): camelCase keys, never raw rows with private columns (`googleid`, `pasta`, `email` of others).
- Keep game formulas parity-checked against the PHP golden values in `api/tests/unit/helpers/battle-results.test.js`.

## Deviations from `entity-models`

- Most domain models are static classes, not instances created in routes: tournaments, trainings and battles are workflows over several tables, not single entities.
- Tables keep the PHP-era names and columns (`usuarios`, `apelido`, `cod`, `master`, `amizade`, `pendente`); numeric primary keys stay, and the external ids are the existing hashes (logs, tournaments, trainings, news). There is no `public_id`.
- No relation helper: join tables (`gladiator_teams`, `group_teams`, `gladiator_training`) are handled inside the owning domain model.

## Checks before finishing

- A model test in `api/tests/unit/model/` with a mocked `Mysql` that asserts the owner filter, the lock SQL and the transaction context, plus the refused cases. Mocked SQL proves the call, not the query: run the flow against the local stack for new SQL.
