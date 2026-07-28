// ============================================================
//  src/screens/EmailVerificationScreen.js
//  Email verification screen after registration
// ============================================================

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, StatusBar, ScrollView,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient          from '../api/client';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

const EmailVerificationScreen = ({ navigation, route }) => {
  const email = route?.params?.email || '';
  const [code,      setCode]      = useState(['', '', '', '', '', '']);
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const inputs = useRef([]);

  const handleChange = (text, index) => {
    const newCode = [...code];
    newCode[index] = text.toUpperCase().slice(-1);
    setCode(newCode);
    setError('');
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Please enter the complete 6-character code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/verify-email', { email, code: fullCode });
      setSuccess('Email verified successfully!');
      setTimeout(() => navigation.navigate('Login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/resend-verification', { email });
      setSuccess('New code sent to your email!');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend. Try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary, '#1a6bb5']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always">
        <View style={styles.centerWrapper}>

          {/* Header */}
          <View style={styles.headerArea}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.logoIcon}>
              <Ionicons name="mail-unread" size={30} color={Colors.accent} />
            </View>
            <Text style={styles.headerTitle}>Verify Your Email</Text>
            <Text style={styles.headerSubtitle}>
              We sent a 6-character code to{'\n'}
              <Text style={{ fontWeight: FontWeight.bold }}>{email}</Text>
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.instruction}>
              Enter the verification code below:
            </Text>

            {/* Code Input Boxes */}
            <View style={styles.codeRow}>
              {code.map((char, index) => (
                <TextInput
                  key={index}
                  ref={ref => inputs.current[index] = ref}
                  style={[styles.codeBox, char && styles.codeBoxFilled]}
                  value={char}
                  onChangeText={text => handleChange(text, index)}
                  onKeyPress={e => handleKeyPress(e, index)}
                  maxLength={1}
                  autoCapitalize="characters"
                  keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password'}
                  textAlign="center"
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {/* Error / Success */}
            {error   && <Text style={styles.errorText}>{error}</Text>}
            {success && <Text style={styles.successText}>{success}</Text>}

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.verifyBtn, loading && { opacity: 0.7 }]}
              onPress={handleVerify}
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
                      <Text style={styles.btnText}>Verify Email</Text>
                      <Ionicons name="checkmark" size={18} color={Colors.white} />
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Resend */}
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={handleResend}
              disabled={resending}
            >
              {resending
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Text style={styles.resendText}>
                    Didn't receive the code?{' '}
                    <Text style={{ color: Colors.primary, fontWeight: FontWeight.bold }}>
                      Resend
                    </Text>
                  </Text>
              }
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient:       { flex: 1 },
  scroll:         { flexGrow: 1, paddingBottom: Spacing.xxxl },
  centerWrapper:  { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg, width: '100%' },
  headerArea:     { paddingTop: 56, paddingBottom: 28, alignItems: 'center', width: '100%', maxWidth: 400 },
  backBtn:        { position: 'absolute', top: 56, left: 0, width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  logoIcon:       { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  headerTitle:    { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  card:           { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, ...Shadow.lg, width: '100%', maxWidth: 400 },
  instruction:    { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.xl },
  codeRow:        { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: Spacing.xl },
  codeBox:        { width: 46, height: 56, borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.inputBg, fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.text, textAlign: 'center' },
  codeBoxFilled:  { borderColor: Colors.primary, backgroundColor: Colors.white },
  errorText:      { fontSize: FontSize.xs, color: Colors.danger, textAlign: 'center', marginBottom: Spacing.md },
  successText:    { fontSize: FontSize.xs, color: Colors.success, textAlign: 'center', marginBottom: Spacing.md },
  verifyBtn:      { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  btnGradient:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  btnText:        { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  resendBtn:      { alignItems: 'center', paddingVertical: Spacing.sm },
  resendText:     { fontSize: FontSize.sm, color: Colors.textMuted },
});

export default EmailVerificationScreen;