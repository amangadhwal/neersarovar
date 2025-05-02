/**
 * SpatialGrid for efficient spatial partitioning and culling
 * Reduces rendering load by only processing particles in visible areas
 */
export class SpatialGrid {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.grid = new Map();
        this.visibleCells = new Set();
        this.frameCount = 0;
        
        // Performance metrics
        this.metrics = {
            particles: 0,
            activeCells: 0,
            culledParticles: 0,
            lastUpdate: performance.now()
        };
        
        console.log(`[SpatialGrid] Initialized with cell size: ${this.cellSize}px`);
    }
    
    // Generate cell key from coordinates
    key(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }
    
    // Insert a particle into the grid
    insert(particle) {
        if (!particle || !particle.position) return;
        
        // Get screen coordinates
        const x = particle.screenX || 0;
        const y = particle.screenY || 0;
        
        // Get cell key
        const cellKey = this.key(x, y);
        
        // Add to grid
        if (!this.grid.has(cellKey)) {
            this.grid.set(cellKey, []);
        }
        
        this.grid.get(cellKey).push(particle);
        this.metrics.particles++;
    }
    
    // Clear the grid for next frame
    clear() {
        this.grid.clear();
        this.frameCount++;
        this.metrics.particles = 0;
        this.metrics.activeCells = 0;
        this.metrics.culledParticles = 0;
        
        // Update metrics periodically
        if (this.frameCount % 60 === 0) {
            this.updateMetrics();
        }
    }
    
    // Update visible cells based on viewport
    updateVisibleCells(bounds) {
        this.visibleCells.clear();
        
        if (!bounds) return;
        
        // Calculate cell range
        const minCellX = Math.floor(bounds.left / this.cellSize);
        const maxCellX = Math.ceil(bounds.right / this.cellSize);
        const minCellY = Math.floor(bounds.top / this.cellSize);
        const maxCellY = Math.ceil(bounds.bottom / this.cellSize);
        
        // Add all cells in range to visible set
        for (let x = minCellX; x <= maxCellX; x++) {
            for (let y = minCellY; y <= maxCellY; y++) {
                this.visibleCells.add(this.key(x * this.cellSize, y * this.cellSize));
            }
        }
        
        this.metrics.activeCells = this.visibleCells.size;
    }
    
    // Efficient query for particles in a region
    query(bounds) {
        if (!bounds) return [];
        
        // Update visible cells first
        this.updateVisibleCells(bounds);
        
        const result = [];
        let visibleCount = 0;
        
        // Only iterate over cells that are in both the grid and the visible set
        this.grid.forEach((particles, cellKey) => {
            if (this.visibleCells.has(cellKey)) {
                result.push(...particles);
                visibleCount += particles.length;
            } else {
                this.metrics.culledParticles += particles.length;
            }
        });
        
        return result;
    }
    
    // Update performance metrics
    updateMetrics() {
        const now = performance.now();
        const elapsed = now - this.metrics.lastUpdate;
        
        if (elapsed > 0 && window.perfMonitor) {
            window.perfMonitor.metrics.spatialGridCulling = {
                totalParticles: this.metrics.particles,
                visibleParticles: this.metrics.particles - this.metrics.culledParticles,
                culledParticles: this.metrics.culledParticles,
                activeCells: this.metrics.activeCells,
                cullingRatio: this.metrics.particles ? this.metrics.culledParticles / this.metrics.particles : 0
            };
        }
        
        this.metrics.lastUpdate = now;
        this.frameCount = 0;
    }
}