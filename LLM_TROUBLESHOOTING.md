# LLM Troubleshooting: "stone_stone" Issue

## Problem
When combining blocks via Ollama, the result is just repeating the same block name (e.g., "stone_stone") instead of creating realistic combinations (e.g., "gravel").

## Diagnosis Steps

### Step 1: Check Console Logs
1. Open your game (press F12 to open Developer Console)
2. Press C to open crafting
3. Select any two blocks and click Craft
4. Look in the Console tab for `[LLM]` messages

You should see something like:
```
[LLM] Combining dirt + stone
[LLM] Raw response: "gravel"
[LLM] Parsed block type: gravel
```

### Step 2: Check What Ollama Is Returning
If the raw response shows poor output, the model might not understand the prompt. 

**Test directly in browser console (F12):**
```javascript
// Test the LLM directly
const result = await window.llmService.combineBlocks('dirt', 'stone');
console.log('Result:', result);
```

Look at what gets logged.

### Step 3: Check Model Quality
Different models have different reasoning abilities:

**Poor Results With:** llama2 (very literal), orca-mini (weak reasoning)
**Better Results With:** neural-chat, mistral, phi

Try switching models:
```bash
# First pull a better model
ollama pull neural-chat

# Then in ui.js, change the model line in setupUI():
model: 'neural-chat'  // instead of 'llama2'
```

## Solutions

### Quick Fix: Switch to a Better Model

1. **Stop any running Ollama instances**
2. **Pull a better model:**
   ```bash
   ollama pull neural-chat
   ```
   (or `mistral` for excellent quality)

3. **Edit [ui.js](ui.js)** in the `setupUI()` function:
   ```javascript
   initLLMService({
       baseUrl: 'http://localhost:11434',
       model: 'neural-chat',  // Changed from 'llama2'
       enabled: true,
       debug: true,
       timeout: 10000,
       retries: 2
   });
   ```

4. **Refresh the game and test again**

### Intermediate Fix: Improve the Prompt

If you want to keep using llama2, make the prompt even simpler. Edit the `buildCombinationPrompt` method in [llm.js](llm.js) to:

```javascript
buildCombinationPrompt(block1, block2, meta1, meta2) {
    return `Combine these two minecraft blocks into ONE NEW realistic block name.
Block 1: ${block1}
Block 2: ${block2}

Rules:
- Output ONLY one block name (1-2 words, underscore separated)
- NEVER output the same word twice (NOT "stone_stone")
- NEVER repeat the input block names
- Make it creative and realistic

Examples of good output:
- dirt + stone = gravel
- wood + stone = brick
- grass + dirt = fertile_soil

Output ONLY the new block name now:`;
}
```

### Advanced: Try a System Prompt

Some models respond better to system prompts. If issues persist, we can restructure the API call to include a system message that's separate from the user prompt.

## Verification

After making changes:

1. **Open console (F12)**
2. **Look for [LLM] messages** while crafting
3. **Expected logs should show:**
   - `[LLM] Raw response:` with a creative name (not repeated)
   - `[LLM] Parsed block type:` should match the creative name
   - `[LLM] Generated combination:` should show final result

If you still see `stone_stone` in the raw response, the model itself is the problem - try switching to `neural-chat` or `mistral`.

## Model Recommendations

| Model | Quality | Speed | Best For |
|-------|---------|-------|----------|
| llama2 | Fair | Slow | General use (but struggles with creative tasks) |
| neural-chat | Excellent | Medium | **RECOMMENDED** - Best reasoning + speed balance |
| mistral | Excellent | Medium | Creative, excellent instruction following |
| phi | Very Good | Fast | Budget/speed option |

**For this task, I recommend: `neural-chat`**

## Console Debug Commands

Run these in browser console (F12) to debug:

```javascript
// Test a single combination
const result = await window.llmService.combineBlocks('dirt', 'stone');
console.log('Result:', result);

// Check cache
console.log(window.llmService.getCacheStats());

// Test connection
await window.llmService.testConnection();

// Check current config
console.log(window.llmService);

// Enable/disable debug
window.llmService.debug = true;

// Force test with custom model
window.llmService.setConfig({ model: 'neural-chat' });
```

## If Still Having Issues

1. **Make sure Ollama is running:** `ollama serve` in terminal
2. **Check the model is installed:** `ollama list`
3. **Verify API endpoint:** `curl http://localhost:11434/api/tags`
4. **Check disk space:** Models need 2-5GB free space
5. **Check RAM:** Make sure you have 8GB+ available

---

**Most Likely Solution:** Switch from `llama2` to `neural-chat` backend model. It has much better reasoning abilities for this creative task.
