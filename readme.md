<p align="center">
  <img src="frontend/public/og-image.png" width="96" alt="Online Pixel Dungeon" />
</p>

<h1 align="center">Online Pixel Dungeon</h1>

<p align="center">
  A real-time multiplayer roguelike dungeon crawler, built on <b>Shattered Pixel Dungeon</b>.<br/>
  50 floors, bosses every 5, no turns, no waiting — just jump in.
</p>

<p align="center">
  <a href="https://github.com/Artemnikov/pixel_dungeon_online/releases/latest"><img src="https://img.shields.io/github/v/release/Artemnikov/pixel_dungeon_online" alt="Latest release"></a>
  <a href="LICENSE.txt"><img src="https://img.shields.io/badge/license-GPLv3-blue.svg" alt="License"></a>
</p>

<p align="center">
  <b>🎮 <a href="https://frontend-toqfublnha-ew.a.run.app">Play now — no download, no account</a></b>
</p>

## Features

- **Real-time, not turn-based** — every player and mob acts on a shared 20 Hz server clock
- **Public or private rooms** — drop into the shared public dungeon, or make a named (optionally password-protected) room for your group
- **50-floor descent** — sewers → prison → caves → city → halls, with a boss guarding every 5th floor
- **4 hero classes** — Warrior, Mage, Rogue, Huntress
- **Ankh resurrection** — cheat death mid-run instead of losing your run to one mistake
- **Lost Backpack on death** — your gear survives as a recoverable, owner-only backpack instead of scattering or vanishing
- **Adventurer's Guide** — in-journal pages that teach SPD's mechanics as you discover them
- **Faithful mechanics** — traps, alchemy, wands, and status effects modeled closely on the original SPD ruleset

## Stack

- **Frontend:** React + Vite, canvas rendering
- **Backend:** FastAPI, WebSockets, 20 Hz game loop

## Running locally

```bash
docker compose up
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080

## Credits

Based on [Shattered Pixel Dungeon](https://github.com/00-Evan/shattered-pixel-dungeon)
by Evan Debenham, itself based on Pixel Dungeon by Oleg Dolya.
Licensed under GPLv3.
