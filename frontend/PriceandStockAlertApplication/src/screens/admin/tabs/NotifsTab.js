// tabs/NotifsTab.js
// UPDATED: PREFERENCE column now shows proper channel badges
//          (Push, Email, In-App) based on the `channels` field
//          stored in the notification record.

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator,
  Platform, Dimensions, TouchableOpacity, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SectionTitle, THead, Badge } from '../shared/components';
import apiClient from '../../../api/client';
import { toPhDateTime } from '../../../utils/formatTime';

const FILTERS = [
  { label: 'All',          value: null },
  { label: 'Price Drop',   value: 'price drop' },
  { label: 'Target Price', value: 'target price' },
  { label: 'Stock',        value: 'stock' },
  { label: 'Unread',       value: 'unread' },
];

const SORT_OPTIONS = [
  { label: 'Newest First',  value: 'newest' },
  { label: 'Oldest First',  value: 'oldest' },
  { label: 'Unread First',  value: 'unread_first' },
];

const PAGE_SIZE = 15;

// ── Channel badge config ──────────────────────────────────────────────────────
const CHANNEL_CONFIG = {
  push:    { label: 'Push',    icon: 'phone-portrait-outline', color: '#f59e0b', bg: '#f59e0b20' },
  email:   { label: 'Email',   icon: 'mail-outline',           color: '#6366f1', bg: '#6366f120' },
  'in-app':{ label: 'In-App',  icon: 'notifications-outline',  color: '#10b981', bg: '#10b98120' },
};

// ── ChannelBadges — renders one pill per channel ──────────────────────────────
const ChannelBadges = ({ channels, C }) => {
  if (!channels) {
    // Old record before migration — assume in-app only
    const cfg = CHANNEL_CONFIG['in-app'];
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: cfg.bg, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Ionicons name={cfg.icon} size={9} color={cfg.color} />
          <Text style={{ fontSize: 9, fontWeight: '700', color: cfg.color }}>{cfg.label}</Text>
        </View>
      </View>
    );
  }

  const parts = channels.split(',').map(c => c.trim().toLowerCase());

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
      {parts.map(ch => {
        const cfg = CHANNEL_CONFIG[ch] ?? { label: ch, icon: 'ellipse-outline', color: C.textMuted, bg: C.cardBorder };
        return (
          <View key={ch} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: cfg.bg, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Ionicons name={cfg.icon} size={9} color={cfg.color} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: cfg.color }}>{cfg.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ── Confirm Modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ visible, title, message, onConfirm, onCancel, confirming, C }) => (
  <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 }}>
      <View style={{ width: 300, borderRadius: 16, padding: 24, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', gap: 12 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#ef444420', justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="trash-outline" size={26} color="#ef4444" />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center' }}>{title}</Text>
        <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18 }}>{message}</Text>
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <TouchableOpacity onPress={onCancel} disabled={confirming} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.cardBorder, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.textMuted }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} disabled={confirming} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {confirming ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="trash-outline" size={13} color="#fff" />}
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{confirming ? 'Deleting…' : 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ── Detail Modal ──────────────────────────────────────────────────────────────
const DetailModal = ({ visible, notif, onClose, C }) => {
  if (!notif) return null;

  const typeColor = (t) =>
    !t ? C.primary :
    t.includes('drop')   ? C.success :
    t.includes('stock')  ? C.warning :
    t.includes('target') ? C.accent  : C.primary;

  const color = typeColor(notif.type);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 }}>
        <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 24, gap: 16, maxHeight: '85%', width: '100%', maxWidth: 480 }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: color + '20', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="notifications-outline" size={20} color={color} />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>Notification Details</Text>
                <Text style={{ fontSize: 11, color: C.textMuted }}>{notif.created_at?.slice(0, 10) ?? '—'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            <View style={{ gap: 12 }}>

              {/* Type badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: C.textMuted, width: 80 }}>Type</Text>
                <Badge label={notif.type?.replace(/_/g, ' ') || 'Alert'} color={color} bg={color + '20'} />
              </View>

              {/* Status */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: C.textMuted, width: 80 }}>Status</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: notif.status === 'Unread' ? C.primary + '20' : C.cardBorder }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: notif.status === 'Unread' ? C.primary : C.textLight }}>{notif.status || 'Unread'}</Text>
                </View>
              </View>

              {/* Channels — UPDATED ── */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: C.textMuted, width: 80 }}>Sent via</Text>
                <ChannelBadges channels={notif.channel} C={C} />
              </View>

              {/* Product */}
              {notif.product_name && (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, color: C.textMuted }}>Product</Text>
                  <View style={{ backgroundColor: C.background, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: C.cardBorder }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{notif.product_name}</Text>
                    {notif.platform && (
                      <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{notif.platform}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Message */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11, color: C.textMuted }}>Message</Text>
                <View style={{ backgroundColor: C.background, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: C.cardBorder }}>
                  <Text style={{ fontSize: 13, color: C.text, lineHeight: 20 }}>{notif.message || '—'}</Text>
                </View>
              </View>

              {/* Price info */}
              {(notif.old_price || notif.new_price) && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {notif.old_price && (
                    <View style={{ flex: 1, backgroundColor: C.background, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>OLD PRICE</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: C.textMuted }}>₱{notif.old_price}</Text>
                    </View>
                  )}
                  {notif.new_price && (
                    <View style={{ flex: 1, backgroundColor: C.success + '10', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: C.success + '30', alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: C.success, marginBottom: 2 }}>NEW PRICE</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: C.success }}>₱{notif.new_price}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Full timestamp */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: C.textMuted, width: 80 }}>Sent at</Text>
                <Text style={{ fontSize: 12, color: C.text }}>{toPhDateTime(notif.created_at)}</Text>
              </View>

            </View>
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={{ backgroundColor: C.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── Summary Card ──────────────────────────────────────────────────────────────
const SummaryCard = ({ icon, label, value, color, C }) => (
  <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', gap: 4, minWidth: 70 }}>
    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: color + '20', justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={icon} size={15} color={color} />
    </View>
    <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>{value}</Text>
    <Text style={{ fontSize: 9, color: C.textMuted, textAlign: 'center', fontWeight: '600' }}>{label}</Text>
  </View>
);

// ── Main Component ────────────────────────────────────────────────────────────
const NotifsTab = ({ refreshing, onRefresh, C }) => {
  const [notifs,       setNotifs]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  const [search,       setSearch]       = useState('');
  const [sortBy,       setSortBy]       = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [page,         setPage]         = useState(1);

  const [bulkMode,    setBulkMode]    = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: null, confirming: false });
  const [detailNotif,  setDetailNotif]  = useState(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/notifications');
      const d   = res.data;
      const raw = d?.data || d?.notifications || (Array.isArray(d) ? d : []);
      setNotifs(raw);
    } catch (err) {
      console.error('fetchNotifs error:', err);
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchNotifs(); }, [fetchNotifs]));

    useEffect(() => {
  const interval = setInterval(fetchNotifs, 30000);
  return () => clearInterval(interval);
}, [fetchNotifs]);

  const summaryStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total:  notifs.length,
      unread: notifs.filter(n => n.status?.toLowerCase() === 'unread').length,
      today:  notifs.filter(n => n.created_at?.startsWith(today)).length,
      drops:  notifs.filter(n => n.type?.includes('price_drop')).length,
    };
  }, [notifs]);

  const processedNotifs = useMemo(() => {
    let result = [...notifs];

    if (activeFilter) {
      result = result.filter(n => {
        if (activeFilter === 'unread') return n.status?.toLowerCase() === 'unread';
        const type = n.type?.toLowerCase().replace(/_/g, ' ') ?? '';
        return type.includes(activeFilter.replace(/_/g, ' '));
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(n =>
        n.type?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        n.product_name?.toLowerCase().includes(q) ||
        n.channel?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'newest')       return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'oldest')       return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'unread_first') {
        const aU = a.status?.toLowerCase() === 'unread' ? 0 : 1;
        const bU = b.status?.toLowerCase() === 'unread' ? 0 : 1;
        return aU - bU;
      }
      return 0;
    });

    return result;
  }, [notifs, activeFilter, search, sortBy]);

  const paginated = processedNotifs.slice(0, page * PAGE_SIZE);
  const hasMore   = paginated.length < processedNotifs.length;

  const toggleSelect  = (id) => { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const selectAll     = () => setSelectedIds(new Set(paginated.map(n => n.id)));
  const clearSelection = () => { setSelectedIds(new Set()); setBulkMode(false); };

  const openConfirm = (title, message, action) => {
    setConfirmModal({ visible: true, title, message, confirming: false, onConfirm: async () => {
      setConfirmModal(p => ({ ...p, confirming: true }));
      await action();
      setConfirmModal({ visible: false, title: '', message: '', onConfirm: null, confirming: false });
    }});
  };

  const deleteOne = (id) => openConfirm('Delete Notification', 'Delete this notification? This cannot be undone.', async () => {
    try { await apiClient.delete(`/admin/notifications/${id}`); setNotifs(prev => prev.filter(n => n.id !== id)); } catch (err) { console.error(err); }
  });

  const deleteAll = () => openConfirm('Delete All Notifications', `Permanently delete all ${processedNotifs.length} notifications?`, async () => {
    try { await apiClient.delete('/admin/notifications'); setNotifs([]); } catch (err) { console.error(err); }
  });

  const deleteBulk = () => openConfirm('Delete Selected', `Delete ${selectedIds.size} selected notification${selectedIds.size !== 1 ? 's' : ''}?`, async () => {
    try {
      await apiClient.delete('/admin/notifications/bulk', { data: { ids: Array.from(selectedIds) } });
      setNotifs(prev => prev.filter(n => !selectedIds.has(n.id)));
      clearSelection();
    } catch (err) { console.error(err); }
  });

  const typeColor = (t) =>
    !t ? C.primary :
    t.includes('drop')   ? C.success :
    t.includes('stock')  ? C.warning :
    t.includes('target') ? C.accent  : C.primary;

  if (loading) return <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;

  const isWeb       = Platform.OS === 'web';
  const winHeight   = Dimensions.get('window').height;
  const outerStyle  = isWeb ? { height: winHeight - 106 } : { flex: 1 };
  const scrollStyle = isWeb ? { height: '100%', overflowY: 'auto' } : { flex: 1 };
  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort';

  return (
    <View style={outerStyle}>

      <ConfirmModal
        visible={confirmModal.visible} title={confirmModal.title} message={confirmModal.message}
        onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
        confirming={confirmModal.confirming} C={C}
      />
      <DetailModal visible={!!detailNotif} notif={detailNotif} onClose={() => setDetailNotif(null)} C={C} />

      <ScrollView
        style={scrollStyle}
        contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchNotifs} tintColor={C.primary} />}
      >

        {/* Summary Cards */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SummaryCard icon="notifications-outline" label="Total"  value={summaryStats.total}  color={C.primary} C={C} />
          <SummaryCard icon="mail-unread-outline"   label="Unread" value={summaryStats.unread} color={C.danger}  C={C} />
          <SummaryCard icon="today-outline"         label="Today"  value={summaryStats.today}  color={C.success} C={C} />
          <SummaryCard icon="trending-down-outline" label="Drops"  value={summaryStats.drops}  color={C.warning} C={C} />
        </View>

        {/* Search + Sort */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Ionicons name="search-outline" size={15} color={C.textMuted} />
            <TextInput value={search} onChangeText={t => { setSearch(t); setPage(1); }} placeholder="Search notifications…" placeholderTextColor={C.textLight} style={{ flex: 1, fontSize: 12, color: C.text }} />
            {search.length > 0 && <TouchableOpacity onPress={() => { setSearch(''); setPage(1); }}><Ionicons name="close-circle" size={15} color={C.textMuted} /></TouchableOpacity>}
          </View>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity onPress={() => setShowSortMenu(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: C.cardBorder }}>
              <Ionicons name="swap-vertical-outline" size={14} color={C.textMuted} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted }}>{currentSortLabel}</Text>
              <Ionicons name="chevron-down-outline" size={11} color={C.textMuted} />
            </TouchableOpacity>
            {showSortMenu && (
              <View style={{ position: 'absolute', top: 38, right: 0, zIndex: 100, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder, minWidth: 150, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 }}>
                {SORT_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt.value} onPress={() => { setSortBy(opt.value); setShowSortMenu(false); }} style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: sortBy === opt.value ? C.primary + '15' : 'transparent', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {sortBy === opt.value && <Ionicons name="checkmark-outline" size={13} color={C.primary} />}
                    <Text style={{ fontSize: 12, fontWeight: '600', color: sortBy === opt.value ? C.primary : C.text }}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {FILTERS.map(f => {
            const isActive = activeFilter === f.value;
            return (
              <TouchableOpacity key={f.value ?? 'all'} onPress={() => { setActiveFilter(f.value); setPage(1); }} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: isActive ? C.primary : C.card, borderWidth: 1, borderColor: isActive ? C.primary : C.cardBorder }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: isActive ? '#fff' : C.textMuted }}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Header Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <SectionTitle C={C} title="Notifications Log" count={processedNotifs.length} />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { setBulkMode(v => !v); setSelectedIds(new Set()); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: bulkMode ? C.primary + '20' : C.card, borderRadius: 8, borderWidth: 1, borderColor: bulkMode ? C.primary : C.cardBorder }}>
              <Ionicons name="checkbox-outline" size={14} color={bulkMode ? C.primary : C.textMuted} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: bulkMode ? C.primary : C.textMuted }}>Select</Text>
            </TouchableOpacity>
            {notifs.length > 0 && !bulkMode && (
              <TouchableOpacity onPress={deleteAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#ef444415', borderRadius: 8, borderWidth: 1, borderColor: '#ef444430' }}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>Delete All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bulk action bar */}
        {bulkMode && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primary + '10', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.primary + '30' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={selectAll}><Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>Select All ({paginated.length})</Text></TouchableOpacity>
              <Text style={{ fontSize: 11, color: C.textMuted }}>{selectedIds.size} selected</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {selectedIds.size > 0 && (
                <TouchableOpacity onPress={deleteBulk} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#ef4444', borderRadius: 7 }}>
                  <Ionicons name="trash-outline" size={13} color="#fff" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Delete ({selectedIds.size})</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={clearSelection} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.cardBorder, borderRadius: 7 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Table */}
        <View style={{ backgroundColor: C.card, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.cardBorder }}>
          <THead C={C} cols={[
            ...(bulkMode ? [{ label: '', flex: 0.5 }] : []),
            { label: 'TYPE',       flex: 2   },
            { label: 'MESSAGE',    flex: 3   },
            { label: 'DATE',       flex: 1.5 },
            { label: 'CHANNELS',   flex: 2   },   // ← renamed from PREFERENCE
            { label: 'PRODUCT',    flex: 2   },
            { label: 'STATUS',     flex: 1.2 },
            { label: 'ACTIONS',    flex: 1.2, align: 'right' },
          ]} />

          {paginated.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40, gap: 10 }}>
              <Ionicons name="notifications-outline" size={36} color={C.textLight} />
              <Text style={{ color: C.textLight, fontSize: 13 }}>
                {activeFilter || search ? 'No notifications match your filters.' : 'No notifications yet'}
              </Text>
            </View>
          ) : paginated.map((n, i) => {
            const isSelected = selectedIds.has(n.id);
            return (
              <TouchableOpacity
                key={n.id}
                activeOpacity={bulkMode ? 0.7 : 1}
                onPress={() => { if (bulkMode) { toggleSelect(n.id); } else { setDetailNotif(n); } }}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 10, paddingHorizontal: 10,
                  borderBottomWidth: 1, borderBottomColor: C.rowBorder,
                  backgroundColor: isSelected ? C.primary + '10' : i % 2 === 1 ? C.tableRowAlt : 'transparent',
                }}
              >
                {bulkMode && (
                  <View style={{ flex: 0.5, alignItems: 'center' }}>
                    <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: isSelected ? C.primary : C.cardBorder, backgroundColor: isSelected ? C.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                      {isSelected && <Ionicons name="checkmark" size={11} color="#fff" />}
                    </View>
                  </View>
                )}

                {/* TYPE */}
                <View style={{ flex: 2 }}>
                  <Badge label={n.type?.replace(/_/g, ' ') || 'Alert'} color={typeColor(n.type)} bg={typeColor(n.type) + '20'} />
                </View>

                {/* MESSAGE */}
                <Text style={{ flex: 3, fontSize: 11, color: C.textMuted }} numberOfLines={2}>{n.message || '—'}</Text>

                {/* DATE */}
                <Text style={{ flex: 1.5, fontSize: 10, color: C.textLight }}>{n.created_at?.slice(0, 10) ?? '—'}</Text>

                {/* CHANNELS ── UPDATED ── */}
                <View style={{ flex: 2 }}>
                  <ChannelBadges channels={n.channel} C={C} />
                </View>

                {/* PRODUCT */}
                <Text style={{ flex: 2, fontSize: 11, color: C.textMuted }} numberOfLines={2}>{n.product_name || '—'}</Text>

                {/* STATUS */}
                <View style={{ flex: 1.2 }}>
                  <View style={{ alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99, backgroundColor: n.status === 'Unread' ? C.primary + '20' : C.cardBorder }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: n.status === 'Unread' ? C.primary : C.textLight }}>{n.status || 'Unread'}</Text>
                  </View>
                </View>

                {/* ACTIONS */}
                <View style={{ flex: 1.2, flexDirection: 'row', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setDetailNotif(n)} style={{ padding: 5, borderRadius: 6, backgroundColor: C.primary + '15' }}>
                    <Ionicons name="eye-outline" size={13} color={C.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteOne(n.id)} style={{ padding: 5, borderRadius: 6, backgroundColor: '#ef444415' }}>
                    <Ionicons name="trash-outline" size={13} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {hasMore && (
          <TouchableOpacity onPress={() => setPage(p => p + 1)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder, paddingVertical: 12 }}>
            <Ionicons name="chevron-down-outline" size={16} color={C.primary} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>Load More ({processedNotifs.length - paginated.length} remaining)</Text>
          </TouchableOpacity>
        )}

        {!hasMore && processedNotifs.length > PAGE_SIZE && (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: 11, color: C.textLight }}>— All {processedNotifs.length} notifications loaded —</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
};

export default NotifsTab;
