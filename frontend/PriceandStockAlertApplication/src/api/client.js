// ============================================================
//  src/api/client.js
//  Axios HTTP Client
// ============================================================

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/config';

const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: Config.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
});

// Attach Bearer token to every request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(Config.STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error),
);

// Handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(Config.STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(Config.STORAGE_KEYS.USER_DATA);
    }
    return Promise.reject(error);
  },
);

export default apiClient;