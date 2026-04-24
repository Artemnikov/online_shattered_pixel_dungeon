"""SpecialRoom base — rooms with pre-set contents and a single connection.

Mirrors SPD `rooms/special/SpecialRoom.java`. SpecialRooms are
architecturally similar to StandardRooms (walls + floor interior +
paint() hook), but limited to one connection so they read as
self-contained side chambers. Concrete subclasses (Shop, Vault, …)
override `paint()` to stamp content-specific tiles.

`template` is a semantic label (e.g. "storage", "shrine") used by
metadata/tests to identify what kind of special landed on this floor.
"""

from typing import Dict, Tuple

from app.engine.dungeon.rooms.room import Direction, DoorType
from app.engine.dungeon.rooms.standard.standard_room import StandardRoom


class SpecialRoom(StandardRoom):
    MIN_WIDTH = 5
    MAX_WIDTH = 10
    MIN_HEIGHT = 5
    MAX_HEIGHT = 10
    MAX_CONNECTIONS: Dict[Direction, int] = {
        Direction.ALL: 1,
        Direction.LEFT: 1, Direction.TOP: 1,
        Direction.RIGHT: 1, Direction.BOTTOM: 1,
    }

    template: str = "special"

    def min_width(self) -> int: return self.MIN_WIDTH
    def max_width(self) -> int: return self.MAX_WIDTH
    def min_height(self) -> int: return self.MIN_HEIGHT
    def max_height(self) -> int: return self.MAX_HEIGHT

    # Keep special-room contents legible — no random water/grass/traps.
    def can_place_water(self, p: Tuple[int, int]) -> bool: return False
    def can_place_grass(self, p: Tuple[int, int]) -> bool: return False
    def can_place_trap(self, p: Tuple[int, int]) -> bool: return False

    def paint(self, level) -> None:
        level.fill_rect(self.left, self.top, self.right, self.bottom, level.WALL)
        level.fill_rect(self.left + 1, self.top + 1, self.right - 1, self.bottom - 1, level.FLOOR)
        for door in self.connected.values():
            if door is not None:
                door.set(DoorType.REGULAR)
