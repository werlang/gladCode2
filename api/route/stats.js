import { Router } from 'express';
import { Validate } from '../helpers/validation.js';
import { asyncRoute } from '../middleware/error.js';
import { Stats } from '../model/stats.js';

const router = Router();
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /stats?start=YYYY-MM-DD&end=YYYY-MM-DD&minMmr=0&maxMmr=4000
 * Statistics of the ranked battles in a period (default: the last month) and renown range.
 */
router.get('/', asyncRoute(async (req, res) => {
    const { start, end, minMmr, maxMmr } = req.query;
    res.send(await Stats.summary({
        start: start ? Validate.text(start, 'start', { pattern: DATE }) : null,
        end: end ? Validate.text(end, 'end', { pattern: DATE }) : null,
        minMmr: Validate.integer(minMmr ?? 0, 'minMmr', { min: 0, max: 100000 }),
        maxMmr: Validate.integer(maxMmr ?? 100000, 'maxMmr', { min: 0, max: 100000 }),
    }));
}));

export { router as statsRouter };
