// ============================================================
//  src/screens/ForgotPasswordScreen.js
//  Forgot Password — Email OTP Code + Reset Password
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar, Modal,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient          from '../api/client';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

const ForgotPasswordScreen = ({ navigation }) => {
  // Steps: 1 = enter email, 2 = enter code + new password
  const [step,        setStep]        = useState(1);
  const [email,       setEmail]       = useState('');
  const [code,        setCode]        = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState({});

  // Countdown for resend
  const [resendTimer, setResendTimer] = useState(0);

  // Alert modal
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle,   setAlertTitle]   = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType,    setAlertType]    = useState('error');
  const [onAlertClose, setOnAlertClose] = useState(null);

  const showAlert = (title, message, type = 'error', onClose = null) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setOnAlertClose(() => onClose);
    setAlertVisible(true);
  };

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => {
      setResendTimer(prev => { if (prev <= 1) { clearInterval(t); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  // Step 1 — Send code
  const handleSendCode = async () => {
    const e = {};
    if (!email.trim())                    e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    try {
      await apiClient.post('/forgot-password', { email: email.trim().toLowerCase() });
      setStep(2);
      setResendTimer(60);
    } catch (err) {
      showAlert('Error', err.response?.data?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — Verify code + reset password
  const handleResetPassword = async () => {
    const e = {};
    if (!code.trim())           e.code        = 'Reset code is required.';
    if (!password)              e.password    = 'New password is required.';
    else if (password.length < 8) e.password  = 'Password must be at least 8 characters.';
    if (!confirmPass)           e.confirmPass = 'Please confirm your password.';
    else if (password !== confirmPass) e.confirmPass = 'Passwords do not match.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    try {
      await apiClient.post('/reset-password', {
        email:                 email.trim().toLowerCase(),
        code:                  code.trim().toUpperCase(),
        password:              password,
        password_confirmation: confirmPass,
      });
      showAlert(
        'Password Reset! ✅',
        'Your password has been reset successfully. You can now log in with your new password.',
        'success',
        () => navigation.goBack()
      );
    } catch (err) {
      showAlert('Error', err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await apiClient.post('/forgot-password', { email: email.trim().toLowerCase() });
      setResendTimer(60);
      showAlert('Code Sent ✅', 'A new reset code has been sent to your email.', 'success');
    } catch (err) {
      showAlert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary, '#1a6bb5']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Alert Modal */}
      <Modal visible={alertVisible} transparent animationType="fade" onRequestClose={() => setAlertVisible(false)}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIconBox, { backgroundColor: alertType === 'error' ? Colors.danger + '15' : Colors.success + '15' }]}>
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
              onPress={() => {
                setAlertVisible(false);
                if (onAlertClose) onAlertClose();
              }}
            >
              <Text style={styles.alertBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoIcon}>
              <Ionicons name="lock-open-outline" size={36} color={Colors.accent} />
            </View>
            <Text style={styles.appName}>Reset Password</Text>
            <Text style={styles.tagline}>
              {step === 1 ? 'Enter your email to receive a reset code' : 'Enter the code sent to your email'}
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>

            {/* Step indicator */}
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
                <Text style={[styles.stepNum, step >= 1 && styles.stepNumActive]}>1</Text>
              </View>
              <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
              <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
                <Text style={[styles.stepNum, step >= 2 && styles.stepNumActive]}>2</Text>
              </View>
            </View>
            <View style={styles.stepLabelRow}>
              <Text style={styles.stepLabel}>Send Code</Text>
              <Text style={styles.stepLabel}>Reset Password</Text>
            </View>

            {step === 1 ? (
              <>
                <Text style={styles.cardTitle}>Forgot Password?</Text>
                <Text style={styles.cardSubtitle}>Enter your registered email address and we'll send you a 6-character reset code.</Text>

                {/* Email */}
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
                    />
                  </View>
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                <TouchableOpacity
                  style={[styles.btn, loading && { opacity: 0.7 }]}
                  onPress={handleSendCode}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[Colors.accent, Colors.accentLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                    {loading
                      ? <ActivityIndicator color={Colors.white} />
                      : <><Text style={styles.btnText}>Send Reset Code</Text><Ionicons name="send" size={16} color={Colors.white} /></>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Enter Reset Code</Text>
                <Text style={styles.cardSubtitle}>
                  A 6-character code was sent to{' '}
                  <Text style={{ fontWeight: FontWeight.bold, color: Colors.primary }}>{email}</Text>
                  {'. '}Code expires in 15 minutes.
                </Text>

                {/* Code */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>RESET CODE</Text>
                  <View style={[styles.inputWrapper, errors.code && styles.inputError, code && styles.inputFocused]}>
                    <Ionicons name="key-outline" size={18} color={code ? Colors.primary : Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { letterSpacing: 4, fontSize: FontSize.lg, fontWeight: FontWeight.bold }]}
                      placeholder="XXXXXX"
                      placeholderTextColor={Colors.textLight}
                      value={code}
                      onChangeText={(t) => { setCode(t.toUpperCase()); setErrors(e => ({ ...e, code: null })); }}
                      autoCapitalize="characters"
                      maxLength={6}
                    />
                  </View>
                  {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
                </View>

                {/* New Password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
                  <View style={[styles.inputWrapper, errors.password && styles.inputError, password && styles.inputFocused]}>
                    <Ionicons name="lock-closed-outline" size={18} color={password ? Colors.primary : Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Minimum 8 characters"
                      placeholderTextColor={Colors.textLight}
                      value={password}
                      onChangeText={(t) => { setPassword(t); setErrors(e => ({ ...e, password: null })); }}
                      secureTextEntry={!showPass}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                      <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textLight} />
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                {/* Confirm Password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
                  <View style={[styles.inputWrapper, errors.confirmPass && styles.inputError, confirmPass && styles.inputFocused]}>
                    <Ionicons name="lock-closed-outline" size={18} color={confirmPass ? Colors.primary : Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter new password"
                      placeholderTextColor={Colors.textLight}
                      value={confirmPass}
                      onChangeText={(t) => { setConfirmPass(t); setErrors(e => ({ ...e, confirmPass: null })); }}
                      secureTextEntry={!showConfirm}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                      <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textLight} />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPass && <Text style={styles.errorText}>{errors.confirmPass}</Text>}
                </View>

                <TouchableOpacity
                  style={[styles.btn, loading && { opacity: 0.7 }]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[Colors.accent, Colors.accentLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                    {loading
                      ? <ActivityIndicator color={Colors.white} />
                      : <><Text style={styles.btnText}>Reset Password</Text><Ionicons name="checkmark" size={16} color={Colors.white} /></>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                {/* Resend */}
                <TouchableOpacity
                  style={[styles.resendBtn, resendTimer > 0 && { opacity: 0.5 }]}
                  onPress={handleResend}
                  disabled={resendTimer > 0 || loading}
                >
                  <Ionicons name="refresh-outline" size={14} color={Colors.primary} />
                  <Text style={styles.resendText}>
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient:       { flex: 1 },
  circle1:        { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.05)', top: -60, right: -60 },
  circle2:        { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,107,53,0.10)', bottom: 100, left: -40 },
  kav:            { flex: 1 },
  scroll:         { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  backBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 52, paddingBottom: 8 },
  backText:       { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  logoArea:       { alignItems: 'center', paddingTop: 16, paddingBottom: 28 },
  logoIcon:       { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  appName:        { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  tagline:        { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.sm, marginTop: 4, textAlign: 'center' },
  card:           { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, ...Shadow.lg },
  cardTitle:      { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 4 },
  cardSubtitle:   { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.xl, lineHeight: 20 },
  // Steps
  stepRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  stepDot:        { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white },
  stepDotActive:  { borderColor: Colors.primary, backgroundColor: Colors.primary },
  stepNum:        { fontSize: 12, fontWeight: FontWeight.bold, color: Colors.textMuted },
  stepNumActive:  { color: Colors.white },
  stepLine:       { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: Colors.primary },
  stepLabelRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl },
  stepLabel:      { fontSize: FontSize.xs, color: Colors.textMuted },
  // Fields
  fieldGroup:     { marginBottom: Spacing.lg },
  fieldLabel:     { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.sm },
  inputWrapper:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md },
  inputFocused:   { borderColor: Colors.primary, backgroundColor: Colors.white },
  inputError:     { borderColor: Colors.danger },
  inputIcon:      { marginRight: Spacing.sm },
  input:          { flex: 1, paddingVertical: 14, fontSize: FontSize.base, color: Colors.text },
  eyeBtn:         { padding: Spacing.xs },
  errorText:      { fontSize: FontSize.xs, color: Colors.danger, marginTop: 4 },
  // Button
  btn:            { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.accent },
  btnGradient:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  btnText:        { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  resendBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  resendText:     { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semiBold },
  // Alert
  alertOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  alertCard:      { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, alignItems: 'center', width: '100%', maxWidth: 340, gap: 12, ...Shadow.lg },
  alertIconBox:   { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  alertTitle:     { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text, textAlign: 'center' },
  alertMessage:   { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  alertBtn:       { borderRadius: Radius.lg, paddingVertical: 14, width: '100%', alignItems: 'center', marginTop: 4 },
  alertBtnText:   { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

export default ForgotPasswordScreen;