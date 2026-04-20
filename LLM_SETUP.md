# LLM Block Naming Guide

This guide explains how to set up and use the LLM (Large Language Model) functionality in LLMCraft for creative block naming.

## Overview

The LLM integration uses **Ollama** to run language models locally on your machine. When you combine two blocks in the crafting UI, the LLM generates a creative name for the resulting block by analyzing the two input block types.

### Features
- **Local Processing**: Runs entirely on your machine - no internet required
- **Creative Naming**: Generates contextual names for combined blocks
- **Cached Results**: Remembers previously generated names for instant recall
- **Fallback Support**: Works without Ollama installed (uses simple naming as fallback)
- **Configurable**: Easy to change models, timeout, and other settings

## Prerequisites

### System Requirements
- 4GB RAM minimum (8GB+ recommended)
- ~2.5GB disk space for a model

### Software
- **Ollama**: Download from [ollama.ai](https://ollama.ai)
- A web browser with JavaScript support

## Installation

### Step 1: Install Ollama

1. Download Ollama from [ollama.ai](https://ollama.ai)
2. Follow the installation instructions for your OS:
   - **macOS**: Direct DMG installer
   - **Windows**: EXE installer
   - **Linux**: `curl https://ollama.ai/install.sh | sh`

### Step 2: Pull a Model

Open a terminal/command prompt and run:

```bash
ollama pull llama2
```

**Popular model options:**

| Model | Size | Speed | Quality | Command |
|-------|------|-------|---------|---------|
| llama2 | 3.8GB | Slow | Excellent | `ollama pull llama2` |
| neural-chat | 4.1GB | Slow | Very Good | `ollama pull neural-chat` |
| mistral | 4.1GB | Medium | Excellent | `ollama pull mistral` |
| phi | 1.6GB | Fast | Good | `ollama pull phi` |
| orca-mini | 1.3GB | Fast | Fair | `ollama pull orca-mini` |

For faster generation on slower machines, use **phi** or **orca-mini**.

### Step 3: Start Ollama Server

The Ollama server runs in the background. To start it:

**macOS/Linux**: 
```bash
ollama serve
```

**Windows**: Ollama typically starts automatically on boot

The server will be available at `http://localhost:11434`

## Configuration

### In-Game Setup

The LLM service is automatically initialized when the game starts. To customize settings, edit the `setupUI()` function in [ui.js](ui.js):

```javascript
initLLMService({
    baseUrl: 'http://localhost:11434',  // Ollama server address
    model: 'llama2',                     // Model name
    enabled: true,                       // Enable/disable LLM
    debug: false,                        // Enable console logging
    timeout: 10000,                      // Response timeout (ms)
    retries: 2                           // Number of retries
});
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `baseUrl` | `http://localhost:11434` | Ollama server URL |
| `model` | `llama2` | Name of the model to use (must be installed) |
| `enabled` | `true` | Enable/disable LLM functionality |
| `debug` | `false` | Log detailed info to console |
| `timeout` | `10000` | Max wait time for response (milliseconds) |
| `retries` | `2` | Number of retry attempts if generation fails |

## Usage

### In-Game Crafting with Block Combinations

The crafting system now uses real blocks from your inventory to create new combined blocks:

1. **Open Crafting Table**: Press **C** to open the crafting UI
2. **Select First Block**: Click the left block slot (shows "Empty")
   - This opens your inventory
   - Click any block to select it (e.g., dirt)
   - The block type appears in the slot with its color
3. **Select Second Block**: Click the right block slot
   - Your inventory opens again
   - Click another block type (e.g., stone)
   - The slot updates to show your selection
4. **Review Result**: Before crafting, you can see:
   - Both input block types with their true colors
   - A "Result: (empty)" preview that will update
5. **Click Craft**: The LLM analyzes both blocks and generates:
   - A realistic combined block name (e.g., "gravel", "stone_brick", "mossy_stone")
   - An appropriate blended color
   - The LLM considers block categories and hardness to make logical combinations
6. **Get Result**: You receive:
   - 1 new block with the generated name
   - Both input blocks are consumed (1 from your inventory)
   - If you run out of a block type, you can't use it

### Block Combination Examples

#### Common Real-World Combinations

| Input 1 | Input 2 | Common Results | Logic |
|---------|---------|--------|-------|
| dirt | stone | gravel, muddy_stone | Soft earth + hard rock = granular material |
| grass | cobblestone | mossy_cobblestone, mossy_stone | Natural growth on stone |
| wood | stone | stone_brick, brick, slate | Structured combination |
| sand | stone | sand_stone, gravel_stone | Sand compressed with stone |
| dirt | sand | sandy_dirt, packed_earth | Different earth types mix |

#### Creative Combinations

Try mixing different categories to discover new blocks!

### Available Block Types in Inventory

```
Earth/Soil: dirt, grass, gravel, sand, clay, mud
Stone/Rock: stone, cobblestone, mossy_cobblestone, slate, granite, basalt
Organic: wood, oak, oak_wood, leaves, birch_wood, spruce_wood
Crafted: brick, stone_brick, sand_stone
```

### Console Commands (Developer)

Open browser console (F12) to access these functions:

```javascript
// Combine two blocks and get result
await combineBlocks('stone', 'wood');
// Returns: { blockType: 'stone_brick', color: '#7B7B7B', rgb: [123, 123, 123], confidence: 0.9 }

// Check LLM service status
window.llmService.testConnection();

// View cache statistics
window.llmService.getCacheStats();
// Returns: { size: 3, entries: [['dirt_stone', {...}], ...] }

// Clear the cache
window.llmService.clearCache();

// Update configuration
window.llmService.setConfig({
    model: 'mistral',
    timeout: 15000
});

// Manually give player a block
window.addInventoryItem('gravel', 5);

// Check inventory slots
console.log(window.inventorySlots);
```

## Troubleshooting

### Issue: "Connection test failed"

**Problem**: Game can't reach Ollama server

**Solutions**:
1. Verify Ollama is running (`ollama serve`)
2. Check if server is at `http://localhost:11434`
3. If using a different port/IP, update `baseUrl` in [ui.js](ui.js)
4. Check firewall settings

### Issue: "Model not found"

**Problem**: The configured model isn't installed

**Solutions**:
1. List available models: `ollama list`
2. Install the model: `ollama pull llama2` (or your preferred model)
3. Update model name in [ui.js](ui.js)

### Issue: "Request timed out"

**Problem**: LLM is taking too long to respond

**Causes & Solutions**:
- Model is too large or CPU is slow → Use a smaller model (`phi`, `orca-mini`)
- Timeout too short → Increase `timeout` in config
- Server is busy → Wait a moment and try again
- System out of RAM → Close other applications

### Issue: Generation is very slow

**Solutions** (in order of impact):
1. Switch to a smaller, faster model:
   ```bash
   ollama pull phi
   ```
   Then update `model: 'phi'` in [ui.js](ui.js)

2. Increase timeout to allow more processing time:
   ```javascript
   timeout: 20000  // 20 seconds
   ```

3. Reduce other system load (close browser tabs, applications)

4. Disable LLM and use simple fallback naming:
   ```javascript
   enabled: false  // Falls back to "block1_block2"
   ```

### Issue: Poor name quality

**Solutions**:
1. Try a better model:
   - Poor: `orca-mini`
   - Good: `phi`
   - Excellent: `mistral`, `llama2`, `neural-chat`

2. Adjust generation temperature in [llm.js](llm.js) (lines 73-75):
   ```javascript
   temperature: 0.7,  // 0.0-1.0, lower = more deterministic
   num_predict: 20,   // Max tokens to generate
   ```

3. Lower values (0.3-0.5) for consistent names
4. Higher values (0.8-1.0) for more creative names

## Performance Tips

### For Slow Computers
```javascript
initLLMService({
    model: 'phi',           // Smallest/fastest model
    timeout: 30000,         // Give it more time
    enabled: true
});
```

### For Fast Computers
```javascript
initLLMService({
    model: 'neural-chat',   // Larger, higher quality
    timeout: 8000,          // Tighter timeout
    enabled: true
});
```

### GPU Acceleration (Advanced)

If your system has NVIDIA/AMD GPU, Ollama can use it for faster inference:

**NVIDIA (CUDA)**:
```bash
# Windows/Linux with NVIDIA GPU
ollama serve
```

Ollama auto-detects CUDA. To verify:
```bash
ollama list  # Check "Quantization" column
```

**AMD (ROCm)**:
```bash
# Linux with AMD GPU (advanced)
# See: https://github.com/ollama/ollama/blob/main/docs/linux.md
```

## API Reference

### LLMService Class

```javascript
class LLMService {
    // Combine two blocks into a new block type with color
    async combineBlocks(block1, block2) → Promise<{
        blockType: string,     // e.g., "gravel"
        color: string,         // hex color, e.g., "#9E9E9E"
        rgb: [number, number, number],  // RGB values
        confidence: number     // 0.0-1.0 confidence in result
    }>
    
    // Generate fallback combination (used when LLM unavailable)
    generateFallbackCombination(block1, block2) → { blockType, color, rgb }
    
    // Test connection to Ollama
    async testConnection() → Promise<boolean>
    
    // Get cache statistics
    getCacheStats() → { size, entries }
    
    // Clear all cached combinations
    clearCache() → void
    
    // Update configuration
    setConfig(config) → void
}

// Global helper function
async combineBlocks(block1, block2) → Promise<CombinationResult>
```

### Block Metadata

The BLOCK_METADATA constant contains all known block properties:

```javascript
BLOCK_METADATA = {
    'stone': { 
        color: '#808080',           // Hex color
        rgb: [128, 128, 128],       // RGB values
        category: 'rock',           // Category for LLM logic
        hardness: 1.5               // Hardness (affects combinations)
    },
    // ... more blocks
}
```

## File Structure

```
llmcraft/
├── llm.js          ← LLM service module (NEW)
├── ui.js           ← Updated with LLM integration
├── base.html       ← Updated to include llm.js
├── game.js
├── blocks.js
├── player.js
├── inventory.js
├── renderer.js
└── world.js
```

## Examples

### Basic Block Combination Example
```javascript
// In browser console
const result = await combineBlocks('dirt', 'stone');
console.log(result);  
// Output: { 
//   blockType: 'gravel', 
//   color: '#9E9E9E', 
//   rgb: [158, 158, 158],
//   confidence: 0.9 
// }

// Manually add the result to inventory
window.addInventoryItem('gravel', 1);
```

### Check What Result You'd Get Without Crafting
```javascript
// Preview what combining blocks would create
const preview = await window.llmService.combineBlocks('wood', 'grass');
console.log(`Combining wood + grass would create: ${preview.blockType}`);
console.log(`Color would be: ${preview.color}`);
```

### Custom Configuration
```javascript
// Edit setupUI() in ui.js
initLLMService({
    baseUrl: 'http://192.168.1.100:11434',  // Ollama on different machine
    model: 'mistral',
    debug: true,
    timeout: 15000
});
```

### Disable LLM Temporarily (Fallback Mode)
```javascript
// In browser console - will use color blending instead
window.llmService.setConfig({ enabled: false });

// Results will blend input colors instead of using LLM
const result = await combineBlocks('dirt', 'stone');
// Output: { blockType: 'dirt_stone', color: '#8B8080', ... }

// Results will use simple naming: "stone_wood"
```

## Support & Resources

- **Ollama Docs**: https://github.com/ollama/ollama
- **Model Library**: https://ollama.ai/library
- **Models Explained**: https://ollama.ai/#models
- **Issues**: Check console (F12) for error messages

## Notes

- All LLM processing happens locally - no data is sent to external servers
- Cached names are stored in browser memory (cleared on refresh)
- Change models anytime: `ollama pull <model>` then update config
- Performance depends on your CPU/GPU and system load

---

**Happy crafting! 🎮**
