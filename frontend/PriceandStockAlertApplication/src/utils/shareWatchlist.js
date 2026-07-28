// src/utils/shareWatchlist.js

import * as Clipboard from 'expo-clipboard';
import apiClient from '../api/client';
import Config    from '../constants/config';

const WEB_BASE_URL = 'https://web.priceandstockalert.online';

export const generateShareLink = async () => {
  // ✅ Always use the public API URL — never the local dev IP
  const res = await apiClient.post('/watchlist/share');

  // Support multiple response shapes from the backend
  const token =
    res.data?.token   ||
    res.data?.data?.token ||
    res.data?.share_token ||
    res.data?.uuid;

  if (!token) throw new Error('No token returned from server');

  const link = `${WEB_BASE_URL}/share/${token}`;

  // Auto-copy to clipboard on web
  try { await Clipboard.setStringAsync(link); } catch {}

  return link;
};