import { useEffect } from 'react';
import AudioManager from './AudioManager';

export default function useAudioUnlock() {
  useEffect(() => {
    const enableAudio = () => {
      AudioManager.play('SILENCE');
      window.removeEventListener('click', enableAudio);
      window.removeEventListener('keydown', enableAudio);
    };
    window.addEventListener('click', enableAudio);
    window.addEventListener('keydown', enableAudio);
    return () => {
      window.removeEventListener('click', enableAudio);
      window.removeEventListener('keydown', enableAudio);
    };
  }, []);
}
