export function addGameLog(text, color = 'default') {
  window.dispatchEvent(new CustomEvent('game-log', { detail: { text, color } }));
}

export function dispatchToast(text) {
  window.dispatchEvent(new CustomEvent('game-toast', { detail: { text } }));
}
