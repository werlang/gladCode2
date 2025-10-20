# gladCode2 Front-End Rebuild - Technical Specification

## Overview

This document outlines the technical specifications for rebuilding the gladCode2 front-end using modern vanilla JavaScript (ES2025) and CSS, served from a Node.js Express server within a Docker container.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│                                                          │
│  ┌─────────────┐      ┌──────────────┐   ┌──────────┐ │
│  │  web-server │─────▶│   apache     │──▶│  mysql   │ │
│  │  (Node.js)  │ API  │   (PHP)      │   │          │ │
│  │  Port 8080  │Proxy │   Port 80    │   │          │ │
│  └─────────────┘      └──────────────┘   └──────────┘ │
│         │                     │                         │
│         │                     │                         │
│         ▼                     ▼                         │
│  ┌─────────────┐      ┌──────────────┐                │
│  │    web/     │      │ public_html/ │                │
│  │  (Static)   │      │  (PHP APIs)  │                │
│  └─────────────┘      └──────────────┘                │
└─────────────────────────────────────────────────────────┘
```

### Directory Structure

```
gladCode2/
├── web/                          # New front-end root
│   ├── index.html               # Main entry point
│   ├── config.js                # Client configuration
│   ├── js/
│   │   ├── app.js              # Application bootstrap
│   │   ├── core/               # Core framework classes
│   │   │   ├── Component.js    # Base component class
│   │   │   ├── Page.js         # Base page class
│   │   │   ├── Router.js       # Client-side router
│   │   │   ├── Store.js        # State management
│   │   │   └── EventBus.js     # Event system
│   │   ├── services/           # Business logic services
│   │   │   ├── APIService.js   # HTTP client
│   │   │   ├── AuthService.js  # Authentication
│   │   │   └── WebSocketService.js # Real-time updates
│   │   ├── utils/              # Utility functions
│   │   │   ├── dom.js          # DOM helpers
│   │   │   ├── storage.js      # LocalStorage wrapper
│   │   │   └── validators.js   # Input validation
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Header.js
│   │   │   ├── Dialog.js
│   │   │   └── GladiatorCard.js
│   │   └── pages/              # Page components
│   │       ├── HomePage.js
│   │       ├── EditorPage.js
│   │       ├── ProfilePage.js
│   │       └── TournamentPage.js
│   ├── css/
│   │   ├── vars.css            # Design tokens
│   │   ├── reset.css           # Browser reset
│   │   ├── main.css            # Global styles
│   │   ├── components/         # Component styles
│   │   │   ├── header.css
│   │   │   ├── dialog.css
│   │   │   ├── button.css
│   │   │   └── card.css
│   │   └── pages/              # Page-specific styles
│   │       ├── home.css
│   │       ├── editor.css
│   │       └── profile.css
│   └── assets/                 # Static assets
│       ├── images/
│       └── icons/
├── web-server/                  # Node.js server
│   ├── server.js               # Express server
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── public_html/                 # Existing PHP backend (unchanged)
└── compose.yaml                 # Updated with web-server service
```

## Core Classes

### Component (Base Class)

```javascript
// web/js/core/Component.js
export default class Component {
  constructor(options = {}) {
    this.element = null;
    this.state = options.state || {};
    this.props = options.props || {};
  }

  // Lifecycle methods
  async beforeMount() {}
  async mount(container) {}
  async afterMount() {}
  async beforeUnmount() {}
  async unmount() {}
  
  // State management
  setState(newState) {}
  
  // Rendering
  render() {}
  update() {}
}
```

### Page (Extends Component)

```javascript
// web/js/core/Page.js
export default class Page extends Component {
  constructor(options = {}) {
    super(options);
    this.title = options.title || 'gladCode';
    this.layout = options.layout || 'default';
  }

  async beforeNavigate() {}
  async afterNavigate() {}
  
  setTitle(title) {
    document.title = title;
  }
}
```

### Router

```javascript
// web/js/core/Router.js
export default class Router {
  constructor(options = {}) {
    this.routes = new Map();
    this.currentPage = null;
    this.mode = options.mode || 'hash'; // 'hash' or 'history'
  }

  addRoute(path, PageClass) {}
  navigate(path, data) {}
  back() {}
  getCurrentPath() {}
}
```

### Store

```javascript
// web/js/core/Store.js
export default class Store {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = new Map();
  }

  getState(key) {}
  setState(key, value) {}
  subscribe(key, callback) {}
  unsubscribe(key, callback) {}
}
```

### EventBus

```javascript
// web/js/core/EventBus.js
export default class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, callback) {}
  off(event, callback) {}
  emit(event, data) {}
  once(event, callback) {}
}
```

## Services

### APIService

```javascript
// web/js/services/APIService.js
export default class APIService {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  async request(endpoint, options = {}) {
    // Handles GET, POST, PUT, DELETE
    // Error handling and retry logic
    // Response parsing
  }

  async get(endpoint, params) {}
  async post(endpoint, data) {}
  async put(endpoint, data) {}
  async delete(endpoint) {}
}
```

### AuthService

```javascript
// web/js/services/AuthService.js
export default class AuthService {
  constructor(apiService) {
    this.api = apiService;
    this.user = null;
    this.googleClient = null;
  }

  async initGoogleAuth() {
    // Initialize Google OAuth
  }

  async login(credential) {
    // Send credential to PHP backend
    // Store session
  }

  async logout() {}
  
  isAuthenticated() {}
  
  getUser() {}
}
```

### WebSocketService

```javascript
// web/js/services/WebSocketService.js
export default class WebSocketService {
  constructor(url, eventBus) {
    this.url = url;
    this.socket = null;
    this.eventBus = eventBus;
  }

  connect() {
    // Initialize Socket.IO connection
  }

  disconnect() {}
  
  on(event, callback) {}
  
  emit(event, data) {}
}
```

## CSS Architecture

### Design Tokens (vars.css)

```css
/* web/css/vars.css */
:root {
  /* Colors */
  --color-primary: #4a90e2;
  --color-secondary: #7b68ee;
  --color-success: #52c41a;
  --color-warning: #faad14;
  --color-danger: #f5222d;
  --color-text: #1a1a1a;
  --color-text-secondary: #666;
  --color-background: #ffffff;
  --color-surface: #f5f5f5;
  
  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  
  /* Typography */
  --font-family-base: 'Roboto', sans-serif;
  --font-family-mono: 'Source Code Pro', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  
  /* Layout */
  --border-radius: 4px;
  --border-radius-lg: 8px;
  --transition-fast: 150ms;
  --transition-base: 300ms;
  --transition-slow: 500ms;
}
```

### Modern CSS Features

- **Custom Properties**: For theming and dynamic values
- **color-mix()**: For color variations
- **Nesting**: For component-scoped styles
- **Container Queries**: For responsive components
- **:has()**: For parent-based styling
- **@layer**: For cascade management

Example:

```css
/* web/css/components/button.css */
@layer components {
  .button {
    background: var(--color-primary);
    color: white;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--border-radius);
    transition: background var(--transition-fast);
    
    &:hover {
      background: color-mix(in srgb, var(--color-primary) 90%, black);
    }
    
    &.button--secondary {
      background: var(--color-secondary);
    }
    
    &.button--large {
      padding: var(--space-md) var(--space-lg);
      font-size: var(--font-size-lg);
    }
  }
}
```

## Express Server Configuration

```javascript
// web-server/server.js
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.API_BASE_URL || 'http://apache:80';

// Serve static files from web/
app.use(express.static(path.join(__dirname, '../web')));

// Proxy API requests to PHP backend
app.use('/back_*.php', createProxyMiddleware({
  target: API_BASE_URL,
  changeOrigin: true,
}));

// Proxy other PHP endpoints
app.use('/*.php', createProxyMiddleware({
  target: API_BASE_URL,
  changeOrigin: true,
}));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
  console.log(`Proxying API requests to ${API_BASE_URL}`);
});
```

## Docker Configuration

### web-server Dockerfile

```dockerfile
# web-server/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Updated compose.yaml

```yaml
services:
  web-server:
    build:
      context: ./web-server
      dockerfile: Dockerfile
    restart: unless-stopped
    volumes:
      - ./web:/app/web:ro
      - ./web-server:/app/server
    ports:
      - "8080:3000"
    environment:
      - NODE_ENV=development
      - API_BASE_URL=http://apache:80
    depends_on:
      - apache
    command: npm run dev

  apache:
    # ... existing configuration ...
  
  runner:
    # ... existing configuration ...
  
  mysql:
    # ... existing configuration ...
```

## API Integration

### Existing PHP Endpoints

All existing PHP endpoints remain unchanged:
- `back_login.php` - Login
- `back_glad.php` - Gladiator CRUD
- `back_match.php` - Battle initiation
- `back_simulation.php` - Simulation execution
- `back_tournament.php` - Tournament management
- etc.

### API Service Usage

```javascript
// In any component or page
import APIService from '../services/APIService.js';

const api = new APIService('/');

// Login
const loginResult = await api.post('back_login.php', {
  credential: googleCredential
});

// Get gladiator
const gladiator = await api.get('back_glad.php', {
  action: 'get',
  id: gladId
});

// Start match
const matchResult = await api.post('back_match.php', {
  glad1: glad1Id,
  glad2: glad2Id
});
```

## Migration Strategy

### Phase 1: Infrastructure (Week 1)
1. Create web/ directory structure
2. Set up web-server with Express
3. Configure Docker and compose.yaml
4. Create skeleton HTML and app.js
5. Verify server starts and serves static files

### Phase 2: Core Framework (Week 2)
1. Implement Component base class
2. Implement Page base class
3. Implement Router
4. Implement Store and EventBus
5. Add comprehensive JSDoc comments
6. Create unit tests for core classes

### Phase 3: Services (Week 3)
1. Implement APIService
2. Implement AuthService with Google OAuth
3. Implement WebSocketService
4. Create utility modules
5. Test API integration with PHP backend

### Phase 4: CSS Foundation (Week 4)
1. Create design tokens in vars.css
2. Implement reset and base styles
3. Create component styles library
4. Test across browsers

### Phase 5: Components (Week 5)
1. Implement Header component
2. Implement Dialog component
3. Implement form components
4. Implement GladiatorCard component
5. Create component documentation

### Phase 6: Pages - Part 1 (Week 6)
1. Implement HomePage
2. Implement EditorPage
3. Test navigation and routing
4. Verify Google OAuth integration

### Phase 7: Pages - Part 2 (Week 7)
1. Implement ProfilePage
2. Implement TournamentPage
3. Implement TrainingPage
4. Implement PlaybackPage

### Phase 8: Testing & Polish (Week 8)
1. End-to-end testing
2. Performance optimization
3. Browser compatibility testing
4. Documentation completion
5. Migration guide for deployment

## Testing Strategy

### Manual Testing Checklist
- [ ] Server starts without errors
- [ ] Static files served correctly
- [ ] API proxy works for all endpoints
- [ ] Google OAuth login flow
- [ ] WebSocket connection established
- [ ] All pages accessible and functional
- [ ] Browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness
- [ ] Performance benchmarks

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

1. **Code Splitting**: Load page JavaScript only when needed
2. **CSS Bundling**: Combine CSS files for production
3. **Asset Optimization**: Compress images and icons
4. **Lazy Loading**: Defer non-critical resources
5. **Caching**: Leverage browser caching for static assets
6. **Minification**: Minify JS/CSS for production

## Security Considerations

1. **CORS**: Configure proper CORS headers on PHP backend
2. **XSS Prevention**: Sanitize all user inputs
3. **CSRF Protection**: Maintain existing CSRF tokens
4. **Content Security Policy**: Add CSP headers
5. **Secure Cookies**: Use secure, httpOnly cookies for sessions

## Deployment

### Development
```bash
docker compose up -d
# Access at http://localhost:8080
```

### Production
```bash
# Build for production
cd web-server
npm run build

# Update compose.yaml with production settings
docker compose -f compose.prod.yaml up -d
```

## Documentation Deliverables

1. **API Documentation**: JSDoc for all classes and methods
2. **Component Guide**: Usage examples for each component
3. **Migration Guide**: Step-by-step for existing developers
4. **Deployment Guide**: Production deployment instructions
5. **Troubleshooting**: Common issues and solutions

## Success Metrics

- [ ] All existing functionality preserved
- [ ] Page load time < 2s
- [ ] Time to interactive < 3s
- [ ] Zero breaking changes to API
- [ ] 100% feature parity with current version
- [ ] Improved code maintainability (subjective measure via team feedback)

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| API compatibility issues | High | Low | Thorough testing of all endpoints |
| Browser compatibility | Medium | Medium | Progressive enhancement, polyfills |
| Performance regression | High | Low | Performance monitoring, benchmarking |
| WebSocket connection issues | Medium | Medium | Fallback to polling, connection retry logic |
| Google OAuth changes | High | Low | Abstract auth layer, monitor Google updates |

## Open Questions

1. Should we implement offline support with Service Workers?
2. Do we need a build process for production optimization?
3. Should we add TypeScript for type safety?
4. Do we need a testing framework (Jest, Vitest)?
5. Should we implement progressive web app features?

## References

- ES2025 Specification
- MDN Web Docs for modern CSS features
- Express.js Documentation
- Socket.IO Documentation
- Google OAuth Documentation
