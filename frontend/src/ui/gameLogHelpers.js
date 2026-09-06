export function addGameLog(text, color = 'default') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game-log', { detail: { text, color } }));
  }
}

export function dispatchToast(text) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game-toast', { detail: { text } }));
  }
}
