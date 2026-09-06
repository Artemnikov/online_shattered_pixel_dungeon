import { useTranslation } from 'react-i18next';
import WndBag from './WndBag';
import WndOverlay from './WndOverlay';
import { WindowLevel } from '../game/window/WindowTypes';

export default function WndStoneIntuition({
  belongings, candidates, pickMode, possibleKinds,
  gold, energy, strength,
  onPickItem, onGuess, onClose,
}) {
  const { t } = useTranslation();

  if (pickMode === 'guess') {
    return (
      <WndOverlay id="wnd-stone-intuition-guess" level={WindowLevel.SECONDARY} onClose={onClose}>
        <div className="window stone-guess-window" onClick={(e) => e.stopPropagation()}>
          <div className="window-title">{t('ui.whatIsThisItem')}</div>
          <div className="window-content">
            {possibleKinds.map((kind) => (
              <button
                key={kind}
                className="stone-guess-btn"
                onClick={() => onGuess(kind)}
              >
                {kind}
              </button>
            ))}
            <button className="stone-guess-cancel" onClick={onClose}>
              {t('ui.cancel')}
            </button>
          </div>
        </div>
      </WndOverlay>
    );
  }

  return (
    <WndBag
      belongings={belongings}
      gold={gold}
      energy={energy}
      strength={strength}
      selectMode
      itemFilter={(item) => candidates.includes(item.id)}
      title={t('ui.chooseUnidentifiedItem')}
      onSelectItem={(item) => onPickItem(item.id)}
      onClose={onClose}
    />
  );
}
