// src/config/performance.js

/**
 * Performance thresholds and optimization settings
 */
export const PERFORMANCE_THRESHOLDS = {
    targetFPS: 60,
    lowFPS: 30,
    batchSize: 100,
    maxActiveParticles: 2000,
    cullingDistance: 5000,
    dynamicLOD: true
};

/**
 * Memory manager for efficient resource allocation
 */
export class MemoryManager {
    constructor() {
        // Memory usage tracking
        this.memoryUsage = {
            particleCount: 0,
            estimatedBytes: 0,
            lastCleanup: performance.now()
        };
        
        // Reusable objects pool
        this.reusableObjects = {
            vector: new Vector3D(),
            array: [],
            events: new Map()
        };
        
        // Circular buffer for particle data
        this.particleBuffer = {
            position: new Float32Array(PERFORMANCE_THRESHOLDS.maxActiveParticles * 3),
            color: new Float32Array(PERFORMANCE_THRESHOLDS.maxActiveParticles * 4),
            size: new Float32Array(PERFORMANCE_THRESHOLDS.maxActiveParticles),
            nextIndex: 0,
            capacity: PERFORMANCE_THRESHOLDS.maxActiveParticles
        };
        
        // Set up periodic garbage collection hint
        this.gcInterval = 60000; // 1 minute
        setInterval(() => this.triggerCleanup(), this.gcInterval);
    }
    
    trackParticleAllocation(count) {
        this.memoryUsage.particleCount += count;
        this.memoryUsage.estimatedBytes += count * 92; // Estimated bytes per particle
    }
    
    trackParticleDeallocation(count) {
        this.memoryUsage.particleCount -= count;
        this.memoryUsage.estimatedBytes -= count * 92;
    }
    
    getBufferForParticles(count) {
        const startIndex = this.particleBuffer.nextIndex;
        this.particleBuffer.nextIndex = (startIndex + count) % this.particleBuffer.capacity;
        
        return {
            position: this.particleBuffer.position.subarray(startIndex * 3, this.particleBuffer.nextIndex * 3),
            color: this.particleBuffer.color.subarray(startIndex * 4, this.particleBuffer.nextIndex * 4),
            size: this.particleBuffer.size.subarray(startIndex, this.particleBuffer.nextIndex)
        };
    }
    
    triggerCleanup() {
        this.clearTemporaryCaches();
        
        // Only trigger GC if we've allocated a lot of memory
        if (this.memoryUsage.particleCount > PERFORMANCE_THRESHOLDS.maxActiveParticles * 0.8) {
            this.triggerGarbageCollection();
        }
        
        this.memoryUsage.lastCleanup = performance.now();
    }
    
    clearTemporaryCaches() {
        // Clear any temporary caches
        this.reusableObjects.array.length = 0;
        this.reusableObjects.events.clear();
    }
    
    triggerGarbageCollection() {
        // Create a large temporary array and then delete it
        // This can help trigger garbage collection in some browsers
        const tempArray = new Array(1000000);
        for (let i = 0; i < 1000000; i++) {
            tempArray[i] = i;
        }
        // Let the array go out of scope naturally
    }
}

/**
 * Vector3D class for 3D coordinate system integration
 */
export class Vector3D {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }
    
    clone() {
        return new Vector3D(this.x, this.y, this.z);
    }
    
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    
    normalize() {
        const len = this.length();
        if (len > 0) {
            this.x /= len;
            this.y /= len;
            this.z /= len;
        }
        return this;
    }
}

/**
 * Performance test harness for benchmarking and optimization
 */
export class PerformanceTestHarness {
    constructor() {
        this.isRunning = false;
        this.sampleInterval = null;
        this.startTime = 0;
        this.duration = 0;
        this.metrics = {
            fps: [],
            renderTimes: [],
            memoryUsage: [],
            particleCounts: []
        };
    }
    
    startTest(duration = 10000) {
        if (this.isRunning) return;
        
        console.log(`[PerformanceTest] Starting ${duration}ms test...`);
        this.isRunning = true;
        this.startTime = performance.now();
        this.duration = duration;
        
        // Clear previous metrics
        this.metrics = {
            fps: [],
            renderTimes: [],
            memoryUsage: [],
            particleCounts: []
        };
        
        // Sample metrics every 100ms
        this.sampleInterval = setInterval(() => this.sampleMetrics(), 100);
        
        // End test after duration
        setTimeout(() => this.completeTest(), duration);
    }
    
    sampleMetrics() {
        if (!this.isRunning) return;
        
        // Sample current metrics
        this.metrics.fps.push(perfMonitor.metrics.fps);
        this.metrics.renderTimes.push(perfMonitor.metrics.renderTime);
        this.metrics.memoryUsage.push(perfMonitor.metrics.memoryUsage);
        this.metrics.particleCounts.push(perfMonitor.metrics.particleCount);
    }
    
    completeTest() {
        if (!this.isRunning) return;
        
        clearInterval(this.sampleInterval);
        this.isRunning = false;
        
        // Calculate summary statistics
        const summary = this.calculateSummary();
        
        // Log results
        console.log('[PerformanceTest] Test completed, results:');
        console.log(`FPS: avg=${summary.fps.avg.toFixed(1)}, min=${summary.fps.min.toFixed(1)}, max=${summary.fps.max.toFixed(1)}`);
        console.log(`Frame Time: avg=${summary.renderTimes.avg.toFixed(1)}ms, min=${summary.renderTimes.min.toFixed(1)}ms, max=${summary.renderTimes.max.toFixed(1)}ms`);
        console.log(`Memory: avg=${(summary.memoryUsage.avg / (1024 * 1024)).toFixed(2)}MB, peak=${(summary.memoryUsage.max / (1024 * 1024)).toFixed(2)}MB`);
        
        // Check for warnings
        const warnings = this.checkWarnings(summary);
        if (warnings.length > 0) {
            console.warn('[PerformanceTest] Performance warnings:');
            warnings.forEach(warning => console.warn(`- ${warning}`));
            this.suggestOptimizations(warnings);
        } else {
            console.log('[PerformanceTest] Performance is good!');
        }
    }
    
    calculateSummary() {
        // Helper function to calculate statistics
        const calculateStats = (array) => {
            if (!array.length) return { min: 0, max: 0, avg: 0 };
            
            const min = Math.min(...array);
            const max = Math.max(...array);
            const avg = array.reduce((a, b) => a + b, 0) / array.length;
            
            return { min, max, avg };
        };
        
        return {
            fps: calculateStats(this.metrics.fps),
            renderTimes: calculateStats(this.metrics.renderTimes),
            memoryUsage: calculateStats(this.metrics.memoryUsage),
            particleCounts: calculateStats(this.metrics.particleCounts)
        };
    }
    
    checkWarnings(summary) {
        const warnings = [];
        
        if (summary.fps.avg < PERFORMANCE_THRESHOLDS.lowFPS) {
            warnings.push(`Low average FPS: ${summary.fps.avg.toFixed(1)}`);
        }
        
        if (summary.fps.min < PERFORMANCE_THRESHOLDS.lowFPS / 2) {
            warnings.push(`Very low minimum FPS: ${summary.fps.min.toFixed(1)}`);
        }
        
        if (summary.renderTimes.avg > 16) {
            warnings.push(`High average frame times: ${summary.renderTimes.avg.toFixed(1)}ms`);
        }
        
        if (summary.memoryUsage.max > 200 * 1024 * 1024) {
            warnings.push(`High peak memory usage: ${(summary.memoryUsage.max / (1024 * 1024)).toFixed(2)}MB`);
        }
        
        if (summary.particleCounts.avg > PERFORMANCE_THRESHOLDS.maxActiveParticles * 0.9) {
            warnings.push(`Near maximum particle count: ${summary.particleCounts.avg.toFixed(0)}`);
        }
        
        return warnings;
    }
    
    suggestOptimizations(warnings) {
        console.log('[PerformanceTest] Optimization suggestions:');
        
        if (warnings.some(w => w.includes('FPS'))) {
            console.log('- Reduce particle counts using PERFORMANCE_THRESHOLDS.maxActiveParticles');
            console.log('- Enable dynamic LOD for distant particles');
            console.log('- Increase culling distance to remove off-screen particles');
        }
        
        if (warnings.some(w => w.includes('frame times'))) {
            console.log('- Optimize update loops with batch processing');
            console.log('- Reduce shader complexity for particle rendering');
            console.log('- Consider reducing map detail level dynamically');
        }
        
        if (warnings.some(w => w.includes('particle count'))) {
            console.log('- Lower particle count for each lake type in LAKE_CONFIG');
            console.log('- Implement stricter culling for off-screen lakes');
            console.log('- Use particle pooling to reduce memory allocation');
        }
    }
}