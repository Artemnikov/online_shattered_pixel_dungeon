import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AudioManager from '../audio/AudioManager';
import ItemIcon from './ItemIcon';
import WndTradeItem from './WndTradeItem';
import WndOverlay from './WndOverlay';
import { WindowLevel } from '../game/window/WindowTypes';
import { entityDisplayName } from './useEntityName';

export default function WndShop({ npcId, stock, gold, backpackItems, onBuy, onSell, onClose }) {
  const { t } = useTranslation();
  const [sellTarget, setSellTarget] = useState(null);
  const [buyTarget, setBuyTarget] = useState(null);

  const sellable = (backpackItems || []).filter(i => (i.value || 0) > 0 && i.kind !== 'gold');

  return (
    <>
      <WndOverlay id="wnd-shop" level={WindowLevel.BASE} onClose={onClose} className="wnd-shop-overlay">
        <div className="wnd-shop" onClick={(e) => e.stopPropagation()}>
          <button
            className="wnd-bag-close"
            onClick={() => { AudioManager.play('CLICK'); onClose(); }}
            aria-label={t('menu.closeShop')}
          >
            ✕
          </button>
          <div className="wnd-shop-header">
            <span className="wnd-shop-title">{t('shop.title')}</span>
            <span className="inv-gold">{gold ?? 0}<i className="inv-gold-icon" /></span>
          </div>
          <div className="wnd-shop-columns">
            <div className="wnd-shop-col">
              <div className="wnd-shop-col-title">{t('shop.buy')}</div>
              <div className="wnd-shop-list">
                {stock.length === 0 && <div className="wnd-shop-empty">{t('shop.nothingForSale')}</div>}
                {stock.map(item => (
                  <button
                    key={item.id}
                    className="wnd-shop-row"
                    onClick={() => { AudioManager.play('CLICK'); setBuyTarget(item); }}
                  >
                    <ItemIcon item={item} size={28} />
                    <span className="wnd-shop-name">{entityDisplayName(item, t)}</span>
                    <span className="wnd-shop-price">{item.value}<i className="inv-gold-icon" /></span>
                  </button>
                ))}
              </div>
            </div>
            <div className="wnd-shop-col">
              <div className="wnd-shop-col-title">{t('shop.sell')}</div>
              <div className="wnd-shop-list">
                {sellable.length === 0 && <div className="wnd-shop-empty">{t('shop.nothingToSell')}</div>}
                {sellable.map(item => (
                  <button
                    key={item.id}
                    className="wnd-shop-row"
                    onClick={() => { AudioManager.play('CLICK'); setSellTarget(item); }}
                  >
                    <ItemIcon item={item} size={28} />
                    <span className="wnd-shop-name">{entityDisplayName(item, t)}</span>
                    <span className="wnd-shop-price">{item.value}<i className="inv-gold-icon" /></span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </WndOverlay>

      {sellTarget && (
        <WndTradeItem
          item={sellTarget}
          mode="sell"
          price={sellTarget.value || 0}
          onConfirm={() => { onSell(sellTarget.id); setSellTarget(null); }}
          onCancel={() => setSellTarget(null)}
        />
      )}

      {buyTarget && (
        <WndTradeItem
          item={buyTarget}
          mode="buy"
          price={buyTarget.value || 0}
          canAfford={(gold ?? 0) >= (buyTarget.value || 0)}
          onConfirm={() => { onBuy(npcId, buyTarget.id); setBuyTarget(null); }}
          onCancel={() => setBuyTarget(null)}
        />
      )}
    </>
  );
}
