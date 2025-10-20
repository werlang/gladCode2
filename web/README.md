# gladCode2 Modern Front-End

This directory contains the modern, rebuilt front-end for gladCode2 using vanilla JavaScript (ES2025) and modern CSS.

## Quick Start

### Development

```bash
# Start all services including the new web-server
docker compose up -d

# Access the new front-end
open http://localhost:8080

# Access the old front-end (for comparison)
open http://localhost:80
```

### Building

The front-end currently doesn't require a build step. All JavaScript is loaded as ES modules directly in the browser.

For production, you may want to add a build step for:
- Minification
- Bundling
- Asset optimization

## Architecture

### Directory Structure

```
web/
├── index.html          # Main entry point
├── config.js           # Runtime configuration
├── js/
│   ├── app.js         # Application bootstrap
│   ├── core/          # Core framework classes
│   │   ├── Component.js
│   │   ├── Page.js
│   │   ├── Router.js
│   │   ├── Store.js
│   │   └── EventBus.js
│   ├── services/      # Business logic services
│   │   ├── APIService.js
│   │   ├── AuthService.js
│   │   └── WebSocketService.js
│   ├── utils/         # Utility functions
│   │   ├── dom.js
│   │   ├── storage.js
│   │   └── validators.js
│   ├── components/    # Reusable UI components
│   └── pages/         # Page components
├── css/
│   ├── vars.css       # Design tokens
│   ├── reset.css      # Browser reset
│   ├── main.css       # Global styles
│   ├── components/    # Component styles
│   └── pages/         # Page-specific styles
└── assets/            # Static assets
    ├── images/
    └── icons/
```

### Core Concepts

#### Component System

All UI elements extend the `Component` base class:

```javascript
import Component from './core/Component.js';

class MyComponent extends Component {
  constructor(options) {
    super(options);
    this.state = { count: 0 };
  }
  
  render() {
    return `
      <div class="my-component">
        <p>Count: ${this.state.count}</p>
        <button data-action="increment">+</button>
      </div>
    `;
  }
  
  addEventListeners() {
    this.on('click', '[data-action="increment"]', () => {
      this.setState({ count: this.state.count + 1 });
    });
  }
}
```

#### Routing

The Router handles client-side navigation:

```javascript
import Router from './core/Router.js';
import HomePage from './pages/HomePage.js';

const router = new Router({ mode: 'hash' });
router.addRoute('/', HomePage);
router.start();
```

#### State Management

The Store provides centralized state management:

```javascript
import Store from './core/Store.js';

const store = new Store({ user: null });
store.subscribe('user', (user) => {
  console.log('User changed:', user);
});
store.setState('user', { id: 1, name: 'John' });
```

#### API Communication

APIService handles all backend communication:

```javascript
import APIService from './services/APIService.js';

const api = new APIService('/');
const gladiator = await api.get('back_glad.php', { id: 123 });
```

### Styling

The CSS architecture uses modern features:

- **Custom Properties**: For theming and design tokens
- **CSS Nesting**: For component-scoped styles
- **Modern Selectors**: :has(), :is(), :where()
- **Container Queries**: For responsive components

Example:

```css
.button {
  background: var(--color-primary);
  padding: var(--space-sm) var(--space-md);
  
  &:hover {
    background: color-mix(in srgb, var(--color-primary) 90%, black);
  }
  
  &.button--large {
    font-size: var(--font-size-lg);
  }
}
```

## API Integration

The new front-end communicates with the existing PHP backend via the Express proxy:

```
Browser → Express (web-server:3000) → PHP (apache:80) → MySQL
```

All existing PHP endpoints remain unchanged:
- `back_login.php`
- `back_glad.php`
- `back_match.php`
- `back_simulation.php`
- etc.

## WebSocket Integration

Real-time features use Socket.IO through the Node.js server:

```javascript
import WebSocketService from './services/WebSocketService.js';

const ws = new WebSocketService('http://localhost:8080', eventBus);
await ws.connect();
ws.on('profile notification', (data) => {
  console.log('Notification:', data);
});
```

## Development Guidelines

### Code Style

- Use ES2025 features (classes, async/await, optional chaining, etc.)
- Use meaningful variable names
- Add JSDoc comments for all public methods
- Follow existing patterns in core/ directory

### File Organization

- One class per file
- Export default for main class
- Named exports for utilities
- Group related files in subdirectories

### Component Development

1. Create component class in `components/` or `pages/`
2. Create corresponding CSS in `css/components/` or `css/pages/`
3. Import CSS in main.css or index.html
4. Use semantic HTML
5. Make components reusable and composable

### Testing

Currently, testing is manual. To test:

1. Start the development server
2. Open http://localhost:8080
3. Check browser console for errors
4. Test user interactions
5. Verify API calls in Network tab

## Migration Status

### ✅ Completed
- Core framework (Component, Page, Router, Store, EventBus)
- Utility modules (DOM, storage, validators)
- Services (API, Auth, WebSocket)
- CSS architecture (vars, reset, main)
- Express server with API proxy
- Docker configuration

### 🚧 In Progress
- UI components (Header, Dialog, etc.)
- Page components (Home, Editor, Profile, etc.)
- Asset migration
- Feature parity with old front-end

### 📋 To Do
- Complete all pages
- Add build process for production
- Performance optimization
- Browser compatibility testing
- Documentation completion
- Migration guide for deployment

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When adding new features:

1. Follow the existing architecture
2. Use the core classes as building blocks
3. Add proper error handling
4. Test across supported browsers
5. Update this README if needed

## Troubleshooting

### WebSocket not connecting
- Check if Node.js server is running in docker
- Verify Socket.IO is properly proxied

### API calls failing
- Check Express proxy configuration
- Verify PHP backend is running
- Check browser console for CORS errors

### Styles not loading
- Verify CSS files are in web/css/
- Check if files are properly linked in index.html
- Clear browser cache

## Resources

- [MDN Web Docs](https://developer.mozilla.org/)
- [ES2025 Specification](https://tc39.es/)
- [Express Documentation](https://expressjs.com/)
- [Socket.IO Documentation](https://socket.io/)
