// modals/AdminConfirmModal.js
import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

const AdminConfirmModal = ({ visible, title, message, confirmText, onConfirm, onCancel, C }) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ backgroundColor: C.card, borderRadius: 14, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden' }}>
          <View style={{ padding: 20, gap: 10 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
            <Text style={{ color: C.textMuted, fontSize: 13, lineHeight: 20 }}>{message}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: C.divider }} />
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={{ flex: 1, padding: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: C.divider }}
              onPress={onCancel}
            >
              <Text style={{ color: C.textMuted, fontSize: 14, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, padding: 16, alignItems: 'center' }} onPress={onConfirm}>
              <Text style={{ color: C.danger, fontSize: 14, fontWeight: '800' }}>{confirmText || 'Confirm'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AdminConfirmModal;