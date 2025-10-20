# Deployment Guide - gladCode2 Modern Front-End

This guide covers deploying the new modern front-end for gladCode2.

## Quick Start

### Development Environment

1. **Start all services:**
   ```bash
   docker compose up -d
   ```

2. **Access the applications:**
   - New front-end: http://localhost:8080
   - Old front-end: http://localhost:80
   - MySQL: localhost:3306

3. **View logs:**
   ```bash
   # All services
   docker compose logs -f
   
   # Specific service
   docker compose logs -f web-server
   docker compose logs -f apache
   ```

4. **Stop services:**
   ```bash
   docker compose down
   ```

### First Time Setup

1. **Create .env file** (if not exists):
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

2. **Install web-server dependencies:**
   ```bash
   cd web-server
   npm install
   cd ..
   ```

3. **Build and start:**
   ```bash
   docker compose build
   docker compose up -d
   ```

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Docker Network                      │
│                                                      │
│  ┌─────────────┐      ┌──────────────┐            │
│  │ web-server  │─────▶│   apache     │            │
│  │  (Node.js)  │ API  │   (PHP)      │            │
│  │  Port 8080  │Proxy │   Port 80    │            │
│  └─────────────┘      └──────────────┘            │
│         │                     │                     │
│         │                     ▼                     │
│         │              ┌──────────────┐            │
│         │              │    mysql     │            │
│         │              │  Port 3306   │            │
│         │              └──────────────┘            │
│         │                                           │
│         ▼                                           │
│  ┌─────────────┐                                   │
│  │    web/     │                                   │
│  │  (Static)   │                                   │
│  └─────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

## Services

### web-server (Node.js + Express)
- **Port:** 8080
- **Purpose:** Serves static files and proxies API requests
- **Container:** `gladcode2-web-server-1`
- **Health Check:** http://localhost:8080

**What it does:**
- Serves static files from `web/` directory
- Proxies API calls to Apache/PHP backend
- Handles SPA routing (all routes → index.html)
- Proxies WebSocket/Socket.IO connections

### apache (PHP)
- **Port:** 80
- **Purpose:** PHP backend with existing API endpoints
- **Container:** `gladcode2-apache-1`

**What it does:**
- Executes PHP API endpoints (back_*.php)
- Manages user sessions
- Handles database operations
- Serves old front-end for comparison

### mysql
- **Port:** 3306
- **Purpose:** Database
- **Container:** `gladcode2-mysql-1`

### runner
- **Port:** 3000 (internal)
- **Purpose:** Code execution service
- **Container:** `gladcode2-runner-1`

## Directory Structure

```
gladCode2/
├── web/                    # NEW: Modern front-end
│   ├── index.html
│   ├── config.js
│   ├── js/
│   ├── css/
│   └── assets/
├── web-server/             # NEW: Express server
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── public_html/            # EXISTING: PHP backend + old front-end
│   ├── back_*.php         # API endpoints
│   ├── index.php          # Old landing page
│   └── ...
├── compose.yaml           # UPDATED: Added web-server service
└── ...
```

## Environment Variables

### web-server
- `NODE_ENV`: `development` or `production`
- `API_BASE_URL`: URL to PHP backend (default: `http://apache:80`)
- `PORT`: Server port (default: `3000`)

### apache
- Uses existing environment variables from `.env`

## Testing

### Manual Testing Checklist

1. **Basic Connectivity:**
   ```bash
   # Check if web-server is responding
   curl http://localhost:8080
   
   # Check if API proxy works
   curl http://localhost:8080/back_login.php
   ```

2. **Browser Testing:**
   - Open http://localhost:8080
   - Check browser console for errors
   - Verify page loads and renders correctly
   - Test navigation between routes

3. **API Integration:**
   - Test login flow
   - Check if API calls are proxied correctly
   - Verify responses in Network tab

4. **WebSocket Testing:**
   - Check if Socket.IO connects
   - Monitor real-time updates
   - Verify chat and notifications work

### Debugging

**Web-server logs:**
```bash
docker compose logs -f web-server
```

**Apache logs:**
```bash
docker compose logs -f apache
```

**Check container status:**
```bash
docker compose ps
```

**Restart specific service:**
```bash
docker compose restart web-server
```

**Rebuild after changes:**
```bash
docker compose build web-server
docker compose up -d web-server
```

## Production Deployment

### 1. Build for Production

```bash
# Set production environment
export NODE_ENV=production

# Build web-server
docker compose -f compose.prod.yaml build web-server
```

### 2. Optimize Assets

Consider adding a build step:
- Minify JavaScript
- Minify CSS
- Optimize images
- Bundle modules (optional)

### 3. Configure Reverse Proxy

If using nginx in front:

```nginx
server {
    listen 80;
    server_name gladcode.dev;

    # Serve static files directly
    location /js/ {
        alias /path/to/web/js/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /css/ {
        alias /path/to/web/css/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Node.js server
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Environment Configuration

Create `compose.prod.yaml`:

```yaml
services:
  web-server:
    environment:
      - NODE_ENV=production
      - API_BASE_URL=http://apache:80
    command: npm start  # Use production command
```

### 5. SSL/TLS

Use Let's Encrypt for SSL certificates:

```bash
certbot --nginx -d gladcode.dev
```

## Monitoring

### Health Checks

The web-server includes a health check:

```bash
# Check health
docker inspect gladcode2-web-server-1 | grep -A 5 Health
```

### Logging

Logs are written to stdout/stderr and captured by Docker:

```bash
# View recent logs
docker compose logs --tail=100 web-server

# Follow logs
docker compose logs -f web-server

# Export logs
docker compose logs --no-color web-server > web-server.log
```

## Troubleshooting

### Issue: web-server won't start

**Solution:**
```bash
# Check logs
docker compose logs web-server

# Verify port 8080 is available
lsof -i :8080

# Rebuild container
docker compose build --no-cache web-server
docker compose up -d web-server
```

### Issue: API calls failing

**Solution:**
- Verify Apache is running: `docker compose ps apache`
- Check network connectivity: `docker compose exec web-server ping apache`
- Review proxy configuration in `web-server/server.js`
- Check Apache logs: `docker compose logs apache`

### Issue: Static files not loading

**Solution:**
- Verify volume mounts in `compose.yaml`
- Check file permissions
- Clear browser cache
- Restart web-server

### Issue: WebSocket not connecting

**Solution:**
- Verify Node.js server (port 3000) is running in runner container
- Check Socket.IO proxy configuration
- Review browser console for connection errors
- Verify firewall settings

## Migration Strategy

### Gradual Rollout

1. **Phase 1: Parallel Running**
   - Keep both old (port 80) and new (port 8080) running
   - Test thoroughly on port 8080
   - Fix any issues found

2. **Phase 2: Feature Flag**
   - Add feature flag to redirect subset of users to new front-end
   - Monitor for issues
   - Gradually increase percentage

3. **Phase 3: Full Migration**
   - Switch all traffic to new front-end
   - Keep old front-end as backup
   - Monitor for 1-2 weeks

4. **Phase 4: Cleanup**
   - Remove old front-end files
   - Update documentation
   - Archive old code

### Rollback Plan

If issues arise:

```bash
# Quick rollback: redirect to old front-end
# Update nginx/reverse proxy to point to port 80

# Or stop new web-server
docker compose stop web-server
```

## Performance Optimization

### Caching

Add cache headers in production:

```javascript
// web-server/server.js
app.use(express.static(path.join(__dirname, '../web'), {
    maxAge: '1y',  // Production
    etag: true,
    lastModified: true,
}));
```

### Compression

Add compression middleware:

```bash
cd web-server
npm install compression
```

```javascript
// web-server/server.js
import compression from 'compression';
app.use(compression());
```

### CDN

Consider using CDN for static assets in production:
- Upload js/, css/, assets/ to CDN
- Update paths in index.html
- Maintain local copies as fallback

## Backup and Recovery

### Backup

```bash
# Backup web directory
tar -czf web-backup-$(date +%Y%m%d).tar.gz web/

# Backup database
docker compose exec mysql mysqldump -u root -p gladcode > backup.sql
```

### Recovery

```bash
# Restore web directory
tar -xzf web-backup-YYYYMMDD.tar.gz

# Restart services
docker compose restart web-server
```

## Support

For issues or questions:
1. Check logs: `docker compose logs -f web-server`
2. Review documentation in `web/README.md`
3. Check technical spec in `TECHNICAL_SPEC.md`
4. Contact development team

## Next Steps

After deployment:
1. Monitor application performance
2. Collect user feedback
3. Plan next features/improvements
4. Update documentation as needed
