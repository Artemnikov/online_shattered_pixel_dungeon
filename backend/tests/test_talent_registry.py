import pytest
from app.engine.manager import GameInstance
from app.engine.entities.talent_enum import Talent
from app.engine.talents.registry import TalentEffectRegistry, StatModifiers, registry, MODIFIERS


def _make_game(seed="1"):
    return GameInstance(game_id="test_game", seed=seed)


def _make_player(game, class_name="warrior", pid="p1"):
    return game.add_player(pid, "Hero", class_name)


def test_registry_dispatch_only_runs_for_owned_talents():
    game = _make_game()
    player = _make_player(game)
    test_reg = TalentEffectRegistry()
    calls = []

    @test_reg.on("test_trigger", "talent_a")
    def handle_a(ctx, level):
        calls.append(("a", level))

    @test_reg.on("test_trigger", "talent_b")
    def handle_b(ctx, level):
        calls.append(("b", level))

    player.subclass_info.talent_info.talents["talent_a"] = 2
    player.subclass_info.talent_info.talents["talent_b"] = 0

    test_reg.dispatch("test_trigger", player, game)
    assert calls == [("a", 2)]


def test_stat_modifiers_fold_active_modifiers():
    game = _make_game()
    player = _make_player(game)
    test_mods = StatModifiers()

    @test_mods.register("str", "talent_str1")
    def add_two(player, base, level):
        return base + 2 * level

    @test_mods.register("str", "talent_str2")
    def mult_two(player, base, level):
        return base * level

    player.subclass_info.talent_info.talents["talent_str1"] = 3
    player.subclass_info.talent_info.talents["talent_str2"] = 2

    res = test_mods.apply("str", player, 10)
    assert res == 32


def test_passive_stats_strongman_modifier():
    game = _make_game()
    player = _make_player(game)
    player.strength = 10
    player.subclass_info.talent_info.talents[Talent.STRONGMAN] = 2

    eff_str = MODIFIERS.apply("strength", player, player.strength)
    assert eff_str == 11


def test_passive_stats_farsight_modifier():
    game = _make_game()
    player = _make_player(game)
    player.view_distance = 6
    player.subclass_info.talent_info.talents[Talent.FARSIGHT] = 2

    eff_vd = MODIFIERS.apply("view_distance", player, player.view_distance)
    assert eff_vd == 10


def test_speedy_stealth_speed_modifier():
    game = _make_game()
    player = _make_player(game)
    player.subclass_info.talent_info.talents[Talent.SPEEDY_STEALTH] = 3
    player.invisible = 5

    speed = MODIFIERS.apply("movement_speed", player, 1.0)
    assert speed == 2.0

    player.invisible = 0
    speed_normal = MODIFIERS.apply("movement_speed", player, 1.0)
    assert speed_normal == 1.0


def test_speedy_stealth_momentum_trigger():
    game = _make_game()
    player = _make_player(game, "rogue")
    player.subclass_info.talent_info.talents[Talent.SPEEDY_STEALTH] = 1
    player.invisible = 5
    player.momentum_stacks = 0

    registry.dispatch("tick_rogue_momentum", player, game)
    assert player.momentum_stacks == 2


def test_hearty_meal_eat_trigger():
    game = _make_game()
    player = _make_player(game)
    player.max_hp = 30
    player.hp = 5
    player.subclass_info.talent_info.talents[Talent.HEARTY_MEAL] = 2

    registry.dispatch("on_eat", player, game)
    assert player.hp == 11


def test_liquid_willpower_potion_trigger():
    game = _make_game()
    player = _make_player(game)
    player.max_hp = 100
    player.hp = 100
    player.subclass_info.talent_info.talents[Talent.LIQUID_WILLPOWER] = 2

    registry.dispatch("on_potion", player, game)
    assert player.get_total_shield() == 10
