/**
 * Web Server for gladCode2 Modern Front-End
 * Serves static files and proxies API requests to PHP backend
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.API_BASE_URL || 'http://apache:80';

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Serve static files from web/ directory
app.use(express.static(path.join(__dirname, '../web'), {
    maxAge: '1h',
    etag: true,
}));

// Proxy API requests to PHP backend
const apiProxy = createProxyMiddleware({
    target: API_BASE_URL,
    changeOrigin: true,
    logLevel: 'warn',
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Proxy error: ' + err.message,
        });
    },
});

// Proxy all PHP backend requests
app.use('/back_*.php', apiProxy);
app.use('/*.php', apiProxy);

// Proxy WebSocket/Socket.IO connections
app.use('/socket.io', apiProxy);

// Proxy static assets from old public_html (for backward compatibility)
app.use('/icon', apiProxy);
app.use('/image', apiProxy);
app.use('/sprite', apiProxy);
app.use('/audio', apiProxy);
app.use('/res', apiProxy);

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        status: 'error',
        message: err.message,
    });
});

// Start server
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('gladCode2 Web Server');
    console.log('='.repeat(50));
    console.log(`Server:     http://localhost:${PORT}`);
    console.log(`API Proxy:  ${API_BASE_URL}`);
    console.log(`Static:     ${path.join(__dirname, '../web')}`);
    console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
