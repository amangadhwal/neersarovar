import * as THREE from 'three';

/**
 * CoinAttributionSystem manages the 3D coin model for attribution
 */
export class CoinAttributionSystem {
    constructor(container) {
        this.container = typeof container === 'string' ? 
            document.getElementById(container) : container;
            
        if (!this.container) {
            console.error('[CoinAttributionSystem] Container not found');
            return;
        }
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            alpha: true,
            antialias: true 
        });
        
        this.coin = null;
        this.light = null;
        this.isAnimating = false;
        this.lastFrameTime = 0;
        
        this.setupRenderer();
        this.setupLighting();
        
        console.log('[CoinAttributionSystem] Initialized');
    }
    
    setupRenderer() {
        // Set up renderer
        this.renderer.setSize(120, 120);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);
        
        // Set up camera
        this.camera.position.z = 5;
    }
    
    setupLighting() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight('#ffffff', 0.5);
        this.scene.add(ambientLight);
        
        // Add directional light
        this.light = new THREE.DirectionalLight('#ffffff', 1);
        this.light.position.set(5, 5, 7);
        this.scene.add(this.light);
        
        // Add point light for shine effect
        const pointLight = new THREE.PointLight('#ffd700', 1, 10);
        pointLight.position.set(2, 0, 4);
        this.scene.add(pointLight);
    }
    
    async loadModel() {
        // Create a simple coin if no model is loaded
        if (!this.coin) {
            this.createSimpleCoin();
        }
        
        // Start animation
        this.startAnimation();
    }
    
    /**
     * Create a simplified coin model when loading fails
     */
    createSimpleCoin() {
        const geometry = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xffcd6b,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x3a3100,
            emissiveIntensity: 0.2
        });
        
        this.coin = new THREE.Mesh(geometry, material);
        this.scene.add(this.coin);
        
        // Add coin details (texture, relief, etc)
        this.addCoinDetails();
    }
    
    /**
     * Add detailed elements to the coin
     */
    addCoinDetails() {
        // Add ring around the coin
        const ringGeometry = new THREE.TorusGeometry(0.85, 0.05, 16, 100);
        const ringMaterial = new THREE.MeshPhongMaterial({
            color: '#d4af37',
            metalness: 0.9,
            roughness: 0.1
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.z = 0.11;
        this.coin.add(ring);
        
        // Add embossed design on the coin face
        const designGeometry = new THREE.CircleGeometry(0.6, 32);
        const designMaterial = new THREE.MeshPhongMaterial({
            color: '#ffcd6b',
            metalness: 0.8,
            roughness: 0.3,
            emissive: '#3a3100',
            emissiveIntensity: 0.3,
            bumpMap: this.createBumpTexture(),
            bumpScale: 0.05
        });
        const design = new THREE.Mesh(designGeometry, designMaterial);
        design.position.z = 0.07;
        this.coin.add(design);
    }
    
    /**
     * Create a bump texture for coin relief
     */
    createBumpTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 256, 256);
        
        // Draw circle
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(128, 128, 100, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw design elements
        ctx.fillStyle = 'gray';
        ctx.font = '48px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ॐ', 128, 128);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }
    
    stopAnimation() {
        this.isAnimating = false;
    }
    
    animate() {
        if (!this.isAnimating) return;
        
        requestAnimationFrame(this.animate.bind(this));
        
        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        
        if (this.coin) {
            // Rotate the coin
            this.coin.rotation.y += 0.8 * deltaTime;
            
            // Add slight wobble
            this.coin.rotation.x = Math.sin(now * 0.001) * 0.1;
            this.coin.rotation.z = Math.cos(now * 0.0015) * 0.05;
        }
        
        // Update light position for dynamic lighting
        if (this.light) {
            this.light.position.x = Math.sin(now * 0.001) * 5;
            this.light.position.y = Math.cos(now * 0.001) * 5;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Synchronize coin with map state 
     * @param {Object} map - MapLibre map instance
     */
    synchronizeWithMap(map) {
        if (!this.coin || !map) return;
        
        // Sync coin rotation with map bearing
        const mapBearing = map.getBearing();
        this.coin.rotation.y = (mapBearing * Math.PI / 180) + (Date.now() * 0.0005);
        
        // Tilt based on map pitch
        const mapPitch = map.getPitch();
        this.coin.rotation.x = (mapPitch * 0.01) + Math.sin(Date.now() * 0.001) * 0.2;
        
        // Scale based on zoom level
        const zoomLevel = map.getZoom();
        const baseScale = 0.15;
        const zoomFactor = Math.max(0.8, Math.min(1.2, 1 + ((zoomLevel - 10) * 0.03)));
        this.coin.scale.set(baseScale * zoomFactor, baseScale * zoomFactor, baseScale * zoomFactor);
    }

    /**
     * Update particle effects around the coin
     */
    updateParticleEffects() {
        if (!this.particles || !this.coin) return;

        // Update particle positions and colors
        const time = Date.now() * 0.001;
        this.particles.forEach(particle => {
            const radius = 0.8 + Math.sin(time * 0.5 + particle.userData.offset) * 0.2;
            const speed = 0.5 + particle.userData.speed;

            particle.position.x = Math.cos(time * speed + particle.userData.offset) * radius;
            particle.position.y = Math.sin(time * 0.7 + particle.userData.offset) * 0.3;
            particle.position.z = Math.sin(time * speed + particle.userData.offset) * radius;

            // Update particle opacity for pulsing effect
            if (particle.material) {
                particle.material.opacity = 0.6 + Math.sin(time * 0.002 + particle.userData.offset) * 0.4;
            }
        });

        // Update glow effect
        if (this.glowMesh && this.glowMaterial) {
            this.glowMaterial.opacity = 0.5 + Math.sin(Date.now() * 0.001) * 0.2;
        }
    }

    /**
     * Set up user interaction with the coin
     */
    setupInteraction() {
        if (!this.container) return;
        
        // Add event listeners
        this.container.addEventListener('click', () => this.handleInteraction());
        this.container.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleInteraction();
        });
        
        // Make container respond to pointer events
        this.container.style.pointerEvents = 'auto';
        this.container.style.cursor = 'pointer';
        
        // Create info display element
        this.infoElement = document.createElement('div');
        this.infoElement.className = 'coin-info';
        this.infoElement.style.display = 'none';
        this.container.appendChild(this.infoElement);
    }

    /**
     * Handle user interaction with the coin
     */
    handleInteraction() {
        // Play coin flip animation
        this.playFlipAnimation();
        
        // Show info about current lake
        this.showLakeInfo();
        
        // Scatter particles
        this.scatterParticles();
    }

    /**
     * Animate coin flipping
     */
    playFlipAnimation() {
        if (!this.coin) return;
        
        // Store original position and rotation
        const originalRotY = this.coin.rotation.y;
        const originalRotX = this.coin.rotation.x;
        
        // Animation duration
        const duration = 1000;
        const startTime = Date.now();
        
        // Pause regular animation
        cancelAnimationFrame(this.animationId);
        
        // Flip animation
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            
            // Easing function
            const easeOut = t => 1 - Math.pow(1 - t, 3);
            const easedProgress = easeOut(progress);
            
            // Rotate coin (2 full rotations on Y axis)
            this.coin.rotation.y = originalRotY + (Math.PI * 4 * easedProgress);
            
            // Add some X rotation for a wobble effect
            if (progress < 0.5) {
                this.coin.rotation.x = originalRotX + (Math.PI * progress);
            } else {
                this.coin.rotation.x = originalRotX + (Math.PI * (1 - progress));
            }
            
            // Render the scene
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Resume regular animation
                this.animationId = requestAnimationFrame(() => this.animate());
            }
        };
        
        animate();
    }

    /**
     * Show information about the current lake
     */
    showLakeInfo(activeLakeName, lakes) {
        if (!this.infoElement) return;
        
        // Get current lake info
        const lake = lakes?.[activeLakeName] || {};
        
        // Clear previous content
        while (this.infoElement.firstChild) {
            this.infoElement.removeChild(this.infoElement.firstChild);
        }
        
        // Create elements using DOM methods
        const contentDiv = document.createElement('div');
        contentDiv.className = 'coin-info-content';
        
        const heading = document.createElement('h3');
        // Sanitize inputs before assigning to textContent
        heading.textContent = this.sanitizeText(lake.title) || 'Sacred Lakes';
        contentDiv.appendChild(heading);
        
        const typeP = document.createElement('p');
        typeP.textContent = this.sanitizeText(lake.type) || '';
        contentDiv.appendChild(typeP);
        
        const descP = document.createElement('p');
        descP.className = 'coin-info-description';
        descP.textContent = this.sanitizeText(lake.description) || 
            'Explore the sacred lakes of the Indian Subcontinent';
        contentDiv.appendChild(descP);
        
        // Append the content div to the info element
        this.infoElement.appendChild(contentDiv);
        
        // Show info with animation (rest of your existing code)
        this.infoElement.style.display = 'block';
        this.infoElement.style.opacity = '0';
        this.infoElement.style.transform = 'translateY(20px)';
        
        // Animate in
        setTimeout(() => {
            this.infoElement.style.transition = 'opacity 0.5s, transform 0.5s';
            this.infoElement.style.opacity = '1';
            this.infoElement.style.transform = 'translateY(0)';
        }, 50);
        
        // Hide after delay
        setTimeout(() => {
            this.infoElement.style.opacity = '0';
            this.infoElement.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                this.infoElement.style.display = 'none';
            }, 500);
        }, 5000);
    }

    /**
     * Sanitize text input to prevent XSS
     * @param {string} text - Text to sanitize
     * @returns {string} - Sanitized text
     */
    sanitizeText(text) {
        if (!text) return '';
        
        // Convert to string if it's not already
        const str = String(text);
        
        // Remove any potentially dangerous content
        return str.replace(/<\/?[^>]+(>|$)/g, '');
    }

    /**
     * Create particle explosion effect
     */
    scatterParticles() {
        if (!this.particles) return;
        
        // Explode particles outward
        this.particles.forEach(particle => {
            particle.userData.exploding = true;
            particle.userData.explodeVelocity = {
                x: (Math.random() - 0.5) * 0.2,
                y: (Math.random() - 0.5) * 0.2,
                z: (Math.random() - 0.5) * 0.2
            };
            particle.userData.originalPosition = {
                x: particle.position.x,
                y: particle.position.y,
                z: particle.position.z
            };
        });
        
        // Animation to return particles to original positions
        const startTime = Date.now();
        const duration = 1500;
        
        const resetParticles = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            
            if (progress < 1) {
                // Continue explosion for first half, return for second half
                this.particles.forEach(particle => {
                    if (progress < 0.5) {
                        // Continue explosion
                        particle.position.x += particle.userData.explodeVelocity.x;
                        particle.position.y += particle.userData.explodeVelocity.y;
                        particle.position.z += particle.userData.explodeVelocity.z;
                    } else {
                        // Return to orbit
                        const returnProgress = (progress - 0.5) * 2; // 0 to 1
                        const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                        const ease = easeInOut(returnProgress);
                        
                        const original = particle.userData.originalPosition;
                        
                        particle.position.x = particle.position.x + (original.x - particle.position.x) * ease;
                        particle.position.y = particle.position.y + (original.y - particle.position.y) * ease;
                        particle.position.z = particle.position.z + (original.z - particle.position.z) * ease;
                    }
                });
                
                requestAnimationFrame(resetParticles);
            } else {
                // Reset exploding state
                this.particles.forEach(particle => {
                    particle.userData.exploding = false;
                });
            }
        };
        
        resetParticles();
    }

    resize() {
        if (!this.container) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    dispose() {
        this.stopAnimation();
        
        // Dispose geometries and materials
        if (this.coin) {
            this.scene.remove(this.coin);
            this.coin.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    child.material.dispose();
                }
            });
            this.coin = null;
        }
        
        // Remove renderer from DOM
        if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        
        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        console.log('[CoinAttributionSystem] Disposed');
    }
}