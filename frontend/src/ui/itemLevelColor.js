function levels(item) {
  const known = !!item.level_known;
  const trueLvl = known ? (item.level || 0) : 0;
  const buffed = known ? (item.buffed_level ?? item.level ?? 0) : 0;
  return { trueLvl, buffed };
}

export function levelDisplayText(item) {
  if (!item) return null;
  const { trueLvl, buffed } = levels(item);
  if (trueLvl === 0 && buffed === 0) return null;
  return `${buffed > 0 ? '+' : ''}${buffed}`;
}

export function levelColorClass(item) {
  if (!item) return null;
  const { trueLvl, buffed } = levels(item);
  if (trueLvl === 0 && buffed === 0) return null;
  if (buffed > trueLvl) return 'enhanced';
  if (buffed < trueLvl) return 'warning';
  if (buffed < 0) return 'down';
  return 'up';
}
