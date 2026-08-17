
import { useTranslation } from 'react-i18next';
import MainMenu from './menu/MainMenu';
import RoomSelection from './menu/RoomSelection';
import CharacterSelection from './CharacterSelection';
import { RESUME_SESSION_KEY, RESUME_RUN_KEY } from './game/useResumeBundle';

export default function Screens({
  gameState, isDesktop, mouseCursorVal,
  roomJoinError, setRoomJoinError, setGameId, setRoomPassword,
  setGameState, gameId, setSelectedClass, setDifficulty,
  setChallenges, setPlayerName, setSessionId,
}) {
  const { t } = useTranslation();

  if (gameState === 'WELCOME') {
    return (
      <>
        <title>{t('app.titleWelcome')}</title>
        <meta name="description" content={t('app.descWelcome')} />
        <div className={isDesktop ? 'desktop-mode' : ''}
             style={isDesktop ? { '--cursor-mouse': mouseCursorVal } : {}}>
          <MainMenu onStart={() => setGameState('ROOMS')} />
        </div>
      </>
    );
  }

  if (gameState === 'ROOMS') {
    return (
      <>
        <title>{t('app.titleSelect')}</title>
        <meta name="description" content={t('app.descSelect')} />
        <div className={isDesktop ? 'desktop-mode' : ''}
             style={isDesktop ? { '--cursor-mouse': mouseCursorVal } : {}}>
          <RoomSelection
            onJoin={(roomId, password) => {
              setRoomJoinError('');
              setGameId(roomId);
              setRoomPassword(password || '');
              setGameState('SELECT');
            }}
            onBack={() => setGameState('WELCOME')}
            joinError={roomJoinError}
            onDismissError={() => setRoomJoinError('')}
          />
        </div>
      </>
    );
  }

  if (gameState === 'SELECT') {
    return (
      <>
        <title>{t('app.titleSelect')}</title>
        <meta name="description" content={t('app.descSelect')} />
        <div className={isDesktop ? 'desktop-mode' : ''}
             style={isDesktop ? { '--cursor-mouse': mouseCursorVal } : {}}>
          <CharacterSelection showDifficulty={gameId !== 'public'} onSelect={(c, d, n, strongerBosses) => {
            const runChallenges = strongerBosses ? 'stronger_bosses' : '';
            setSelectedClass(c);
            setDifficulty(d);
            setChallenges(runChallenges);
            setPlayerName(n);
            const newSession = crypto.randomUUID();
            sessionStorage.setItem(RESUME_SESSION_KEY, newSession);
            sessionStorage.setItem(RESUME_RUN_KEY, JSON.stringify({ class: c, difficulty: d, name: n, challenges: runChallenges, gameId }));
            if (n) localStorage.setItem('opd_last_name', n);
            setSessionId(newSession);
            setGameState('PLAYING');
          }} />
        </div>
      </>
    );
  }

  return null;
}
