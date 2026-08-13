import { useCallback, useState, useRef, useEffect } from 'react';
import { getApiBaseUrl } from '../config/urls';

export default function useTalentFlow({ gameState, selectedClass, myStats, send }) {
  const [showHeroWindow, setShowHeroWindow] = useState(false);
  const [heroTab, setHeroTab] = useState(0);
  const [talentDefs, setTalentDefs] = useState(null);
  const [talentDefsLoading, setTalentDefsLoading] = useState(false);
  const [talentDefsError, setTalentDefsError] = useState(null);
  const [talentPoints, setTalentPoints] = useState({});
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

  const onOpenTalentsRef = useRef(() => openHero(1));
  useEffect(() => { onOpenTalentsRef.current = () => openHero(1); }, [openHero]);

  // Sync talentPoints from myStats (updated every STATE_UPDATE)
  const [syncedTalentPoints, setSyncedTalentPoints] = useState(myStats.talentPoints);
  if (myStats.talentPoints !== syncedTalentPoints) {
    setSyncedTalentPoints(myStats.talentPoints);
    if (myStats.talentPoints) setTalentPoints(myStats.talentPoints);
  }

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const classType = myStats.classType || selectedClass;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting loading/error before the fetch is intentional
    setTalentDefsLoading(true);
    setTalentDefsError(null);
    fetch(`${getApiBaseUrl()}/api/talents/${classType}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setTalentDefs(data);
        setTalentDefsLoading(false);
      })
      .catch(e => {
        setTalentDefsError(e.message);
        setTalentDefsLoading(false);
      });
  }, [gameState, selectedClass, myStats.classType]);

  const sendUpgradeTalent = (talent) => send({ type: 'UPGRADE_TALENT', talent });
  const sendMetamorphChoose = (talent) => send({ type: 'METAMORPH_CHOOSE', talent });
  const sendMetamorphReplace = (oldTalent, newTalent) =>
    send({ type: 'METAMORPH_REPLACE', old_talent: oldTalent, new_talent: newTalent });

  const handleChooseSubclass = (subclass) => {
    send({ type: 'CHOOSE_SUBCLASS', subclass });
    setShowHeroWindow(false);
    setUpgradedTalentId(null);
  };

  const handleChooseArmorAbility = (ability) => {
    send({ type: 'CHOOSE_ARMOR_ABILITY', ability });
    setShowHeroWindow(false);
    setUpgradedTalentId(null);
  };

  // Socket callbacks passed to useGameSocket
  const onLevelUp = (data) => {
    if (data.talent_points) setTalentPoints(data.talent_points);
    setLevelUpData(data);
    setShowLevelUpBanner(true);
  };
  const onSubclassChoiceAvailable = (data) => {
    setSubclassOptions(data.options);
    setShowSubclassChoice(true);
  };
  const onArmorAbilityChoiceAvailable = (data) => {
    setArmorAbilityOptions(data.options);
    setShowArmorAbilityChoice(true);
  };
  const onMetamorphOpen = () => {
    setShowMetamorphMode(true);
    openHero(1);
  };
  const onMetamorphOptions = ({ old_talent, options }) => {
    setMetamorphOldTalent(old_talent);
    setMetamorphOptions(options);
  };
  const onTalentUpgraded = ({ talent }) => {
    setUpgradedTalentId(talent);
  };

  return {
    showHeroWindow, setShowHeroWindow,
    heroTab, setHeroTab,
    openHero, closeHero,
    talentDefs,
    talentDefsLoading,
    talentDefsError,
    talentPoints, setTalentPoints,
    showSubclassChoice, setShowSubclassChoice,
    subclassOptions,
    showArmorAbilityChoice, setShowArmorAbilityChoice,
    armorAbilityOptions,
    showLevelUpBanner, setShowLevelUpBanner,
    levelUpData,
    upgradedTalentId, setUpgradedTalentId,
    showMetamorphMode, setShowMetamorphMode,
    metamorphOldTalent, setMetamorphOldTalent,
    metamorphOptions, setMetamorphOptions,
    onOpenTalentsRef,
    sendUpgradeTalent,
    sendMetamorphChoose,
    sendMetamorphReplace,
    handleChooseSubclass,
    handleChooseArmorAbility,
    resetMetamorph,
    onLevelUp,
    onSubclassChoiceAvailable,
    onArmorAbilityChoiceAvailable,
    onMetamorphOpen,
    onMetamorphOptions,
    onTalentUpgraded,
  };
}
