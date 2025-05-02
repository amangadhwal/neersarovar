/**
 * GridOptimizer for efficient spatial partitioning and culling
 */
export class GridOptimizer {
    constructor(map) {
        this.map = map;
        this.resolution = 16; // Default grid resolution
        this.viewportBounds = this.getViewportBounds();
        this.activeCells = new Set();
        this.pooledCells = [];
        this.dynamicResolution = true;
        
        // Initial resolution based on device capabilities
        this.adjustResolutionByDeviceCapability();
        
        // Update viewport bounds when map moves
        this.map.on('move', () => {
            this.viewportBounds = this.getViewportBounds();
            this.updateActiveCells();
        });
        
        // Monitor performance and adjust resolution if needed
        this.performanceCheckInterval = setInterval(() => {
            this.adjustResolutionByPerformance();
        }, 5000);
    }
    
    getViewportBounds() {
        const bounds = this.map.getBounds();
        return {
            nw: bounds.getNorthWest(),
            ne: bounds.getNorthEast(),
            sw: bounds.getSouthWest(),
            se: bounds.getSouthEast(),
            width: this.map.getContainer().offsetWidth,
            height: this.map.getContainer().offsetHeight
        };
    }
    
    adjustResolutionByDeviceCapability() {
        const pixelRatio = window.devicePixelRatio || 1;
        
        if (pixelRatio > 2) {
            this.resolution = 8;
        } else if (pixelRatio > 1) {
            this.resolution = 12;
        } else {
            this.resolution = 16;
        }
        
        const screenWidth = window.innerWidth;
        if (screenWidth < 768) {
            this.resolution = Math.min(this.resolution, 8);
        }
    }
    
    adjustResolutionByPerformance() {
        if (!this.dynamicResolution) return;
        
        const fps = window.StateManager.perfMonitor.metrics.fps;
        const targetFPS = window.PERFORMANCE_THRESHOLDS?.targetFPS || 60;
        const lowFPS = window.PERFORMANCE_THRESHOLDS?.lowFPS || 30;
        
        if (fps < lowFPS && this.resolution > 8) {
            this.resolution -= 2;
        } else if (fps > targetFPS * 0.9 && this.resolution < 24) {
            this.resolution += 1;
        }
    }
}