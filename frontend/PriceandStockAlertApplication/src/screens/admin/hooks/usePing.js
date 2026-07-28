// hooks/usePing.js
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import apiClient from '../../../api/client';

const PING_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

const usePing = () => {
  const intervalRef = useRef(null);
  const appStateRef = useRef('active');

  const sendPing = async () => {
    try {
      await apiClient.post('/ping');
    } catch {
      // Silently ignore
    }
  };

  const startPing = () => {
    sendPing();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);
  };

  const stopPing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    startPing();

    // AppState listener only works on native — skip on web
    let subscription = null;
    if (Platform.OS !== 'web') {
      subscription = AppState.addEventListener('change', (nextState) => {
        if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
          startPing();
        } else if (nextState.match(/inactive|background/)) {
          stopPing();
        }
        appStateRef.current = nextState;
      });
    }

    return () => {
      stopPing();
      if (subscription) subscription.remove();
    };
  }, []);
};

export default usePing;