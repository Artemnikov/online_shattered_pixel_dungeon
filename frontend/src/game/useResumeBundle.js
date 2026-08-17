export const RESUME_SESSION_KEY = 'opd_session';
export const RESUME_RUN_KEY = 'opd_run';

// Read once at module load (not per-render): if a prior tab session left a
// resumable run behind, skip WELCOME/SELECT entirely and reconnect straight
// into PLAYING with the same session id -- the backend's WS connect() rebinds
// to the still-alive-or-ghosted hero automatically (see main.py ConnectionManager).
// If that hero already died or the session is gone, the same class/difficulty/
// name/challenges are reused as connect params, so a lost cause still yields a
// sane state instead of a special "resume failed" screen.
function readResumeBundle() {
  try {
    const session = sessionStorage.getItem(RESUME_SESSION_KEY);
    const raw = sessionStorage.getItem(RESUME_RUN_KEY);
    if (!session || !raw) return null;
    const run = JSON.parse(raw);
    if (!run || typeof run !== 'object' || !run.class) return null;
    return { session, class: run.class, difficulty: run.difficulty || 'normal', name: run.name || '', challenges: run.challenges || '', gameId: run.gameId || 'public' };
  } catch {
    return null;
  }
}

export function clearResumeBundle() {
  sessionStorage.removeItem(RESUME_SESSION_KEY);
  sessionStorage.removeItem(RESUME_RUN_KEY);
}

export const RESUME = readResumeBundle();
