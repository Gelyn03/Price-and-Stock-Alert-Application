// tabs/MonitoringTab.js
// FIX: Real-time "today" date — a 1-minute interval updates `todayStr`
// so the Today summary card and date grouping labels stay accurate
// even if the admin dashboard is left open past midnight.

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, Dimensions, Modal, RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SectionTitle, Badge } from '../shared/components';
import apiClient from '../../../api/client';

// ── Real-time today hook ───────────────────────────────────────────────────────
// Updates every minute so "Today" / "Yesterday" labels stay correct
// when the screen is left open overnight.
const useTodayDate = () => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [todayStr, setTodayStr] = useState(getTodayStr);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = getTodayStr();
      setTodayStr(prev => prev !== next ? next : prev);
    }, 60 * 1000); // check every minute
    return () => clearInterval(interval);
  }, []);

  return todayStr;
};

const FILTERS = [
  { key: 'all',            label: 'All'        },
  { key: 'price_drop',     label: '📉 Drop'    },
  { key: 'price_increase', label: '📈 Rise'    },
  { key: 'stock',          label: '📦 Stock'   },
  { key: 'target',         label: '🎯 Target'  },
  { key: 'error',          label: '❌ Errors'  },
  { key: 'complete',       label: '✅ Cycles'  },
];

const AUTO_REFRESH_OPTIONS = [
  { label: 'Off',   value: null },
  { label: '10s',   value: 10  },
  { label: '30s',   value: 30  },
  { label: '1 min', value: 60  },
];

const PAGE_SIZE = 20;

const eventColor = (t, C) => {
  if (!t)                            return C.primary;
  if (t.includes('price_drop'))      return C.success;
  if (t.includes('price_increase'))  return C.danger;
  if (t.includes('stock_available')) return C.primary;
  if (t.includes('out_of_stock'))    return C.warning;
  if (t.includes('target'))          return C.accent;
  if (t.includes('complete'))        return C.success;
  if (t.includes('start'))           return C.primary;
  if (t.includes('error'))           return C.danger;
  return C.textMuted;
};

const eventIcon = (t) => {
  if (!t)                            return 'pulse-outline';
  if (t.includes('price_drop'))      return 'trending-down-outline';
  if (t.includes('price_increase'))  return 'trending-up-outline';
  if (t.includes('stock_available')) return 'checkmark-circle-outline';
  if (t.includes('out_of_stock'))    return 'close-circle-outline';
  if (t.includes('target'))         return 'flag-outline';
  if (t.includes('complete'))        return 'checkmark-done-outline';
  if (t.includes('start'))           return 'play-circle-outline';
  if (t.includes('error'))           return 'alert-circle-outline';
  return 'pulse-outline';
};

const formatDateTime = (raw) => {
  if (!raw) return { date: '—', time: '—' };
  const date = new Date(raw);
  const ph = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year:     'numeric',
    month:    '2-digit',
    day:      '2-digit',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  }).formatToParts(date);

  const get = (type) => ph.find(p => p.type === type)?.value ?? '—';

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
};

const toDateOnly = (raw) => {
  if (!raw) return null;
  return raw.split('T')[0];
};

const getGroupLabel = (dateStr, todayStr) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (dateStr === todayStr)     return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  return dateStr;
};

// ── Confirm Modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ visible, onCancel, onConfirm, confirming, title, message, confirmLabel = 'Delete', icon = 'trash-outline', C }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 }}>
      <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: C.cardBorder, gap: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.danger + '18', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name={icon} size={26} color={C.danger} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, textAlign: 'center' }}>{title}</Text>
        </View>
        <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 }}>{message}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={onCancel} disabled={confirming} style={{ flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.textMuted }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} disabled={confirming} style={{ flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
            {confirming ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name={icon} size={14} color="#fff" />}
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{confirming ? 'Deleting…' : confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ── Summary Card ──────────────────────────────────────────────────────────────
const SummaryCard = ({ icon, label, value, color, C }) => (
  <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', gap: 4, minWidth: 70 }}>
    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: color + '20', justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{value}</Text>
    <Text style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', fontWeight: '600' }}>{label}</Text>
  </View>
);

// ── Main Tab ──────────────────────────────────────────────────────────────────
const MonitoringTab = ({ C }) => {
  // FIX: real-time today string
  const todayStr = useTodayDate();

  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('all');
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);

  // ── Date range filter ─────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // ── Auto-refresh ──────────────────────────────────────────────────────────
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(10); 
  const [lastRefreshed,       setLastRefreshed]       = useState(null);
  const [showAutoMenu,        setShowAutoMenu]        = useState(false);
  const autoRefreshRef = useRef(null);

  // ── Delete modals ─────────────────────────────────────────────────────────
  const [deleteTarget,      setDeleteTarget]      = useState(null);
  const [deleting,          setDeleting]          = useState(false);
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [clearingAll,       setClearingAll]       = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchLogs = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await apiClient.get('/admin/monitoring-logs');
      setLogs(res.data?.logs || []);
      setPage(1);
      setLastRefreshed(new Date());
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { 
  setLoading(true); 
  fetchLogs();
  // Reset auto-refresh when tab is focused
  if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
  if (autoRefreshInterval) {
    autoRefreshRef.current = setInterval(() => fetchLogs(true), autoRefreshInterval * 1000);
  }
}, []));

  // ── Auto-refresh effect ───────────────────────────────────────────────────
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (autoRefreshInterval) {
      autoRefreshRef.current = setInterval(() => fetchLogs(true), autoRefreshInterval * 1000);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefreshInterval]);

  const onRefresh = () => fetchLogs(true);

  // ── Filtered logs ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = filter === 'all' ? logs : logs.filter(l => l.event_type?.includes(filter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(l =>
        l.event_type?.toLowerCase().includes(q) ||
        l.product_name?.toLowerCase().includes(q) ||
        l.message?.toLowerCase().includes(q) ||
        l.platform?.toLowerCase().includes(q)
      );
    }
    if (dateFrom) result = result.filter(l => toDateOnly(l.created_at) >= dateFrom);
    if (dateTo)   result = result.filter(l => toDateOnly(l.created_at) <= dateTo);
    return result;
  }, [logs, filter, search, dateFrom, dateTo]);

  // ── Summary counts — FIX: use live todayStr ───────────────────────────────
  const summaryStats = useMemo(() => ({
    total:  logs.length,
    errors: logs.filter(l => l.event_type?.includes('error')).length,
    today:  logs.filter(l => toDateOnly(l.created_at) === todayStr).length,
    drops:  logs.filter(l => l.event_type?.includes('price_drop')).length,
  }), [logs, todayStr]); // re-runs when todayStr ticks over midnight

  // ── Group filtered logs by date — FIX: pass todayStr ─────────────────────
  const groupedLogs = useMemo(() => {
    const paginated = filtered.slice(0, page * PAGE_SIZE);
    const groups = {};
    paginated.forEach(log => {
      const dateKey = toDateOnly(log.created_at) || 'Unknown';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered, page]);

  const hasMore = (page * PAGE_SIZE) < filtered.length;

  // ── Export to CSV ─────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['ID', 'Event Type', 'Product', 'Platform', 'Message', 'Date', 'Time'];
    const rows = filtered.map(l => {
      const { date, time } = formatDateTime(l.created_at);
      return [
        l.id,
        l.event_type || '',
        (l.product_name || '').replace(/,/g, ' '),
        l.platform || '',
        (l.message || '').replace(/,/g, ' '),
        date,
        time,
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `monitoring-logs-${todayStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ── Single delete ─────────────────────────────────────────────────────────
  const confirmDeleteLog = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/admin/monitoring-logs/${deleteTarget.id}`);
      setLogs(prev => prev.filter(l => l.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {} finally {
      setDeleting(false);
    }
  };

  // ── Clear all ─────────────────────────────────────────────────────────────
  const confirmClearAll = async () => {
    const isFiltered = filter !== 'all' || search.trim() || dateFrom || dateTo;
    setClearingAll(true);
    try {
      if (isFiltered) {
        const ids = filtered.map(l => l.id);
        await apiClient.delete('/admin/monitoring-logs', { data: { ids } });
        setLogs(prev => prev.filter(l => !ids.includes(l.id)));
      } else {
        await apiClient.delete('/admin/monitoring-logs');
        setLogs([]);
      }
      setPage(1);
      setClearModalVisible(false);
    } catch {} finally {
      setClearingAll(false);
    }
  };

  if (loading) return <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;

  const isWeb       = Platform.OS === 'web';
  const winHeight   = Dimensions.get('window').height;
  const outerStyle  = isWeb ? { height: winHeight - 106 } : { flex: 1 };
  const scrollStyle = isWeb ? { height: '100%', overflowY: 'auto' } : { flex: 1 };
  const isFiltered  = filter !== 'all' || search.trim() || dateFrom || dateTo;

  const clearModalMessage = isFiltered
    ? `You are about to delete ${filtered.length} filtered log${filtered.length !== 1 ? 's' : ''}. This cannot be undone.`
    : `You are about to delete all ${logs.length} monitoring log${logs.length !== 1 ? 's' : ''}. This cannot be undone.`;

  return (
    <View style={outerStyle}>

      <ConfirmModal
        visible={!!deleteTarget}
        onCancel={() => { if (!deleting) setDeleteTarget(null); }}
        onConfirm={confirmDeleteLog}
        confirming={deleting}
        title="Delete Log"
        message={`Are you sure you want to delete this "${deleteTarget?.event_type?.replace(/_/g, ' ')}" log entry? This action cannot be undone.`}
        confirmLabel="Delete"
        icon="trash-outline"
        C={C}
      />

      <ConfirmModal
        visible={clearModalVisible}
        onCancel={() => { if (!clearingAll) setClearModalVisible(false); }}
        onConfirm={confirmClearAll}
        confirming={clearingAll}
        title="Clear Logs"
        message={clearModalMessage}
        confirmLabel="Clear All"
        icon="trash-bin-outline"
        C={C}
      />

      <ScrollView
        style={scrollStyle}
        contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >

        {/* ── Summary Cards ── */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SummaryCard icon="list-outline"           label="Total Logs" value={summaryStats.total}  color={C.primary}  C={C} />
          <SummaryCard icon="alert-circle-outline"   label="Errors"     value={summaryStats.errors} color={C.danger}   C={C} />
          <SummaryCard icon="today-outline"          label="Today"      value={summaryStats.today}  color={C.success}  C={C} />
          <SummaryCard icon="trending-down-outline"  label="Drops"      value={summaryStats.drops}  color={C.warning}  C={C} />
        </View>

        {/* ── Toolbar row: Auto-refresh + Date filter + Export ── */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Auto-refresh button */}
          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              onPress={() => { setShowAutoMenu(v => !v); setShowDateFilter(false); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: autoRefreshInterval ? C.primary + '20' : C.card,
                borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
                borderWidth: 1, borderColor: autoRefreshInterval ? C.primary : C.cardBorder,
              }}
            >
              <Ionicons name="refresh-outline" size={14} color={autoRefreshInterval ? C.primary : C.textMuted} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: autoRefreshInterval ? C.primary : C.textMuted }}>
                {autoRefreshInterval ? `Auto ${AUTO_REFRESH_OPTIONS.find(o => o.value === autoRefreshInterval)?.label}` : 'Auto-refresh'}
              </Text>
              <Ionicons name="chevron-down-outline" size={11} color={autoRefreshInterval ? C.primary : C.textMuted} />
            </TouchableOpacity>
            {showAutoMenu && (
              <View style={{
                position: 'absolute', top: 36, left: 0, zIndex: 100,
                backgroundColor: C.card, borderRadius: 10,
                borderWidth: 1, borderColor: C.cardBorder,
                shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8,
                minWidth: 120, overflow: 'hidden',
              }}>
                {AUTO_REFRESH_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={String(opt.value)}
                    onPress={() => { setAutoRefreshInterval(opt.value); setShowAutoMenu(false); }}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 10,
                      backgroundColor: autoRefreshInterval === opt.value ? C.primary + '15' : 'transparent',
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                    }}
                  >
                    {autoRefreshInterval === opt.value && <Ionicons name="checkmark-outline" size={13} color={C.primary} />}
                    <Text style={{ fontSize: 12, fontWeight: '600', color: autoRefreshInterval === opt.value ? C.primary : C.text }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Date filter button */}
          <TouchableOpacity
            onPress={() => { setShowDateFilter(v => !v); setShowAutoMenu(false); }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: (dateFrom || dateTo) ? C.accent + '20' : C.card,
              borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
              borderWidth: 1, borderColor: (dateFrom || dateTo) ? C.accent : C.cardBorder,
            }}
          >
            <Ionicons name="calendar-outline" size={14} color={(dateFrom || dateTo) ? C.accent : C.textMuted} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: (dateFrom || dateTo) ? C.accent : C.textMuted }}>
              {dateFrom || dateTo ? 'Date: Active' : 'Date Range'}
            </Text>
          </TouchableOpacity>

          {/* Export CSV button */}
          <TouchableOpacity
            onPress={exportCSV}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: C.card, borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 7,
              borderWidth: 1, borderColor: C.cardBorder,
            }}
          >
            <Ionicons name="download-outline" size={14} color={C.textMuted} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted }}>Export CSV</Text>
          </TouchableOpacity>

          {/* Last refreshed */}
          {lastRefreshed && (
            <Text style={{ fontSize: 10, color: C.textLight, marginLeft: 'auto' }}>
              Updated {lastRefreshed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        {/* ── Date range inputs ── */}
        {showDateFilter && (
          <View style={{
            backgroundColor: C.card, borderRadius: 10,
            borderWidth: 1, borderColor: C.cardBorder,
            padding: 12, gap: 10,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>Filter by Date Range</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, fontWeight: '600' }}>FROM</Text>
                <TextInput
                  value={dateFrom}
                  onChangeText={setDateFrom}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.textLight}
                  style={{ backgroundColor: C.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: C.text, borderWidth: 1, borderColor: C.cardBorder }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, fontWeight: '600' }}>TO</Text>
                <TextInput
                  value={dateTo}
                  onChangeText={setDateTo}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.textLight}
                  style={{ backgroundColor: C.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: C.text, borderWidth: 1, borderColor: C.cardBorder }}
                />
              </View>
            </View>
            {(dateFrom || dateTo) && (
              <TouchableOpacity
                onPress={() => { setDateFrom(''); setDateTo(''); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
              >
                <Ionicons name="close-circle-outline" size={14} color={C.danger} />
                <Text style={{ fontSize: 11, color: C.danger, fontWeight: '600' }}>Clear date filter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Filter chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 4 }}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={{
                  backgroundColor: filter === f.key ? C.primary : C.card,
                  borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
                  borderWidth: 1, borderColor: filter === f.key ? C.primary : C.cardBorder,
                }}
                onPress={() => { setFilter(f.key); setPage(1); }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: filter === f.key ? C.white : C.textMuted }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ── Search bar ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: C.card, borderRadius: 10,
          borderWidth: 1, borderColor: C.cardBorder,
          paddingHorizontal: 10, paddingVertical: 6,
        }}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            value={search}
            onChangeText={t => { setSearch(t); setPage(1); }}
            placeholder="Search by event, product, message…"
            placeholderTextColor={C.textLight}
            style={{ flex: 1, fontSize: 12, color: C.text }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setPage(1); }}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Section title + Clear All ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionTitle C={C} title="Monitoring Event Logs" count={filtered.length} />
          {filtered.length > 0 && (
            <TouchableOpacity
              onPress={() => setClearModalVisible(true)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: C.danger + '15',
                borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
                borderWidth: 1, borderColor: C.danger + '40',
              }}
            >
              <Ionicons name="trash-outline" size={13} color={C.danger} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.danger }}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Empty state ── */}
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 60, gap: 12 }}>
            <Ionicons name={search ? 'search-outline' : 'pulse-outline'} size={48} color={C.textLight} />
            <Text style={{ color: C.textLight, fontSize: 14, fontWeight: '600' }}>
              {search ? 'No logs match your search' : 'No monitoring logs yet'}
            </Text>
            <Text style={{ color: C.textLight, fontSize: 12, textAlign: 'center' }}>
              {search ? 'Try a different keyword or clear the search' : 'Run the scheduler to start monitoring products'}
            </Text>
          </View>
        ) : (
          <>
            {/* ── Grouped logs ── */}
            {groupedLogs.map(([dateKey, dateLogs]) => (
              <View key={dateKey} style={{ gap: 8 }}>

                {/* Date group header — FIX: pass todayStr */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted }}>
                    {getGroupLabel(dateKey, todayStr)}
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: C.divider }} />
                  <Text style={{ fontSize: 10, color: C.textLight }}>{dateLogs.length} event{dateLogs.length !== 1 ? 's' : ''}</Text>
                </View>

                {/* Logs in this group */}
                {dateLogs.map(log => {
                  const color          = eventColor(log.event_type, C);
                  const icon           = eventIcon(log.event_type);
                  const isCycle        = log.event_type?.includes('cycle');
                  const isBeingDeleted = deleteTarget?.id === log.id && deleting;
                  const { date, time } = formatDateTime(log.created_at);

                  return (
                    <View key={log.id} style={{
                      backgroundColor: C.card, borderRadius: 10,
                      borderWidth: 1, borderColor: C.cardBorder,
                      borderLeftWidth: 3, borderLeftColor: color,
                      padding: 12, gap: 6,
                      opacity: isBeingDeleted ? 0.5 : 1,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: color + '20', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name={icon} size={14} color={color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color }}>
                              {log.event_type?.replace(/_/g, ' ').toUpperCase()}
                            </Text>
                            {log.product_name && !isCycle && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Badge
                                  label={log.platform?.toUpperCase() || 'N/A'}
                                  color={log.platform === 'shopee' ? C.shopee : C.lazada}
                                  bg={log.platform === 'shopee' ? C.shopee + '20' : C.lazada + '20'}
                                />
                                <Text style={{ fontSize: 11, color: C.textMuted, flex: 1 }} numberOfLines={1}>
                                  {log.product_name}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ backgroundColor: C.cardBorder, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, color: C.textLight }}>{time}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => setDeleteTarget(log)}
                            style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: C.danger + '15', justifyContent: 'center', alignItems: 'center' }}
                          >
                            <Ionicons name="trash-outline" size={13} color={C.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {log.message && (
                        <Text style={{ fontSize: 12, color: C.textMuted, paddingLeft: 36 }}>{log.message}</Text>
                      )}
                      {log.items_count != null && isCycle && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 36 }}>
                          <Ionicons name="cube-outline" size={12} color={C.textLight} />
                          <Text style={{ fontSize: 11, color: C.textLight }}>{log.items_count} products processed</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Load More */}
            {hasMore && (
              <TouchableOpacity
                onPress={() => setPage(p => p + 1)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  backgroundColor: C.card, borderRadius: 10,
                  borderWidth: 1, borderColor: C.cardBorder,
                  paddingVertical: 12,
                }}
              >
                <Ionicons name="chevron-down-outline" size={16} color={C.primary} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>
                  Load More ({filtered.length - (page * PAGE_SIZE)} remaining)
                </Text>
              </TouchableOpacity>
            )}

            {!hasMore && filtered.length > PAGE_SIZE && (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ fontSize: 11, color: C.textLight }}>— All {filtered.length} logs loaded —</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default MonitoringTab;