# Copyright (C) 2026 ArtemNikov
#
"""Per-run potion/scroll appearance must always resolve to a real sprite cell.

Regression for the 12-slot appearance-pool overflow: the remake has more potion
and scroll kinds than the 12 scrambled colour/rune slots per row, so kinds past
#12 used to overflow into empty cells (blank slots) or other items' cells
(ARCANE_RESIN / LIQUID_METAL). Exotic kinds must share their base kind's column
and render on the exotic row (SPD ExoticScroll: image = handler.image(base)+16).
"""

import pytest

from app.engine.alchemy.recipes import POTION_TO_EXOTIC, SCROLL_TO_EXOTIC
from app.engine.entities.base import Position
from app.engine.entities.item_catalog import _CATALOG
from app.engine.entities.player import Player
from app.engine.manager import GameInstance


def _type_of(kind: str) -> str:
    return "scroll" if kind.startswith("scroll") else "potion"


def _all_kinds() -> set:
    kinds = {k for k, _n, cat, _f in _CATALOG if cat in ("potion", "scroll")}
    for reg, exo in {**POTION_TO_EXOTIC, **SCROLL_TO_EXOTIC}.items():
        kinds.add(exo.model_fields["kind"].default)
    return kinds


@pytest.fixture
def g() -> GameInstance:
    g = GameInstance("test-appearance")
    g.mobs = {}
    p = Player(id="p1", name="T", pos=Position(x=1, y=1), hp=20, max_hp=20)
    g.players["p1"] = p
    p.floor_id = 1
    return g


def test_all_kinds_map_to_valid_sprite_cells(g):
    exo_map = g._EXOTIC_TO_BASE_KIND
    for kind in sorted(_all_kinds()):
        if kind in ("elixir_aqua_rejuv", "potion"):
            continue  # elixirs/brews never get appearance; "potion" is the masked generic kind
        typ = _type_of(kind)
        a = g._appearance_for(kind, typ)
        assert 0 <= a["col"] <= 11, f"{kind} col {a['col']} out of range"
        if kind in exo_map:
            assert a["row"] == (20 if typ == "scroll" else 23), f"{kind} not on exotic row: {a}"
        else:
            assert a["row"] == (19 if typ == "scroll" else 22), f"{kind} not on standard row: {a}"


def test_exotic_shares_base_column(g):
    for reg, exo in {**POTION_TO_EXOTIC, **SCROLL_TO_EXOTIC}.items():
        reg_kind = reg.model_fields["kind"].default
        exo_kind = exo.model_fields["kind"].default
        typ = _type_of(reg_kind)
        base = g._appearance_for(reg_kind, typ)
        exo = g._appearance_for(exo_kind, typ)
        assert exo["col"] == base["col"], f"{exo_kind} != {reg_kind} column"
        assert exo["row"] == base["row"] + 1, f"{exo_kind} not one row below {reg_kind}"


def test_enchantment_variants_share_upgrade_rune(g):
    upgrade = g._appearance_for("scroll_of_upgrade", "scroll")
    for kind in ("scroll_of_enchantment", "scroll_of_exotic_enchantment"):
        a = g._appearance_for(kind, "scroll")
        assert a["col"] == upgrade["col"], f"{kind} should share the upgrade rune"
        assert a["row"] == 20


def test_reviving_and_fury_pinned_colours(g):
    # Remake-only potions with no SPD sprite slot: fixed colours, so they must
    # not move even after the whole 12-slot pool is consumed by other kinds.
    for kind in ("reviving_potion", "fury_potion"):
        before = g._appearance_for(kind, "potion")
        for other in ("health_potion", "potion_of_strength", "potion_of_mind_vision",
                      "potion_of_frost", "potion_of_liquid_flame", "potion_of_toxic_gas",
                      "potion_of_haste", "potion_of_invisibility", "potion_of_levitation",
                      "potion_of_paralytic_gas", "potion_of_purity", "potion_of_experience"):
            g._appearance_for(other, "potion")
        assert g._appearance_for(kind, "potion") == before


def test_generic_kind_gets_no_appearance_or_scramble(g):
    # The debug "Potion" (kind == type) has no subtype to scramble; giving it an
    # appearance would consume a 13th pool slot and overflow to a blank cell.
    d = {"type": "potion", "kind": "potion", "name": "Potion", "quantity": 1}
    g._mask_item_dict(d)
    assert "appearance" not in d
    assert d["name"] == "Potion"
    assert d["kind"] == "potion"
    # And it must never consume a pool slot: the 12 real potion kinds still get
    # all 12 valid columns even after the generic one passes through.
    g._mask_item_dict({"type": "potion", "kind": "potion", "name": "Potion"})
    cols = {g._appearance_for(k, "potion")["col"] for k in (
        "health_potion", "potion_of_strength", "potion_of_mind_vision",
        "potion_of_frost", "potion_of_liquid_flame", "potion_of_toxic_gas",
        "potion_of_haste", "potion_of_invisibility", "potion_of_levitation",
        "potion_of_paralytic_gas", "potion_of_purity", "potion_of_experience")}
    assert cols == set(range(12))
