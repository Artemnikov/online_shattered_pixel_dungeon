import time

from app.engine.manager import GameInstance
from app.engine.dungeon.constants import TileType
from app.engine.entities.base import Position
from app.engine.entities.player import Mob as MobEntity
from app.engine.game.constants import AUTO_MOVE_INTERVAL, PATH_BLOCKED_GIVE_UP_TICKS


def test_path_queue_survives_temporary_mob_blockage():
    """A MOVE_TO path should resume once a mob that was blocking the next
    step moves out of the way, instead of being abandoned permanently."""
    game = GameInstance("test-game")
    player = game.add_player("p1", "Tester")

    floor = game._get_or_create_floor(player.floor_id)
    floor.mobs.clear()

    start_x, start_y = player.pos.x, player.pos.y
    player.path_queue = [(1, 0), (1, 0), (1, 0)]
    player.move_intent = None
    player.last_auto_move_time = 0.0

    blocker = MobEntity(
        id="blocker", name="Rat",
        pos=Position(x=start_x + 1, y=start_y),
        hp=10, max_hp=10,
    )
    floor.mobs[blocker.id] = blocker

    # Next step is blocked by the mob: stay put, but keep the path queued
    # so the player continues once the tile clears.
    game.update_tick()
    assert (player.pos.x, player.pos.y) == (start_x, start_y)
    assert player.path_queue == [(1, 0), (1, 0), (1, 0)]

    # Mob moves out of the way; the queued path should resume.
    blocker.pos = Position(x=start_x + 5, y=start_y + 5)
    player.last_auto_move_time = 0.0
    game.update_tick()

    assert (player.pos.x, player.pos.y) == (start_x + 1, start_y)
    assert player.path_queue == [(1, 0), (1, 0)]


def test_path_queue_gives_up_after_persistent_mob_blockage():
    """If a mob permanently camps the next tile, the queued path is dropped
    after a bounded number of retries rather than stalling forever."""
    game = GameInstance("test-game")
    player = game.add_player("p1", "Tester")

    floor = game._get_or_create_floor(player.floor_id)
    floor.mobs.clear()

    start_x, start_y = player.pos.x, player.pos.y
    player.path_queue = [(1, 0)]
    player.move_intent = None
    player.last_auto_move_time = 0.0

    blocker = MobEntity(
        id="blocker", name="Rat",
        pos=Position(x=start_x + 1, y=start_y),
        hp=10, max_hp=10,
    )
    floor.mobs[blocker.id] = blocker

    for _ in range(PATH_BLOCKED_GIVE_UP_TICKS + 1):
        player.last_auto_move_time = 0.0
        game.update_tick()

    assert (player.pos.x, player.pos.y) == (start_x, start_y)
    assert player.path_queue == []
    assert player.path_blocked_ticks == 0


def _find_open_diagonal(floor):
    """First (x, y) where both the tile and its (x+1, y+1) neighbour are plain
    floor — a spot a diagonal step is guaranteed to succeed from."""
    for y in range(floor.height - 1):
        for x in range(floor.width - 1):
            if (floor.grid[y][x] == TileType.FLOOR
                    and floor.grid[y + 1][x + 1] == TileType.FLOOR):
                return x, y
    raise AssertionError("no open diagonal found on floor")


def test_diagonal_move_intent_steps_at_orthogonal_interval():
    """SPD-authentic pacing: a diagonal step costs the same AUTO_MOVE_INTERVAL
    as an orthogonal one (Hero.move() spends 1 TICK regardless of direction) —
    no sqrt(2) penalty."""
    game = GameInstance("test-game")
    player = game.add_player("p1", "Tester")

    floor = game._get_or_create_floor(player.floor_id)
    floor.mobs.clear()

    x, y = _find_open_diagonal(floor)
    player.pos = Position(x=x, y=y)
    player.move_intent = (1, 1)
    player.path_queue = []
    # Exactly one interval has elapsed: must be enough to step diagonally.
    player.last_auto_move_time = time.time() - AUTO_MOVE_INTERVAL

    game.update_tick()

    assert (player.pos.x, player.pos.y) == (x + 1, y + 1)


def test_diagonal_move_intent_waits_before_interval_elapses():
    """The flat interval still gates diagonal steps: nothing moves early."""
    game = GameInstance("test-game")
    player = game.add_player("p1", "Tester")

    floor = game._get_or_create_floor(player.floor_id)
    floor.mobs.clear()

    x, y = _find_open_diagonal(floor)
    player.pos = Position(x=x, y=y)
    player.move_intent = (1, 1)
    player.path_queue = []
    player.last_auto_move_time = time.time()  # no time elapsed

    game.update_tick()

    assert (player.pos.x, player.pos.y) == (x, y)
