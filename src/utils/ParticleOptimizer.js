import { StateManager } from '../stateManager.js';
import { PERFORMANCE_THRESHOLDS } from '../config/constants.js';
import { Vector3D } from '../utils/Vector3D.js';

/**
 * ParticleOptimizer provides sophisticated LOD and culling techniques
 * for efficient particle rendering
 */
export class ParticleOptimizer {
    constructor() {
        this.particlePool = [];
        this.maxPoolSize = 5000;
        this.frustumCulling = true;
        this.dynamicLOD = PERFORMANCE_THRESHOLDS.dynamicLOD;
        this.lodDistanceThresholds = [
            { distance: 1000, detail: 1.0 },  // Full detail
            { distance: 2000, detail: 0.75 }, // High detail
            { distance: 3000, detail: 0.5 },  // Medium detail
            { distance: 4000, detail: 0.25 }, // Low detail
            { distance: 5000, detail: 0.1 }   // Minimal detail
        ];
        
        // Temp vectors for calculations (reduces garbage collection)
        this.tempVec = new Vector3D();
        
        // Metrics tracking
        this.metrics = {
            culledParticles: 0,
            lodParticles: {
                full: 0,
                high: 0,
                medium: 0,
                low: 0,
                minimal: 0
            },
            lastUpdateTime: 0
        };
        
        console.log('[ParticleOptimizer] Initialized with dynamic LOD system');
    }
    
    /**
     * Determine if a particle should be rendered based on distance and frustum
     * @param {Object} particle - The particle to check
     * @param {Object} cameraPosition - Current camera position
     * @param {Object} options - Additional options
     * @returns {Object} Result with shouldRender flag and lodLevel
     */
    shouldRender(particle, cameraPosition, options = {}) {
        // Skip check if optimization is disabled
        if (!this.frustumCulling && !this.dynamicLOD) {
            return { shouldRender: true, lodLevel: 1.0 };
        }
        
        // Calculate distance to camera
        this.tempVec.set(
            particle.x - cameraPosition.x,
            particle.y - cameraPosition.y,
            (particle.z || 0) - (cameraPosition.z || 0)
        );
        
        const distanceSquared = this.tempVec.lengthSquared();
        
        // Frustum culling - don't render particles too far away
        if (this.frustumCulling && distanceSquared > PERFORMANCE_THRESHOLDS.cullingDistance * PERFORMANCE_THRESHOLDS.cullingDistance) {
            this.metrics.culledParticles++;
            return { shouldRender: false, lodLevel: 0 };
        }
        
        // Dynamic LOD - reduce detail for distant particles
        if (this.dynamicLOD) {
            const distance = Math.sqrt(distanceSquared);
            const lodLevel = this.calculateLODLevel(distance);
            
            // Update metrics
            this.updateLODMetrics(lodLevel);
            
            // Skip rendering some particles based on LOD
            if (lodLevel < 0.99 && Math.random() > lodLevel) {
                return { shouldRender: false, lodLevel };
            }
            
            return { shouldRender: true, lodLevel };
        }
        
        return { shouldRender: true, lodLevel: 1.0 };
    }
    
    /**
     * Calculate LOD level based on distance
     * @param {number} distance - Distance to camera
     * @returns {number} LOD level between 0 and 1
     */
    calculateLODLevel(distance) {
        // Find the appropriate LOD level based on distance
        for (let i = 0; i < this.lodDistanceThresholds.length; i++) {
            const threshold = this.lodDistanceThresholds[i];
            
            if (distance <= threshold.distance) {
                // If this is the first threshold, return full detail
                if (i === 0) return threshold.detail;
                
                // Otherwise interpolate between this threshold and the previous one
                const prevThreshold = this.lodDistanceThresholds[i - 1];
                const t = (distance - prevThreshold.distance) / 
                          (threshold.distance - prevThreshold.distance);
                
                return prevThreshold.detail + t * (threshold.detail - prevThreshold.detail);
            }
        }
        
        // Beyond the last threshold, use minimum detail
        return this.lodDistanceThresholds[this.lodDistanceThresholds.length - 1].detail;
    }
    
    /**
     * Update LOD metrics for performance monitoring
     * @param {number} lodLevel - Current LOD level
     */
    updateLODMetrics(lodLevel) {
        if (lodLevel > 0.9) {
            this.metrics.lodParticles.full++;
        } else if (lodLevel > 0.6) {
            this.metrics.lodParticles.high++;
        } else if (lodLevel > 0.4) {
            this.metrics.lodParticles.medium++;
        } else if (lodLevel > 0.2) {
            this.metrics.lodParticles.low++;
        } else {
            this.metrics.lodParticles.minimal++;
        }
    }
    
    /**
     * Apply particle optimizations to a particle system
     * @param {Object} particleSystem - The particle system to optimize
     * @param {Object} cameraPosition - Current camera position
     */
    optimizeParticleSystem(particleSystem, cameraPosition) {
        if (!particleSystem || !particleSystem.particles) return;
        
        // Reset metrics
        this.resetMetrics();
        
        // Apply optimizations to each particle
        particleSystem.particles.forEach(particle => {
            const { shouldRender, lodLevel } = this.shouldRender(
                particle, 
                cameraPosition, 
                { lakeType: particleSystem.lakeType }
            );
            
            // Update particle rendering state
            particle.visible = shouldRender;
            
            // Apply LOD level
            if (shouldRender && particle.setLODLevel) {
                particle.setLODLevel(lodLevel);
            }
        });
        
        // Log metrics occasionally
        this.logMetrics();
    }
    
    /**
     * Reset optimization metrics
     */
    resetMetrics() {
        this.metrics.culledParticles = 0;
        this.metrics.lodParticles.full = 0;
        this.metrics.lodParticles.high = 0;
        this.metrics.lodParticles.medium = 0;
        this.metrics.lodParticles.low = 0;
        this.metrics.lodParticles.minimal = 0;
    }
    
    /**
     * Log optimization metrics periodically
     */
    logMetrics() {
        const now = performance.now();
        if (now - this.metrics.lastUpdateTime < 5000) return; // Log every 5 seconds
        
        this.metrics.lastUpdateTime = now;
        
        console.log('[ParticleOptimizer] Optimization metrics:');
        console.log(`  - Culled particles: ${this.metrics.culledParticles}`);
        console.log('  - LOD levels:');
        console.log(`    - Full detail: ${this.metrics.lodParticles.full}`);
        console.log(`    - High detail: ${this.metrics.lodParticles.high}`);
        console.log(`    - Medium detail: ${this.metrics.lodParticles.medium}`);
        console.log(`    - Low detail: ${this.metrics.lodParticles.low}`);
        console.log(`    - Minimal detail: ${this.metrics.lodParticles.minimal}`);
    }
    
    /**
     * Configure LOD distance thresholds
     * @param {Array} thresholds - New LOD distance thresholds
     */
    setLODThresholds(thresholds) {
        if (!Array.isArray(thresholds) || thresholds.length === 0) {
            console.warn('[ParticleOptimizer] Invalid LOD thresholds');
            return;
        }
        
        this.lodDistanceThresholds = thresholds;
        console.log('[ParticleOptimizer] Updated LOD thresholds');
    }
    
    /**
     * Enable or disable frustum culling
     * @param {boolean} enabled - Whether to enable frustum culling
     */
    setFrustumCulling(enabled) {
        this.frustumCulling = enabled;
        console.log(`[ParticleOptimizer] Frustum culling ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Enable or disable dynamic LOD
     * @param {boolean} enabled - Whether to enable dynamic LOD
     */
    setDynamicLOD(enabled) {
        this.dynamicLOD = enabled;
        console.log(`[ParticleOptimizer] Dynamic LOD ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Adapt optimization settings based on performance
     * @param {number} fps - Current FPS
     */
    adaptToPerformance(fps) {
        if (fps < PERFORMANCE_THRESHOLDS.lowFPS) {
            // Low performance - strengthen optimizations
            this.setFrustumCulling(true);
            this.setDynamicLOD(true);
            
            // Reduce culling distance
            const reducedDistance = PERFORMANCE_THRESHOLDS.cullingDistance * 0.8;
            PERFORMANCE_THRESHOLDS.cullingDistance = reducedDistance;
            
            console.log(`[ParticleOptimizer] Adapting to low performance (${fps.toFixed(1)} FPS)`);
        } else if (fps > PERFORMANCE_THRESHOLDS.targetFPS * 0.9) {
            // High performance - relax optimizations
            
            // Increase culling distance if it was reduced
            if (PERFORMANCE_THRESHOLDS.cullingDistance < 5000) {
                const increasedDistance = Math.min(
                    5000, 
                    PERFORMANCE_THRESHOLDS.cullingDistance * 1.1
                );
                PERFORMANCE_THRESHOLDS.cullingDistance = increasedDistance;
            }
            
            console.log(`[ParticleOptimizer] Relaxing optimizations due to good performance (${fps.toFixed(1)} FPS)`);
        }
    }
}