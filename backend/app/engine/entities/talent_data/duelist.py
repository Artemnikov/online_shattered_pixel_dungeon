from typing import Dict, Optional

from app.engine.entities.talent_enum import Subclass, Talent


# Maps talent name → (max_points, tier, subclass_required_or_None)
DUELIST_TALENT_DEFS: Dict[str, tuple[int, int, Optional[str]]] = {
    Talent.AGGRESSIVE_APPROACH: (2, 1, None),
    Talent.LIGHTWEIGHT_COMBAT: (2, 1, None),
    Talent.DUELIST_LETHAL_MOMENTUM: (2, 1, None),
    Talent.STICK_AND_MOVE: (2, 1, None),
    Talent.DUAL_STRIKE: (2, 2, None),
    Talent.CIRCLE_OF_SLAUGHTER: (2, 2, None),
    Talent.FINISHER: (2, 2, None),
    Talent.FEROCITY: (2, 2, None),
    Talent.CHARGED_ATTACK: (3, 3, None),
    Talent.SWIFT_EQUIP: (3, 3, None),
    Talent.CHAMPION_POWER: (3, 3, Subclass.CHAMPION),
    Talent.CHAMPION_ENDURANCE: (3, 3, Subclass.CHAMPION),
    Talent.CHAMPION_REACH: (3, 3, Subclass.CHAMPION),
    Talent.MONASTIC_VIGOR: (3, 3, Subclass.MONK),
    Talent.MONKS_SPIRIT: (3, 3, Subclass.MONK),
    Talent.UNENCUMBERED_SPIRIT: (3, 3, Subclass.MONK),
    Talent.CHALLENGE_ABILITY: (1, 3, None),
    Talent.ELEMENTAL_STRIKE_ABILITY: (1, 3, None),
    Talent.FEINT_ABILITY: (1, 3, None),
    Talent.LASTING_CHALLENGE: (4, 4, None),
    Talent.HEIGHTENED_CHALLENGE: (4, 4, None),
    Talent.DUAL_CHALLENGE: (4, 4, None),
    Talent.SEARING_STRIKE: (4, 4, None),
    Talent.CHILLING_STRIKE: (4, 4, None),
    Talent.CHARGED_STRIKE: (4, 4, None),
    Talent.SHADOW_FEINT: (4, 4, None),
    Talent.REACTIVE_FEINT: (4, 4, None),
    Talent.PHANTASMAL_FEINT: (4, 4, None),
}

DUELIST_TALENT_CLASS_REQ: Dict[str, str] = {
    Talent.AGGRESSIVE_APPROACH: "duelist", Talent.LIGHTWEIGHT_COMBAT: "duelist",
    Talent.DUELIST_LETHAL_MOMENTUM: "duelist", Talent.STICK_AND_MOVE: "duelist",
    Talent.DUAL_STRIKE: "duelist", Talent.CIRCLE_OF_SLAUGHTER: "duelist",
    Talent.FINISHER: "duelist", Talent.FEROCITY: "duelist",
    Talent.CHARGED_ATTACK: "duelist", Talent.SWIFT_EQUIP: "duelist",
    Talent.CHAMPION_POWER: "duelist", Talent.CHAMPION_ENDURANCE: "duelist", Talent.CHAMPION_REACH: "duelist",
    Talent.MONASTIC_VIGOR: "duelist", Talent.MONKS_SPIRIT: "duelist", Talent.UNENCUMBERED_SPIRIT: "duelist",
    Talent.CHALLENGE_ABILITY: "duelist", Talent.ELEMENTAL_STRIKE_ABILITY: "duelist", Talent.FEINT_ABILITY: "duelist",
    Talent.LASTING_CHALLENGE: "duelist", Talent.HEIGHTENED_CHALLENGE: "duelist", Talent.DUAL_CHALLENGE: "duelist",
    Talent.SEARING_STRIKE: "duelist", Talent.CHILLING_STRIKE: "duelist", Talent.CHARGED_STRIKE: "duelist",
    Talent.SHADOW_FEINT: "duelist", Talent.REACTIVE_FEINT: "duelist", Talent.PHANTASMAL_FEINT: "duelist",
}

# Duelist talent tree is unfinished — no titles/descriptions yet.
DUELIST_TALENT_TITLES: Dict[str, str] = {}
DUELIST_TALENT_DESCRIPTIONS: Dict[str, str] = {}
