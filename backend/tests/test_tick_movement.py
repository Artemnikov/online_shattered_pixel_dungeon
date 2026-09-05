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


def test_move_intent_diagonal_grace_window_updates_direction():
    """When two keys forming a diagonal arrive within the initial grace window,
    the server steps once in the combined diagonal direction, rather than
    taking an initial orthogonal step."""
    game = GameInstance("test-game")
    player = game.add_player("p1", "Tester")

    floor = game._get_or_create_floor(player.floor_id)
    floor.mobs.clear()

    x, y = _find_open_diagonal(floor)
    player.pos = Position(x=x, y=y)

    # First keydown arrives: Up/Down orthogonal
    game.set_move_intent(player.id, 0, 1)
    # Second keydown arrives immediately after: diagonal
    game.set_move_intent(player.id, 1, 1)

    # Elapse the initial grace window
    player.last_auto_move_time -= 0.1
    game.update_tick()

    # Must have stepped diagonally once from starting pos (x, y) -> (x + 1, y + 1)
    assert (player.pos.x, player.pos.y) == (x + 1, y + 1)


def test_move_intent_single_tap_executes_on_stop():
    """A brief key tap that releases within the grace window should execute
    its single step upon MOVE_STOP rather than being dropped."""
    game = GameInstance("test-game")
    player = game.add_player("p1", "Tester")

    floor = game._get_or_create_floor(player.floor_id)
    floor.mobs.clear()

    x, y = _find_open_diagonal(floor)
    player.pos = Position(x=x, y=y)

    # Key down
    game.set_move_intent(player.id, 1, 0)
    # Key up before tick
    game.set_move_intent(player.id, 0, 0)

    # Single tap step executed immediately
    assert (player.pos.x, player.pos.y) == (x + 1, y)
    assert player.move_intent is None


def test_queue_move_step_sequence_execution():
    """Discrete sequence-numbered steps execute in order and track last_processed_seq."""
    game = GameInstance("test-game")
    player = game.add_player("p1", "Tester")

    floor = game._get_or_create_floor(player.floor_id)
    floor.mobs.clear()

    x, y = _find_open_diagonal(floor)
    player.pos = Position(x=x, y=y)

    game.queue_move_step(player.id, 1, 1, 0)
    game.queue_move_step(player.id, 2, 0, 1)

    assert len(player.movement.step_queue) == 2

    game.update_tick()
    assert (player.pos.x, player.pos.y) == (x + 1, y)
    assert player.last_processed_seq == 1
    assert len(player.movement.step_queue) == 1

    # Advance wall-clock past the step cooldown so next step executes
    player.reset_move_cooldown()
    game.update_tick()

    assert (player.pos.x, player.pos.y) == (x + 1, y + 1)
    assert player.last_processed_seq == 2
    assert len(player.movement.step_queue) == 0


def test_stop_move_with_last_seq_preserves_inflight():
    """stop_move(last_seq) retains queued steps up to last_seq and drops later steps."""
    game = GameInstance("test-game")
    player = game.add_player("p1", "Tester")

    floor = game._get_or_create_floor(player.floor_id)
    floor.mobs.clear()

    x, y = _find_open_diagonal(floor)
    player.pos = Position(x=x, y=y)

    game.queue_move_step(player.id, 1, 1, 0)
    game.queue_move_step(player.id, 2, 1, 0)
    game.queue_move_step(player.id, 3, 1, 0)

    game.stop_move(player.id, last_seq=2)

    assert len(player.movement.step_queue) == 2
    assert [s.seq for s in player.movement.step_queue] == [1, 2]


def test_queue_move_step_diagonal_redirection_replaces_unexecuted_step():
    """When a diagonal key arrives shortly after an orthogonal key, it replaces the
    unexecuted step so the player takes exactly 1 diagonal step instead of 2 tiles."""
    game = GameInstance("test-game")
    player = game.add_player("p1", "Tester")

    floor = game._get_or_create_floor(player.floor_id)
    floor.mobs.clear()

    x, y = _find_open_diagonal(floor)
    player.pos = Position(x=x, y=y)

    # Initial keydown W arrives
    game.queue_move_step(player.id, 1, 0, 1)
    assert len(player.movement.step_queue) == 1
    assert player.movement.step_queue[0].dx == 0 and player.movement.step_queue[0].dy == 1

    # Second keydown D arrives before tick executes, replacing seq 1 with diagonal
    game.queue_move_step(player.id, 2, 1, 1, replaces=1)
    assert len(player.movement.step_queue) == 1
    assert player.movement.step_queue[0].seq == 2
    assert player.movement.step_queue[0].dx == 1 and player.movement.step_queue[0].dy == 1

    # Stop received from key releases
    game.stop_move(player.id, last_seq=2)

    # Execute tick
    game.update_tick()
    assert (player.pos.x, player.pos.y) == (x + 1, y + 1)
    assert player.last_processed_seq == 2
    assert len(player.movement.step_queue) == 0


def test_queue_move_step_diagonal_redirection_after_execution_computes_delta():
    """If the initial step was already executed, redirection applies only the remaining delta."""
    game = GameInstance("test-game")
    player = game.add_player("p1", "Tester")

    floor = game._get_or_create_floor(player.floor_id)
    floor.mobs.clear()

    x, y = _find_open_diagonal(floor)
    player.pos = Position(x=x, y=y)

    # Step 1 executes
    game.queue_move_step(player.id, 1, 0, 1)
    game.update_tick()
    assert (player.pos.x, player.pos.y) == (x, y + 1)
    assert player.last_processed_seq == 1

    # Redirect arrived late (replaces=1 with combined (1, 1))
    game.queue_move_step(player.id, 2, 1, 1, replaces=1)
    # Remaining delta from (0, 1) to (1, 1) is (1, 0)
    assert len(player.movement.step_queue) == 1
    assert player.movement.step_queue[0].dx == 1 and player.movement.step_queue[0].dy == 0

    # Advance wall-clock past the step cooldown (wait for cooldown to expire)
    player.reset_move_cooldown()
    game.update_tick()
    assert (player.pos.x, player.pos.y) == (x + 1, y + 1)
    assert player.last_processed_seq == 2



