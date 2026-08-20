# Copyright (C) 2026 ArtemNikov
#
"""Guard's one-shot chain-pull (SPD Guard.chain()/pullEnemy()): while hunting
and not yet used, drags a distant (2-4 tile), line-of-sight enemy to the
closest open cell along the chain and Cripples it. Never fires again after
one successful use.
"""

from app.engine.entities.base import Position, chebyshev_distance
from app.engine.entities.buffs import add_buff
from app.engine.entities.mobs import Guard
from app.engine.game.floor_state import FloorState
from app.engine.systems.ballistica import ballistica_path


def _update_guard(game, guard: Guard, floor: FloorState, floor_id: int) -> bool:
    if guard.ai_state != "hunting" or guard.chain_pulled:
        return False

    target = game._find_nearest_player(guard.pos, floor_id)
    if target is None or "IMMOVABLE" in getattr(target, "properties", []):
        return False

    dist = chebyshev_distance(guard.pos.x, guard.pos.y, target.pos.x, target.pos.y)
    if dist <= 1 or dist >= 5:
        return False

    path = ballistica_path(guard.pos.x, guard.pos.y, target.pos.x, target.pos.y,
                            floor.flags, floor.width, floor.height)
    if len(path) < 2 or path[-1] != (target.pos.x, target.pos.y):
        return False
    fx, fy = path[1]
    if floor.flags.pit[fy][fx]:
        return False

    def _occupied(x, y):
        for p in game._players_on_floor(floor_id):
            if getattr(p, "is_alive", True) and p.pos.x == x and p.pos.y == y:
                return True
        return any(m.is_alive and m.pos.x == x and m.pos.y == y
                   for m in floor.mobs.values() if m.id != guard.id)

    dest = next(((x, y) for (x, y) in path[1:]
                 if not floor.flags.solid[y][x] and not _occupied(x, y)), None)
    if dest is None:
        return False

    guard.chain_pulled = True
    from_x, from_y = target.pos.x, target.pos.y
    target.pos = Position(x=dest[0], y=dest[1])
    game._invalidate_fov_cache()
    add_buff(target.buffs, "cripple", duration=4.0, level=1)

    game.add_event("GUARD_CHAIN_PULL", {
        "mob": guard.id, "target": target.id,
        "from_x": from_x, "from_y": from_y, "to_x": dest[0], "to_y": dest[1],
    }, floor_id=floor_id)
    game.add_event("PLAY_SOUND", {"sound": "CHAINS"}, floor_id=floor_id)
    return True
