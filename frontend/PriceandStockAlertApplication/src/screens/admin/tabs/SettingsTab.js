// tabs/SettingsTab.js
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { webAlert } from '../shared/webAlerts';
import apiClient   from '../../../api/client';

// Defined outside SettingsTab to prevent re-mount on every render
const SettingsField = ({ label, value, onChange, secure, show, onToggle, keyboard, C }) => (
  <View style={{ gap: 4 }}>
    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: C.textMuted }}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: C.cardBorder, height: 40 }}>
      <TextInput
        style={{ flex: 1, fontSize: 13, color: C.text, outlineStyle: 'none' }}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure && !show}
        keyboardType={keyboard || 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={C.textLight}
        placeholder={`Enter ${label.toLowerCase()}`}
      />
      {secure && (
        <TouchableOpacity onPress={onToggle} style={{ padding: 4 }}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={16} color={C.textLight} />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const SettingsTab = ({ user, C }) => {
  const { setUser }               = useAuth();
  const [name,      setName]      = useState(user?.name  || '');
  const [email,     setEmail]     = useState(user?.email || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [savingPw,  setSavingPw]  = useState(false);
  const [showCur,   setShowCur]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showCon,   setShowCon]   = useState(false);

  const saveProfile = async () => {
    if (!name.trim() || !email.trim()) return webAlert('Error', 'Name and email are required.');
    setSaving(true);
    try {
      await apiClient.put('/profile', { name: name.trim(), email: email.trim() });
      if (setUser) setUser(p => ({ ...p, name: name.trim(), email: email.trim() }));
      webAlert('Success ✅', 'Profile updated!');
    } catch (e) {
      webAlert('Error', e.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const changePw = async () => {
    if (!currentPw || !newPw || !confirmPw) return webAlert('Error', 'All fields are required.');
    if (newPw.length < 8)    return webAlert('Error', 'New password must be at least 8 characters.');
    if (newPw !== confirmPw) return webAlert('Error', 'Passwords do not match.');
    setSavingPw(true);
    try {
      await apiClient.put('/profile/password', { current_password: currentPw, password: newPw, password_confirmation: confirmPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      webAlert('Success ✅', 'Password changed!');
    } catch (e) {
      webAlert('Error', e.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  const isWeb      = Platform.OS === 'web';
  const winHeight  = Dimensions.get('window').height;
  const outerStyle = isWeb
    ? { height: winHeight - 106 }
    : { flex: 1 };
  const scrollStyle = isWeb
    ? { height: '100%', overflowY: 'auto' }
    : { flex: 1 };

  return (
    <View style={outerStyle}>
      <ScrollView
        style={scrollStyle}
        contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={true}
      >
        {/* Profile card */}
        <View style={{ backgroundColor: C.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.cardBorder, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="person-outline" size={16} color={C.primary} />
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '800' }}>Profile Information</Text>
          </View>
          <SettingsField label="Full Name"     value={name}  onChange={setName}  keyboard="default"       C={C} />
          <SettingsField label="Email Address" value={email} onChange={setEmail} keyboard="email-address" C={C} />
          
          {/* PINALIIT NA BUTTON DITO */}
          <TouchableOpacity
            style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center', 
                borderRadius: 8, 
                paddingVertical: 8, // Mula 12, ginawang 8
                backgroundColor: C.primary,
                alignSelf: 'center', // Optional: para hindi sya stretch kung gusto mo mas compact
                paddingHorizontal: 20 // Optional: para may padding sa gilid
            }}
            onPress={saveProfile}
            disabled={saving}
          >
            <Text style={{ color: C.white, fontSize: 12, fontWeight: '800' }}>{saving ? 'Saving…' : 'Save Profile'}</Text>
          </TouchableOpacity>
        </View>

        {/* Password card */}
        <View style={{ backgroundColor: C.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.cardBorder, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="lock-closed-outline" size={16} color={C.warning} />
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '800' }}>Change Password</Text>
          </View>
          <SettingsField label="Current Password" value={currentPw} onChange={setCurrentPw} secure show={showCur} onToggle={() => setShowCur(p => !p)} C={C} />
          <SettingsField label="New Password"     value={newPw}     onChange={setNewPw}     secure show={showNew} onToggle={() => setShowNew(p => !p)} C={C} />
          <SettingsField label="Confirm Password" value={confirmPw} onChange={setConfirmPw} secure show={showCon} onToggle={() => setShowCon(p => !p)} C={C} />
          
          {/* PINALIIT NA BUTTON DITO */}
          <TouchableOpacity
            style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center', 
                borderRadius: 8, 
                paddingVertical: 8, // Mula 12, ginawang 8
                backgroundColor: C.warning,
                alignSelf: 'center',
                paddingHorizontal: 20
            }}
            onPress={changePw}
            disabled={savingPw}
          >
            <Text style={{ color: C.white, fontSize: 12, fontWeight: '800' }}>{savingPw ? 'Changing…' : 'Change Password'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default SettingsTab;