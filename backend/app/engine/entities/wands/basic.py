# Copyright (C) 2026 ArtemNikov
#
"""Simple damage wands: Magic Missile, Prismatic Light, Blast Wave, Transfusion."""
from __future__ import annotations

import random as _random
from typing import ClassVar, Literal, Optional, List

from app.engine.entities.base import *  # noqa: F401,F403
from app.engine.entities.wands.base import Wand, DamageWand, ZapContext, knockback_char


class WandOfMagicMissile(DamageWand):
    kind: Literal["wand_magic_missile"] = "wand_magic_missile"
    name: str = "Wand of Magic Missile"
    type: str = "wand"
    charges: int = 3
    max_charges: int = 3
    range: int = 8
    projectile_type: str = "magic_missile"
    wand_sound: str = "ATTACK_MAGIC"
    staff_name: str = "Staff of Magic Missile"
    DESC: ClassVar[str] = "A basic wand that fires a magic missile."

    def min(self, lvl: int) -> int: return 2 + lvl
    def max(self, lvl: int) -> int: return 8 + 2 * lvl

    def initial_charges(self) -> int:
        return 3

    def on_hit(self, attacker, defender, damage, floor_mobs=None, tile_x=None, tile_y=None, floor=None, add_event=None):
        if add_event:
            add_event("SPELL_SPRITE", {
                "x": attacker.pos.x, "y": attacker.pos.y, "index": 2  # SPELL_CHARGE
            })
        belongings = getattr(attacker, "belongings", None)
        if belongings is None:
            return
        for item in belongings.all_items():
            if isinstance(item, Wand) and item.id != self.id and item.charges < item.max_charges:
                item.gain_charge(0.5)

    def handle_zap(self, ctx):
        if ctx.hit and ctx.damage_dealt > 0:
            lvl = self.buffed_lvl()
            ctx.attacker.add_buff("magic_charge", duration=4.0, level=lvl, stack_mode="extend")


class WandOfPrismaticLight(DamageWand):
    kind: Literal["wand_prismatic_light"] = "wand_prismatic_light"
    name: str = "Wand of Prismatic Light"
    type: str = "wand"
    range: int = 8
    projectile_type: str = "rainbow"
    wand_sound: str = "RAY"
    staff_name: str = "Staff of Prismatic Light"
    DESC: ClassVar[str] = "A wand that fires a beam of prismatic light."

    def min(self, lvl: int) -> int: return 1 + lvl
    def max(self, lvl: int) -> int: return 5 + 3 * lvl

    def on_hit(self, attacker, defender, damage, floor_mobs=None, tile_x=None, tile_y=None, floor=None, add_event=None):
        if defender is None:
            return
        lvl = max(0, self.level)
        duration = round((1 + lvl))
        defender.add_buff("cripple", duration=float(duration), level=1)

    def handle_zap(self, ctx):
        lvl = self.buffed_lvl()
        if ctx.floor:
            # SPD: reveal map along entire beam path (3×3 per cell)
            sx, sy = ctx.attacker.pos.x, ctx.attacker.pos.y
            tx, ty = ctx.target_x, ctx.target_y
            dx = max(1, abs(tx - sx))
            dy = max(1, abs(ty - sy))
            steps = max(dx, dy)
            for i in range(steps + 1):
                cx = sx + round((tx - sx) * i / steps)
                cy = sy + round((ty - sy) * i / steps)
                for ddy in (-1, 0, 1):
                    for ddx in (-1, 0, 1):
                        nx, ny = cx + ddx, cy + ddy
                        if 0 <= nx < ctx.floor.width and 0 <= ny < ctx.floor.height:
                            if ctx.floor.flags and ctx.floor.flags.discoverable[ny][nx]:
                                if not ctx.floor.mapped:
                                    ctx.floor.mapped = True
                                if (nx, ny) not in ctx.floor.mapped_tiles:
                                    ctx.floor.mapped_tiles.append((nx, ny))
            # Light buff
            ctx.attacker.add_buff("light", duration=10.0 + lvl * 5, level=1)
        if ctx.hit and ctx.target_entity and ctx.target_entity.is_alive:
            blind_dur = 2.0 + lvl * 0.333
            if _random.random() < 3.0 / (5.0 + lvl):
                ctx.target_entity.add_buff("blindness", duration=blind_dur, level=1)


class WandOfBlastWave(DamageWand):
    kind: Literal["wand_blast_wave"] = "wand_blast_wave"
    name: str = "Wand of Blast Wave"
    type: str = "wand"
    range: int = 8
    projectile_type: str = "force"
    wand_sound: str = "ATTACK_MAGIC"
    staff_name: str = "Staff of Blast Wave"
    DESC: ClassVar[str] = "A wand that blasts enemies backwards."

    def min(self, lvl: int) -> int: return 1 + lvl
    def max(self, lvl: int) -> int: return 3 + 3 * lvl

    def on_hit(self, attacker, defender, damage, floor_mobs=None, tile_x=None, tile_y=None, floor=None, add_event=None):
        if defender is None or not defender.is_alive:
            return
        if (defender.has_buff("paralysis")
                and not defender.has_buff("blast_on_hit_tracker")):
            defender.remove_buff("paralysis")
            lvl = max(0, self.level)
            dmg = _random.randint(8 + 2 * lvl, 12 + 3 * lvl)
            defender.take_damage(dmg)
            defender.add_buff("blast_on_hit_tracker", duration=3.0, level=1)
            if add_event:
                add_event("PLAY_SOUND", {"sound": "BLAST"}, floor_id=getattr(defender, "floor_id", 0))

    def handle_zap(self, ctx):
        from app.engine.systems.ballistica import bresenham as _bresenham
        from app.engine.dungeon.constants import TrapType
        lvl = self.buffed_lvl()
        tx, ty = ctx.target_x, ctx.target_y
        floor = ctx.floor
        if floor is None:
            return
        # Centre push direction: bolt's last step (SPD bolt.path.get(bolt.dist+1))
        path = _bresenham(ctx.attacker.pos.x, ctx.attacker.pos.y, tx, ty)
        if len(path) >= 2:
            prev_x, prev_y = path[-2]
            bolt_dx = (tx > prev_x) - (tx < prev_x)
            bolt_dy = (ty > prev_y) - (ty < prev_y)
        else:
            bolt_dx = (tx > ctx.attacker.pos.x) - (tx < ctx.attacker.pos.x)
            bolt_dy = (ty > ctx.attacker.pos.y) - (ty < ctx.attacker.pos.y)
        # Press all 9 cells (grass/plants), skipping Tengu dart traps.
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                px, py = tx + dx, ty + dy
                if not (0 <= px < floor.width and 0 <= py < floor.height):
                    continue
                trap = floor.traps.get((px, py))
                if trap and trap.trap_type == TrapType.TENGU_DART:
                    continue
                from app.engine.game.terrain_effects import press_cell
                press_cell(floor, (px, py), ctx.attacker)
        # Collect ALL chars in 3×3 (including attacker — SPD self-knockback)
        chars = [m for m in list(ctx.floor_mobs.values())
                 if m.is_alive and abs(m.pos.x - tx) <= 1 and abs(m.pos.y - ty) <= 1]
        for p in (ctx.floor_players or []):
            if getattr(p, "is_alive", True) and abs(p.pos.x - tx) <= 1 and abs(p.pos.y - ty) <= 1:
                chars.append(p)
        ctx.add_event("PLAY_SOUND", {"sound": "BLAST"}, floor_id=ctx.floor_id)
        for ch in chars:
            at_center = (ch.pos.x == tx and ch.pos.y == ty)
            # SPD: neighbours take damageRoll() if not ally
            is_enemy = ch.faction != ctx.attacker.faction
            if at_center:
                kdx, kdy = bolt_dx, bolt_dy
                power = lvl + 3
                # Centre char always takes damage (SPD: unconditional)
                wand_dmg = self.damage_roll(lvl)
                ch.take_damage(wand_dmg)
            else:
                kdx, kdy = ch.pos.x - tx, ch.pos.y - ty
                # Java Math.round(1.5f + lvl/2f) for non-negative integers
                power = int(2.0 + lvl / 2.0)
                if is_enemy:
                    wand_dmg = self.damage_roll(lvl)
                    ch.take_damage(wand_dmg)
            # SPD: skip push if char died over a pit, or moved from damage
            expected_x = tx if at_center else tx + kdx
            expected_y = ty if at_center else ty + kdy
            on_pit = (floor.flags and floor.flags.pit[expected_y][expected_x])
            alive_or_safe = ch.is_alive or getattr(ch, "flying", False) or not on_pit
            if not alive_or_safe:
                continue
            if ch.pos.x != expected_x or ch.pos.y != expected_y:
                continue
            knockback_char(floor, ch, kdx, kdy, power,
                           damage_on_collision=True,
                           add_event=ctx.add_event, floor_id=ctx.floor_id)


class WandOfTransfusion(DamageWand):
    kind: Literal["wand_transfusion"] = "wand_transfusion"
    name: str = "Wand of Transfusion"
    type: str = "wand"
    range: int = 6
    projectile_type: str = "beacon"
    wand_sound: str = "RAY"
    staff_name: str = "Staff of Transfusion"
    DESC: ClassVar[str] = "A wand that transfers health."

    def min(self, lvl: int) -> int: return 3 + lvl
    def max(self, lvl: int) -> int: return 6 + 2 * lvl

    def on_hit(self, attacker, defender, damage, floor_mobs=None, tile_x=None, tile_y=None, floor=None, add_event=None):
        if defender is None or attacker is None:
            return
        if defender.has_buff("charm"):
            lvl = max(0, self.level)
            shield_amt = int(2 * (5 + lvl))
            attacker.add_shield("transfusion_shield", shield_amt, priority=1, decay=5)

    def handle_zap(self, ctx):
        lvl = self.buffed_lvl()
        target = ctx.target_entity
        player = ctx.attacker
        if target is None:
            return
        from app.engine.entities.player import Mob as MobEntity
        if not isinstance(target, MobEntity):
            return
        is_undead = "UNDEAD" in (getattr(target, "properties", None) or [])
        is_enemy = target.faction != player.faction
        if is_undead and is_enemy:
            # SPD: undead take damageRoll + shield
            dmg = ctx.damage_dealt if ctx.damage_dealt > 0 else 0
            if dmg > 0:
                target.take_damage(dmg)
                ctx.add_event("DAMAGE", {
                    "target": target.id, "amount": dmg,
                    "projectile": "beacon", "beam_type": "health_ray",
                    "source_x": player.pos.x, "source_y": player.pos.y,
                }, floor_id=ctx.floor_id)
            player.add_shield("transfusion_shield", 5 + lvl, priority=1, decay=5)
        elif not is_enemy or target.has_buff("charm"):
            # Ally or charmed: self-damage to heal
            self_dmg = max(1, player.get_total_max_hp() // 20)  # 5% max HP
            healing = self_dmg + 3 * lvl
            target.hp = min(target.get_total_max_hp(), target.hp + healing)
            player.add_shield("transfusion_shield", 5 + lvl, priority=1, decay=5)
            player.take_damage(self_dmg)
            ctx.add_event("PLAY_SOUND", {"sound": "HEAL"}, floor_id=ctx.floor_id)
        else:
            # Living enemy: shield self, charm (SPD: DURATION/2 = 5 turns)
            player.add_shield("transfusion_shield", 5 + lvl, priority=1, decay=5)
            target.add_buff("charm", duration=5.0, level=1)
