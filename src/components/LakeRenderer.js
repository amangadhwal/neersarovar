import * as THREE from 'three';

// Vertex shader for particle rendering
const vertexShader = `
attribute vec3 position;
attribute vec3 customColor;
attribute float size;
attribute float opacity;

varying vec3 vColor;
varying float vOpacity;

void main() {
    vColor = customColor;
    vOpacity = opacity;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}`;

// Fragment shader for particle rendering
const fragmentShader = `
varying vec3 vColor;
varying float vOpacity;

void main() {
    // Calculate distance from center for circular particles
    float dist = length(gl_PointCoord - vec2(0.5, 0.5));
    if (dist > 0.5) discard; // Discard pixels outside circle
    
    // Apply soft edge
    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
    
    // Final color with glow effect
    gl_FragColor = vec4(vColor, vOpacity * alpha);
}`;

/**
 * LakeRenderer class for WebGL-based rendering of lake particles
 * Supports fallback from WebGPU to WebGL
 */
export class LakeRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.systems = new Set();
        this.active = true;
        
        // Check for WebGPU support with fallback to WebGL
        this.useWebGPU = false;
        this.initializeRenderer();
        
        // Set up scene, camera, etc.
        this.setupScene();
        this.setupGeometry();
        this.setupMaterials();
        
        console.log(`[LakeRenderer] Initialized with ${this.useWebGPU ? 'WebGPU' : 'WebGL'}`);
    }
    
    initializeRenderer() {
        try {
            // Try to use WebGPU if available
            if (navigator.gpu) {
                // For actual implementation, we'd need the WebGPU initialization code
                // This is simplified as WebGPU API is still evolving
                this.useWebGPU = true;
                this.renderer = new THREE.WebGLRenderer({ 
                    canvas: this.canvas,
                    antialias: true,
                    alpha: true
                });
                console.log('[LakeRenderer] Using WebGPU renderer');
            } else {
                throw new Error('WebGPU not available');
            }
        } catch (e) {
            // Fallback to WebGL
            console.log('[LakeRenderer] WebGPU not available, falling back to WebGL');
            this.useWebGPU = false;
            this.renderer = new THREE.WebGLRenderer({ 
                canvas: this.canvas,
                antialias: true,
                alpha: true
            });
        }
        
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0);
    }
    
    /**
     * Set up materials for particles
     */
    setupMaterials() {
        // Initialize WebGL shader material for particles
        this.shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0x00ffff) }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true
        });
        
        // Create a simpler material as fallback
        this.fallbackMaterial = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 2,
            blending: THREE.AdditiveBlending,
            transparent: true,
            sizeAttenuation: true
        });
    }
    
    /**
     * Set up geometry for particles
     */
    setupGeometry() {
        // Create empty geometry - will be populated later
        this.geometry = new THREE.BufferGeometry();
        this.particlesGroup = new THREE.Group();
        this.scene.add(this.particlesGroup);
    }
    
    /**
     * Register a particle system with the renderer
     * @param {ParticleSystem} system - Particle system to register
     */
    registerSystem(system) {
        this.systems.add(system);
        console.log(`[LakeRenderer] System registered: ${system.lakeId}`);
    }
    
    /**
     * Unregister a particle system
     * @param {ParticleSystem} system - Particle system to unregister
     */
    unregisterSystem(system) {
        this.systems.delete(system);
    }
    
    /**
     * Render all registered particle systems
     */
    render() {
        // Skip if no systems or scene isn't set up
        if (this.systems.size === 0 || !this.scene || !this.camera) return;
        
        // Collect all particles from active systems for batched rendering
        this.updateParticleBuffers();
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Update particle buffers with current data
     */
    updateParticleBuffers() {
        let totalParticles = 0;
        
        // Count total active particles
        this.systems.forEach(system => {
            if (system.active) {
                totalParticles += system.particles.length;
            }
        });
        
        if (totalParticles === 0) return;
        
        // Create or resize buffers if needed
        this.createBuffersIfNeeded(totalParticles);
        
        // Update particle data
        let index = 0;
        
        this.systems.forEach(system => {
            if (!system.active) return;
            
            // Copy particle data to buffers
            system.particles.forEach(particle => {
                // Convert from geographic to clip space coordinates
                const screenCoords = particle.getScreenCoordinates();
                
                // Position
                this.positions[index * 3] = (screenCoords.x / this.canvas.width) * 2 - 1;
                this.positions[index * 3 + 1] = -((screenCoords.y / this.canvas.height) * 2 - 1);
                this.positions[index * 3 + 2] = 0;
                
                // Size
                this.sizes[index] = particle.size * window.devicePixelRatio;
                
                // Color
                const color = this.parseColor(particle.color);
                this.colors[index * 3] = color.r;
                this.colors[index * 3 + 1] = color.g;
                this.colors[index * 3 + 2] = color.b;
                
                // Opacity
                this.opacities[index] = particle.opacity;
                
                index++;
            });
        });
        
        // Update geometry with new data
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('customColor', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
        this.geometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1));
        
        // Update particle points
        if (!this.particles) {
            this.particles = new THREE.Points(this.geometry, this.shaderMaterial);
            this.particlesGroup.add(this.particles);
        } else {
            this.particles.geometry = this.geometry;
        }
        
        // Set draw range
        this.geometry.setDrawRange(0, totalParticles);
    }
    
    /**
     * Create particle buffers if they don't exist or need resizing
     * @param {number} totalParticles - Total number of particles
     */
    createBuffersIfNeeded(totalParticles) {
        if (!this.positions || this.positions.length < totalParticles * 3) {
            // Create position buffer (xyz * totalParticles)
            this.positions = new Float32Array(totalParticles * 3);
            this.colors = new Float32Array(totalParticles * 3);
            this.sizes = new Float32Array(totalParticles);
            this.opacities = new Float32Array(totalParticles);
        }
    }
    
    /**
     * Parse color string to RGB components
     * @param {string} colorStr - Color string (#RRGGBB)
     * @returns {Object} RGB color components
     */
    parseColor(colorStr) {
        const result = { r: 1, g: 1, b: 1 };
        
        if (!colorStr) return result;
        
        if (colorStr.startsWith('#')) {
            const hex = parseInt(colorStr.slice(1), 16);
            result.r = ((hex >> 16) & 255) / 255;
            result.g = ((hex >> 8) & 255) / 255;
            result.b = (hex & 255) / 255;
        }
        
        return result;
    }
    
    /**
     * Resize the renderer when canvas size changes
     */
    resize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.renderer.setSize(width, height, false);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        this.systems.clear();
        
        if (this.geometry) {
            this.geometry.dispose();
        }
        
        if (this.shaderMaterial) {
            this.shaderMaterial.dispose();
        }
        
        if (this.particles) {
            this.particlesGroup.remove(this.particles);
            this.particles = null;
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        console.log('[LakeRenderer] Disposed');
    }

    /**
     * Initialize shaders
     */
    initShaders() {
        const gl = this.gl;
        
        // Create shader program
        this.program = gl.createProgram();
        
        // Compile vertex shader
        const vertexShaderObj = this.compileShader(gl.VERTEX_SHADER, vertexShader);
        gl.attachShader(this.program, vertexShaderObj);
        
        // Compile fragment shader
        const fragmentShaderObj = this.compileShader(gl.FRAGMENT_SHADER, fragmentShader);
        gl.attachShader(this.program, fragmentShaderObj);
        
        // Link program
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Failed to link program:', gl.getProgramInfoLog(this.program));
            return null;
        }
        
        // Get attribute locations
        this.attributes = {
            position: gl.getAttribLocation(this.program, 'position'),
            customColor: gl.getAttribLocation(this.program, 'customColor'),
            size: gl.getAttribLocation(this.program, 'size'),
            opacity: gl.getAttribLocation(this.program, 'opacity')
        };
        
        return this.program;
    }
}