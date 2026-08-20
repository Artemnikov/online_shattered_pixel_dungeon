# Copyright (C) 2026 ArtemNikov
#
"""Caves-region StandardRoom subclasses (region-table indices 10-14) + their
entrance/exit variants (registration-table indices 8-11). All still
`paint = _stub_paint` placeholders (see standard_rooms_base.py's module
docstring) -- unreachable on sewers floors, out of this port's current scope.

Split out of standard_rooms.py, which used to hold all ~85 StandardRoom
subclasses across every region in one file.
"""

from app.engine.dungeon.spd_levelgen.room_types import StandardRoom
from app.engine.dungeon.spd_levelgen.standard_rooms_base import StandardBridgeRoom, _stub_paint
from app.engine.dungeon.spd_levelgen.standard_rooms_fillers import FissureRoom

# -- Caves standard rooms (region-table indices 10-14) ---------------------

class CaveRoom(StandardRoom):
    paint = _stub_paint


class RegionDecoBridgeRoom(StandardBridgeRoom):
    paint = _stub_paint


class CavesFissureRoom(FissureRoom):
    pass  # inherits FissureRoom's paint


class CirclePitRoom(StandardRoom):
    paint = _stub_paint


class CircleWallRoom(StandardRoom):
    paint = _stub_paint


# -- Caves entrance/exit variants (entrance indices 8-11, exit indices 8-11) -

class CaveEntranceRoom(CaveRoom):
    def is_entrance(self) -> bool:
        return True


class CaveExitRoom(CaveRoom):
    def is_exit(self) -> bool:
        return True


class RegionDecoBridgeEntranceRoom(RegionDecoBridgeRoom):
    def is_entrance(self) -> bool:
        return True


class RegionDecoBridgeExitRoom(RegionDecoBridgeRoom):
    def is_exit(self) -> bool:
        return True


class CavesFissureEntranceRoom(CavesFissureRoom):
    def is_entrance(self) -> bool:
        return True


class CavesFissureExitRoom(CavesFissureRoom):
    def is_exit(self) -> bool:
        return True


class CircleWallEntranceRoom(CircleWallRoom):
    def is_entrance(self) -> bool:
        return True


class CircleWallExitRoom(CircleWallRoom):
    def is_exit(self) -> bool:
        return True
