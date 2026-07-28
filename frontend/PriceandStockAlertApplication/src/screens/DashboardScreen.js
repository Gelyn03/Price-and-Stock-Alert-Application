// ============================================================
//  src/screens/DashboardScreen.js
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import apiClient                                          from '../api/client';
import { generateShareLink }                             from '../utils/shareWatchlist';
import { isOnline, saveCache, loadCache, KEYS }          from '../utils/offline-cache';
import OfflineBanner                                     from '../components/OfflineBanner';
import ShareModal                                        from '../components/ShareModal';
import { useAuth }                                       from '../context/AuthContext';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

// ── Greeting ──────────────────────────────────────────────────────────────────
// ✅ Fix: defined outside component so it's not recreated on every render
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// ── Alert Config ───────────────────────────────────────────────────────────────
const ALERT_CONFIG = {
  price_drop:      { icon: 'trending-down',  color: Colors.success,  bg: Colors.successLight,   label: 'Price Drop'     },
  target_price:    { icon: 'pricetag',       color: Colors.accent,   bg: Colors.accent + '18',  label: 'Target Reached' },
  stock_available: { icon: 'cube',           color: Colors.primary,  bg: Colors.primary + '18', label: 'Back in Stock'  },
  price_increase:  { icon: 'trending-up',    color: Colors.danger,   bg: Colors.dangerLight,    label: 'Price Increase' },
  out_of_stock:    { icon: 'alert-circle',   color: Colors.warning,  bg: Colors.warning + '18', label: 'Out of Stock'   },
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ── Alert Row ──────────────────────────────────────────────────────────────────
const AlertRow = ({ notif, onPress }) => {
  const c = ALERT_CONFIG[notif.type] ?? ALERT_CONFIG.price_drop;
  return (
    <TouchableOpacity style={styles.alertRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.alertIcon, { backgroundColor: c.bg }]}>
        <Ionicons name={c.icon} size={18} color={c.color} />
      </View>
      <View style={styles.alertBody}>
        <Text style={styles.alertProduct} numberOfLines={1}>{notif.product?.name || 'Product Alert'}</Text>
        <Text style={styles.alertMsg}     numberOfLines={1}>{notif.message || c.label}</Text>
      </View>
      <View style={styles.alertMeta}>
        <Text style={styles.alertTime}>{timeAgo(notif.created_at)}</Text>
        <Text style={styles.alertView}>View →</Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Dashboard Screen ───────────────────────────────────────────────────────────
const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [stats,        setStats]        = useState({ tracking: 0, activeAlerts: 0, savings: 0, unread: 0 });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [sharingLink,  setSharingLink]  = useState(false);
  const [shareModal,   setShareModal]   = useState(false);
  const [shareLink,    setShareLink]    = useState('');

  // ✅ Fix: memoized so they don't recompute on every render
  const firstName = useMemo(() => user?.name?.split(' ')[0] || 'there', [user?.name]);
  const greeting  = useMemo(() => getGreeting(), []);

  // ── Fetch Dashboard ──────────────────────────────────────────────────────────
  // ✅ Fix: wrapped in useCallback so useFocusEffect dep is stable
  const fetchDashboard = useCallback(async () => {
    const online = await isOnline();
    if (online) {
      try {
        const [watchRes, notifRes] = await Promise.all([
  apiClient.get('/watchlist'),
  apiClient.get('/notifications'), 
]);
        const items  = watchRes.data?.data || watchRes.data || [];
        const notifs = notifRes.data?.data || notifRes.data || [];

        const tracking     = Array.isArray(items)  ? items.length  : 0;
        const activeAlerts = Array.isArray(notifs) ? notifs.filter(n => !n.is_read).length : 0;

        let savings = 0;
        if (Array.isArray(items)) {
          items.forEach(i => {
            // ✅ Fix: NaN guard on savings calculation
            const curr = parseFloat(i.product?.current_price) || 0;
            const prev = parseFloat(i.product?.prev_price)    || 0;
            if (!isNaN(curr) && !isNaN(prev) && prev > curr) savings += (prev - curr);
          });
        }

        const dashData = { tracking, activeAlerts, savings, unread: activeAlerts };
        setStats(dashData);
        setRecentAlerts(Array.isArray(notifs) ? notifs.slice(0, 3) : []);
        await saveCache(KEYS.DASHBOARD, { stats: dashData, alerts: notifs.slice(0, 3) });
      } catch (err) {
        // ✅ Fix: error logged instead of silently swallowed
        console.error('fetchDashboard error:', err);
        const cached = await loadCache(KEYS.DASHBOARD);
        if (cached) {
          setStats(cached.stats || {});
          setRecentAlerts(cached.alerts || []);
        }
      }
    } else {
      const cached = await loadCache(KEYS.DASHBOARD);
      if (cached) {
        setStats(cached.stats || {});
        setRecentAlerts(cached.alerts || []);
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // ✅ Fix: fetchDashboard added to useFocusEffect deps
  useFocusEffect(useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]));

  // ✅ Fix: wrapped in useCallback with fetchDashboard dep
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Share Watchlist ──────────────────────────────────────────────────────────
  const handleShare = async () => {
    setSharingLink(true);
    try {
      const link = await generateShareLink();
      setShareLink(link);
      setShareModal(true);
    } catch (err) {
      // ✅ Fix: error logged
      console.error('handleShare error:', err);
      if (Platform.OS === 'web') window.alert('Error\n\nFailed to generate share link. Please try again.');
    } finally {
      setSharingLink(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* Share Modal */}
      <ShareModal visible={shareModal} link={shareLink} onClose={() => setShareModal(false)} />

      {/* Header */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            {/* ✅ Fix: uses memoized greeting + firstName */}
            <Text style={styles.greeting}>{greeting}, {firstName}! 👋</Text>
            <Text style={styles.subGreeting}>Welcome to your Price Alert Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={22} color={Colors.white} />
            {stats.unread > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{stats.unread > 9 ? '9+' : stats.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <OfflineBanner />

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {/* ── Stat Cards ── */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={[styles.statCard, { borderColor: Colors.primary }]}
              onPress={() => navigation.navigate('Watchlist')}
              activeOpacity={0.8}
            >
              <Text style={styles.statLabel}>Items Tracked</Text>
              <Text style={[styles.statNumber, { color: Colors.primary }]}>{stats.tracking}</Text>
              <Text style={styles.statTap}>Tap to view watchlist →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { borderColor: Colors.success }]}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.8}
            >
              <Text style={styles.statLabel}>Active Alerts</Text>
              <Text style={[styles.statNumber, { color: Colors.success }]}>{stats.activeAlerts}</Text>
              <Text style={styles.statTap}>Tap to view alerts →</Text>
            </TouchableOpacity>
          </View>

          {/* ── Total Savings ── */}
          <TouchableOpacity
            style={styles.savingsCard}
            onPress={() => navigation.navigate('Watchlist')}
            activeOpacity={0.8}
          >
            <View>
              <Text style={styles.savingsLabel}>Total Savings</Text>
              <Text style={styles.savingsAmount}>
                ₱{(stats.savings || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <Text style={styles.savingsTap}>Tap for breakdown →</Text>
          </TouchableOpacity>

          {/* ── Recent Alerts ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {recentAlerts.length === 0 ? (
            <View style={styles.emptyAlertsCard}>
              <Ionicons name="notifications-off-outline" size={36} color={Colors.textLight} />
              <Text style={styles.emptyAlertsTitle}>No alerts yet</Text>
              <Text style={styles.emptyAlertsSub}>Add products to start receiving price alerts.</Text>
            </View>
          ) : (
            <View style={styles.alertsCard}>
              {recentAlerts.map((notif, idx, arr) => (
                <React.Fragment key={notif.id}>
                  <AlertRow notif={notif} onPress={() => navigation.navigate('Notifications')} />
                  {idx < arr.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          )}

          {/* ── Quick Actions ── */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionPrimary}
              onPress={() => navigation.navigate('Watchlist', { screen: 'AddProduct' })}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.quickActionGradient}
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
                <Text style={styles.quickActionPrimaryText}>Add Product</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionSecondary}
              onPress={handleShare}
              disabled={sharingLink}
              activeOpacity={0.85}
            >
              {sharingLink
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <>
                    <Ionicons name="share-social-outline" size={20} color={Colors.primary} />
                    <Text style={styles.quickActionSecondaryText}>Share Watchlist</Text>
                  </>
              }
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:                { flex: 1, backgroundColor: Colors.bg },
  header:                   { paddingTop: 56, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
  headerTop:                { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greeting:                 { color: Colors.white, fontSize: FontSize.xl, fontWeight: FontWeight.black },
  subGreeting:              { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, marginTop: 2 },
  notifBtn:                 { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  notifBadge:               { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.danger, borderRadius: 9999, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.primaryDark, paddingHorizontal: 2 },
  notifBadgeText:           { color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold },
  content:                  { padding: Spacing.lg, paddingBottom: 48, gap: Spacing.md },
  statsRow:                 { flexDirection: 'row', gap: Spacing.md },
  statCard:                 { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1.5, ...Shadow.sm },
  statLabel:                { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semiBold, marginBottom: 4 },
  statNumber:               { fontSize: 36, fontWeight: FontWeight.black, lineHeight: 42 },
  statTap:                  { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 6 },
  savingsCard:              { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Shadow.sm },
  savingsLabel:             { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.semiBold, marginBottom: 4 },
  savingsAmount:            { fontSize: FontSize.xxl, fontWeight: FontWeight.black, color: Colors.accent },
  savingsTap:               { fontSize: FontSize.xs, color: Colors.accent },
  sectionHeader:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:             { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  seeAll:                   { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semiBold },
  alertsCard:               { backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.sm },
  alertRow:                 { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  alertIcon:                { width: 40, height: 40, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  alertBody:                { flex: 1 },
  alertProduct:             { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  alertMsg:                 { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  alertMeta:                { alignItems: 'flex-end', gap: 2 },
  alertTime:                { fontSize: FontSize.xs, color: Colors.textLight },
  alertView:                { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semiBold },
  divider:                  { height: 1, backgroundColor: Colors.divider, marginLeft: 56 + Spacing.md * 2 },
  emptyAlertsCard:          { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.sm, ...Shadow.sm },
  emptyAlertsTitle:         { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  emptyAlertsSub:           { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  quickActionsRow:          { flexDirection: 'row', gap: Spacing.md },
  quickActionPrimary:       { flex: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  quickActionGradient:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderRadius: Radius.lg },
  quickActionPrimaryText:   { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  quickActionSecondary:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.primary, ...Shadow.sm },
  quickActionSecondaryText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});

export default DashboardScreen;