/**
 * Web Worker for Perlin noise calculations
 * Offloads computationally intensive noise generation from the main thread
 */

// Perlin noise implementation
class Perlin {
    constructor() {
        this.permutation = new Array(512);
        this.initialized = false;
    }

    init(seed) {
        // Initialize permutation table
        const p = new Array(256);
        for (let i = 0; i < 256; i++) {
            p[i] = (typeof seed === 'function') ? seed() : Math.floor(Math.random() * 256);
        }
        
        // Extend permutation for easier indexing
        for (let i = 0; i < 512; i++) {
            this.permutation[i] = p[i & 255];
        }
        
        this.initialized = true;
        return this;
    }

    noise2D(x, y) {
        if (!this.initialized) {
            this.init();
        }
        
        // Find unit cube that contains point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        // Get relative xy coordinates of point within unit cube
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        // Compute fade curves
        const u = this.fade(x);
        const v = this.fade(y);
        
        // Hash coordinates of the 4 square corners
        const A = this.permutation[X] + Y;
        const AA = this.permutation[A];
        const AB = this.permutation[A + 1];
        const B = this.permutation[X + 1] + Y;
        const BA = this.permutation[B];
        const BB = this.permutation[B + 1];
        
        // Calculate noise values at four corners
        const v1 = this.lerp(
            this.grad(this.permutation[AA], x, y, 0),
            this.grad(this.permutation[BA], x - 1, y, 0),
            u
        );
        const v2 = this.lerp(
            this.grad(this.permutation[AB], x, y - 1, 0),
            this.grad(this.permutation[BB], x - 1, y - 1, 0),
            u
        );
        
        // Combine noise values for final result
        return (this.lerp(v1, v2, v) + 1) / 2; // Normalize to 0-1
    }

    fade(t) {
        // Improved smoothstep function
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(a, b, t) {
        // Linear interpolation
        return a + t * (b - a);
    }

    grad(hash, x, y, z) {
        // Gradients
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
}

// Initialize Perlin noise generator
const perlin = new Perlin();

// Set up message handler
self.onmessage = (e) => {
    const { type, data } = e.data;
    
    switch (type) {
        case 'init':
            perlin.init(data.seed);
            self.postMessage({ type: 'initialized' });
            break;
            
        case 'noise2D':
            const { x, y, width, height, scale } = data;
            const noiseData = new Float32Array(width * height);
            
            // Generate noise values
            for (let i = 0; i < width; i++) {
                for (let j = 0; j < height; j++) {
                    const nx = (x + i) * scale;
                    const ny = (y + j) * scale;
                    noiseData[i + j * width] = perlin.noise2D(nx, ny);
                }
            }
            
            self.postMessage({ 
                type: 'noise2D', 
                noiseData: noiseData,
                width: width,
                height: height
            }, [noiseData.buffer]); // Transfer ownership of the buffer
            break;
            
        default:
            self.postMessage({ type: 'error', message: 'Unknown command' });
    }
};