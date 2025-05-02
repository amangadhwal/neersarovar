import { StateManager } from '../stateManager.js';
import { PERFORMANCE_THRESHOLDS, QUALITY_PRESETS } from '../config/constants.js';
import { getLakeConfigType } from '../models/lakes.js';
import { ParticleSystem } from './ParticleSystem.js';
import { LakeRenderer } from './LakeRenderer.js';

/**
 * LakeVisualizationSystem manages the visualization of lakes
 * Controls quality settings, visualization creation/removal, and performance monitoring
 */
export class LakeVisualizationSystem {
    constructor() {
        this.activeVisualizations = new Map();
        this.effectsEnabled = true;
        this.visualizationEnabled = true;
        
        // Performance quality settings (simplified from original)
        this.qualitySettings = {
            high: {
                particleMultiplier: 1.0,
                glowEffects: true,
                animationComplexity: 1.0,
                renderDistance: 1.0
            },
            medium: {
                particleMultiplier: 0.7,
                glowEffects: true,
                animationComplexity: 0.7,
                renderDistance: 0.8
            },
            low: {
                particleMultiplier: 0.4,
                glowEffects: false,
                animationComplexity: 0.4,
                renderDistance: 0.5
            }
        };
        
        // Current quality level
        this.currentQuality = 'high';
        
        // Set up performance monitoring integration
        this.setupPerformanceMonitoring();
        
        console.log('[LakeVisualizationSystem] Initialized with quality:', this.currentQuality);
    }
    
    setupPerformanceMonitoring() {
        // Get performance monitor if available
        this.perfMonitor = StateManager.perfMonitor;
        
        // Update performance display periodically
        setInterval(() => this.adaptQualityBasedOnPerformance(), 5000);
    }
    
    adaptQualityBasedOnPerformance() {
        if (!this.perfMonitor) return;
        
        // Check current FPS
        const currentFPS = this.perfMonitor.metrics.fps;
        const memoryUsage = this.perfMonitor.metrics.memoryUsage / (1024 * 1024); // Convert to MB
        
        // Determine appropriate quality level
        let newQuality = this.currentQuality;
        
        if (currentFPS < 25 || memoryUsage > 150) {
            // Poor performance - reduce quality
            if (this.currentQuality === 'high') {
                newQuality = 'medium';
            } else if (this.currentQuality === 'medium') {
                newQuality = 'low';
            }
        } else if (currentFPS > 55 && memoryUsage < 100) {
            // Good performance - increase quality if possible
            if (this.currentQuality === 'low') {
                newQuality = 'medium';
            } else if (this.currentQuality === 'medium') {
                newQuality = 'high';
            }
        }
        
        // If quality level changed, apply new settings
        if (newQuality !== this.currentQuality) {
            console.log(`[LakeVisualization] Adapting quality from ${this.currentQuality} to ${newQuality} (FPS: ${currentFPS.toFixed(1)}, Memory: ${memoryUsage.toFixed(2)} MB)`);
            this.currentQuality = newQuality;
            this.applyQualitySettings();
        }
    }
    
    applyQualitySettings() {
        const settings = this.qualitySettings[this.currentQuality];
        
        // Apply quality settings to all active particle systems
        StateManager.particleSystems.forEach(system => {
            if (!system?.active) return;
            
            // Adjust particle count
            const typeConfig = getLakeConfigType(system.lakeType);
            const targetCount = Math.floor(QUALITY_PRESETS[this.currentQuality].particleMultiplier * system.particles.length);
            
            // If we need to reduce particles
            if (system.particles && system.particles.length > targetCount) {
                // Remove excess particles
                system.particles.splice(targetCount, system.particles.length - targetCount);
            }
            
            // Update rendering settings
            system.effectComplexity = settings.animationComplexity;
            system.glowEffects = settings.glowEffects;
        });
        
        // Notify StateManager of quality change
        StateManager.setQualityLevel(this.currentQuality);
    }
    
    createVisualization(lakeName) {
        const lakes = StateManager.lakes || {};
        const lake = lakes[lakeName];
        if (!lake || this.activeVisualizations.has(lakeName)) return;
        
        console.log(`[LakeVisualization] Creating visualization for ${lake.title}`);
        
        // Create container for visualization if needed
        const container = document.createElement('div');
        container.className = 'lake-visualization';
        container.setAttribute('data-lake-type', lake.type);
        container.style.position = 'absolute';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '9';
        
        // Store visualization
        this.activeVisualizations.set(lakeName, {
            container,
            lake,
            active: true,
            createdAt: performance.now()
        });
        
        // Add to DOM
        document.body.appendChild(container);
        
        // Initialize particles if we haven't already
        if (!StateManager.particleSystems.has(lakeName)) {
            this.initializeParticles(lakeName);
        }
    }
    
    updateVisualizationPosition(lakeName) {
        const viz = this.activeVisualizations.get(lakeName);
        if (!viz) return;
        
        const map = StateManager.map;
        if (!map) return;
        
        // Project lake center to screen coordinates
        const center = map.project(viz.lake.center);
        
        // Position container
        viz.container.style.left = `${center.x}px`;
        viz.container.style.top = `${center.y}px`;
        
        // Scale based on zoom level and quality settings
        const zoom = map.getZoom();
        const scaleMultiplier = this.qualitySettings[this.currentQuality].renderDistance;
        const scale = Math.max(0.5, Math.min(2, zoom / 10)) * scaleMultiplier;
        viz.container.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }
    
    initializeParticles(lakeName) {
        const lakes = StateManager.lakes || {};
        const lake = lakes[lakeName];
        if (!lake) return;
        
        // Get lake config
        const lakeType = getLakeConfigType(lake.type);
        
        // Determine particle count based on quality setting
        const quality = this.qualitySettings[this.currentQuality];
        let particleCount = Math.floor(QUALITY_PRESETS[this.currentQuality].maxParticles * quality.particleMultiplier);
        
        // Create particle system
        const renderer = new LakeRenderer(document.createElement('canvas'));
        const system = new ParticleSystem(StateManager.map, lakeName, lake, renderer);
        
        // Set quality-specific options if available
        system.effectComplexity = quality.animationComplexity;
        system.glowEffects = quality.glowEffects;
        
        // Store in StateManager
        StateManager.particleSystems.set(lakeName, system);
        
        console.log(`[LakeVisualization] Created ${particleCount} particles for ${lake.title} at ${this.currentQuality} quality`);
    }
    
    removeVisualization(lakeName) {
        const viz = this.activeVisualizations.get(lakeName);
        if (!viz) return;
        
        console.log(`[LakeVisualization] Removing visualization for ${viz.lake.title}`);
        
        // Remove from DOM
        if (viz.container.parentNode) {
            viz.container.parentNode.removeChild(viz.container);
        }
        
        // Remove from tracking
        this.activeVisualizations.delete(lakeName);
        
        // Clean up particle system
        if (StateManager.particleSystems.has(lakeName)) {
            StateManager.particleSystems.get(lakeName).deactivate();
        }
    }
    
    updateVisualizations() {
        // Update positions of all visualizations
        for (const lakeName of this.activeVisualizations.keys()) {
            this.updateVisualizationPosition(lakeName);
        }
    }
    
    // Utility method to force a quality level
    setQualityLevel(level) {
        if (!this.qualitySettings[level]) {
            console.error(`[LakeVisualization] Invalid quality level: ${level}`);
            return false;
        }
        
        this.currentQuality = level;
        this.applyQualitySettings();
        console.log(`[LakeVisualization] Quality level manually set to ${level}`);
        return true;
    }
}