/**
 * StateManager - Singleton for managing global state across the application
 * This pattern reduces global namespace pollution and provides a central store
 */
import { QualityGovernor } from './utils/QualityGovernor.js';
import { ParticlePool } from './utils/ParticlePool.js';
import { PERFORMANCE_THRESHOLDS } from './config/constants.js';
import { LakeVisualizationSystem } from './components/LakeVisualizationSystem.js';
import { FlowController } from './components/FlowController.js';
import { HighAltitudeEffectController } from './components/HighAltitudeEffectController.js';

class StateManager {
    constructor() {
        // Active lake tracking
        this.activeLakeName = 'wular';
        
        // Maps to store component instances
        this.particleSystems = new Map();
        this.lakes = {};
        this.perfMonitor = null;
        this.lakeVisualizationSystem = null;
        
        // Core system references
        this.particlePool = null;
        this.lakeManager = null;
        this.mapIntegrator = null;
        this.sacredLakeEnhancer = null;
        this.scrollAnimationController = null;
        this.coinAttributionSystem = null;
        this.batchProcessor = null;
        this.qualityGovernor = null;
        this.flowController = null;
        this.highAltitudeController = null;
        
        // Quality settings
        this.qualityLevel = 'high';
        
        // Performance tracking
        this.isLowPerformanceMode = false;
        
        // Event handling
        this.eventListeners = new Map();
    }
    
    // State management methods
    setActiveLake(name) { 
        const previous = this.activeLakeName;
        this.activeLakeName = name;
        this.dispatchEvent('lakeChanged', { previous, current: name });
    }
    
    getActiveLake() { 
        return this.activeLakeName; 
    }
    
    // Set performance mode based on metrics
    setPerformanceMode(isLow) {
        if (this.isLowPerformanceMode !== isLow) {
            this.isLowPerformanceMode = isLow;
            this.dispatchEvent('performanceModeChanged', { isLowPerformance: isLow });
        }
    }
    
    // Set quality level
    setQualityLevel(level) {
        this.qualityLevel = level;
        // Notify any systems that need to know about quality changes
        if (this.eventEmitter) {
            this.eventEmitter.emit('quality-changed', level);
        }
        if (!this.qualityGovernor) return;
        this.qualityGovernor.setQualityLevel(level);
        
        // Dispatch quality change event
        this.dispatchEvent('qualityChanged', { level });
    }
    
    // Get appropriate particle count based on performance mode
    getParticleCountForCurrentMode(baseCount) {
        const qualityMultipliers = {
            'minimal': 0.2,
            'low': 0.4,
            'medium': 0.7,
            'high': 1.0,
            'ultra': 1.5
        };
        
        const multiplier = qualityMultipliers[this.qualityLevel] || 1.0;
        return Math.floor(baseCount * multiplier);
    }
    
    // Event system
    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }
        
        this.eventListeners.get(eventType).add(callback);
        return () => this.removeEventListener(eventType, callback);
    }
    
    removeEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) return false;
        return this.eventListeners.get(eventType).delete(callback);
    }
    
    dispatchEvent(eventType, data) {
        if (!this.eventListeners.has(eventType)) return;
        
        this.eventListeners.get(eventType).forEach(callback => {
            try {
                callback(data);
            } catch (err) {
                console.error(`Error in ${eventType} event handler:`, err);
            }
        });
    }
    
    // Core system initialization check
    isInitialized() {
        return this.particlePool !== null && 
               this.perfMonitor !== null && 
               this.lakeManager !== null;
    }
    
    // Clean up resources when application is closed
    cleanup() {
        // Dispose of all particle systems
        this.particleSystems.forEach(system => system.dispose());
        this.particleSystems.clear();
        
        // Clear markers
        this.markers.clear();
        
        // Clear event listeners
        this.eventListeners.clear();
        
        // Clean up managers
        if (this.lakeManager) {
            this.lakeManager.dispose();
            this.lakeManager = null;
        }
        
        if (this.mapIntegrator) {
            this.mapIntegrator.dispose();
            this.mapIntegrator = null;
        }
        
        if (this.sacredLakeEnhancer) {
            this.sacredLakeEnhancer.dispose();
            this.sacredLakeEnhancer = null;
        }
        
        if (this.scrollAnimationController) {
            this.scrollAnimationController.dispose();
            this.scrollAnimationController = null;
        }
        
        if (this.coinAttributionSystem) {
            this.coinAttributionSystem.dispose();
            this.coinAttributionSystem = null;
        }
        
        console.log('[StateManager] Cleaned up resources');
    }

    // Initialize event handler
    initEventHandler(map) {
        if (map && !this.eventHandler) {
            const { EventHandler } = require('./utils/EventHandler.js');
            this.eventHandler = new EventHandler(map);
            console.log('[StateManager] Initialized event handler');
            return this.eventHandler;
        }
        return null;
    }
    
    // Get event handler
    getEventHandler() {
        return this.eventHandler;
    }

    // Initialize quality governor
    initQualityGovernor() {
        if (!this.qualityGovernor) {
            this.qualityGovernor = new QualityGovernor();
            
            // Subscribe to quality changes to update all relevant systems
            this.qualityGovernor.subscribe(({ level, settings }) => {
                // Update particle systems
                this.particleSystems.forEach(system => {
                    if (system && system.setQualityLevel) {
                        system.setQualityLevel(level, settings);
                    }
                });
                
                // Update renderer and visual effects
                if (this.mapIntegrator?.lakeRenderer) {
                    this.mapIntegrator.lakeRenderer.setQualityLevel(level, settings);
                }
                
                // Update effect controllers
                if (this.lakeTypeEffectController) {
                    this.lakeTypeEffectController.setQualityLevel(level, settings);
                }
                
                console.log(`[StateManager] Applied quality settings: ${level}`);
            });
            
            console.log('[StateManager] Initialized quality governor');
            return this.qualityGovernor;
        }
        return this.qualityGovernor;
    }
    
    // Get quality governor
    getQualityGovernor() {
        return this.qualityGovernor;
    }

    // Initialize particle pool
    initParticlePool(size = PERFORMANCE_THRESHOLDS.maxActiveParticles) {
        if (!this.particlePool) {
            this.particlePool = new ParticlePool(size);
            console.log('[StateManager] Initialized particle pool');
            return this.particlePool;
        }
        return this.particlePool;
    }
    
    // Get the particle pool
    getParticlePool() {
        return this.particlePool;
    }

    // Initialize visualization system
    initializeVisualizationSystem() {
        if (this.lakeVisualizationSystem) {
            console.log('[StateManager] Lake visualization system already initialized');
            return this.lakeVisualizationSystem;
        }
        
        console.log('[StateManager] Initializing Lake Visualization System');
        this.lakeVisualizationSystem = new LakeVisualizationSystem();
        return this.lakeVisualizationSystem;
    }

    // Initialize flow controller
    initializeFlowController() {
        if (this.flowController) {
            console.log('[StateManager] Flow controller already initialized');
            return this.flowController;
        }
        
        console.log('[StateManager] Initializing Flow Controller');
        this.flowController = new FlowController();
        return this.flowController;
    }

    // Initialize high altitude controller
    initializeHighAltitudeController() {
        if (this.highAltitudeController) {
            console.log('[StateManager] High altitude controller already initialized');
            return this.highAltitudeController;
        }
        
        console.log('[StateManager] Initializing High Altitude Effect Controller');
        this.highAltitudeController = new HighAltitudeEffectController();
        return this.highAltitudeController;
    }

    // Add initialization method for LakeTypeEffectController
    initializeLakeTypeEffectController() {
        if (this.lakeTypeEffectController) {
            console.log('[StateManager] Lake type effect controller already initialized');
            return this.lakeTypeEffectController;
        }
        
        import('./components/LakeTypeEffectController.js').then(module => {
            this.lakeTypeEffectController = new module.LakeTypeEffectController();
            console.log('[StateManager] Initialized Lake Type Effect Controller');
            
            // Apply effects to current lake
            const activeLake = this.getActiveLake();
            if (activeLake) {
                this.lakeTypeEffectController.applyLakeTypeEffects(activeLake);
            }
        }).catch(error => {
            console.error('[StateManager] Failed to initialize LakeTypeEffectController:', error);
        });
    }

    // Add initialization method for ParticleOptimizer
    initParticleOptimizer() {
        if (this.particleOptimizer) {
            console.log('[StateManager] Particle optimizer already initialized');
            return this.particleOptimizer;
        }
        
        import('./utils/ParticleOptimizer.js').then(module => {
            this.particleOptimizer = new module.ParticleOptimizer();
            console.log('[StateManager] Initialized Particle Optimizer');
            
            // Connect to performance monitor for adaptive optimization
            if (this.perfMonitor) {
                this.perfMonitor.addObserver(metrics => {
                    this.particleOptimizer.adaptToPerformance(metrics.fps);
                });
            }
            
            // Register with map integrator for camera position updates
            if (this.mapIntegrator) {
                this.mapIntegrator.registerViewportListener((prevState, currentState) => {
                    // Apply optimizations to all active particle systems
                    this.particleSystems.forEach(system => {
                        if (system.active && this.particleOptimizer) {
                            const cameraPosition = {
                                x: currentState.center[0],
                                y: currentState.center[1],
                                z: 0
                            };
                            this.particleOptimizer.optimizeParticleSystem(system, cameraPosition);
                        }
                    });
                });
            }
        }).catch(error => {
            console.error('[StateManager] Failed to initialize ParticleOptimizer:', error);
        });
    }

    // Add initialization method for FlowController with FluidSimulation
    initFlowController() {
        if (this.flowController) {
            console.log('[StateManager] Flow controller already initialized');
            return this.flowController;
        }
        
        // First load the FluidSimulation
        import('./utils/FluidSimulation.js').then(fluidModule => {
            // Then load FlowController and initialize with FluidSimulation
            import('./components/FlowController.js').then(flowModule => {
                this.flowController = new flowModule.FlowController();
                
                // Initialize fluid simulations for each lake type
                this.fluidSimulations = new Map();
                
                const lakeTypes = ['Freshwater', 'Salt Lake', 'High Altitude', 'Sacred Lake', 'Brackish'];
                
                lakeTypes.forEach(type => {
                    // Create fluid simulation with type-specific parameters
                    const simOptions = this.getFluidSimulationOptionsForType(type);
                    
                    this.fluidSimulations.set(
                        type, 
                        new fluidModule.FluidSimulation(simOptions)
                    );
                });
                
                // Connect FlowController with FluidSimulations
                this.flowController.setFluidSimulations(this.fluidSimulations);
                
                console.log('[StateManager] Initialized Flow Controller with Fluid Simulations');
                
                // Connect to active lake
                const activeLake = this.getActiveLake();
                if (activeLake && this.lakeTypeEffectController) {
                    this.lakeTypeEffectController.applyLakeTypeEffects(activeLake);
                }
            }).catch(error => {
                console.error('[StateManager] Failed to initialize FlowController:', error);
            });
        }).catch(error => {
            console.error('[StateManager] Failed to load FluidSimulation:', error);
        });
    }

    // Helper method to get fluid simulation options for each lake type
    getFluidSimulationOptionsForType(lakeType) {
        switch (lakeType) {
            case 'Freshwater':
                return {
                    width: 32,
                    height: 32,
                    resolution: 20,
                    iterations: 4,
                    viscosity: 0.3,
                    diffusion: 0.5
                };
                
            case 'Salt Lake':
                return {
                    width: 32,
                    height: 32,
                    resolution: 20,
                    iterations: 4,
                    viscosity: 0.5, // Higher viscosity for salt water
                    diffusion: 0.3
                };
                
            case 'High Altitude':
                return {
                    width: 32,
                    height: 32,
                    resolution: 20,
                    iterations: 4,
                    viscosity: 0.6, // Higher viscosity for cold water
                    diffusion: 0.2
                };
                
            case 'Sacred Lake':
                return {
                    width: 48, // Higher resolution
                    height: 48,
                    resolution: 15,
                    iterations: 5,
                    viscosity: 0.25,
                    diffusion: 0.6 // Higher diffusion for special effects
                };
                
            case 'Brackish':
                return {
                    width: 32,
                    height: 32,
                    resolution: 20,
                    iterations: 4,
                    viscosity: 0.4,
                    diffusion: 0.4
                };
                
            default:
                return {
                    width: 32,
                    height: 32,
                    resolution: 20,
                    iterations: 4,
                    viscosity: 0.3,
                    diffusion: 0.5
                };
        }
    }
}

// Add initialization to the StateManager initialization sequence
StateManager.init = function() {
    // Initialize flow controller
    this.initializeFlowController();
    
    // Initialize high altitude controller
    this.initializeHighAltitudeController();

    // Initialize particle optimizer
    this.initParticleOptimizer();
    
    // Initialize type effect controller
    this.initializeLakeTypeEffectController();
};

export const stateManager = new StateManager();