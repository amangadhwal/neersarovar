import { StateManager } from '../stateManager.js';
import * as THREE from 'three';

/**
 * HighAltitudeEffectController adds specialized effects for high-altitude lakes
 * Includes wind effects, ice particles, reflections, and cloud shadows
 */
export class HighAltitudeEffectController {
    constructor() {
        this.initialized = false;
        this.initialize();
    }
    
    initialize() {
        if (this.initialized) return;
        
        // Set up parameters
        this.effects = {
            windIntensity: 0.15,
            reflectionStrength: 1.2,
            iceParticleChance: 0.2,
            cloudShadows: true,
            temperatureVariance: 0.3
        };
        
        // Load special assets needed for high-altitude effects
        this.loadAssets();
        
        this.initialized = true;
        console.log('[HighAltitudeEffectController] Initialized');
    }
    
    loadAssets() {
        // Create textures for ice particle effects
        this.iceTexture = new THREE.TextureLoader().load(
            'assets/textures/ice_particle.png',
            () => console.log('[HighAltitudeEffectController] Ice texture loaded')
        );
        
        // Create cloud shadow texture
        this.cloudShadowTexture = new THREE.TextureLoader().load(
            'assets/textures/cloud_shadow.png',
            () => console.log('[HighAltitudeEffectController] Cloud shadow texture loaded')
        );
    }
    
    enhanceHighAltitudeLake(lakeSystem) {
        if (!lakeSystem.particles) return;
        
        const now = Date.now() * 0.001; // Convert to seconds for calmer time scale
        
        // Apply high altitude effects to particles
        lakeSystem.particles.forEach(particle => {
            // Stronger wind effect based on elevation
            const windSpeed = this.effects.windIntensity * (1 + Math.sin(now * 0.1) * 0.5);
            const windDirection = Math.sin(now * 0.05) * Math.PI;
            
            particle.velocity.x += Math.cos(windDirection) * windSpeed * 0.2;
            particle.velocity.y += Math.sin(windDirection) * windSpeed * 0.2;
            
            // Clear blue reflections with enhanced brightness
            const reflectionPulse = Math.sin(particle.age * 0.8) * 0.5 + 0.5;
            particle.opacity = Math.min(1, particle.opacity * (1 + reflectionPulse * 0.2));
            
            // Some particles simulate ice chunks (slower, more stable)
            if (Math.random() < this.effects.iceParticleChance) {
                particle.velocity.multiplyScalar(0.8);
                particle.velocity.z *= 0.5; // Less vertical movement
                particle.size *= 1.3; // Larger
                
                // Change color to be more white/blue
                const iceBlue = new THREE.Color(0xc8e6ff);
                particle.color = `#${iceBlue.getHexString()}`;
            }
            
            // Random cloud shadow effect (temporary opacity reduction)
            if (this.effects.cloudShadows && Math.random() < 0.005) {
                particle.opacity *= 0.7;
                
                // Restore opacity after a short delay
                setTimeout(() => {
                    if (!particle.isExpired) {
                        particle.opacity /= 0.7;
                    }
                }, 300 + Math.random() * 700);
            }
            
            // Temperature-based effects
            this.applyTemperatureVariation(particle, now);
        });
    }
    
    applyTemperatureVariation(particle, time) {
        // Simulate temperature variance by time of day and particle position
        const temperatureFactor = Math.sin(time * 0.1 + particle.position.x * 0.2 + particle.position.y * 0.3);
        const normalizedTemp = temperatureFactor * this.effects.temperatureVariance;
        
        // Visual changes based on temperature
        if (normalizedTemp < -0.15) {
            // Colder areas - more blue, slower movement
            particle.velocity.multiplyScalar(0.95);
            const originalColor = new THREE.Color(particle.color);
            originalColor.b = Math.min(1, originalColor.b + 0.1);
            particle.color = `#${originalColor.getHexString()}`;
        } else if (normalizedTemp > 0.15) {
            // Warmer areas - more movement, slight upward drift
            particle.velocity.multiplyScalar(1.02);
            particle.velocity.z += 0.01;
        }
    }
    
    // Apply snow effect for very high altitude lakes
    applySnowEffect(lakeSystem) {
        if (!lakeSystem.particles) return;
        
        // Add snow particles
        const snowIndex = Math.floor(Math.random() * lakeSystem.particles.length);
        const snowParticle = lakeSystem.particles[snowIndex];
        
        if (snowParticle) {
            // Make particle look like snow
            snowParticle.color = '#ffffff';
            snowParticle.size *= 0.7;
            snowParticle.opacity = 0.8;
            
            // Slow falling motion
            snowParticle.velocity.x *= 0.5;
            snowParticle.velocity.y *= 0.5;
            snowParticle.velocity.z = -0.1;
        }
    }
    
    // Create ice edge effect around lake
    createIceEdgeEffect(lakeSystem) {
        if (!lakeSystem || !lakeSystem.lakeData) return;
        
        const lakeCenter = lakeSystem.lakeData.center;
        const map = StateManager.map;
        
        if (!map) return;
        
        // Create ice edge if not already created
        if (!this.iceEdges) {
            this.iceEdges = new Map();
        }
        
        if (this.iceEdges.has(lakeSystem.lakeId)) return;
        
        // Create ice edge container
        const iceEdgeContainer = document.createElement('div');
        iceEdgeContainer.className = 'high-altitude-ice-edge';
        iceEdgeContainer.style.position = 'absolute';
        iceEdgeContainer.style.width = '150px';
        iceEdgeContainer.style.height = '150px';
        iceEdgeContainer.style.borderRadius = '50%';
        iceEdgeContainer.style.pointerEvents = 'none';
        iceEdgeContainer.style.zIndex = '4';
        iceEdgeContainer.style.transform = 'translate(-50%, -50%)';
        
        // Add ice texture
        iceEdgeContainer.style.border = '3px solid rgba(255, 255, 255, 0.7)';
        iceEdgeContainer.style.boxShadow = '0 0 10px 2px rgba(200, 230, 255, 0.6)';
        
        // Position container
        const point = map.project(lakeCenter);
        iceEdgeContainer.style.left = `${point.x}px`;
        iceEdgeContainer.style.top = `${point.y}px`;
        
        // Add to DOM
        document.body.appendChild(iceEdgeContainer);
        
        // Store reference
        this.iceEdges.set(lakeSystem.lakeId, iceEdgeContainer);
        
        console.log(`[HighAltitudeEffectController] Created ice edge effect for ${lakeSystem.lakeId}`);
    }
    
    updateIceEdgePositions() {
        if (!this.iceEdges) return;
        
        const map = StateManager.map;
        if (!map) return;
        
        // Update positions of all ice edges
        this.iceEdges.forEach((container, lakeId) => {
            const system = StateManager.particleSystems.get(lakeId);
            if (!system || !system.active || !system.lakeData) {
                container.style.opacity = '0';
                return;
            }
            
            // Get lake center in screen coordinates
            const point = map.project(system.lakeData.center);
            
            // Position container
            container.style.left = `${point.x}px`;
            container.style.top = `${point.y}px`;
            container.style.opacity = '1';
            
            // Scale based on zoom level
            const zoom = map.getZoom();
            const scale = Math.max(1, zoom / 9);
            container.style.transform = `translate(-50%, -50%) scale(${scale})`;
        });
    }
    
    dispose() {
        // Remove ice edges
        if (this.iceEdges) {
            this.iceEdges.forEach(container => {
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }
            });
            this.iceEdges.clear();
        }
        
        console.log('[HighAltitudeEffectController] Disposed');
    }
}