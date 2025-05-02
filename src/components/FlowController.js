import { Vector3 } from 'three';
import { StateManager } from '../stateManager.js';
import { getLakeConfigType } from '../models/lakes.js';

/**
 * FlowController manages fluid dynamics for different lake types
 * Provides pattern-based movement and type-specific boundary handling
 */
export class FlowController {
    constructor() {
        this.flowPatterns = {};
        this.activePatterns = new Map();
        
        // Boundary conditions by lake type
        this.boundaryConditions = {
            'Freshwater': { type: 'absorb', factor: 0.8 },
            'Salt Lake': { type: 'reflect', factor: 0.9 },
            'High Altitude': { type: 'freeze', factor: 0.95 },
            'Sacred Lake': { type: 'orbit', factor: 1.0 },
            'Brackish': { type: 'turbulent', factor: 0.85 }
        };
        
        // Flow state transitions
        this.states = {
            current: 'calm',
            transition: null,
            lastChange: 0,
            duration: 5000, // ms for transition
            timers: {},
            options: ['calm', 'flowing', 'turbulent', 'vortex']
        };
        
        console.log('[FlowController] Initialized with boundary conditions');
    }
    
    registerFlowPattern(name, patternFunction) {
        this.flowPatterns[name] = patternFunction;
        console.log(`[FlowController] Registered flow pattern: ${name}`);
        return true;
    }
    
    setActivePattern(lakeId, patternName) {
        if (!this.flowPatterns[patternName]) {
            console.warn(`[FlowController] Unknown flow pattern: ${patternName}`);
            return false;
        }
        
        this.activePatterns.set(lakeId, patternName);
        console.log(`[FlowController] Set flow pattern ${patternName} for lake ${lakeId}`);
        return true;
    }
    
    applyFlowToParticle(particle, lakeId, time) {
        const patternName = this.activePatterns.get(lakeId);
        if (!patternName || !this.flowPatterns[patternName]) return { x: 0, y: 0 };
        
        const lakeSystem = StateManager.particleSystems.get(lakeId);
        if (!lakeSystem) return { x: 0, y: 0 };
        
        const center = lakeSystem.center || { x: 0, y: 0 };
        
        // Apply pattern
        const flow = this.flowPatterns[patternName](
            particle.x, 
            particle.y, 
            center, 
            time
        );
        
        return flow;
    }
    
    applyBoundaryCondition(particle, lakeSystem) {
        if (!lakeSystem || !lakeSystem.lakeData) return;
        
        const lakeType = lakeSystem.lakeData.type;
        const boundary = this.boundaryConditions[lakeType] || { type: 'absorb', factor: 0.8 };
        
        // Apply based on boundary type
        switch (boundary.type) {
            case 'reflect':
                this.applyReflectBoundary(particle, lakeSystem, boundary.factor);
                break;
                
            case 'absorb':
                this.applyAbsorbBoundary(particle, lakeSystem, boundary.factor);
                break;
                
            case 'freeze':
                this.applyFreezeBoundary(particle, lakeSystem, boundary.factor);
                break;
                
            case 'orbit':
                this.applyOrbitBoundary(particle, lakeSystem, boundary.factor);
                break;
                
            case 'turbulent':
                this.applyTurbulentBoundary(particle, lakeSystem, boundary.factor);
                break;
        }
    }
    
    // Implement various boundary condition methods
    applyReflectBoundary(particle, lakeSystem, factor) {
        if (!lakeSystem.boundary) return;
    
        const boundary = lakeSystem.boundary;
        let reflected = false;
        
        // Check for collision with boundary
        if (particle.x < boundary.minX) {
            particle.velocity.x = Math.abs(particle.velocity.x) * factor;
            particle.x = boundary.minX + 1;
            reflected = true;
        } else if (particle.x > boundary.maxX) {
            particle.velocity.x = -Math.abs(particle.velocity.x) * factor;
            particle.x = boundary.maxX - 1;
            reflected = true;
        }
        
        if (particle.y < boundary.minY) {
            particle.velocity.y = Math.abs(particle.velocity.y) * factor;
            particle.y = boundary.minY + 1;
            reflected = true;
        } else if (particle.y > boundary.maxY) {
            particle.velocity.y = -Math.abs(particle.velocity.y) * factor;
            particle.y = boundary.maxY - 1;
            reflected = true;
        }
        
        // Trigger reflection visual effect if reflected
        if (reflected && particle.triggerEffect) {
            particle.triggerEffect('reflection', {
                strength: factor,
                duration: 500
            });
        }
    }

    applyAbsorbBoundary(particle, lakeSystem, factor) {
        if (!lakeSystem.boundary) return;
    
        const boundary = lakeSystem.boundary;
        let absorbed = false;
        const margin = 5;
        
        // Calculate distance to boundary
        const distToLeft = particle.x - boundary.minX;
        const distToRight = boundary.maxX - particle.x;
        const distToTop = particle.y - boundary.minY;
        const distToBottom = boundary.maxY - particle.y;
        
        // Find the nearest boundary
        const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
        
        if (minDist < margin) {
            // Apply absorption at boundary (slow down)
            const absorption = factor * (1 - minDist / margin);
            particle.velocity.x *= (1 - absorption);
            particle.velocity.y *= (1 - absorption);
            
            // Gradually fade out particle near boundary
            if (particle.opacity) {
                particle.opacity = Math.max(0.2, particle.opacity - absorption * 0.1);
            }
            
            absorbed = true;
        }
        
        // If outside boundary, relocate particle
        if (particle.x < boundary.minX || particle.x > boundary.maxX || 
            particle.y < boundary.minY || particle.y > boundary.maxY) {
            
            // Respawn particle at random position inside boundary
            particle.x = boundary.minX + Math.random() * (boundary.maxX - boundary.minX);
            particle.y = boundary.minY + Math.random() * (boundary.maxY - boundary.minY);
            
            // Reset velocity
            particle.velocity.x = (Math.random() - 0.5) * 0.5;
            particle.velocity.y = (Math.random() - 0.5) * 0.5;
            
            // Reset opacity
            particle.opacity = 1.0;
        }
    }

    applyFreezeBoundary(particle, lakeSystem, factor) {
        if (!lakeSystem.boundary) return;
    
        const boundary = lakeSystem.boundary;
        const margin = 15;
        
        // Calculate distance to boundary
        const distToLeft = particle.x - boundary.minX;
        const distToRight = boundary.maxX - particle.x;
        const distToTop = particle.y - boundary.minY;
        const distToBottom = boundary.maxY - particle.y;
        
        // Find the nearest boundary
        const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
        
        if (minDist < margin) {
            // Apply freezing effect near boundary
            const freezeFactor = factor * (1 - minDist / margin);
            
            // Slow down particles in a non-linear way (more slowing as they get closer)
            const slowdown = Math.pow(1 - freezeFactor, 2);
            particle.velocity.x *= slowdown;
            particle.velocity.y *= slowdown;
            
            // Change appearance near boundary
            if (!particle.isFrozen && Math.random() < freezeFactor * 0.02) {
                // Freeze the particle
                particle.isFrozen = true;
                particle.frozenTime = 0;
                particle.frozenDuration = 2000 + Math.random() * 3000; // 2-5 seconds
                
                // Change appearance
                if (particle.triggerEffect) {
                    particle.triggerEffect('freeze', {
                        strength: freezeFactor,
                        duration: particle.frozenDuration
                    });
                }
                
                // Store original properties for later unfreezing
                particle.originalVelocity = {
                    x: particle.velocity.x,
                    y: particle.velocity.y
                };
                
                // Stop motion completely for frozen particles
                particle.velocity.x = 0;
                particle.velocity.y = 0;
            }
        }
        
        // Update frozen particles
        if (particle.isFrozen) {
            particle.frozenTime += 16.67; // Assuming ~60fps
            
            if (particle.frozenTime >= particle.frozenDuration) {
                // Unfreeze the particle
                particle.isFrozen = false;
                
                // Restore motion with some randomization
                if (particle.originalVelocity) {
                    particle.velocity.x = particle.originalVelocity.x * (0.5 + Math.random() * 0.5);
                    particle.velocity.y = particle.originalVelocity.y * (0.5 + Math.random() * 0.5);
                    particle.originalVelocity = null;
                }
                
                // Restore appearance
                if (particle.triggerEffect) {
                    particle.triggerEffect('unfreeze', {
                        duration: 1000
                    });
                }
            }
        }
    }

    applyOrbitBoundary(particle, lakeSystem, factor) {
        if (!lakeSystem.boundary || !lakeSystem.center) return;
    
        const boundary = lakeSystem.boundary;
        const center = lakeSystem.center;
        
        // Calculate distance from center
        const dx = particle.x - center.x;
        const dy = particle.y - center.y;
        const distSquared = dx * dx + dy * dy;
        const dist = Math.sqrt(distSquared);
        
        // Calculate maximum distance (distance to furthest boundary point)
        const cornerDistances = [
            Math.sqrt(Math.pow(boundary.minX - center.x, 2) + Math.pow(boundary.minY - center.y, 2)),
            Math.sqrt(Math.pow(boundary.maxX - center.x, 2) + Math.pow(boundary.minY - center.y, 2)),
            Math.sqrt(Math.pow(boundary.minX - center.x, 2) + Math.pow(boundary.maxY - center.y, 2)),
            Math.sqrt(Math.pow(boundary.maxX - center.x, 2) + Math.pow(boundary.maxY - center.y, 2))
        ];
        const maxDist = Math.max(...cornerDistances);
        
        // If near the boundary, apply orbital forces
        if (dist > maxDist * 0.8) {
            const orbitalFactor = factor * ((dist - maxDist * 0.8) / (maxDist * 0.2));
            
            // Calculate normalized direction to center
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Calculate orbit direction (perpendicular to center direction)
            const ox = -ny;
            const oy = nx;
            
            // Apply orbital force
            const orbitalStrength = 0.05 * orbitalFactor;
            particle.velocity.x += ox * orbitalStrength;
            particle.velocity.y += oy * orbitalStrength;
            
            // Add slight attraction to center
            const attractionStrength = 0.02 * orbitalFactor;
            particle.velocity.x -= nx * attractionStrength;
            particle.velocity.y -= ny * attractionStrength;
            
            // Trigger visual effect
            if (orbitalFactor > 0.5 && particle.triggerEffect) {
                particle.triggerEffect('orbit', {
                    strength: orbitalFactor,
                    duration: 500
                });
            }
        }
    }

    applyTurbulentBoundary(particle, lakeSystem, factor) {
        if (!lakeSystem.boundary) return;
    
        const boundary = lakeSystem.boundary;
        const margin = 20;
        
        // Calculate distance to boundary
        const distToLeft = particle.x - boundary.minX;
        const distToRight = boundary.maxX - particle.x;
        const distToTop = particle.y - boundary.minY;
        const distToBottom = boundary.maxY - particle.y;
        
        // Find the nearest boundary
        const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
        
        if (minDist < margin) {
            // Apply turbulence near boundary
            const turbulenceFactor = factor * (1 - minDist / margin);
            
            // Add random velocity changes
            const turbulenceStrength = 0.08 * turbulenceFactor;
            particle.velocity.x += (Math.random() - 0.5) * turbulenceStrength;
            particle.velocity.y += (Math.random() - 0.5) * turbulenceStrength;
            
            // Occasionally create swirl effects
            if (Math.random() < turbulenceFactor * 0.01) {
                particle.swirling = {
                    duration: 1000 + Math.random() * 1000,
                    time: 0,
                    strength: 0.1 + Math.random() * 0.2 * turbulenceFactor,
                    direction: Math.random() < 0.5 ? 1 : -1
                };
            }
        }
        
        // Update swirling particles
        if (particle.swirling) {
            particle.swirling.time += 16.67; // Assuming ~60fps
            
            if (particle.swirling.time < particle.swirling.duration) {
                // Apply swirl force
                const center = lakeSystem.center || {
                    x: (boundary.minX + boundary.maxX) / 2,
                    y: (boundary.minY + boundary.maxY) / 2
                };
                
                const dx = particle.x - center.x;
                const dy = particle.y - center.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    
                    // Perpendicular direction for swirl
                    const px = -ny * particle.swirling.direction;
                    const py = nx * particle.swirling.direction;
                    
                    // Apply swirl force
                    particle.velocity.x += px * particle.swirling.strength;
                    particle.velocity.y += py * particle.swirling.strength;
                    
                    // Add slight attraction to center
                    particle.velocity.x -= nx * particle.swirling.strength * 0.2;
                    particle.velocity.y -= ny * particle.swirling.strength * 0.2;
                }
            } else {
                // End swirling
                particle.swirling = null;
            }
        }
    }
    
    // State management methods
    transitionState(newState) {
        if (newState === this.states.current) return;
        
        this.states.transition = {
            from: this.states.current,
            to: newState,
            startTime: performance.now(),
            progress: 0
        };
        
        this.states.current = newState;
        console.log(`[FlowController] Transitioning to state: ${newState}`);
    }
    
    updateStateTransition() {
        if (!this.states.transition) return;
        
        const now = performance.now();
        const elapsed = now - this.states.transition.startTime;
        
        this.states.transition.progress = Math.min(1.0, elapsed / this.states.duration);
        
        if (this.states.transition.progress >= 1.0) {
            this.states.transition = null;
        }
    }
    
    getCurrentStateBlend() {
        if (!this.states.transition) {
            return { [this.states.current]: 1.0 };
        }
        
        const t = this.states.transition.progress;
        return {
            [this.states.transition.from]: 1.0 - t,
            [this.states.transition.to]: t
        };
    }
    
    dispose() {
        // Clear timers
        Object.values(this.states.timers).forEach(timer => clearTimeout(timer));
        this.states.timers = {};
        
        // Clear patterns
        this.activePatterns.clear();
        
        console.log('[FlowController] Disposed');
    }
}