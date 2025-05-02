import { StateManager } from '../stateManager.js';
import { SacredLakeEnhancer } from './SacredLakeEnhancer.js';
import { HighAltitudeEffectController } from './HighAltitudeEffectController.js';

export class LakeTypeEffectController {
    constructor() {
        this.effectSettings = {
            'Freshwater': {
                baseColor: '#00e1ff',
                glowColor: 'rgba(0, 225, 255, 0.6)',
                particleSize: [1.5, 3.2],
                flowPattern: 'gentle',
                effectStrength: 0.8
            },
            'Salt Lake': {
                baseColor: '#b835ff',
                glowColor: 'rgba(184, 53, 255, 0.6)',
                particleSize: [1.2, 2.8],
                flowPattern: 'crystalline',
                effectStrength: 0.9
            },
            'High Altitude': {
                baseColor: '#48f2ff',
                glowColor: 'rgba(72, 242, 255, 0.7)',
                particleSize: [1.0, 2.5],
                flowPattern: 'icy',
                effectStrength: 1.0
            },
            'Sacred Lake': {
                baseColor: '#ffcd6b',
                glowColor: 'rgba(255, 205, 107, 0.6)',
                particleSize: [1.8, 3.5],
                flowPattern: 'orbital',
                effectStrength: 1.2
            },
            'Brackish': {
                baseColor: '#2aacff',
                glowColor: 'rgba(42, 172, 255, 0.6)',
                particleSize: [1.4, 3.0],
                flowPattern: 'turbulent',
                effectStrength: 0.85
            }
        };
        
        // Specialized enhancers for each lake type
        this.enhancers = {
            'Sacred Lake': new SacredLakeEnhancer(),
            'High Altitude': StateManager.highAltitudeController || new HighAltitudeEffectController()
        };
        
        // Current quality level
        this.qualityLevel = 'high';
        
        // Initialize effect enhancers
        this.initialize();
        
        console.log('[LakeTypeEffectController] Initialized with specialized enhancers');
    }
    
    initialize() {
        // Connect to relevant systems
        if (StateManager.lakeManager) {
            StateManager.addEventListener('lakeChanged', (data) => {
                this.applyLakeTypeEffects(data.current);
            });
        }
        
        // Initialize flow patterns
        if (StateManager.flowController) {
            // Register flow patterns with the flow controller
            Object.entries(this.effectSettings).forEach(([type, settings]) => {
                StateManager.flowController.registerFlowPattern(
                    settings.flowPattern, 
                    this.createFlowPatternForType(type)
                );
            });
        }
    }
    
    createFlowPatternForType(lakeType) {
        // Create specialized flow patterns for each lake type
        switch (lakeType) {
            case 'Sacred Lake':
                return (x, y, center, time) => {
                    // Orbital pattern with time-based oscillation
                    const dx = x - center.x;
                    const dy = y - center.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) + time * 0.0005;
                    
                    return {
                        x: Math.cos(angle) * 0.1 * (1 + Math.sin(time * 0.001)),
                        y: Math.sin(angle) * 0.1 * (1 + Math.sin(time * 0.001))
                    };
                };
                
            case 'Freshwater':
                return (x, y, center, time) => {
                    // Gentle flowing pattern
                    return {
                        x: Math.sin(y * 0.1 + time * 0.0003) * 0.05,
                        y: Math.cos(x * 0.1 + time * 0.0002) * 0.05
                    };
                };
                
            // Add other flow patterns for different lake types
            
            default:
                return (x, y, center, time) => ({ x: 0, y: 0 });
        }
    }
    
    applyLakeTypeEffects(lakeId) {
        const lakeSystem = StateManager.particleSystems.get(lakeId);
        if (!lakeSystem) return;
        
        const lakeData = lakeSystem.lakeData;
        const lakeType = lakeData.type;
        
        console.log(`[LakeTypeEffectController] Applying ${lakeType} effects to ${lakeId}`);
        
        // Apply type-specific settings
        const settings = this.effectSettings[lakeType];
        if (!settings) return;
        
        // Apply visual effects based on lake type
        this.updateParticleVisuals(lakeSystem, settings);
        
        // Apply specialized enhancements if available
        if (lakeType === 'Sacred Lake' && this.enhancers['Sacred Lake']) {
            this.applySacredLakeEffects(lakeSystem);
        } else if (lakeType === 'High Altitude' && this.enhancers['High Altitude']) {
            this.applyHighAltitudeEffects(lakeSystem);
        } else if (lakeType === 'Freshwater') {
            this.applyFreshwaterEffects(lakeSystem);
        } else if (lakeType === 'Salt Lake') {
            this.applySaltLakeEffects(lakeSystem);
        } else if (lakeType === 'Brackish') {
            this.applyBrackishEffects(lakeSystem);
        }
        
        // Apply flow pattern
        if (StateManager.flowController) {
            StateManager.flowController.setActivePattern(lakeId, settings.flowPattern);
        }
    }
    
    updateParticleVisuals(lakeSystem, settings) {
        // Apply base visualization settings
        lakeSystem.baseColor = settings.baseColor;
        lakeSystem.glowColor = settings.glowColor;
        
        // Scale effect strength based on quality
        const qualityFactor = this.getQualityFactor();
        const effectStrength = settings.effectStrength * qualityFactor;
        
        // Apply to existing particles
        if (lakeSystem.particles) {
            lakeSystem.particles.forEach(particle => {
                particle.color = settings.baseColor;
                particle.glowColor = settings.glowColor;
                
                // Randomize particle size within range based on quality
                const [minSize, maxSize] = settings.particleSize;
                particle.size = minSize + Math.random() * (maxSize - minSize) * qualityFactor;
                
                // Apply other visual properties
                if (particle.setEffectStrength) {
                    particle.setEffectStrength(effectStrength);
                }
            });
        }
    }
    
    getQualityFactor() {
        const factors = {
            'minimal': 0.4,
            'low': 0.6,
            'medium': 0.8,
            'high': 1.0,
            'ultra': 1.2
        };
        
        return factors[this.qualityLevel] || 1.0;
    }
    
    setQualityLevel(level) {
        this.qualityLevel = level;
        
        // Update enhancers
        Object.values(this.enhancers).forEach(enhancer => {
            if (enhancer && enhancer.setQualityLevel) {
                enhancer.setQualityLevel(level);
            }
        });
    }
    
    applySacredLakeEffects(system) {
        // Delegate to SacredLakeEnhancer
        if (this.enhancers['Sacred Lake']) {
            this.enhancers['Sacred Lake'].enhanceSacredLake(system);
        }
    }
    
    applyHighAltitudeEffects(system) {
        // Delegate to HighAltitudeEffectController
        if (this.enhancers['High Altitude']) {
            this.enhancers['High Altitude'].applyEffects(system);
        }
    }
    
    applyFreshwaterEffects(system) {
        // Implement freshwater-specific effects
        // Add ripples, flowing movements, transparency effects
        if (!system.particles) return;
        
        system.particles.forEach(particle => {
            // Add gentle wave motion
            particle.addBehavior('wave', {
                amplitude: 0.5,
                frequency: 0.3 + Math.random() * 0.2,
                phase: Math.random() * Math.PI * 2
            });
            
            // Add reflection effect
            particle.reflective = true;
        });
    }
    
    applySaltLakeEffects(lakeSystem) {
        // Implementation for salt lake effects
        // Add crystalline structures, higher density, etc.
        if (!lakeSystem.particles) return;
        
        lakeSystem.particles.forEach(particle => {
            // Add crystallization effect
            particle.addBehavior('crystallize', {
                probability: 0.02,
                duration: 3000,
                maxSize: 2.5
            });
            
            // Add salt-specific visual properties
            particle.opacity = 0.8 + Math.random() * 0.2;
            particle.isSaltParticle = true;
        });
    }
    
    applyBrackishEffects(lakeSystem) {
        // Implementation for brackish water effects
        // Mix of salt and freshwater characteristics
        if (!lakeSystem.particles) return;
        
        lakeSystem.particles.forEach(particle => {
            // Brackish water has a mix of properties
            const isSaltDominant = Math.random() < 0.4;
            
            if (isSaltDominant) {
                particle.addBehavior('crystallize', {
                    probability: 0.01,
                    duration: 2000,
                    maxSize: 1.8
                });
                particle.opacity = 0.75 + Math.random() * 0.15;
            } else {
                particle.addBehavior('wave', {
                    amplitude: 0.3,
                    frequency: 0.2 + Math.random() * 0.2,
                    phase: Math.random() * Math.PI * 2
                });
                particle.reflective = Math.random() < 0.7;
            }
        });
    }
}