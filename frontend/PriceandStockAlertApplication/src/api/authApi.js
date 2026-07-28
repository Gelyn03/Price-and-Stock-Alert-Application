// ============================================================
//  src/api/authApi.js
//  Authentication API calls — Register, Login, Logout, Profile
//  Price and Stock Alert Application
// ============================================================

import apiClient from './client';
import * as SecureStore from 'expo-secure-store';
import Config from '../constants/config';

// ── Register ───────────────────────────────────────────────────────────────────
export const registerUser = async (name, email, password, passwordConfirmation) => {
  const response = await apiClient.post('/register', {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  });
  return response.data;
};

// ── Login ──────────────────────────────────────────────────────────────────────
export const loginUser = async (email, password) => {
  const response = await apiClient.post('/login', { email, password }, {
    headers: {
      'X-App-Source': 'mobile-web',
    },
  });
  const { token, user } = response.data;

  // Persist token and user data securely on device
  await SecureStore.setItemAsync(Config.STORAGE_KEYS.AUTH_TOKEN, token);
  await SecureStore.setItemAsync(Config.STORAGE_KEYS.USER_DATA, JSON.stringify(user));

  return response.data;
};

// ── Logout ─────────────────────────────────────────────────────────────────────
export const logoutUser = async () => {
  await apiClient.post('/logout');
  await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.AUTH_TOKEN);
  await SecureStore.deleteItemAsync(Config.STORAGE_KEYS.USER_DATA);
};

// ── Get Profile ────────────────────────────────────────────────────────────────
export const getProfile = async () => {
  const response = await apiClient.get('/profile');
  return response.data;
};

// ── Update Profile ─────────────────────────────────────────────────────────────
export const updateProfile = async (data) => {
  const response = await apiClient.put('/profile', data);
  return response.data;
};

// ── Save Expo Push Token to backend ───────────────────────────────────────────
export const savePushToken = async (expoPushToken) => {
  const response = await apiClient.put('/profile/push-token', {
    expo_push_token: expoPushToken,
  });
  return response.data;
};