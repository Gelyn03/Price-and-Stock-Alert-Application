// ============================================================
//  src/constants/config.js
//  App-wide Configuration
//  FIXED: Web browser always uses the deployed HTTPS backend
//         even in __DEV__ mode — avoids Mixed Content error
// ============================================================

import { Platform } from 'react-native';

const getBaseUrl = () => {
  const DEV_MACHINE_IP = '10.0.1.101'; // Change if new network/wifi

  // Web browser (chrome/safari) — ALWAYS use the deployed HTTPS backend.
  // Even in __DEV__, the browser enforces Mixed Content policy and will
  // block HTTP requests from an HTTPS page. Using the local IP on web
  // also doesn't make sense since the browser is not on the same LAN.
  if (Platform.OS === 'web') {
    return 'https://apibackend.priceandstockalert.online/api';
  }

  // Mobile (Expo Go / native build)
  if (__DEV__) {
    // Local dev — phone and computer must be on the same WiFi
    return `http://${DEV_MACHINE_IP}:8000/api`;
  }

  // Production mobile build
  return 'https://apibackend.priceandstockalert.online/api';
};

const Config = {
  API_BASE_URL: getBaseUrl(),

  // Always public — used for share links sent to other users
  PUBLIC_API_BASE_URL: 'https://apibackend.priceandstockalert.online/api',

  SUPPORTED_PLATFORMS: ['shopee', 'lazada'],
  PLATFORM_URLS: {
    shopee: 'shopee.ph',
    lazada: 'lazada.com.ph',
  },

  STORAGE_KEYS: {
    AUTH_TOKEN: 'psa_auth_token',
    USER_DATA:  'psa_user_data',
    PUSH_TOKEN: 'psa_push_token',
  },

  NOTIF_TYPES: {
    PRICE_DROP:      'price_drop',
    PRICE_INCREASE:  'price_increase',
    TARGET_PRICE:    'target_price',
    STOCK_AVAILABLE: 'stock_available',
    OUT_OF_STOCK:    'out_of_stock',
  },

  STOCK_STATUS: {
    IN_STOCK:     'in_stock',
    OUT_OF_STOCK: 'out_of_stock',
    UNKNOWN:      'unknown',
  },

  PAGE_SIZE:   15,
  API_TIMEOUT: 15000,
};

export default Config;