from typing import Dict, Optional

from app.engine.entities.talent_enum import Subclass, Talent


# Maps talent name → (max_points, tier, subclass_required_or_None)
WARRIOR_TALENT_DEFS: Dict[str, tuple[int, int, Optional[str]]] = {
    # Tier 1
    Talent.HEARTY_MEAL: (2, 1, None),
    Talent.VETERANS_INTUITION: (2, 1, None),
    Talent.PROVOKED_ANGER: (2, 1, None),
    Talent.IRON_WILL: (2, 1, None),
    # Tier 2
    Talent.IRON_STOMACH: (2, 2, None),
    Talent.LIQUID_WILLPOWER: (2, 2, None),
    Talent.RUNIC_TRANSFERENCE: (2, 2, None),
    Talent.LETHAL_MOMENTUM: (2, 2, None),
    Talent.IMPROVISED_PROJECTILES: (2, 2, None),
    # Tier 3 — universal (requires subclass)
    Talent.HOLD_FAST: (3, 3, None),
    Talent.STRONGMAN: (3, 3, None),
    # Tier 3 — Berserker
    Talent.ENDLESS_RAGE: (3, 3, Subclass.BERSERKER),
    Talent.DEATHLESS_FURY: (3, 3, Subclass.BERSERKER),
    Talent.ENRAGED_CATALYST: (3, 3, Subclass.BERSERKER),
    # Tier 3 — Gladiator
    Talent.CLEAVE: (3, 3, Subclass.GLADIATOR),
    Talent.LETHAL_DEFENSE: (3, 3, Subclass.GLADIATOR),
    Talent.ENHANCED_COMBO: (3, 3, Subclass.GLADIATOR),
    # Tier 4 — Heroic Leap
    Talent.BODY_SLAM: (4, 4, None),
    Talent.IMPACT_WAVE: (4, 4, None),
    Talent.DOUBLE_JUMP: (4, 4, None),
    # Tier 4 — Shockwave
    Talent.EXPANDING_WAVE: (4, 4, None),
    Talent.STRIKING_WAVE: (4, 4, None),
    Talent.SHOCK_FORCE: (4, 4, None),
    # Tier 4 — Endure
    Talent.SUSTAINED_RETRIBUTION: (4, 4, None),
    Talent.SHRUG_IT_OFF: (4, 4, None),
    Talent.EVEN_THE_ODDS: (4, 4, None),
}

WARRIOR_TALENT_CLASS_REQ: Dict[str, str] = {
    Talent.HEARTY_MEAL: "warrior", Talent.VETERANS_INTUITION: "warrior",
    Talent.PROVOKED_ANGER: "warrior", Talent.IRON_WILL: "warrior",
    Talent.IRON_STOMACH: "warrior", Talent.LIQUID_WILLPOWER: "warrior",
    Talent.RUNIC_TRANSFERENCE: "warrior", Talent.LETHAL_MOMENTUM: "warrior",
    Talent.IMPROVISED_PROJECTILES: "warrior",
    Talent.HOLD_FAST: "warrior", Talent.STRONGMAN: "warrior",
    Talent.ENDLESS_RAGE: "warrior", Talent.DEATHLESS_FURY: "warrior", Talent.ENRAGED_CATALYST: "warrior",
    Talent.CLEAVE: "warrior", Talent.LETHAL_DEFENSE: "warrior", Talent.ENHANCED_COMBO: "warrior",
    Talent.BODY_SLAM: "warrior", Talent.IMPACT_WAVE: "warrior", Talent.DOUBLE_JUMP: "warrior",
    Talent.EXPANDING_WAVE: "warrior", Talent.STRIKING_WAVE: "warrior", Talent.SHOCK_FORCE: "warrior",
    Talent.SUSTAINED_RETRIBUTION: "warrior", Talent.SHRUG_IT_OFF: "warrior", Talent.EVEN_THE_ODDS: "warrior",
    # NOTE: HEROIC_ENERGY is intentionally absent — it's a shared T4 universal
    # talent available to any class once T4 is unlocked (see _belongs_to_class
    # in main.py for the per-class talent-list special case).
}

WARRIOR_TALENT_TITLES: Dict[str, str] = {
    Talent.HEARTY_MEAL: "Hearty Meal",
    Talent.VETERANS_INTUITION: "Veteran's Intuition",
    Talent.PROVOKED_ANGER: "Provoked Anger",
    Talent.IRON_WILL: "Iron Will",
    Talent.IRON_STOMACH: "Iron Stomach",
    Talent.LIQUID_WILLPOWER: "Liquid Willpower",
    Talent.RUNIC_TRANSFERENCE: "Runic Transference",
    Talent.LETHAL_MOMENTUM: "Lethal Momentum",
    Talent.IMPROVISED_PROJECTILES: "Improvised Projectiles",
    Talent.HOLD_FAST: "Hold Fast",
    Talent.STRONGMAN: "Strongman",
    Talent.ENDLESS_RAGE: "Endless Rage",
    Talent.DEATHLESS_FURY: "Deathless Fury",
    Talent.ENRAGED_CATALYST: "Enraged Catalyst",
    Talent.CLEAVE: "Cleave",
    Talent.LETHAL_DEFENSE: "Lethal Defense",
    Talent.ENHANCED_COMBO: "Enhanced Combo",
    Talent.BODY_SLAM: "Body Slam",
    Talent.IMPACT_WAVE: "Impact Wave",
    Talent.DOUBLE_JUMP: "Double Jump",
    Talent.EXPANDING_WAVE: "Expanding Wave",
    Talent.STRIKING_WAVE: "Striking Wave",
    Talent.SHOCK_FORCE: "Shock Force",
    Talent.SUSTAINED_RETRIBUTION: "Sustained Retribution",
    Talent.SHRUG_IT_OFF: "Shrug It Off",
    Talent.EVEN_THE_ODDS: "Even the Odds",
}

WARRIOR_TALENT_DESCRIPTIONS: Dict[str, str] = {
    Talent.HEARTY_MEAL: "Eating food while below 1/3 HP heals an extra 2+2 per point.",
    Talent.VETERANS_INTUITION: "Identify melee weapons and armor faster; at 2pts, new armor is identified instantly.",
    Talent.PROVOKED_ANGER: "Your next attack after being provoked deals 1+2 per point bonus damage.",
    Talent.IRON_WILL: "Grants a shield (3 + armor tier + points) that recharges over time.",
    Talent.IRON_STOMACH: "Eating while on a cooldown grants temporary immunity to food-related debuffs.",
    Talent.LIQUID_WILLPOWER: "Drinking a potion grants a shield equal to 3.0%/6.5%/10% of max HP per point.",
    Talent.RUNIC_TRANSFERENCE: "Allows transferring glyphs between your seal and armor.",
    Talent.LETHAL_MOMENTUM: "Killing blows have a 34%/67%/100% chance to not consume a turn.",
    Talent.IMPROVISED_PROJECTILES: "Thrown non-weapon items blind enemies for 1+points turns (50-turn cooldown).",
    Talent.HOLD_FAST: "While stationary, gain bonus armor DR and your buffs/debuffs decay slower.",
    Talent.STRONGMAN: "Effective Strength increases by 3%-18% per point.",
    Talent.ENDLESS_RAGE: "Berserk's power cap increases by 16.67% per point, boosting shield and recovery.",
    Talent.DEATHLESS_FURY: "If a fatal blow would kill you while raging, Berserk saves you at 1 HP instead.",
    Talent.ENRAGED_CATALYST: "While raging, weapon enchantment proc chance increases by up to 15% per point.",
    Talent.CLEAVE: "Killing blows extend your combo timer to 15+15 per point seconds.",
    Talent.LETHAL_DEFENSE: "Combo kills reduce your Iron Will shield's cooldown by up to 33% per point.",
    Talent.ENHANCED_COMBO: "Empowers your Combo finishing moves at higher combo counts.",
    Talent.BODY_SLAM: "Landing from Heroic Leap damages adjacent enemies.",
    Talent.IMPACT_WAVE: "Enemies not hit by Body Slam are knocked back and may be left Vulnerable.",
    Talent.DOUBLE_JUMP: "Heroic Leap grants a cheaper follow-up leap.",
    Talent.EXPANDING_WAVE: "Shockwave's cone reaches further and wider per point.",
    Talent.STRIKING_WAVE: "Shockwave has a chance to trigger an extra attack on each target hit.",
    Talent.SHOCK_FORCE: "Shockwave deals more damage and may Paralyze instead of Cripple.",
    Talent.SUSTAINED_RETRIBUTION: "Damage banked by Endure is increased by 15% per point when it ends.",
    Talent.SHRUG_IT_OFF: "Endure reduces incoming damage further, by 20% per point.",
    Talent.EVEN_THE_ODDS: "Banked Endure damage increases for each nearby enemy.",
}
