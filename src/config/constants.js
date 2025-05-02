// Core interaction configuration
export const INTERACTION_CONFIG = {
    scrollSensitivity: 0.8,
    maxForce: 2.0,
    dragCoefficient: 0.05,
    touchMultiplier: 1.5,
    minVelocity: 0.01
};

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
    targetFPS: 60,
    lowFPS: 30,
    batchSize: 100,
    maxActiveParticles: 2000,
    cullingDistance: 5000,
    dynamicLOD: true
};

// Add comprehensive quality presets
export const QUALITY_PRESETS = {
    'minimal': {
        particleMultiplier: 0.2,
        maxParticles: 500,
        renderScale: 0.5,
        effectComplexity: 0.0,
        animationComplexity: 0.0,
        glowEffects: false,
        postProcessing: false,
        physicsIterations: 1,
        renderDistance: 0.4
    },
    'low': {
        particleMultiplier: 0.4,
        maxParticles: 1000, 
        renderScale: 0.6,
        effectComplexity: 0.3,
        animationComplexity: 0.3,
        glowEffects: true,
        postProcessing: false,
        physicsIterations: 2,
        renderDistance: 0.6
    },
    'medium': {
        particleMultiplier: 0.7,
        maxParticles: 2000,
        renderScale: 0.8,
        effectComplexity: 0.6,
        animationComplexity: 0.6,
        glowEffects: true,
        postProcessing: true,
        physicsIterations: 3,
        renderDistance: 0.8
    },
    'high': {
        particleMultiplier: 1.0,
        maxParticles: 4000,
        renderScale: 1.0,
        effectComplexity: 0.8,
        animationComplexity: 0.8,
        glowEffects: true,
        postProcessing: true,
        physicsIterations: 4,
        renderDistance: 1.0
    },
    'ultra': {
        particleMultiplier: 1.5,
        maxParticles: 8000,
        renderScale: 1.2,
        effectComplexity: 1.0,
        animationComplexity: 1.0,
        glowEffects: true,
        postProcessing: true,
        physicsIterations: 5,
        renderDistance: 1.2
    }
};