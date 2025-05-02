import { Particle3D } from '../components/Particle3D.js';
import { PERFORMANCE_THRESHOLDS } from '../config/constants.js';

/**
 * ParticlePool - Manages reusable particle objects to reduce garbage collection
 */
export class ParticlePool {
    /**
     * Create a new particle pool
     * @param {number} size - The initial pool size
     */
    constructor(size = PERFORMANCE_THRESHOLDS.maxActiveParticles) {
        this.pool = [];
        this.maxSize = size;
        this.activeCount = 0;
        this.totalCreated = 0;
        this.totalReused = 0;
        
        // Pre-allocate pool with empty particles
        for (let i = 0; i < Math.min(size, 500); i++) {
            this.pool.push(new Particle3D());
        }
        
        console.log(`[ParticlePool] Initialized with ${this.pool.length} particles`);
    }
    
    /**
     * Acquire a particle from the pool or create a new one
     * @param {Object} map - The MapLibre map instance
     * @param {Array} lakeCenter - Center coordinates of the lake
     * @param {string} lakeType - Type of lake (affects particle behavior)
     * @returns {Particle3D} - A particle instance
     */
    acquire(map, lakeCenter, lakeType) {
        this.activeCount++;
        
        // Get a particle from the pool or create a new one
        const particle = this.pool.pop() || new Particle3D();
        
        if (this.pool.length === 0) {
            this.totalCreated++;
        } else {
            this.totalReused++;
        }
        
        // Initialize particle properties
        if (typeof particle.init === 'function') {
            particle.init(map, lakeCenter, lakeType);
        } else {
            // If init doesn't exist, create a new particle (fallback)
            return new Particle3D(map, lakeCenter, lakeType);
        }
        
        return particle;
    }
    
    /**
     * Return a particle to the pool for reuse
     * @param {Particle3D} particle - The particle to return to the pool
     */
    release(particle) {
        this.activeCount--;
        
        // Reset particle state
        if (typeof particle.reset === 'function') {
            particle.reset();
        }
        
        // Only add to pool if we're under max size
        if (this.pool.length < this.maxSize) {
            this.pool.push(particle);
        }
    }
    
    /**
     * Get the current size of the pool
     * @returns {number} - The number of available particles
     */
    getPoolSize() {
        return this.pool.length;
    }
    
    /**
     * Get the maximum size of the pool
     * @returns {number} - The maximum pool size
     */
    getMaxSize() {
        return this.maxSize;
    }
    
    /**
     * Get the number of active particles
     * @returns {number} - The number of particles currently in use
     */
    getActiveCount() {
        return this.activeCount;
    }
    
    /**
     * Resize the pool to a new maximum size
     * @param {number} newSize - The new maximum pool size
     */
    resize(newSize) {
        this.maxSize = newSize;
        
        // If current pool is larger than new max, trim it
        if (this.pool.length > newSize) {
            this.pool.length = newSize;
        }
        
        console.log(`[ParticlePool] Resized to ${newSize} maximum particles`);
    }
    
    /**
     * Get pool statistics
     * @returns {Object} - Statistics about the particle pool
     */
    getStats() {
        return {
            poolSize: this.pool.length,
            maxSize: this.maxSize,
            activeCount: this.activeCount,
            totalCreated: this.totalCreated,
            totalReused: this.totalReused,
            reuseRatio: this.totalCreated > 0 ? 
                this.totalReused / (this.totalCreated + this.totalReused) : 0
        };
    }
}