/**
 * Lakes data model
 * Contains geographical information and metadata for all lakes
 */
export const lakes = {
    wular: {
        title: 'Wular Lake',
        center: [74.5833, 34.3333],
        zoom: 10,
        bearing: 60,
        pitch: 65,
        type: 'Freshwater Lake',
        location: 'Indian Subcontinent',
        description: 'Largest freshwater lake in the region; supports migratory birds and local fisheries',
        duration: 2000,
        size: 1
    },
    loktak: {
        title: 'Loktak Lake',
        center: [93.7833, 24.5333],
        zoom: 11,
        bearing: 60,
        pitch: 60,
        type: 'Freshwater Lake',
        location: 'Manipur',
        description: 'Known for floating phumdis (vegetation islands); home to Keibul Lamjao National Park',
        duration: 2000,
        size: 3
    },
    pangong: {
        title: 'Pangong Tso',
        center: [78.9000, 33.7000],
        zoom: 10,
        bearing: 75,
        pitch: 60,
        type: 'High Altitude Lake',
        location: 'Indian Subcontinent',
        description: 'High-altitude saltwater lake; famous for turquoise waters',
        duration: 2000,
        size: 6
    },
    mansarovar: {
        title: 'Manas Sarovar',
        center: [81.4583, 30.6667],
        zoom: 10,
        bearing: 60,
        pitch: 65,
        type: 'High Altitude Lake',
        location: 'Indian Subcontinent',
        description: 'Sacred high-altitude freshwater lake (4,590m) near Mount Kailash; pilgrimage site for Hindus, Buddhists, Jains',
        duration: 2000,
        size: 6.5,
        historicalName: 'Manas Sarovar',
        historicalContext: 'Name derives from Sanskrit "Manas" (mind) and "Sarovar" (lake), meaning "Lake of Consciousness". Ancient texts like Skanda Purana describe it as created in the mind of Lord Brahma'
    },
    dal: {
        title: 'Dal Lake',
        center: [74.8208, 34.0917],
        zoom: 12,
        bearing: 60,
        pitch: 50,
        type: 'Urban Lake',
        location: 'Srinagar, Jammu and Kashmir',
        description: 'Iconic houseboat tourism and Mughal gardens',
        duration: 2000,
        size: 12
    },
    satpara: {
        title: 'Satpara Lake',
        center: [75.6297, 35.2311],
        zoom: 13,
        bearing: 60,
        pitch: 60,
        type: 'Freshwater Lake',
        location: 'Indian Subcontinent',
        description: 'Freshwater lake near Skardu; part of Greater Tibet and the Buddhist Baltistan Kingdom (8th-14th century CE); situated along ancient Silk Road trading routes',
        duration: 2000,
        size: 17,
        historicalName: 'Satpara',
        historicalContext: 'The region\'s integration into the Silk Road under the Kushan Empire (1st-5th century CE) shows Sanskrit or Prakrit influences'
    },
    pushkar: {
        title: 'Pushkar Lake',
        center: [74.5550, 26.4850],
        zoom: 13,
        bearing: 45,
        pitch: 45,
        type: 'Sacred Lake',
        location: 'Rajasthan',
        description: 'Sacred lake surrounded by 52 ghats; site of the annual Pushkar Camel Fair',
        duration: 2000,
        size: 61,
        historicalName: 'Pushkar',
        historicalContext: 'One of the oldest continuously inhabited lakes in India, with the name "Pushkar" (पुष्कर) meaning "blue lotus flower" in Sanskrit'
    },
    // Add more lakes here to complete the collection
    // I'll focus on ensuring types match the LAKE_CONFIG
};

/**
 * Configuration for different lake types
 */
export const LAKE_CONFIG = {
    'Freshwater Lake': {
        particleCount: 1000,
        particleSize: { min: 0.5, max: 2.0 },
        particleLifespan: { min: 3000, max: 4500 },
        glowIntensity: 1.0,
        color: '#4a90e2',
        pulseFrequency: 1.0,
        flowPattern: 'gentle-ripple'
    },
    'High Altitude Lake': {
        particleCount: 1200,
        particleSize: { min: 0.7, max: 2.2 },
        particleLifespan: { min: 3800, max: 4800 },
        glowIntensity: 1.2,
        color: '#48f2ff',
        pulseFrequency: 0.8,
        flowPattern: 'mountain-current'
    },
    'Urban Lake': {
        particleCount: 900,
        particleSize: { min: 0.6, max: 1.9 },
        particleLifespan: { min: 3200, max: 4200 },
        glowIntensity: 0.8,
        color: '#2aacff',
        pulseFrequency: 1.1,
        flowPattern: 'urban-flow'
    },
    'Sacred Lake': {
        particleCount: 1500,
        particleSize: { min: 0.8, max: 2.5 },
        particleLifespan: { min: 4000, max: 5000 },
        glowIntensity: 1.5,
        color: '#ffcd6b',
        pulseFrequency: 0.5,
        flowPattern: 'sacred-spiral'
    },
    'Salt Lake': {
        particleCount: 800,
        particleSize: { min: 0.6, max: 1.8 },
        particleLifespan: { min: 3500, max: 4000 },
        glowIntensity: 0.9,
        color: '#b835ff',
        pulseFrequency: 1.2,
        flowPattern: 'crystalline'
    },
    'Brackish Lake': {
        particleCount: 900,
        particleSize: { min: 0.6, max: 1.9 },
        particleLifespan: { min: 3200, max: 4200 },
        glowIntensity: 0.8,
        color: '#2aacff',
        pulseFrequency: 1.1,
        flowPattern: 'brackish-mix'
    }
};

/**
 * Maps general lake types to specific configurations
 * This allows the system to match varied lake type descriptions to proper configurations
 */
export function getLakeConfigType(lakeType) {
    // Normalize the lake type string for matching
    const type = lakeType.toLowerCase();
    
    // Map to specific config type
    if (type.includes('freshwater') || type.includes('tectonic') || type.includes('lentic')) {
        return 'Freshwater Lake';
    }
    
    if (type.includes('high altitude') || type.includes('glacial') || type.includes('alpine')) {
        return 'High Altitude Lake';
    }
    
    if (type.includes('urban') || type.includes('artificial') || type.includes('reservoir')) {
        return 'Urban Lake';
    }
    
    if (type.includes('sacred') || type.includes('temple') || type.includes('holy')) {
        return 'Sacred Lake';
    }
    
    if (type.includes('salt') || type.includes('saline')) {
        return 'Salt Lake';
    }
    
    if (type.includes('brackish') || type.includes('lagoon') || type.includes('coastal')) {
        return 'Brackish Lake';
    }
    
    // Default to freshwater if no match
    return 'Freshwater Lake';
}

/**
 * Get color settings for a specific lake type
 * @param {string} lakeType - The type of lake
 * @returns {Object} Color configuration for the lake type
 */
export function getLakeColors(lakeType) {
    const configType = getLakeConfigType(lakeType);
    const config = LAKE_CONFIG[configType];
    
    return {
        base: config.color,
        glow: config.color.replace(')', ', ' + config.glowIntensity + ')').replace('rgb', 'rgba'),
        pulse: config.pulseFrequency
    };
}