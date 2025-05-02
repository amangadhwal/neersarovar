import { StateManager } from '../stateManager.js';
import { PERFORMANCE_THRESHOLDS, QUALITY_PRESETS } from '../config/constants.js';

/**
 * QualityGovernor class for adaptive quality management
 * Handles automatic quality adjustments based on performance
 */
export class QualityGovernor {
    constructor() {
        this.qualityLevels = ['ultra', 'high', 'medium', 'low', 'minimal'];
        this.currentLevel = 'high'; // Default starting point
        this.targetLevel = null;
        this.transitionProgress = 1.0; // 0-1 for smooth transitions
        this.transitionSpeed = 0.05; // 5% per frame
        this.subscribers = new Set();
        
        // Detect initial quality level
        const deviceTier = this.detectDeviceTier();
        this.setQualityLevel(deviceTier);
        
        console.log(`[QualityGovernor] Initial quality level: ${this.currentLevel} (device tier: ${deviceTier})`);
        
        // Start transition loop
        this.transitionLoop();
    }
    
    // Detect device capabilities and return appropriate quality tier
    detectDeviceTier() {
        const gpu = this.getGPUInfo();
        const memory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 4;
        
        // Scoring system for device capabilities
        let score = 0;
        
        // GPU scoring
        if (gpu.renderer.includes('RTX') || gpu.renderer.includes('Radeon Pro')) {
            score += 50;
        } else if (gpu.renderer.includes('GTX') || gpu.renderer.includes('Radeon')) {
            score += 30;
        } else if (gpu.renderer.includes('Intel') && gpu.renderer.includes('Iris')) {
            score += 20;
        } else if (gpu.renderer.includes('Intel')) {
            score += 10;
        }
        
        // Memory scoring
        score += Math.min(memory, 8) * 5;
        
        // CPU scoring
        score += Math.min(cores, 8) * 5;
        
        // Mobile detection
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            score = Math.floor(score * 0.6); // Reduce score on mobile devices
        }
        
        // Determine quality tier based on score
        if (score >= 100) return 'ultra';
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        if (score >= 20) return 'low';
        return 'minimal';
    }
    
    // Get GPU information using WebGL
    getGPUInfo() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                return { renderer: 'unknown', vendor: 'unknown' };
            }
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) {
                return { renderer: 'unknown', vendor: 'unknown' };
            }
            
            return {
                renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown',
                vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown'
            };
        } catch (e) {
            console.error('[QualityGovernor] Error detecting GPU:', e);
            return { renderer: 'unknown', vendor: 'unknown' };
        }
    }
    
    transitionLoop() {
        requestAnimationFrame(() => this.transitionLoop());
        
        if (this.targetLevel && this.transitionProgress < 1.0) {
            this.transitionProgress += this.transitionSpeed;
            
            if (this.transitionProgress >= 1.0) {
                this.transitionProgress = 1.0;
                this.currentLevel = this.targetLevel;
                this.targetLevel = null;
                
                console.log(`[QualityGovernor] Completed transition to ${this.currentLevel}`);
                this.notifySubscribers();
            } else {
                this.updateIntermediateSettings();
            }
        }
    }
    
    setQualityLevel(level) {
        if (!QUALITY_PRESETS[level]) {
            console.error(`[QualityGovernor] Invalid quality level: ${level}`);
            return false;
        }
        
        if (level === this.currentLevel) return true;
        
        console.log(`[QualityGovernor] Setting quality level: ${this.currentLevel} → ${level}`);
        
        // Start transition
        this.targetLevel = level;
        this.transitionProgress = 0.0;
        
        return true;
    }
    
    increaseQuality() {
        const currentIndex = this.qualityLevels.indexOf(this.currentLevel);
        if (currentIndex > 0) {
            const newLevel = this.qualityLevels[currentIndex - 1];
            return this.setQualityLevel(newLevel);
        }
        return false;
    }
    
    decreaseQuality() {
        const currentIndex = this.qualityLevels.indexOf(this.currentLevel);
        if (currentIndex < this.qualityLevels.length - 1) {
            const newLevel = this.qualityLevels[currentIndex + 1];
            return this.setQualityLevel(newLevel);
        }
        return false;
    }
    
    updateIntermediateSettings() {
        if (!this.targetLevel) return;
        
        const currentSettings = QUALITY_PRESETS[this.currentLevel];
        const targetSettings = QUALITY_PRESETS[this.targetLevel];
        
        // Calculate interpolated settings
        const interpolatedSettings = {};
        for (const key in currentSettings) {
            if (typeof currentSettings[key] === 'number' && typeof targetSettings[key] === 'number') {
                interpolatedSettings[key] = currentSettings[key] + 
                    (targetSettings[key] - currentSettings[key]) * this.transitionProgress;
            } else {
                interpolatedSettings[key] = this.transitionProgress > 0.5 ? 
                    targetSettings[key] : currentSettings[key];
            }
        }
        
        // Apply interpolated settings
        this.applySettings(interpolatedSettings);
    }
    
    applySettings(settings) {
        // Update maxParticles across systems
        PERFORMANCE_THRESHOLDS.maxActiveParticles = Math.floor(settings.maxParticles);
        
        // Update each particle system
        StateManager.particleSystems.forEach(system => {
            if (system) {
                system.particleMultiplier = settings.particleMultiplier;
                if (typeof system.setEffectComplexity === 'function') {
                    system.setEffectComplexity(settings.effectComplexity);
                }
            }
        });
        
        // Update global rendering settings
        if (window.renderScale !== settings.renderScale) {
            window.renderScale = settings.renderScale;
            this.updateCanvasScale(settings.renderScale);
        }
        
        // Notify subscribers of intermediate update
        this.notifySubscribers('intermediate', settings);
    }
    
    updateCanvasScale(scale) {
        // Update all canvases with new scale
        StateManager.particleSystems.forEach(system => {
            if (system.renderer?.canvas) {
                const canvas = system.renderer.canvas;
                const parent = canvas.parentElement;
                
                // Get parent dimensions
                const width = parent.clientWidth;
                const height = parent.clientHeight;
                
                // Set canvas size based on scale
                canvas.width = Math.floor(width * scale);
                canvas.height = Math.floor(height * scale);
                
                // Update style to maintain visual size
                canvas.style.width = width + 'px';
                canvas.style.height = height + 'px';
            }
        });
    }
    
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    
    notifySubscribers(type = 'complete', settings = null) {
        const currentSettings = settings || QUALITY_PRESETS[this.currentLevel];
        for (const callback of this.subscribers) {
            try {
                callback({
                    level: this.currentLevel,
                    type,
                    settings: currentSettings
                });
            } catch (e) {
                console.error('[QualityGovernor] Error in subscriber callback:', e);
            }
        }
    }
    
    getQualityInfo() {
        return {
            current: this.currentLevel,
            available: this.qualityLevels,
            transitioning: !!this.targetLevel,
            target: this.targetLevel,
            progress: this.transitionProgress,
            settings: QUALITY_PRESETS[this.currentLevel]
        };
    }

    // Add advanced quality settings with comprehensive post-processing
    updatePostProcessing(settings) {
        if (!window.postProcessor) return;
        
        window.postProcessor.enabled = settings.postProcessing;
        
        // Update individual effects
        if (window.postProcessor.effects) {
            for (const effect of window.postProcessor.effects) {
                if (effect.name === 'bloom') {
                    effect.intensity = settings.effectComplexity;
                    effect.enabled = settings.effectComplexity > 0.3;
                } else if (effect.name === 'ssao') {
                    effect.enabled = settings.effectComplexity > 0.7;
                }
            }
        }
    }
}