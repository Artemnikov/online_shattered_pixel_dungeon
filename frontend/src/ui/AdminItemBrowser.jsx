import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ItemIcon from './ItemIcon';

const WEAPON_ENCHANTS = [
  'blazing', 'chilling', 'kinetic', 'shocking',
  'blocking', 'blooming', 'elastic', 'lucky', 'projecting', 'unstable',
  'corrupting', 'grim', 'vampiric',
];
const WEAPON_CURSES = [
  'annoying', 'displacing', 'dazzling', 'explosive',
  'friendly', 'polarized', 'sacrificial', 'wayward',
];
const ARMOR_GLYPHS = [
  'obfuscation', 'swiftness', 'viscosity', 'potential',
  'brimstone', 'stone', 'entanglement', 'repulsion', 'camouflage', 'flow',
  'affection', 'anti_magic', 'thorns',
];
const ARMOR_CURSES = [
  'anti_entropy', 'corrosion', 'displacement', 'metabolism',
  'multiplicity', 'stench', 'overgrowth', 'bulk',
];

function formatName(s) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdminItemBrowser({ catalog, onClose, onGiveItem }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [popupPos, setPopupPos] = useState(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (entry) => entry.name.toLowerCase().includes(q) || entry.category.toLowerCase().includes(q)
    );
  }, [catalog, query]);

  const handleRowClick = useCallback((entry, e) => {
    if (selected?.kind === entry.kind) {
      setSelected(null);
      setPopupPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setSelected(entry);
    setPopupPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
  }, [selected]);

  const closePopup = useCallback(() => {
    setSelected(null);
    setPopupPos(null);
  }, []);

  const give = useCallback((opts = {}) => {
    if (!selected) return;
    onGiveItem({ item_kind: selected.kind, ...opts });
    closePopup();
  }, [selected, onGiveItem, closePopup]);

  useEffect(() => {
    if (!selected) return;
    const handler = (e) => {
      if (e.key === 'Escape') closePopup();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, closePopup]);

  return (
    <div className="talent-overlay" onClick={onClose}>
      <div className="talent-pane item-browser-pane" onClick={(e) => e.stopPropagation()}>
        <div className="talent-header">
          <h2 className="talent-title">{t('admin.giveItem')}</h2>
          <button className="talent-close" onClick={onClose}>&times;</button>
        </div>
        <div className="item-browser-search">
          <input
            type="text"
            placeholder={t('admin.searchItems')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="talent-body item-browser-list" ref={listRef}>
          {filtered.map((entry) => (
            <div
              key={entry.kind}
              className={`item-browser-row${selected?.kind === entry.kind ? ' selected' : ''}`}
              onClick={(e) => handleRowClick(entry, e)}
            >
              <ItemIcon item={{ kind: entry.kind, name: entry.name }} size={28} />
              <span className="item-browser-name">{entry.name}</span>
              <span className="item-browser-category">{entry.category}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="item-browser-empty">{t('admin.noMatch', { query })}</div>
          )}
        </div>
      </div>

      {selected && popupPos && (
        <SpawnPopup
          entry={selected}
          pos={popupPos}
          onGive={give}
        />
      )}
    </div>
  );
}

function SpawnPopup({ entry, pos, onGive }) {
  const popupRef = useRef(null);
  const [step, setStep] = useState('pick');
  const [enchant, setEnchant] = useState('');

  const isWeapon = entry.category === 'weapon';
  const isArmor = entry.category === 'armor';
  const hasEnchantOptions = isWeapon || isArmor;
  const canBeCursed = entry.can_be_cursed;

  const enchants = isWeapon ? WEAPON_ENCHANTS : isArmor ? ARMOR_GLYPHS : [];
  const curses = isWeapon ? WEAPON_CURSES : isArmor ? ARMOR_CURSES : [];

  useEffect(() => {
    if (!popupRef.current) return;
    const el = popupRef.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) el.style.left = `${vw - rect.width - 8}px`;
    if (rect.bottom > vh) el.style.top = `${vh - rect.height - 8}px`;
  }, []);

  return (
    <div
      ref={popupRef}
      className="admin-spawn-popup"
      style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="admin-spawn-popup-header">
        <ItemIcon item={{ kind: entry.kind, name: entry.name }} size={20} />
        <span>{entry.name}</span>
      </div>

      {step === 'pick' && (
        <div className="admin-spawn-popup-buttons">
          <button className="admin-spawn-btn normal" onClick={() => onGive({})}>
            Normal
          </button>
          {canBeCursed && (
            <button
              className="admin-spawn-btn cursed"
              onClick={() => {
                if (hasEnchantOptions) { setStep('cursed'); setEnchant(''); }
                else onGive({ cursed: true });
              }}
            >
              Cursed
            </button>
          )}
          {hasEnchantOptions && (
            <button
              className="admin-spawn-btn inscribed"
              onClick={() => { setStep('inscribe'); setEnchant(''); }}
            >
              Inscribed
            </button>
          )}
        </div>
      )}

      {step === 'cursed' && (
        <div className="admin-spawn-popup-buttons">
          <select
            className="admin-spawn-select"
            value={enchant}
            onChange={(e) => setEnchant(e.target.value)}
          >
            <option value="">Random Curse</option>
            {curses.map((name) => (
              <option key={name} value={name}>{formatName(name)}</option>
            ))}
          </select>
          <div className="admin-spawn-inscribe-actions">
            <button className="admin-spawn-btn back" onClick={() => setStep('pick')}>Back</button>
            <button
              className="admin-spawn-btn cursed"
              onClick={() => onGive({ cursed: true, enchant: enchant || undefined })}
            >
              Give
            </button>
          </div>
        </div>
      )}

      {step === 'inscribe' && (
        <div className="admin-spawn-popup-buttons">
          <select
            className="admin-spawn-select"
            value={enchant}
            onChange={(e) => setEnchant(e.target.value)}
          >
            <option value="">Random Enchantment</option>
            {enchants.map((name) => (
              <option key={name} value={name}>{formatName(name)}</option>
            ))}
          </select>
          <div className="admin-spawn-inscribe-actions">
            <button className="admin-spawn-btn back" onClick={() => setStep('pick')}>Back</button>
            <button
              className="admin-spawn-btn inscribed"
              onClick={() => onGive({ enchant: enchant || undefined })}
            >
              Give
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
