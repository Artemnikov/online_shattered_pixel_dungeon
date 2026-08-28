export function slotTooltipText(item, slotIndex) {
  if (!item) return null;
  const name = item.name || item.kind || '';
  return `${name}  [${slotIndex + 1}]`;
}
