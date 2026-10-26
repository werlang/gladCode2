import { Router } from 'express';
import { CustomError } from '../helpers/error.js';
import { Validate } from '../helpers/validation.js';
import { asyncRoute } from '../middleware/error.js';
import { BattleLog } from '../model/battle-log.js';

const router = Router();
const HASH = /^[a-f0-9]{1,50}$/;

/**
 * GET /logs/:hash
 * A battle's simulation log (the engine's JSON array of steps), sent as a file with its length so
 * the replay can show download progress. 410 `LOG_EXPIRED` for cleaned-up battles.
 */
router.get('/:hash', asyncRoute(async (req, res) => {
    const log = await BattleLog.findByHash(Validate.text(req.params.hash, 'hash', { pattern: HASH }));
    const { file } = await log.file();
    res.type('application/json').sendFile(file);
}));

/**
 * DELETE /logs/:hash
 * Discards an editor test battle (the editor deletes the ones the player did not watch). Battles
 * that count cannot be deleted.
 */
router.delete('/:hash', asyncRoute(async (req, res) => {
    const log = await BattleLog.findByHash(Validate.text(req.params.hash, 'hash', { pattern: HASH }));
    if (log.origin !== 'editor') throw new CustomError(403, 'Only test battles can be deleted.', 'LOG_PROTECTED');
    await log.delete();
    res.send({ deleted: true });
}));

export { router as logsRouter };
