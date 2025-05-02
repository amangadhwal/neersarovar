import { StateManager } from '../stateManager.js';

const INTERACTION_CONFIG = {
    scrollSensitivity: 0.8,
    minVelocity: 0.01,
    maxForce: 2.0,
    debounceDelay: 16
};

/**
 * ScrollAnimationController manages animations triggered by scrolling
 */
export class ScrollAnimationController {
    constructor() {
        this.triggers = new Map();
        this.scrollPosition = window.scrollY;
        this.lastScrollPosition = this.scrollPosition;
        this.scrollDirection = 'none';
        this.transitioning = false;
        this.transitionState = {
            active: false,
            startLake: null,
            endLake: null,
            startTime: 0,
            duration: 0,
            easing: this.easeInOutCubic
        };
        
        this.metrics = {
            scrollUpdates: 0,
            triggerActivations: 0,
            lastUpdate: Date.now()
        };
        
        this.initEventListeners();
        this.initializeAllLakeTriggers();
        
        console.log('[ScrollAnimationController] Initialized');
    }
    
    initEventListeners() {
        window.addEventListener('scroll', this.handleScroll.bind(this));
        window.addEventListener('resize', this.throttle(() => {
            this.updateMetrics();
        }, 200));
    }
    
    handleScroll() {
        this.scrollPosition = window.scrollY;
        this.scrollDirection = this.scrollPosition > this.lastScrollPosition ? 'down' : 'up';
        this.metrics.scrollUpdates++;
        
        // Check if any scroll triggers are activated
        this.checkTriggers(this.scrollPosition);
        
        // Apply scroll effects
        const scrollDelta = this.scrollPosition - this.lastScrollPosition;
        this.applyScrollEffects(scrollDelta);
        
        this.lastScrollPosition = this.scrollPosition;
        
        // Update transition if active
        if (this.transitionState.active) {
            this.updateTransition();
        }
    }
    
    addLakeTrigger(lakeId, threshold) {
        this.triggers.set(lakeId, {
            threshold: threshold,
            triggered: false,
            element: document.getElementById(lakeId)
        });
    }
    
    checkTriggers(scrollY) {
        this.triggers.forEach((trigger, lakeId) => {
            if (!trigger.element) return;
            
            const rect = trigger.element.getBoundingClientRect();
            const triggerPoint = window.innerHeight * 0.4; // 40% down the viewport
            
            // Check if element is in trigger zone
            if (rect.top < triggerPoint && rect.bottom > 0 && !trigger.triggered) {
                trigger.triggered = true;
                this.metrics.triggerActivations++;
                this.activateLakeEffects(lakeId);
            } else if ((rect.top > triggerPoint || rect.bottom < 0) && trigger.triggered) {
                trigger.triggered = false;
            }
        });
    }
    
    activateLakeEffects(lakeId) {
        if (lakeId === StateManager.getActiveLake()) return;
        
        const currentLake = StateManager.getActiveLake();
        if (currentLake) {
            this.startTransition(currentLake, lakeId);
        } else {
            StateManager.lakeManager.setActiveLake(lakeId);
        }
    }
    
    startTransition(fromLake, toLake) {
        if (fromLake === toLake) return;
        
        this.transitionState = {
            active: true,
            startLake: fromLake,
            endLake: toLake,
            startTime: performance.now(),
            duration: 1000, // 1 second transition
            easing: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        };
        
        console.log(`[ScrollAnimationController] Starting transition from ${fromLake} to ${toLake}`);
    }
    
    updateTransition() {
        const now = performance.now();
        const elapsed = now - this.transitionState.startTime;
        
        if (elapsed >= this.transitionState.duration) {
            // Transition complete
            this.transitionState.active = false;
            return;
        }
        
        // Calculate interpolation factor with easing
        const t = this.transitionState.easing(elapsed / this.transitionState.duration);
        
        // Get start and end lake particle systems
        const startSystem = this.particleSystems[this.transitionState.startLake];
        const endSystem = this.particleSystems[this.transitionState.endLake];
        
        if (startSystem && endSystem) {
            // Crossfade particle opacities
            if (startSystem.particles) {
                startSystem.particles.forEach(p => {
                    p.opacity *= (1 - t) * 0.9; // Fade out
                });
            }
            
            if (endSystem.particles) {
                endSystem.particles.forEach(p => {
                    p.opacity = Math.min(1, p.opacity + t * 0.1); // Fade in
                });
            }
        }
    }
    
    applyScrollEffects(scrollDelta) {
        if (Math.abs(scrollDelta) < 1) return; // Ignore tiny scroll movements
        
        const currentLakeSystem = this.particleSystems[this.activeLakeName];
        if (!currentLakeSystem?.active) return;
        
        // Determine direction
        const direction = scrollDelta > 0 ? 'down' : 'up';
        
        // Scale effect by scroll intensity
        const intensity = Math.min(1.0, Math.abs(scrollDelta) / 30);
        
        // Apply different effects based on lake type
        const lakeType = currentLakeSystem.lakeType;
        
        if (lakeType.includes('Sacred') || lakeType.includes('High Altitude')) {
            // Create ripple effect from the center
            const center = { 
                x: currentLakeSystem.canvas.width / 2, 
                y: currentLakeSystem.canvas.height / 2 
            };
            
            // Apply ripple - expanding for down scroll, contracting for up scroll
            this.addRippleEffect(currentLakeSystem, center.x, center.y, intensity, direction === 'down');
        } else {
            // Add directional flow for other lake types
            const flowDirection = direction === 'down' ? 1 : -1;
            this.addDirectionalFlow(currentLakeSystem, flowDirection, intensity);
        }
    }
    
    addRippleEffect(system, centerX, centerY, strength, expanding) {
        if (!system.particles) return;
        
        system.particles.forEach(particle => {
            // Calculate distance from ripple center
            const dx = particle.position.x - centerX;
            const dy = particle.position.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Skip particles too far from ripple center
            if (distance > 0.3) return;
            
            // Calculate force based on distance
            const force = (1 - distance / 0.3) * strength * 0.01;
            const angle = Math.atan2(dy, dx);
            
            // Apply force away from or toward center
            const direction = expanding ? 1 : -1;
            particle.velocity.x += Math.cos(angle) * force * direction;
            particle.velocity.y += Math.sin(angle) * force * direction;
        });
    }
    
    addDirectionalFlow(system, direction, strength) {
        if (!system.particles) return;
        
        // Apply directional flow to all particles
        system.particles.forEach(particle => {
            // Vertical flow based on scroll direction
            particle.velocity.y += direction * strength * 0.5;
            
            // Add a slight randomness for natural effect
            particle.velocity.x += (Math.random() - 0.5) * strength * 0.2;
            
            // Add a small vertical displacement based on lake type
            if (system.lakeType.includes('High Altitude')) {
                // High altitude lakes get more vertical movement
                particle.velocity.z += direction * strength * 0.1;
            } else if (system.lakeType.includes('Salt')) {
                // Salt lakes get slightly different horizontal motion
                particle.velocity.x += direction * strength * 0.05;
            }
            
            // Adjust particle size temporarily for visual feedback
            const originalSize = particle.size;
            particle.size = originalSize * (1 + strength * 0.3);
            
            // Reset size after a short delay
            setTimeout(() => {
                if (particle && !particle.isExpired()) {
                    particle.size = originalSize;
                }
            }, 200);
        });
    }
    
    adaptPerformance(fps) {
        if (fps < 30) {
            console.log(`[ScrollAnimationController] Low FPS detected (${fps.toFixed(1)}), reducing effects`);
            // Reduce particle count or other effects
            StateManager.particleSystems.forEach(system => {
                if (system.particles && system.particles.length > 1000) {
                    // Remove some particles
                    const reduction = Math.floor(system.particles.length * 0.2); // Reduce by 20%
                    system.particles.splice(0, reduction);
                }
            });
        }
    }
    
    initializeAllLakeTriggers() {
        Object.keys(StateManager.lakeManager?.getAllSystems() || {}).forEach(lakeId => {
            this.addLakeTrigger(lakeId, 0); // Threshold is dynamically determined
        });
    }
    
    updateMetrics() {
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        
        if (delta >= 1000) {
            const fps = (this.frameCount * 1000) / delta;
            this.frameCount = 0;
            this.lastFrameTime = now;
            
            // Adapt performance if needed
            this.adaptPerformance(fps);
        }
        
        this.frameCount++;
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // Utility to throttle function calls
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    dispose() {
        window.removeEventListener('scroll', this.handleScroll.bind(this));
        window.removeEventListener('resize', this.throttle(() => {
            this.updateMetrics();
        }, 200));
        
        this.triggers.clear();
        this.transitionState.active = false;
        
        console.log('[ScrollAnimationController] Disposed');
    }
}