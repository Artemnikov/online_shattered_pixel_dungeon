# Copyright (C) 2026 ArtemNikov
#
# Adapted from Shattered Pixel Dungeon (C) 2014-2024 Evan Debenham
# GNU GPL v3+ — see LICENSE.
"""Backward-compat shim: wand classes now live in `app.engine.entities.wands`.

Kept so existing `from app.engine.entities.items_wands import ...` statements
(20+ files) keep working. New code should import from the `wands` package.
"""
from app.engine.entities.wands import *  # noqa: F401,F403
from app.engine.entities.wands import (  # noqa: F401
    Wand, DamageWand, ZapContext,
    WandOfMagicMissile, WandOfPrismaticLight, WandOfBlastWave,
    WandOfTransfusion, WandOfFireblast, WandOfFrost, WandOfLightning,
    WandOfDisintegration, WandOfCorrosion, WandOfCorruption,
    WandOfRegrowth, WandOfWarding, WandOfLivingEarth, CursedWand,
)
