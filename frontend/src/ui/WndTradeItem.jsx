import { useTranslation } from 'react-i18next';
import AudioManager from '../audio/AudioManager';
import WndInfoItem from './WndInfoItem';
import WndOverlay from './WndOverlay';
import { WindowLevel } from '../game/window/WindowTypes';

export default function WndTradeItem({ item, mode, onConfirm, onCancel, price, canAfford = true }) {
  const { t } = useTranslation();

  if (!item) return null;
  const isSell = mode === 'sell';
  const label = isSell
    ? t('shop.sellConfirm', { price })
    : t('shop.buyConfirm', { price });

  return (
    <WndOverlay id="wnd-trade-item" level={WindowLevel.SECONDARY} onClose={onCancel}>
      <div className="wnd-info-card wnd-trade" onClick={(e) => e.stopPropagation()}>
        <WndInfoItem item={item} />
        <div className="wnd-trade-actions">
          <button
            className="wnd-trade-btn"
            disabled={mode === 'buy' && !canAfford}
            onClick={() => { AudioManager.play('CLICK'); onConfirm(); }}
          >
            {label}
          </button>
          <button className="wnd-trade-btn cancel" onClick={() => { AudioManager.play('CLICK'); onCancel(); }}>
            {t('ui.cancel')}
          </button>
        </div>
      </div>
    </WndOverlay>
  );
}
