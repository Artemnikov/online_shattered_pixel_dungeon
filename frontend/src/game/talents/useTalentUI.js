import { useState, useCallback } from 'react';

export default function useTalentUI() {
  const [showHeroWindow, setShowHeroWindow] = useState(false);
  const [heroTab, setHeroTab] = useState(0);
  const [showSubclassChoice, setShowSubclassChoice] = useState(false);
  const [subclassOptions, setSubclassOptions] = useState([]);
  const [showArmorAbilityChoice, setShowArmorAbilityChoice] = useState(false);
  const [armorAbilityOptions, setArmorAbilityOptions] = useState([]);
  const [showLevelUpBanner, setShowLevelUpBanner] = useState(false);
  const [levelUpData, setLevelUpData] = useState({});
  const [upgradedTalentId, setUpgradedTalentId] = useState(null);
  const [showMetamorphMode, setShowMetamorphMode] = useState(false);
  const [metamorphOldTalent, setMetamorphOldTalent] = useState(null);
  const [metamorphOptions, setMetamorphOptions] = useState(null);

  const openHero = useCallback((tab) => {
    setHeroTab(tab);
    setShowHeroWindow(true);
  }, []);

  const resetMetamorph = useCallback(() => {
    setShowMetamorphMode(false);
    setMetamorphOptions(null);
    setMetamorphOldTalent(null);
  }, []);

  const closeHero = useCallback(() => {
    setShowHeroWindow(false);
    setUpgradedTalentId(null);
    resetMetamorph();
  }, [resetMetamorph]);

  return {
    showHeroWindow,
    setShowHeroWindow,
    heroTab,
    setHeroTab,
    showSubclassChoice,
    setShowSubclassChoice,
    subclassOptions,
    setSubclassOptions,
    showArmorAbilityChoice,
    setShowArmorAbilityChoice,
    armorAbilityOptions,
    setArmorAbilityOptions,
    showLevelUpBanner,
    setShowLevelUpBanner,
    levelUpData,
    setLevelUpData,
    upgradedTalentId,
    setUpgradedTalentId,
    showMetamorphMode,
    setShowMetamorphMode,
    metamorphOldTalent,
    setMetamorphOldTalent,
    metamorphOptions,
    setMetamorphOptions,
    openHero,
    closeHero,
    resetMetamorph,
  };
}
