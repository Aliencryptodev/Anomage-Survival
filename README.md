# Anoma Survival 🧙‍♂️

Top-down arcade survivor with a retro look and elemental spells. Move, dodge, wipe out waves, level up, and defeat the boss to open the portal to the next biome.

👉 **Play online:** https://anomage-survival.vercel.app/

---

## Features

- Pixel-art top-down action.
- Elemental spells (Fire, Lightning, Ice, Dark) with level-up progression.
- Enemy waves + biome boss; portal opens after the boss.
- Potion/essence drops and score.
- “Retro-style” bottom UI with health/mana orbs and skill panel.
- Desktop and mobile support (dual virtual joysticks + RUN button).

---

## Controls

**Desktop**
- Move: `W A S D` or Arrow Keys  
- Shoot: Mouse Click (hold for burst)  
- Dash/Run: `Space`  
- Switch Spell: `1` 🔥, `2` ⚡, `3` ❄️, `4` 🌑

**Mobile / Touch**
- Left joystick: move  
- Right joystick: aim & shoot (keep it pushed to keep firing)  
- **RUN** button (right side): dash  
- Tap skill icons on the bottom bar to switch spells

> On mobile, the game may request fullscreen after your first touch.

---

## Run locally

Use a local static server (don’t open with `file://` to avoid CORS):

```bash
# Python
python -m http.server 8080

# Node
npx serve .
Open http://localhost:8080.

If assets/Sprites.json fails due to CORS, the game shows a warning and falls back to default paths.
You can also click “Cargar Sprites.json…” to load a JSON manually.

Project structure
graphql
Copy code
.
├─ index.html               # UI, controls, HUD, mobile joysticks
├─ game.js                  # Core loop (rendering, logic, AI, combat)
├─ optimization.js          # Small performance helpers
├─ docs/                    # Screenshots / GIFs used in README
└─ assets/
   ├─ Sprites/              # Heroes, spells, enemies, bosses
   ├─ props/                # Trees, rocks, etc.
   ├─ items/                # Potions, portal
   ├─ maps/                 # Biome grounds
   └─ audio/                # SFX and music
Screenshots
Add your images to docs/ and update the paths below.


Optional gameplay GIF: docs/gameplay.gif

Quick customization
Joystick & RUN positioning: edit CSS in index.html

css
Copy code
/* Movement (left) */
#joyL   { left:18px;  bottom:120px; }
/* Aim/Shoot (right) */
#joyR   { right:140px; bottom:120px; }
/* RUN button (right side) */
#btnRunR{ right:20px;  bottom:120px; }
Spell balance: tweak makeProj() in game.js (damage, pierce, AoE, effects).

Fire rate & mana cost: adjust fireCd in Player and SHOT_MANA_COST.

Performance tips
Keep your browser up to date.

Close heavy tabs if FPS drops.

Use regular device resolutions; the canvas scales with image-rendering: pixelated.

Contributing
Issues and PRs are welcome:

Fork the repository

Create a branch: git checkout -b feature/my-change

Commit: git commit -m "Short description"

Push: git push origin feature/my-change

Open a Pull Request

License
MIT — feel free to use it. Please keep/credit third-party art/audio if you reuse those assets.

pgsql
Copy code

If you want, I can also generate placeholder PNGs for `docs/` (so the table doesn’t look empty until you upload your own screenshots).
::contentReference[oaicite:0]{index=0}
