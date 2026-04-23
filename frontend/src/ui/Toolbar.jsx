import AudioManager from '../audio/AudioManager';
import itemsSprite from '../assets/pixel-dungeon/sprites/items.png';
import { getItemSpriteCoords } from '../rendering/sprites';

export default function Toolbar({
  items,
  targetingMode,
  equippedItems,
  onSlotClick,
  onSlotDoubleClick,
  onOpenInventory,
}) {
  return (
    <div className="toolbar-container">
      <div className="toolbar">
        {items.map((item, i) => {
          const spriteCoords = item ? getItemSpriteCoords(item.name, item.type) : null;
          return (
            <div
              key={i}
              className={`toolbar-slot ${targetingMode && equippedItems.weapon?.id === item?.id ? 'targeting-active' : ''}`}
              onClick={() => { AudioManager.play('CLICK'); onSlotClick(item); }}
              onDoubleClick={() => onSlotDoubleClick(item)}
            >
              {item ? (
                <>
                  <div className="toolbar-item-sprite">
                    <div style={{
                      width: '16px',
                      height: '16px',
                      backgroundImage: `url(${itemsSprite})`,
                      backgroundPosition: `-${spriteCoords[0] * 16}px -${spriteCoords[1] * 16}px`,
                      transform: 'scale(2)',
                      transformOrigin: 'top left',
                      imageRendering: 'pixelated'
                    }}></div>
                  </div>
                  <div className="toolbar-item-name">{item.name.substring(0, 8)}..</div>
                </>
              ) : <span className="slot-number">{i + 1}</span>}
            </div>
          );
        })}
      </div>

      <button className="inventory-toggle-btn-bottom" onClick={() => { AudioManager.play('CLICK'); onOpenInventory(); }}>
        🎒
      </button>
    </div>
  );
}
