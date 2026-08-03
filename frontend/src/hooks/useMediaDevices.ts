import { useState, useEffect } from 'react';
import { MediaDevice } from '../types';

export function useMediaDevices() {
  const [microphones, setMicrophones] = useState<MediaDevice[]>([]);
  const [speakers, setSpeakers] = useState<MediaDevice[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics: MediaDevice[] = [];
      const spks: MediaDevice[] = [];

      devices.forEach((dev) => {
        if (dev.kind === 'audioinput') {
          mics.push({
            deviceId: dev.deviceId,
            label: dev.label || `Microphone ${mics.length + 1}`,
            kind: dev.kind,
          });
        } else if (dev.kind === 'audiooutput') {
          spks.push({
            deviceId: dev.deviceId,
            label: dev.label || `Speaker ${spks.length + 1}`,
            kind: dev.kind,
          });
        }
      });

      setMicrophones(mics);
      setSpeakers(spks);
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      // stop initial stream tracks after getting permission
      stream.getTracks().forEach((track) => track.stop());
      await enumerateDevices();
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err);
      setHasPermission(false);
    }
  };

  useEffect(() => {
    enumerateDevices();
    navigator.mediaDevices?.addEventListener('devicechange', enumerateDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', enumerateDevices);
    };
  }, []);

  return { microphones, speakers, hasPermission, requestPermissions, enumerateDevices };
}
