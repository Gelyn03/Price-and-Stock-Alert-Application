// ============================================================
//  src/utils/offlineCache.js
//  Offline Cache Utility — AsyncStorage helpers
//  Price and Stock Alert Application
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const KEYS = {
  WATCHLIST:     'cache_watchlist',
  NOTIFICATIONS: 'cache_notifications',
  DASHBOARD:     'cache_dashboard',
  TIMESTAMP:     'cache_timestamp_',
};

const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// ── Network check ──────────────────────────────────────────────────────────────
export const isOnline = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable !== false;
  } catch {
    return true; // Assume online if check fails
  }
};

// ── Save cache ─────────────────────────────────────────────────────────────────
export const saveCache = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
    await AsyncStorage.setItem(KEYS.TIMESTAMP + key, Date.now().toString());
  } catch (e) {
    console.warn('Cache save failed:', e);
  }
};

// ── Load cache ─────────────────────────────────────────────────────────────────
export const loadCache = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ── Check if cache is fresh ────────────────────────────────────────────────────
export const isCacheFresh = async (key) => {
  try {
    const ts = await AsyncStorage.getItem(KEYS.TIMESTAMP + key);
    if (!ts) return false;
    return Date.now() - parseInt(ts) < CACHE_EXPIRY_MS;
  } catch {
    return false;
  }
};

// ── Clear all cache ────────────────────────────────────────────────────────────
export const clearAllCache = async () => {
  try {
    await AsyncStorage.multiRemove([
      KEYS.WATCHLIST,
      KEYS.NOTIFICATIONS,
      KEYS.DASHBOARD,
    ]);
  } catch (e) {
    console.warn('Cache clear failed:', e);
  }
};

export { KEYS };