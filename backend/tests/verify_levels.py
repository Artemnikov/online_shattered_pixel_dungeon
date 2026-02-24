import sys
import os

from app.engine.manager import GameInstance, TileType, Position
from app.engine.entities.base import EntityType

# Add the project root to the python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

WALKABLE_FLOORS = {
    TileType.FLOOR,
    TileType.FLOOR_WOOD,
    TileType.FLOOR_WATER,
    TileType.FLOOR_COBBLE,
}

def test_monster_safe_zones():
    """Verify monsters do not spawn in start or end rooms."""
    game = GameInstance("test_game")
    
    # Check multiple floors to be sure
    for depth in range(1, 4):
        game.generate_floor(depth)
        
        start_room = game.rooms[0]
        end_room = game.rooms[-1]
        
        for mob in game.mobs.values():
            if mob.type == EntityType.MOB:
                # Check if mob is in start room
                in_start = (start_room.x <= mob.pos.x < start_room.x + start_room.width and
                            start_room.y <= mob.pos.y < start_room.y + start_room.height)
                assert not in_start, f"Mob spawned in start room at {mob.pos} on depth {depth}"
                
                # Check if mob is in end room
                in_end = (end_room.x <= mob.pos.x < end_room.x + end_room.width and
                          end_room.y <= mob.pos.y < end_room.y + end_room.height)
                assert not in_end, f"Mob spawned in end room at {mob.pos} on depth {depth}"

def test_stairs_logic():
    """Verify per-player STAIRS_UP and STAIRS_DOWN logic."""
    game = GameInstance("test_game")
    game.add_player("p1", "Player 1")
    player = game.players["p1"]
    
    # 1. Start at Floor 1
    assert player.floor_id == 1
    
    # 2. Find Stairs Down
    stairs_down_pos = game._get_stairs_pos(TileType.STAIRS_DOWN)
    
    # Teleport player to Stairs Down
    player.pos = stairs_down_pos
    # Simulate move (trigger logic) - effectively waiting/moving on the spot or moving into it
    # The move_entity checks logic when moving *into* the tile.
    # So let's move from a neighbor tile.
    
    # Mock move to STAIRS_DOWN
    # actually move_entity expects a delta. 
    # Let's force a move from adjacent.
    # But to ensure validity, we can just call next_floor() directly or simulate the move.
    
    # Let's use game.move_entity to properly trigger the event.
    # Player is AT the stairs. The logic says "If player moves onto STAIRS_DOWN".
    # So we need to be adjacent.
    
    # Find a valid neighbor
    neighbor = None
    for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
        nx, ny = stairs_down_pos.x + dx, stairs_down_pos.y + dy
        if game.grid[ny][nx] in WALKABLE_FLOORS:
            neighbor = Position(x=nx, y=ny)
            break
    
    if neighbor:
        player.pos = neighbor
        dx = stairs_down_pos.x - neighbor.x
        dy = stairs_down_pos.y - neighbor.y
        game.move_entity("p1", dx, dy)
        
        # Should be at Floor 2 now
        assert player.floor_id == 2, "Player did not descend to floor 2"
        
        # Player should be at STAIRS_UP
        stairs_up_pos_depth2 = game._get_stairs_pos(TileType.STAIRS_UP, floor_id=2)
        assert player.pos.x == stairs_up_pos_depth2.x and player.pos.y == stairs_up_pos_depth2.y
        
        # 3. Go back UP
        # Find valid neighbor again
        neighbor = None
        for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            nx, ny = stairs_up_pos_depth2.x + dx, stairs_up_pos_depth2.y + dy
            if game.grid[ny][nx] in WALKABLE_FLOORS:
                neighbor = Position(x=nx, y=ny)
                break
                
        if neighbor:
            player.pos = neighbor
            dx = stairs_up_pos_depth2.x - neighbor.x
            dy = stairs_up_pos_depth2.y - neighbor.y
            game.move_entity("p1", dx, dy)
            
            # Should be at Floor 1 now
            assert player.floor_id == 1, "Player did not ascend to floor 1"
            
            # Player should be at STAIRS_DOWN (logic says reset to STAIRS_DOWN on prev_floor)
            stairs_down_pos_depth1 = game._get_stairs_pos(TileType.STAIRS_DOWN, floor_id=1)
            assert player.pos.x == stairs_down_pos_depth1.x and player.pos.y == stairs_down_pos_depth1.y

def test_players_can_be_on_different_floors():
    """Verify one player can change floor without moving others."""
    game = GameInstance("test_game")
    game.add_player("p1", "Player 1")
    game.add_player("p2", "Player 2")

    p1 = game.players["p1"]
    p2 = game.players["p2"]
    assert p1.floor_id == 1 and p2.floor_id == 1

    stairs_down_pos = game._get_stairs_pos(TileType.STAIRS_DOWN, floor_id=1)
    neighbor = None
    for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
        nx, ny = stairs_down_pos.x + dx, stairs_down_pos.y + dy
        if game.grid[ny][nx] in WALKABLE_FLOORS:
            neighbor = Position(x=nx, y=ny)
            break

    if neighbor:
        p1.pos = neighbor
        game.move_entity("p1", stairs_down_pos.x - neighbor.x, stairs_down_pos.y - neighbor.y)

    assert p1.floor_id == 2, "Player 1 should be on floor 2"
    assert p2.floor_id == 1, "Player 2 should remain on floor 1"

if __name__ == "__main__":
    # Run tests manually
    try:
        test_monster_safe_zones()
        print("test_monster_safe_zones passed")
        test_stairs_logic()
        print("test_stairs_logic passed")
        test_players_can_be_on_different_floors()
        print("test_players_can_be_on_different_floors passed")
    except AssertionError as e:
        print(f"Test failed: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")
WALKABLE_FLOORS = {
    TileType.FLOOR,
    TileType.FLOOR_WOOD,
    TileType.FLOOR_WATER,
    TileType.FLOOR_COBBLE,
}
