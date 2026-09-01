export const APP_VERSION = '1.0.0';

const CHANGELOG = [
  {
    version: '1.0.0',
    date: '2026-09-01',
    type: 'major',
    changes: [
      {
        category: 'Backend — Networking',
        description: 'Event-driven WebSocket architecture replacing the previous vibe-coded WS handling with a clean event-driven flow using WebSocketConnectionManager and MessageDispatcher.',
      },
      {
        category: 'Backend — Game Engine',
        description: 'OOP refactoring of game entities including Player, ItemBase (bombs, consumables, scrolls), and base entity classes into proper object-oriented structures.',
      },
      {
        category: 'Backend — Movement System',
        description: 'Complete movement system overhaul with new MovementController, block resolution logic, chest handling, and tick-based player movement.',
      },
      {
        category: 'Backend — Serialization',
        description: 'Enhanced serialization for players, inventory items, and full game state persistence.',
      },
      {
        category: 'Frontend — Input System',
        description: 'New command-based input controller architecture with KeyActionRegistry, DirectionalMoveCommand, InventoryToggleCommand, QuickslotCommand, and more.',
      },
      {
        category: 'Frontend — Movement Prediction',
        description: 'Client-side movement prediction with new MovementPredictor and BlockerResolver for smooth player movement.',
      },
      {
        category: 'Frontend — Combat',
        description: 'Major rewrite of combat events with proper state management and event-driven architecture.',
      },
      {
        category: 'Frontend — Animation',
        description: 'New HeroAnimationPipeline for smooth character animations.',
      },
      {
        category: 'Frontend — UI Cleanup',
        description: 'Removed obsolete overlays (AlchemyOverlay, DangerIndicator, VictoryScreen, GameLog, ToastOverlay, Toolbar) and simplified remaining UI components.',
      },
      {
        category: 'Tests',
        description: 'Comprehensive test coverage added for tick movement, inventory system, WS schemas, reconnect cleanup, no-echo events, per-player discovery, and admin tests.',
      },
    ],
  },
];

export default CHANGELOG;
