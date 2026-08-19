"""SPD-faithful mage talents: Back Up Barrier, Empowering/Energizing Meal,
Inscribed Power, Lingering Magic."""
from app.engine.entities.base import Position
from app.engine.entities.items.actions import action_read
from app.engine.entities.items.consumables import Food
from app.engine.entities.items.potions import HealthPotion
from app.engine.entities.items.scrolls import Scroll
from app.engine.entities.mobs import Rat
from app.engine.entities.player import CharacterClass
from app.engine.entities.talent_enum import Talent
from app.engine.manager import GameInstance


def _mage_game():
    game = GameInstance("test-mage")
    player = game.add_player("p1", "T", CharacterClass.MAGE)
    floor = game._get_or_create_floor(player.floor_id)
    player.pos = Position(x=18, y=2)
    player.last_attack_time = 0.0
    mob = Rat(id="m1", pos=Position(x=20, y=4), hp=50, max_hp=50, defense_skill=0)
    floor.mobs["m1"] = mob
    game.mobs["m1"] = mob
    return game, player, mob


def _zap_staff(game, player, target_x=20, target_y=4):
    player.last_attack_time = 0.0
    staff = player.belongings.weapon
    game.perform_ranged_attack(player.id, staff.id, target_x, target_y)


# --- Back Up Barrier --------------------------------------------------------
def test_backup_barrier_grants_undecaying_shield_when_staff_empties():
    game, player, mob = _mage_game()
    player.talent_info.talents[Talent.BACKUP_BARRIER] = 1
    wand = player.belongings.weapon.imbued_wand
    wand.charges = 1
    _zap_staff(game, player)
    shield = player.get_shield("backup_barrier")
    assert shield is not None
    assert shield.amount == 3
    assert shield.decay == 0
    assert wand.charges == 0


def test_backup_barrier_amount_scales_with_level():
    game, player, mob = _mage_game()
    player.talent_info.talents[Talent.BACKUP_BARRIER] = 2
    player.belongings.weapon.imbued_wand.charges = 1
    _zap_staff(game, player)
    assert player.get_shield("backup_barrier").amount == 5


def test_backup_barrier_not_granted_by_potions():
    game, player, mob = _mage_game()
    player.talent_info.talents[Talent.BACKUP_BARRIER] = 1
    game.on_potion_drunk(player, HealthPotion(id="hp"))
    assert player.get_shield("backup_barrier") is None


def test_backup_barrier_requires_wand_about_to_empty():
    game, player, mob = _mage_game()
    player.talent_info.talents[Talent.BACKUP_BARRIER] = 1
    player.belongings.weapon.imbued_wand.charges = 2
    _zap_staff(game, player)
    assert player.get_shield("backup_barrier") is None


# --- Empowering Meal --------------------------------------------------------
def test_empowering_meal_grants_wand_empower_consumed_per_damage_zap():
    game, player, mob = _mage_game()
    player.talent_info.talents[Talent.EMPOWERING_MEAL] = 1
    game.on_food_eaten(player, Food(id="f1", name="Food"))
    buff = player.get_buff("wand_empower")
    assert buff is not None
    assert buff.level == 3
    wand = player.belongings.weapon.imbued_wand
    wand.charges = 3
    _zap_staff(game, player)
    assert player.get_buff("wand_empower").level == 2
    _zap_staff(game, player)
    _zap_staff(game, player)
    assert player.get_buff("wand_empower") is None


# --- Energizing Meal --------------------------------------------------------
def test_energizing_meal_grants_recharging_buff():
    game, player, mob = _mage_game()
    player.talent_info.talents[Talent.ENERGIZING_MEAL] = 1
    game.on_food_eaten(player, Food(id="f1", name="Food"))
    buff = player.get_buff("recharging")
    assert buff is not None
    assert buff.remaining == 5.0


# --- Inscribed Power --------------------------------------------------------
def test_inscribed_power_empowers_one_zap_then_consumes():
    game, player, mob = _mage_game()
    player.talent_info.talents[Talent.INSCRIBED_POWER] = 1
    scroll = Scroll(id="s1", name="Scroll")
    player.add_to_inventory(scroll)
    action_read(game, player, scroll)
    buff = player.get_buff("scroll_empower")
    assert buff is not None
    assert buff.level == 2
    wand = player.belongings.weapon.imbued_wand
    wand.charges = 3
    _zap_staff(game, player)
    _zap_staff(game, player)
    assert player.get_buff("scroll_empower") is None
    assert getattr(wand, "_empower_bonus", 0) == 0


# --- Lingering Magic --------------------------------------------------------
def test_lingering_magic_boosts_next_melee():
    game, player, mob = _mage_game()
    player.talent_info.talents[Talent.LINGERING_MAGIC] = 1
    player.belongings.weapon.imbued_wand.charges = 2
    _zap_staff(game, player)
    tracker = player.get_buff("lingering_magic_tracker")
    assert tracker is not None
    mob.pos = Position(x=19, y=2)
    player.pos = Position(x=18, y=2)
    player.last_attack_time = 0.0
    hp_before = mob.hp
    game.attack_mob(player.id, "m1")
    assert mob.hp < hp_before  # melee landed
    assert player.get_buff("lingering_magic_tracker") is None
