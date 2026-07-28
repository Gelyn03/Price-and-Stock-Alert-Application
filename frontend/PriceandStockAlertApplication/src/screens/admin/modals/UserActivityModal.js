// modals/UserActivityModal.js
import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MS, Badge } from '../shared/components';
import apiClient from '../../../api/client';

const UserActivityModal = ({ visible, user, onClose, C }) => {
  const [activity, setActivity] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const m = MS(C);

  React.useEffect(() => {
    if (visible && user) {
      setLoading(true);
      apiClient.get(`/admin/users/${user.id}/activity`)
        .then(res => setActivity(res.data))
        .catch(() => setActivity(null))
        .finally(() => setLoading(false));
    }
  }, [visible, user]);

  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.card}>
          {/* Header */}
          <View style={m.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary + '25', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: C.primary }}>{user.name?.charAt(0)?.toUpperCase()}</Text>
              </View>
              <View>
                <Text style={m.title}>{user.name}</Text>
                <Text style={m.sub}>{user.email}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={m.closeBtn}>
              <Ionicons name="close" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 1, backgroundColor: C.divider }} />

          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Stats Row */}
              <View style={{ flexDirection: 'row', padding: 16, gap: 8 }}>
                {[
                  { val: activity?.watchlist_count ?? user.watchlist_items_count ?? '—', label: 'Watchlist',     color: C.primary },
                  { val: activity?.notifications_received ?? '—',                        label: 'Notifications', color: C.success },
                  { val: activity?.shared_watchlists ?? '—',                             label: 'Shared Lists',  color: C.accent  },
                ].map((s, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 10, padding: 12 }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: s.color }}>{s.val}</Text>
                    <Text style={{ fontSize: 9, color: C.textMuted, fontWeight: '700', marginTop: 4, textAlign: 'center' }}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Account Info */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 0.8, marginBottom: 4 }}>ACCOUNT INFO</Text>
                {[
                  { label: 'Role',        val: <Badge label={user.role === 'admin' ? 'Admin' : 'User'} color={user.role === 'admin' ? C.accent : C.primary} bg={user.role === 'admin' ? C.accent + '20' : C.primary + '20'} /> },
                  { label: 'Status',      val: <Badge label={user.is_active === false ? 'Deactivated' : 'Active'} color={user.is_active === false ? C.deactivated : C.success} bg={user.is_active === false ? C.deactivated + '20' : C.success + '20'} /> },
                  { label: 'Joined',      val: <Text style={{ fontSize: 12, color: C.text, fontWeight: '600' }}>{user.created_at?.slice(0, 10) ?? '—'}</Text> },
                  { label: 'Last Active', val: <Text style={{ fontSize: 12, color: C.text, fontWeight: '600' }}>{activity?.last_active ?? '—'}</Text> },
                ].map((r, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: C.textMuted }}>{r.label}</Text>
                    {r.val}
                  </View>
                ))}
              </View>

              {/* Recent Watchlist */}
              {activity?.recent_watchlist?.length > 0 && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 0.8, marginBottom: 4 }}>RECENT WATCHLIST</Text>
                  {activity.recent_watchlist.slice(0, 5).map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                      <Ionicons name="pricetag-outline" size={12} color={C.textLight} />
                      <Text style={{ flex: 1, fontSize: 12, color: C.textMuted }} numberOfLines={1}>{item.name}</Text>
                      <Text style={{ fontSize: 12, color: C.primary, fontWeight: '700' }}>₱{parseFloat(item.current_price || 0).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          <TouchableOpacity style={m.footerBtn} onPress={onClose}>
            <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '700' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default UserActivityModal;