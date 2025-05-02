import { StateManager } from '../stateManager.js';
import { lakes } from '../models/lakes.js';

/**
 * LakeManager class for coordinating lake states and transitions
 */
export class LakeManager {
    /**
     * Create a new lake manager
     * @param {Object} map - The MapLibre GL map instance
     */
    constructor(map) {
        this.map = map;
        this.isTransitioning = false;
        this.flyTimeout = null;
        
        console.log('[LakeManager] Initialized');
    }

    /**
     * Set the active lake and handle transitions
     * @param {string} lakeName - ID of the lake to activate
     */
    setActiveLake(lakeName) {
        if (lakeName === StateManager.getActiveLake() || this.isTransitioning) {
            return;
        }
        
        const prevLake = StateManager.getActiveLake();
        console.log(`[LakeManager] Switching active lake from ${prevLake} to ${lakeName}`);
        
        // Update UI elements
        this.updateUI(lakeName, prevLake);
        
        // Handle particle systems
        this.toggleParticleSystems(lakeName, prevLake);
        
        // Update state manager
        StateManager.setActiveLake(lakeName);
        
        // Fly to the new lake
        this.flyToLake(lakeName);
    }
    
    /**
     * Update UI elements for lake transition
     * @param {string} newLake - ID of the new active lake
     * @param {string} oldLake - ID of the previous active lake
     */
    updateUI(newLake, oldLake) {
        // Update section classes
        const newEl = document.getElementById(newLake);
        const oldEl = document.getElementById(oldLake);
        
        if (oldEl) oldEl.className = '';
        if (newEl) newEl.className = 'active';
        
        // Update marker styling
        const markers = StateManager.markers;
        if (markers.get(oldLake)) markers.get(oldLake).element.classList.remove('marker-active');
        if (markers.get(newLake)) markers.get(newLake).element.classList.add('marker-active');
    }
    
    /**
     * Toggle particle systems during lake transition
     * @param {string} newLake - ID of the new active lake
     * @param {string} oldLake - ID of the previous active lake 
     */
    toggleParticleSystems(newLake, oldLake) {
        const systems = StateManager.particleSystems;
        
        // Deactivate previous system
        if (systems.get(oldLake)) {
            systems.get(oldLake).deactivate();
        }
        
        // Activate or create new system
        if (!systems.get(newLake)) {
            // This will be properly implemented using the renderer
            console.log(`[LakeManager] Creating new particle system for ${newLake}`);
        }
        
        if (systems.get(newLake)) {
            systems.get(newLake).activate();
        }
    }
    
    /**
     * Fly the map to the selected lake
     * @param {string} lakeName - ID of the lake to fly to
     */
    flyToLake(lakeName) {
        // Cancel existing animations
        if (this.flyTimeout) {
            clearTimeout(this.flyTimeout);
        }
        
        // Prevent system from responding to map movements during transition
        this.isTransitioning = true;
        
        const lake = lakes[lakeName];
        this.map.flyTo({
            center: lake.center,
            zoom: lake.zoom,
            bearing: lake.bearing,
            pitch: lake.pitch,
            duration: lake.duration || 2000
        });
        
        // Reset state after animation completes
        this.flyTimeout = setTimeout(() => {
            this.isTransitioning = false;
        }, lake.duration || 2000);
    }
    
    /**
     * Get a specific particle system
     * @param {string} lakeName - ID of the lake
     * @returns {ParticleSystem} The corresponding particle system
     */
    getSystem(lakeName) {
        return StateManager.particleSystems.get(lakeName);
    }
    
    /**
     * Get all particle systems
     * @returns {Array} Array of all particle systems
     */
    getAllSystems() {
        return Array.from(StateManager.particleSystems.values());
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        if (this.flyTimeout) {
            clearTimeout(this.flyTimeout);
        }
        
        console.log('[LakeManager] Disposed');
    }
}