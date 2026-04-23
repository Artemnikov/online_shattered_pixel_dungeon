export default function LoadingOverlay({ visible }) {
  if (!visible) return null;
  return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <div className="loading-text">Loading Dungeon...</div>
    </div>
  );
}
