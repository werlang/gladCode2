/**
 * WebSocketService - Real-time communication via Socket.IO
 * Manages WebSocket connection for live updates
 * 
 * @example
 * const ws = new WebSocketService('http://localhost', eventBus);
 * await ws.connect();
 * ws.on('profile notification', (data) => console.log(data));
 */

export default class WebSocketService {
    constructor(url, eventBus) {
        this.url = url;
        this.eventBus = eventBus;
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000;
        this.reconnectTimer = null;
    }

    /**
     * Connect to WebSocket server
     */
    async connect() {
        if (this.connected) {
            console.warn('Already connected to WebSocket');
            return;
        }

        try {
            // Load Socket.IO client library
            await this._loadSocketIO();
            
            // Create socket connection
            this.socket = io(this.url, {
                transports: ['websocket', 'polling'],
                autoConnect: true,
            });

            this._setupEventHandlers();
            
            return new Promise((resolve, reject) => {
                this.socket.once('connect', () => {
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    this.eventBus.emit('websocket:connect');
                    console.log('WebSocket connected');
                    resolve();
                });

                this.socket.once('connect_error', (error) => {
                    console.error('WebSocket connection error:', error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            throw error;
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
            this.eventBus.emit('websocket:disconnect');
            console.log('WebSocket disconnected');
        }
    }

    /**
     * Load Socket.IO client library
     * @private
     */
    async _loadSocketIO() {
        // Check if Socket.IO is already loaded
        if (typeof io !== 'undefined') {
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/socket.io/socket.io.js';
            script.async = true;
            
            script.onload = () => {
                if (typeof io !== 'undefined') {
                    resolve();
                } else {
                    reject(new Error('Socket.IO failed to load'));
                }
            };
            
            script.onerror = () => reject(new Error('Failed to load Socket.IO script'));
            document.head.appendChild(script);
        });
    }

    /**
     * Set up Socket.IO event handlers
     * @private
     */
    _setupEventHandlers() {
        // Connection events
        this.socket.on('connect', () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            this.eventBus.emit('websocket:connect');
            console.log('WebSocket connected');
        });

        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            this.eventBus.emit('websocket:disconnect', reason);
            console.log('WebSocket disconnected:', reason);
            
            // Auto-reconnect
            if (reason === 'io server disconnect') {
                // Server disconnected, try to reconnect
                this._scheduleReconnect();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            this.eventBus.emit('websocket:error', error);
            this._scheduleReconnect();
        });

        // Application events - forward to EventBus
        this.socket.onAny((event, ...args) => {
            // Forward all Socket.IO events to EventBus
            this.eventBus.emit(`websocket:${event}`, ...args);
        });
    }

    /**
     * Schedule reconnection attempt
     * @private
     */
    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.eventBus.emit('websocket:reconnect-failed');
            return;
        }

        if (this.reconnectTimer) {
            return; // Reconnection already scheduled
        }

        this.reconnectAttempts++;
        this.reconnectTimer = setTimeout(() => {
            console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.reconnectTimer = null;
            this.socket.connect();
        }, this.reconnectInterval);
    }

    /**
     * Subscribe to WebSocket event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    on(event, callback) {
        if (!this.socket) {
            console.warn('WebSocket not connected');
            return;
        }

        this.socket.on(event, callback);
    }

    /**
     * Subscribe to WebSocket event once
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    once(event, callback) {
        if (!this.socket) {
            console.warn('WebSocket not connected');
            return;
        }

        this.socket.once(event, callback);
    }

    /**
     * Unsubscribe from WebSocket event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    off(event, callback) {
        if (!this.socket) {
            return;
        }

        this.socket.off(event, callback);
    }

    /**
     * Emit WebSocket event
     * @param {string} event - Event name
     * @param {...any} args - Event data
     */
    emit(event, ...args) {
        if (!this.connected) {
            console.warn('Cannot emit event, WebSocket not connected');
            return;
        }

        this.socket.emit(event, ...args);
    }

    /**
     * Join a room
     * @param {string} room - Room name
     */
    joinRoom(room) {
        if (this.connected) {
            this.emit('join', room);
        }
    }

    /**
     * Leave a room
     * @param {string} room - Room name
     */
    leaveRoom(room) {
        if (this.connected) {
            this.emit('leave', room);
        }
    }

    /**
     * Check if connected
     * @returns {boolean}
     */
    isConnected() {
        return this.connected;
    }
}
