// ============================================================
//  src/screens/EditProfileScreen.js
//  FIXED: Replaced window.alert with proper in-app Modal alert
//  — Consistent with ForgotPasswordScreen modal style
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, StatusBar,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth }        from '../context/AuthContext';
import apiClient          from '../api/client';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

// ── In-App Alert Modal ────────────────────────────────────────────────────────
//  Replaces window.alert() on web — matches ForgotPasswordScreen style
const AppAlertModal = ({ visible, title, message, type = 'error', onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={alertStyles.overlay}>
      <View style={alertStyles.card}>
        <View style={[
          alertStyles.iconBox,
          { backgroundColor: type === 'success' ? Colors.success + '18' : Colors.danger + '18' },
        ]}>
          <Ionicons
            name={type === 'success' ? 'checkmark-circle' : 'close-circle'}
            size={44}
            color={type === 'success' ? Colors.success : Colors.danger}
          />
        </View>
        <Text style={alertStyles.title}>{title}</Text>
        <Text style={alertStyles.message}>{message}</Text>
        <TouchableOpacity
          style={[alertStyles.btn, { backgroundColor: type === 'success' ? Colors.success : Colors.danger }]}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Text style={alertStyles.btnText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const alertStyles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card:     { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, alignItems: 'center', width: '100%', maxWidth: 340, gap: 12, ...Shadow.lg },
  iconBox:  { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title:    { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text, textAlign: 'center' },
  message:  { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  btn:      { borderRadius: Radius.lg, paddingVertical: 14, width: '100%', alignItems: 'center', marginTop: 4 },
  btnText:  { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

// ── Input Field ────────────────────────────────────────────────────────────────
const InputField = ({ label, icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, error, showToggle, onToggle }) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.inputWrapper, error && styles.inputError]}>
      <Ionicons name={icon} size={18} color={Colors.textLight} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {showToggle && (
        <TouchableOpacity onPress={onToggle} style={styles.eyeBtn}>
          <Ionicons name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'} size={18} color={Colors.textLight} />
        </TouchableOpacity>
      )}
    </View>
    {error ? (
      <View style={styles.errorRow}>
        <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    ) : null}
  </View>
);

// ── useAppAlert hook — centralises modal state ─────────────────────────────────
const useAppAlert = () => {
  const [alertState, setAlertState] = useState({
    visible: false, title: '', message: '', type: 'error', onClose: null,
  });

  const showAlert = (title, message, type = 'error', onClose = null) => {
    setAlertState({ visible: true, title, message, type, onClose });
  };

  const hideAlert = () => {
    const cb = alertState.onClose;
    setAlertState(prev => ({ ...prev, visible: false, onClose: null }));
    if (cb) cb();
  };

  return { alertState, showAlert, hideAlert };
};

// ════════════════════════════════════════════════════════════════════════════════
// EDIT PROFILE TAB
// ════════════════════════════════════════════════════════════════════════════════
const EditProfileTab = ({ user, setUser }) => {
  const [name,          setName]          = useState(user?.name  || '');
  const [email,         setEmail]         = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [nameErr,       setNameErr]       = useState('');
  const [emailErr,      setEmailErr]      = useState('');

  const { alertState, showAlert, hideAlert } = useAppAlert();

  const handleSaveProfile = async () => {
    let valid = true;
    setNameErr(''); setEmailErr('');

    if (!name.trim()) { setNameErr('Name is required.'); valid = false; }
    if (!email.trim()) { setEmailErr('Email is required.'); valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr('Enter a valid email address.'); valid = false; }
    if (!valid) return;

    setSavingProfile(true);
    try {
      await apiClient.put('/profile', { name: name.trim(), email: email.trim() });
      if (setUser) setUser(prev => ({ ...prev, name: name.trim(), email: email.trim() }));
      showAlert('Profile Updated! ✅', 'Your profile has been updated successfully.', 'success');
    } catch (error) {
      // Native platforms: use built-in Alert; web: use modal
      if (Platform.OS !== 'web') {
        Alert.alert('Error', error.response?.data?.message || 'Failed to update profile.');
      } else {
        showAlert('Update Failed', error.response?.data?.message || 'Failed to update profile.', 'error');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <View style={styles.tabContent}>
      {/* Modal Alert */}
      <AppAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={hideAlert}
      />

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={18} color={Colors.primary} />
          <Text style={styles.cardTitle}>Personal Information</Text>
        </View>

        <InputField
          label="Full Name"
          icon="person-outline"
          value={name}
          onChangeText={(t) => { setName(t); setNameErr(''); }}
          placeholder="Enter your full name"
          error={nameErr}
        />
        <InputField
          label="Email Address"
          icon="mail-outline"
          value={email}
          onChangeText={(t) => { setEmail(t); setEmailErr(''); }}
          placeholder="Enter your email"
          keyboardType="email-address"
          error={emailErr}
        />

        <TouchableOpacity
          style={[styles.saveBtn, savingProfile && styles.saveBtnDisabled]}
          onPress={handleSaveProfile}
          disabled={savingProfile}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.saveBtnGradient}
          >
            {savingProfile
              ? <ActivityIndicator color={Colors.white} />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
                  <Text style={styles.saveBtnText}>Save Profile</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// CHANGE PASSWORD TAB
// ════════════════════════════════════════════════════════════════════════════════
const ChangePasswordTab = () => {
  const [currentPw,    setCurrentPw]    = useState('');
  const [newPw,        setNewPw]        = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');
  const [savingPw,     setSavingPw]     = useState(false);
  const [showCurrent,  setShowCurrent]  = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [currentPwErr, setCurrentPwErr] = useState('');
  const [newPwErr,     setNewPwErr]     = useState('');
  const [confirmPwErr, setConfirmPwErr] = useState('');

  const { alertState, showAlert, hideAlert } = useAppAlert();

  const handleChangePassword = async () => {
    let valid = true;
    setCurrentPwErr(''); setNewPwErr(''); setConfirmPwErr('');

    if (!currentPw) { setCurrentPwErr('Current password is required.'); valid = false; }
    if (!newPw)     { setNewPwErr('New password is required.'); valid = false; }
    else if (newPw.length < 8) { setNewPwErr('Password must be at least 8 characters.'); valid = false; }
    if (!confirmPw) { setConfirmPwErr('Please confirm your new password.'); valid = false; }
    else if (newPw !== confirmPw) { setConfirmPwErr('Passwords do not match.'); valid = false; }
    if (!valid) return;

    setSavingPw(true);
    try {
      await apiClient.put('/profile/password', {
        current_password:      currentPw,
        password:              newPw,
        password_confirmation: confirmPw,
      });
      // Clear fields after success
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      showAlert('Password Changed! ✅', 'Your password has been updated successfully.', 'success');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to change password.';
      if (msg.toLowerCase().includes('current')) {
        setCurrentPwErr(msg);
      } else if (Platform.OS !== 'web') {
        Alert.alert('Error', msg);
      } else {
        showAlert('Change Failed', msg, 'error');
      }
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <View style={styles.tabContent}>
      {/* Modal Alert */}
      <AppAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={hideAlert}
      />

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="lock-closed-outline" size={18} color={Colors.accent} />
          <Text style={styles.cardTitle}>Change Password</Text>
        </View>

        <InputField
          label="Current Password"
          icon="lock-closed-outline"
          value={currentPw}
          onChangeText={(t) => { setCurrentPw(t); setCurrentPwErr(''); }}
          placeholder="Enter current password"
          secureTextEntry={!showCurrent}
          showToggle
          onToggle={() => setShowCurrent(p => !p)}
          error={currentPwErr}
        />
        <InputField
          label="New Password"
          icon="lock-open-outline"
          value={newPw}
          onChangeText={(t) => { setNewPw(t); setNewPwErr(''); }}
          placeholder="At least 8 characters"
          secureTextEntry={!showNew}
          showToggle
          onToggle={() => setShowNew(p => !p)}
          error={newPwErr}
        />
        <InputField
          label="Confirm New Password"
          icon="shield-checkmark-outline"
          value={confirmPw}
          onChangeText={(t) => { setConfirmPw(t); setConfirmPwErr(''); }}
          placeholder="Re-enter new password"
          secureTextEntry={!showConfirm}
          showToggle
          onToggle={() => setShowConfirm(p => !p)}
          error={confirmPwErr}
        />

        <TouchableOpacity
          style={[styles.saveBtn, savingPw && styles.saveBtnDisabled]}
          onPress={handleChangePassword}
          disabled={savingPw}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentLight]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.saveBtnGradient}
          >
            {savingPw
              ? <ActivityIndicator color={Colors.white} />
              : <>
                  <Ionicons name="key-outline" size={18} color={Colors.white} />
                  <Text style={styles.saveBtnText}>Change Password</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN — with Tab switcher
// ════════════════════════════════════════════════════════════════════════════════
const EditProfileScreen = ({ navigation, route }) => {
  const { user, setUser } = useAuth();

  // Allow ProfileScreen to open directly on Change Password tab
  const initialTab = route?.params?.tab === 'password' ? 'password' : 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  const TABS = [
    { key: 'profile',  label: 'Edit Profile',    icon: 'person-outline'      },
    { key: 'password', label: 'Change Password',  icon: 'lock-closed-outline' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* Header */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {activeTab === 'profile' ? 'Edit Profile' : 'Change Password'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Avatar (only on profile tab) */}
        {activeTab === 'profile' && (
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? Colors.primary : Colors.textLight}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'profile'
          ? <EditProfileTab user={user} setUser={setUser} />
          : <ChangePasswordTab />
        }
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  header:          { paddingTop: 50, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
  headerRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  backBtn:         { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:     { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  avatarWrapper:   { alignItems: 'center', marginTop: Spacing.sm },
  avatar:          { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)' },
  avatarText:      { color: Colors.white, fontSize: FontSize.xxxl, fontWeight: FontWeight.black },

  // Tab Bar
  tabBar:          { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabItem:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive:   { borderBottomColor: Colors.primary },
  tabLabel:        { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textLight },
  tabLabelActive:  { color: Colors.primary, fontWeight: FontWeight.bold },

  // Content
  content:         { padding: Spacing.lg, paddingBottom: 40 },
  tabContent:      { gap: Spacing.md },
  card:            { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.default, gap: Spacing.md },
  cardHeader:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  cardTitle:       { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },

  // Fields
  fieldWrapper:    { gap: 6 },
  fieldLabel:      { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.textMuted, letterSpacing: 0.5 },
  inputWrapper:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.inputBg, paddingHorizontal: Spacing.md, minHeight: 50 },
  inputError:      { borderColor: Colors.danger },
  inputIcon:       { marginRight: Spacing.sm },
  input:           { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 12 },
  eyeBtn:          { padding: 4 },
  errorRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText:       { fontSize: FontSize.xs, color: Colors.danger, flex: 1 },

  // Buttons
  saveBtn:         { borderRadius: Radius.lg, overflow: 'hidden', marginTop: Spacing.sm },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  saveBtnText:     { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.bold },
});

export default EditProfileScreen;