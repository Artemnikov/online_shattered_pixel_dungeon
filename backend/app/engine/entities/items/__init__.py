# Copyright (C) 2026 ArtemNikov
"""Item entity subpackage.

Re-exports commonly-used names so wildcard imports from this package work as
before. New code should import directly from the submodule files.
"""
from app.engine.entities.items.potions import *  # noqa: F401,F403
from app.engine.entities.items.scrolls import *  # noqa: F401,F403
from app.engine.entities.items.consumables import *  # noqa: F401,F403
from app.engine.entities.items.equip import *  # noqa: F401,F403
from app.engine.entities.items.artifacts import *  # noqa: F401,F403
from app.engine.entities.items.bombs import *  # noqa: F401,F403
