import { StateManager } from '../stateManager.js';
import { Particle3D } from './Particle3D.js';
import { LAKE_CONFIG, getLakeConfigType } from '../models/lakes.js';

/**
 * ParticleSystem class for managing lake particles
 */
export class ParticleSystem {
    /**
     * Create a particle system for a lake
     * @param {Object} map - The MapLibre GL map instance
     * @param {string} lakeId - ID of the lake
     * @param {Object} lakeData - Lake configuration data
     * @param {Object} renderer - Renderer instance for this system
     */
    constructor(map, lakeId, lakeData, renderer) {
        this.map = map;
        this.lakeId = lakeId;
        this.lakeData = lakeData;
        this.renderer = renderer;
        this.active = false;
        this.particles = [];
        
        // Get config based on lake type
        const configType = getLakeConfigType(lakeData.type);
        const config = LAKE_CONFIG[configType] || LAKE_CONFIG['Freshwater Lake'];
        this.particleLimit = config.particleCount || 1000;
        
        // Set flow pattern properties based on lake type
        this.flowPattern = config.flowPattern || 'gentle-ripple';
        
        // Track performance metrics
        this.lastUpdateTime = 0;
        this.frameCount = 0;
        this.avgUpdateTime = 0;
        
        // Initialize renderer if provided
        if (this.renderer) {
            this.renderer.registerSystem && this.renderer.registerSystem(this);
        }
        
        this.lakeCenter = lakeData.center;
        this.lakeType = lakeData.type;
        
        // Lake boundaries for particles
        this.boundaries = {
            minX: this.lakeCenter[0] - 0.05,
            maxX: this.lakeCenter[0] + 0.05,
            minY: this.lakeCenter[1] - 0.05,
            maxY: this.lakeCenter[1] + 0.05
        };
        
        console.log(`[ParticleSystem] Created for lake ${lakeId}`);
    }

    /**
     * Activate the particle system
     */
    activate() {
        if (this.active) return;
        
        this.active = true;
        this.lastUpdateTime = performance.now();
        
        // Generate initial particles if needed
        if (this.particles.length === 0) {
            this.generateParticles(this.particleLimit);
        }
        
        console.log(`[ParticleSystem] Activated for lake ${this.lakeId}`);
    }

    /**
     * Deactivate the particle system
     */
    deactivate() {
        if (!this.active) return;
        
        this.active = false;
        
        // Clean up particles if needed
        // In a full implementation, we might move particles back to the pool
        
        console.log(`[ParticleSystem] Deactivated for lake ${this.lakeId}`);
    }

    /**
     * Update all particles in the system
     * @param {number} delta - Time elapsed since last update in seconds
     */
    update(delta) {
        if (!this.active) return;
        
        const startTime = performance.now();
        
        // Update existing particles
        this.particles = this.particles.filter(p => {
            p.update(delta);
            return !p.isExpired();
        });
        
        // Add new particles if needed
        if (this.particles.length < this.particleLimit) {
            const newCount = Math.min(10, this.particleLimit - this.particles.length);
            this.generateParticles(newCount);
        }
        
        // Update performance metrics
        if (StateManager.perfMonitor) {
            StateManager.perfMonitor.updateParticleCount?.(this.particles.length);
        }
        
        // Track system performance
        const endTime = performance.now();
        const updateTime = endTime - startTime;
        this.frameCount++;
        this.avgUpdateTime = (this.avgUpdateTime * (this.frameCount - 1) + updateTime) / this.frameCount;
    }

    /**
     * Generate new particles
     * @param {number} count - Number of particles to generate
     */
    generateParticles(count) {
        const pool = StateManager.particlePool;
        
        for (let i = 0; i < count; i++) {
            // Try to get a particle from the pool
            let particle;
            
            if (pool) {
                particle = pool.acquire(this.map, this.lakeData.center, this.lakeData.type);
            }
            
            // Fall back to creating a new particle if pool is empty
            if (!particle) {
                particle = new Particle3D(this.map, this.lakeData.center, this.lakeData.type);
            }
            
            // Apply lake-specific customizations
            this.customizeParticle(particle);
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Customize a particle based on lake type
     * @param {Particle3D} particle - The particle to customize
     */
    customizeParticle(particle) {
        // Apply lake-specific customizations based on type
        const configType = getLakeConfigType(this.lakeData.type);
        
        switch(configType) {
            case 'Sacred Lake':
                // Add sacred lake properties
                particle.glowIntensity = 1.5;
                break;
                
            case 'High Altitude Lake':
                // High altitude lake properties
                particle.sparkle = true;
                break;
                
            case 'Salt Lake':
                // Salt lake properties
                particle.crystalline = true;
                break;
        }
    }
    
    /**
     * Apply an external force to all particles in the system
     * @param {number} x - X-component of force
     * @param {number} y - Y-component of force
     * @param {number} intensity - Force intensity multiplier
     */
    applyForce(x, y, intensity = 1.0) {
        if (!this.active) return;
        
        this.particles.forEach(particle => {
            particle.velocity.x += x * intensity;
            particle.velocity.y += y * intensity;
        });
    }
    
    /**
     * Apply a ripple effect from a specific point
     * @param {number} x - X coordinate of ripple center
     * @param {number} y - Y coordinate of ripple center
     * @param {number} intensity - Ripple intensity
     * @param {number} radius - Ripple radius
     */
    applyRipple(x, y, intensity = 1.0, radius = 0.1) {
        if (!this.active) return;
        
        const center = this.map.unproject([x, y]);
        const centerLng = center.lng;
        const centerLat = center.lat;
        
        this.particles.forEach(particle => {
            const dx = particle.position.x - centerLng;
            const dy = particle.position.y - centerLat;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < radius) {
                const force = (1 - distance / radius) * intensity;
                const angle = Math.atan2(dy, dx);
                particle.velocity.x += Math.cos(angle) * force;
                particle.velocity.y += Math.sin(angle) * force;
            }
        });
    }
    
    /**
     * Get particles for rendering
     * @returns {Array} Array of active particles
     */
    getActiveParticles() {
        return this.active ? this.particles : [];
    }
    
    /**
     * Get performance metrics for this system
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        return {
            particleCount: this.particles.length,
            particleLimit: this.particleLimit,
            avgUpdateTime: this.avgUpdateTime,
            frameCount: this.frameCount,
            active: this.active
        };
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Return particles to the pool
        const pool = StateManager.particlePool;
        if (pool) {
            this.particles.forEach(particle => pool.release(particle));
        }
        
        // Clear particles array
        this.particles = [];
        
        // Unregister from renderer
        if (this.renderer && this.renderer.unregisterSystem) {
            this.renderer.unregisterSystem(this);
        }
        
        console.log(`[ParticleSystem] Disposed for lake ${this.lakeId}`);
    }
}

class ParticleOptimizer {
  constructor() {
    this.particlePool = [];
    this.maxPoolSize = 5000;
    this.frustumCulling = true;
    this.dynamicLOD = PERFORMANCE_THRESHOLDS.dynamicLOD;
    this.lodDistanceThresholds = [
      { distance: 1000, detail: 1.0 },  // Full detail
      { distance: 2000, detail: 0.75 }, // High detail
      // ...
    ];
    // ...
  }
  
  shouldRender(particle, cameraPosition) { /* ... */ }
  // Dynamic LOD (Level of Detail) system
  // ...
}