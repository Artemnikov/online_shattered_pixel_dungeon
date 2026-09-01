export const regionForDepth = (depth) => {
  if (depth <= 5) return 'sewers';
  if (depth <= 10) return 'prison';
  if (depth <= 15) return 'caves';
  if (depth <= 20) return 'city';
  return 'halls';
};

export const tilesForDepth = (assetImages, depth) => {
  const region = regionForDepth(depth);
  const fromRegion = assetImages.tilesByRegion?.[region];
  // Fall back to the sewers atlas (or `tiles` for back-compat) if the
  // region's PNG hasn't loaded yet — better than rendering nothing.
  return fromRegion || assetImages.tilesByRegion?.sewers || assetImages.tiles;
};
