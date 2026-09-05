import { useEffect, useRef } from 'react';
import { windowManager } from './WindowManager';
import { WindowLevel, WindowBackdrop } from './WindowTypes';

export function useRegisterWindow({
  id,
  level = WindowLevel.BASE,
  onClose,
  closeOnEscape = true,
  closeOnBackdrop = true,
  backdrop = WindowBackdrop.DIM,
  enabled = true,
}) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!enabled || !id) return undefined;

    windowManager.register({
      id,
      level,
      onClose: () => onCloseRef.current?.(),
      closeOnEscape,
      closeOnBackdrop,
      backdrop,
    });

    return () => {
      windowManager.unregister(id);
    };
  }, [id, level, closeOnEscape, closeOnBackdrop, backdrop, enabled]);
}

export default useRegisterWindow;
