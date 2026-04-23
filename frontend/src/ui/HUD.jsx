import AudioManager from '../audio/AudioManager';

export default function HUD({ myStats, depth, onSearch }) {
  return (
    <div className="top-left-hud">
      <div className="player-status-card">
        <div className="player-portrait">
          <div className="portrait-inner">👤</div>
        </div>
        <div className="player-details">
          <div className="player-name">{myStats.name}</div>
          <div className="health-bar-container-large">
            <div
              className={`health-bar-fill-large ${myStats.isDowned ? 'downed' : myStats.isRegen ? 'regen' : ''}`}
              style={{ width: `${(myStats.hp / myStats.maxHp) * 100}%` }}
            ></div>
            <div className="health-text-large">{Math.ceil(myStats.hp)} / {myStats.maxHp} HP</div>
          </div>
          <div className="player-floor-label">floor: {depth}</div>
          <button
            type="button"
            className="search-btn"
            onClick={() => { AudioManager.play('CLICK'); onSearch(); }}
          >
            Search (E)
          </button>
        </div>
      </div>
    </div>
  );
}
