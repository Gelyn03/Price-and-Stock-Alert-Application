// ============================================================
//  src/api/notificationsApi.js
//  Notifications API calls
//  Price and Stock Alert Application
// ============================================================

import apiClient from './client';

// ── Get all notifications ──────────────────────────────────────────────────────
export const getNotifications = async (page = 1) => {
  const response = await apiClient.get(`/notifications?page=${page}`);
  return response.data;
};

// ── Mark a single notification as read ────────────────────────────────────────
export const markAsRead = async (notificationId) => {
  const response = await apiClient.put(`/notifications/${notificationId}/read`);
  return response.data;
};

// ── Mark ALL notifications as read ────────────────────────────────────────────
export const markAllAsRead = async () => {
  const response = await apiClient.put('/notifications/read-all');
  return response.data;
};

// ── Get unread notification count ─────────────────────────────────────────────
export const getUnreadCount = async () => {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data;
};

// ── GET global notification preferences ───────────────────────────────────────
export const getGlobalNotifPrefs = async () => {
  const response = await apiClient.get('/notifications/preferences');
  return response.data;
};

// ── PUT global notification preferences ───────────────────────────────────────
// prefs = { notif_price_drop, notif_target_price, notif_stock, enable_all }
export const updateGlobalNotifPrefs = async (prefs) => {
  const response = await apiClient.put('/notifications/preferences', prefs);
  return response.data;
};