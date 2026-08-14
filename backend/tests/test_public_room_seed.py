import asyncio
import os

import pytest

from app.api.connection_manager import ConnectionManager, PUBLIC_ROOM_SEED_ENV
from app.engine.game.constants import PUBLIC_ROOM_ID


class DummyWebSocket:
    def __init__(self):
        self.accepted = False

    async def accept(self):
        self.accepted = True

    async def send_json(self, payload):
        pass


def test_public_room_uses_env_seed(monkeypatch):
    async def scenario():
        monkeypatch.setenv(PUBLIC_ROOM_SEED_ENV, "MAB")
        manager = ConnectionManager()
        await manager.connect(PUBLIC_ROOM_ID, DummyWebSocket(), "p1", seed="")
        game = manager.game_instances[PUBLIC_ROOM_ID]
        from app.engine.dungeon.dungeon_seed import convert_from_text
        assert game.master_seed == convert_from_text("MAB")

    asyncio.run(scenario())


def test_public_room_ignores_player_seed(monkeypatch):
    async def scenario():
        monkeypatch.delenv(PUBLIC_ROOM_SEED_ENV, raising=False)
        manager = ConnectionManager()
        # Player supplies a seed, but public room must not honor it.
        await manager.connect(PUBLIC_ROOM_ID, DummyWebSocket(), "p1", seed="ABC")
        game = manager.game_instances[PUBLIC_ROOM_ID]
        import zlib
        assert game.master_seed == zlib.crc32(PUBLIC_ROOM_ID.encode("utf-8")) % 5_429_503_678_976

    asyncio.run(scenario())


def test_private_game_uses_player_seed():
    async def scenario():
        manager = ConnectionManager()
        await manager.connect("room-1", DummyWebSocket(), "p1", seed="ABC")
        game = manager.game_instances["room-1"]
        from app.engine.dungeon.dungeon_seed import convert_from_text
        assert game.master_seed == convert_from_text("ABC")

    asyncio.run(scenario())
