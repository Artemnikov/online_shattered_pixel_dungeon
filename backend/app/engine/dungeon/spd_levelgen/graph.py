# Copyright (C) 2026 ArtemNikov
#
"""Port of com.watabou.utils.Graph -- BFS distance map over Room graphs
(used by RegularPainter.paintDoors to decide whether a hidden door would
disconnect a room)."""

from __future__ import annotations

from collections import deque
from typing import Iterable

from app.engine.dungeon.spd_levelgen.room import Room

INFINITY = 0x7FFFFFFF  # Integer.MAX_VALUE


def build_distance_map(nodes: Iterable[Room], focus: Room) -> None:
    for node in nodes:
        node.distance = INFINITY

    queue = deque()
    focus.distance = 0
    queue.append(focus)

    while queue:
        node = queue.popleft()
        distance = node.distance
        price = node.price

        for edge in node.edges():
            if edge.distance > distance + price:
                queue.append(edge)
                edge.distance = distance + price
