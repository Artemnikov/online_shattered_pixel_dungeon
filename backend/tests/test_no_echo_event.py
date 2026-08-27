from app.engine.manager import GameInstance, Position
from app.engine.dungeon.constants import TileType
from app.engine.game.floor_state import FloorState

def test_events_not_echoed_to_source_player():
    game = GameInstance("test_no_echo")
    grid = [[TileType.FLOOR for _ in range(10)] for _ in range(10)]
    game.floors[1] = FloorState(floor_id=1, grid=grid, rooms=[], mobs={}, items={})
    
    p1 = game.add_player("p1", "Player 1")
    p2 = game.add_player("p2", "Player 2")
    p1.pos = Position(x=2, y=2)
    p2.pos = Position(x=3, y=2)
    
    # Emit an event with source_player_id="p1"
    game.add_event("SEARCH", {"x": 2, "y": 2}, source_player_id="p1")
    events = game.flush_events()
    
    # p1 (originating player) MUST NOT receive the event
    p1_events = game.filter_events_for_player(events, "p1")
    assert not any(e["type"] == "SEARCH" for e in p1_events)
    
    # p2 (other connected player in same room/floor/LOS) MUST receive the event
    p2_events = game.filter_events_for_player(events, "p2")
    assert any(e["type"] == "SEARCH" for e in p2_events)
