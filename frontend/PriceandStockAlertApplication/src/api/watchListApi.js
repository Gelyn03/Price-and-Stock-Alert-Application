// ============================================================
//  src/api/watchListApi.js
//  UPDATED: category param added to addToWatchlist & updateWatchlistItem
// ============================================================

import apiClient from './client';

// ── Get all watchlist items ────────────────────────────────────────────────────
export const getWatchlist = async () => {
  const response = await apiClient.get('/watchlist');
  return response.data;
};

// ── Add a product to the watchlist ────────────────────────────────────────────
export const addToWatchlist = async (
  url,
  targetPrice  = null,
  name         = null,
  currentPrice = null,
  category     = 'uncategorized',   // ← NEW
) => {
  const response = await apiClient.post('/watchlist', {
    url,
    name,
    current_price: currentPrice,
    target_price:  targetPrice,
    category,                        // ← NEW
  });
  return response.data;
};

// ── Remove a product from the watchlist ───────────────────────────────────────
export const removeFromWatchlist = async (watchlistItemId) => {
  const response = await apiClient.delete(`/watchlist/${watchlistItemId}`);
  return response.data;
};

// ── Update target price ────────────────────────────────────────────────────────
export const updateTargetPrice = async (watchlistItemId, targetPrice) => {
  const response = await apiClient.put(
    `/watchlist/${watchlistItemId}/target-price`,
    { target_price: targetPrice },
  );
  return response.data;
};

// ── Update notification preferences ───────────────────────────────────────────
export const updateNotifPreferences = async (watchlistItemId, prefs) => {
  const response = await apiClient.put(
    `/watchlist/${watchlistItemId}/preferences`,
    prefs,
  );
  return response.data;
};

// ── Get price history ─────────────────────────────────────────────────────────
export const getPriceHistory = async (watchlistItemId) => {
  const response = await apiClient.get(`/watchlist/${watchlistItemId}/price-history`);
  return response.data;
};

// ── Get shared watchlist ───────────────────────────────────────────────────────
export const getSharedWatchlist = async (shareToken) => {
  const response = await apiClient.get(`/watchlist/share/${shareToken}`);
  return response.data;
};

// ── Generate share token ───────────────────────────────────────────────────────
export const generateShareToken = async () => {
  const response = await apiClient.post('/watchlist/share');
  return response.data;
};

// ── Update watchlist item (name, url, target price, category) ─────────────────
export const updateWatchlistItem = async (watchlistItemId, data) => {
  const response = await apiClient.put(
    `/watchlist/${watchlistItemId}`,
    data,   // data already includes category from EditModal's onSave
  );
  return response.data;
};