// ============================================================
//  Clean shell — imports all tabs and modals from sub-folders
// ============================================================
import React, { useState, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ActivityIndicator,
  StatusBar, Image, Platform, ScrollView
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import * as ImagePicker  from 'expo-image-picker';
import { Ionicons }       from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth }   from '../../context/AuthContext';
import apiClient     from '../../api/client';

// ── Shared ────────────────────────────────────────────────────────────────────
import { DARK, LIGHT }                       from './shared/theme';
import { NAV_ITEMS, SIDEBAR_W }              from './shared/constants';
import { MS }                                from './shared/components';
import {
  setAlertHandler, setConfirmHandler, clearHandlers,
  webAlert, webConfirm,
}                                            from './shared/webAlerts';
import { toPhDateTime } from '../../utils/formatTime';

// ── Modals ────────────────────────────────────────────────────────────────────
import AdminAlertModal   from './modals/AdminAlertModal';
import AdminConfirmModal from './modals/AdminConfirmModal';
import usePing from './hooks/usePing';


// ── Tabs ──────────────────────────────────────────────────────────────────────
import DashboardTab  from './tabs/DashboardTab';
import UsersTab      from './tabs/UsersTab';
import ProductsTab   from './tabs/ProductsTab';
import NotifsTab     from './tabs/NotifsTab';
import MonitoringTab from './tabs/MonitoringTab';
import SettingsTab   from './tabs/SettingsTab';

// ════════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL SCREEN
// ════════════════════════════════════════════════════════════════════════════════
const AdminPanelScreen = () => {
  const { user, logout, setUser } = useAuth();
  const [isDark, setIsDark]       = useState(true);
  const C = isDark ? DARK : LIGHT;

  const [activeTab,      setActiveTab]      = useState('dashboard');
  const [users,           setUsers]          = useState([]);
  const [products,        setProducts]       = useState([]);
  const [stats,           setStats]          = useState(null);
  const [loading,         setLoading]        = useState(true);
  const [refreshing,      setRefreshing]     = useState(false);
  const [clock,           setClock]          = useState(new Date());
  const [photoUri,        setPhotoUri]       = useState(user?.profile_photo_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showLogoutModal,setShowLogoutModal]= useState(false);
  const [bellOpen,    setBellOpen]    = useState(false);
  const [bellNotifs,  setBellNotifs]  = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  usePing();

  // Alert / Confirm modal state
  const [alertModal,   setAlertModal]   = useState({ visible: false, title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', confirmText: '', onConfirm: null });

  // Register global modal handlers on mount
  React.useEffect(() => {
    setAlertHandler  ((title, message) => setAlertModal({ visible: true, title, message }));
    setConfirmHandler((title, message, onConfirm, confirmText) =>
      setConfirmModal({ visible: true, title, message, onConfirm, confirmText }));
    return () => clearHandlers();
  }, []);

  // Clock
  React.useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
  const fetchBell = async () => {
    try {
      const res = await apiClient.get('/admin/bell-notifications');
      setBellNotifs(res.data.notifications || []);
      setUnreadCount(res.data.unread_count  || 0);
    } catch {}
  };
  fetchBell();
  const interval = setInterval(fetchBell, 30000); // poll every 30 seconds
  return () => clearInterval(interval);
}, []);

const handleMarkAllBellRead = async () => {
  try {
    await apiClient.patch('/admin/bell-notifications/read-all');
    // I-update locally — hindi na kailangan mag-refetch
    setBellNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  } catch (e) {
    console.warn('Mark all read error:', e?.response?.status, e?.response?.data);
  }
};

const handleClearAllBell = async () => {
  try {
    await apiClient.delete('/admin/bell-notifications/clear-all');
    setBellNotifs([]);
    setUnreadCount(0);
  } catch (e) {
    console.warn('Clear all error:', e?.response?.status, e?.response?.data);
  }
};

const eventIcon = (type) => {
  switch (type) {
    case 'user_registered': return { icon: 'person-add-outline',   color: '#6366f1' };
    case 'user_logged_in':  return { icon: 'log-in-outline',       color: '#10b981' };
    case 'watchlist_added':  return { icon: 'bookmark-outline',     color: '#3b82f6' };
    case 'price_drop':      return { icon: 'trending-down-outline', color: '#ef4444' };
    case 'target_price':    return { icon: 'flag-outline',         color: '#f59e0b' };
    case 'stock_available': return { icon: 'cube-outline',         color: '#3b82f6' };
    case 'product_flagged': return { icon: 'warning-outline',      color: '#ef4444' };
    default:                return { icon: 'notifications-outline', color: '#6366f1' };
  }
};

  // ── Data Fetch ──────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      const [dashRes, usersRes, prodsRes] = await Promise.all([
        apiClient.get('/admin/dashboard').catch(() => ({ data: {} })),
        apiClient.get('/admin/users'),
        apiClient.get('/admin/products'),
      ]);
      setStats(dashRes.data);
      const u = usersRes.data; setUsers(u?.data || u?.users || (Array.isArray(u) ? u : []));
      const p = prodsRes.data; setProducts(p?.data || p?.products || (Array.isArray(p) ? p : []));
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, []));
  const handleRefresh = () => { setRefreshing(true); fetchAll(); };

  // ── Photo Upload ────────────────────────────────────────────────────────────
  const handlePickPhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { webAlert('Permission needed', 'Please allow access to your photo library.'); return; }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (result.canceled) return;
      const asset = result.assets[0];
      setUploadingPhoto(true);
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const res  = await fetch(asset.uri);
        const blob = await res.blob();
        formData.append('profile_photo', blob, 'profile.jpg');
      } else {
        formData.append('profile_photo', { uri: asset.uri, type: 'image/jpeg', name: 'profile.jpg' });
      }
      const response = await apiClient.post('/admin/profile/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newUrl = response.data?.profile_photo_url;
      setPhotoUri(newUrl);
      if (setUser) setUser(prev => ({ ...prev, profile_photo_url: newUrl }));
    } catch {
      webAlert('Error', 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Delete Handlers ─────────────────────────────────────────────────────────
  const handleDeleteUser = (u) => webConfirm('Delete User', `Delete "${u.name}"? This cannot be undone.`, async () => {
    try {
      await apiClient.delete(`/admin/users/${u.id}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      webAlert('Deleted ✅', `"${u.name}" has been deleted.`);
      fetchAll();
    } catch { webAlert('Error', 'Failed to delete user.'); }
  }, 'Delete');

  const handleDeleteProduct = (p) => webConfirm('Delete Product', `Delete "${p.name}"? This cannot be undone.`, async () => {
    try {
      await apiClient.delete(`/admin/products/${p.id}`);
      setProducts(prev => prev.filter(x => x.id !== p.id));
      webAlert('Deleted ✅', `"${p.name}" has been deleted.`);
      fetchAll();
    } catch { webAlert('Error', 'Failed to delete product.'); }
  }, 'Delete');

  // ── Tab Renderer ────────────────────────────────────────────────────────────
  const m = MS(C);

  const renderContent = () => {
    if (loading) return <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 60 }} />;
    switch (activeTab) {
      case 'dashboard': return <DashboardTab  stats={stats} users={users} products={products} refreshing={refreshing} onRefresh={handleRefresh} C={C} />;
      case 'users':     return <UsersTab      users={users} setUsers={setUsers} refreshing={refreshing} onRefresh={handleRefresh} onDelete={handleDeleteUser} C={C} />;
      case 'products':  return <ProductsTab   products={products} setProducts={setProducts} refreshing={refreshing} onRefresh={handleRefresh} onDelete={handleDeleteProduct} C={C} />;
      case 'notifs':    return <NotifsTab     refreshing={refreshing} onRefresh={handleRefresh} C={C} />;
      case 'monitor':   return <MonitoringTab C={C} />;
      case 'settings':  return <SettingsTab   user={user} C={C} />;
      default: return null;
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* ── Modals ── */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={m.overlay}>
          <View style={m.card}>
            <View style={m.header}>
              <Text style={m.title}>Sign Out</Text>
              <TouchableOpacity onPress={() => setShowLogoutModal(false)} style={m.closeBtn}>
                <Ionicons name="close" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ height: 1, backgroundColor: C.divider }} />
            <Text style={{ color: C.textMuted, fontSize: 13, padding: 16 }}>Are you sure you want to sign out?</Text>
            <div style={{ flexDirection: 'row', gap: 10, padding: 16, paddingTop: 0, display: 'flex' }}>
              <TouchableOpacity style={[m.footerBtn, { flex: 1, margin: 0 }]} onPress={() => setShowLogoutModal(false)}>
                <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[m.footerBtn, { flex: 1, margin: 0, backgroundColor: C.danger + '20' }]} onPress={async () => { setShowLogoutModal(false); try { await logout(); } catch {} }}>
                <Text style={{ color: C.danger, fontSize: 13, fontWeight: '700' }}>Sign Out</Text>
              </TouchableOpacity>
            </div>
          </View>
        </View>
      </Modal>

      <AdminAlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal({ visible: false, title: '', message: '' })}
        C={C}
      />

      <AdminConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={() => {
          setConfirmModal(prev => ({ ...prev, visible: false }));
          if (confirmModal.onConfirm) confirmModal.onConfirm();
        }}
        onCancel={() => setConfirmModal({ visible: false, title: '', message: '', confirmText: '', onConfirm: null })}
        C={C}
      />

      {/* ── Top Bar (Fixed) ── */}
<View style={{
  height: 58,
  backgroundColor: C.header,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 14,
  borderBottomWidth: 1,
  borderBottomColor: C.divider,
  zIndex: 999,
  ...(Platform.OS === 'web' ? { overflow: 'visible' } : {}),
}}>

  {/* ── Left: Logo + Title ── */}
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <View style={{
      width: 30, height: 30, borderRadius: 8,
      backgroundColor: C.primary + '20',
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Ionicons name="shield-checkmark" size={16} color={C.primary} />
    </View>
    <View>
      <Text style={{ color: C.text, fontSize: 13, fontWeight: '800' }}>
        Price and Stock Alert
      </Text>
      <Text style={{ color: C.primary, fontSize: 10, fontWeight: '600', marginTop: 1 }}>
        Admin Panel
      </Text>
    </View>
  </View>

  {/* ── Right: Clock + Bell + Dark Mode ── */}
  <View style={{
    flexDirection: 'row', alignItems: 'center', gap: 8,
    ...(Platform.OS === 'web' ? { overflow: 'visible' } : {}),
  }}>

    {/* Clock */}
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: C.inputBg, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 6,
      borderWidth: 1, borderColor: C.cardBorder,
    }}>
      <Ionicons name="time-outline" size={12} color={C.textLight} />
      <View>
        <Text style={{ color: C.text, fontSize: 12, fontWeight: '800', textAlign: 'right' }}>
          {clock.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Manila' })}
        </Text>
        <Text style={{ color: C.textLight, fontSize: 9, textAlign: 'right', marginTop: 1 }}>
          {clock.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}
        </Text>
      </View>
    </View>

    {/* Bell Button */}
    <TouchableOpacity
      onPress={() => setBellOpen(prev => !prev)}
      style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: C.inputBg,
        borderWidth: 1, borderColor: C.cardBorder,
        justifyContent: 'center', alignItems: 'center',
      }}
    >
      <Ionicons
        name={bellOpen ? 'notifications' : 'notifications-outline'}
        size={18}
        color={unreadCount > 0 ? C.primary : C.text}
      />
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute', top: 4, right: 4,
          minWidth: 14, height: 14, borderRadius: 7,
          backgroundColor: '#ef4444',
          justifyContent: 'center', alignItems: 'center',
          paddingHorizontal: 3,
        }}>
          <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>

    {/* Dark Mode Toggle */}
    <TouchableOpacity
      onPress={() => setIsDark(prev => !prev)}
      style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: C.inputBg,
        borderWidth: 1, borderColor: C.cardBorder,
        justifyContent: 'center', alignItems: 'center',
      }}
    >
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={18}
        color={isDark ? C.warning : C.primary}
      />
    </TouchableOpacity>

  </View>
</View>

{/* ── Bell Dropdown — OUTSIDE Top Bar para hindi maputol ── */}
{bellOpen && (
  <View style={{
    position: 'absolute',
    top: 58,      // exact height ng top bar
    right: 14,    // aligned sa right padding
    width: 320,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1, borderColor: C.cardBorder,
    zIndex: 9999,
    shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 20,
    overflow: 'hidden',
  }}>
    {/* Dropdown Header */}
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    }}>
      <Text style={{ fontSize: 13, fontWeight: '800', color: C.text }}>
        Activity{' '}
        {unreadCount > 0 && (
          <Text style={{ color: '#ef4444' }}>({unreadCount})</Text>
        )}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  {unreadCount > 0 && (
    <TouchableOpacity onPress={handleMarkAllBellRead}>
      <Text style={{ fontSize: 11, color: C.primary, fontWeight: '600' }}>
        Mark all read
      </Text>
    </TouchableOpacity>
  )}
  {bellNotifs.length > 0 && (
    <TouchableOpacity onPress={handleClearAllBell}>
      <Ionicons name="trash-outline" size={15} color={C.danger} />
    </TouchableOpacity>
  )}
</View>
    </View>

    {/* Scrollable List */}
    <ScrollView
      style={{ maxHeight: 400 }}
      showsVerticalScrollIndicator={true}
    >
      {bellNotifs.length === 0 ? (
        <View style={{ padding: 30, alignItems: 'center', gap: 8 }}>
          <Ionicons name="notifications-off-outline" size={28} color={C.textLight} />
          <Text style={{ color: C.textLight, fontSize: 12 }}>No activity yet</Text>
        </View>
      ) : bellNotifs.map((n) => {
        const { icon, color } = eventIcon(n.event_type);
        return (
          <View key={n.id} style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 10,
            paddingHorizontal: 14, paddingVertical: 10,
            borderBottomWidth: 1, borderBottomColor: C.rowBorder,
            backgroundColor: n.is_read ? 'transparent' : C.primary + '08',
          }}>
            {/* Icon */}
            <View style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: color + '20',
              justifyContent: 'center', alignItems: 'center',
              marginTop: 2, flexShrink: 0,
            }}>
              <Ionicons name={icon} size={15} color={color} />
            </View>

            {/* Content */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>
                {n.title}
              </Text>
              <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2, lineHeight: 16 }}>
                {n.message}
              </Text>
              <Text style={{ fontSize: 10, color: C.textLight, marginTop: 4 }}>
                {toPhDateTime(n.created_at)}
              </Text>
            </View>

            {/* Unread dot */}
            {!n.is_read && (
              <View style={{
                width: 7, height: 7, borderRadius: 4,
                backgroundColor: C.primary,
                marginTop: 6, flexShrink: 0,
              }} />
            )}
          </View>
        );
      })}
    </ScrollView>

    {/* See More Footer */}
    {bellNotifs.length > 0 && (
      <TouchableOpacity
        onPress={() => {
          setBellOpen(false);
          setActiveTab('notifs');
        }}
        style={{
          paddingVertical: 12,
          alignItems: 'center',
          borderTopWidth: 1,
          borderTopColor: C.cardBorder,
          backgroundColor: C.inputBg,
        }}
      >
        <Text style={{
          fontSize: 12,
          fontWeight: '700',
          color: C.primary,
        }}>
          See All Notifications →
        </Text>
      </TouchableOpacity>
    )}
  </View>
)}

      {/* ── Main Body Container ── */}
      <View style={{ flex: 1, flexDirection: 'row' }}>

        {/* ── Sidebar (Fixed) ── */}
        <View style={{ width: SIDEBAR_W, backgroundColor: C.sidebar, borderRightWidth: 1, borderRightColor: C.divider, alignItems: 'center', paddingTop: 12, gap: 4 }}>
          <TouchableOpacity style={{ width: 40, height: 40, position: 'relative', marginBottom: 4 }} onPress={handlePickPhoto} disabled={uploadingPhoto}>
            {photoUri
              ? <Image source={{ uri: photoUri }} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: C.primary + '50' }} />
              : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary + '25', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: C.primary + '50' }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: C.primary }}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
                </View>
            }
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 16, backgroundColor: 'rgba(0,0,0,0.45)', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
              {uploadingPhoto ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={10} color="#fff" />}
            </View>
            <View style={{ position: 'absolute', top: 0, right: 0, width: 9, height: 9, borderRadius: 5, backgroundColor: C.success, borderWidth: 2, borderColor: C.sidebar }} />
          </TouchableOpacity>

          <Text style={{ fontSize: 9, fontWeight: '700', color: C.textMuted, textAlign: 'center', maxWidth: SIDEBAR_W - 8 }} numberOfLines={1}>{user?.name?.split(' ')[0]}</Text>
          <View style={{ backgroundColor: C.primary + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 }}>
            <Text style={{ fontSize: 8, fontWeight: '800', color: C.primary }}>Admin</Text>
          </View>
          <View style={{ width: 36, height: 1, backgroundColor: C.divider, marginVertical: 6 }} />

          <View style={{ flex: 1, width: '100%', paddingHorizontal: 10 }}>
            {NAV_ITEMS.map(item => {
              const active = activeTab === item.key;
              return (
                <TouchableOpacity key={item.key} style={{ width: '100%', height: 44, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 4, backgroundColor: active ? C.primary + '15' : 'transparent' }} onPress={() => setActiveTab(item.key)}>
                  <Ionicons name={active ? item.icon : item.icon + '-outline'} size={20} color={active ? C.primary : C.textLight} />
                  <Text style={{ marginLeft: 12, fontSize: 12, fontWeight: active ? '800' : '600', color: active ? C.primary : C.textLight }}>{item.label}</Text>
                  {active && <View style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, backgroundColor: C.primary, borderRadius: 2 }} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12, backgroundColor: C.danger + '12' }} onPress={() => setShowLogoutModal(true)}>
            <Ionicons name="log-out-outline" size={20} color={C.danger} />
          </TouchableOpacity>
        </View>

        {/* ── Main Content Area ── */}
        <View style={{
          flex: 1,
          backgroundColor: C.bg,
          flexDirection: 'column',
          // Fix: on web, minHeight:0 allows the flex child to shrink and scroll correctly
          ...(Platform.OS === 'web' ? { minHeight: 0, overflow: 'hidden' } : {}),
        }}>

          {/* Tab Title Header */}
          <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.divider }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>
              {NAV_ITEMS.find(n => n.key === activeTab)?.label ?? ''}
            </Text>
          </View>

          {/* Tab content wrapper — flex:1 lets the inner ScrollView fill and scroll */}
          <View style={{
            flex: 1,
            // Fix: on web, overflow hidden + minHeight 0 is required to allow
            // the child ScrollView's overflowY:auto to actually scroll
            ...(Platform.OS === 'web' ? { minHeight: 0, overflow: 'hidden' } : {}),
          }}>
            {renderContent()}
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
};

export default AdminPanelScreen;