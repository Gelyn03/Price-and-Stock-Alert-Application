// ============================================================
//  src/screens/RegisterScreen.js
//  UPDATED: Fixed modal on mobile Chrome, strong password validation,
//           email verification flow
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth }        from '../context/AuthContext';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

// ── Password strength checker ─────────────────────────────────────────────────
const checkPasswordStrength = (password) => {
  const checks = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    lower:   /[a-z]/.test(password),
    number:  /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
  const passed   = Object.values(checks).filter(Boolean).length;
  const strength = passed <= 2 ? 'Weak' : passed <= 4 ? 'Fair' : 'Strong';
  const color    = passed <= 2 ? '#ef4444' : passed <= 4 ? '#f59e0b' : '#16a34a';
  return { checks, passed, strength, color };
};

// ── Password Requirement Row ──────────────────────────────────────────────────
const Requirement = ({ met, label }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
    <Ionicons
      name={met ? 'checkmark-circle' : 'ellipse-outline'}
      size={14}
      color={met ? '#16a34a' : Colors.textLight}
    />
    <Text style={{ fontSize: 11, color: met ? '#16a34a' : Colors.textLight }}>
      {label}
    </Text>
  </View>
);

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: ''
  });
  const [showPass,        setShowPass]        = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [errors,          setErrors]          = useState({});
  const [passwordFocused, setPasswordFocused] = useState(false);

  // ── Alert Modal ───────────────────────────────────────────────────────────
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig,  setAlertConfig]  = useState({
    title: '', message: '', type: 'error', onClose: null
  });

  const showAlert = (title, message, type = 'error', onClose = null) => {
    setAlertConfig({ title, message, type, onClose });
    setAlertVisible(true);
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertConfig.onClose) alertConfig.onClose();
  };

  const update = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: null }));
  };

  // ── Password strength ─────────────────────────────────────────────────────
  const strength = checkPasswordStrength(form.password);

  const validate = () => {
    const e = {};
    if (!form.name.trim())
      e.name = 'Full name is required.';
    if (!form.email.trim())
      e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email))
      e.email = 'Enter a valid email address.';
    if (!form.password)
      e.password = 'Password is required.';
    else if (!strength.checks.length)
      e.password = 'Password must be at least 8 characters.';
    else if (!strength.checks.upper)
      e.password = 'Password must contain at least one uppercase letter.';
    else if (!strength.checks.lower)
      e.password = 'Password must contain at least one lowercase letter.';
    else if (!strength.checks.number)
      e.password = 'Password must contain at least one number.';
    else if (!strength.checks.special)
      e.password = 'Password must contain at least one special character (!@#$%...).';
    if (!form.confirmPassword)
      e.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(
  form.name.trim(),
  form.email.trim().toLowerCase(),
  form.password,
  form.confirmPassword
);
setLoading(false);
showAlert(
  'Registration Successful',
  'Your account has been created. You can now sign in.',
  'success',
  () => navigation.navigate('Login')
);
    } catch (error) {
      setLoading(false);
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const errs = error.response.data.errors;
        setErrors({
          ...(errs.name     && { name:            errs.name[0] }),
          ...(errs.email    && { email:            errs.email[0] }),
          ...(errs.password && { password:         errs.password[0] }),
        });
      } else {
        const msg = error.response?.data?.message || 'Registration failed. Please try again.';
        showAlert('Registration Failed', msg, 'error');
      }
    }
  };

  const renderField = (label, fieldKey, placeholder, options = {}) => {
    const {
      keyboardType   = 'default',
      autoCapitalize = 'none',
      isPassword     = false,
      showToggle     = false,
      onToggle,
      onFocus,
      onBlur,
    } = options;

    const iconName = fieldKey === 'name'
      ? 'person-outline'
      : fieldKey === 'email'
      ? 'mail-outline'
      : 'lock-closed-outline';

    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={[
          styles.inputWrapper,
          errors[fieldKey] && styles.inputError,
          form[fieldKey]   && styles.inputFocused,
        ]}>
          <Ionicons
            name={iconName}
            size={18}
            color={form[fieldKey] ? Colors.primary : Colors.textLight}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={Colors.textLight}
            value={form[fieldKey]}
            onChangeText={(t) => update(fieldKey, t)}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            secureTextEntry={isPassword && !showToggle}
            returnKeyType="next"
            blurOnSubmit={false}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          {isPassword && (
            <TouchableOpacity onPress={onToggle} style={styles.eyeBtn}>
              <Ionicons
                name={showToggle ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.textLight}
              />
            </TouchableOpacity>
          )}
        </View>
        {errors[fieldKey] && (
          <Text style={styles.errorText}>{errors[fieldKey]}</Text>
        )}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary, '#1a6bb5']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <View style={styles.circle1} />

      {/* ── Error Alert Modal (for failed registration only) ── */}
      <Modal
        visible={alertVisible}
        transparent
        animationType="fade"
        onRequestClose={handleAlertClose}
        statusBarTranslucent={true}
      >
        <View style={styles.alertOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleAlertClose}
          />
          <View style={styles.alertCard}>
            <View style={[styles.alertIconBox, {
              backgroundColor: alertConfig.type === 'success'
                ? Colors.success + '15'
                : Colors.danger + '15'
            }]}>
              <Ionicons
                name={alertConfig.type === 'success' ? 'checkmark-circle' : 'close-circle'}
                size={40}
                color={alertConfig.type === 'success' ? Colors.success : Colors.danger}
              />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <TouchableOpacity
              style={[styles.alertBtn, {
                backgroundColor: alertConfig.type === 'success'
                  ? Colors.success
                  : Colors.danger
              }]}
              onPress={handleAlertClose}
              activeOpacity={0.85}
            >
              <Text style={styles.alertBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerWrapper}>

            {/* Header */}
            <View style={styles.headerArea}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={22} color={Colors.white} />
              </TouchableOpacity>
              <View style={styles.logoIcon}>
                <Ionicons name="flash" size={30} color={Colors.accent} />
              </View>
              <Text style={styles.headerTitle}>Create Account</Text>
              <Text style={styles.headerSubtitle}>Start tracking prices today</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>

              {renderField('FULL NAME', 'name', 'Juan dela Cruz', {
                autoCapitalize: 'words'
              })}

              {renderField('EMAIL ADDRESS', 'email', 'juan@email.com', {
                keyboardType: 'email-address'
              })}

              {/* Password with strength indicator */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <View style={[
                  styles.inputWrapper,
                  errors.password && styles.inputError,
                  form.password   && styles.inputFocused,
                ]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={form.password ? Colors.primary : Colors.textLight}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Min. 8 chars, A-Z, 0-9, !@#$"
                    placeholderTextColor={Colors.textLight}
                    value={form.password}
                    onChangeText={(t) => update('password', t)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showPass}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPass(v => !v)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPass ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={Colors.textLight}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}

                {/* Strength bar + requirements */}
                {(form.password.length > 0 || passwordFocused) && (
                  <View style={styles.strengthBox}>
                    {/* Strength bar */}
                    <View style={styles.strengthBarRow}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <View
                          key={i}
                          style={[
                            styles.strengthBarSegment,
                            {
                              backgroundColor: i <= strength.passed
                                ? strength.color
                                : Colors.border
                            }
                          ]}
                        />
                      ))}
                      <Text style={[styles.strengthLabel, { color: strength.color }]}>
                        {form.password.length > 0 ? strength.strength : ''}
                      </Text>
                    </View>

                    {/* Requirements */}
                    <Requirement met={strength.checks.length}  label="At least 8 characters" />
                    <Requirement met={strength.checks.upper}   label="One uppercase letter (A-Z)" />
                    <Requirement met={strength.checks.lower}   label="One lowercase letter (a-z)" />
                    <Requirement met={strength.checks.number}  label="One number (0-9)" />
                    <Requirement met={strength.checks.special} label="One special character (!@#$%...)" />
                  </View>
                )}
              </View>

              {renderField('CONFIRM PASSWORD', 'confirmPassword', 'Re-enter your password', {
                isPassword: true,
                showToggle: showConfirmPass,
                onToggle:   () => setShowConfirmPass(v => !v),
              })}

              <TouchableOpacity
                style={[styles.registerBtn, loading && { opacity: 0.7 }]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.accent, Colors.accentLight]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
                >
                  {loading
                    ? <ActivityIndicator color={Colors.white} />
                    : <>
                        <Text style={styles.btnText}>Create Account</Text>
                        <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginLinkText}>
                  Already have an account?{' '}
                  <Text style={{ color: Colors.primary, fontWeight: FontWeight.bold }}>
                    Sign In
                  </Text>
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient:       { flex: 1 },
  circle1:        { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', top: -60, right: -40 },
  kav:            { flex: 1 },
  scroll:         { flexGrow: 1, paddingBottom: Spacing.xxxl },
  centerWrapper:  { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg, width: '100%' },
  headerArea:     { paddingTop: 56, paddingBottom: 28, alignItems: 'center', width: '100%', maxWidth: 400 },
  backBtn:        { position: 'absolute', top: 56, left: 0, width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  logoIcon:       { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  headerTitle:    { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  headerSubtitle: { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.sm, marginTop: 4 },
  card:           { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, ...Shadow.lg, width: '100%', maxWidth: 400 },
  fieldGroup:     { marginBottom: Spacing.lg },
  fieldLabel:     { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.sm },
  inputWrapper:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md },
  inputFocused:   { borderColor: Colors.primary, backgroundColor: Colors.white },
  inputError:     { borderColor: Colors.danger },
  inputIcon:      { marginRight: Spacing.sm },
  input:          { flex: 1, paddingVertical: 13, fontSize: FontSize.base, color: Colors.text },
  eyeBtn:         { padding: Spacing.xs },
  errorText:      { fontSize: FontSize.xs, color: Colors.danger, marginTop: 4 },

  // Strength
  strengthBox:        { marginTop: 8, padding: 12, backgroundColor: Colors.inputBg, borderRadius: Radius.md },
  strengthBarRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  strengthBarSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel:      { fontSize: 11, fontWeight: FontWeight.bold, marginLeft: 4 },

  registerBtn:   { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.lg, ...Shadow.accent },
  btnGradient:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  btnText:       { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  loginLink:     { alignItems: 'center', marginTop: 4 },
  loginLinkText: { fontSize: FontSize.sm, color: Colors.textMuted },

  // ✅ Modal overlay — fixed for mobile Chrome and native
  alertOverlay: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:  'center',
    alignItems:      'center',
    zIndex:          9999,
    ...(Platform.OS === 'web' && { position: 'fixed' }),
  },
  alertCard:    { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, alignItems: 'center', width: '85%', maxWidth: 340, gap: 12, ...Shadow.lg, zIndex: 10000 },
  alertIconBox: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  alertTitle:   { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text, textAlign: 'center' },
  alertMessage: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  alertBtn:     { borderRadius: Radius.lg, paddingVertical: 14, width: '100%', alignItems: 'center', marginTop: 4 },
  alertBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

export default RegisterScreen;