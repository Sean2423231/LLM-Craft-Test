# LLM Setup Quick Start

## Get Started in 3 Minutes

### 1. Install & Run Ollama

```bash
# Download from ollama.ai then run:
ollama pull llama2
ollama serve
```

### 2. That's It!

Open the game. When you press **C** to craft, the LLM will automatically start generating creative block names.

---

## Craft Two Blocks

1. **Press C** → Opens crafting table
2. **Click on left slot** → Opens inventory to select first block
3. **Click on a block** (e.g., stone) → Selected!
4. **Click on right slot** → Opens inventory to select second block  
5. **Click on a block** (e.g., dirt) → Selected!
6. **Click Craft** → LLM generates realistic combination

**Result**: You get a new block! For example:
- `dirt` + `stone` = `gravel`
- `wood` + `stone` = `stone_brick`
- `grass` + `stone` = `mossy_stone`

The LLM **removes 1 of each input block** from your inventory and **gives you 1 result block**.

### Examples of Block Combinations

| Block 1 | Block 2 | Possible Results |
|---------|---------|-----------------|
| dirt | stone | gravel, muddy_stone, compressed_dirt |
| grass | cobblestone | mossy_cobblestone, mossy_stone |
| wood | stone | stone_brick, slate |
| sand | stone | sand_stone, gravel |

---

## Customize (Optional)

Edit the `setupUI()` function in `ui.js` to change:

```javascript
initLLMService({
    model: 'llama2',     // Change model (phi, mistral, neural-chat, etc)
    enabled: true,       // Disable if you want simple naming
    debug: false,        // Set true to see console logs
});
```

---

## Faster Performance?

Use a smaller model:
```bash
ollama pull phi
```

Then in `ui.js`: `model: 'phi'`

---

## Troubleshooting

**"Connection test failed"**
- Run `ollama serve` to start the server

**"Model not found"**  
- Run `ollama pull llama2` (or your model name)

**"Request timed out"**
- Use `model: 'phi'` (faster)
- Or increase `timeout: 20000` in config

---

See `LLM_SETUP.md` for detailed docs!
