# Copyright (C) 2026 ArtemNikov
#
"""Per-player per-tick updates: auto-move/pathing, heal ticks, passive regen,
combo/shield/berserk decay, and trinket procs. Extracted from TickMixin.update_tick.
"""

import random
import time
from typing import Optional

from app.engine.entities.base import Faction, chebyshev_distance
from app.engine.entities.buffs import get_buff, is_frozen
from app.engine.entities.player import Player
from app.engine.game.constants import AUTO_MOVE_INTERVAL, PATH_BLOCKED_GIVE_UP_TICKS


class PlayerTickMixin:
    def _emit_move_rejection_if_needed(self, player_id: str, x: int, y: int, seq: Optional[int] = None) -> None:
        already_emitted = any(
            e.get("type") == "MOVE_RESULT"
            and e.get("data", {}).get("entity") == player_id
            and (seq is None or e.get("data", {}).get("seq") == seq)
            for e in self.events
        )
        if not already_emitted:
            data = {"entity": player_id, "x": x, "y": y, "ok": False}
            if seq is not None:
                data["seq"] = seq
            self.add_event("MOVE_RESULT", data, player_id=player_id)

    def _tick_player(self, player: Player, dt: float) -> None:
        if player.is_downed or not player.is_alive:
            return

        pf = self._get_or_create_floor(player.floor_id)
        enemies_nearby = self._has_enemies_nearby(pf, player, radius=3)
        step_ticks = player.get_step_ticks(enemies_nearby=enemies_nearby)

        player.movement.tick_cooldown()

        if player.movement.has_queued_step():
            if player.movement.is_ready_for_step():
                step = player.movement.pop_step()
                pre_x, pre_y = player.pos.x, player.pos.y
                self.move_entity(player.id, step.dx, step.dy, seq=step.seq)
                if (player.pos.x, player.pos.y) != (pre_x, pre_y):
                    player.movement.on_step_executed(step.seq, step_ticks, step.dx, step.dy)
                else:
                    player.movement.on_step_failed(step.seq)
                    self._emit_move_rejection_if_needed(player.id, pre_x, pre_y, seq=step.seq)
        elif player.movement.has_intent():
            now = time.time()
            if player.movement.move_intent is not None:
                dx, dy = player.movement.move_intent
                move_interval = float(step_ticks) * 0.05
                if now - player.movement.last_auto_move_time >= move_interval:
                    player.movement.initial_step_pending = False
                    player.movement.last_auto_move_time = now
                    pre_x, pre_y = player.pos.x, player.pos.y
                    self.move_entity(player.id, dx, dy)
                    if (player.pos.x, player.pos.y) == (pre_x, pre_y):
                        self._emit_move_rejection_if_needed(player.id, pre_x, pre_y)
        elif player.movement.has_path():
            if player.movement.is_ready_for_step():
                dx, dy = player.movement.path_queue[0]
                nx, ny = player.pos.x + dx, player.pos.y + dy
                if any(m.is_alive and m.pos.x == nx and m.pos.y == ny for m in pf.mobs.values()):
                    player.movement.path_blocked_ticks += 1
                    if player.movement.path_blocked_ticks > PATH_BLOCKED_GIVE_UP_TICKS:
                        player.movement.path_queue.clear()
                        player.movement.path_blocked_ticks = 0
                else:
                    player.movement.path_queue.popleft()
                    player.movement.path_blocked_ticks = 0
                    pre_x, pre_y = player.pos.x, player.pos.y
                    self.move_entity(player.id, dx, dy)
                    if (player.pos.x, player.pos.y) != (pre_x, pre_y):
                        player.movement.on_step_executed(None, step_ticks)
                    else:
                        player.movement.on_step_failed(None)
                        self._emit_move_rejection_if_needed(player.id, pre_x, pre_y)

        self._apply_heal_tick(player)
        self._apply_aqua_heal_tick(player)
        self._apply_rest_regen(player, dt)
        self._apply_passive_regen(player, dt)
        heal_buff = get_buff(player.buffs, "healing")
        if heal_buff and player.hp < player.get_total_max_hp():
            player.set_heal(float(heal_buff.level * 2), 0.1, 1.0)
        self._tick_passive_wand_recharge(player, dt)

        if player.armor_charge < 100:
            player.armor_charge = min(100, player.armor_charge + 2)

        moved = player.movement.is_active()
        self.tick_rogue(player, dt, moved=moved)
        self.tick_artifacts(player, dt)
        self.tick_duelist(player, dt)
        self.tick_cleric(player, dt)

        if moved:
            player.stationary_ticks = 0
        else:
            player.stationary_ticks += 1

        # Hold Fast (warrior T3): while stationary, slows combo/shield
        # decay and the Broken Seal cooldown (0% decay at +3).
        hf_factor = player.get_hold_fast_decay_factor()
        hf_tick = hf_factor >= 1.0 or random.random() < hf_factor

        # Broken Seal (WarriorShield.act): once triggered (see
        # Player.take_damage), the shield holds until no enemies are nearby
        # for 5 turns; unused shield then reduces the remaining cooldown by
        # up to 50%. The cooldown itself ticks down toward 0 regardless of
        # Hold Fast (only the no-enemy counter is slowed). Combo keeps the
        # shield from decaying (treated as enemies nearby).
        if player.seal_affixed:
            seal_shield = player.get_shield("broken_seal")
            if seal_shield is not None:
                floor = self._get_or_create_floor(player.floor_id)
                nearby = any(
                    m.is_alive and m.faction != Faction.PLAYER
                    and chebyshev_distance(m.pos.x, m.pos.y, player.pos.x, player.pos.y) <= player.get_view_distance()
                    for m in floor.mobs.values()
                )
                if nearby or player.combo_count > 0:
                    player.seal_no_enemy_ticks = 0
                else:
                    player.seal_no_enemy_ticks += hf_factor
                    if player.seal_no_enemy_ticks >= 5:
                        initial = max(1, player.seal_initial_shield)
                        unused_frac = seal_shield.amount / initial
                        player.seal_cooldown = max(0, player.seal_cooldown - round(150 * unused_frac * 0.5))
                        player.shields = [s for s in player.shields if s.name != "broken_seal"]
                        player.seal_no_enemy_ticks = 0
            if player.seal_cooldown > 0:
                player.seal_cooldown -= 1

        if player.berserk_active:
            self.update_berserk(player)

        if player.combo_count > 0:
            player.combo_timer -= dt * hf_factor
            if player.combo_timer <= 0:
                player.combo_count = 0
                player.combo_timer = 0.0
                player.clobber_used = False
                player.parry_used = False

        if player.berserk_cooldown > 0:
            player.berserk_cooldown -= 1

        # self._apply_hunger_tick(player)  # disabled per request

        if hf_tick:
            player.decay_shields()
        if player.has_fury:
            player.fury_turns_remaining -= 1
            if player.fury_turns_remaining <= 0:
                player.has_fury = False
                player.fury_turns_remaining = 0

        # ChaoticCenser trinket: periodic gas cloud spawning
        from app.engine.entities.trinkets import ChaoticCenser as _CC
        from app.engine.entities.trinkets import trinket_level
        cc_lvl = trinket_level(player, "chaotic_censer")
        if cc_lvl >= 0:
            player._cc_turns = getattr(player, "_cc_turns", 0) + 1
            avg_interval = _CC.average_turns_until_gas(cc_lvl)
            if avg_interval > 0 and player._cc_turns >= avg_interval:
                player._cc_turns = 0
                floor = self._get_or_create_floor(player.floor_id)
                nearby_mobs = [
                    m for m in floor.mobs.values()
                    if m.is_alive and m.faction != Faction.PLAYER
                    and chebyshev_distance(m.pos.x, m.pos.y, player.pos.x, player.pos.y) <= 4
                ]
                if nearby_mobs:
                    target = random.choice(nearby_mobs)
                    gas_type = random.choice(["toxic_gas", "fire", "paralytic_gas"])
                    from app.engine.game.terrain_effects import _create_gas
                    _create_gas(floor, (target.pos.x, target.pos.y), 4, gas_type)
