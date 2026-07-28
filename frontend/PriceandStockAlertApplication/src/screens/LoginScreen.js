// ============================================================
//  src/screens/LoginScreen.js
//  FIXED: Handle email_unverified → redirect to EmailVerification screen
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, BackHandler,
  KeyboardAvoidingView, Platform, StatusBar, Modal,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage           from '@react-native-async-storage/async-storage';
import { Ionicons }           from '@expo/vector-icons';
import { LinearGradient }     from 'expo-linear-gradient';
import { useAuth }            from '../context/AuthContext';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS   = 30 * 60 * 1000;
const LOCKOUT_KEY  = 'login_lockout_until';
const ATTEMPTS_KEY = 'login_attempts';

const formatTimeLeft = (ms) => {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
};

// ── Web Alert Overlay ─────────────────────────────────────────────────────────
let WebAlertOverlay = null;
if (Platform.OS === 'web') {
  const ReactDOM = require('react-dom');

  WebAlertOverlay = ({ visible, title, message, type, onClose }) => {
    if (!visible) return null;
    const isError = type === 'error';
    const color   = isError ? Colors.danger : Colors.success;

    const overlayStyle = {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 99999, padding: '24px', boxSizing: 'border-box',
    };
    const cardStyle = {
      backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      width: '100%', maxWidth: '340px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', boxSizing: 'border-box',
    };
    const iconBoxStyle = {
      width: '72px', height: '72px', borderRadius: '36px',
      backgroundColor: color + '18', display: 'flex',
      justifyContent: 'center', alignItems: 'center', marginBottom: '4px',
    };

    return ReactDOM.createPortal(
      <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div style={cardStyle}>
          <div style={iconBoxStyle}>
            {isError
              ? <svg width="40" height="40" viewBox="0 0 24 24" fill={color}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              : <svg width="40" height="40" viewBox="0 0 24 24" fill={color}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            }
          </div>
          <p style={{ fontSize: '18px', fontWeight: '900', color: Colors.text || '#1a1a2e', textAlign: 'center', margin: 0 }}>{title}</p>
          <p style={{ fontSize: '14px', color: Colors.textMuted || '#666', textAlign: 'center', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-line' }}>{message}</p>
          <button style={{ backgroundColor: color, borderRadius: '12px', paddingTop: '14px', paddingBottom: '14px', width: '100%', border: 'none', cursor: 'pointer', marginTop: '4px' }} onClick={onClose}>
            <p style={{ color: '#fff', fontSize: '16px', fontWeight: '700', textAlign: 'center', margin: 0 }}>OK</p>
          </button>
        </div>
      </div>,
      document.body
    );
  };
}

// ── Native Alert Modal ────────────────────────────────────────────────────────
const NativeAlertModal = ({ visible, title, message, type, onClose }) => {
  const isError = type === 'error';
  const color   = isError ? Colors.danger : Colors.success;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={alertStyles.overlay}>
        <View style={alertStyles.card}>
          <View style={[alertStyles.iconBox, { backgroundColor: color + '18' }]}>
            <Ionicons name={isError ? 'close-circle' : 'checkmark-circle'} size={40} color={color} />
          </View>
          <Text style={alertStyles.title}>{title}</Text>
          <Text style={alertStyles.message}>{message}</Text>
          <TouchableOpacity style={[alertStyles.btn, { backgroundColor: color }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={alertStyles.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const alertStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card:    { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, alignItems: 'center', width: '100%', maxWidth: 340, gap: 12, ...Shadow.lg },
  iconBox: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title:   { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text, textAlign: 'center' },
  message: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  btn:     { borderRadius: Radius.lg, paddingVertical: 14, width: '100%', alignItems: 'center', marginTop: 4 },
  btnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

const AppAlert = (props) => {
  if (Platform.OS === 'web') return <WebAlertOverlay {...props} />;
  return <NativeAlertModal {...props} />;
};

// ════════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ════════════════════════════════════════════════════════════════════════════════
const LoginScreen = ({ navigation }) => {
  const { login }   = useAuth();
  const { width }   = useWindowDimensions();

  const isWide    = width >= 600;
  const cardWidth = isWide ? Math.min(width * 0.45, 420) : width;

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});
  const [attempts, setAttempts] = useState(0);

  const [lockedOut, setLockedOut] = useState(false);
  const [timeLeft,  setTimeLeft]  = useState(0);

  const timerRef        = useRef(null);
  const lockoutUntilRef = useRef(0);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle,   setAlertTitle]   = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType,    setAlertType]    = useState('error');
  const [exitOnClose,  setExitOnClose]  = useState(false);

  const startCountdown = (until) => {
    lockoutUntilRef.current = until;
    const initial = until - Date.now();
    if (initial <= 0) { clearLockout(); return; }
    setTimeLeft(initial);
    setLockedOut(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const remaining = lockoutUntilRef.current - Date.now();
      if (remaining <= 0) { clearInterval(timerRef.current); timerRef.current = null; clearLockout(); }
      else setTimeLeft(remaining);
    }, 1000);
  };

  const stopCountdown = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => { checkLockout(); return () => stopCountdown(); }, []);

  const checkLockout = async () => {
    try {
      const [until, saved] = await Promise.all([
        AsyncStorage.getItem(LOCKOUT_KEY),
        AsyncStorage.getItem(ATTEMPTS_KEY),
      ]);
      if (saved) setAttempts(parseInt(saved, 10));
      if (until) {
        const ms = parseInt(until, 10);
        if (ms - Date.now() > 0) startCountdown(ms);
        else await clearLockout();
      }
    } catch (_) {}
  };

  const clearLockout = async () => {
    stopCountdown();
    setLockedOut(false);
    setTimeLeft(0);
    setAttempts(0);
    lockoutUntilRef.current = 0;
    try { await AsyncStorage.multiRemove([LOCKOUT_KEY, ATTEMPTS_KEY]); } catch (_) {}
  };

  const triggerLockout = async () => {
    const until = Date.now() + LOCKOUT_MS;
    try {
      await AsyncStorage.setItem(LOCKOUT_KEY, String(until));
      await AsyncStorage.setItem(ATTEMPTS_KEY, String(MAX_ATTEMPTS));
    } catch (_) {}
    if (Platform.OS !== 'web') {
      showAlert('Account Temporarily Locked', 'You have reached the maximum number of login attempts. The app will now close.\n\nYou may try again in 30 minutes.', 'error', true);
    } else {
      startCountdown(until);
    }
  };

  const showAlert = (title, message, type = 'error', shouldExit = false) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setExitOnClose(shouldExit);
    setAlertVisible(true);
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (exitOnClose && Platform.OS !== 'web') BackHandler.exitApp();
  };

  const validate = () => {
    const e = {};
    if (!email.trim())                    e.email    = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email    = 'Enter a valid email address.';
    if (!password)                        e.password = 'Password is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (lockedOut) return;
    if (!validate()) return;
    setLoading(true);
    try {
      const source = Platform.OS === 'web' ? 'web-app' : 'mobile-app';
      await login(email.trim().toLowerCase(), password, source);
      setAttempts(0);
      try { await AsyncStorage.multiRemove([LOCKOUT_KEY, ATTEMPTS_KEY]); } catch (_) {}

    } catch (error) {
      const data   = error.response?.data;
      const status = error.response?.status;

      if (status === 429) {
        await triggerLockout();

      } else if (status === 403) {
  if (data?.message?.toLowerCase().includes('admin')) {
          showAlert('Access Restricted', 'Admin access is not allowed here. Please use the dedicated Admin Panel.');

        } else {
          const reason = data?.reason
            ? `Your account has been deactivated.\n\nReason: ${data.reason}\n\nPlease contact support if you have questions.`
            : data?.message || 'Your account has been deactivated. Please contact support.';
          showAlert('Account Deactivated', reason);
        }

      } else if (status === 401 || !status) {
        const n = attempts + 1;
        setAttempts(n);
        try { await AsyncStorage.setItem(ATTEMPTS_KEY, String(n)); } catch (_) {}
        if (n >= MAX_ATTEMPTS) await triggerLockout();
        else {
          const rem = MAX_ATTEMPTS - n;
          showAlert('Login Failed', `Incorrect email or password.\n\n${rem} attempt${rem !== 1 ? 's' : ''} remaining before temporary lockout.`);
        }

      } else {
        const n = attempts + 1;
        setAttempts(n);
        try { await AsyncStorage.setItem(ATTEMPTS_KEY, String(n)); } catch (_) {}
        if (n >= MAX_ATTEMPTS) await triggerLockout();
        else {
          const rem = MAX_ATTEMPTS - n;
          showAlert('Login Failed', `${data?.message || 'Login failed. Please check your credentials.'}\n\n${rem} attempt${rem !== 1 ? 's' : ''} remaining.`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (lockedOut) {
    return (
      <LinearGradient colors={[Colors.primaryDark, Colors.primary, '#1a6bb5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
        <View style={styles.lockoutContainer}>
          <View style={[styles.lockoutCard, { width: Math.min(cardWidth, 420) }]}>
            <View style={styles.lockoutIconBox}>
              <Ionicons name="lock-closed" size={40} color={Colors.danger} />
            </View>
            <Text style={styles.lockoutTitle}>Account Temporarily Locked</Text>
            <Text style={styles.lockoutMessage}>Too many failed login attempts. Please wait before trying again.</Text>
            <View style={styles.timerBox}>
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={styles.timerText}>Try again in {formatTimeLeft(timeLeft)}</Text>
            </View>
            <TouchableOpacity style={styles.lockoutBtn} onPress={clearLockout}>
              <Text style={styles.lockoutBtnText}>Reset (Dev Only)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.primaryDark, Colors.primary, '#1a6bb5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <AppAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={handleAlertClose}
      />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerWrapper}>

            <View style={[styles.logoArea, { width: cardWidth }]}>
              <View style={styles.logoIcon}>
                <Ionicons name="flash" size={isWide ? 40 : 32} color={Colors.accent} />
              </View>
              <Text style={[styles.appName, isWide && styles.appNameWide]}>Price & Stock Alert</Text>
              <Text style={styles.tagline}>Track. Alert. Save.</Text>
            </View>

            <View style={[styles.card, { width: cardWidth }]}>
              <Text style={styles.cardTitle}>Welcome</Text>
              <Text style={styles.cardSubtitle}>Sign in to your account to continue</Text>

              {attempts > 0 && attempts < MAX_ATTEMPTS && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                  <Text style={styles.warningText}>
                    {MAX_ATTEMPTS - attempts} attempt{(MAX_ATTEMPTS - attempts) !== 1 ? 's' : ''} remaining before 30-minute lockout
                  </Text>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                <View style={[styles.inputWrapper, errors.email && styles.inputError, email && styles.inputFocused]}>
                  <Ionicons name="mail-outline" size={18} color={email ? Colors.primary : Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="juan@email.com"
                    placeholderTextColor={Colors.textLight}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setErrors(e => ({ ...e, email: null })); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>PASSWORD</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputWrapper, errors.password && styles.inputError, password && styles.inputFocused]}>
                  <Ionicons name="lock-closed-outline" size={18} color={password ? Colors.primary : Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={Colors.textLight}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setErrors(e => ({ ...e, password: null })); }}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              <TouchableOpacity style={[styles.loginBtn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={[Colors.accent, Colors.accentLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                  {loading
                    ? <ActivityIndicator color={Colors.white} />
                    : <><Text style={styles.btnText}>Sign In</Text><Ionicons name="arrow-forward" size={18} color={Colors.white} /></>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>Don't have an account?</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
                <Text style={styles.registerBtnText}>Create Account</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  circle1:  { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.05)', top: -60, right: -60 },
  circle2:  { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,107,53,0.10)', bottom: 100, left: -40 },
  kav:      { flex: 1 },

  scroll:        { flexGrow: 1, paddingBottom: Spacing.xxxl },
  scrollWide:    { justifyContent: 'center', minHeight: '100%' },
  centerWrapper: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg, width: '100%' },

  logoArea:    { alignItems: 'center', paddingTop: 56, paddingBottom: 28 },
  logoIcon:    { width: 68, height: 68, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  appName:     { color: Colors.white, fontSize: FontSize.xxxl, fontWeight: FontWeight.black, letterSpacing: -0.5, textAlign: 'center' },
  appNameWide: { fontSize: FontSize.xxxl + 4 },
  tagline:     { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.sm, marginTop: 4 },

  card:         { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, alignSelf: 'center', ...Shadow.lg },
  cardTitle:    { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.xl },

  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warning + '15', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.warning + '40' },
  warningText:   { flex: 1, fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.semiBold },

  fieldGroup:  { marginBottom: Spacing.lg },
  fieldLabel:  { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.sm },
  labelRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  forgotText:  { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.primary },

  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md },
  inputFocused: { borderColor: Colors.primary, backgroundColor: Colors.white },
  inputError:   { borderColor: Colors.danger },
  inputIcon:    { marginRight: Spacing.sm },
  input:        { flex: 1, paddingVertical: 14, fontSize: FontSize.base, color: Colors.text },
  eyeBtn:       { padding: Spacing.xs },
  errorText:    { fontSize: FontSize.xs, color: Colors.danger, marginTop: 4 },

  loginBtn:    { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.xl, ...Shadow.accent },
  btnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  btnText:     { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },

  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, gap: Spacing.sm },
  divider:     { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: FontSize.sm, color: Colors.textMuted },

  registerBtn:     { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  registerBtnText: { color: Colors.primary, fontSize: FontSize.base, fontWeight: FontWeight.bold },

  lockoutContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  lockoutCard:      { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, alignItems: 'center', gap: 14, ...Shadow.lg },
  lockoutIconBox:   { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.danger + '15', justifyContent: 'center', alignItems: 'center' },
  lockoutTitle:     { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.text, textAlign: 'center' },
  lockoutMessage:   { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  timerBox:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary + '12', borderRadius: Radius.lg, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: Colors.primary + '30' },
  timerText:        { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
  lockoutBtn:       { marginTop: 4, paddingVertical: 10, paddingHorizontal: 20, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  lockoutBtnText:   { fontSize: FontSize.xs, color: Colors.textMuted },
});

export default LoginScreen;