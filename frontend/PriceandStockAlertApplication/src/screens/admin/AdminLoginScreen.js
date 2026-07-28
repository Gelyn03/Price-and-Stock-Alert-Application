// ============================================================
//  src/screens/admin/AdminLoginScreen.js
//  FIX: Scroll pattern now matches SettingsTab.js —
//       uses Dimensions.get('window').height + overflowY:'auto'
//       so the page scrolls properly when zoomed in on web.
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar, Modal, useWindowDimensions,
  Dimensions,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth }        from '../../context/AuthContext';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';

const MAX_ATTEMPTS = 5;

const AdminLoginScreen = ({ navigation }) => {
  const { login }               = useAuth();
  const { width }               = useWindowDimensions();
  const isWide                  = width >= 600;

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});
  const [attempts, setAttempts] = useState(0);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle,   setAlertTitle]   = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType,    setAlertType]    = useState('error');

  const showAlert = (title, message, type = 'error') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
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
    if (!validate()) return;
    setLoading(true);
    try {
      const result   = await login(email.trim().toLowerCase(), password, 'admin-panel');
      const userData = result?.user ?? result;

      if (userData?.role !== 'admin') {
        showAlert(
          'Access Denied',
          'This portal is for administrators only. Please use the regular login page.',
          'error',
        );
        return;
      }
      setAttempts(0);

    } catch (error) {
      const data   = error.response?.data;
      const status = error.response?.status;

      if (status === 429) {
        showAlert('Too Many Attempts', 'You have been temporarily locked out. Please try again later.');
      } else if (status === 401) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        const remaining = MAX_ATTEMPTS - newAttempts;
        showAlert(
          'Login Failed',
          remaining > 0
            ? `Incorrect email or password.\n\n${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
            : 'Too many failed attempts. Please contact your system administrator.',
        );
      } else if (status === 403) {
        showAlert('Account Deactivated', data?.message || 'Your admin account has been deactivated. Contact your system administrator.');
      } else {
        showAlert('Login Failed', data?.message || 'Unable to sign in. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Same scroll pattern as SettingsTab.js ─────────────────────────────────
  const isWeb      = Platform.OS === 'web';
  const winHeight  = Dimensions.get('window').height;
  const outerStyle = isWeb ? { height: winHeight } : { flex: 1 };
  const scrollStyle = isWeb
    ? { height: '100%', overflowY: 'auto' }
    : { flex: 1 };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.accent1} />
      <View style={styles.accent2} />

      {/* ── Alert Modal ── */}
      <Modal
        visible={alertVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={[
              styles.alertIconBox,
              { backgroundColor: alertType === 'error' ? Colors.danger + '18' : Colors.success + '18' },
            ]}>
              <Ionicons
                name={alertType === 'error' ? 'close-circle' : 'checkmark-circle'}
                size={40}
                color={alertType === 'error' ? Colors.danger : Colors.success}
              />
            </View>
            <Text style={styles.alertTitle}>{alertTitle}</Text>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity
              style={[styles.alertBtn, { backgroundColor: alertType === 'error' ? Colors.danger : Colors.success }]}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.alertBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Scrollable Body — SettingsTab pattern ── */}
      <View style={outerStyle}>
        <ScrollView
          style={scrollStyle}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.centerWrapper}>

            {/* ── Branding ── */}
            <View style={[styles.logoArea, isWide && styles.logoAreaWide]}>
              <View style={styles.logoIcon}>
                <Ionicons name="shield-checkmark" size={36} color="#f59e0b" />
              </View>
              <Text style={styles.appName}>Admin Portal</Text>
              <Text style={styles.appSub}>Price & Stock Alert</Text>
              <View style={styles.restrictedBadge}>
                <Ionicons name="lock-closed" size={11} color="#f59e0b" />
                <Text style={styles.restrictedText}>Authorized Personnel Only</Text>
              </View>
            </View>

            {/* ── Card ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Administrator Sign In</Text>
              <Text style={styles.cardSubtitle}>
                Enter your admin credentials to access the management dashboard.
              </Text>

              {attempts > 0 && attempts < MAX_ATTEMPTS && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning-outline" size={15} color="#f59e0b" />
                  <Text style={styles.warningText}>
                    {MAX_ATTEMPTS - attempts} attempt{(MAX_ATTEMPTS - attempts) !== 1 ? 's' : ''} remaining
                  </Text>
                </View>
              )}

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>ADMIN EMAIL</Text>
                <View style={[styles.inputWrapper, errors.email && styles.inputError, email && styles.inputFocused]}>
                  <Ionicons name="mail-outline" size={18} color={email ? '#f59e0b' : '#64748b'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="admin@priceandstockalert.online"
                    placeholderTextColor="#475569"
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

              {/* Password */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>PASSWORD</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputWrapper, errors.password && styles.inputError, password && styles.inputFocused]}>
                  <Ionicons name="lock-closed-outline" size={18} color={password ? '#f59e0b' : '#64748b'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#475569"
                    value={password}
                    onChangeText={(t) => { setPassword(t); setErrors(e => ({ ...e, password: null })); }}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.loginBtn, loading && { opacity: 0.6 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
                >
                  {loading
                    ? <ActivityIndicator color="#0f172a" />
                    : (
                      <>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#0f172a" />
                        <Text style={styles.btnText}>Sign In to Dashboard</Text>
                        <Ionicons name="arrow-forward" size={16} color="#0f172a" />
                      </>
                    )
                  }
                </LinearGradient>
              </TouchableOpacity>

              {/* Back to user login */}
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>Not an admin?</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                style={styles.userLoginBtn}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.location.href = 'https://web.priceandstockalert.online/login/Login';
                  } else {
                    navigation.navigate('Auth');
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={16} color="#94a3b8" />
                <Text style={styles.userLoginText}>Go to User Login</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerNote}>
              This portal is monitored. Unauthorized access attempts are logged.
            </Text>

          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient:     { flex: 1 },
  accent1:      { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(245,158,11,0.06)', top: -80, right: -80 },
  accent2:      { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(245,158,11,0.04)', bottom: 80, left: -60 },

  scrollContent: {
    padding: 12,
    paddingBottom: 48,
    alignItems: 'center',
  },

  centerWrapper: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    width: '100%',
    maxWidth: 480,
  },

  logoArea:        { alignItems: 'center', paddingTop: 64, paddingBottom: 28, width: '100%', maxWidth: 420 },
  logoAreaWide:    { paddingTop: 80 },
  logoIcon:        { width: 76, height: 76, borderRadius: 22, backgroundColor: 'rgba(245,158,11,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  appName:         { color: '#f8fafc', fontSize: FontSize.xxxl, fontWeight: FontWeight.black, letterSpacing: -0.5 },
  appSub:          { color: 'rgba(248,250,252,0.45)', fontSize: FontSize.sm, marginTop: 2, marginBottom: 10 },
  restrictedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  restrictedText:  { color: '#f59e0b', fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },

  card:            { backgroundColor: '#1e293b', borderRadius: Radius.xxl, padding: Spacing.xxl, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8, marginBottom: Spacing.lg },
  cardTitle:       { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: '#f8fafc', marginBottom: 4 },
  cardSubtitle:    { fontSize: FontSize.sm, color: '#94a3b8', marginBottom: Spacing.xl, lineHeight: 20 },

  warningBanner:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.10)', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  warningText:     { flex: 1, fontSize: FontSize.xs, color: '#f59e0b', fontWeight: FontWeight.semiBold },

  fieldGroup:      { marginBottom: Spacing.lg },
  fieldLabel:      { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#64748b', letterSpacing: 0.8, marginBottom: Spacing.sm },
  labelRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  forgotText:      { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: '#f59e0b' },

  inputWrapper:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: Radius.md, borderWidth: 1.5, borderColor: '#334155', paddingHorizontal: Spacing.md },
  inputFocused:    { borderColor: '#f59e0b' },
  inputError:      { borderColor: Colors.danger },
  inputIcon:       { marginRight: Spacing.sm },
  input:           { flex: 1, paddingVertical: 14, fontSize: FontSize.base, color: '#f8fafc' },
  eyeBtn:          { padding: Spacing.xs },
  errorText:       { fontSize: FontSize.xs, color: Colors.danger, marginTop: 4 },

  loginBtn:        { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.xl },
  btnGradient:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  btnText:         { color: '#0f172a', fontSize: FontSize.md, fontWeight: FontWeight.black },

  dividerRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, gap: Spacing.sm },
  divider:         { flex: 1, height: 1, backgroundColor: '#334155' },
  dividerText:     { fontSize: FontSize.sm, color: '#475569' },

  userLoginBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#334155', borderRadius: Radius.lg, paddingVertical: 13 },
  userLoginText:   { color: '#94a3b8', fontSize: FontSize.base, fontWeight: FontWeight.semiBold },

  footerNote:      { marginTop: Spacing.lg, marginBottom: Spacing.xl, fontSize: FontSize.xs, color: '#475569', textAlign: 'center', maxWidth: 320, lineHeight: 18 },

  alertOverlay:    {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 9999,
    ...(Platform.OS === 'web' ? { position: 'fixed' } : {}),
  },
  alertCard:       { backgroundColor: '#1e293b', borderRadius: Radius.xxl, padding: Spacing.xxl, alignItems: 'center', width: '90%', maxWidth: 340, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  alertIconBox:    { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  alertTitle:      { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: '#f8fafc', textAlign: 'center' },
  alertMessage:    { fontSize: FontSize.sm, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  alertBtn:        { borderRadius: Radius.lg, paddingVertical: 14, width: '100%', alignItems: 'center', marginTop: 4 },
  alertBtnText:    { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

export default AdminLoginScreen;