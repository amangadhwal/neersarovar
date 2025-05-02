/**
 * MapIntegrator class for integrating map with particle systems
 * Handles viewport state and canvas management
 */
export class MapIntegrator {
    /**
     * Create a new map integrator
     * @param {Object} map - The MapLibre GL map instance
     */
    constructor(map) {
        this.map = map;
        this.canvas = document.createElement('canvas');
        this.viewport = {
            center: map.getCenter(),
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
            width: map.getContainer().offsetWidth,
            height: map.getContainer().offsetHeight
        };
        this.viewportListeners = [];
        
        this.setupParticleCanvas();
        this.setupViewportSync();
        
        console.log('[MapIntegrator] Initialized');
    }
    
    /**
     * Setup the particle canvas overlay
     */
    setupParticleCanvas() {
        this.canvas.className = 'particle-overlay';
        this.canvas.width = this.viewport.width;
        this.canvas.height = this.viewport.height;
        
        document.body.appendChild(this.canvas);
        
        console.log('[MapIntegrator] Particle canvas created');
    }
    
    /**
     * Setup viewport synchronization with map
     */
    setupViewportSync() {
        // Update viewport state on map move
        this.map.on('move', () => this.updateViewportState());
        
        // Update viewport on window resize
        window.addEventListener('resize', () => {
            this.updateParticleCanvas();
            this.updateViewportState();
        });
        
        // Add viewport change listeners
        this.map.on('move', () => this._notifyViewportListeners());
        this.map.on('zoom', () => this._notifyViewportListeners());
        
        console.log('[MapIntegrator] Viewport sync setup');
    }
    
    /**
     * Update the current viewport state and notify listeners
     */
    updateViewportState() {
        const prevState = { ...this.viewport };
        
        const newState = {
            center: this.map.getCenter(),
            zoom: this.map.getZoom(),
            bearing: this.map.getBearing(),
            pitch: this.map.getPitch(),
            width: this.map.getContainer().offsetWidth,
            height: this.map.getContainer().offsetHeight
        };
        
        // Only notify if viewport has actually changed
        if (this.hasViewportChanged(prevState, newState)) {
            this.viewport = newState;
            this.onViewportChanged(prevState, newState);
        }
    }
    
    /**
     * Check if viewport has changed significantly
     * @param {Object} prev - Previous viewport state
     * @param {Object} current - Current viewport state
     * @returns {boolean} True if viewport has changed significantly
     */
    hasViewportChanged(prev, current) {
        const threshold = 0.00001; // Small threshold for floating point comparison
        
        return (
            Math.abs(prev.zoom - current.zoom) > 0.01 ||
            Math.abs(prev.bearing - current.bearing) > 0.1 ||
            Math.abs(prev.pitch - current.pitch) > 0.1 ||
            Math.abs(prev.center.lng - current.center.lng) > threshold ||
            Math.abs(prev.center.lat - current.center.lat) > threshold ||
            prev.width !== current.width ||
            prev.height !== current.height
        );
    }
    
    /**
     * Handle viewport changes
     * @param {Object} prevState - Previous viewport state
     * @param {Object} currentState - Current viewport state
     */
    onViewportChanged(prevState, currentState) {
        // Update canvas size if needed
        if (prevState.width !== currentState.width || prevState.height !== currentState.height) {
            this.updateParticleCanvas();
        }
        
        // Notify listeners
        this.notifyViewportListeners(prevState, currentState);
    }
    
    /**
     * Update the particle canvas dimensions
     */
    updateParticleCanvas() {
        const { width, height } = this.map.getContainer();
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        console.log(`[MapIntegrator] Canvas resized to ${width}x${height}`);
    }
    
    /**
     * Register a system to receive viewport change notifications
     * @param {function} listener - Callback function for viewport changes
     */
    registerViewportListener(listener) {
        if (typeof listener.updateVisualizations === 'function') {
            this.viewportListeners.push(listener);
            console.log('[MapIntegrator] Registered viewport listener:', 
                listener.constructor.name || 'Unknown listener');
            return true;
        }
        console.warn('[MapIntegrator] Failed to register viewport listener (missing updateVisualizations method)');
        return false;
    }
    
    /**
     * Remove a system from viewport change notifications
     * @param {function} listener - Callback function to remove
     */
    unregisterViewportListener(listener) {
        this.viewportListeners.delete(listener);
    }
    
    /**
     * Notify registered viewport listeners about changes
     * @param {Object} prevState - Previous viewport state
     * @param {Object} currentState - Current viewport state
     */
    notifyViewportListeners(prevState, currentState) {
        this.viewportListeners.forEach(listener => {
            try {
                listener(prevState, currentState);
            } catch (error) {
                console.error('[MapIntegrator] Error notifying viewport listener:', error);
            }
        });
    }
    
    /**
     * Notify registered viewport listeners about changes
     */
    _notifyViewportListeners() {
        this.viewportListeners.forEach(listener => {
            if (listener && typeof listener.updateVisualizations === 'function') {
                listener.updateVisualizations();
            }
        });
    }
    
    /**
     * Get the current map state
     * @returns {Object} Map state object
     */
    getMapState() {
        return {
            center: this.map.getCenter(),
            zoom: this.map.getZoom(),
            bearing: this.map.getBearing(),
            pitch: this.map.getPitch()
        };
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        this.canvas.remove();
        this.viewportListeners.clear();
        
        console.log('[MapIntegrator] Disposed');
    }
}