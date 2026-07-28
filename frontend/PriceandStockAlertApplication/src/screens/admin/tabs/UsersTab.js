// tabs/UsersTab.js
import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  RefreshControl, Platform, Dimensions, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { webAlert, webConfirm } from '../shared/webAlerts';
import UserActivityModal from '../modals/UserActivityModal';
import EditUserModal     from '../modals/EditUserModal';
import apiClient from '../../../api/client';

const PAGE_SIZE = 20;

const DEACTIVATION_REASONS = [
  { key: 'violation',   label: 'Community Violation',      icon: 'warning-outline',         desc: 'User violated community guidelines' },
  { key: 'spam',        label: 'Spam / Abuse',             icon: 'ban-outline',              desc: 'Spamming or abusive behavior' },
  { key: 'fraud',       label: 'Fraudulent Activity',      icon: 'alert-circle-outline',     desc: 'Suspicious or fraudulent activity' },
  { key: 'inactive',    label: 'Long-term Inactivity',     icon: 'time-outline',             desc: 'Account inactive for a long period' },
  { key: 'request',     label: 'User Request',             icon: 'person-remove-outline',    desc: 'User requested account deactivation' },
  { key: 'other',       label: 'Other Reason',             icon: 'ellipsis-horizontal-outline', desc: 'Other reason (add note below)' },
];

// ── Deactivate Reason Modal ───────────────────────────────────────────────────
const DeactivateReasonModal = ({ visible, user, onConfirm, onCancel, C }) => {
  const [selected, setSelected] = useState(null);
  const [note,     setNote]     = useState('');
  const [loading,  setLoading]  = useState(false);

  const reset = () => { setSelected(null); setNote(''); setLoading(false); };

  const handleCancel = () => { reset(); onCancel(); };

  const handleConfirm = async () => {
    if (!selected) return;
    const reason = selected.key === 'other' && note.trim()
      ? note.trim()
      : selected.label + (note.trim() ? ` — ${note.trim()}` : '');
    setLoading(true);
    await onConfirm(reason);
    reset();
  };

  if (!visible || !user) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ backgroundColor: C.card, borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden' }}>

          {/* Header */}
          <View style={{ backgroundColor: C.danger + '12', padding: 20, borderBottomWidth: 1, borderBottomColor: C.danger + '25', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.danger + '20', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="lock-closed-outline" size={20} color={C.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>Deactivate Account</Text>
              <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }} numberOfLines={1}>
                {user.name} · {user.email}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancel}>
              <Ionicons name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, marginBottom: 4 }}>
              SELECT REASON FOR DEACTIVATION
            </Text>

            {DEACTIVATION_REASONS.map(r => {
              const isSelected = selected?.key === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setSelected(r)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    padding: 12, borderRadius: 10,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? C.danger : C.cardBorder,
                    backgroundColor: isSelected ? C.danger + '08' : C.bg,
                    marginBottom: 6,
                  }}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: isSelected ? C.danger + '18' : C.cardBorder + '50', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name={r.icon} size={16} color={isSelected ? C.danger : C.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? C.danger : C.text }}>{r.label}</Text>
                    <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{r.desc}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={C.danger} />}
                </TouchableOpacity>
              );
            })}

            {/* Optional note */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, marginTop: 4, marginBottom: 6 }}>
              ADDITIONAL NOTE (OPTIONAL)
            </Text>
            <TextInput
              style={{
                backgroundColor: C.inputBg, borderRadius: 8, borderWidth: 1,
                borderColor: C.cardBorder, padding: 10, fontSize: 12,
                color: C.text, minHeight: 60, textAlignVertical: 'top',
              }}
              placeholder="Add a note for the user..."
              placeholderTextColor={C.textLight}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={200}
            />
            <Text style={{ fontSize: 10, color: C.textLight, textAlign: 'right' }}>{note.length}/200</Text>
          </ScrollView>

          {/* Footer */}
          <View style={{ flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: C.divider }}>
            <TouchableOpacity
              onPress={handleCancel}
              style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: C.cardBorder, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.textMuted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!selected || loading}
              style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: !selected ? C.danger + '40' : C.danger, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="lock-closed" size={14} color="#fff" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Deactivate</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: 'shield-checkmark', color: (C) => C.accent,   bg: (C) => C.accent   + '20', sortOrder: 0 },
  user:  { label: 'User',  icon: 'person',           color: (C) => C.primary,  bg: (C) => C.primary  + '20', sortOrder: 1 },
};

const getRole = (role, C) => {
  const cfg = ROLE_CONFIG[role?.toLowerCase()] ?? ROLE_CONFIG.user;
  return { label: cfg.label, icon: cfg.icon, color: cfg.color(C), bg: cfg.bg(C), sortOrder: cfg.sortOrder };
};

// ── Summary Card ──────────────────────────────────────────────────────────────
const SummaryCard = ({ icon, label, value, color, C, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
    style={{ flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', gap: 4, minWidth: 60 }}
  >
    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: color + '20', justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={icon} size={15} color={color} />
    </View>
    <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>{value}</Text>
    <Text style={{ fontSize: 9, color: C.textMuted, textAlign: 'center', fontWeight: '600' }}>{label}</Text>
  </TouchableOpacity>
);

// ── Sortable column header ────────────────────────────────────────────────────
const SortHeader = ({ label, flex, align = 'left', sortKey, sortBy, sortDir, onSort, C }) => {
  const isActive = sortBy === sortKey;
  return (
    <TouchableOpacity
      onPress={() => onSort(sortKey)}
      style={{ flex, flexDirection: 'row', alignItems: 'center', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start', gap: 3 }}
    >
      <Text style={{ fontSize: 9, fontWeight: '800', color: isActive ? C.primary : C.textLight, letterSpacing: 0.8 }}>{label}</Text>
      {isActive
        ? <Ionicons name={sortDir === 'asc' ? 'chevron-up' : 'chevron-down'} size={9} color={C.primary} />
        : <Ionicons name="swap-vertical-outline" size={9} color={C.textLight} />
      }
    </TouchableOpacity>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const UsersTab = ({ users, setUsers, refreshing, onRefresh, onDelete, C }) => {
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole,   setFilterRole]   = useState('all');
  const [sortBy,       setSortBy]       = useState('role');
  const [sortDir,      setSortDir]      = useState('asc');
  const [page,         setPage]         = useState(1);

  const [bulkMode,    setBulkMode]    = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const [selectedUser,      setSelectedUser]      = useState(null);
  const [activityModal,     setActivityModal]     = useState(false);
  const [editModal,         setEditModal]         = useState(false);
  const [deactivateModal,   setDeactivateModal]   = useState(false);
  const [pendingDeactivate, setPendingDeactivate] = useState(null);

  const summaryStats = useMemo(() => ({
    total:    users.length,
    active:   users.filter(u => u.is_active !== false).length,
    inactive: users.filter(u => u.is_active === false).length,
    online:   users.filter(u => u.is_online === true && u.is_active !== false).length,
    admins:   users.filter(u => u.role?.toLowerCase() === 'admin').length,
  }), [users]);

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    const result = users.filter(u => {
      const matchS =
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchF =
        filterStatus === 'all'      ? true :
        filterStatus === 'active'   ? u.is_active !== false :
        filterStatus === 'inactive' ? u.is_active === false :
        filterStatus === 'online'   ? u.is_online === true && u.is_active !== false : true;
      const matchR =
        filterRole === 'all'   ? true :
        filterRole === 'admin' ? u.role?.toLowerCase() === 'admin' :
                                 u.role?.toLowerCase() !== 'admin';
      return matchS && matchF && matchR;
    });

    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name':   aVal = a.name?.toLowerCase()  ?? ''; bVal = b.name?.toLowerCase()  ?? ''; break;
        case 'email':  aVal = a.email?.toLowerCase() ?? ''; bVal = b.email?.toLowerCase() ?? ''; break;
        case 'role':   aVal = (ROLE_CONFIG[a.role?.toLowerCase()] ?? ROLE_CONFIG.user).sortOrder; bVal = (ROLE_CONFIG[b.role?.toLowerCase()] ?? ROLE_CONFIG.user).sortOrder; break;
        case 'status': aVal = a.is_active !== false ? 0 : 1; bVal = b.is_active !== false ? 0 : 1; break;
        case 'online': aVal = a.is_online === true ? 0 : 1;  bVal = b.is_online === true ? 0 : 1;  break;
        case 'items':  aVal = a.watchlist_items_count ?? 0;   bVal = b.watchlist_items_count ?? 0;  break;
        default: return 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });

    return result;
  }, [users, search, filterStatus, filterRole, sortBy, sortDir]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = paginated.length < filtered.length;

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(paginated.filter(u => u.role?.toLowerCase() !== 'admin').map(u => u.id)));
  const clearBulk = () => { setSelectedIds(new Set()); setBulkMode(false); };

  const bulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);

    if (action === 'delete') {
      webConfirm('Delete Selected', `Delete ${ids.length} user${ids.length !== 1 ? 's' : ''}? This cannot be undone.`, async () => {
        setBulkLoading(true);
        try {
          await apiClient.delete('/admin/users/bulk', { data: { ids } });
          setUsers(prev => prev.filter(u => !selectedIds.has(u.id)));
          clearBulk();
        } catch { webAlert('Error', 'Failed to delete users.'); }
        finally { setBulkLoading(false); }
      }, 'Delete');
      return;
    }

    setBulkLoading(true);
    try {
      if (action === 'activate') {
        await apiClient.post('/admin/users/bulk-activate', { ids });
        setUsers(prev => prev.map(u => selectedIds.has(u.id) ? { ...u, is_active: true, deactivation_reason: null } : u));
      } else if (action === 'deactivate') {
        await apiClient.post('/admin/users/bulk-deactivate', { ids });
        setUsers(prev => prev.map(u => selectedIds.has(u.id) ? { ...u, is_active: false } : u));
      }
      clearBulk();
    } catch { webAlert('Error', `Failed to ${action} users.`); }
    finally { setBulkLoading(false); }
  };

  // ── Toggle active — opens reason modal if deactivating ────────────────────
  const handleToggleActive = (u) => {
    const isActive = u.is_active !== false;

    if (!isActive) {
      // Activating — no reason needed, direct confirm
      webConfirm(
        'Activate User',
        `Activate account for "${u.name}"?`,
        async () => {
          try {
            await apiClient.patch(`/admin/users/${u.id}/toggle-status`);
            setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: true, deactivation_reason: null } : x));
            webAlert('Activated ✅', `"${u.name}" has been activated.`);
          } catch {
            webAlert('Error', 'Failed to update user status.');
          }
        },
        'Activate'
      );
    } else {
      // Deactivating — open reason modal first
      setPendingDeactivate(u);
      setDeactivateModal(true);
    }
  };

  // ── Perform deactivation with reason ─────────────────────────────────────
  const handleDeactivateConfirm = async (reason) => {
    if (!pendingDeactivate) return;
    try {
      await apiClient.patch(`/admin/users/${pendingDeactivate.id}/toggle-status`, { reason });
      setUsers(prev => prev.map(x =>
        x.id === pendingDeactivate.id
          ? { ...x, is_active: false, deactivation_reason: reason }
          : x
      ));
      webAlert('Deactivated ✅', `"${pendingDeactivate.name}" has been deactivated.\nReason: ${reason}`);
    } catch {
      webAlert('Error', 'Failed to deactivate user.');
    } finally {
      setDeactivateModal(false);
      setPendingDeactivate(null);
    }
  };

  const handleUserUpdated = (updatedUser) => {
    setUsers(prev => prev.map(x => x.id === updatedUser.id ? { ...x, ...updatedUser } : x));
  };

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Online', 'Watchlist Items', 'Joined'];
    const rows = filtered.map(u => [
      u.id,
      (u.name || '').replace(/,/g, ' '),
      u.email || '',
      u.role || 'user',
      u.is_active !== false ? 'Active' : 'Inactive',
      u.is_online === true ? 'Online' : 'Offline',
      u.watchlist_items_count ?? 0,
      u.created_at?.slice(0, 10) || '',
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const isWeb     = Platform.OS === 'web';
  const winHeight = isWeb ? Dimensions.get('window').height : 0;
  const sortProps = { sortBy, sortDir, onSort: handleSort, C };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ── Deactivate Reason Modal ── */}
      <DeactivateReasonModal
        visible={deactivateModal}
        user={pendingDeactivate}
        onConfirm={handleDeactivateConfirm}
        onCancel={() => { setDeactivateModal(false); setPendingDeactivate(null); }}
        C={C}
      />

      {/* ── Summary Cards ── */}
      <View style={{ flexDirection: 'row', gap: 8, padding: 10, paddingBottom: 6 }}>
        <SummaryCard icon="people-outline"           label="Total"    value={summaryStats.total}    color={C.primary}  C={C} onPress={() => { setFilterStatus('all');      setFilterRole('all'); setPage(1); }} />
        <SummaryCard icon="checkmark-circle-outline" label="Active"   value={summaryStats.active}   color={C.success}  C={C} onPress={() => { setFilterStatus('active');   setPage(1); }} />
        <SummaryCard icon="close-circle-outline"     label="Inactive" value={summaryStats.inactive} color={C.danger}   C={C} onPress={() => { setFilterStatus('inactive'); setPage(1); }} />
        <SummaryCard icon="radio-button-on-outline"  label="Online"   value={summaryStats.online}   color="#10b981"    C={C} onPress={() => { setFilterStatus('online');   setPage(1); }} />
        <SummaryCard icon="shield-checkmark-outline" label="Admins"   value={summaryStats.admins}   color={C.accent}   C={C} onPress={() => { setFilterRole('admin');      setFilterStatus('all'); setPage(1); }} />
      </View>

      {/* ── Search + Filters + Export + Bulk ── */}
      <View style={{ paddingHorizontal: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.divider, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 8, paddingHorizontal: 10, gap: 6, height: 34, borderWidth: 1, borderColor: C.cardBorder }}>
            <Ionicons name="search-outline" size={14} color={C.textLight} />
            <TextInput
              style={{ flex: 1, fontSize: 12, color: C.text, paddingVertical: 0, outlineStyle: 'none' }}
              placeholder="Search by name or email..."
              placeholderTextColor={C.textLight}
              value={search}
              onChangeText={t => { setSearch(t); setPage(1); }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(''); setPage(1); }}>
                <Ionicons name="close-circle" size={14} color={C.textLight} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={exportCSV} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder }}>
            <Ionicons name="download-outline" size={14} color={C.textMuted} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted }}>CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setBulkMode(v => !v); setSelectedIds(new Set()); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: bulkMode ? C.primary + '20' : C.card, borderWidth: 1, borderColor: bulkMode ? C.primary : C.cardBorder }}>
            <Ionicons name="checkbox-outline" size={14} color={bulkMode ? C.primary : C.textMuted} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: bulkMode ? C.primary : C.textMuted }}>Select</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {['all', 'active', 'inactive', 'online'].map(f => (
                <TouchableOpacity key={f} style={{ backgroundColor: filterStatus === f ? C.primary : C.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: filterStatus === f ? C.primary : C.cardBorder }} onPress={() => { setFilterStatus(f); setPage(1); }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: filterStatus === f ? C.white : C.textMuted }}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: 1, backgroundColor: C.cardBorder, marginHorizontal: 4 }} />
              {['all', 'admin', 'user'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: filterRole === r ? (r === 'admin' ? C.accent + '20' : C.primary + '20') : C.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: filterRole === r ? (r === 'admin' ? C.accent : C.primary) : C.cardBorder }}
                  onPress={() => { setFilterRole(r); setPage(1); }}
                >
                  {r !== 'all' && <Ionicons name={r === 'admin' ? 'shield-checkmark' : 'person'} size={10} color={filterRole === r ? (r === 'admin' ? C.accent : C.primary) : C.textMuted} />}
                  <Text style={{ fontSize: 10, fontWeight: '700', color: filterRole === r ? (r === 'admin' ? C.accent : C.primary) : C.textMuted }}>
                    {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <Text style={{ fontSize: 10, color: C.textMuted }}>
          Showing {paginated.length} of {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* ── Bulk action bar ── */}
      {bulkMode && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primary + '10', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.primary + '30' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={selectAll}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>Select Non-Admins ({paginated.filter(u => u.role?.toLowerCase() !== 'admin').length})</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: C.textMuted }}>{selectedIds.size} selected</Text>
          </View>
          {selectedIds.size > 0 && (
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {bulkLoading
                ? <ActivityIndicator size="small" color={C.primary} />
                : <>
                    <TouchableOpacity onPress={() => bulkAction('activate')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: C.success, borderRadius: 7 }}>
                      <Ionicons name="key-outline" size={12} color="#fff" />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Activate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => bulkAction('deactivate')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: C.warning, borderRadius: 7 }}>
                      <Ionicons name="lock-closed-outline" size={12} color="#fff" />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Deactivate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => bulkAction('delete')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: C.danger, borderRadius: 7 }}>
                      <Ionicons name="trash-outline" size={12} color="#fff" />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Delete</Text>
                    </TouchableOpacity>
                  </>
              }
              <TouchableOpacity onPress={clearBulk} style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: C.cardBorder, borderRadius: 7 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: C.textMuted }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Table ── */}
      <View style={{ ...(isWeb ? { height: winHeight - 106 - 200, margin: 10 } : { flex: 1, margin: 10 }), backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, backgroundColor: C.tableHead, borderBottomWidth: 1, borderBottomColor: C.divider }}>
          {bulkMode && <View style={{ width: 30 }} />}
          <SortHeader label="NAME"   flex={1.8} sortKey="name"   {...sortProps} />
          <SortHeader label="EMAIL"  flex={2}   sortKey="email"  {...sortProps} />
          <SortHeader label="ROLE"   flex={1}   sortKey="role"   {...sortProps} align="center" />
          <SortHeader label="STATUS" flex={0.9} sortKey="status" {...sortProps} align="center" />
          <SortHeader label="ONLINE" flex={0.9} sortKey="online" {...sortProps} align="center" />
          <SortHeader label="ITEMS"  flex={0.8} sortKey="items"  {...sortProps} align="center" />
          <Text style={{ flex: bulkMode ? 1.5 : 2, fontSize: 9, fontWeight: '800', color: C.textLight, textAlign: 'center', letterSpacing: 0.8 }}>ACTIONS</Text>
        </View>

        <FlatList
          data={paginated}
          keyExtractor={item => String(item.id)}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          nestedScrollEnabled={true}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          renderItem={({ item, index }) => {
            const isActive   = item.is_active !== false;
            const isOnline   = item.is_online === true;
            const isAdmin    = item.role?.toLowerCase() === 'admin';
            const role       = getRole(item.role, C);
            const isSelected = selectedIds.has(item.id);

            return (
              <TouchableOpacity
                activeOpacity={bulkMode ? 0.7 : 1}
                onPress={() => { if (bulkMode && !isAdmin) toggleSelect(item.id); }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.rowBorder, backgroundColor: isSelected ? C.primary + '10' : isAdmin ? C.accent + '08' : index % 2 === 1 ? C.tableRowAlt : 'transparent', opacity: isActive ? 1 : 0.6 }}
              >
                {bulkMode && (
                  <View style={{ width: 30, alignItems: 'center' }}>
                    {!isAdmin && (
                      <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: isSelected ? C.primary : C.cardBorder, backgroundColor: isSelected ? C.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                        {isSelected && <Ionicons name="checkmark" size={11} color="#fff" />}
                      </View>
                    )}
                  </View>
                )}

                <View style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: role.bg, justifyContent: 'center', alignItems: 'center', borderWidth: isAdmin ? 1.5 : 0, borderColor: isAdmin ? role.color : 'transparent', position: 'relative' }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: role.color }}>{item.name?.charAt(0)?.toUpperCase()}</Text>
                    {isActive && (
                      <View style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: isOnline ? C.success : '#94a3b8', borderWidth: 1.5, borderColor: C.card }} />
                    )}
                  </View>
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: C.text }} numberOfLines={1}>{item.name}</Text>
                </View>

                <Text style={{ flex: 2, fontSize: 11, color: C.textMuted }} numberOfLines={1}>{item.email}</Text>

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: role.bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Ionicons name={role.icon} size={9} color={role.color} />
                    <Text style={{ fontSize: 9, fontWeight: '800', color: role.color, letterSpacing: 0.3 }}>{role.label.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={{ flex: 0.9, alignItems: 'center' }}>
                  <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, backgroundColor: isActive ? C.success + '18' : C.danger + '18' }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: isActive ? C.success : C.danger }}>{isActive ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>

                <View style={{ flex: 0.9, alignItems: 'center' }}>
                  {isActive ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isOnline ? C.success : '#94a3b8' }} />
                      <Text style={{ fontSize: 9, fontWeight: '700', color: isOnline ? C.success : C.textMuted }}>{isOnline ? 'Online' : 'Offline'}</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 9, color: C.textLight }}>—</Text>
                  )}
                </View>

                <View style={{ flex: 0.8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.primary }}>{item.watchlist_items_count ?? 0}</Text>
                </View>

                <View style={{ flex: bulkMode ? 1.5 : 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <TouchableOpacity style={{ width: 26, height: 26, borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: C.primary + '12' }} onPress={() => { setSelectedUser(item); setActivityModal(true); }}>
                    <Ionicons name="analytics-outline" size={13} color={C.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={{ width: 26, height: 26, borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: C.accent + '12' }} onPress={() => { setSelectedUser(item); setEditModal(true); }}>
                    <Ionicons name="pencil-outline" size={13} color={C.accent} />
                  </TouchableOpacity>
                  {!isAdmin && (
                    <>
                      <TouchableOpacity style={{ width: 26, height: 26, borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: isActive ? C.warning + '12' : C.success + '12' }} onPress={() => handleToggleActive(item)}>
                        <Ionicons name={isActive ? 'lock-closed-outline' : 'key-outline'} size={13} color={isActive ? C.warning : C.success} />
                      </TouchableOpacity>
                      <TouchableOpacity style={{ width: 26, height: 26, borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: C.danger + '12' }} onPress={() => onDelete(item)}>
                        <Ionicons name="trash-outline" size={13} color={C.danger} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <>
              {hasMore && (
                <TouchableOpacity onPress={() => setPage(p => p + 1)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.rowBorder }}>
                  <Ionicons name="chevron-down-outline" size={16} color={C.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>Load More ({filtered.length - paginated.length} remaining)</Text>
                </TouchableOpacity>
              )}
              {!hasMore && filtered.length > PAGE_SIZE && (
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ fontSize: 11, color: C.textLight }}>— All {filtered.length} users loaded —</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40, gap: 10 }}>
              <Ionicons name="people-outline" size={36} color={C.textLight} />
              <Text style={{ color: C.textLight, fontSize: 13 }}>No users found</Text>
            </View>
          }
        />
      </View>

      <UserActivityModal visible={activityModal} user={selectedUser} onClose={() => { setActivityModal(false); setSelectedUser(null); }} C={C} />
      <EditUserModal visible={editModal} user={selectedUser} onClose={() => { setEditModal(false); setSelectedUser(null); }} onUpdated={handleUserUpdated} C={C} />
    </View>
  );
};

export default UsersTab;