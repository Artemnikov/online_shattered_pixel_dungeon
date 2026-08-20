# Copyright (C) 2026 ArtemNikov
#
"""SpecialRoom/SecretRoom registration-order tuples (SpecialRoom.java/
SecretRoom.java static lists) -- kept together in one place since several
span multiple submodules (equip/consumable/misc) and order is significant."""

from __future__ import annotations

from app.engine.dungeon.spd_levelgen.special_rooms.consumable import (
    CrystalPathRoom, GardenRoom, LibraryRoom, MagicalFireRoom, MagicWellRoom,
    RunestoneRoom, StorageRoom, ToxicGasRoom, TrapsRoom, TreasuryRoom,
)
from app.engine.dungeon.spd_levelgen.special_rooms.equip import (
    ArmoryRoom, CrystalChoiceRoom, CrystalVaultRoom, CryptRoom, PoolRoom,
    SacrificeRoom, SentryRoom, StatueRoom, WeakFloorRoom,
)
from app.engine.dungeon.spd_levelgen.special_rooms.misc import PitRoom
from app.engine.dungeon.spd_levelgen.special_rooms.secret import (
    SecretArtilleryRoom, SecretChestChasmRoom, SecretGardenRoom,
    SecretHoardRoom, SecretHoneypotRoom, SecretLaboratoryRoom,
    SecretLarderRoom, SecretLibraryRoom, SecretMazeRoom, SecretRunestoneRoom,
    SecretSummoningRoom, SecretWellRoom,
)

# Order matters: matches SpecialRoom.java's static list registration order
# (Random.shuffle consumes them in this order during initForRun).
EQUIP_SPECIALS = (
    WeakFloorRoom, CryptRoom, PoolRoom, ArmoryRoom, SentryRoom,
    StatueRoom, CrystalVaultRoom, CrystalChoiceRoom, SacrificeRoom,
)

CONSUMABLE_SPECIALS = (
    RunestoneRoom, GardenRoom, LibraryRoom, StorageRoom, TreasuryRoom,
    MagicWellRoom, ToxicGasRoom, MagicalFireRoom, TrapsRoom, CrystalPathRoom,
)

CRYSTAL_KEY_SPECIALS = (PitRoom, CrystalVaultRoom, CrystalChoiceRoom, CrystalPathRoom)

POTION_SPAWN_ROOMS = (PoolRoom, SentryRoom, StorageRoom, ToxicGasRoom, MagicalFireRoom, TrapsRoom)

# Order matters: matches SecretRoom.ALL_SECRETS static list registration order.
ALL_SECRETS = (
    SecretGardenRoom, SecretLaboratoryRoom, SecretLibraryRoom, SecretLarderRoom,
    SecretWellRoom, SecretRunestoneRoom, SecretArtilleryRoom, SecretChestChasmRoom,
    SecretHoneypotRoom, SecretHoardRoom, SecretMazeRoom, SecretSummoningRoom,
)
