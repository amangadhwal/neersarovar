import * as maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import { StateManager } from './stateManager.js';
import { debounce } from './utils/debounce.js';
import { Particle3D } from './components/Particle3D.js';
import { PerformanceMonitor } from './components/PerformanceMonitor.js';
import { LakeManager } from './components/LakeManager.js';
import { MapIntegrator } from './components/MapIntegrator.js';
import { ParticleSystem } from './components/ParticleSystem.js';
import { LakeRenderer } from './components/LakeRenderer.js';
import { SpatialGrid } from './utils/SpatialGrid.js';
import { lakes, LAKE_CONFIG } from './models/lakes.js';
import { ParticlePool } from './utils/ParticlePool.js';

// Performance and interaction configuration constants
const PERFORMANCE_THRESHOLDS = { 
    minFps: 30, 
    targetFps: 60, 
    maxActiveParticles: 5000,
    cullingDistance: 5000,
    dynamicLOD: true
};

const INTERACTION_CONFIG = {
    scrollSensitivity: 0.8,
    maxForce: 2.0,
    dragCoefficient: 0.05,
    touchMultiplier: 1.5,
    debounceDelay: 16,
    touchThreshold: 10
};

// Main initialization variables
let map, animationFrameId;

// Initialize our application following the correct sequence
function initializeApp() {
    try {
        console.log('[NeerSarovar] Initializing application...');
        
        // 1. Validate DOM elements
        validateDOMElements();
        
        // 2. Initialize Map
        initializeMap();
        
        // 3. Initialize StateManager
        initializeStateManager();
        
        // 4. Set up global event listeners
        setupEventListeners();
        
        // 5. Initialize Perlin noise worker
        initializePerlinWorker();
        
        console.log('[NeerSarovar] Application initialized successfully');
    } catch (error) {
        console.error('[NeerSarovar] Initialization failed:', error);
        document.getElementById('map').innerHTML = '<p>Failed to initialize application. Please refresh the page.</p>';
    }
}

function validateDOMElements() {
    const requiredElements = ['map', 'features'];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Required DOM element #${id} not found`);
        }
    });
    
    console.log('[NeerSarovar] DOM elements validated');
}

function initializeMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://api.maptiler.com/maps/aquarelle/style.json?key=Dg1WfMzTbfwtd1Wa6fY',
        center: lakes.wular.center,
        zoom: lakes.wular.zoom,
        bearing: lakes.wular.bearing,
        pitch: lakes.wular.pitch
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    
    console.log('[NeerSarovar] Map initialized');
    
    // Load map and initialize components when map is ready
    map.on('load', onMapLoaded);
}

function initializeStateManager() {
    // Create performance monitor
    StateManager.perfMonitor = new PerformanceMonitor();
    
    // Create spatial grid for particle culling
    StateManager.spatialGrid = new SpatialGrid();
    
    // Initialize particle pool for object reuse
    StateManager.particlePool = new ParticlePool(PERFORMANCE_THRESHOLDS.maxActiveParticles);
    
    console.log('[NeerSarovar] State manager initialized');
}

function initializePerlinWorker() {
    // Create the Perlin noise Web Worker
    try {
        const perlinWorker = new Worker(new URL('./workers/perlinWorker.js', import.meta.url));
        
        // Initialize the worker with a random seed
        perlinWorker.postMessage({ 
            type: 'init', 
            data: { seed: Math.random } 
        });
        
        // Store the worker in StateManager for later use
        StateManager.perlinWorker = perlinWorker;
        
        console.log('[NeerSarovar] Perlin noise worker initialized');
    } catch (error) {
        console.error('[NeerSarovar] Failed to initialize Perlin worker:', error);
        // Continue without the worker - will use main thread for calculations
    }
}

function onMapLoaded() {
    try {
        console.log('[NeerSarovar] Map loaded, initializing visualization components');
        
        // Initialize core systems
        StateManager.initParticlePool();
        StateManager.initQualityGovernor();
        StateManager.initEventHandler(map);
        
        // 1. Initialize lake sections and markers
        generateLakeSections();
        createMarkers();
        
        // 2. Initialize lake manager and integrators
        StateManager.lakeManager = new LakeManager(map);
        StateManager.mapIntegrator = new MapIntegrator(map);
        
        // 3. Initialize sacred lake enhancer
        StateManager.sacredLakeEnhancer = new SacredLakeEnhancer();
        
        // 4. Create attribution system
        StateManager.coinAttributionSystem = new CoinAttributionSystem('attribution-container');
        StateManager.coinAttributionSystem.loadModel();
        
        // 5. Create and activate initial particle system
        const lakeRenderer = new LakeRenderer(document.createElement('canvas'));
        StateManager.particleSystems.set('wular', new ParticleSystem(map, 'wular', lakes.wular, lakeRenderer));
        StateManager.particleSystems.get('wular').activate();
        
        // 6. Start animation loop
        animationFrameId = requestAnimationFrame(updateParticleSystems);
        
        // 7. Set active lake
        StateManager.lakeManager.setActiveLake('wular');
        
        // 8. Setup window resize handling
        window.addEventListener('resize', handleWindowResize);
        
        // Initialize visualization system
        const visualizationSystem = StateManager.initializeVisualizationSystem();
        
        // Register visualization system with map integrator
        if (mapIntegrator) {
            mapIntegrator.registerViewportListener(visualizationSystem);
            
            // Register high altitude controller for viewport updates
            const highAltitudeController = StateManager.highAltitudeController;
            if (highAltitudeController) {
                mapIntegrator.registerViewportListener({
                    updateVisualizations: function() {
                        highAltitudeController.updateIceEdgePositions();
                    }
                });
            }
        }
        
        // Create visualizations for initial lakes
        if (visualizationSystem && StateManager.lakes) {
            Object.keys(StateManager.lakes).forEach(lakeName => {
                visualizationSystem.createVisualization(lakeName);
            });
        }
        
    } catch (error) {
        console.error('[NeerSarovar] Map load failed:', error);
        document.getElementById('map').innerHTML = '<p>Failed to load map. Please try again.</p>';
    }
}

function handleWindowResize() {
    // Debounced resize handler for performance
    const debounceResize = debounce(() => {
        // Update particle systems and renderers
        StateManager.particleSystems.forEach(system => {
            if (system.renderer) system.renderer.resize();
        });
        
        // Update map integrator
        if (StateManager.mapIntegrator) {
            StateManager.mapIntegrator.updateParticleCanvas();
        }
        
        // Update coin attribution system
        if (StateManager.coinAttributionSystem) {
            StateManager.coinAttributionSystem.resize();
        }
        
    }, 250);
    
    debounceResize();
}

function setupEventListeners() {
    // Add resize event listener
    window.addEventListener('resize', debounce(() => {
        StateManager.particleSystems.forEach(system => system.renderer.resize());
    }, 250));
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // 'P' key to toggle performance monitor
        if (e.key === 'p' || e.key === 'P') {
            const monitor = document.getElementById('performance-monitor');
            if (monitor) {
                monitor.style.display = monitor.style.display === 'none' ? 'block' : 'none';
            }
        }
        
        // Arrow keys for lake navigation
        const lakeIds = Object.keys(lakes);
        const currentIdx = lakeIds.indexOf(StateManager.getActiveLake());
        if (e.key === 'ArrowRight') {
            const nextIndex = (currentIdx + 1) % lakeIds.length;
            StateManager.lakeManager.setActiveLake(lakeIds[nextIndex]);
        }
        if (e.key === 'ArrowLeft') {
            const prevIndex = (currentIdx - 1 + lakeIds.length) % lakeIds.length;
            StateManager.lakeManager.setActiveLake(lakeIds[prevIndex]);
        }
    });
}

// Utility functions
function updateSectionClasses(newLake, oldLake) {
    const newEl = document.getElementById(newLake);
    const oldEl = document.getElementById(oldLake);
    if (oldEl) oldEl.className = '';
    if (newEl) newEl.className = 'active';
}

function updateMarkerStyles(newLake, oldLake) {
    const markers = StateManager.markers;
    if (markers.get(oldLake)) markers.get(oldLake).element.classList.remove('marker-active');
    if (markers.get(newLake)) markers.get(newLake).element.classList.add('marker-active');
}

function toggleParticleSystems(newLake, oldLake) {
    const systems = StateManager.particleSystems;
    if (systems.get(oldLake)) systems.get(oldLake).deactivate();
    if (!systems.get(newLake)) {
        systems.set(newLake, new ParticleSystem(map, newLake, lakes[newLake], new LakeRenderer(document.createElement('canvas'))));
    }
    systems.get(newLake).activate();
}

function generateLakeSections() {
    const featuresContainer = document.getElementById('features');
    featuresContainer.innerHTML = '';
    
    Object.entries(lakes).sort((a, b) => b[1].size - a[1].size).forEach(([lakeId, lake]) => {
        const section = document.createElement('section');
        section.id = lakeId;
        section.className = lakeId === StateManager.getActiveLake() ? 'active' : '';
        section.innerHTML = `
            <h2>${lake.title || lakeId}</h2>
            <p>Type: ${lake.type}</p>
            <p>Location: ${lake.location}</p>
            <p>${lake.description}</p>
        `;
        
        // Add historical context if available
        if (lake.historicalContext) {
            section.innerHTML += `
                <div class="lake-historical">
                    <p><strong>Historical Context:</strong> ${lake.historicalContext}</p>
                </div>
            `;
        }
        
        section.addEventListener('click', () => StateManager.lakeManager.setActiveLake(lakeId));
        featuresContainer.appendChild(section);
    });
}

function createMarkers() {
    const markers = new Map();
    Object.entries(lakes).forEach(([lakeId, lake]) => {
        const el = document.createElement('div');
        el.className = 'marker';
        el.dataset.lakeId = lakeId;
        
        const marker = new maplibregl.Marker({ element: el })
            .setLngLat(lake.center)
            .addTo(map);
            
        marker.getElement().addEventListener('click', () => {
            StateManager.lakeManager.setActiveLake(lakeId);
        });
        
        markers.set(lakeId, marker);
    });
    
    StateManager.markers = markers;
}

function updateParticleSystems() {
    const delta = StateManager.perfMonitor.update();
    
    // Clear spatial grid for this frame
    StateManager.spatialGrid.clear();
    
    // Update all active particle systems
    StateManager.particleSystems.forEach(system => {
        system.update(delta);
        
        // Add active particles to spatial grid for efficient querying
        if (system.active) {
            system.particles.forEach(particle => {
                StateManager.spatialGrid.insert(particle);
            });
        }
    });
    
    // Update sacred lake effects if enabled
    if (StateManager.sacredLakeEnhancer) {
        StateManager.sacredLakeEnhancer.updateActiveSacredLakes();
    }
    
    // If performance is low, reduce particle count temporarily
    if (StateManager.perfMonitor.isLowPerformance()) {
        StateManager.particleSystems.forEach(system => {
            system.particles = system.particles.slice(0, Math.floor(system.particles.length * 0.8));
        });
    }
    
    // Request next animation frame
    animationFrameId = requestAnimationFrame(updateParticleSystems);
}

// Attach initializeApp to DOMContentLoaded event
document.addEventListener('DOMContentLoaded', initializeApp);

// Cleanup on unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    StateManager.cleanup();
});

// Export necessary functions and classes for external use
export {
    initializeApp,
    generateLakeSections,
    createMarkers,
    updateParticleSystems,
    lakes,
    LAKE_CONFIG,
    PERFORMANCE_THRESHOLDS
};