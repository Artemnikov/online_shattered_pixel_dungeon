import { useState, useEffect, useMemo, useCallback } from 'react';
import { getApiBaseUrl } from '../../config/urls';
import {
  getTalentLevel,
  isTalentActive,
  hasAvailablePoints,
  canUpgradeTalent,
  findTalentDef,
} from './talentQueries';

export default function useTalentData({ gameState, selectedClass, myStats }) {
  const [talentDefs, setTalentDefs] = useState(null);
  const [talentDefsLoading, setTalentDefsLoading] = useState(false);
  const [talentDefsError, setTalentDefsError] = useState(null);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const classType = myStats?.classType || selectedClass;
    if (!classType) return;

    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting loading/error before the fetch is intentional
    setTalentDefsLoading(true);
    setTalentDefsError(null);

    fetch(`${getApiBaseUrl()}/api/talents/${classType}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (!ignore) {
          setTalentDefs(data);
          setTalentDefsLoading(false);
        }
      })
      .catch(e => {
        if (!ignore) {
          setTalentDefsError(e.message);
          setTalentDefsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [gameState, selectedClass, myStats?.classType]);

  const talentLevels = useMemo(() => myStats?.talentLevels || {}, [myStats?.talentLevels]);
  const talentPoints = useMemo(() => myStats?.talentPoints || {}, [myStats?.talentPoints]);
  const bonusTalentPoints = useMemo(() => myStats?.bonusTalentPoints || {}, [myStats?.bonusTalentPoints]);

  const getLevel = useCallback((id) => getTalentLevel(talentLevels, id), [talentLevels]);
  const isActive = useCallback((id) => isTalentActive(talentLevels, id), [talentLevels]);
  const hasPoints = useCallback(() => hasAvailablePoints(talentPoints), [talentPoints]);
  const canUpgrade = useCallback(
    (id) => canUpgradeTalent(id, talentDefs, talentLevels, talentPoints),
    [talentDefs, talentLevels, talentPoints],
  );
  const getDef = useCallback((id) => findTalentDef(talentDefs, id), [talentDefs]);

  return {
    talentDefs,
    setTalentDefs,
    talentDefsLoading,
    talentDefsError,
    talentPoints,
    talentLevels,
    bonusTalentPoints,
    getLevel,
    isActive,
    hasPoints,
    canUpgrade,
    getDef,
  };
}
