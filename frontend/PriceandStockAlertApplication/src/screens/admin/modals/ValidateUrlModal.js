// modals/ValidateUrlModal.js
import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../api/client';

const ValidateUrlModal = ({ visible, product, onClose, onValidated, C }) => {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  React.useEffect(() => {
    if (visible && product) {
      setResult(null);
      setLoading(true);
      apiClient.post(`/admin/products/${product.id}/validate-url`)
        .then(res  => setResult({ success: true,  data: res.data }))
        .catch(e   => setResult({ success: false, message: e.response?.data?.message || 'URL validation failed.' }))
        .finally(()=> setLoading(false));
    }
  }, [visible, product]);

  if (!product) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ backgroundColor: C.card, borderRadius: 14, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', maxHeight: '85%' }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.divider }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '800' }}>Validate Product URL</Text>
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{product.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.inputBg, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="close" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {/* URL display */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 }}>PRODUCT URL</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.inputBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: C.cardBorder }}>
                <Ionicons name="link-outline" size={14} color={C.textLight} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontSize: 11, color: C.textMuted, lineHeight: 18 }} selectable numberOfLines={4} ellipsizeMode="middle">
                  {product.url ?? 'No URL available'}
                </Text>
              </View>
            </View>

            {/* Result */}
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: C.inputBg, borderRadius: 10 }}>
                <ActivityIndicator color={C.primary} size="small" />
                <Text style={{ fontSize: 13, color: C.textMuted }}>Checking URL accessibility...</Text>
              </View>
            ) : result ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 }}>VALIDATION RESULT</Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 10, padding: 14,
                  borderWidth: 1,
                  borderColor: result.success ? C.success + '40' : C.danger + '40',
                  backgroundColor: result.success ? C.success + '10' : C.danger + '10',
                }}>
                  <Ionicons name={result.success ? 'checkmark-circle' : 'close-circle'} size={24} color={result.success ? C.success : C.danger} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: result.success ? C.success : C.danger }}>
                      {result.success ? 'URL is Valid ✓' : 'URL is Invalid ✗'}
                    </Text>
                    <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 18 }}>
                      {result.success
                        ? `Product is reachable on ${product.platform?.charAt(0).toUpperCase() + product.platform?.slice(1)}.`
                        : result.message || 'The product URL could not be validated.'}
                    </Text>
                  </View>
                </View>
                {result?.success && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 14, backgroundColor: C.success, marginTop: 4 }}
                    onPress={() => { onValidated(product); onClose(); }}
                  >
                    <Ionicons name="refresh-circle-outline" size={18} color={C.white} />
                    <Text style={{ color: C.white, fontSize: 13, fontWeight: '800' }}>Restore as Valid Product</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={{ borderTopWidth: 1, borderTopColor: C.divider }}>
            <TouchableOpacity style={{ padding: 16, alignItems: 'center' }} onPress={onClose}>
              <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ValidateUrlModal;