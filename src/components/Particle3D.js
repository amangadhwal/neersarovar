import * as THREE from 'three';
import { LAKE_CONFIG, getLakeConfigType } from '../models/lakes.js';

/**
 * Particle3D class for individual particle behavior
 * Represents a single particle in the lake visualization
 */
export class Particle3D {
    /**
     * Create a new particle
     * @param {Object} map - The MapLibre GL map instance
     * @param {Array} lakeCenter - [lng, lat] of the lake center
     * @param {string} lakeType - Type of lake (Freshwater, etc.)
     */
    constructor(map, lakeCenter, lakeType) {
        this.map = map;
        this.position = new THREE.Vector3(lakeCenter[0], lakeCenter[1], 0);
        
        // Configuration based on lake type
        const configType = getLakeConfigType(lakeType);
        const config = LAKE_CONFIG[configType] || LAKE_CONFIG['Freshwater Lake'];
        
        // Initialize velocity with random values
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            0
        );
        
        // Set lifespan based on config
        this.lifespan = config.particleLifespan.min + 
            Math.random() * (config.particleLifespan.max - config.particleLifespan.min);
        this.age = 0;
        
        // Visual properties
        this.color = config.color;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.size = config.particleSize.min + 
            Math.random() * (config.particleSize.max - config.particleSize.min);
        
        // Flow pattern properties
        this.flowPattern = config.flowPattern || 'gentle-ripple';
        this.phaseOffset = Math.random() * Math.PI * 2;
        
        // Sacred lake properties (used only for sacred lakes)
        if (configType === 'Sacred Lake') {
            this.orbitalRadius = Math.random() * 0.05 + 0.02;
            this.orbitalSpeed = Math.random() * 0.01 + 0.005;
            this.orbitalAngle = Math.random() * Math.PI * 2;
        }
    }
    
    /**
     * Update particle position and age
     * @param {number} delta - Time elapsed since last update in seconds
     */
    update(deltaTime, now, boundaries = null) {
        if (this.isExpired) return false;
        
        // Update age
        this.age += deltaTime;
        if (this.age > this.lifespan) {
            this.isExpired = true;
            return false;
        }
        
        // Flow controller referenced but integration unclear
        const flowController = StateManager.flowController;
        if (flowController && this.lakeCenter && this.lakeType) {
            flowController.applyFlowToParticle(this, this.lakeCenter, this.lakeType, now);
        } else {
            // Legacy fallback behavior
            this.position.x += this.velocity.x * deltaTime;
            this.position.y += this.velocity.y * deltaTime;
        }
        
        // Apply gravity and damping
        this.velocity.z -= 0.01 * deltaTime; // Gravity
        this.velocity.multiplyScalar(0.98); // Damping
        
        // Update alpha based on lifecycle
        const progress = this.age / this.lifespan;
        this.opacity = this._calculateOpacity(progress);
        
        return true;
    }
    
    // Legacy method for backwards compatibility
    _applyBoundariesLegacy(boundaries) {
        // Simple boundary constraints (used when FlowController not available)
        if (this.position.x < boundaries.minX || this.position.x > boundaries.maxX) {
            this.velocity.x *= -0.5;
        }
        
        if (this.position.y < boundaries.minY || this.position.y > boundaries.maxY) {
            this.velocity.y *= -0.5;
        }
    }
    
    /**
     * Apply forces based on the particle's flow pattern
     * @param {number} delta - Time elapsed since last update in seconds
     */
    applyFlowPatternForces(delta) {
        const time = performance.now() * 0.001; // Current time in seconds
        
        switch(this.flowPattern) {
            case 'sacred-spiral':
                // Spiral pattern for sacred lakes
                this.orbitalAngle += this.orbitalSpeed * delta;
                const spiralForceX = Math.cos(this.orbitalAngle) * this.orbitalRadius;
                const spiralForceY = Math.sin(this.orbitalAngle) * this.orbitalRadius;
                this.velocity.x += spiralForceX * delta;
                this.velocity.y += spiralForceY * delta;
                break;
                
            case 'mountain-current':
                // Stronger directional flow for high altitude lakes
                const windAngle = Math.sin(time * 0.2 + this.phaseOffset) * 0.5;
                this.velocity.x += Math.cos(windAngle) * 0.01 * delta;
                this.velocity.y += Math.sin(windAngle) * 0.01 * delta;
                break;
                
            case 'crystalline':
                // More structured pattern for salt lakes
                const crystalForce = Math.sin(time + this.position.x * 5 + this.position.y * 5) * 0.01;
                this.velocity.x += crystalForce * delta;
                this.velocity.y += crystalForce * delta;
                break;
                
            case 'gentle-ripple':
            default:
                // Default gentle ripple pattern
                const rippleForce = Math.sin(time + this.phaseOffset) * 0.005;
                this.velocity.x += rippleForce * delta;
                this.velocity.y += rippleForce * delta;
                break;
        }
        
        // Apply a slight damping to prevent excessive velocities
        this.velocity.multiplyScalar(0.99);
    }
    
    /**
     * Check if particle has exceeded its lifespan
     * @returns {boolean} - True if particle should be removed
     */
    isExpired() {
        return this.age >= this.lifespan;
    }
    
    /**
     * Reset the particle for reuse from particle pool
     */
    reset() {
        this.age = 0;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.velocity.set(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            0
        );
    }
    
    /**
     * Initialize/reinitialize a particle with new parameters
     * @param {Object} map - The MapLibre GL map instance
     * @param {Array} lakeCenter - [lng, lat] of the lake center
     * @param {string} lakeType - Type of lake (Freshwater, etc.)
     */
    init(map, lakeCenter, lakeType) {
        this.map = map;
        this.position.set(lakeCenter[0], lakeCenter[1], 0);
        this.age = 0;
        
        // Configuration based on lake type
        const configType = getLakeConfigType(lakeType);
        const config = LAKE_CONFIG[configType] || LAKE_CONFIG['Freshwater Lake'];
        
        // Reset velocity
        this.velocity.set(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            0
        );
        
        // Update lifespan
        this.lifespan = config.particleLifespan.min + 
            Math.random() * (config.particleLifespan.max - config.particleLifespan.min);
        
        // Update visual properties
        this.color = config.color;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.size = config.particleSize.min + 
            Math.random() * (config.particleSize.max - config.particleSize.min);
            
        // Update flow pattern properties
        this.flowPattern = config.flowPattern || 'gentle-ripple';
        this.phaseOffset = Math.random() * Math.PI * 2;
        
        // Sacred lake properties
        if (configType === 'Sacred Lake') {
            this.orbitalRadius = Math.random() * 0.05 + 0.02;
            this.orbitalSpeed = Math.random() * 0.01 + 0.005;
            this.orbitalAngle = Math.random() * Math.PI * 2;
        }
    }
    
    /**
     * Get the screen coordinates for this particle
     * @returns {Object} Screen coordinates {x, y}
     */
    getScreenCoordinates() {
        if (!this.map) return { x: 0, y: 0 };
        
        const point = this.map.project([this.position.x, this.position.y]);
        return { x: point.x, y: point.y };
    }

    /**
     * Reset the particle for reuse 
     */
    reset() {
        // Reset position
        this.x = 0;
        this.y = 0;
        this.z = 0;
        
        // Reset physics properties
        this.velocity = { x: 0, y: 0, z: 0 };
        this.acceleration = { x: 0, y: 0, z: 0 };
        
        // Reset visual properties
        this.opacity = 1;
        this.size = 1;
        this.color = null;
        
        // Reset tracking properties
        this.age = 0;
        this.lifespan = 0;
        this.isExpired = false;
        
        // Clear references
        this.map = null;
        this.lngLat = null;
        this.lakeType = null;
    }
    
    /**
     * Initialize the particle with new properties
     * @param {Object} map - The MapLibre map instance
     * @param {Array} lakeCenter - Center coordinates of the lake
     * @param {string} lakeType - Type of lake (affects particle behavior)
     */
    init(map, lakeCenter, lakeType) {
        // Create position based on lake center with some random distribution
        const randomOffsetX = (Math.random() - 0.5) * 0.01;
        const randomOffsetY = (Math.random() - 0.5) * 0.01;
        const lngLat = [lakeCenter[0] + randomOffsetX, lakeCenter[1] + randomOffsetY];
        
        // Convert to pixel coordinates for rendering
        const point = map.project(lngLat);
        this.x = point.x;
        this.y = point.y;
        this.z = 0;
        
        // Store original lng/lat for later use
        this.lngLat = lngLat;
        this.map = map;
        this.lakeType = lakeType;
        
        // Get configuration based on lake type
        const typeConfig = this.getTypeConfig(lakeType);
        
        // Set up physics properties
        this.velocity = { x: 0, y: 0, z: 0 };
        this.acceleration = { x: 0, y: 0, z: 0 };
        this.mass = Math.random() * 0.5 + 0.5;
        this.age = 0;
        this.lifespan = typeConfig.particleLifespan.min + 
                    Math.random() * (typeConfig.particleLifespan.max - typeConfig.particleLifespan.min);
        
        // Visual properties
        this.size = typeConfig.particleSize.min + 
                   Math.random() * (typeConfig.particleSize.max - typeConfig.particleSize.min);
        this.opacity = Math.random() * 0.5 + 0.3;
        this.isExpired = false;
        
        // Random initial velocity based on type
        const speed = 0.2 + Math.random() * 0.3;
        const angle = Math.random() * Math.PI * 2;
        this.velocity.x = Math.cos(angle) * speed;
        this.velocity.y = Math.sin(angle) * speed;
        this.velocity.z = (Math.random() - 0.5) * 0.1;
    }
    
    /**
     * Helper to get type-specific configuration
     * @param {string} lakeType - The type of lake
     * @returns {Object} Configuration for this lake type
     */
    getTypeConfig(lakeType) {
        // This is a simplified version - in actual implementation, 
        // use the full configuration from constants or models
        return {
            particleSize: { min: 0.5, max: 2.0 },
            particleLifespan: { min: 3000, max: 4500 },
            glowIntensity: 1.0,
        };
    }

    /**
     * Set the Level of Detail for this particle
     * @param {number} level - LOD level between 0 and 1
     */
    setLODLevel(level) {
        if (this.lodLevel === level) return;
        this.lodLevel = level;
        
        // Adjust visual properties based on LOD
        this.updateLODAppearance();
    }

    /**
     * Update particle appearance based on LOD level
     */
    updateLODAppearance() {
        // Skip if no LOD level set
        if (this.lodLevel === undefined) return;
        
        // Scale visual properties based on LOD
        this.displaySize = this.size * this.lodLevel;
        
        // Adjust opacity at lower detail levels
        if (this.lodLevel < 0.5) {
            this.displayOpacity = this.opacity * (0.5 + this.lodLevel);
        } else {
            this.displayOpacity = this.opacity;
        }
        
        // Simplify physics at lower detail levels
        if (this.setPhysicsComplexity) {
            this.setPhysicsComplexity(this.lodLevel);
        }
        
        // Disable glow effects at low detail
        if (this.lodLevel < 0.3) {
            this.displayGlowStrength = 0;
        } else {
            this.displayGlowStrength = this.glowStrength * this.lodLevel;
        }
    }

    /**
     * Set physics simulation complexity
     * @param {number} complexity - Complexity level between 0 and 1
     */
    setPhysicsComplexity(complexity) {
        this.physicsComplexity = complexity;
        
        // Adjust physics update frequency
        if (complexity < 0.3) {
            this.physicsUpdateInterval = 4; // Update every 4 frames
        } else if (complexity < 0.7) {
            this.physicsUpdateInterval = 2; // Update every 2 frames
        } else {
            this.physicsUpdateInterval = 1; // Update every frame
        }
    }
}