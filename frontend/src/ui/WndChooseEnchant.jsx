import { useTranslation } from 'react-i18next';
import WndOverlay from './WndOverlay';
import { WindowLevel } from '../game/window/WindowTypes';

export default function WndChooseEnchant({
  options, isWeapon,
  onChoose, onClose,
}) {
  const { t } = useTranslation();

  return (
    <WndOverlay id="wnd-choose-enchant" level={WindowLevel.SECONDARY} onClose={onClose}>
      <div className="window choose-enchant-window" onClick={(e) => e.stopPropagation()}>
        <div className="window-title">
          {isWeapon ? t('ui.chooseEnchantment') : t('ui.chooseGlyph')}
        </div>
        <div className="window-content">
          <p className="choose-enchant-desc">
            {t('ui.chooseEnchantDesc')}
          </p>
          {options.map((opt, i) => (
            <button
              key={opt}
              className="choose-enchant-btn"
              onClick={() => onChoose(i)}
            >
              {t(`enchant.${opt}`, opt.replace(/_/g, ' '))}
            </button>
          ))}
          <button className="choose-enchant-cancel" onClick={onClose}>
            {t('ui.cancel')}
          </button>
        </div>
      </div>
    </WndOverlay>
  );
}
