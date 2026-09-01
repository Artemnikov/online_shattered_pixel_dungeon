## Summary

This is a major release (v1.0.0) introducing a complete architectural overhaul of the game engine and networking layer.

## Key Changes

### Backend
- **Event-driven WebSocket architecture** — Replaced vibe-coded WS handling with a clean event-driven flow using `WebSocketConnectionManager` and `MessageDispatcher`
- **OOP game entities** — Refactored player, items (bombs, consumables, scrolls), and base entity classes into proper OOP structures
- **Movement system overhaul** — New movement controller with block resolution, chest handling, and tick-based movement logic
- **Serialization improvements** — Enhanced serialization for players, inventory, and game state

### Frontend
- **New input controller system** — Replaced direct canvas controls with a command-based architecture (`KeyActionRegistry`, `DirectionalMoveCommand`, etc.)
- **Movement prediction** — New `MovementPredictor` and `BlockerResolver` for client-side movement prediction
- **Combat event refactoring** — Major rewrite of combat events with proper state management
- **Animation pipeline** — New `HeroAnimationPipeline` for smooth character animations
- **UI simplification** — Removed obsolete overlays (AlchemyOverlay, DangerIndicator, VictoryScreen, etc.) and simplified remaining UI components

### Tests
- Comprehensive test coverage added for tick movement, inventory system, WS schemas, reconnect cleanup, and more

## Release Version: 1.0.0
