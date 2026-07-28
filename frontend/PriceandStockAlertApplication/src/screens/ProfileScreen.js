// ============================================================
//  src/screens/ProfileScreen.js
//  FIXED: Replaced window.prompt with proper in-app ShareModal
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, StatusBar, Platform, Modal,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth }               from '../context/AuthContext';
import apiClient                 from '../api/client';
import { generateShareLink }     from '../utils/shareWatchlist';
import ShareModal                from '../components/ShareModal';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

// ── Web Confirm Modal ──────────────────────────────────────────────────────────
const ConfirmModal = ({ visible, title, message, confirmText, onConfirm, onCancel, destructive }) => {
  if (Platform.OS !== 'web') return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={mStyles.overlay}>
        <View style={mStyles.card}>
          <Text style={mStyles.title}>{title}</Text>
          <Text style={mStyles.message}>{message}</Text>
          <View style={mStyles.btnRow}>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={onCancel}>
              <Text style={mStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[mStyles.confirmBtn, destructive && { backgroundColor: Colors.danger }]} onPress={onConfirm}>
              <Text style={mStyles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const mStyles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:        { backgroundColor: Colors.white, borderRadius: 16, padding: 24, width: '100%', maxWidth: 340, gap: 12 },
  title:       { fontSize: 16, fontWeight: '800', color: Colors.text },
  message:     { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
  btnRow:      { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn:   { flex: 1, padding: 12, borderRadius: 10, backgroundColor: Colors.border, alignItems: 'center' },
  cancelText:  { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  confirmBtn:  { flex: 1, padding: 12, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ── Section Header ─────────────────────────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

// ── Setting Row ────────────────────────────────────────────────────────────────
const SettingRow = ({ icon, iconColor = Colors.primary, label, sub, onPress, loading }) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress || loading} activeOpacity={onPress ? 0.7 : 1}>
    <View style={[styles.settingIcon, { backgroundColor: iconColor + '18' }]}>
      {loading
        ? <ActivityIndicator size="small" color={iconColor} />
        : <Ionicons name={icon} size={18} color={iconColor} />
      }
    </View>
    <View style={styles.settingText}>
      <Text style={styles.settingLabel}>{label}</Text>
      {sub ? <Text style={styles.settingSub}>{sub}</Text> : null}
    </View>
    {onPress && <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />}
  </TouchableOpacity>
);

// ── Profile Screen ─────────────────────────────────────────────────────────────
const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const [loggingOut,      setLoggingOut]      = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [stats,           setStats]           = useState({ watching: null, alertsSent: null, totalSaved: null });
  const [generating,      setGenerating]      = useState(false);
  const [shareModal,      setShareModal]      = useState(false);
  const [shareLink,       setShareLink]       = useState('');

  const isAdmin = user?.role === 'admin';

  const fetchStats = async () => {
    try {
      const [watchRes, notifRes] = await Promise.all([
        apiClient.get('/watchlist'),
        apiClient.get('/notifications?per_page=100'),
      ]);
      const items  = watchRes.data?.data || watchRes.data || [];
      const notifs = notifRes.data?.data || notifRes.data || [];
      const watching   = Array.isArray(items)  ? items.length  : 0;
      const alertsSent = Array.isArray(notifs) ? notifs.length : 0;
      let totalSaved = 0;
      if (Array.isArray(items)) {
        items.forEach(item => {
          const curr = parseFloat(item.product?.current_price || 0);
          const prev = parseFloat(item.product?.prev_price    || 0);
          if (prev > curr) totalSaved += (prev - curr);
        });
      }
      setStats({ watching, alertsSent, totalSaved });
    } catch {}
  };

  useFocusEffect(useCallback(() => { fetchStats(); }, []));

  const handleLogout = () => {
    if (Platform.OS === 'web') setShowLogoutModal(true);
    else Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: performLogout },
    ]);
  };

  const performLogout = async () => {
    setShowLogoutModal(false);
    setLoggingOut(true);
    try { await logout(); } catch (_) {}
  };

  // ── Share Watchlist ──────────────────────────────────────────────────────────
  const handleShare = async () => {
    setGenerating(true);
    try {
      const link = await generateShareLink();
      setShareLink(link);
      setShareModal(true);
    } catch {
      if (Platform.OS === 'web') window.alert('Error\n\nFailed to generate share link. Please try again.');
      else Alert.alert('Error', 'Failed to generate share link. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const formatSaved = (val) => {
    if (val === null) return '—';
    if (val === 0)    return '₱0';
    return '₱' + val.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const statItems = [
    { label: 'Watching',    value: stats.watching   !== null ? String(stats.watching)   : '—' },
    { label: 'Alerts Sent', value: stats.alertsSent !== null ? String(stats.alertsSent) : '—' },
    { label: 'Total Saved', value: formatSaved(stats.totalSaved) },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* Share Modal */}
      <ShareModal
        visible={shareModal}
        link={shareLink}
        onClose={() => setShareModal(false)}
      />

      {/* Logout Confirm Modal (web only) */}
      <ConfirmModal
        visible={showLogoutModal}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        destructive
        onConfirm={performLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* ── Compact Header ── */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={8} color={Colors.white} />
            </View>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email || ''}</Text>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={10} color={Colors.white} />
                <Text style={styles.adminBadgeText}>Administrator</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          {statItems.map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {i < statItems.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      {/* ── Scrollable Content ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {isAdmin && (
          <>
            <SectionHeader title="ADMINISTRATION" />
            <TouchableOpacity style={styles.adminCard} onPress={() => navigation.navigate('AdminPanel')} activeOpacity={0.85}>
              <LinearGradient colors={[Colors.primaryDark, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.adminCardGradient}>
                <View style={styles.adminCardIcon}>
                  <Ionicons name="shield-checkmark" size={22} color={Colors.white} />
                </View>
                <View style={styles.adminCardText}>
                  <Text style={styles.adminCardLabel}>Admin Panel</Text>
                  <Text style={styles.adminCardSub}>Manage users, products & analytics</Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={22} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        <SectionHeader title="ACCOUNT" />
        <View style={styles.settingsCard}>
          <SettingRow icon="person-outline"      label="Edit Profile"    sub="Update your name and email"   onPress={() => navigation.navigate('EditProfile', { tab: 'profile'  })} />
          <View style={styles.divider} />
          <SettingRow icon="lock-closed-outline" label="Change Password" sub="Update your account password" onPress={() => navigation.navigate('EditProfile', { tab: 'password' })} />
        </View>

        <SectionHeader title="NOTIFICATIONS" />
        <View style={styles.settingsCard}>
          <SettingRow icon="notifications-outline" label="Notification Preferences" sub="Manage your price & stock alerts" onPress={() => navigation.navigate('NotificationPreferences')} />
        </View>

        <SectionHeader title="SHARING" />
        <View style={styles.settingsCard}>
          <SettingRow
            icon="share-social-outline"
            iconColor={Colors.accent}
            label="Share My Watchlist"
            sub="Generate a read-only link to share your watchlist"
            onPress={handleShare}
            loading={generating}
          />
        </View>

        <SectionHeader title="ABOUT" />
        <View style={styles.settingsCard}>
          <SettingRow icon="information-circle-outline" label="About PriceAlert" sub="Version 1.0.0 — Capstone Project" />
          <View style={styles.divider} />
          <SettingRow icon="shield-checkmark-outline" iconColor={Colors.success} label="Privacy Policy" sub="Data collection, user rights & more" onPress={() => navigation.navigate('PrivacyPolicy')} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut} activeOpacity={0.85}>
          {loggingOut
            ? <ActivityIndicator color={Colors.danger} />
            : <><Ionicons name="log-out-outline" size={20} color={Colors.danger} /><Text style={styles.logoutText}>Sign Out</Text></>
          }
        </TouchableOpacity>

        <Text style={styles.versionText}>PriceAlert App v1.0 · Capstone Project</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.bg },
  header:            { paddingTop: 48, paddingBottom: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  headerTop:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarWrapper:     { position: 'relative' },
  avatar:            { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  avatarText:        { color: Colors.white, fontSize: FontSize.xl, fontWeight: FontWeight.black },
  verifiedBadge:     { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.white },
  headerInfo:        { flex: 1, gap: 2 },
  userName:          { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.black },
  userEmail:         { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
  adminBadge:        { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.accent, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 2 },
  adminBadgeText:    { color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold },
  statsRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.lg, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  statItem:          { flex: 1, alignItems: 'center' },
  statValue:         { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.black },
  statLabel:         { color: 'rgba(255,255,255,0.65)', fontSize: 9, marginTop: 1 },
  statDivider:       { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  content:           { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.sm },
  sectionHeader:     { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.8, marginTop: Spacing.md, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  settingsCard:      { backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.sm },
  settingRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  settingIcon:       { width: 38, height: 38, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  settingText:       { flex: 1 },
  settingLabel:      { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.text },
  settingSub:        { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  divider:           { height: 1, backgroundColor: Colors.divider, marginLeft: 66 },
  adminCard:         { borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.default },
  adminCardGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  adminCardIcon:     { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  adminCardText:     { flex: 1 },
  adminCardLabel:    { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  adminCardSub:      { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, marginTop: 2 },
  logoutBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.dangerLight, borderRadius: Radius.xl, paddingVertical: 14, marginTop: Spacing.md, ...Shadow.sm },
  logoutText:        { color: Colors.danger, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  versionText:       { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textLight, marginTop: Spacing.md, marginBottom: Spacing.sm },
});

export default ProfileScreen;