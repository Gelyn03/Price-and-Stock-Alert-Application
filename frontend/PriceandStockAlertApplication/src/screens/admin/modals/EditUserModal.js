// modals/EditUserModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MS, Badge } from '../shared/components';
import { webAlert } from '../shared/webAlerts';
import apiClient from '../../../api/client';

// ── Available roles (moderator removed) ──────────────────────────────────────
const ROLES = [
  { value: 'user',  label: 'User',  icon: 'person',           color: (C) => C.primary },
  { value: 'admin', label: 'Admin', icon: 'shield-checkmark', color: (C) => C.accent  },
];

const Field = ({ label, value, onChange, keyboard = 'default', secure = false, C }) => {
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5 }}>
        {label}
      </Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.inputBg, borderRadius: 8,
        paddingHorizontal: 12, borderWidth: 1, borderColor: C.cardBorder, height: 40,
      }}>
        <TextInput
          style={{ flex: 1, fontSize: 13, color: C.text, outlineStyle: 'none' }}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={secure && !show}
          placeholderTextColor={C.textLight}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow(p => !p)} style={{ padding: 4 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={16} color={C.textLight} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const EditUserModal = ({ visible, user, onClose, onUpdated, C }) => {
  const m = MS(C);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [role,      setRole]      = useState('user');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name   ?? '');
      setEmail(user.email ?? '');
      // If a legacy moderator role comes in, demote to user in the UI
      const safeRole = user.role === 'admin' ? 'admin' : 'user';
      setRole(safeRole);
      setNewPw('');
      setConfirmPw('');
    }
  }, [user]);

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim())  return webAlert('Error', 'Name is required.');
    if (!email.trim()) return webAlert('Error', 'Email is required.');
    if (newPw && newPw.length < 8)
      return webAlert('Error', 'New password must be at least 8 characters.');
    if (newPw && newPw !== confirmPw)
      return webAlert('Error', 'Passwords do not match.');

    setSaving(true);
    try {
      const payload = {
        name:  name.trim(),
        email: email.trim(),
        role,
        ...(newPw ? { password: newPw, password_confirmation: confirmPw } : {}),
      };
      await apiClient.put(`/admin/users/${user.id}`, payload);
      webAlert('Updated ✅', `"${name}" has been updated.`);
      onUpdated?.({ ...user, ...payload });
      onClose();
    } catch (e) {
      webAlert('Error', e.response?.data?.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={[m.card, { maxWidth: 420 }]}>

          {/* ── Header ── */}
          <View style={m.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: C.primary + '25',
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: C.primary }}>
                  {user.name?.charAt(0)?.toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={m.title}>Edit User</Text>
                <Text style={m.sub}>{user.email}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={m.closeBtn}>
              <Ionicons name="close" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 1, backgroundColor: C.divider }} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>

            {/* ── Profile Info ── */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Ionicons name="person-outline" size={13} color={C.primary} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 0.8 }}>
                  PROFILE INFO
                </Text>
              </View>
              <Field label="Full Name"     value={name}  onChange={setName}  keyboard="default"       C={C} />
              <Field label="Email Address" value={email} onChange={setEmail} keyboard="email-address" C={C} />
            </View>

            {/* ── Role / Permissions ── */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Ionicons name="shield-outline" size={13} color={C.accent} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 0.8 }}>
                  ROLE & PERMISSIONS
                </Text>
              </View>

              {/* Role selector pills — only User and Admin */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ROLES.map(r => {
                  const isSelected = role === r.value;
                  const roleColor  = r.color(C);
                  // Prevent accidentally removing admin role
                  const disabled   = isAdmin && r.value !== 'admin';
                  return (
                    <TouchableOpacity
                      key={r.value}
                      onPress={() => !disabled && setRole(r.value)}
                      activeOpacity={disabled ? 1 : 0.7}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: isSelected ? roleColor : C.cardBorder,
                        backgroundColor: isSelected ? roleColor + '18' : C.inputBg,
                        opacity: disabled ? 0.4 : 1,
                      }}
                    >
                      <Ionicons name={r.icon} size={13} color={isSelected ? roleColor : C.textMuted} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: isSelected ? roleColor : C.textMuted }}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Permission description */}
              <View style={{
                flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                backgroundColor: C.inputBg, borderRadius: 8, padding: 10,
              }}>
                <Ionicons name="information-circle-outline" size={14} color={C.textLight} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 11, color: C.textMuted, lineHeight: 16 }}>
                  {role === 'admin'
                    ? 'Full access to admin panel, all users, products, and settings.'
                    : 'Standard user. Can manage their own watchlist and notifications only.'
                  }
                </Text>
              </View>
            </View>

            {/* ── Reset Password (optional) ── */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Ionicons name="lock-closed-outline" size={13} color={C.warning} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 0.8 }}>
                  RESET PASSWORD
                  <Text style={{ fontSize: 9, fontWeight: '600', color: C.textLight }}> (optional)</Text>
                </Text>
              </View>
              <Field label="New Password"     value={newPw}     onChange={setNewPw}     secure C={C} />
              <Field label="Confirm Password" value={confirmPw} onChange={setConfirmPw} secure C={C} />
            </View>

          </ScrollView>

          <View style={{ height: 1, backgroundColor: C.divider }} />

          {/* ── Footer ── */}
          <View style={{ flexDirection: 'row', gap: 10, padding: 16 }}>
            <TouchableOpacity
              style={[m.footerBtn, { flex: 1, margin: 0 }]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.footerBtn, { flex: 2, margin: 0, backgroundColor: C.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Save Changes</Text>
                  </View>
                )
              }
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

export default EditUserModal;