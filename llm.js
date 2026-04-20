// llm.js - LLM integration for block naming using Ollama

// Block metadata including colors, textures, and properties
const BLOCK_METADATA = {
    // Earth/Dirt variants
    dirt: { color: '#8B7355', rgb: [139, 115, 85], category: 'earth', hardness: 0.5 },
    grass: { color: '#228B22', rgb: [34, 139, 34], category: 'earth', hardness: 0.6 },
    gravel: { color: '#9E9E9E', rgb: [158, 158, 158], category: 'earth', hardness: 0.6 },
    sand: { color: '#F4A460', rgb: [244, 164, 96], category: 'earth', hardness: 0.5 },
    clay: { color: '#999999', rgb: [153, 153, 153], category: 'earth', hardness: 0.6 },
    mud: { color: '#5C4033', rgb: [92, 64, 51], category: 'earth', hardness: 0.5 },
    
    // Stone/Rock variants
    stone: { color: '#808080', rgb: [128, 128, 128], category: 'rock', hardness: 1.5 },
    cobblestone: { color: '#696969', rgb: [105, 105, 105], category: 'rock', hardness: 2.0 },
    mossy_cobblestone: { color: '#556B2F', rgb: [85, 107, 47], category: 'rock', hardness: 2.0 },
    mossy_stone: { color: '#6B8E23', rgb: [107, 142, 35], category: 'rock', hardness: 1.5 },
    slate: { color: '#708090', rgb: [112, 128, 144], category: 'rock', hardness: 1.8 },
    granite: { color: '#8B7D6B', rgb: [139, 125, 107], category: 'rock', hardness: 1.7 },
    basalt: { color: '#36454F', rgb: [54, 69, 79], category: 'rock', hardness: 2.2 },
    gravel_stone: { color: '#A9A9A9', rgb: [169, 169, 169], category: 'rock', hardness: 0.6 },
    
    // Wood variants
    wood: { color: '#8B4513', rgb: [139, 69, 19], category: 'organic', hardness: 2.0 },
    oak: { color: '#8B4513', rgb: [139, 69, 19], category: 'organic', hardness: 2.0 },
    oak_wood: { color: '#8B4513', rgb: [139, 69, 19], category: 'organic', hardness: 2.0 },
    oak_leaves: { color: '#228B22', rgb: [34, 139, 34], category: 'organic', hardness: 0.2 },
    leaves: { color: '#228B22', rgb: [34, 139, 34], category: 'organic', hardness: 0.2 },
    birch_wood: { color: '#D2B48C', rgb: [210, 180, 140], category: 'organic', hardness: 2.0 },
    spruce_wood: { color: '#654321', rgb: [101, 67, 33], category: 'organic', hardness: 2.0 },
    
    // Crafted/Mixed blocks
    brick: { color: '#CD5C5C', rgb: [205, 92, 92], category: 'crafted', hardness: 2.0 },
    stone_brick: { color: '#7B7B7B', rgb: [123, 123, 123], category: 'crafted', hardness: 2.0 },
    sand_stone: { color: '#DAA520', rgb: [218, 165, 32], category: 'crafted', hardness: 0.8 },
    mossy_brick: { color: '#8B7355', rgb: [139, 115, 85], category: 'crafted', hardness: 2.0 },
    
    // Mixed earth
    sandy_dirt: { color: '#C4A747', rgb: [196, 167, 71], category: 'earth', hardness: 0.55 },
    muddy_stone: { color: '#7B6B59', rgb: [123, 107, 89], category: 'earth', hardness: 1.2 },
    
    // Compressed materials  
    compressed_dirt: { color: '#5C3D2E', rgb: [92, 61, 46], category: 'rock', hardness: 1.0 },
    packed_earth: { color: '#9B8B7B', rgb: [155, 139, 123], category: 'earth', hardness: 0.8 },
};

class LLMService {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || 'http://localhost:11434';
        this.model = config.model || 'llama2';
        this.timeout = config.timeout || 8000;
        this.enabled = config.enabled !== false;
        this.retries = config.retries || 2;
        this.debug = config.debug || false;
        
        // Cache for generated combinations to avoid repeated API calls
        this.combinationCache = new Map();
    }


    /**
     * Combines two blocks and generates a realistic combined block with color
     * @param {string} block1 - First block type
     * @param {string} block2 - Second block type
     * @returns {Promise<object>} - Object with { blockType, color, rgb } properties
     */
    async combineBlocks(block1, block2) {
        if (!this.enabled) {
            return this.generateFallbackCombination(block1, block2);
        }

        // Check cache first
        const cacheKey = this.getCacheKey(block1, block2);
        if (this.combinationCache.has(cacheKey)) {
            if (this.debug) console.log('[LLM] Cache hit for:', cacheKey);
            return this.combinationCache.get(cacheKey);
        }

        try {
            if (this.debug) console.log(`[LLM] Combining ${block1} + ${block2}`);
            
            const metadata1Base = BLOCK_METADATA[block1] || this.getDefaultMetadata(block1);
            const metadata2Base = BLOCK_METADATA[block2] || this.getDefaultMetadata(block2);
            const metadata1 = { ...metadata1Base, blockName: block1 };
            const metadata2 = { ...metadata2Base, blockName: block2 };
            
            const prompt = this.buildCombinationPrompt(block1, block2, metadata1, metadata2);
            const response = await this.callOllama(prompt);
            const combination = this.parseCombinationResponse(response, metadata1, metadata2);
            
            // Cache the result
            this.combinationCache.set(cacheKey, combination);
            
            if (this.debug) console.log('[LLM] Generated combination:', combination);
            return combination;
        } catch (error) {
            console.error('[LLM] Error combining blocks:', error);
            // Fallback to simple combination
            return this.generateFallbackCombination(block1, block2);
        }
    }

    /**
     * Generates a fallback combination when LLM is unavailable
     * Uses creative naming based on material properties + color blending
     * @private
     */
    generateFallbackCombination(block1, block2) {
        const meta1 = BLOCK_METADATA[block1] || this.getDefaultMetadata(block1);
        const meta2 = BLOCK_METADATA[block2] || this.getDefaultMetadata(block2);
        
        // Smart fallback naming based on material combinations
        const combinations = {
            'dirt+stone': 'gravel',
            'stone+dirt': 'gravel',
            'grass+dirt': 'fertile_soil',
            'dirt+grass': 'fertile_soil',
            'grass+stone': 'mossy_stone',
            'stone+grass': 'mossy_stone',
            'wood+stone': 'stone_brick',
            'stone+wood': 'stone_brick',
            'sand+stone': 'sand_stone',
            'stone+sand': 'sand_stone',
            'wood+grass': 'oak_leaves',
            'wood+dirt': 'mulch',
            'gravel+stone': 'slate',
            'stone+gravel': 'slate',
            'sand+dirt': 'sandy_dirt',
            'dirt+sand': 'sandy_dirt',
            'clay+stone': 'muddy_clay',
            'stone+clay': 'muddy_clay',
        };
        
        // Check if we have a known combination
        const key1 = `${block1}+${block2}`;
        const key2 = `${block2}+${block1}`;
        let blockType = combinations[key1] || combinations[key2];
        
        // If no known combo, blend the names intelligently
        if (!blockType) {
            // Create a unique name by taking parts and blending
            const suffixes = ['_mix', '_blend', '_hybrid', '_composite'];
            const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
            
            // Use shorter names
            const short1 = block1.length > 4 ? block1.substring(0, 3) : block1;
            const short2 = block2.length > 4 ? block2.substring(0, 3) : block2;
            blockType = `${short1}_${short2}`;
        }
        
        // Blend colors
        const blendedRgb = this.blendColors(meta1.rgb, meta2.rgb);
        const blendedColor = this.rgbToHex(blendedRgb);
        
        if (this.debug) console.log(`[LLM] Fallback: ${block1} + ${block2} = ${blockType}`);
        
        return {
            blockType,
            color: blendedColor,
            rgb: blendedRgb,
            confidence: 0.6
        };
    }

    /**
     * Gets default metadata for unknown blocks
     * @private
     */
    getDefaultMetadata(blockType) {
        return {
            color: '#CCCCCC',
            rgb: [204, 204, 204],
            category: 'unknown',
            hardness: 1.0
        };
    }

    /**
     * Blends two RGB colors
     * @private
     */
    blendColors(rgb1, rgb2) {
        const safeRgb1 = this.normalizeRgb(rgb1);
        const safeRgb2 = this.normalizeRgb(rgb2);
        return [
            Math.round((safeRgb1[0] + safeRgb2[0]) / 2),
            Math.round((safeRgb1[1] + safeRgb2[1]) / 2),
            Math.round((safeRgb1[2] + safeRgb2[2]) / 2)
        ];
    }

    /**
     * Normalizes potentially invalid RGB inputs to a safe [r, g, b] array
     * @private
     */
    normalizeRgb(rgb) {
        if (!Array.isArray(rgb) || rgb.length < 3) {
            return [204, 204, 204];
        }

        return rgb.slice(0, 3).map((value) => {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return 204;
            return Math.max(0, Math.min(255, Math.round(numeric)));
        });
    }

    /**
     * Converts RGB to hex color
     * @private
     */
    rgbToHex(rgb) {
        return '#' + rgb.map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }

    /**
     * Builds a sophisticated prompt for combining blocks
     * @private
     */
    buildCombinationPrompt(block1, block2, meta1, meta2) {
        return `You are a minecraft game designer. Your task is to create ONE NEW block name by combining two input blocks.

INPUT:
- Block 1: ${block1}
- Block 2: ${block2}

CRITICAL RULES (MUST FOLLOW):
1. Generate a SINGLE new block name that is different from both inputs
2. NEVER output "${block1}" or "${block2}" 
3. NEVER create "${block1}_${block2}" format
4. Output ONLY the new block name - nothing else
5. Format: lowercase, underscore-separated (1-3 words max)

EXAMPLES OF CORRECT OUTPUT:
- dirt + stone → gravel
- wood + stone → brick  
- grass + dirt → fertile_soil

Output the new block name:`;
    }

    /**
     * Parses the combination response and determines color
     * @private
     */
    parseCombinationResponse(response, meta1, meta2) {
        let blockType = response
            .trim()
            .toLowerCase()
            .split('\n')[0]  // Take only first line
            .replace(/^[^\w]+|[^\w]+$/g, '')  // Remove leading/trailing non-word chars
            .replace(/[^a-z0-9_\s-]/g, '')  // Remove special characters
            .replace(/\s+/g, '_')  // Spaces to underscores
            .replace(/-/g, '_')  // Hyphens to underscores
            .slice(0, 30)  // Limit length
            .replace(/^_+|_+$/g, '');  // Remove leading/trailing underscores

        // Log raw response for debugging
        if (this.debug) {
            console.log('[LLM] Raw response:', JSON.stringify(response));
            console.log('[LLM] Parsed block type:', blockType);
        }

        if (!blockType) {
            if (this.debug) console.log('[LLM] Empty response, using fallback');
            return this.generateFallbackCombination('unknown', 'unknown');
        }

        // CRITICAL: Prevent repeating same block name or concatenating inputs
        const block1Lower = meta1.blockName || '';
        const block2Lower = meta2.blockName || '';
        
        // Check if result is same as input or contains both inputs concatenated
        if (blockType === block1Lower || blockType === block2Lower) {
            if (this.debug) console.log(`[LLM] LLM repeated input block "${blockType}", forcing fallback`);
            return this.generateFallbackCombination(meta1.blockName, meta2.blockName);
        }
        
        // Check if it's a concatenation (e.g., "stone_dirt" or "dirt_stone")
        if ((blockType.includes(block1Lower) && blockType.includes(block2Lower)) ||
            blockType === `${block1Lower}_${block2Lower}` ||
            blockType === `${block2Lower}_${block1Lower}`) {
            if (this.debug) console.log(`[LLM] LLM concatenated input blocks "${blockType}", forcing fallback`);
            return this.generateFallbackCombination(meta1.blockName, meta2.blockName);
        }

        // Look up the block in metadata, otherwise blend colors
        let rgb, color;
        if (BLOCK_METADATA[blockType]) {
            rgb = this.normalizeRgb(BLOCK_METADATA[blockType].rgb);
            color = BLOCK_METADATA[blockType].color || this.rgbToHex(rgb);
            if (this.debug) console.log(`[LLM] Found block in metadata: ${blockType}`);
        } else {
            // Blend colors from input blocks
            rgb = this.blendColors(meta1.rgb, meta2.rgb);
            color = this.rgbToHex(rgb);
            if (this.debug) console.log(`[LLM] Generated new block with blended color: ${blockType}`);
        }

        return {
            blockType,
            color,
            rgb,
            confidence: 0.9
        };
    }

    /**
     * Generates a cache key from two block names
     * @private
     */
    getCacheKey(block1, block2) {
        // Sort to ensure same result regardless of order
        const sorted = [block1, block2].sort();
        return `${sorted[0]}_${sorted[1]}`;
    }

    /**
     * Calls Ollama API with retry logic
     * @private
     */
    async callOllama(prompt) {
        let lastError;
        
        for (let attempt = 0; attempt < this.retries; attempt++) {
            try {
                if (this.debug) console.log(`[LLM] Attempt ${attempt + 1}/${this.retries}`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(`${this.baseUrl}/api/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: this.model,
                        prompt: prompt,
                        stream: false,
                        temperature: 0.3,
                        num_predict: 15,
                        top_p: 0.9,
                        top_k: 40,
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                // Log response status for debugging
                if (this.debug) console.log(`[LLM] API Response: ${response.status} ${response.statusText}`);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Ollama API ${response.status}: ${response.statusText} - ${errorText}`);
                }

                const data = await response.json();
                if (this.debug) console.log(`[LLM] Raw response: ${JSON.stringify(data.response).substring(0, 100)}`);
                return data.response;
            } catch (error) {
                lastError = error;
                if (this.debug) console.log(`[LLM] Attempt ${attempt + 1} failed:`, error.message);
                
                if (attempt < this.retries - 1) {
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }
        
        throw lastError || new Error('Failed to call Ollama after retries');
    }

    /**
     * Parses the LLM response to extract the block name
     * @private
     */
    parseResponse(response) {
        if (!response || typeof response !== 'string') {
            return 'unknown_block';
        }

        // Clean up the response
        let name = response
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/-/g, '_') // Replace hyphens with underscores
            .slice(0, 30); // Limit length

        // Ensure it's not empty
        return name || 'unknown_block';
    }

    /**
     * Gets cache statistics
     */
    getCacheStats() {
        return {
            size: this.combinationCache.size,
            entries: Array.from(this.combinationCache.entries()),
        };
    }

    /**
     * Clears the combination cache
     */
    clearCache() {
        this.combinationCache.clear();
        if (this.debug) console.log('[LLM] Cache cleared');
    }

    /**
     * Tests the connection to Ollama
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            
            if (!response.ok) {
                console.error('[LLM] Connection test failed:', response.statusText);
                return false;
            }

            const data = await response.json();
            const modelExists = data.models && data.models.some(m => m.name.includes(this.model));
            
            if (modelExists) {
                console.log(`[LLM] Successfully connected to Ollama with model "${this.model}"`);
            } else {
                console.warn(`[LLM] Connected to Ollama but model "${this.model}" not found`);
                console.log('[LLM] Available models:', data.models.map(m => m.name));
            }
            
            return true;
        } catch (error) {
            console.error('[LLM] Connection test failed:', error.message);
            return false;
        }
    }

    /**
     * Sets configuration
     */
    setConfig(config) {
        Object.assign(this, config);
    }
}

// Create global LLM service instance
window.llmService = null;

/**
 * Initialize the LLM service with custom configuration
 * @param {object} config - Configuration object
 * @example
 * initLLMService({
 *     baseUrl: 'http://localhost:11434',
 *     model: 'neural-chat',
 *     enabled: true,
 *     debug: true
 * });
 */
async function initLLMService(config = {}) {
    window.llmService = new LLMService(config);
    
    const isConnected = await window.llmService.testConnection();
    if (isConnected) {
        console.log('[LLM] Service initialized successfully');
    } else {
        console.warn('[LLM] Service initialized but no Ollama connection - fallback to simple naming');
    }
    
    return window.llmService;
}

/**
 * Quick helper to combine two blocks
 * @param {string} block1
 * @param {string} block2
 * @returns {Promise<object>} - { blockType, color, rgb }
 */
async function combineBlocks(block1, block2) {
    if (!window.llmService) {
        console.warn('[LLM] Service not initialized, using fallback combination');
        const service = new LLMService();
        return service.generateFallbackCombination(block1, block2);
    }
    return await window.llmService.combineBlocks(block1, block2);
}

// Expose to global window for cross-script access
window.BLOCK_METADATA = BLOCK_METADATA;
window.LLMService = LLMService;
window.initLLMService = initLLMService;
window.combineBlocks = combineBlocks;

