## Summary

This is a major release (v1.0.0) introducing a complete architectural overhaul of the game engine and networking layer, followed by ongoing optimizations including a new talent system, event dispatcher architecture, window manager rewrite, entity service layer, synchronizer system, animation manager, trap rendering improvements, combat events refactoring, and talent UI hooks — plus removal of hidden doors from first rooms and addition of magical sleep for newly spawned mobs.

## Key Changes

### Backend
- **Event-driven WebSocket architecture** — Replaced vibe-coded WS handling with a clean event-driven flow using `WebSocketConnectionManager` and `MessageDispatcher`
- **OOP game entities** — Refactored player, items (bombs, consumables, scrolls), and base entity classes into proper OOP structures
- **Movement system overhaul** — New movement controller with block resolution, chest handling, and tick-based movement logic
- **Serialization improvements** — Enhanced serialization for players, inventory, and game state
- **Talent System Overhaul** — Complete talent system with registry-based architecture (`TalentEffectRegistry`, `EffectContext`), handler modules for `on_eat`, `on_kill`, `on_potion`, `on_step`, passive stats, rogue tick. New talents: Hearty Meal, Iron Stomach, Cashed Rations, Empowering Meal, Mystical Meal, Energizing Meal, Invigorating Meal, Cleave, Lethal Momentum, Soul Eater, Deathly Durability
- **Player Tick Refactoring** — Major refactoring of `player_tick.py` with improved tick logic for player actions, movement validation, and interaction handling
- **Chest System Rewrite** — Complete rewrite of chest handling in the movement system with proper open/close state management and animation support
- **AI Improvements** — Updated Eye and Tengu AI behaviors; blob overrides (Web, Key Ward, Light Wall, Eternal Fire) now correctly applied during terrain changes

### Frontend
- **New input controller system** — Replaced direct canvas controls with a command-based architecture (`KeyActionRegistry`, `DirectionalMoveCommand`, etc.)
- **Movement prediction** — New `MovementPredictor` and `BlockerResolver` for client-side movement prediction
- **Combat event refactoring** — Major rewrite of combat events with proper state management
- **Animation pipeline** — New `HeroAnimationPipeline` for smooth character animations
- **UI simplification** — Removed obsolete overlays (AlchemyOverlay, DangerIndicator, VictoryScreen, etc.) and simplified remaining UI components
- **Event Dispatcher Architecture** — New `GameEventDispatcher` and `defaultEventDispatcher` replacing inline handlers. Events registered via factory functions (`createBossEventHandlers`, `createWorldEventHandlers`, etc.)
- **Window Manager Rewrite** — Complete rewrite with new `WindowManager` class supporting registration, level-based ordering, escape handling with fallback, and subscription-based updates
- **Entity Manager & Services** — New centralized services: `EntityManager`, `GameCallbacks`, `HeroStateSync`, `VisualEffectsManager`, `WorldManager`
- **Synchronizer Layer** — Dedicated synchronizers for Environment, Items, Mobs, Players, SelfPlayer, Traps, and Vision replacing the monolithic sync state approach
- **Animation Manager** — New `ItemAnimationManager` for handling item animations with proper lifecycle management
- **Trap Rendering** — Enhanced trap rendering system with new visual effects
- **Talent UI Hooks** — New talent query hooks (`useTalentData`, `useTalentUI`, `useTalents`) replacing the old `useTalentFlow` system

## Release Version: 1.0.0
