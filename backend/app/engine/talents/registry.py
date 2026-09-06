from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional


@dataclass
class EffectContext:
    """Execution context passed to event-driven talent effect handlers."""
    player: Any
    game: Any
    payload: dict = field(default_factory=dict)


@dataclass
class Handler:
    talent_id: str
    fn: Callable[..., Any]


class TalentEffectRegistry:
    """Central registry for ID-based talent effect handlers grouped by trigger name."""

    def __init__(self) -> None:
        self._handlers: Dict[str, List[Handler]] = {}

    def on(self, trigger: str, talent_id: str):
        """Decorator to register a handler for a specific talent ID under a trigger name."""
        def decorator(fn: Callable[..., Any]):
            self._handlers.setdefault(trigger, []).append(Handler(talent_id=talent_id, fn=fn))
            return fn
        return decorator

    def dispatch(
        self,
        trigger: str,
        player: Any,
        game: Any,
        payload: Optional[dict] = None,
    ) -> None:
        """Run all handlers for `trigger` where the player owns the talent (level > 0)."""
        if not player or not hasattr(player, "talent_info"):
            return
        ti = player.talent_info
        if not ti:
            return

        handlers = self._handlers.get(trigger, ())
        if not handlers:
            return

        ctx = EffectContext(player=player, game=game, payload=payload or {})
        for h in handlers:
            level = ti.level(h.talent_id)
            if level > 0:
                h.fn(ctx, level)


class StatModifiers:
    """Registry for passive stat modifiers that fold into base stat values."""

    def __init__(self) -> None:
        self._modifiers: Dict[str, List[tuple[str, Callable[..., Any]]]] = {}

    def register(self, stat: str, talent_id: str):
        """Decorator to register a modifier function for a stat calculation."""
        def decorator(fn: Callable[..., Any]):
            self._modifiers.setdefault(stat, []).append((talent_id, fn))
            return fn
        return decorator

    def apply(self, stat: str, player: Any, base: Any) -> Any:
        """Apply all active talent modifiers for a given stat in registration order."""
        if not player or not hasattr(player, "talent_info"):
            return base
        ti = player.talent_info
        if not ti:
            return base

        result = base
        for talent_id, fn in self._modifiers.get(stat, ()):
            level = ti.level(talent_id)
            if level > 0:
                result = fn(player, result, level)
        return result


registry = TalentEffectRegistry()
MODIFIERS = StatModifiers()
