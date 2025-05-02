import * as THREE from 'three';
import { StateManager } from '../stateManager.js';
import { INTERACTION_CONFIG } from '../config/constants.js';

// Sacred lake visual effects configuration
const SACRED_COLOR_SYSTEM = {
    transitions: {
        day: {
            water: '#00e1ff',
            glow: 'rgba(255, 205, 107, 0.4)',
            particle: '#ffcd6b'
        },
        dusk: {
            water: '#48f2ff',
            glow: 'rgba(255, 205, 107, 0.6)',
            particle: '#ffd98c'
        },
        night: {
            water: '#2aacff',
            glow: 'rgba(255, 205, 107, 0.8)',
            particle: '#ffe4ad'
        }
    },
    
    getColorForTime(hour) {
        if (hour >= 6 && hour < 17) {
            // Day colors (6 AM - 5 PM)
            return this.transitions.day;
        } else if (hour >= 17 && hour < 20) {
            // Dusk colors (5 PM - 8 PM)
            return this.transitions.dusk;
        } else {
            // Night colors (8 PM - 6 AM)
            return this.transitions.night;
        }
    }
};

// Special particle patterns for sacred lakes
const SACRED_PARTICLE_PATTERNS = {
    spiral: {
        frequency: 0.7,
        radius: 0.3,
        intensity: 0.85
    },
    ripple: {
        wavelength: 25,
        amplitude: 0.4,
        speed: 0.6
    },
    glow: {
        base: '#ffcd6b',
        intensity: 0.6,
        pulseRate: 1.2
    }
};

/**
 * SacredLakeEnhancer adds special effects to sacred lakes
 * including time-based colors and orbital particle patterns
 */
export class SacredLakeEnhancer {
    constructor() {
        this.sacredLakeIds = this.findSacredLakes();
        this.active = true;
        this.lastUpdate = Date.now();
        this.currentColors = { ...SACRED_COLOR_SYSTEM.transitions.day };
        
        // Update colors based on time of day
        this.updateTimeBasedColors();
        
        // Schedule regular updates
        this.colorUpdateInterval = setInterval(() => this.updateTimeBasedColors(), 60000); // Every minute
        
        // Create orbital particle containers
        this.orbitalContainers = new Map();
        
        // Setup mouse and touch events
        this.setupMouseEvents();
        this.setupTouchEvents();
        
        // Initialize momentum parameters
        this.momentum = { x: 0, y: 0 };
        this.mouse = { down: false, x: 0, y: 0, lastX: 0, lastY: 0 };
        
        console.log('[SacredLakeEnhancer] Initialized');
    }
    
    findSacredLakes() {
        // Find lake IDs that are marked as sacred or have special effects
        const lakes = StateManager.lakes || {};
        return Object.entries(lakes)
            .filter(([id, lake]) => 
                lake.type.includes('Sacred') || 
                (lake.historicalName && lake.historicalContext))
            .map(([id]) => id);
    }
    
    updateTimeBasedColors() {
        const now = new Date();
        const hour = now.getHours();
        
        // Get colors based on time of day
        this.currentColors = SACRED_COLOR_SYSTEM.getColorForTime(hour);
        
        // Update any active sacred lakes with new colors
        this.updateActiveSacredLakes();
    }
    
    updateActiveSacredLakes() {
        if (!this.active) return;
        
        // Check if any sacred lakes are currently active
        const activeLakeName = StateManager.getActiveLake();
        if (this.sacredLakeIds.includes(activeLakeName)) {
            const system = StateManager.particleSystems.get(activeLakeName);
            if (system) {
                this.enhanceSacredLake(system);
            }
        }
        
        // Update orbital effects
        this.orbitalContainers.forEach((container, lakeId) => {
            this.updateOrbitalPosition(lakeId);
        });
    }
    
    createOrbitalEffect(lakeId, lakeSystem) {
        // Skip if already created
        if (this.orbitalContainers.has(lakeId)) return;
        
        // Create container for orbital effects
        const container = document.createElement('div');
        container.className = 'sacred-lake-orbital';
        container.innerHTML = `
            <div class="orbital-ring"></div>
            <div class="orbital-glow"></div>
            <div class="orbital-particles"></div>
        `;
        
        // Apply initial styling
        Object.assign(container.style, {
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 5,
            width: '200px',
            height: '200px',
            transform: 'translate(-50%, -50%)',
            opacity: 0
        });
        
        // Apply current colors
        const ring = container.querySelector('.orbital-ring');
        const glow = container.querySelector('.orbital-glow');
        
        if (ring) {
            ring.style.borderColor = this.currentColors.particle;
        }
        
        if (glow) {
            glow.style.boxShadow = `0 0 20px 10px ${this.currentColors.glow}`;
        }
        
        // Add to document and store reference
        document.body.appendChild(container);
        this.orbitalContainers.set(lakeId, container);
        
        // Animate in
        setTimeout(() => {
            container.style.opacity = '1';
        }, 100);
    }
    
    updateOrbitalPosition(lakeId) {
        const container = this.orbitalContainers.get(lakeId);
        if (!container) return;
        
        const system = StateManager.particleSystems.get(lakeId);
        if (!system || !system.active) {
            // Hide if system is not active
            container.style.opacity = '0';
            return;
        }
        
        // Get lake center in screen coordinates
        const map = StateManager.map;
        const lakeCenter = system.lakeData.center;
        if (!map || !lakeCenter) return;
        
        const point = map.project(lakeCenter);
        
        // Position container
        container.style.left = `${point.x}px`;
        container.style.top = `${point.y}px`;
        container.style.opacity = '1';
        
        // Pulse animation based on time
        const pulseFactor = 0.2 * Math.sin(Date.now() * 0.001) + 1;
        container.style.transform = `translate(-50%, -50%) scale(${pulseFactor})`;
    }
    
    enhanceSacredLake(particleSystem) {
        if (!particleSystem || !particleSystem.particles) return;
        
        // Add orbital effect if needed
        this.createOrbitalEffect(particleSystem.lakeId, particleSystem);
        
        // Apply special colors and patterns to particles
        const time = Date.now() * 0.001; // Time in seconds
        
        particleSystem.particles.forEach(particle => {
            // Apply sacred colors
            particle.color = this.currentColors.particle;
            
            // Apply spiral pattern to a portion of particles
            if (particle.id % 5 === 0) {
                this.applySpiralPattern(particle, SACRED_PARTICLE_PATTERNS.spiral);
            }
            
            // Apply pulsing effect
            const pulse = Math.sin(time + particle.id) * 0.3 + 0.7;
            particle.opacity = pulse;
            
            // Increase particle size slightly for sacred lakes
            particle.size *= 1.2;
        });
    }
    
    applySpiralPattern(particle, pattern) {
        if (!particle || !pattern) return;
        
        const time = Date.now() * 0.001; // Time in seconds
        
        // Calculate spiral motion
        const angle = time * pattern.frequency + (particle.id || 0);
        const radius = pattern.radius * (1 + Math.sin(time * 0.5) * 0.2);
        
        // Apply spiral force
        particle.velocity.x += Math.cos(angle) * radius * pattern.intensity * 0.01;
        particle.velocity.y += Math.sin(angle) * radius * pattern.intensity * 0.01;
    }
    
    // Set up mouse event handlers
    setupMouseEvents() {
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('wheel', this.handleScroll.bind(this));
    }
    
    // Set up touch event handlers
    setupTouchEvents() {
        document.addEventListener('touchstart', this.handleTouchStart.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    handleMouseDown(e) {
        this.mouse.down = true;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.lastX = e.clientX;
        this.mouse.lastY = e.clientY;
        
        // Reset momentum when starting new interaction
        this.momentum.x = 0;
        this.momentum.y = 0;
    }
    
    handleMouseMove(e) {
        // Always update mouse position
        const prevX = this.mouse.x;
        const prevY = this.mouse.y;
        
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        
        if (!this.active || !this.mouse.down) return;
        
        const now = performance.now();
        
        // Calculate deltas
        const deltaX = this.mouse.x - prevX;
        const deltaY = this.mouse.y - prevY;
        
        // Add to momentum with sensitivity factor
        this.momentum.x = deltaX * 0.1; // Scale to make it feel natural
        this.momentum.y = deltaY * 0.1;
        
        // Apply particle movement effect on active sacred lake
        const activeLake = StateManager.getActiveLake();
        if (this.sacredLakeIds.includes(activeLake)) {
            this.applyDragEffect(deltaX, deltaY);
        }
    }
    
    handleMouseUp() {
        this.mouse.down = false;
        
        // Apply momentum if above threshold
        if (Math.abs(this.momentum.x) > INTERACTION_CONFIG.minVelocity || 
            Math.abs(this.momentum.y) > INTERACTION_CONFIG.minVelocity) {
            this.applyMomentum();
        }
    }
    
    handleScroll(e) {
        // Apply sensitivity factor
        const scrollAmount = e.deltaY * INTERACTION_CONFIG.scrollSensitivity;
        
        // Determine direction for visualization
        const scrollDirection = scrollAmount > 0 ? 'down' : 'up';
        
        // Apply visual effect to the map area
        this.applyScrollEffect(scrollDirection, Math.abs(scrollAmount));
        
        // Prevent default only for custom handling
        if (this.shouldPreventDefaultScroll()) {
            e.preventDefault();
        }
    }
    
    shouldPreventDefaultScroll() {
        // Determine if we should prevent default scrolling
        const activeLake = StateManager.getActiveLake();
        return this.sacredLakeIds.includes(activeLake) && 
               StateManager.particleSystems.has(activeLake);
    }
    
    applyScrollEffect(direction, magnitude) {
        const activeLake = StateManager.getActiveLake();
        if (this.sacredLakeIds.includes(activeLake)) {
            this.applyScrollEffectsToLake(activeLake, direction, magnitude);
        }
    }
    
    applyScrollEffectsToLake(lakeId, direction, magnitude) {
        const system = StateManager.particleSystems.get(lakeId);
        if (!system || !system.particles) return;
        
        // Apply ripple effect
        const map = StateManager.map;
        if (!map) return;
        
        const lakeCenter = system.lakeData.center;
        const point = map.project(lakeCenter);
        
        // Create ripple from center of lake
        this.addRippleEffect(system, point.x, point.y, magnitude * 0.01, direction === 'down');
        
        // Add directional flow based on scroll direction
        const flowStrength = magnitude * 0.001;
        this.addDirectionalFlow(system, direction, flowStrength);
    }
    
    addRippleEffect(system, centerX, centerY, strength, expanding) {
        if (!system || !system.particles) return;
        
        system.particles.forEach(particle => {
            if (!particle.screenX || !particle.screenY) return;
            
            // Calculate distance from ripple center
            const dx = particle.screenX - centerX;
            const dy = particle.screenY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate ripple force (decreases with distance)
            const force = strength * (1 - Math.min(1, distance / 500));
            
            // Calculate direction (either toward or away from center)
            const dirX = dx / (distance || 1);
            const dirY = dy / (distance || 1);
            
            // Apply force (expanding pushes out, contracting pulls in)
            const factor = expanding ? 1 : -1;
            particle.velocity.x += dirX * force * factor;
            particle.velocity.y += dirY * force * factor;
        });
    }
    
    addDirectionalFlow(system, direction, strength) {
        if (!system || !system.particles) return;
        
        // Apply directional force based on scroll direction
        const forceY = direction === 'down' ? strength : -strength;
        
        system.particles.forEach(particle => {
            particle.velocity.y += forceY;
            
            // Add slight randomness to create natural flow
            particle.velocity.x += (Math.random() - 0.5) * strength * 0.5;
        });
    }
    
    applyDragEffect(dx, dy) {
        const activeLake = StateManager.getActiveLake();
        const system = StateManager.particleSystems.get(activeLake);
        if (!system || !system.particles) return;
        
        // Apply force to particles in the opposite direction of drag
        const forceX = -dx * 0.01;
        const forceY = -dy * 0.01;
        
        system.particles.forEach(particle => {
            particle.velocity.x += forceX;
            particle.velocity.y += forceY;
        });
    }
    
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            this.mouse.down = true;
            this.mouse.x = e.touches[0].clientX;
            this.mouse.y = e.touches[0].clientY;
            this.mouse.lastX = e.touches[0].clientX;
            this.mouse.lastY = e.touches[0].clientY;
            
            // Reset momentum
            this.momentum.x = 0;
            this.momentum.y = 0;
        }
    }
    
    handleTouchMove(e) {
        if (e.touches.length === 1 && this.mouse.down) {
            const dx = e.touches[0].clientX - this.mouse.x;
            const dy = e.touches[0].clientY - this.mouse.y;
            
            // Update momentum
            this.momentum.x = (e.touches[0].clientX - this.mouse.lastX) * 0.1 * INTERACTION_CONFIG.touchMultiplier;
            this.momentum.y = (e.touches[0].clientY - this.mouse.lastY) * 0.1 * INTERACTION_CONFIG.touchMultiplier;
            
            // Update position
            this.mouse.lastX = this.mouse.x;
            this.mouse.lastY = this.mouse.y;
            this.mouse.x = e.touches[0].clientX;
            this.mouse.y = e.touches[0].clientY;
            
            // Apply effects
            this.applyDragEffect(dx, dy);
        }
    }
    
    handleTouchEnd(e) {
        this.mouse.down = false;
        
        // Apply momentum
        if (Math.abs(this.momentum.x) > INTERACTION_CONFIG.minVelocity || 
            Math.abs(this.momentum.y) > INTERACTION_CONFIG.minVelocity) {
            this.applyTouchMomentum();
        }
    }
    
    handleMultiTouchGesture(e) {
        // Handle pinch zoom or other multi-touch gestures
        // This could be implemented for complex interactions
    }
    
    applyTouchMomentum() {
        // Apply with decay
        const applyFrame = () => {
            if (Math.abs(this.momentum.x) < 0.1 && Math.abs(this.momentum.y) < 0.1) {
                return;
            }
            
            // Apply to active sacred lake particles
            const activeLake = StateManager.getActiveLake();
            if (this.sacredLakeIds.includes(activeLake)) {
                const system = StateManager.particleSystems.get(activeLake);
                if (system && system.particles) {
                    const forceX = -this.momentum.x * 0.01;
                    const forceY = -this.momentum.y * 0.01;
                    
                    system.particles.forEach(particle => {
                        particle.velocity.x += forceX;
                        particle.velocity.y += forceY;
                    });
                }
            }
            
            // Apply decay
            this.momentum.x *= 0.95;
            this.momentum.y *= 0.95;
            
            // Continue applying momentum
            requestAnimationFrame(applyFrame);
        };
        
        // Start the momentum animation
        requestAnimationFrame(applyFrame);
    }
    
    applyMomentum() {
        // Similar to applyTouchMomentum but for mouse
        this.applyTouchMomentum();
    }
    
    dispose() {
        // Clean up event listeners
        document.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        document.removeEventListener('wheel', this.handleScroll.bind(this));
        document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Clear interval
        clearInterval(this.colorUpdateInterval);
        
        // Remove orbital containers
        this.orbitalContainers.forEach(container => {
            container.remove();
        });
        this.orbitalContainers.clear();
        
        console.log('[SacredLakeEnhancer] Disposed');
    }
}

export { SACRED_COLOR_SYSTEM };