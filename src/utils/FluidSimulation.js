import { StateManager } from '../stateManager.js';

/**
 * FluidSimulation provides grid-based fluid dynamics for lake particles
 */
export class FluidSimulation {
    constructor(options = {}) {
        this.width = options.width || 32;
        this.height = options.height || 32;
        this.resolution = options.resolution || 20; // Pixels per cell
        this.iterations = options.iterations || 4;
        this.viscosity = options.viscosity || 0.3;
        this.diffusion = options.diffusion || 0.5;
        
        // Core fluid simulation arrays
        this.velocityX = new Float32Array(this.width * this.height);
        this.velocityY = new Float32Array(this.width * this.height);
        this.prevVelocityX = new Float32Array(this.width * this.height);
        this.prevVelocityY = new Float32Array(this.width * this.height);
        this.density = new Float32Array(this.width * this.height);
        this.prevDensity = new Float32Array(this.width * this.height);
        
        // Performance optimization
        this.simulationQuality = 1.0; // Scale for adaptive quality
        this.lastUpdateTime = 0;
        this.updateInterval = 16; // ms
        
        // Debug visualization
        this.debugMode = options.debug || false;
        
        console.log(`[FluidSimulation] Initialized ${this.width}x${this.height} grid`);
        
        // Create debug elements if in debug mode
        if (this.debugMode) {
            this.createDebugElements();
        }
    }
    
    /**
     * Get cell index from grid coordinates
     * @param {number} x - Grid x coordinate
     * @param {number} y - Grid y coordinate
     * @returns {number} Cell index
     */
    IX(x, y) {
        return Math.max(0, Math.min(this.width - 1, x)) + 
               Math.max(0, Math.min(this.height - 1, y)) * this.width;
    }
    
    /**
     * Add velocity force to the fluid at a specific point
     * @param {number} x - World x coordinate
     * @param {number} y - World y coordinate 
     * @param {number} velX - X velocity to add
     * @param {number} velY - Y velocity to add
     * @param {number} radius - Radius of influence
     */
    addVelocity(x, y, velX, velY, radius = 1) {
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor(x / this.resolution);
        const gridY = Math.floor(y / this.resolution);
        
        // Apply force to affected cells
        const cells = this.getCellsInRadius(gridX, gridY, radius);
        
        cells.forEach(cell => {
            // Calculate falloff based on distance from center
            const dist = Math.sqrt(
                Math.pow(cell.x - gridX, 2) + 
                Math.pow(cell.y - gridY, 2)
            );
            const falloff = Math.max(0, 1 - dist / radius);
            
            // Apply velocity with falloff
            const idx = this.IX(cell.x, cell.y);
            this.velocityX[idx] += velX * falloff;
            this.velocityY[idx] += velY * falloff;
        });
    }
    
    /**
     * Get all grid cells within a radius
     * @param {number} centerX - Center grid x coordinate
     * @param {number} centerY - Center grid y coordinate
     * @param {number} radius - Radius in grid cells
     * @returns {Array} Array of cell coordinates
     */
    getCellsInRadius(centerX, centerY, radius) {
        const cells = [];
        const radiusCeil = Math.ceil(radius);
        
        for (let x = centerX - radiusCeil; x <= centerX + radiusCeil; x++) {
            for (let y = centerY - radiusCeil; y <= centerY + radiusCeil; y++) {
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    const dist = Math.sqrt(
                        Math.pow(x - centerX, 2) + 
                        Math.pow(y - centerY, 2)
                    );
                    
                    if (dist <= radius) {
                        cells.push({ x, y });
                    }
                }
            }
        }
        
        return cells;
    }
    
    /**
     * Update the fluid simulation
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt = 16.67) {
        const now = performance.now();
        if (now - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        this.lastUpdateTime = now;
        
        // Scale simulation steps based on quality level
        const steps = Math.max(1, Math.round(this.iterations * this.simulationQuality));
        
        // Run multiple iterations for stability
        for (let i = 0; i < steps; i++) {
            // Velocity diffusion
            this.diffuse(1, this.prevVelocityX, this.velocityX, this.viscosity, dt);
            this.diffuse(2, this.prevVelocityY, this.velocityY, this.viscosity, dt);
            
            // Project to ensure mass conservation (incompressibility)
            this.project(this.prevVelocityX, this.prevVelocityY, this.velocityX, this.velocityY);
            
            // Advection - move velocity with the fluid flow
            this.advect(1, this.velocityX, this.prevVelocityX, this.prevVelocityX, this.prevVelocityY, dt);
            this.advect(2, this.velocityY, this.prevVelocityY, this.prevVelocityX, this.prevVelocityY, dt);
            
            // Project again after advection
            this.project(this.velocityX, this.velocityY, this.prevVelocityX, this.prevVelocityY);
            
            // Density diffusion and advection
            this.diffuse(0, this.prevDensity, this.density, this.diffusion, dt);
            this.advect(0, this.density, this.prevDensity, this.velocityX, this.velocityY, dt);
        }
        
        // Update debug visualization
        if (this.debugMode) {
            this.updateDebugVisualization();
        }
    }
    
    /**
     * Get velocity at world position
     * @param {number} x - World x coordinate
     * @param {number} y - World y coordinate
     * @returns {Object} Velocity vector {x, y}
     */
    getVelocityAt(x, y) {
        // Convert world coordinates to grid coordinates
        const gridX = x / this.resolution;
        const gridY = y / this.resolution;
        
        // Interpolate velocity from surrounding grid cells
        return this.interpolateVelocity(gridX, gridY);
    }
    
    /**
     * Interpolate velocity from grid cells
     * @param {number} x - Grid x coordinate (can be fractional)
     * @param {number} y - Grid y coordinate (can be fractional)
     * @returns {Object} Interpolated velocity vector {x, y}
     */
    interpolateVelocity(x, y) {
        // Ensure coordinates are within bounds
        x = Math.max(0, Math.min(this.width - 1.001, x));
        y = Math.max(0, Math.min(this.height - 1.001, y));
        
        // Get integer and fractional parts
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        
        // Calculate interpolation factors
        const sx = x - x0;
        const sy = y - y0;
        
        // Get velocity values at surrounding cells
        const vx00 = this.velocityX[this.IX(x0, y0)];
        const vx10 = this.velocityX[this.IX(x1, y0)];
        const vx01 = this.velocityX[this.IX(x0, y1)];
        const vx11 = this.velocityX[this.IX(x1, y1)];
        
        const vy00 = this.velocityY[this.IX(x0, y0)];
        const vy10 = this.velocityY[this.IX(x1, y0)];
        const vy01 = this.velocityY[this.IX(x0, y1)];
        const vy11 = this.velocityY[this.IX(x1, y1)];
        
        // Bilinear interpolation
        const vx = 
            vx00 * (1 - sx) * (1 - sy) +
            vx10 * sx * (1 - sy) +
            vx01 * (1 - sx) * sy +
            vx11 * sx * sy;
            
        const vy = 
            vy00 * (1 - sx) * (1 - sy) +
            vy10 * sx * (1 - sy) +
            vy01 * (1 - sx) * sy +
            vy11 * sx * sy;
            
        return { x: vx, y: vy };
    }
    
    /**
     * Core fluid simulation method: Diffusion
     */
    diffuse(b, x, x0, diffusion, dt) {
        const a = dt * diffusion * (this.width - 2) * (this.height - 2);
        this.linearSolve(b, x, x0, a, 1 + 6 * a);
    }
    
    /**
     * Core fluid simulation method: Linear solver
     */
    linearSolve(b, x, x0, a, c) {
        const invC = 1 / c;
        
        for (let k = 0; k < this.iterations; k++) {
            for (let j = 1; j < this.height - 1; j++) {
                for (let i = 1; i < this.width - 1; i++) {
                    x[this.IX(i, j)] = (
                        x0[this.IX(i, j)] + 
                        a * (
                            x[this.IX(i+1, j)] +
                            x[this.IX(i-1, j)] +
                            x[this.IX(i, j+1)] +
                            x[this.IX(i, j-1)]
                        )
                    ) * invC;
                }
            }
            
            this.setBoundary(b, x);
        }
    }
    
    /**
     * Core fluid simulation method: Advection
     */
    advect(b, d, d0, velocX, velocY, dt) {
        const dtx = dt * (this.width - 2);
        const dty = dt * (this.height - 2);
        
        for (let j = 1; j < this.height - 1; j++) {
            for (let i = 1; i < this.width - 1; i++) {
                // Trace particle position backward
                let x = i - dtx * velocX[this.IX(i, j)];
                let y = j - dty * velocY[this.IX(i, j)];
                
                // Ensure within bounds
                x = Math.max(0.5, Math.min(this.width - 1.5, x));
                y = Math.max(0.5, Math.min(this.height - 1.5, y));
                
                // Get integer and fractional parts
                const i0 = Math.floor(x);
                const j0 = Math.floor(y);
                const i1 = i0 + 1;
                const j1 = j0 + 1;
                
                // Calculate interpolation factors
                const s1 = x - i0;
                const s0 = 1 - s1;
                const t1 = y - j0;
                const t0 = 1 - t1;
                
                // Bilinear interpolation
                d[this.IX(i, j)] = 
                    s0 * (t0 * d0[this.IX(i0, j0)] + t1 * d0[this.IX(i0, j1)]) +
                    s1 * (t0 * d0[this.IX(i1, j0)] + t1 * d0[this.IX(i1, j1)]);
            }
        }
        
        this.setBoundary(b, d);
    }
    
    /**
     * Core fluid simulation method: Project (enforce incompressibility)
     */
    project(velocX, velocY, p, div) {
        // Calculate velocity divergence
        for (let j = 1; j < this.height - 1; j++) {
            for (let i = 1; i < this.width - 1; i++) {
                div[this.IX(i, j)] = -0.5 * (
                    velocX[this.IX(i+1, j)] - velocX[this.IX(i-1, j)] +
                    velocY[this.IX(i, j+1)] - velocY[this.IX(i, j-1)]
                ) / this.width;
                
                p[this.IX(i, j)] = 0;
            }
        }
        
        this.setBoundary(0, div);
        this.setBoundary(0, p);
        this.linearSolve(0, p, div, 1, 6);
        
        // Subtract pressure gradient from velocity
        for (let j = 1; j < this.height - 1; j++) {
            for (let i = 1; i < this.width - 1; i++) {
                velocX[this.IX(i, j)] -= 0.5 * (p[this.IX(i+1, j)] - p[this.IX(i-1, j)]) * this.width;
                velocY[this.IX(i, j)] -= 0.5 * (p[this.IX(i, j+1)] - p[this.IX(i, j-1)]) * this.height;
            }
        }
        
        this.setBoundary(1, velocX);
        this.setBoundary(2, velocY);
    }
    
    /**
     * Apply boundary conditions
     * @param {number} b - Boundary type (0: scalar, 1: horizontal velocity, 2: vertical velocity)
     * @param {Float32Array} x - Array to apply boundary conditions to
     */
    setBoundary(b, x) {
        // Set boundary cells to maintain boundary conditions
        for (let i = 1; i < this.width - 1; i++) {
            x[this.IX(i, 0)] = b === 2 ? -x[this.IX(i, 1)] : x[this.IX(i, 1)];
            x[this.IX(i, this.height - 1)] = b === 2 ? -x[this.IX(i, this.height - 2)] : x[this.IX(i, this.height - 2)];
        }
        
        for (let j = 1; j < this.height - 1; j++) {
            x[this.IX(0, j)] = b === 1 ? -x[this.IX(1, j)] : x[this.IX(1, j)];
            x[this.IX(this.width - 1, j)] = b === 1 ? -x[this.IX(this.width - 2, j)] : x[this.IX(this.width - 2, j)];
        }
        
        // Set corners
        x[this.IX(0, 0)] = 0.5 * (x[this.IX(1, 0)] + x[this.IX(0, 1)]);
        x[this.IX(0, this.height - 1)] = 0.5 * (x[this.IX(1, this.height - 1)] + x[this.IX(0, this.height - 2)]);
        x[this.IX(this.width - 1, 0)] = 0.5 * (x[this.IX(this.width - 2, 0)] + x[this.IX(this.width - 1, 1)]);
        x[this.IX(this.width - 1, this.height - 1)] = 0.5 * (x[this.IX(this.width - 2, this.height - 1)] + x[this.IX(this.width - 1, this.height - 2)]);
    }
    
    /**
     * Set simulation quality (0-1)
     * @param {number} quality - Quality level
     */
    setQuality(quality) {
        this.simulationQuality = Math.max(0.2, Math.min(1.0, quality));
        this.updateInterval = quality < 0.5 ? 32 : 16;
        
        console.log(`[FluidSimulation] Set quality to ${this.simulationQuality.toFixed(2)}`);
    }
    
    /**
     * Create debug visualization elements
     */
    createDebugElements() {
        // Skip if already created
        if (this.debugContainer) return;
        
        this.debugContainer = document.createElement('div');
        this.debugContainer.className = 'fluid-debug';
        this.debugContainer.style.position = 'absolute';
        this.debugContainer.style.top = '10px';
        this.debugContainer.style.right = '10px';
        this.debugContainer.style.width = `${this.width * 10}px`;
        this.debugContainer.style.height = `${this.height * 10}px`;
        this.debugContainer.style.backgroundColor = 'rgba(0,0,0,0.3)';
        this.debugContainer.style.zIndex = '1000';
        this.debugContainer.style.pointerEvents = 'none';
        
        // Create cells
        this.debugCells = [];
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = document.createElement('div');
                cell.className = 'fluid-cell';
                cell.style.position = 'absolute';
                cell.style.width = '8px';
                cell.style.height = '8px';
                cell.style.left = `${x * 10 + 1}px`;
                cell.style.top = `${y * 10 + 1}px`;
                cell.style.backgroundColor = 'rgba(255,255,255,0.3)';
                
                // Create velocity vector
                const vector = document.createElement('div');
                vector.className = 'fluid-vector';
                vector.style.position = 'absolute';
                vector.style.width = '1px';
                vector.style.height = '6px';
                vector.style.backgroundColor = '#ff0000';
                vector.style.left = '4px';
                vector.style.top = '1px';
                vector.style.transformOrigin = '0 0';
                
                cell.appendChild(vector);
                this.debugContainer.appendChild(cell);
                
                this.debugCells.push({
                    cell,
                    vector,
                    x,
                    y
                });
            }
        }
        
        document.body.appendChild(this.debugContainer);
        
        // Toggle button
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Toggle Fluid Debug';
        toggleButton.style.position = 'absolute';
        toggleButton.style.top = '10px';
        toggleButton.style.right = '10px';
        toggleButton.style.zIndex = '1001';
        
        toggleButton.addEventListener('click', () => {
            this.debugContainer.style.display = 
                this.debugContainer.style.display === 'none' ? 'block' : 'none';
        });
        
        document.body.appendChild(toggleButton);
    }
    
    /**
     * Update debug visualization
     */
    updateDebugVisualization() {
        if (!this.debugCells) return;
        
        this.debugCells.forEach(debugCell => {
            const idx = this.IX(debugCell.x, debugCell.y);
            const vx = this.velocityX[idx];
            const vy = this.velocityY[idx];
            const magnitude = Math.sqrt(vx * vx + vy * vy);
            
            // Update cell color based on density
            const density = this.density[idx];
            const densityColor = `rgba(0, 128, 255, ${Math.min(1, density * 0.3)})`;
            debugCell.cell.style.backgroundColor = densityColor;
            
            // Update vector direction and length
            if (magnitude > 0.01) {
                const length = Math.min(8, magnitude * 20);
                const angle = Math.atan2(vy, vx) * (180 / Math.PI);
                
                debugCell.vector.style.height = `${length}px`;
                debugCell.vector.style.transform = `rotate(${angle}deg)`;
                
                // Change color based on velocity magnitude
                const colorIntensity = Math.min(255, Math.floor(magnitude * 500));
                debugCell.vector.style.backgroundColor = `rgb(${colorIntensity}, 0, ${255 - colorIntensity})`;
            } else {
                debugCell.vector.style.height = '0px';
            }
        });
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        if (this.debugContainer && this.debugContainer.parentNode) {
            this.debugContainer.parentNode.removeChild(this.debugContainer);
        }
        
        this.velocityX = null;
        this.velocityY = null;
        this.prevVelocityX = null;
        this.prevVelocityY = null;
        this.density = null;
        this.prevDensity = null;
        
        console.log('[FluidSimulation] Disposed');
    }
}