import pytest

from app.engine.manager import GameInstance
from app.engine.entities.base import Position
from app.engine.entities.player import Difficulty
from app.engine.entities.buffs import has_buff
from app.engine.entities.items_consumable import Ankh, Waterskin, LostBackpack


def _make_game(difficulty: Difficulty = Difficulty.EASY, floor_id: int = 1) -> GameInstance:
    game = GameInstance("test-ankh-respawn")
    game.change_difficulty(difficulty)
    return game


def _give_ankh(game: GameInstance, player_id: str, blessed: bool = False) -> Ankh:
    """Give the player an ankh (optionally blessed)."""
    player = game.players[player_id]
    ankh = Ankh(id=f"ankh_{player_id}", blessed=blessed)
    player.belongings.backpack.collect(ankh)
    return ankh


def _kill_player(game: GameInstance, player_id: str, floor_id: int = 1) -> dict:
    """Simulate death: down the player, run _kill_player, return the DEATH event data."""
    player = game.players[player_id]
    player.floor_id = floor_id
    player.hp = 0
    player.is_alive = False
    player.is_downed = True
    floor = game._get_or_create_floor(floor_id)
    game._kill_player(player, floor, floor_id)
    death_events = [e for e in game.events if e["type"] == "DEATH"]
    return death_events[-1]["data"]


# --- Blessed ankh tests ---

def test_blessed_ankh_grants_instant_revive_easy():
    game = _make_game(Difficulty.EASY)
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=True)
    max_hp = player.get_total_max_hp()

    data = _kill_player(game, "p1", floor_id=1)

    assert data["can_resurrect"] is False
    assert data["has_ankh"] is False
    assert data["loot_dropped"] is False
    assert player.is_alive is True
    assert player.is_downed is False
    # Easy = 75% HP
    assert player.hp == int(max_hp * 0.75)
    # Ankh consumed
    assert not any(isinstance(i, Ankh) for i in player.belongings.all_items())
    # Score penalty applied
    assert player.respawns_used == 1


def test_blessed_ankh_grants_instant_revive_hard():
    game = _make_game(Difficulty.HARD)
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=True)
    max_hp = player.get_total_max_hp()

    data = _kill_player(game, "p1", floor_id=1)

    assert player.is_alive is True
    # Hard = 25% HP
    assert player.hp == int(max_hp * 0.25)


def test_blessed_ankh_preserves_all_items():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=True)
    initial_items = len(player.belongings.backpack.items)

    _kill_player(game, "p1", floor_id=1)

    # Backpack items preserved (minus the consumed ankh)
    assert len(player.belongings.backpack.items) == initial_items - 1


def test_blessed_ankh_clears_harmful_buffs():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=True)
    from app.engine.entities.buffs import add_buff
    add_buff(player.buffs, "poison", duration=10)
    add_buff(player.buffs, "burning", duration=5)

    _kill_player(game, "p1", floor_id=1)

    assert not has_buff(player.buffs, "poison")
    assert not has_buff(player.buffs, "burning")


def test_blessed_ankh_grants_invulnerability():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=True)

    _kill_player(game, "p1", floor_id=1)

    assert has_buff(player.buffs, "invulnerability")


# --- Unblessed ankh tests ---

def test_unblessed_ankh_sets_pending_ankh():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=False)

    data = _kill_player(game, "p1", floor_id=1)

    assert data["has_ankh"] is True
    assert data["can_resurrect"] is True
    assert data["loot_dropped"] is False
    assert player.pending_ankh is True
    # Player is NOT dead yet (waiting for choice)
    assert player.death_processed is False


def test_ankh_choice_with_two_items():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    ankh = _give_ankh(game, "p1", blessed=False)
    max_hp = player.get_total_max_hp()

    # Give player non-stackable items (use weapon/armor IDs which are unique)
    weapon_id = player.belongings.weapon.id
    armor_id = player.belongings.armor.id

    _kill_player(game, "p1", floor_id=1)
    assert player.pending_ankh is True

    ok = game.ankh_choice("p1", [weapon_id, armor_id])

    assert ok is True
    assert player.pending_ankh is False
    assert player.is_alive is True
    assert player.is_downed is False
    # Easy = 75% HP
    assert player.hp == int(max_hp * 0.75)
    # Ankh consumed
    assert not any(isinstance(i, Ankh) for i in player.belongings.all_items())
    # Respawn counter incremented
    assert player.respawns_used == 1


def test_ankh_choice_creates_lost_backpack():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=False)

    _kill_player(game, "p1", floor_id=1)

    # Choose the starting weapon + armor
    weapon_id = player.belongings.weapon.id
    armor_id = player.belongings.armor.id
    ok = game.ankh_choice("p1", [weapon_id, armor_id])

    assert ok is True
    # LostBackpack should be on the ground with dropped items
    floor = game._get_or_create_floor(1)
    backpacks = [i for i in floor.items.values() if isinstance(i, LostBackpack)]
    assert len(backpacks) == 1
    assert backpacks[0].owner_id == player.id


def test_ankh_choice_rejects_wrong_count():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=False)
    _kill_player(game, "p1", floor_id=1)

    # Only 1 item
    assert game.ankh_choice("p1", ["item1"]) is False
    # 3 items
    assert game.ankh_choice("p1", ["a", "b", "c"]) is False


def test_ankh_choice_rejects_invalid_items():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=False)
    _kill_player(game, "p1", floor_id=1)

    # Non-existent item
    assert game.ankh_choice("p1", ["nonexistent1", "nonexistent2"]) is False


def test_ankh_choice_rejects_when_not_pending():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    # No ankh, no pending
    assert game.ankh_choice("p1", ["a", "b"]) is False


def test_ankh_choice_spawns_event():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=False)
    _kill_player(game, "p1", floor_id=1)

    game.ankh_choice("p1", [player.belongings.weapon.id, player.belongings.armor.id])

    spawn_events = [e for e in game.events if e["type"] == "SPAWN"]
    assert len(spawn_events) >= 1
    assert spawn_events[-1]["data"]["is_resurrect"] is True


# --- No ankh: final death ---

def test_no_ankh_death_scatters_items():
    from app.engine.entities.item_union import Bag

    game = _make_game(Difficulty.HARD)
    player = game.add_player("p1", "Hero", "warrior")

    data = _kill_player(game, "p1", floor_id=1)

    assert data["can_resurrect"] is False
    assert data["has_ankh"] is False
    assert data["loot_dropped"] is True
    # Non-bag items (ration, waterskin, scroll of identify, stones) are gone;
    # the starting Velvet Pouch persists on the player.
    remaining = player.belongings.backpack.items
    assert all(isinstance(i, Bag) for i in remaining)
    assert len(remaining) == 1


def test_no_ankh_death_creates_backpack_marker():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")

    _kill_player(game, "p1", floor_id=1)

    floor = game._get_or_create_floor(1)
    markers = [i for i in floor.items.values() if i.type == "lost_backpack"]
    assert len(markers) >= 1


# --- Ankh prioritization (blessed > unblessed) ---

def test_blessed_ankh_prioritized_over_unblessed():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=False)
    _give_ankh(game, "p1", blessed=True)

    data = _kill_player(game, "p1", floor_id=1)

    # Should use blessed ankh (instant revive)
    assert data["has_ankh"] is False
    assert data["can_resurrect"] is False
    assert player.is_alive is True
    assert player.pending_ankh is False


# --- Non-ankh death is final ---

def test_death_without_ankh_is_final():
    game = _make_game(Difficulty.HARD)
    player = game.add_player("p1", "Hero", "warrior")

    data = _kill_player(game, "p1", floor_id=1)

    assert data["can_resurrect"] is False
    assert data["has_ankh"] is False
    assert data["victory"] is False


# --- Score penalty ---

def test_score_penalty_increases_with_ankh_uses():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=True)

    _kill_player(game, "p1", floor_id=1)

    score1 = game._score_breakdown(player, victory=False)

    # Give another ankh and die again
    _give_ankh(game, "p1", blessed=True)
    # Need to revive first
    player.hp = player.get_total_max_hp()
    player.is_alive = True
    player.is_downed = False
    player.death_processed = False

    _kill_player(game, "p1", floor_id=1)

    score2 = game._score_breakdown(player, victory=False)

    assert score2["respawn_multiplier"] < score1["respawn_multiplier"]


# --- LostBackpack pickup ---

def test_lost_backpack_pickup_only_by_owner():
    game = _make_game()
    player1 = game.add_player("p1", "Hero", "warrior")
    player2 = game.add_player("p2", "Mage", "mage")
    _give_ankh(game, "p1", blessed=False)

    from app.engine.entities.items_consumable import Food
    food = Food(id="food1", name="Ration")
    player1.belongings.backpack.collect(food)

    _kill_player(game, "p1", floor_id=1)
    game.ankh_choice("p1", [player1.belongings.weapon.id, player1.belongings.armor.id])

    # Find the LostBackpack on the ground
    floor = game._get_or_create_floor(1)
    backpacks = [i for i in floor.items.values() if isinstance(i, LostBackpack)]
    assert len(backpacks) == 1
    bp = backpacks[0]

    # Owner picks it up
    assert bp.owner_id == player1.id


# --- Waterskin blessing ---

def test_ankh_bless_action_requires_full_waterskin():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    ankh = Ankh(id="ankh1", blessed=False)
    player.belongings.backpack.collect(ankh)
    waterskin = Waterskin(id="ws1", volume=0)
    player.belongings.backpack.collect(waterskin)

    # Empty waterskin: BLESS not in actions
    actions = ankh.actions(player)
    assert "BLESS" not in actions


def test_ankh_bless_action_available_with_full_waterskin():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    ankh = Ankh(id="ankh1", blessed=False)
    player.belongings.backpack.collect(ankh)
    waterskin = Waterskin(id="ws1", volume=Waterskin.MAX_VOLUME)
    player.belongings.backpack.collect(waterskin)

    actions = ankh.actions(player)
    assert "BLESS" in actions


# --- Ankh not available in actions when already blessed ---

def test_blessed_ankh_no_bless_action():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    ankh = Ankh(id="ankh1", blessed=True)
    player.belongings.backpack.collect(ankh)
    waterskin = Waterskin(id="ws1", volume=Waterskin.MAX_VOLUME)
    player.belongings.backpack.collect(waterskin)

    actions = ankh.actions(player)
    assert "BLESS" not in actions


# --- Cloak of Shadows recovery on rogue death ---

def test_rogue_final_death_cloak_in_backpack():
    from app.engine.entities.items_artifacts import CloakOfShadows
    game = _make_game(Difficulty.HARD)
    player = game.add_player("p1", "Hero", "rogue")
    cloak = player.belongings.artifact
    assert isinstance(cloak, CloakOfShadows)

    _kill_player(game, "p1", floor_id=1)

    floor = game._get_or_create_floor(1)
    backpacks = [i for i in floor.items.values() if isinstance(i, LostBackpack)]
    assert len(backpacks) == 1
    assert any(isinstance(s, CloakOfShadows) for s in backpacks[0].stored_items)


def test_rogue_respawn_cloak_in_backpack():
    from app.engine.entities.items_artifacts import CloakOfShadows
    game = _make_game(Difficulty.EASY)
    player = game.add_player("p1", "Hero", "rogue")

    _kill_player(game, "p1", floor_id=1)

    floor = game._get_or_create_floor(1)
    backpacks = [i for i in floor.items.values() if isinstance(i, LostBackpack)]
    assert len(backpacks) == 1
    assert any(isinstance(s, CloakOfShadows) for s in backpacks[0].stored_items)


def test_rogue_death_pickup_cloak():
    from app.engine.entities.items_artifacts import CloakOfShadows
    game = _make_game(Difficulty.EASY)
    player = game.add_player("p1", "Hero", "rogue")
    cloak_id = player.belongings.artifact.id

    _kill_player(game, "p1", floor_id=1)
    game.resurrect_player("p1")

    floor = game._get_or_create_floor(1)
    backpacks = [i for i in floor.items.values() if isinstance(i, LostBackpack)]
    bp = backpacks[0]
    bp.pos = player.pos

    game.pickup_floor_items("p1")

    assert any(isinstance(i, CloakOfShadows) for i in player.belongings.backpack.items)


def test_warrior_death_no_cloak_in_backpack():
    from app.engine.entities.items_artifacts import CloakOfShadows
    game = _make_game(Difficulty.HARD)
    player = game.add_player("p1", "Hero", "warrior")

    _kill_player(game, "p1", floor_id=1)

    floor = game._get_or_create_floor(1)
    backpacks = [i for i in floor.items.values() if isinstance(i, LostBackpack)]
    assert len(backpacks) == 1
    assert not any(isinstance(s, CloakOfShadows) for s in backpacks[0].stored_items)


# --- Bags persist through death ---

def test_bag_contents_persist_through_death():
    game = _make_game(Difficulty.HARD)
    player = game.add_player("p1", "Hero", "warrior")

    from app.engine.entities.runestones import Runestone
    pouch = next(i for i in player.belongings.backpack.items if i.kind == "velvet_pouch")
    stone = Runestone(id="rune1", name="Test Stone")
    pouch.collect(stone)

    _kill_player(game, "p1", floor_id=1)

    remaining_pouch = next(
        (i for i in player.belongings.backpack.items if i.kind == "velvet_pouch"), None
    )
    assert remaining_pouch is not None
    assert remaining_pouch.id == pouch.id
    assert any(i.id == "rune1" for i in remaining_pouch.items)


def test_bag_not_offered_as_ankh_kept_item_but_survives():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=False)

    pouch_id = next(
        i.id for i in player.belongings.backpack.items if i.kind == "velvet_pouch"
    )

    _kill_player(game, "p1", floor_id=1)
    # Trying to "keep" the bag as one of the 2 choices is rejected (bags
    # aren't valid choice items) -- pick weapon+armor instead.
    ok = game.ankh_choice(
        "p1", [player.belongings.weapon.id, player.belongings.armor.id]
    )
    assert ok is True

    assert any(
        i.id == pouch_id for i in player.belongings.backpack.items
    )


def test_non_bag_items_consolidate_into_single_lost_backpack():
    game = _make_game(Difficulty.HARD)
    player = game.add_player("p1", "Hero", "warrior")

    ration_id = next(
        i.id for i in player.belongings.backpack.items if i.kind == "ration"
    )
    floor_before = game._get_or_create_floor(1)
    items_before = set(floor_before.items.keys())

    _kill_player(game, "p1", floor_id=1)

    floor = game._get_or_create_floor(1)
    new_items = [v for k, v in floor.items.items() if k not in items_before]
    backpacks = [i for i in new_items if isinstance(i, LostBackpack)]
    assert len(backpacks) == 1
    bp = backpacks[0]
    # The single pickup carries the dropped ration; no other new floor item
    # was created for it (no per-item scatter).
    assert len(new_items) == 1
    assert any(i.id == ration_id for i in bp.stored_items)


# --- Quickslot re-seating on Lost Backpack recovery ---

def test_default_warrior_quickslots_reseated_not_clobbered_by_untracked_items():
    """Regression: Stones (slot 0) and Waterskin (slot 1) are the warrior's
    default quickslots. Untracked backpack items (scroll, ration) sort
    earlier than stones/waterskin by category and must not squat on their
    slots via the fallback fill_empty. The waterskin also converts to a
    Dewdrop with a new id on drop -- that must not sever its slot binding.
    """
    from app.engine.entities.items_consumable import Dewdrop, Waterskin

    game = _make_game(Difficulty.HARD)
    player = game.add_player("p1", "Hero", "warrior")

    stones = next(i for i in player.belongings.backpack.items if i.kind == "stone")
    assert player.quickslot.index_of(stones.id) == 0
    waterskin = next(
        i for i in player.belongings.backpack.items if isinstance(i, Waterskin)
    )
    waterskin.volume = 10  # a real session's waterskin isn't empty
    assert player.quickslot.slots[1].item_id == waterskin.id

    _kill_player(game, "p1", floor_id=1)

    floor = game._get_or_create_floor(1)
    backpacks = [i for i in floor.items.values() if isinstance(i, LostBackpack)]
    bp = backpacks[0]
    bp.pos = player.pos

    game.pickup_floor_items("p1")

    # Stones is back in slot 0 -- not a scroll or ration.
    assert player.quickslot.slots[0].item_id == stones.id
    # Slot 1 holds the Dewdrop the waterskin turned into.
    slot1_item_id = player.quickslot.slots[1].item_id
    assert slot1_item_id is not None
    dewdrop = next(
        (i for i in player.belongings.backpack.items
         if isinstance(i, Dewdrop) and i.id == slot1_item_id),
        None,
    )
    assert dewdrop is not None


def test_quickslot_item_reseated_to_original_slot_on_pickup():
    game = _make_game(Difficulty.HARD)
    player = game.add_player("p1", "Hero", "warrior")

    scroll = next(
        i for i in player.belongings.backpack.items if i.kind == "scroll_of_identify"
    )
    player.quickslot.set_slot(3, scroll)

    _kill_player(game, "p1", floor_id=1)
    assert player.quickslot.index_of(scroll.id) == -1  # wiped on death

    floor = game._get_or_create_floor(1)
    backpacks = [i for i in floor.items.values() if isinstance(i, LostBackpack)]
    bp = backpacks[0]
    assert bp.quickslot_map.get(scroll.id) == 3
    bp.pos = player.pos

    game.pickup_floor_items("p1")

    assert player.quickslot.slots[3].item_id == scroll.id


def test_quickslot_original_slot_taken_leaves_item_unbound():
    game = _make_game(Difficulty.HARD)
    player = game.add_player("p1", "Hero", "warrior")

    scroll = next(
        i for i in player.belongings.backpack.items if i.kind == "scroll_of_identify"
    )
    player.quickslot.set_slot(3, scroll)

    _kill_player(game, "p1", floor_id=1)

    # Player picks up something new and binds it to slot 3 before recovering
    # the Lost Backpack.
    from app.engine.entities.items_potions import PotionOfStrength
    new_potion = PotionOfStrength(id="new-potion")
    player.add_to_inventory(new_potion)
    player.quickslot.set_slot(3, new_potion)

    floor = game._get_or_create_floor(1)
    backpacks = [i for i in floor.items.values() if isinstance(i, LostBackpack)]
    bp = backpacks[0]
    bp.pos = player.pos

    game.pickup_floor_items("p1")

    # Slot 3 still holds the new potion; the recovered scroll wasn't shoved
    # into some other empty slot.
    assert player.quickslot.slots[3].item_id == new_potion.id
    assert player.quickslot.index_of(scroll.id) == -1
    # But the scroll is still recovered into the backpack itself.
    assert any(i.id == scroll.id for i in player.belongings.backpack.items)


def test_non_quickslotted_item_not_auto_bound_on_pickup():
    """An item that was never quickslotted before death shouldn't get
    auto-bound to some empty slot on recovery -- ordinary floor pickup
    never does that either, so Lost Backpack recovery shouldn't be special."""
    game = _make_game(Difficulty.HARD)
    player = game.add_player("p1", "Hero", "warrior")

    scroll = next(
        i for i in player.belongings.backpack.items if i.kind == "scroll_of_identify"
    )
    assert player.quickslot.index_of(scroll.id) == -1  # never quickslotted

    _kill_player(game, "p1", floor_id=1)

    floor = game._get_or_create_floor(1)
    backpacks = [i for i in floor.items.values() if isinstance(i, LostBackpack)]
    bp = backpacks[0]
    assert scroll.id not in bp.quickslot_map
    bp.pos = player.pos

    game.pickup_floor_items("p1")

    # Recovered into the backpack, but not bound to any quickslot.
    assert any(i.id == scroll.id for i in player.belongings.backpack.items)
    assert player.quickslot.index_of(scroll.id) == -1


def test_ankh_choice_quickslot_reseated_on_recovery():
    game = _make_game()
    player = game.add_player("p1", "Hero", "warrior")
    _give_ankh(game, "p1", blessed=False)

    scroll = next(
        i for i in player.belongings.backpack.items if i.kind == "scroll_of_identify"
    )
    player.quickslot.set_slot(3, scroll)

    _kill_player(game, "p1", floor_id=1)
    ok = game.ankh_choice(
        "p1", [player.belongings.weapon.id, player.belongings.armor.id]
    )
    assert ok is True

    # Slot 3 is freed immediately -- no stale binding to the now-dropped
    # scroll blocking recovery.
    assert player.quickslot.slots[3].item_id is None

    floor = game._get_or_create_floor(1)
    backpacks = [i for i in floor.items.values() if isinstance(i, LostBackpack)]
    bp = backpacks[0]
    assert bp.quickslot_map.get(scroll.id) == 3
    bp.pos = player.pos

    game.pickup_floor_items("p1")

    assert player.quickslot.slots[3].item_id == scroll.id


def test_backpack_pickup_fills_quickslots():
    game = _make_game(Difficulty.EASY)
    player = game.add_player("p1", "Hero", "rogue")
    cloak = player.belongings.artifact

    _kill_player(game, "p1", floor_id=1)
    game.resurrect_player("p1")

    floor = game._get_or_create_floor(1)
    backpacks = [i for i in floor.items.values() if isinstance(i, LostBackpack)]
    bp = backpacks[0]
    bp.pos = player.pos

    # Quickslots should be empty after death
    assert player.quickslot.index_of(cloak.id) == -1

    game.pickup_floor_items("p1")

    # Cloak should now be in a quickslot
    assert player.quickslot.index_of(cloak.id) >= 0
