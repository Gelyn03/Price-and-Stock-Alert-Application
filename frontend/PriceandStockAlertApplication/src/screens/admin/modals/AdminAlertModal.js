// modals/AdminAlertModal.js
import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

const AdminAlertModal = ({ visible, title, message, onClose, C }) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ backgroundColor: C.card, borderRadius: 14, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden' }}>
          <View style={{ padding: 20, gap: 10 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
            <Text style={{ color: C.textMuted, fontSize: 13, lineHeight: 20 }}>{message}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: C.divider }} />
          <TouchableOpacity style={{ padding: 16, alignItems: 'center' }} onPress={onClose}>
            <Text style={{ color: C.primary, fontSize: 14, fontWeight: '700' }}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default AdminAlertModal;