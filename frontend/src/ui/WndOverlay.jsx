import { memo } from 'react';
import useRegisterWindow from '../game/window/useRegisterWindow';
import { WindowLevel, WindowBackdrop } from '../game/window/WindowTypes';

function WndOverlay({
  id,
  level = WindowLevel.BASE,
  backdrop = WindowBackdrop.DIM,
  onClose,
  closeOnEscape = true,
  closeOnBackdrop = true,
  className = '',
  style,
  children,
}) {
  useRegisterWindow({
    id,
    level,
    onClose,
    closeOnEscape,
    closeOnBackdrop,
    backdrop,
    enabled: true,
  });

  const levelClass = typeof level === 'number' ? `wnd-level-${level}` : '';
  const backdropClass = backdrop ? `wnd-backdrop-${backdrop}` : '';
  const fullClassName = `wnd-overlay ${levelClass} ${backdropClass} ${className}`.trim();

  return (
    <div
      className={fullClassName}
      style={{
        zIndex: typeof level === 'number' ? level : WindowLevel.BASE,
        ...style,
      }}
      onClick={closeOnBackdrop && onClose ? onClose : undefined}
    >
      {children}
    </div>
  );
}

export default memo(WndOverlay);
