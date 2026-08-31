from collections import deque
from dataclasses import dataclass
import time
from typing import Deque, List, Optional, Tuple

from app.engine.game.constants import MAX_PLAYER_INPUT_QUEUE


@dataclass
class MovementStep:
    seq: int
    dx: int
    dy: int


class PlayerMovementController:
    def __init__(self, player_id: str):
        self.player_id: str = player_id
        self.step_queue: Deque[MovementStep] = deque()
        self.path_queue: Deque[Tuple[int, int]] = deque()
        self.move_intent: Optional[Tuple[int, int]] = None
        self.last_processed_seq: int = 0
        self.last_executed_step: Optional[MovementStep] = None
        self.move_cooldown_ticks: float = 0.0
        self.last_auto_move_time: float = 0.0
        self.path_blocked_ticks: int = 0
        self.initial_step_pending: bool = False

    def enqueue_step(self, seq: int, dx: int, dy: int, replaces: Optional[int] = None) -> bool:
        if replaces is not None:
            for idx, s in enumerate(self.step_queue):
                if s.seq == replaces:
                    self.step_queue[idx] = MovementStep(seq=seq, dx=dx, dy=dy)
                    return True
            if self.last_executed_step is not None and self.last_executed_step.seq == replaces:
                remaining_dx = dx - self.last_executed_step.dx
                remaining_dy = dy - self.last_executed_step.dy
                if remaining_dx == 0 and remaining_dy == 0:
                    self.last_processed_seq = max(self.last_processed_seq, seq)
                    return True
                self.step_queue.appendleft(MovementStep(seq=seq, dx=remaining_dx, dy=remaining_dy))
                return True
            return False

        if seq <= self.last_processed_seq or (self.step_queue and seq <= self.step_queue[-1].seq):
            return False
        if len(self.step_queue) >= MAX_PLAYER_INPUT_QUEUE:
            return False

        if not self.is_active():
            self.move_cooldown_ticks = 1.0

        self.move_intent = None
        self.initial_step_pending = False
        self.path_queue.clear()
        self.step_queue.append(MovementStep(seq=seq, dx=dx, dy=dy))
        return True

    def set_intent(self, dx: int, dy: int, auto_interval: float) -> None:
        if dx == 0 and dy == 0:
            self.move_intent = None
            self.initial_step_pending = False
            return
        was_moving = self.move_intent is not None and not self.initial_step_pending
        self.move_intent = (dx, dy)
        self.path_queue.clear()
        if not was_moving:
            self.initial_step_pending = True
            self.last_auto_move_time = time.time() - auto_interval + 0.05

    def set_path(self, steps: List[Tuple[int, int]]) -> None:
        self.move_intent = None
        self.step_queue.clear()
        self.path_queue = deque(steps)
        self.last_auto_move_time = 0.0
        self.move_cooldown_ticks = 0.0
        self.path_blocked_ticks = 0

    def stop(self, last_seq: Optional[int] = None) -> None:
        self.move_intent = None
        self.initial_step_pending = False
        if last_seq is None:
            self.step_queue.clear()
        else:
            self.step_queue = deque([s for s in self.step_queue if s.seq <= last_seq])

    def tick_cooldown(self) -> None:
        if self.move_cooldown_ticks > 0.0:
            self.move_cooldown_ticks -= 1.0

    def is_ready_for_step(self) -> bool:
        return self.move_cooldown_ticks <= 0.0

    def has_queued_step(self) -> bool:
        return len(self.step_queue) > 0

    def pop_step(self) -> MovementStep:
        return self.step_queue.popleft()

    def has_intent(self) -> bool:
        return self.move_intent is not None

    def has_path(self) -> bool:
        return len(self.path_queue) > 0

    def on_step_executed(self, seq: Optional[int], step_ticks: int, dx: int = 0, dy: int = 0) -> None:
        if seq is not None:
            self.last_processed_seq = max(self.last_processed_seq, seq)
            self.last_executed_step = MovementStep(seq=seq, dx=dx, dy=dy)
        self.move_cooldown_ticks = float(step_ticks)

    def on_step_failed(self, seq: Optional[int]) -> None:
        if seq is not None:
            self.last_processed_seq = max(self.last_processed_seq, seq)
            self.last_executed_step = None
        self.step_queue.clear()
        self.path_queue.clear()
        self.move_cooldown_ticks = 0.0

    def is_active(self) -> bool:
        return bool(self.step_queue or self.move_intent or self.path_queue or self.move_cooldown_ticks > 0.0)
