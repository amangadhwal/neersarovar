import { StateManager } from '../stateManager.js';
import { INTERACTION_CONFIG } from '../config/constants.js';

/**
 * EventHandler - Central system for unified interaction management
 * Handles mouse, touch, scroll, and other UI events
 */
export class EventHandler {
    constructor(map) {
        this.map = map;
        this.active = true;
        
        // Mouse state tracking
        this.mouse = {
            down: false,
            x: 0,
            y: 0,
            lastX: 0,
            lastY: 0,
            lastUpdate: 0
        };
        
        // Touch state tracking
        this.touches = new Map();
        this.gestureInProgress = false;
        
        // Momentum state
        this.momentum = {
            x: 0,
            y: 0,
            factor: 0.95, // Decay factor
            min: 0.05     // Minimum threshold
        };
        
        // Event listeners
        this.listeners = {
            move: new Set(),
            zoom: new Set(),
            click: new Set(),
            drag: new Set(),
            resize: new Set(),
            scroll: new Set()
        };
        
        // Initialize event handlers
        this.setupMouseEvents();
        this.setupTouchEvents();
        this.setupDebouncedHandlers();
        
        console.log('[EventHandler] Initialized');
    }
    
    // Set up mouse event handlers
    setupMouseEvents() {
        const container = this.map.getContainer();
        container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        container.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        container.addEventListener('mouseup', () => this.handleMouseUp());
        container.addEventListener('mouseleave', () => this.handleMouseUp());
        container.addEventListener('wheel', (e) => this.handleScroll(e));
        container.addEventListener('click', (e) => this.handleClick(e));
    }
    
    // Set up touch event handlers
    setupTouchEvents() {
        const container = this.map.getContainer();
        
        // Touch event handlers
        container.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        container.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        container.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        container.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
    }
    
    // Set up debounced event handlers
    setupDebouncedHandlers() {
        // Track resize events with debouncing
        this.debounceDelay = 250; // ms to wait before handling resize
        
        // Debounced resize handler
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, this.debounceDelay));
        
        // Debounced scroll handler for features container
        const featuresContainer = document.getElementById('features');
        if (featuresContainer) {
            featuresContainer.addEventListener('scroll', this.debounce((e) => {
                // Update scroll momentum and animation controller
                if (StateManager.scrollAnimationController) {
                    StateManager.scrollAnimationController.update();
                }
                
                // Notify scroll listeners
                this.notifyListeners('scroll', {
                    scrollY: window.scrollY,
                    scrollX: window.scrollX,
                    target: e.target
                });
            }, 16)); // ~60fps rate limiting
        }
    }
    
    // Mouse event handlers
    handleMouseDown(e) {
        if (!this.active) return;
        
        this.mouseActive = true;
        this.mouse.down = true;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.lastX = e.clientX;
        this.mouse.lastY = e.clientY;
        this.mouse.lastUpdate = performance.now();
        
        // Reset momentum
        this.momentum.x = 0;
        this.momentum.y = 0;
        
        // Notify drag start listeners
        this.notifyListeners('drag', {
            type: 'start',
            x: e.clientX,
            y: e.clientY,
            originalEvent: e
        });
    }
    
    handleMouseMove(e) {
        if (!this.active) return;
        
        const now = performance.now();
        const elapsed = now - this.mouse.lastUpdate;
        
        // Update mouse position
        this.mouse.lastX = this.mouse.x;
        this.mouse.lastY = this.mouse.y;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.lastUpdate = now;
        
        // Calculate movement delta
        const dx = this.mouse.x - this.mouse.lastX;
        const dy = this.mouse.y - this.mouse.lastY;
        
        // If mouse is down, handle dragging
        if (this.mouse.down) {
            // Update momentum
            if (elapsed > 0) {
                this.momentum.x = dx / elapsed * 16; // Scale to typical frame time
                this.momentum.y = dy / elapsed * 16;
            }
            
            // Notify drag listeners
            this.notifyListeners('drag', {
                type: 'move',
                x: e.clientX,
                y: e.clientY,
                dx: dx,
                dy: dy,
                originalEvent: e
            });
        }
        
        // Notify move listeners regardless of mouse down state
        this.notifyListeners('move', {
            x: e.clientX,
            y: e.clientY,
            dx: dx,
            dy: dy,
            originalEvent: e
        });
    }
    
    handleMouseUp() {
        if (!this.active || !this.mouse.down) return;
        
        this.mouse.down = false;
        
        // Apply momentum if above threshold
        if (Math.abs(this.momentum.x) > INTERACTION_CONFIG.minVelocity || 
            Math.abs(this.momentum.y) > INTERACTION_CONFIG.minVelocity) {
            this.applyMomentum();
        }
        
        // Notify drag end listeners
        this.notifyListeners('drag', {
            type: 'end',
            x: this.mouse.x,
            y: this.mouse.y,
            momentum: { ...this.momentum }
        });
    }
    
    handleClick(e) {
        if (!this.active) return;
        
        // Simple click detection - only trigger if there wasn't much movement
        const moveThreshold = 5; // pixels
        const moveDistance = Math.sqrt(
            Math.pow(this.mouse.x - this.mouse.lastX, 2) + 
            Math.pow(this.mouse.y - this.mouse.lastY, 2)
        );
        
        if (moveDistance <= moveThreshold) {
            this.notifyListeners('click', {
                x: e.clientX,
                y: e.clientY,
                originalEvent: e
            });
        }
    }
    
    // Touch event handlers
    handleTouchStart(e) {
        if (!this.active) return;
        
        // Prevent default to avoid browser handling
        e.preventDefault();
        
        // Store each touch point
        for (const touch of e.touches) {
            this.touches.set(touch.identifier, {
                id: touch.identifier,
                x: touch.clientX,
                y: touch.clientY,
                startX: touch.clientX,
                startY: touch.clientY,
                timestamp: performance.now()
            });
        }
        
        // Reset momentum when touch starts
        this.momentum.x = 0;
        this.momentum.y = 0;
        
        // Determine if this is multi-touch
        this.gestureInProgress = e.touches.length > 1;
        
        // If this is a single touch, treat as drag start
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.notifyListeners('drag', {
                type: 'start',
                x: touch.clientX,
                y: touch.clientY,
                isTouchEvent: true,
                originalEvent: e
            });
        }
    }
    
    handleTouchMove(e) {
        if (!this.active) return;
        
        // Prevent default to avoid browser handling
        e.preventDefault();
        
        // Handle multi-touch gestures
        if (e.touches.length > 1 && this.touches.size > 1) {
            this.handleMultiTouchGesture(e);
            return;
        }
        
        // Handle single touch as drag
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const prevTouch = this.touches.get(touch.identifier);
            
            if (prevTouch) {
                const now = performance.now();
                const elapsed = now - prevTouch.timestamp;
                
                // Calculate deltas
                const dx = touch.clientX - prevTouch.x;
                const dy = touch.clientY - prevTouch.y;
                
                // Update stored touch
                this.touches.set(touch.identifier, {
                    ...prevTouch,
                    x: touch.clientX,
                    y: touch.clientY,
                    timestamp: now
                });
                
                // Update momentum
                if (elapsed > 0) {
                    this.momentum.x = dx / elapsed * 16; // Scale to typical frame time
                    this.momentum.y = dy / elapsed * 16;
                }
                
                // Notify drag listeners
                this.notifyListeners('drag', {
                    type: 'move',
                    x: touch.clientX,
                    y: touch.clientY,
                    dx: dx,
                    dy: dy,
                    isTouchEvent: true,
                    originalEvent: e
                });
                
                // Notify move listeners
                this.notifyListeners('move', {
                    x: touch.clientX,
                    y: touch.clientY,
                    dx: dx,
                    dy: dy,
                    isTouchEvent: true,
                    originalEvent: e
                });
            }
        }
    }
    
    handleMultiTouchGesture(e) {
        if (e.touches.length < 2) return;
        
        // Get the two primary touch points
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        
        // Get previous touch positions
        const p1 = this.touches.get(t1.identifier);
        const p2 = this.touches.get(t2.identifier);
        
        if (!p1 || !p2) return;
        
        // Calculate current and previous distance between touch points
        const currentDist = Math.sqrt(
            Math.pow(t1.clientX - t2.clientX, 2) + 
            Math.pow(t1.clientY - t2.clientY, 2)
        );
        
        const prevDist = Math.sqrt(
            Math.pow(p1.x - p2.x, 2) + 
            Math.pow(p1.y - p2.y, 2)
        );
        
        // Calculate midpoints
        const currentMidX = (t1.clientX + t2.clientX) / 2;
        const currentMidY = (t1.clientY + t2.clientY) / 2;
        const prevMidX = (p1.x + p2.x) / 2;
        const prevMidY = (p1.y + p2.y) / 2;
        
        // Calculate rotation (angle between previous and current vector)
        const prevAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const currentAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
        const rotation = currentAngle - prevAngle;
        
        // Calculate scale factor
        const scale = currentDist / (prevDist || 1);
        
        // Calculate translation
        const translateX = currentMidX - prevMidX;
        const translateY = currentMidY - prevMidY;
        
        // Notify zoom listeners
        this.notifyListeners('zoom', {
            scale: scale,
            rotation: rotation,
            translate: { x: translateX, y: translateY },
            center: { x: currentMidX, y: currentMidY },
            isTouchEvent: true,
            originalEvent: e
        });
        
        // Update stored touch positions
        this.touches.set(t1.identifier, {
            ...p1, 
            x: t1.clientX, 
            y: t1.clientY, 
            timestamp: performance.now()
        });
        
        this.touches.set(t2.identifier, {
            ...p2, 
            x: t2.clientX, 
            y: t2.clientY, 
            timestamp: performance.now()
        });
    }
    
    handleTouchEnd(e) {
        if (!this.active) return;
        
        // Prevent default
        e.preventDefault();
        
        // Remove ended touches
        for (const touch of e.changedTouches) {
            const lastTouch = this.touches.get(touch.identifier);
            
            if (lastTouch) {
                // Calculate final momentum
                const now = performance.now();
                const elapsed = now - lastTouch.timestamp;
                
                if (elapsed > 0 && elapsed < 100) {
                    // Calculate velocity (stronger for quick releases)
                    const velocityX = (touch.clientX - lastTouch.x) / elapsed;
                    const velocityY = (touch.clientY - lastTouch.y) / elapsed;
                    
                    this.momentum.x = velocityX * INTERACTION_CONFIG.touchMultiplier * 60;
                    this.momentum.y = velocityY * INTERACTION_CONFIG.touchMultiplier * 60;
                }
                
                // Remove the touch
                this.touches.delete(touch.identifier);
            }
        }
        
        // Reset gesture flag when all touches end
        if (this.touches.size === 0) {
            this.gestureInProgress = false;
            
            // Apply momentum if it's significant
            if (Math.abs(this.momentum.x) > 0.5 || Math.abs(this.momentum.y) > 0.5) {
                this.applyTouchMomentum();
            }
            
            // Notify drag end listeners for single touch
            if (e.changedTouches.length === 1) {
                const touch = e.changedTouches[0];
                this.notifyListeners('drag', {
                    type: 'end',
                    x: touch.clientX,
                    y: touch.clientY,
                    momentum: { ...this.momentum },
                    isTouchEvent: true,
                    originalEvent: e
                });
            }
        }
    }
    
    // Scroll handling
    handleScroll(e) {
        if (!this.active) return;
        
        // Apply sensitivity factor
        const scrollAmount = e.deltaY * INTERACTION_CONFIG.scrollSensitivity;
        
        // Determine direction for visualization
        const scrollDirection = scrollAmount > 0 ? 'down' : 'up';
        
        // Convert to momentum
        this.momentum.y = scrollAmount * 0.05;
        
        // Notify scroll listeners
        this.notifyListeners('scroll', {
            deltaY: e.deltaY,
            deltaX: e.deltaX,
            direction: scrollDirection,
            amount: Math.abs(scrollAmount),
            originalEvent: e
        });
        
        // Prevent default only for custom handling
        if (this.shouldPreventDefaultScroll()) {
            e.preventDefault();
        }
    }
    
    shouldPreventDefaultScroll() {
        // Check if we're over an interactive element that should handle its own scrolling
        const activeElement = document.activeElement;
        const scrollableElements = ['INPUT', 'TEXTAREA', 'SELECT'];
        
        // Return false for scrollable elements, true otherwise
        return !scrollableElements.includes(activeElement.tagName);
    }
    
    // Window resize handling
    handleResize() {
        // Handle resize events, update necessary calculations
        console.log('[EventHandler] Window resized');
        
        // Trigger viewport update if grid optimizer exists
        if (StateManager.spatialGrid) {
            StateManager.spatialGrid.updateActiveCells();
        }
        
        // Resize particle system canvases
        StateManager.particleSystems.forEach(system => {
            if (system.renderer) {
                system.renderer.resize();
            }
        });
        
        // Notify resize listeners
        this.notifyListeners('resize', {
            width: window.innerWidth,
            height: window.innerHeight,
            aspectRatio: window.innerWidth / window.innerHeight
        });
    }
    
    // Momentum handling
    applyMomentum() {
        if (!this.active) return;
        
        const applyFrame = () => {
            // Apply momentum decay
            this.momentum.x *= this.momentum.factor;
            this.momentum.y *= this.momentum.factor;
            
            // Apply momentum to active lake particles if they exist
            const activeLakeName = StateManager.getActiveLake();
            const system = StateManager.particleSystems.get(activeLakeName);
            
            if (system && system.particles && system.particles.length > 0) {
                system.particles.forEach(particle => {
                    particle.velocity.x += this.momentum.x * 0.01;
                    particle.velocity.y += this.momentum.y * 0.01;
                });
            }
            
            // Continue animation if momentum is above threshold
            if (Math.abs(this.momentum.x) > this.momentum.min || 
                Math.abs(this.momentum.y) > this.momentum.min) {
                requestAnimationFrame(applyFrame);
            }
        };
        
        // Start momentum animation
        requestAnimationFrame(applyFrame);
    }
    
    applyTouchMomentum() {
        // Similar to applyMomentum but with touch-specific logic
        this.applyMomentum();
    }
    
    // Event listener management
    addEventListener(eventType, callback) {
        if (!this.listeners[eventType]) {
            console.warn(`[EventHandler] Unknown event type: ${eventType}`);
            return false;
        }
        
        this.listeners[eventType].add(callback);
        return true;
    }
    
    removeEventListener(eventType, callback) {
        if (!this.listeners[eventType]) {
            console.warn(`[EventHandler] Unknown event type: ${eventType}`);
            return false;
        }
        
        return this.listeners[eventType].delete(callback);
    }
    
    notifyListeners(eventType, eventData) {
        if (!this.listeners[eventType]) return;
        
        this.listeners[eventType].forEach(callback => {
            try {
                callback(eventData);
            } catch (error) {
                console.error(`[EventHandler] Error in ${eventType} listener:`, error);
            }
        });
    }
    
    // Utility functions
    debounce(func, wait = 250) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    throttle(func, limit = 16) {
        let inThrottle;
        return function(...args) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Activate/deactivate event handler
    activate() {
        this.active = true;
    }
    
    deactivate() {
        this.active = false;
    }
    
    // Cleanup resources
    dispose() {
        // Remove all event listeners
        const container = this.map.getContainer();
        
        // Mouse events
        container.removeEventListener('mousedown', this.handleMouseDown);
        container.removeEventListener('mousemove', this.handleMouseMove);
        container.removeEventListener('mouseup', this.handleMouseUp);
        container.removeEventListener('mouseleave', this.handleMouseUp);
        container.removeEventListener('wheel', this.handleScroll);
        container.removeEventListener('click', this.handleClick);
        
        // Touch events
        container.removeEventListener('touchstart', this.handleTouchStart);
        container.removeEventListener('touchmove', this.handleTouchMove);
        container.removeEventListener('touchend', this.handleTouchEnd);
        container.removeEventListener('touchcancel', this.handleTouchEnd);
        
        // Window events
        window.removeEventListener('resize', this.handleResize);
        
        // Clear registered listeners
        Object.keys(this.listeners).forEach(type => {
            this.listeners[type].clear();
        });
        
        // Clear state
        this.touches.clear();
        this.map = null;
    }
}