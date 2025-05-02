import { PERFORMANCE_THRESHOLDS } from '../config/constants.js';

/**
 * PerformanceMonitor for tracking and optimizing application performance
 */
export class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.lastFpsUpdate = this.lastTime;
        this.memoryUsage = 0;
        this.qualityLevel = 'high';
        
        // Track metrics history
        this.fpsHistory = new Array(60).fill(60);
        this.fpsHistoryIndex = 0;
        this.memoryHistory = new Array(30).fill(0);
        this.memoryHistoryIndex = 0;
        
        // Performance timers
        this.timers = {};
        
        // Particle count tracking
        this.particleCount = 0;
        
        // Detailed metrics
        this.metrics = {
            fps: 0,
            frameTime: 0,
            particleCount: 0,
            memoryUsage: 0,
            activeSystems: 0,
            drawCalls: 0,
            culledParticles: 0,
            visibleParticles: 0
        };
        
        console.log('[PerformanceMonitor] Initialized');
    }
    
    /**
     * Update performance metrics on each frame
     * @returns {number} - Time delta since last update in ms
     */
    update() {
        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        
        this.frameCount++;
        
        // Update FPS every second
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            this.metrics.fps = this.fps;
            
            // Store in history for tracking performance trends
            this.fpsHistory[this.fpsHistoryIndex] = this.fps;
            this.fpsHistoryIndex = (this.fpsHistoryIndex + 1) % this.fpsHistory.length;
            
            this.lastFpsUpdate = now;
            this.frameCount = 0;
            
            // Update memory usage if available
            if (window.performance && window.performance.memory) {
                this.memoryUsage = window.performance.memory.usedJSHeapSize;
                this.metrics.memoryUsage = this.memoryUsage;
                
                // Store in history
                this.memoryHistory[this.memoryHistoryIndex] = this.memoryUsage;
                this.memoryHistoryIndex = (this.memoryHistoryIndex + 1) % this.memoryHistory.length;
            }
            
            // Update UI if available
            this.updateUI();
        }
        
        return delta / 1000; // Return delta in seconds for consistency
    }
    
    /**
     * Measure execution time of code blocks
     * @param {string} name - Name of the timing operation
     * @param {number} startTime - Starting timestamp from performance.now()
     * @returns {number} - The duration in milliseconds
     */
    measureTime(name, startTime) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (!this.timers[name]) {
            this.timers[name] = {
                count: 0,
                totalTime: 0,
                average: 0,
                min: Infinity,
                max: 0
            };
        }
        
        const timer = this.timers[name];
        timer.count++;
        timer.totalTime += duration;
        timer.average = timer.totalTime / timer.count;
        timer.min = Math.min(timer.min, duration);
        timer.max = Math.max(timer.max, duration);
        
        return duration;
    }
    
    /**
     * Update UI with performance data
     */
    updateUI() {
        const fpsElement = document.getElementById('fps');
        const particleCountElement = document.getElementById('particle-count');
        const memoryUsageElement = document.getElementById('memory-usage');
        
        if (fpsElement) {
            fpsElement.textContent = this.fps.toString();
            
            // Color-code based on performance
            if (this.fps < PERFORMANCE_THRESHOLDS.lowFPS) {
                fpsElement.style.color = 'red';
            } else if (this.fps < PERFORMANCE_THRESHOLDS.targetFPS * 0.8) {
                fpsElement.style.color = 'orange';
            } else {
                fpsElement.style.color = 'green';
            }
        }
        
        if (particleCountElement) {
            particleCountElement.textContent = this.particleCount || '0';
        }
        
        if (memoryUsageElement) {
            const mbUsed = Math.round(this.memoryUsage / (1024 * 1024));
            memoryUsageElement.textContent = mbUsed.toString();
        }
    }
    
    /**
     * Track changes in particle count
     * @param {number} count - Current particle count
     */
    updateParticleCount(count) {
        this.particleCount = count;
        this.metrics.particleCount = count;
    }
    
    /**
     * Check if performance is currently low
     * @returns {boolean} - True if performance is below target
     */
    isLowPerformance() {
        return this.getAverageFps() < PERFORMANCE_THRESHOLDS.lowFPS;
    }
    
    /**
     * Get average FPS from history
     * @returns {number} - Average FPS
     */
    getAverageFps() {
        return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    }
    
    /**
     * Get average memory usage from history
     * @returns {number} - Average memory usage in bytes
     */
    getAverageMemory() {
        return this.memoryHistory.reduce((sum, mem) => sum + mem, 0) / this.memoryHistory.length;
    }
    
    /**
     * Get current performance quality level
     * @returns {string} - Quality level name
     */
    getQualityLevel() {
        return this.qualityLevel;
    }
    
    /**
     * Reset all performance timers
     */
    resetTimers() {
        this.timers = {};
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
    }
    
    /**
     * Get detailed performance report
     * @returns {Object} - Performance data
     */
    getPerformanceReport() {
        return {
            fps: {
                current: this.fps,
                average: this.getAverageFps(),
                history: [...this.fpsHistory]
            },
            memory: {
                current: this.memoryUsage,
                average: this.getAverageMemory(),
                history: [...this.memoryHistory]
            },
            particles: this.particleCount,
            timers: {...this.timers},
            qualityLevel: this.qualityLevel
        };
    }
}