export const DIRECTION_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'Numpad8', 'Numpad2', 'Numpad4', 'Numpad6',
  'Numpad7', 'Numpad9', 'Numpad1', 'Numpad3',
]);

export function getVector(pressed) {
  let up = 0, down = 0, left = 0, right = 0;
  for (const code of pressed) {
    if (code === 'ArrowUp' || code === 'KeyW' || code === 'Numpad8') up = 1;
    if (code === 'ArrowDown' || code === 'KeyS' || code === 'Numpad2') down = 1;
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'Numpad4') left = 1;
    if (code === 'ArrowRight' || code === 'KeyD' || code === 'Numpad6') right = 1;
    if (code === 'Numpad7') { up = 1; left = 1; }
    if (code === 'Numpad9') { up = 1; right = 1; }
    if (code === 'Numpad1') { down = 1; left = 1; }
    if (code === 'Numpad3') { down = 1; right = 1; }
  }

  return { dx: right - left, dy: down - up };
}
