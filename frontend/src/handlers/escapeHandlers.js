import { useCallback } from 'react';
import { clearResumeBundle } from '../game/useResumeBundle';

export function useEscapeHandlers({
  examineModeRef, targetingModeRef, setExamineMode, setTargetingMode, clearInspect,
  showSubclassChoice, setShowSubclassChoice, showArmorAbilityChoice, setShowArmorAbilityChoice,
  showHeroWindow, closeHero, gameState, gameMenuOpenRef, setGameMenuOpen,
  socketRef, entitiesRef, visionRef, myPlayerIdRef, wasDownedRef,
  setMyPlayerId, setGrid, setMyStats, setBossInfo, setBossFightActive,
  setBossBleeding, setBossLurking, setShowBossSlainBanner, setBossSlainData,
  setInventory, setConnectionStatus, setScoreBreakdown, setCanResurrect,
  setIsVictory, setRespawnsUsed, setMaxRespawns, setLootDropped,
  resetMetamorph, setGameState,
}) {
  const handleEscape = useCallback(() => {
    if (examineModeRef.current || targetingModeRef.current) {
      setExamineMode(false);
      setTargetingMode(false);
      clearInspect();
    } else if (showSubclassChoice) {
      setShowSubclassChoice(false);
    } else if (showArmorAbilityChoice) {
      setShowArmorAbilityChoice(false);
    } else if (showHeroWindow) {
      closeHero();
    } else if (!gameMenuOpenRef.current && gameState === 'PLAYING') {
      setGameMenuOpen(true);
    }
  }, [examineModeRef, targetingModeRef, setExamineMode, setTargetingMode, clearInspect, showSubclassChoice, setShowSubclassChoice, showArmorAbilityChoice, setShowArmorAbilityChoice, showHeroWindow, closeHero, gameState, gameMenuOpenRef, setGameMenuOpen]);

  const resetForRestart = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
    entitiesRef.current = { players: {}, mobs: {} };
    visionRef.current = { visible: new Set(), discovered: new Set() };
    myPlayerIdRef.current = null;
    wasDownedRef.current = false;
    setMyPlayerId(null);
    setGrid([]);
    setMyStats({ hp: 0, maxHp: 10, name: '' });
    setBossInfo(null);
    setBossFightActive(false);
    setBossBleeding(false);
    setBossLurking(false);
    setShowBossSlainBanner(false);
    setBossSlainData(null);
    setInventory([]);
    setConnectionStatus(null);
    setScoreBreakdown(null);
    setCanResurrect(false);
    setIsVictory(false);
    setRespawnsUsed(0);
    setMaxRespawns(3);
    setLootDropped(false);
    resetMetamorph();
  }, [resetMetamorph, socketRef, entitiesRef, visionRef, myPlayerIdRef, wasDownedRef, setMyPlayerId, setGrid, setMyStats, setBossInfo, setBossFightActive, setBossBleeding, setBossLurking, setShowBossSlainBanner, setBossSlainData, setInventory, setConnectionStatus, setScoreBreakdown, setCanResurrect, setIsVictory, setRespawnsUsed, setMaxRespawns, setLootDropped]);

  const handleLeaveGame = useCallback(() => {
    clearResumeBundle();
    resetForRestart();
    setGameMenuOpen(false);
    setGameState('WELCOME');
  }, [resetForRestart, setGameMenuOpen, setGameState]);

  return { handleEscape, resetForRestart, handleLeaveGame };
}
