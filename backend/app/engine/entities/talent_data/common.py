"""Shared (class-agnostic) talent data.

Only genuinely universal talents live here. Everything else is owned by the
per-class modules in this package. HEROIC_ENERGY is the lone shared talent: a
Tier 4 charge-cost reduction available to any class once T4 is unlocked (it is
intentionally absent from TALENT_CLASS_REQ).
"""

from typing import Dict, Optional

from app.engine.entities.talent_enum import Talent


COMMON_TALENT_DEFS: Dict[str, tuple[int, int, Optional[str]]] = {
    Talent.HEROIC_ENERGY: (4, 4, None),
}

COMMON_TALENT_CLASS_REQ: Dict[str, str] = {}

COMMON_TALENT_TITLES: Dict[str, str] = {
    Talent.HEROIC_ENERGY: "Heroic Energy",
}

COMMON_TALENT_DESCRIPTIONS: Dict[str, str] = {
    Talent.HEROIC_ENERGY: "Reduces your armor ability's charge cost by 12%/23%/32%/40%.",
}
