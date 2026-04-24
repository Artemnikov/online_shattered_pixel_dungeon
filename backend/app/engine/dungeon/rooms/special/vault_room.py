"""VaultRoom: a locked SpecialRoom. Its single connection paints as
LOCKED_DOOR; the matching key spawns elsewhere on the floor.

Mirrors SPD `rooms/special/VaultRoom.java`. The orchestrator is
responsible for placing the key cell and recording the
(door_pos, key_id) pair in SewersGenerationMetadata.locked_doors so the
runtime unlock path can check what key fits what lock.
"""

from app.engine.dungeon.rooms.room import DoorType
from app.engine.dungeon.rooms.special.special_room import SpecialRoom


class VaultRoom(SpecialRoom):
    template = "treasure_vault"

    def paint(self, level) -> None:
        level.fill_rect(self.left, self.top, self.right, self.bottom, level.WALL)
        level.fill_rect(self.left + 1, self.top + 1, self.right - 1, self.bottom - 1, level.FLOOR)
        for door in self.connected.values():
            if door is not None:
                door.set(DoorType.LOCKED)
