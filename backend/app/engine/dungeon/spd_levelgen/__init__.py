# Copyright (C) 2026 ArtemNikov
#
"""Byte-for-byte port of SPD's regular-level generation pipeline (rooms,
builders, painters), used to reproduce the original game's dungeon layouts
for a given seed. See /home/artem/.claude/plans/port-a-full-mab-jazzy-elephant.md
for the porting plan and scope notes (layout parity only -- item/mob spawning
depends on hero meta-state and is out of scope here).
"""
