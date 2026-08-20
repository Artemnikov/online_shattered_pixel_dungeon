from typing import Dict, Optional

from app.engine.entities.talent_enum import Subclass, Talent


# Maps talent name → (max_points, tier, subclass_required_or_None)
CLERIC_TALENT_DEFS: Dict[str, tuple[int, int, Optional[str]]] = {
    Talent.SCEPTER_MASTERY: (2, 1, None),
    Talent.RELIC_MASTERY: (2, 1, None),
    Talent.HOLINESS: (2, 1, None),
    Talent.AFFILIATION: (2, 1, None),
    Talent.TESTED_METTLE: (2, 2, None),
    Talent.TOME_OF_DIVINITY: (2, 2, None),
    Talent.SHARED_ARMAMENTS: (2, 2, None),
    Talent.SPIRITUAL_GRACE: (2, 2, None),
    Talent.DIVINE_INTERVENTION: (3, 3, None),
    Talent.DIVINE_SHIELD: (3, 3, None),
    Talent.RADIANCE: (3, 3, Subclass.PRIEST),
    Talent.PRIEST_EMPOWERED_STRIKE: (3, 3, Subclass.PRIEST),
    Talent.SMITE: (3, 3, Subclass.PRIEST),
    Talent.SHIELD_OF_LIGHT: (3, 3, Subclass.PALADIN),
    Talent.HOLY_ARMOR: (3, 3, Subclass.PALADIN),
    Talent.UNDYING_FAITH: (3, 3, Subclass.PALADIN),
    Talent.ASCENDED_FORM_ABILITY: (1, 3, None),
    Talent.TRINITY_ABILITY: (1, 3, None),
    Talent.POWER_OF_MANY_ABILITY: (1, 3, None),
    Talent.EMPOWERED_ASCENSION: (4, 4, None),
    Talent.RADIANT_ASCENSION: (4, 4, None),
    Talent.HEALING_ASCENSION: (4, 4, None),
    Talent.TRINITARIAN_TRINITY: (4, 4, None),
    Talent.HOLY_TRINITY: (4, 4, None),
    Talent.DEEP_ROOTS_TRINITY: (4, 4, None),
    Talent.GREATER_POWER: (4, 4, None),
    Talent.PERSISTENT_ALLIES: (4, 4, None),
    Talent.LIGHT_WARRIOR: (4, 4, None),
}

CLERIC_TALENT_CLASS_REQ: Dict[str, str] = {
    Talent.SCEPTER_MASTERY: "cleric", Talent.RELIC_MASTERY: "cleric",
    Talent.HOLINESS: "cleric", Talent.AFFILIATION: "cleric",
    Talent.TESTED_METTLE: "cleric", Talent.TOME_OF_DIVINITY: "cleric",
    Talent.SHARED_ARMAMENTS: "cleric", Talent.SPIRITUAL_GRACE: "cleric",
    Talent.DIVINE_INTERVENTION: "cleric", Talent.DIVINE_SHIELD: "cleric",
    Talent.RADIANCE: "cleric", Talent.PRIEST_EMPOWERED_STRIKE: "cleric", Talent.SMITE: "cleric",
    Talent.SHIELD_OF_LIGHT: "cleric", Talent.HOLY_ARMOR: "cleric", Talent.UNDYING_FAITH: "cleric",
    Talent.ASCENDED_FORM_ABILITY: "cleric", Talent.TRINITY_ABILITY: "cleric", Talent.POWER_OF_MANY_ABILITY: "cleric",
    Talent.EMPOWERED_ASCENSION: "cleric", Talent.RADIANT_ASCENSION: "cleric", Talent.HEALING_ASCENSION: "cleric",
    Talent.TRINITARIAN_TRINITY: "cleric", Talent.HOLY_TRINITY: "cleric", Talent.DEEP_ROOTS_TRINITY: "cleric",
    Talent.GREATER_POWER: "cleric", Talent.PERSISTENT_ALLIES: "cleric", Talent.LIGHT_WARRIOR: "cleric",
}

# Cleric talent tree is unfinished — no titles/descriptions yet.
CLERIC_TALENT_TITLES: Dict[str, str] = {}
CLERIC_TALENT_DESCRIPTIONS: Dict[str, str] = {}
