from app.engine.manager import GameInstance
from app.engine.entities.base import Position
from app.engine.entities.player import Mob as MobEntity


def _two_player_game():
    """Killer ('p') plus ally ('p2') on floor 1, with a one-shot weapon."""
    game = GameInstance("xp-share-test")
    game.mobs = {}
    killer = game.add_player("p", "Killer")
    ally = game.add_player("p2", "Ally")
    killer.pos = Position(x=1, y=1)
    ally.pos = Position(x=3, y=1)
    from app.engine.entities.items.equip import KindOfWeapon
    killer.belongings.weapon = KindOfWeapon(
        id="big_sword", name="Big Sword", damage=50,
        strength_requirement=10, attack_cooldown=0.0,
    )
    killer.attack_skill = 100
    return game, killer, ally


def _spawn_and_kill(game, killer, mob_exp):
    mob = MobEntity(id="m", name="Rat", pos=Position(x=2, y=1),
                    hp=1, max_hp=1, attack=1, defense=0, defense_skill=0,
                    dr_min=0, dr_max=0, exp=mob_exp)
    game.mobs["m"] = mob
    game.move_entity(killer.id, 1, 0)
    return mob


def test_killer_gets_full_exp_ally_gets_half():
    game, killer, ally = _two_player_game()
    _spawn_and_kill(game, killer, mob_exp=4)
    assert killer.experience == 4
    assert ally.experience == 2


def test_half_share_rounds_up():
    game, killer, ally = _two_player_game()
    _spawn_and_kill(game, killer, mob_exp=5)
    assert killer.experience == 5
    assert ally.experience == 3


def test_player_on_other_floor_gets_nothing():
    game, killer, ally = _two_player_game()
    ally.floor_id = 2
    _spawn_and_kill(game, killer, mob_exp=6)
    assert killer.experience == 6
    assert ally.experience == 0


def test_dead_player_on_same_floor_gets_nothing():
    game, killer, ally = _two_player_game()
    ally.is_alive = False
    _spawn_and_kill(game, killer, mob_exp=6)
    assert killer.experience == 6
    assert ally.experience == 0


def test_shared_xp_level_up_emits_event_for_ally():
    game, killer, ally = _two_player_game()
    ally.experience = 9  # maxExp(1) == 10; needs 1 more
    _spawn_and_kill(game, killer, mob_exp=2)  # ally share = ceil(2/2) = 1
    assert ally.level == 2
    assert any(e["type"] == "LEVEL_UP" and e["data"]["player"] == ally.id
               for e in game.events)
    assert killer.experience == 2


def test_solo_kill_unchanged():
    game = GameInstance("xp-solo-test")
    game.mobs = {}
    killer = game.add_player("p", "Tester")
    killer.pos = Position(x=1, y=1)
    from app.engine.entities.items.equip import KindOfWeapon
    killer.belongings.weapon = KindOfWeapon(
        id="big_sword", name="Big Sword", damage=50,
        strength_requirement=10, attack_cooldown=0.0,
    )
    killer.attack_skill = 100
    mob = MobEntity(id="m", name="Rat", pos=Position(x=2, y=1),
                    hp=1, max_hp=1, attack=1, defense=0, defense_skill=0,
                    dr_min=0, dr_max=0, exp=3)
    game.mobs["m"] = mob
    game.move_entity("p", 1, 0)
    assert killer.experience == 3
