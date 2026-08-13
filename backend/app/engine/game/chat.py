"""Player chat for GameInstance.

Two channels with independent per-player rate limits:

- "global": broadcast to every player in the game, across all floors.
  Limit: GLOBAL_CHAT_INTERVAL seconds between messages.
- "direct": broadcast only to players on the same floor who have line of
  sight to the speaker (proximity voice). Gated downstream by the existing
  `_source_player_id` LOS check in EventsMixin.filter_events_for_player.
  Limit: DIRECT_CHAT_LIMIT messages per DIRECT_CHAT_WINDOW seconds.

Rate-limit windows live on GameInstance (self.chat_windows) keyed by player_id
then channel; a rejected message surfaces to the sender as a TOAST so they know
the send was dropped rather than silently lost.
"""

from collections import deque
from time import monotonic

GLOBAL_CHAT_INTERVAL = 10.0
DIRECT_CHAT_WINDOW = 10.0
DIRECT_CHAT_LIMIT = 10
CHAT_MAX_LEN = 200


class ChatMixin:
    def _chat_window(self, player_id: str, channel: str) -> deque:
        windows = self.chat_windows.setdefault(player_id, {})
        if channel not in windows:
            windows[channel] = deque()
        return windows[channel]

    def _chat_throttled(self, player_id: str, channel: str, text: str) -> bool:
        window = self._chat_window(player_id, channel)
        now = monotonic()
        if channel == "global":
            if window and now - window[-1] < GLOBAL_CHAT_INTERVAL:
                return True
        else:
            while window and now - window[0] > DIRECT_CHAT_WINDOW:
                window.popleft()
            if len(window) >= DIRECT_CHAT_LIMIT:
                return True
        window.append(now)
        return False

    def handle_chat(self, player_id: str, channel: str, text: str) -> None:
        player = self.players.get(player_id)
        if player is None or channel not in ("global", "direct"):
            return
        text = (text or "").strip()[:CHAT_MAX_LEN]
        if not text:
            return
        if self._chat_throttled(player_id, channel, text):
            self.add_event(
                "TOAST",
                {"text": "Slow down — you're sending messages too fast."},
                player_id=player_id,
            )
            return
        data = {"player": player_id, "name": player.name, "channel": channel, "text": text}
        if channel == "global":
            self.add_event("CHAT", data)
        else:
            # floor_id + source_player_id: same-floor recipients only, then the
            # existing LOS check in EventsMixin.filter_events_for_player gates
            # delivery to players who can actually see the speaker.
            self.add_event("CHAT", data, floor_id=player.floor_id, source_player_id=player_id)
