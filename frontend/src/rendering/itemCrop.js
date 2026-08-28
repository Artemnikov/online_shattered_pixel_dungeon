export function centeredItemCrop(rect, destBoxPx, srcCellPx = 16) {
  const scale = destBoxPx / srcCellPx;
  const sx = rect ? rect.rx : 0;
  const sy = rect ? rect.ry : 0;
  const sw = rect ? rect.w : srcCellPx;
  const sh = rect ? rect.h : srcCellPx;
  const dw = sw * scale;
  const dh = sh * scale;
  return { sx, sy, sw, sh, dw, dh, offsetX: (destBoxPx - dw) / 2, offsetY: (destBoxPx - dh) / 2 };
}
