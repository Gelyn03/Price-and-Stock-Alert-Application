// ============================================================
//  src/screens/NotificationsScreen.js
//  UPDATED: Platform badge on notification cards
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator, Platform, Linking, Modal,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import { getNotifications, markAsRead, markAllAsRead } from '../api/notificationsApi';
import { isOnline, saveCache, loadCache, KEYS } from '../utils/offline-cache';
import { useAuth }   from '../context/AuthContext';
import OfflineBanner from '../components/OfflineBanner';
import apiClient     from '../api/client';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

const PAGE_SIZE = 10;

const NOTIF_CONFIG = {
  price_drop:      { ionicon: 'trending-down',  color: Colors.success, bg: Colors.successLight,  label: 'Price Drop Alert!'     },
  price_increase:  { ionicon: 'trending-up',    color: Colors.danger,  bg: Colors.dangerLight,   label: 'Price Increase Alert!' },
  target_price:    { ionicon: 'pricetag',       color: Colors.accent,  bg: Colors.accent + '18', label: 'Target Price Reached!' },
  stock_available: { ionicon: 'cube',           color: Colors.primary, bg: Colors.primary + '18',label: 'Back in Stock!'        },
  out_of_stock:    { ionicon: 'alert-circle',   color: Colors.danger,  bg: Colors.dangerLight,   label: 'Out of Stock!'         },
};

// ── Platform config ────────────────────────────────────────────────────────────
const PLATFORM_CONFIG = {
  shopee:    { label: 'Shopee',    color: '#EE4D2D', bg: '#FFF1EE' },
  lazada:    { label: 'Lazada',    color: '#0F146D', bg: '#ECEEFF' },
  dummyjson: { label: 'DummyJSON', color: '#6366f1', bg: '#F0F0FF' },
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

// ── Platform Badge ─────────────────────────────────────────────────────────────
const PlatformBadge = ({ platform }) => {
  if (!platform) return null;
  const config = PLATFORM_CONFIG[platform?.toLowerCase()] ?? {
    label: platform,
    color: Colors.textMuted,
    bg:    Colors.border,
  };
  return (
    <View style={[badgeStyles.badge, { backgroundColor: config.bg }]}>
      <Text style={[badgeStyles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  badge: {
    alignSelf:     'flex-start',
    borderRadius:  4,
    paddingHorizontal: 6,
    paddingVertical:   2,
    marginTop:     4,
  },
  text: {
    fontSize:   10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

// ── Web-safe Confirm Modal ─────────────────────────────────────────────────────
const ConfirmModal = ({ visible, title, message, onConfirm, onCancel }) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>
          <View style={modalStyles.iconBox}>
            <Ionicons name="trash-outline" size={28} color={Colors.danger} />
          </View>
          <Text style={modalStyles.title}>{title}</Text>
          <Text style={modalStyles.message}>{message}</Text>
          <View style={modalStyles.btnRow}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.deleteBtn} onPress={onConfirm} activeOpacity={0.8}>
              <Text style={modalStyles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card:       { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, alignItems: 'center', width: '100%', maxWidth: 320, gap: 10, ...Shadow.lg },
  iconBox:    { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.dangerLight, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title:      { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text, textAlign: 'center' },
  message:    { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  btnRow:     { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, width: '100%' },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: Radius.lg, backgroundColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textMuted },
  deleteBtn:  { flex: 1, paddingVertical: 13, borderRadius: Radius.lg, backgroundColor: Colors.danger, alignItems: 'center' },
  deleteText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.white },
});

// ── Notif Card ─────────────────────────────────────────────────────────────────
const NotifCard = ({ item, onPress, onLinkPress, onDelete }) => {
  const c        = NOTIF_CONFIG[item.type] ?? NOTIF_CONFIG.price_drop;
  const isRead   = !!item.is_read;
  const platform = item.product?.platform ?? null;

  return (
    <TouchableOpacity
      style={[styles.card, !isRead && styles.cardUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.85}
    >
      <View style={[styles.iconCircle, { backgroundColor: c.bg }]}>
        <Ionicons name={c.ionicon} size={20} color={c.color} />
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, !isRead && styles.cardTitleUnread]}>{c.label}</Text>
        <Text style={styles.cardProduct} numberOfLines={1}>
          {item.product?.name || item.title || 'Product Alert'}
        </Text>
        {/* ── Platform Badge ── */}
        <PlatformBadge platform={platform} />
        <Text style={styles.cardMsg} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.cardTime}>
          {timeAgo(item.created_at)}{isRead ? ' • Read' : ''}
        </Text>
      </View>

      <View style={styles.actionColumn}>
        {item.product?.url && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onLinkPress(item.product.url)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="link-outline" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
        </TouchableOpacity>
        {!isRead && !item.product?.url && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );
};

// ── Notifications Screen ───────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const { setUnreadCount } = useAuth();
  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [deletingId,    setDeletingId]    = useState(null);
  const [confirmModal,  setConfirmModal]  = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [visibleCount,  setVisibleCount]  = useState(PAGE_SIZE);

  const fetchNotifs = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    if (isRefresh) setVisibleCount(PAGE_SIZE);
    const online = await isOnline();
    try {
      const res  = online ? await getNotifications() : null;
      const data = online ? (res.data?.data ?? res.data ?? []) : await loadCache(KEYS.NOTIFICATIONS);
      const list = Array.isArray(data) ? data : [];
      setItems(list);
      if (online) await saveCache(KEYS.NOTIFICATIONS, list);
      setUnreadCount(list.filter(n => !n.is_read).length);
    } catch (err) {
      console.log('Fetch Error', err);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [setUnreadCount]);

  useFocusEffect(useCallback(() => {
    setVisibleCount(PAGE_SIZE);
    fetchNotifs();
  }, [fetchNotifs]));

  const handleCardPress = async (notification) => {
    if (!notification.is_read) {
      setItems(prev => {
        const updated = prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n);
        setUnreadCount(updated.filter(n => !n.is_read).length);
        return updated;
      });
      markAsRead(notification.id).catch(() => {});
    }
    navigation.navigate('NotificationDetail', {
      notification: { ...notification, is_read: true, time_ago: timeAgo(notification.created_at) },
    });
  };

  const handleDelete = (id) => {
    if (Platform.OS === 'web') {
      setPendingDelete(id);
      setConfirmModal(true);
    } else {
      Alert.alert('Delete Alert', 'Remove this notification?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDelete(id) },
      ]);
    }
  };

  const performDelete = async (id) => {
    setConfirmModal(false);
    setPendingDelete(null);
    setDeletingId(id);
    try {
      await apiClient.delete(`/notifications/${id}`);
    } catch {
      console.log('Delete API not available, removing locally only.');
    } finally {
      setItems(prev => {
        const updated = prev.filter(n => n.id !== id);
        setUnreadCount(updated.filter(n => !n.is_read).length);
        saveCache(KEYS.NOTIFICATIONS, updated);
        return updated;
      });
      setDeletingId(null);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      Alert.alert('Error', 'Failed to mark all as read.');
    }
  };

  const handleLinkPress = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link.'));
  };

  const handleSeeMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  };

  const unreadCount    = items.filter(n => !n.is_read).length;
  const displayedItems = items.slice(0, visibleCount);
  const remaining      = items.length - displayedItems.length;

  return (
    <View style={styles.container}>

      <ConfirmModal
        visible={confirmModal}
        title="Delete Notification"
        message="Are you sure you want to remove this notification?"
        onConfirm={() => performDelete(pendingDelete)}
        onCancel={() => { setConfirmModal(false); setPendingDelete(null); }}
      />

      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {items.length > 0 && (
            <Text style={styles.headerSub}>
              {items.length} total · {unreadCount} unread
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAll} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done-outline" size={14} color={Colors.white} />
            <Text style={styles.markAllText}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <OfflineBanner />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={n => String(n.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifs(true)}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={56} color={Colors.border} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>You'll see price and stock alerts here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            deletingId === item.id ? (
              <View style={[styles.card, styles.deletingCard]}>
                <ActivityIndicator size="small" color={Colors.danger} />
                <Text style={styles.deletingText}>Deleting...</Text>
              </View>
            ) : (
              <NotifCard
                item={item}
                onPress={handleCardPress}
                onLinkPress={handleLinkPress}
                onDelete={handleDelete}
              />
            )
          )}
          ListFooterComponent={
            remaining > 0 ? (
              <TouchableOpacity
                style={styles.seeMoreBtn}
                onPress={handleSeeMore}
                activeOpacity={0.8}
              >
                <View style={styles.seeMoreInner}>
                  <Ionicons name="chevron-down-circle-outline" size={20} color={Colors.primary} />
                  <Text style={styles.seeMoreText}>See more notifications</Text>
                  <View style={styles.seeMoreBadge}>
                    <Text style={styles.seeMoreBadgeText}>{remaining}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : items.length > PAGE_SIZE ? (
              <View style={styles.allSeenRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
                <Text style={styles.allSeenText}>You've seen all notifications</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg },
  centered:         { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:           { paddingTop: 52, paddingBottom: Spacing.md, paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle:      { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.white },
  headerSub:        { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  markAllBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 7, paddingHorizontal: 12, borderRadius: Radius.full },
  markAllText:      { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  list:             { padding: Spacing.md, paddingBottom: 40, gap: Spacing.sm },

  empty:            { alignItems: 'center', marginTop: 80, gap: Spacing.sm },
  emptyTitle:       { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  emptySub:         { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },

  card:             { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.md, gap: Spacing.md, ...Shadow.sm },
  cardUnread:       { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  iconCircle:       { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  cardBody:         { flex: 1 },
  cardTitle:        { fontSize: FontSize.sm, color: Colors.textMuted },
  cardTitleUnread:  { fontWeight: FontWeight.black, color: Colors.text },
  cardProduct:      { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  cardMsg:          { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  cardTime:         { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 4 },
  actionColumn:     { alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionBtn:        { padding: 5 },
  unreadDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },

  deletingCard:     { justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, minHeight: 72, opacity: 0.6 },
  deletingText:     { fontSize: FontSize.sm, color: Colors.danger },

  seeMoreBtn:       { marginTop: Spacing.sm, marginHorizontal: Spacing.md, borderRadius: Radius.xl, backgroundColor: Colors.white, ...Shadow.sm },
  seeMoreInner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: Spacing.sm },
  seeMoreText:      { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  seeMoreBadge:     { backgroundColor: Colors.primary, borderRadius: Radius.full, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  seeMoreBadgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.black },

  allSeenRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.lg },
  allSeenText:      { fontSize: FontSize.sm, color: Colors.success, fontWeight: FontWeight.semiBold },
});