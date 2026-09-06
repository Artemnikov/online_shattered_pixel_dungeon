import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DIRECTION_KEYS } from '../input/useKeyboardControls';
import WndOverlay from './WndOverlay';
import { WindowLevel } from '../game/window/WindowTypes';

export default function WndChasmJump({ onConfirm, onDecline }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') onConfirm();
      // Walking away cancels the prompt, mirroring the server's own
      // auto-cancel of pending_chasm_fall on any movement attempt.
      else if (DIRECTION_KEYS.has(e.code)) onDecline();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onConfirm, onDecline]);

  return (
    <WndOverlay
      id="wnd-chasm-jump"
      level={WindowLevel.DIALOG}
      onClose={onDecline}
    >
      <div className="wnd-chasm-jump" onClick={(e) => e.stopPropagation()}>
        <div className="wnd-chasm-jump__title">{t('game.chasm.title', 'Chasm')}</div>
        <div className="wnd-chasm-jump__desc">{t('game.chasm.desc', 'Do you really want to jump into the chasm? A fall that far will be painful.')}</div>
        <div className="wnd-chasm-jump__actions">
          <button className="wnd-chasm-jump__btn wnd-chasm-jump__btn--yes" onClick={onConfirm}>
            {t('game.chasm.yes', 'Yes, I know what I\'m doing')}
          </button>
          <button className="wnd-chasm-jump__btn wnd-chasm-jump__btn--no" onClick={onDecline}>
            {t('game.chasm.no', 'No, I changed my mind')}
          </button>
        </div>
      </div>
    </WndOverlay>
  );
}
