# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 ArtemNikov
#
# Adapted from Shattered Pixel Dungeon (C) 2014-2024 Evan Debenham
# GNU GPL v3+ — see base.py for full notice.
"""Cursed wand item class (fires via cursed_wand.py effect dispatcher)."""
from __future__ import annotations

from typing import ClassVar, Literal

from app.engine.entities.base import *  # noqa: F401,F403
from app.engine.entities.wands.base import Wand


class CursedWand(Wand):
    kind: Literal["cursed_wand"] = "cursed_wand"
    name: str = "Cursed Wand"
    type: str = "wand"
    charges: int = 1
    max_charges: int = 1
    cursed: bool = True
    cursed_known: bool = True
    DESC: ClassVar[str] = "A heavily cursed wand crammed with unstable magical energy. Nobody knows what it does."

    def handle_zap(self, ctx):
        from app.engine.entities.cursed_wand import fire_cursed_wand
        fire_cursed_wand(ctx.game, ctx.attacker, self, ctx.target_x, ctx.target_y)
