import { useTranslation } from 'react-i18next';
import IconTitle from './IconTitle';
import WndOverlay from './WndOverlay';
import { WindowLevel } from '../game/window/WindowTypes';

// SPD WndInfoPlant.java port: name + description. Plants aren't yet a first-
// class entity in the backend, so this window is presented as a generic
// "tile-with-flavour" card — caller passes a name and description directly.
export default function WndInfoPlant({ name, description, onClose }) {
  const { t } = useTranslation();

  return (
    <WndOverlay id="wnd-info-plant" level={WindowLevel.SECONDARY} onClose={onClose}>
      <div className="wnd-info-card" onClick={(e) => e.stopPropagation()}>
        <IconTitle
          icon={<div style={{ width: 16, height: 16, background: '#3a7a3a', border: '1px solid #444' }} />}
          title={name || t('tile.grass')}
        />
        {description && <div className="wnd-info-desc">{description}</div>}
      </div>
    </WndOverlay>
  );
}
