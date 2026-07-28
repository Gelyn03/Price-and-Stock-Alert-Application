// ============================================================
//  src/screens/NotificationPreferencesScreen.js
//  FIXED: Custom in-app modal alert (web + mobile)
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, StatusBar, Modal,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { updateGlobalNotifPrefs, getGlobalNotifPrefs } from '../api/notificationsApi';
import { updateNotifPreferences } from '../api/watchListApi';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

// ── Custom In-App Alert Modal ─────────────────────────────────────────────────
const AppAlert = ({ visible, title, message, type, onClose }) => {
  const isSuccess = type === 'success';
  const iconName  = isSuccess ? 'checkmark-circle' : 'close-circle';
  const iconColor = isSuccess ? Colors.success : Colors.danger;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={alertStyles.overlay}>
        <View style={alertStyles.card}>
          <View style={[alertStyles.iconBox, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={iconName} size={40} color={iconColor} />
          </View>
          <Text style={alertStyles.title}>{title}</Text>
          <Text style={alertStyles.message}>{message}</Text>
          <TouchableOpacity
            style={[alertStyles.btn, { backgroundColor: iconColor }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={alertStyles.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const alertStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card:    { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, alignItems: 'center', width: '100%', maxWidth: 340, gap: 12, ...Shadow.lg },
  iconBox: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title:   { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text, textAlign: 'center' },
  message: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  btn:     { borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 40, marginTop: 4, width: '100%', alignItems: 'center' },
  btnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

// ── Toggle ─────────────────────────────────────────────────────────────────────
const Toggle = ({ value, onToggle, disabled }) => (
  <TouchableOpacity
    onPress={onToggle}
    disabled={disabled}
    activeOpacity={0.8}
    style={[styles.toggle, { backgroundColor: value ? Colors.success : Colors.border }]}
  >
    <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
  </TouchableOpacity>
);

// ── Screen ─────────────────────────────────────────────────────────────────────
const NotificationPreferencesScreen = ({ route, navigation }) => {
  const item = route?.params?.item || null;

  const [perProduct, setPerProduct] = useState({
    notif_price_drop:   item ? !!item.notif_price_drop   : true,
    notif_target_price: item ? !!item.notif_target_price : true,
    notif_stock:        item ? !!item.notif_stock        : false,
  });

  const [global, setGlobal] = useState({ enable_all: true });
  const [saving,   setSaving]   = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(!item); // load from API if no item

  // ── Load saved global prefs from backend (when opened from Profile) ──────────
  React.useEffect(() => {
    if (!item) {
      // No item passed — load global prefs from backend
      getGlobalNotifPrefs()
        .then(data => {
          setPerProduct({
            notif_price_drop:   !!data.notif_price_drop,
            notif_target_price: !!data.notif_target_price,
            notif_stock:        !!data.notif_stock,
          });
          setGlobal({ enable_all: data.enable_all !== false });
        })
        .catch(() => {}) // keep defaults on error
        .finally(() => setLoadingPrefs(false));
    }
  }, []);

  // Alert modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle,   setAlertTitle]   = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType,    setAlertType]    = useState('success');
  const [alertOnClose, setAlertOnClose] = useState(null);

  const showAlert = (title, message, type = 'success', onClose = null) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertOnClose(() => onClose);
    setAlertVisible(true);
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertOnClose) alertOnClose();
  };

  const togglePerProduct = (key) => setPerProduct(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleGlobal     = (key) => setGlobal(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (item) {
        await updateNotifPreferences(item.id, perProduct);
      }
      await updateGlobalNotifPrefs({ ...perProduct, ...global });
      showAlert(
        'Preferences Saved! ✅',
        'Your notification preferences have been updated successfully.',
        'success',
        () => navigation.goBack(),
      );
    } catch {
      showAlert('Error', 'Failed to save preferences. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const perProductItems = [
    { key: 'notif_price_drop',   icon: 'trending-down-outline', label: 'Price Drop Alert',         sub: 'Notify when price decreases'         },
    { key: 'notif_target_price', icon: 'pricetag-outline',      label: 'Target Price Alert',       sub: 'Notify when target price is reached' },
    { key: 'notif_stock',        icon: 'cube-outline',          label: 'Stock Availability Alert', sub: 'Notify when item is back in stock'   },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* Custom Alert Modal */}
      <AppAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={handleAlertClose}
      />

      {/* Header */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Preferences</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {loadingPrefs ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Per-Product Alerts */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>Per-Product Alerts</Text>
          </View>
          {item?.product?.name && (
            <Text style={styles.cardSub}>
              {item.product.name.slice(0, 50)}{item.product.name.length > 50 ? '...' : ''}
            </Text>
          )}

          {perProductItems.map((pref, idx, arr) => (
            <View key={pref.key} style={[styles.prefRow, idx < arr.length - 1 && styles.prefRowBorder]}>
              <View style={styles.prefIconWrapper}>
                <Ionicons name={pref.icon} size={18} color={Colors.primary} />
              </View>
              <View style={styles.prefInfo}>
                <Text style={styles.prefLabel}>{pref.label}</Text>
                <Text style={styles.prefSub}>{pref.sub}</Text>
              </View>
              <Toggle value={perProduct[pref.key]} onToggle={() => togglePerProduct(pref.key)} disabled={saving} />
            </View>
          ))}
        </View>

        {/* Global Preferences */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="settings-outline" size={18} color={Colors.accent} />
            <Text style={styles.cardTitle}>Global Preferences</Text>
          </View>
          <Text style={styles.cardSub}>Apply to all products in your watchlist</Text>

          <View style={styles.prefRow}>
            <View style={[styles.prefIconWrapper, { backgroundColor: Colors.primary + '18' }]}>
              <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>Enable All Notifications</Text>
              <Text style={styles.prefSub}>Master switch for all alert types</Text>
            </View>
            <Toggle value={global.enable_all} onToggle={() => toggleGlobal('enable_all')} disabled={saving} />
          </View>
        </View>

        {/* Current Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Current Settings</Text>
          <View style={styles.statusGrid}>
            {perProductItems.map(p => (
              <View key={p.key} style={styles.statusItem}>
                <Ionicons
                  name={perProduct[p.key] ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={perProduct[p.key] ? Colors.success : Colors.textLight}
                />
                <Text style={[styles.statusText, { color: perProduct[p.key] ? Colors.success : Colors.textLight }]}>
                  {p.label.replace(' Alert', '')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.saveBtnGradient}
          >
            {saving
              ? <ActivityIndicator color={Colors.white} />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                  <Text style={styles.saveBtnText}>Save Preferences</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  header:          { paddingTop: 50, paddingBottom: Spacing.md, paddingHorizontal: Spacing.lg },
  headerRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:         { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:     { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  content:         { padding: Spacing.lg, paddingBottom: 48, gap: Spacing.md },
  card:            { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.default, gap: 0 },
  cardHeader:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  cardTitle:       { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  cardSub:         { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.md },
  prefRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  prefRowBorder:   { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  prefIconWrapper: { width: 38, height: 38, borderRadius: Radius.sm, backgroundColor: Colors.tagBg, justifyContent: 'center', alignItems: 'center' },
  prefInfo:        { flex: 1 },
  prefLabel:       { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.text },
  prefSub:         { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  toggle:          { width: 46, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  toggleThumb:     { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.white, ...Shadow.sm },
  toggleThumbOn:   { alignSelf: 'flex-end' },
  // Status Card
  statusCard:      { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.sm },
  statusTitle:     { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.md },
  statusGrid:      { gap: Spacing.sm },
  statusItem:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusText:      { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  // Save Button
  saveBtn:         { borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.default },
  saveBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  saveBtnText:     { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.black, letterSpacing: 0.5 },
});

export default NotificationPreferencesScreen;