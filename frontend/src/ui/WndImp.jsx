import { useTranslation } from 'react-i18next';
import AudioManager from '../audio/AudioManager';
import WndOverlay from './WndOverlay';
import { WindowLevel } from '../game/window/WindowTypes';

export default function WndImp({ npcId, text, canClaim, onClaim, onClose }) {
  const { t } = useTranslation();

  return (
    <WndOverlay id="wnd-imp" level={WindowLevel.BASE} onClose={onClose}>
      <div className="wnd-item" onClick={(e) => e.stopPropagation()}>
        <div className="wnd-item-title">{t('imp.title')}</div>
        <div className="wnd-item-desc">{text}</div>
        <div className="wnd-item-actions">
          {canClaim && (
            <button
              className="default"
              onClick={() => { AudioManager.play('CLICK'); onClaim(npcId); }}
            >
              {t('imp.claimReward')}
            </button>
          )}
          <button onClick={() => { AudioManager.play('CLICK'); onClose(); }}>{t('imp.close')}</button>
        </div>
      </div>
    </WndOverlay>
  );
}
