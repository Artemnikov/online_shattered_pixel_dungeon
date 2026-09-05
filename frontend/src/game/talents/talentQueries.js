export function getTalentLevel(talentLevels, id) {
  if (!talentLevels || !id) return 0;
  return talentLevels[id] || 0;
}

export function isTalentActive(talentLevels, id) {
  return getTalentLevel(talentLevels, id) > 0;
}

export function hasAvailablePoints(talentPoints) {
  if (!talentPoints) return false;
  return Object.values(talentPoints).some((pts) => typeof pts === 'number' && pts > 0);
}

export function findTalentDef(talentDefs, talentId) {
  if (!talentDefs?.tiers || !talentId) return null;
  for (const tierObj of Object.values(talentDefs.tiers)) {
    if (!tierObj?.talents) continue;
    const match = tierObj.talents.find((t) => t.id === talentId);
    if (match) return match;
  }
  return null;
}

export function canUpgradeTalent(talentId, talentDefs, talentLevels, talentPoints) {
  const def = findTalentDef(talentDefs, talentId);
  if (!def) return false;
  const currentLvl = getTalentLevel(talentLevels, talentId);
  const maxPts = def.max_pts ?? 1;
  const tierPts = talentPoints?.[def.tier] || 0;
  return currentLvl < maxPts && tierPts > 0;
}
