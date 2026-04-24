"""ShopRoom: a SpecialRoom placeholder for a future shop feature.

Paints as a plain special room for now (floor interior + walls + a
regular door). The real SPD shop rolls a fixed inventory and spawns a
shopkeeper NPC on generation; this port leaves those behaviours for
a later pass that wires into the game's item/NPC systems.
"""

from app.engine.dungeon.rooms.special.special_room import SpecialRoom


class ShopRoom(SpecialRoom):
    template = "shop"
