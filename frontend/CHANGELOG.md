# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-01

### Added
- **Backend — Networking**: Event-driven WebSocket architecture with `WebSocketConnectionManager` and `MessageDispatcher`, replacing the previous vibe-coded WS handling.
- **Backend — Game Engine**: OOP refactoring of game entities including `Player`, `ItemBase` (bombs, consumables, scrolls), and base entity classes into proper object-oriented structures.
- **Backend — Movement System**: Complete movement system overhaul with new `MovementController`, block resolution logic, chest handling, and tick-based player movement.
- **Backend — Serialization**: Enhanced serialization for players, inventory items, and full game state persistence.
- **Frontend — Input System**: New command-based input controller architecture with `KeyActionRegistry`, `DirectionalMoveCommand`, `InventoryToggleCommand`, `QuickslotCommand`, and more.
- **Frontend — Movement Prediction**: Client-side movement prediction with new `MovementPredictor` and `BlockerResolver` for smooth player movement.
- **Frontend — Combat**: Major rewrite of combat events with proper state management and event-driven architecture.
- **Frontend — Animation**: New `HeroAnimationPipeline` for smooth character animations.
- **Tests**: Comprehensive test coverage added for tick movement, inventory system, WS schemas, reconnect cleanup, no-echo events, per-player discovery, and admin tests.

### Changed
- Replaced direct canvas controls with a command-based input architecture on the frontend.
- Refactored all game entities from procedural code to OOP classes in the backend.
- Overhauled the movement system with proper block resolution and tick-based logic.

### Removed
- Obsolete frontend overlays: `AlchemyOverlay`, `DangerIndicator`, `VictoryScreen`, `GameLog`, `ToastOverlay`, `Toolbar`.
- Vibe-coded WebSocket handling flow on both frontend and backend.
- Direct canvas control input methods in favor of the new command system.
