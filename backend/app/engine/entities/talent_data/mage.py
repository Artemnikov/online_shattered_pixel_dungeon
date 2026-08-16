from typing import Dict, Optional

from app.engine.entities.talent_enum import Subclass, Talent


# Maps talent name → (max_points, tier, subclass_required_or_None)
MAGE_TALENT_DEFS: Dict[str, tuple[int, int, Optional[str]]] = {
    # Tier 1
    Talent.EMPOWERING_MEAL: (2, 1, None),
    Talent.SCHOLARS_INTUITION: (2, 1, None),
    Talent.LINGERING_MAGIC: (2, 1, None),
    Talent.BACKUP_BARRIER: (2, 1, None),
    # Tier 2
    Talent.ENERGIZING_MEAL: (2, 2, None),
    Talent.INSCRIBED_POWER: (2, 2, None),
    Talent.WAND_PRESERVATION: (2, 2, None),
    Talent.ARCANE_VISION: (2, 2, None),
    Talent.SHIELD_BATTERY: (2, 2, None),
    # Tier 3 — class
    Talent.DESPERATE_POWER: (3, 3, None),
    Talent.ALLY_WARP: (3, 3, None),
    # Tier 3 — Battlemage
    Talent.EMPOWERED_STRIKE: (3, 3, Subclass.BATTLEMAGE),
    Talent.MYSTICAL_CHARGE: (3, 3, Subclass.BATTLEMAGE),
    Talent.EXCESS_CHARGE: (3, 3, Subclass.BATTLEMAGE),
    # Tier 3 — Warlock
    Talent.SOUL_EATER: (3, 3, Subclass.WARLOCK),
    Talent.SOUL_SIPHON: (3, 3, Subclass.WARLOCK),
    Talent.NECROMANCERS_MINIONS: (3, 3, Subclass.WARLOCK),
    # Tier 3 — armor ability selection
    Talent.ELEMENTAL_BLAST_ABILITY: (1, 3, None),
    Talent.WILD_MAGIC_ABILITY: (1, 3, None),
    Talent.WARP_BEACON_ABILITY: (1, 3, None),
    # Tier 4 — Elemental Blast
    Talent.BLAST_RADIUS: (4, 4, None),
    Talent.ELEMENTAL_POWER_TALENT: (4, 4, None),
    Talent.REACTIVE_BARRIER: (4, 4, None),
    # Tier 4 — Wild Magic
    Talent.WILD_POWER: (4, 4, None),
    Talent.FIRE_EVERYTHING: (4, 4, None),
    Talent.CONSERVED_MAGIC: (4, 4, None),
    # Tier 4 — Warp Beacon
    Talent.TELEFRAG: (4, 4, None),
    Talent.REMOTE_BEACON: (4, 4, None),
    Talent.LONGRANGE_WARP: (4, 4, None),
}

MAGE_TALENT_CLASS_REQ: Dict[str, str] = {
    Talent.EMPOWERING_MEAL: "mage", Talent.SCHOLARS_INTUITION: "mage",
    Talent.LINGERING_MAGIC: "mage", Talent.BACKUP_BARRIER: "mage",
    Talent.ENERGIZING_MEAL: "mage", Talent.INSCRIBED_POWER: "mage",
    Talent.WAND_PRESERVATION: "mage", Talent.ARCANE_VISION: "mage", Talent.SHIELD_BATTERY: "mage",
    Talent.DESPERATE_POWER: "mage", Talent.ALLY_WARP: "mage",
    Talent.ELEMENTAL_BLAST_ABILITY: "mage", Talent.WILD_MAGIC_ABILITY: "mage", Talent.WARP_BEACON_ABILITY: "mage",
    Talent.BLAST_RADIUS: "mage", Talent.ELEMENTAL_POWER_TALENT: "mage", Talent.REACTIVE_BARRIER: "mage",
    Talent.WILD_POWER: "mage", Talent.FIRE_EVERYTHING: "mage", Talent.CONSERVED_MAGIC: "mage",
    Talent.TELEFRAG: "mage", Talent.REMOTE_BEACON: "mage", Talent.LONGRANGE_WARP: "mage",
}

MAGE_TALENT_TITLES: Dict[str, str] = {
    Talent.EMPOWERING_MEAL: "Empowering Meal",
    Talent.SCHOLARS_INTUITION: "Scholar's Intuition",
    Talent.LINGERING_MAGIC: "Lingering Magic",
    Talent.BACKUP_BARRIER: "Backup Barrier",
    Talent.ENERGIZING_MEAL: "Energizing Meal",
    Talent.INSCRIBED_POWER: "Inscribed Power",
    Talent.WAND_PRESERVATION: "Wand Preservation",
    Talent.ARCANE_VISION: "Arcane Vision",
    Talent.SHIELD_BATTERY: "Shield Battery",
    Talent.DESPERATE_POWER: "Desperate Power",
    Talent.ALLY_WARP: "Ally Warp",
    Talent.EMPOWERED_STRIKE: "Empowered Strike",
    Talent.MYSTICAL_CHARGE: "Mystical Charge",
    Talent.EXCESS_CHARGE: "Excess Charge",
    Talent.SOUL_EATER: "Soul Eater",
    Talent.SOUL_SIPHON: "Soul Siphon",
    Talent.NECROMANCERS_MINIONS: "Necromancer's Minions",
    Talent.ELEMENTAL_BLAST_ABILITY: "Elemental Blast",
    Talent.WILD_MAGIC_ABILITY: "Wild Magic",
    Talent.WARP_BEACON_ABILITY: "Warp Beacon",
    Talent.BLAST_RADIUS: "Blast Radius",
    Talent.ELEMENTAL_POWER_TALENT: "Elemental Power",
    Talent.REACTIVE_BARRIER: "Reactive Barrier",
    Talent.WILD_POWER: "Wild Power",
    Talent.FIRE_EVERYTHING: "Fire Everything",
    Talent.CONSERVED_MAGIC: "Conserved Magic",
    Talent.TELEFRAG: "Telefrag",
    Talent.REMOTE_BEACON: "Remote Beacon",
    Talent.LONGRANGE_WARP: "Longrange Warp",
}

MAGE_TALENT_DESCRIPTIONS: Dict[str, str] = {
    Talent.EMPOWERING_MEAL: "Eating food empowers your next 3 wand zaps, +1/+2 damage per point.",
    Talent.SCHOLARS_INTUITION: "Identify items more easily and quickly.",
    Talent.LINGERING_MAGIC: "Zapping with a staff empowers your next melee attack with 1-2 magic damage.",
    Talent.BACKUP_BARRIER: "Grants a shield when your staff runs out of charges.",
    Talent.ENERGIZING_MEAL: "Eating food grants 5/8 turns of wand recharging.",
    Talent.INSCRIBED_POWER: "Reading a scroll empowers your next 2/3 wand zaps (+2 levels each).",
    Talent.WAND_PRESERVATION: "Wands have a chance to not consume a charge.",
    Talent.ARCANE_VISION: "See magic traps and concealed doors.",
    Talent.SHIELD_BATTERY: "Using a wand grants a shield.",
    Talent.DESPERATE_POWER: "At low HP, wands recharge automatically.",
    Talent.ALLY_WARP: "Swap places with a friendly summoned creature.",
    Talent.EMPOWERED_STRIKE: "Staff melee attacks deal significantly more damage.",
    Talent.MYSTICAL_CHARGE: "Wand hits charge your staff.",
    Talent.EXCESS_CHARGE: "Overcharging your staff deals bonus damage on melee hit.",
    Talent.SOUL_EATER: "Killing an enemy heals you. +2 HP per point.",
    Talent.SOUL_SIPHON: "Hitting an enemy with a wand drains life.",
    Talent.NECROMANCERS_MINIONS: "Kills have a chance to raise a minion.",
    Talent.ELEMENTAL_BLAST_ABILITY: "Unleash a blast of elemental energy.",
    Talent.WILD_MAGIC_ABILITY: "Trigger random wand effects.",
    Talent.WARP_BEACON_ABILITY: "Place a beacon to teleport back to.",
    Talent.BLAST_RADIUS: "Elemental Blast affects a larger area.",
    Talent.ELEMENTAL_POWER_TALENT: "Elemental Blast deals more damage.",
    Talent.REACTIVE_BARRIER: "Using Elemental Blast grants a shield.",
    Talent.WILD_POWER: "Wild Magic triggers more effects.",
    Talent.FIRE_EVERYTHING: "Wild Magic fires additional projectiles.",
    Talent.CONSERVED_MAGIC: "Wild Magic has a chance to not consume charge.",
    Talent.TELEFRAG: "Teleporting onto an enemy damages them.",
    Talent.REMOTE_BEACON: "Can trigger the beacon from a distance.",
    Talent.LONGRANGE_WARP: "Warp Beacon has unlimited range.",
}
