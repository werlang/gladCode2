import express from 'express';
import { CustomError } from './helpers/error.js';
import { assertJwtSecretConfiguration } from './helpers/jwt.js';
import { Mysql } from './helpers/mysql.js';
import { corsMiddleware, csrfOriginMiddleware, requestLogMiddleware, securityHeadersMiddleware } from './helpers/platform.js';
import { errorMiddleware } from './middleware/error.js';
import { authRouter } from './route/auth.js';
import { newsRouter } from './route/news.js';
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
