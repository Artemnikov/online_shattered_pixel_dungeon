import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTalentLevel,
  isTalentActive,
  hasAvailablePoints,
  findTalentDef,
  canUpgradeTalent,
} from './talentQueries.js';

const mockTalentDefs = {
  tiers: {
    1: {
      talents: [
        { id: 'hearty_meal', name: 'Hearty Meal', max_pts: 2, tier: 1 },
        { id: 'iron_will', name: 'Iron Will', max_pts: 2, tier: 1 },
      ],
    },
    2: {
      talents: [
        { id: 'iron_stomach', name: 'Iron Stomach', max_pts: 2, tier: 2 },
      ],
    },
  },
};

test('getTalentLevel: returns 0 when level not set or missing', () => {
  assert.equal(getTalentLevel({}, 'hearty_meal'), 0);
  assert.equal(getTalentLevel({ hearty_meal: 2 }, 'iron_will'), 0);
  assert.equal(getTalentLevel(null, 'hearty_meal'), 0);
});

test('getTalentLevel: returns correct level when set', () => {
  assert.equal(getTalentLevel({ hearty_meal: 2 }, 'hearty_meal'), 2);
  assert.equal(getTalentLevel({ iron_will: 1 }, 'iron_will'), 1);
});

test('isTalentActive: returns false for 0 points or missing', () => {
  assert.equal(isTalentActive({}, 'hearty_meal'), false);
  assert.equal(isTalentActive({ hearty_meal: 0 }, 'hearty_meal'), false);
});

test('isTalentActive: returns true for >0 points', () => {
  assert.equal(isTalentActive({ hearty_meal: 1 }, 'hearty_meal'), true);
  assert.equal(isTalentActive({ hearty_meal: 2 }, 'hearty_meal'), true);
});

test('hasAvailablePoints: returns false when empty or 0', () => {
  assert.equal(hasAvailablePoints({}), false);
  assert.equal(hasAvailablePoints({ 1: 0, 2: 0 }), false);
  assert.equal(hasAvailablePoints(null), false);
});

test('hasAvailablePoints: returns true when any tier has points', () => {
  assert.equal(hasAvailablePoints({ 1: 1, 2: 0 }), true);
  assert.equal(hasAvailablePoints({ 1: 0, 2: 2 }), true);
});

test('findTalentDef: finds talent by id in tier tree', () => {
  const found = findTalentDef(mockTalentDefs, 'iron_will');
  assert.equal(found?.id, 'iron_will');
  assert.equal(found?.max_pts, 2);
  assert.equal(findTalentDef(mockTalentDefs, 'unknown_talent'), null);
  assert.equal(findTalentDef(null, 'iron_will'), null);
});

test('canUpgradeTalent: checks points and max points limit', () => {
  assert.equal(
    canUpgradeTalent('hearty_meal', mockTalentDefs, { hearty_meal: 0 }, { 1: 1 }),
    true,
  );

  assert.equal(
    canUpgradeTalent('hearty_meal', mockTalentDefs, { hearty_meal: 0 }, { 1: 0 }),
    false,
  );

  assert.equal(
    canUpgradeTalent('hearty_meal', mockTalentDefs, { hearty_meal: 2 }, { 1: 5 }),
    false,
  );

  assert.equal(
    canUpgradeTalent('unknown', mockTalentDefs, {}, { 1: 1 }),
    false,
  );
});
