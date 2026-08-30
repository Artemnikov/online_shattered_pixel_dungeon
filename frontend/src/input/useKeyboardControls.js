import { useEffect, useRef } from 'react';
import { isFloorFadeActive } from '../rendering/floorTransition';
import { BACKEND_TILE } from '../rendering/sewers/constants';
import * as movementPredictor from '../net/movementPredictor';
import { runLocalBumpFlow } from '../net/events/combat';
import { DIRECTION_KEYS, getVector } from './directionUtils';

export { DIRECTION_KEYS, getVector };

export default function useKeyboardControls(props) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const lastKeyRef = useRef({ key: null, time: 0 });
  const pressedKeysRef = useRef(new Set());
  const lastSentVectorRef = useRef({ dx: 0, dy: 0 });

  useEffect(() => {
    let pumpRaf = null;
    const pumpSteps = () => {
      pumpRaf = null;
      const { dx, dy } = getVector(pressedKeysRef.current);
      if (dx === 0 && dy === 0) return;
      const { floorFadeRef, entitiesRef, myPlayerIdRef, gridRef, trapsRef, playerAnimRef, onOpenAlchemyRef } = propsRef.current;
      if (!isFloorFadeActive(floorFadeRef)) {
        const me = entitiesRef?.current?.players[myPlayerIdRef?.current];
        if (me) runLocalBumpFlow(movementPredictor.paceStep(me, dx, dy, myPlayerIdRef.current, gridRef.current, entitiesRef.current, trapsRef?.current), {
          me, playerAnimRef, onOpenAlchemy: () => onOpenAlchemyRef?.current?.(),
        });
      }
      pumpRaf = requestAnimationFrame(pumpSteps);
    };
    const ensurePumping = () => {
      if (pumpRaf === null) pumpRaf = requestAnimationFrame(pumpSteps);
    };

    // Send the current held-direction intent to the server, which paces the actual
    // stepping. Only sends on change so key auto-repeat is irrelevant. dx,dy = 0 stops.
    const syncMoveIntent = (isKeyDown = false) => {
      const { socketRef, isRefocusingRef, isDraggingRef, entitiesRef, myPlayerIdRef, gridRef } = propsRef.current;
      const { playerAnimRef, onOpenAlchemyRef, trapsRef } = propsRef.current;
      if (socketRef.current?.readyState !== WebSocket.OPEN) return;
      
      const { dx, dy } = getVector(pressedKeysRef.current);
      const last = lastSentVectorRef.current;
      if (dx === last.dx && dy === last.dy) return;

      lastSentVectorRef.current = { dx, dy };
      if (dx === 0 && dy === 0) {
        socketRef.current.send(JSON.stringify({ type: 'MOVE_STOP' }));
      } else {
        isRefocusingRef.current = true;
        isDraggingRef.current = false;
        socketRef.current.send(JSON.stringify({ type: 'MOVE_INTENT', dx, dy }));
        // Only predict/redirect when a key is pressed down, not when a key is released
        // mid-step (keyup updates server intent without warping in-flight prediction).
        if (isKeyDown) {
          const me = entitiesRef?.current?.players[myPlayerIdRef?.current];
          if (me) runLocalBumpFlow(movementPredictor.predictMove(me, dx, dy, myPlayerIdRef.current, gridRef.current, entitiesRef.current, trapsRef?.current), {
            me, playerAnimRef, onOpenAlchemy: () => onOpenAlchemyRef?.current?.(),
          });
        }
        ensurePumping();
      }
    };

    const handleKeyDown = (e) => {
      if (e.repeat) return;

      const {
        showItemBrowserRef, onCloseItemBrowser, floorFadeRef, setShowInventory,
        onExamineOrReveal, gameMenuOpenRef, onCancelModes, emergencyDrinkItem,
        onEmergencyDrink, triggerWait, onOpenTalents, onOpenItemBrowser,
        quickslot, itemsById, handleToolbarDoubleClick, handleToolbarClick,
      } = propsRef.current;

      const tag = e.target?.tagName;
      if (showItemBrowserRef?.current) {
        if (e.code === 'Escape') {
          e.preventDefault();
          if (onCloseItemBrowser) onCloseItemBrowser();
        }
        return;
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      if (isFloorFadeActive(floorFadeRef)) return;

      pressedKeysRef.current.add(e.code);

      if (e.code === 'KeyF') {
        setShowInventory(prev => !prev);
        return;
      }

      console.log(e.code)
      if (e.code === 'KeyE') {
        if (onExamineOrReveal) onExamineOrReveal();
        return;
      }
      if (e.code === 'Escape') {
        if (gameMenuOpenRef?.current) return;
        if (onCancelModes) onCancelModes();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (emergencyDrinkItem && onEmergencyDrink) {
          onEmergencyDrink(emergencyDrinkItem);
        } else if (triggerWait) {
          triggerWait();
        }
        return;
      }
      if (e.code === 'KeyT') {
        if (onOpenTalents) onOpenTalents();
        return;
      }
      if (e.code === 'KeyU') {
        e.preventDefault();
        if (onOpenItemBrowser) onOpenItemBrowser();
        return;
      }

      if (DIRECTION_KEYS.has(e.code) && !propsRef.current.showItemBrowserRef?.current) {
        syncMoveIntent(true);
      }

      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(e.code)) {
        const index = parseInt(e.code.slice(-1)) - 1;
        const slot = quickslot?.slots?.[index];
        const item = slot?.item_id ? (itemsById?.[slot.item_id] || null) : null;
        if (item) {
          const now = Date.now();
          const isDoubleTap = lastKeyRef.current.key === e.code && (now - lastKeyRef.current.time) < 300;

          if (isDoubleTap) {
            handleToolbarDoubleClick(item);
            lastKeyRef.current = { key: null, time: 0 };
          } else {
            handleToolbarClick(item);
            lastKeyRef.current = { key: e.code, time: now };
          }
        }
      }
    };

    const handleKeyUp = (e) => {
      pressedKeysRef.current.delete(e.code);
      if (DIRECTION_KEYS.has(e.code) && !propsRef.current.showItemBrowserRef?.current) {
        syncMoveIntent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const initialVec = getVector(pressedKeysRef.current);
    if (initialVec.dx !== 0 || initialVec.dy !== 0) {
      ensurePumping();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (pumpRaf !== null) cancelAnimationFrame(pumpRaf);
    };
  }, []);
}
