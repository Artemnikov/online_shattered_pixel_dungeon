from typing import Dict, Optional

from app.engine.entities.talent_enum import Subclass, Talent


# Maps talent name → (max_points, tier, subclass_required_or_None)
HUNTRESS_TALENT_DEFS: Dict[str, tuple[int, int, Optional[str]]] = {
    # Tier 1
    Talent.NATURES_BOUNTY: (2, 1, None),
    Talent.SURVIVALISTS_INTUITION: (2, 1, None),
    Talent.FOLLOWUP_STRIKE: (2, 1, None),
    Talent.NATURES_AID: (2, 1, None),
    # Tier 2
    Talent.INVIGORATING_MEAL: (2, 2, None),
    Talent.LIQUID_NATURE: (2, 2, None),
    Talent.REJUVENATING_STEPS: (2, 2, None),
    Talent.HEIGHTENED_SENSES: (2, 2, None),
    Talent.DURABLE_PROJECTILES: (2, 2, None),
    # Tier 3 — class
    Talent.POINT_BLANK: (3, 3, None),
    Talent.SEER_SHOT: (3, 3, None),
    # Tier 3 — Sniper
    Talent.FARSIGHT: (3, 3, Subclass.SNIPER),
    Talent.SHARED_ENCHANTMENT: (3, 3, Subclass.SNIPER),
    Talent.SHARED_UPGRADES: (3, 3, Subclass.SNIPER),
    # Tier 3 — Warden
    Talent.DURABLE_TIPS: (3, 3, Subclass.WARDEN),
    Talent.BARKSKIN: (3, 3, Subclass.WARDEN),
    Talent.SHIELDING_DEW: (3, 3, Subclass.WARDEN),
    # Tier 3 — armor ability selection
    Talent.SPECTRAL_BLADES_ABILITY: (1, 3, None),
    Talent.NATURES_POWER_ABILITY: (1, 3, None),
    Talent.SPIRIT_HAWK_ABILITY: (1, 3, None),
    # Tier 4 — Spectral Blades
    Talent.FAN_OF_BLADES: (4, 4, None),
    Talent.PROJECTING_BLADES: (4, 4, None),
    Talent.SPIRIT_BLADES: (4, 4, None),
    # Tier 4 — Natures Power
    Talent.GROWING_POWER: (4, 4, None),
    Talent.NATURES_WRATH: (4, 4, None),
    Talent.WILD_MOMENTUM: (4, 4, None),
    # Tier 4 — Spirit Hawk
    Talent.EAGLE_EYE: (4, 4, None),
    Talent.GO_FOR_THE_EYES: (4, 4, None),
    Talent.SWIFT_SPIRIT: (4, 4, None),
}

HUNTRESS_TALENT_CLASS_REQ: Dict[str, str] = {
    Talent.NATURES_BOUNTY: "huntress", Talent.SURVIVALISTS_INTUITION: "huntress",
    Talent.FOLLOWUP_STRIKE: "huntress", Talent.NATURES_AID: "huntress",
    Talent.INVIGORATING_MEAL: "huntress", Talent.LIQUID_NATURE: "huntress",
    Talent.REJUVENATING_STEPS: "huntress", Talent.HEIGHTENED_SENSES: "huntress", Talent.DURABLE_PROJECTILES: "huntress",
    Talent.POINT_BLANK: "huntress", Talent.SEER_SHOT: "huntress",
    Talent.SPECTRAL_BLADES_ABILITY: "huntress", Talent.NATURES_POWER_ABILITY: "huntress", Talent.SPIRIT_HAWK_ABILITY: "huntress",
    Talent.FAN_OF_BLADES: "huntress", Talent.PROJECTING_BLADES: "huntress", Talent.SPIRIT_BLADES: "huntress",
    Talent.GROWING_POWER: "huntress", Talent.NATURES_WRATH: "huntress", Talent.WILD_MOMENTUM: "huntress",
    Talent.EAGLE_EYE: "huntress", Talent.GO_FOR_THE_EYES: "huntress", Talent.SWIFT_SPIRIT: "huntress",
}

HUNTRESS_TALENT_TITLES: Dict[str, str] = {
    Talent.NATURES_BOUNTY: "Nature's Bounty",
    Talent.SURVIVALISTS_INTUITION: "Survivalist's Intuition",
    Talent.FOLLOWUP_STRIKE: "Followup Strike",
    Talent.NATURES_AID: "Nature's Aid",
    Talent.INVIGORATING_MEAL: "Invigorating Meal",
    Talent.LIQUID_NATURE: "Liquid Nature",
    Talent.REJUVENATING_STEPS: "Rejuvenating Steps",
    Talent.HEIGHTENED_SENSES: "Heightened Senses",
    Talent.DURABLE_PROJECTILES: "Durable Projectiles",
    Talent.POINT_BLANK: "Point Blank",
    Talent.SEER_SHOT: "Seer Shot",
    Talent.FARSIGHT: "Farsight",
    Talent.SHARED_ENCHANTMENT: "Shared Enchantment",
    Talent.SHARED_UPGRADES: "Shared Upgrades",
    Talent.DURABLE_TIPS: "Durable Tips",
    Talent.BARKSKIN: "Barkskin",
    Talent.SHIELDING_DEW: "Shielding Dew",
    Talent.SPECTRAL_BLADES_ABILITY: "Spectral Blades",
    Talent.NATURES_POWER_ABILITY: "Nature's Power",
    Talent.SPIRIT_HAWK_ABILITY: "Spirit Hawk",
    Talent.FAN_OF_BLADES: "Fan of Blades",
    Talent.PROJECTING_BLADES: "Projecting Blades",
    Talent.SPIRIT_BLADES: "Spirit Blades",
    Talent.GROWING_POWER: "Growing Power",
    Talent.NATURES_WRATH: "Nature's Wrath",
    Talent.WILD_MOMENTUM: "Wild Momentum",
    Talent.EAGLE_EYE: "Eagle Eye",
    Talent.GO_FOR_THE_EYES: "Go for the Eyes",
    Talent.SWIFT_SPIRIT: "Swift Spirit",
}

HUNTRESS_TALENT_DESCRIPTIONS: Dict[str, str] = {
    Talent.NATURES_BOUNTY: "More dew drops and seeds from plants.",
    Talent.SURVIVALISTS_INTUITION: "Identify plants more easily.",
    Talent.FOLLOWUP_STRIKE: "Hitting with a ranged weapon boosts follow-up melee damage.",
    Talent.NATURES_AID: "Dew drops heal for more HP.",
    Talent.INVIGORATING_MEAL: "Eating food grants a speed boost.",
    Talent.LIQUID_NATURE: "Standing in water heals additional HP.",
    Talent.REJUVENATING_STEPS: "Walking on grass gradually heals.",
    Talent.HEIGHTENED_SENSES: "See hidden doors and traps more easily.",
    Talent.DURABLE_PROJECTILES: "Thrown weapons have a chance not to break.",
    Talent.POINT_BLANK: "Ranged weapons deal more damage at close range.",
    Talent.SEER_SHOT: "Hitting an enemy with a ranged attack reveals them.",
    Talent.FARSIGHT: "Increases view distance by 1 tile per point.",
    Talent.SHARED_ENCHANTMENT: "Ranged weapons inherit your melee weapon's enchantment.",
    Talent.SHARED_UPGRADES: "Ranged weapons benefit from melee weapon upgrades.",
    Talent.DURABLE_TIPS: "Thrown weapons never break.",
    Talent.BARKSKIN: "Grass provides an armor buff while standing on it.",
    Talent.SHIELDING_DEW: "Dew drops grant a shield.",
    Talent.SPECTRAL_BLADES_ABILITY: "Throw spectral blades that pierce enemies.",
    Talent.NATURES_POWER_ABILITY: "Empower yourself with nature's strength.",
    Talent.SPIRIT_HAWK_ABILITY: "Summon a spirit hawk to scout ahead.",
    Talent.FAN_OF_BLADES: "Spectral Blades hit multiple targets.",
    Talent.PROJECTING_BLADES: "Spectral Blades pass through walls.",
    Talent.SPIRIT_BLADES: "Spectral Blades return to the owner after hitting.",
    Talent.GROWING_POWER: "Nature's Power duration and strength increase.",
    Talent.NATURES_WRATH: "Nature's Power deals damage over time to nearby enemies.",
    Talent.WILD_MOMENTUM: "Nature's Power grants increased speed.",
    Talent.EAGLE_EYE: "The hawk reveals the entire floor map.",
    Talent.GO_FOR_THE_EYES: "The hawk blinds enemies it attacks.",
    Talent.SWIFT_SPIRIT: "The hawk attacks more frequently.",
}
