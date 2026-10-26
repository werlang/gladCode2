import express from 'express';
import { CustomError } from './helpers/error.js';
import { assertJwtSecretConfiguration } from './helpers/jwt.js';
import { Mysql } from './helpers/mysql.js';
import { corsMiddleware, csrfOriginMiddleware, requestLogMiddleware, securityHeadersMiddleware } from './helpers/platform.js';
import { auth } from './middleware/auth.js';
import { errorMiddleware } from './middleware/error.js';
import { adminRouter } from './route/admin.js';
import { authRouter } from './route/auth.js';
import { battlesRouter } from './route/battles.js';
import { duelsRouter } from './route/duels.js';
import { friendsRouter } from './route/friends.js';
import { gladiatorsRouter } from './route/gladiators.js';
import { logsRouter } from './route/logs.js';
import { messagesRouter } from './route/messages.js';
import { newsRouter } from './route/news.js';
import { notificationsRouter } from './route/notifications.js';
import { potionsRouter } from './route/potions.js';
import { rankingRouter } from './route/ranking.js';
import { releasesRouter } from './route/releases.js';
import { reportsRouter } from './route/reports.js';
import { statsRouter } from './route/stats.js';
import { teamsRouter } from './route/teams.js';
import { tournamentRoundsRouter } from './route/tournament-rounds.js';
import { tournamentsRouter } from './route/tournaments.js';
import { trainingRoundsRouter } from './route/training-rounds.js';
import { trainingsRouter } from './route/trainings.js';
import { usersRouter } from './route/users.js';

const port = 3000;
const host = '0.0.0.0';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

app.use(requestLogMiddleware);
app.use(securityHeadersMiddleware);
app.use(corsMiddleware);
app.use(csrfOriginMiddleware);
// tournament imports carry their battle logs, so administrators may send large bodies there;
// every other body stays small
app.use('/admin/tournaments/import', auth({ admin: true }), express.json({ limit: '100mb' }));
app.use(express.json({ limit: '2mb' }));

/** Process liveness. */
app.get('/health', (req, res) => {
    res.send({ status: 'alive' });
});

/** Database readiness. */
app.get('/ready', async (req, res, next) => {
    try {
        await Mysql.ping();
        res.send({ status: 'ready' });
    }
    catch {
        next(new CustomError(503, 'Service unavailable.', 'NOT_READY'));
    }
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/news', newsRouter);
app.use('/gladiators', gladiatorsRouter);
app.use('/battles', battlesRouter);
app.use('/logs', logsRouter);
app.use('/potions', potionsRouter);
app.use('/ranking', rankingRouter);
app.use('/stats', statsRouter);
app.use('/friends', friendsRouter);
app.use('/messages', messagesRouter);
app.use('/reports', reportsRouter);
app.use('/notifications', notificationsRouter);
app.use('/duels', duelsRouter);
app.use('/tournaments', tournamentsRouter);
app.use('/teams', teamsRouter);
app.use('/tournament-rounds', tournamentRoundsRouter);
app.use('/trainings', trainingsRouter);
app.use('/training-rounds', trainingRoundsRouter);
app.use('/releases', releasesRouter);
app.use('/admin', adminRouter);

app.use((req, res, next) => {
    next(new CustomError(404, 'Resource not found.', 'NOT_FOUND'));
});
app.use(errorMiddleware);

let server;
if (process.env.NODE_ENV !== 'test') {
    assertJwtSecretConfiguration();
    server = app.listen(port, host, () => console.log(`API listening on http://${host}:${port}/`));

    /** Closes the HTTP server and the pool so `docker stop` returns at once. */
    const shutdown = signal => {
        console.log(`${signal} received: closing API`);
        server.close(async () => {
            await Mysql.close().catch(() => {});
            process.exit(0);
        });
        setTimeout(() => process.exit(0), 3000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

export { app, server };
