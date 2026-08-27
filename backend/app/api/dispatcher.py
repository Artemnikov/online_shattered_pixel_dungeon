import logging
from typing import Any, Callable, Dict, Type

from app.engine.manager import GameInstance
from app.schemas import CLIENT_MESSAGE_ADAPTER, ClientMessage, PongMessage
from app.schemas import messages as msg

logger = logging.getLogger(__name__)

Handler = Callable[[GameInstance, str, Any], None]


class MessageDispatcher:
    """Dispatches validated client messages to registered type handlers."""

    def __init__(self):
        self._handlers: Dict[Type[ClientMessage], Handler] = {}

    def register(self, message_type: Type[ClientMessage]):
        def decorator(func: Handler) -> Handler:
            self._handlers[message_type] = func
            return func

        return decorator

    async def dispatch(
        self, game: GameInstance, player_id: str, message: ClientMessage, websocket: Any
    ) -> None:
        if isinstance(message, msg.Ping):
            await websocket.send_json(PongMessage().model_dump())
            return

        handler = self._handlers.get(type(message))
        if handler:
            try:
                handler(game, player_id, message)
            except Exception:
                logger.exception(
                    "game_websocket: error handling message %s from %s",
                    type(message).__name__,
                    player_id,
                )
        else:
            logger.warning(
                "No handler registered for message type %s from %s",
                type(message).__name__,
                player_id,
            )


dispatcher = MessageDispatcher()
