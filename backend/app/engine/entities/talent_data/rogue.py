from typing import Dict, Optional

from app.engine.entities.talent_enum import Subclass, Talent


# Maps talent name → (max_points, tier, subclass_required_or_None)
ROGUE_TALENT_DEFS: Dict[str, tuple[int, int, Optional[str]]] = {
    # Tier 1
    Talent.CACHED_RATIONS: (2, 1, None),
    Talent.THIEFS_INTUITION: (2, 1, None),
    Talent.SUCKER_PUNCH: (2, 1, None),
    Talent.PROTECTIVE_SHADOWS: (2, 1, None),
    # Tier 2
    Talent.MYSTICAL_MEAL: (2, 2, None),
    Talent.INSCRIBED_STEALTH: (2, 2, None),
    Talent.WIDE_SEARCH: (2, 2, None),
    Talent.SILENT_STEPS: (2, 2, None),
    Talent.ROGUES_FORESIGHT: (2, 2, None),
    # Tier 3 — class
    Talent.ENHANCED_RINGS: (3, 3, None),
    Talent.LIGHT_CLOAK: (3, 3, None),
    # Tier 3 — Assassin
    Talent.ENHANCED_LETHALITY: (3, 3, Subclass.ASSASSIN),
    Talent.ASSASSINS_REACH: (3, 3, Subclass.ASSASSIN),
    Talent.BOUNTY_HUNTER: (3, 3, Subclass.ASSASSIN),
    # Tier 3 — Freerunner
    Talent.EVASIVE_ARMOR: (3, 3, Subclass.FREERUNNER),
    Talent.PROJECTILE_MOMENTUM: (3, 3, Subclass.FREERUNNER),
    Talent.SPEEDY_STEALTH: (3, 3, Subclass.FREERUNNER),
    # Tier 4 — Smoke Bomb
    Talent.HASTY_RETREAT: (4, 4, None),
    Talent.BODY_REPLACEMENT: (4, 4, None),
    Talent.SHADOW_STEP: (4, 4, None),
    # Tier 4 — Death Mark
    Talent.FEAR_THE_REAPER: (4, 4, None),
    Talent.DEATHLY_DURABILITY: (4, 4, None),
    Talent.DOUBLE_MARK: (4, 4, None),
    # Tier 4 — Shadow Clone
    Talent.SHADOW_BLADE: (4, 4, None),
    Talent.CLONED_ARMOR: (4, 4, None),
    Talent.PERFECT_COPY: (4, 4, None),
}

ROGUE_TALENT_CLASS_REQ: Dict[str, str] = {
    Talent.CACHED_RATIONS: "rogue", Talent.THIEFS_INTUITION: "rogue",
    Talent.SUCKER_PUNCH: "rogue", Talent.PROTECTIVE_SHADOWS: "rogue",
    Talent.MYSTICAL_MEAL: "rogue", Talent.INSCRIBED_STEALTH: "rogue",
    Talent.WIDE_SEARCH: "rogue", Talent.SILENT_STEPS: "rogue", Talent.ROGUES_FORESIGHT: "rogue",
    Talent.ENHANCED_RINGS: "rogue", Talent.LIGHT_CLOAK: "rogue",
    Talent.HASTY_RETREAT: "rogue", Talent.BODY_REPLACEMENT: "rogue", Talent.SHADOW_STEP: "rogue",
    Talent.FEAR_THE_REAPER: "rogue", Talent.DEATHLY_DURABILITY: "rogue", Talent.DOUBLE_MARK: "rogue",
    Talent.SHADOW_BLADE: "rogue", Talent.CLONED_ARMOR: "rogue", Talent.PERFECT_COPY: "rogue",
}

ROGUE_TALENT_TITLES: Dict[str, str] = {
    Talent.CACHED_RATIONS: "Cached Rations",
    Talent.THIEFS_INTUITION: "Thief's Intuition",
    Talent.SUCKER_PUNCH: "Sucker Punch",
    Talent.PROTECTIVE_SHADOWS: "Protective Shadows",
    Talent.MYSTICAL_MEAL: "Mystical Meal",
    Talent.INSCRIBED_STEALTH: "Inscribed Stealth",
    Talent.WIDE_SEARCH: "Wide Search",
    Talent.SILENT_STEPS: "Silent Steps",
    Talent.ROGUES_FORESIGHT: "Rogue's Foresight",
    Talent.ENHANCED_RINGS: "Enhanced Rings",
    Talent.LIGHT_CLOAK: "Light Cloak",
    Talent.ENHANCED_LETHALITY: "Enhanced Lethality",
    Talent.ASSASSINS_REACH: "Assassin's Reach",
    Talent.BOUNTY_HUNTER: "Bounty Hunter",
    Talent.EVASIVE_ARMOR: "Evasive Armor",
    Talent.PROJECTILE_MOMENTUM: "Projectile Momentum",
    Talent.SPEEDY_STEALTH: "Speedy Stealth",
    Talent.HASTY_RETREAT: "Hasty Retreat",
    Talent.BODY_REPLACEMENT: "Body Replacement",
    Talent.SHADOW_STEP: "Shadow Step",
    Talent.FEAR_THE_REAPER: "Fear the Reaper",
    Talent.DEATHLY_DURABILITY: "Deathly Durability",
    Talent.DOUBLE_MARK: "Double Mark",
    Talent.SHADOW_BLADE: "Shadow Blade",
    Talent.CLONED_ARMOR: "Cloned Armor",
    Talent.PERFECT_COPY: "Perfect Copy",
}

ROGUE_TALENT_DESCRIPTIONS: Dict[str, str] = {
    Talent.CACHED_RATIONS: "Eating food grants a shield. +4 shield per point.",
    Talent.THIEFS_INTUITION: "Better at detecting secrets and traps.",
    Talent.SUCKER_PUNCH: "Surprise attacks stun the target briefly.",
    Talent.PROTECTIVE_SHADOWS: "Damage resistance while in shadow or stealthed.",
    Talent.MYSTICAL_MEAL: "Eating food recharges your cloak by 1 charge per point.",
    Talent.INSCRIBED_STEALTH: "Reading a scroll grants brief stealth.",
    Talent.WIDE_SEARCH: "Searching reveals a larger area.",
    Talent.SILENT_STEPS: "Moving while stealthed does not break stealth.",
    Talent.ROGUES_FORESIGHT: "See traps and secrets from further away.",
    Talent.ENHANCED_RINGS: "Ring effects are 20% stronger per point.",
    Talent.LIGHT_CLOAK: "The cloak of shadows recharges faster.",
    Talent.ENHANCED_LETHALITY: "Assassinate deals significantly more damage.",
    Talent.ASSASSINS_REACH: "Assassinate can be used from 1 tile further away.",
    Talent.BOUNTY_HUNTER: "Kills drop more gold.",
    Talent.EVASIVE_ARMOR: "Armor no longer reduces dodge chance while moving.",
    Talent.PROJECTILE_MOMENTUM: "Ranged damage increases with distance.",
    Talent.SPEEDY_STEALTH: "Move at full speed while stealthed.",
    Talent.HASTY_RETREAT: "Smoke Bomb grants a speed boost.",
    Talent.BODY_REPLACEMENT: "Fatal damage swaps you with your clone.",
    Talent.SHADOW_STEP: "Teleport to your shadow clone's location.",
    Talent.FEAR_THE_REAPER: "Death Mark can instantly kill marked enemies.",
    Talent.DEATHLY_DURABILITY: "Death Mark weakens the target's attacks.",
    Talent.DOUBLE_MARK: "Mark two enemies at once.",
    Talent.SHADOW_BLADE: "Your clone deals increased damage.",
    Talent.CLONED_ARMOR: "Your clone inherits your armor rating.",
    Talent.PERFECT_COPY: "Your clone can use items from your inventory.",
}
