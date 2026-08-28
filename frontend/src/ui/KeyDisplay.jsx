import { memo } from 'react';
import ItemIcon from './ItemIcon';

// Mirrors SPD's KeyDisplay: a small icon+count row for keys held on the
// current floor. Keys never enter the inventory grid (see Player.add_key in
// the backend) — this is their only visual representation.
function KeyDisplay({ keys, depth }) {
  const held = (keys || []).filter((k) => k.depth === depth && k.quantity > 0);
  if (held.length === 0) return null;

  return (
    <div className="key-display">
      {held.map((k) => (
        <div className="key-display__pill" key={`${k.key_id}:${k.depth}`} title={k.name || k.key_id}>
          <ItemIcon item={{ name: k.name, type: 'key' }} size={20} />
          {k.quantity > 1 && <span className="inv-qty">{k.quantity}</span>}
        </div>
      ))}
    </div>
  );
}

export default memo(KeyDisplay);
