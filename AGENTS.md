# AGENTS.md

Before implementing a game mechanic, check the original SPD source at `./shattered-pixel-dungeon` for the exact flow rules. Files must stay ≤400 lines; avoid >3 levels of nesting.

## Commands

### Backend (run from `backend/`)
```bash
venv/bin/python app/main.py              # dev server on :8080
venv/bin/python scripts/export_contract_schema.py       # regen Pydantic→TS schema
```

### Frontend (run from `frontend/`)
```bash
npm run dev              # Vite on :5173
npm run build
npm run lint             # eslint
npm run typecheck        # tsc --noEmit
npm run gen:types        # export_contract_schema.py → json2ts → entities.ts
```
Run `lint → typecheck` before committing frontend changes.

## Architecture

**Real-time multiplayer dungeon crawler.** Server runs 20 Hz game loop (`asyncio.sleep(0.05)`). All game state on server; frontend is pure canvas renderer.

### Backend (`backend/app/`)

- `main.py` — FastAPI app, `ConnectionManager` (WebSocket lifecycle, 60s reconnect)
- `engine/manager.py::GameInstance` — central state, composed from mixins in `engine/game/`
  - Core: `TickMixin`, `MovementCombatMixin`, `GenerationMixin`, `PlayersMixin`, `ItemsMixin`, `VisionMixin` (shadowcasting LOS), `EventsMixin`, `FloorAccessMixin`, `WorldInteractionMixin`, `SerializationMixin`
  - Boss AI: `GooAIMixin`, `TenguAIMixin`, `DM300AIMixin`, `DwarfKingAIMixin`, `YogDzewaAIMixin`, `DemonSpawnerAIMixin`, `PylonAIMixin`, `NecromancerAIMixin`
  - Other: `TalentsMixin`, `RogueMixin`, `ArmorAbilitiesMixin`, `PrisonBossMixin`, `MirrorImageMixin`
- `engine/entities/` — `Entity`, `Player`, `Mob`, `Item`, `Weapon`, `Potion`, `Bag`, buffs, subclasses/talents, item action dispatch
- `engine/dungeon/spd_levelgen/` — faithful Java `java.util.Random` port (`SpdRandom`), level generation pipeline. **SpdRandom must stay byte-identical — breaks seed determinism.**
- `engine/game/constants.py` — canonical game constants (import from here, not `manager.py`)
- `app/schemas/` — Pydantic WS envelopes (`InitMessage`, `StateUpdateMessage`, `PongMessage` inbound/outbound)

### Frontend (`frontend/src/`)

Three app states: `WELCOME → SELECT → PLAYING`. See `frontend/CLAUDE.md` for full hook/routing/render pipeline details.

Key files:
- `App.jsx` — owns React state, screen routing, HUD
- `net/useGameSocket.ts` — WebSocket lifecycle, heartbeat, state hydration
- `rendering/useGameRenderer.js` — rAF loop + draw pipeline (terrain → features → items → entities → effects)
- `input/useCanvasControls.js` / `useKeyboardControls.js`
- `audio/AudioManager.js` — Web Audio API singleton
- `types/generated/entities.ts` — auto-generated from backend; **never edit manually**

### Foundational rules
- Game state lives entirely on the server — never put game logic in the frontend
- Floors generate lazily on first visit; `FloorState` holds runtime state (grid, mobs, items, traps, doors, flags)
- Factions control friendly-fire
- Floor ranges: `SEWERS_MAX_FLOOR=4`, `PRISON_MAX_FLOOR=9`, `MAX_FLOOR_ID=50`; boss floors at 5, 10, 15, ...
- `kind_appearance` scrambles potion/scroll labels per run (mirrors `ItemSpriteSheet.java`)

## Debugging

Dev build exposes `window.__debug` (see `frontend/src/dev/useDebugApi.js`). Connect to http://localhost:5173 in a browser, start a game, then:

- `__debug.ascii()` — ASCII map with entities
- `__debug.at(x,y)` — tile info + entities at cell
- `__debug.entities()`, `__debug.vision()`, `__debug.camera()`, `__debug.me()`, `__debug.depth()`, `__debug.bounds()`
- `__debug.help()` — full list

Prefer structured `evaluate_script` over screenshots — cheaper, more data.

## Versioning Rules

`frontend/package.json` version is auto-bumped by the `.githooks/commit-msg` git hook — **agents must NOT manually edit the version field**, it will double-bump.

### Branch types & version bumps (handled by the hook)

| Branch prefix | Commit prefix | Version bump | Example |
|---|---|---|---|
| `feature/*` | `feat:` | Minor + reset patch to 0 | `0.4.9` → `0.5.0` |
| `bugfix/*` | `fix:` | Patch only | `0.4.9` → `0.4.10` |
| `release/*` | `chore:` | Untouched — set explicitly by user | `0.5.0` |

- Bump happens once per branch (compares current version to the version at the branch's merge-base with `main`), not once per commit.
- Unrecognized branch prefixes: hook does nothing, no bump.
- If `core.hooksPath` isn't set to `.githooks` in a clone, run `git config core.hooksPath .githooks` once.

## Version bump checklist

`frontend/package.json` is auto-bumped by the git hook (see above). On release, still update manually (search for `0.4.9` as reference):
- `frontend/src/menu/content/changelog.js` — `APP_VERSION`
- `frontend/src/locales/en/translation.json` — changelog entries + title
- `frontend/src/locales/ru/translation.json` — changelog entries + title
- `./deploy.sh` reads the version from `package.json` and tags/pushes/deploys both images with it — no manual image-tag editing needed.

## Reference docs

- `docs/spd_items/` — SPD item catalogs (weapons, armor, potions, scrolls, rings, artifacts, seeds, sprites)
- `docs/spd_line_of_sight.md` — LOS mechanics
- `docs/enemies.txt` — enemy stats
- `shattered-pixel-dungeon/` — original Java source for flow verification

