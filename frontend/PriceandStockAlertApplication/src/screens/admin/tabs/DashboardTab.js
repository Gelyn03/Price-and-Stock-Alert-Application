import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Dimensions,
  Platform, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { SectionTitle, StatCard, THead, Badge } from '../shared/components';
import apiClient from '../../../api/client';

const ALL_MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR   = 2024;
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - START_YEAR + 1 },
  (_, i) => START_YEAR + i
);

const DUMMY_ACTIVITY_COUNTS = [2, 5, 3, 8, 6, 4, 7, 9, 5, 3, 6, 4, 8, 7, 5,
                               3, 9, 6, 4, 8, 5, 7, 3, 6, 9, 4, 7, 5, 8, 6];
const DUMMY_ACTIVITY_LABELS = Array.from({ length: 30 }, (_, i) => String(i + 1));

const getYAxisConfig = (maxValue) => {
  if (maxValue <= 0) return { yMax: 5, segments: 5 };
  const stepSize = maxValue > 20 ? 10 : maxValue > 5 ? 5 : 1;
  const yMax     = Math.ceil(maxValue / stepSize) * stepSize;
  let segments   = yMax / stepSize;
  if (segments > 6) {
    const newStep = Math.ceil(maxValue / 6 / stepSize) * stepSize;
    const newMax  = Math.ceil(maxValue / newStep) * newStep;
    return { yMax: newMax, segments: Math.min(6, newMax / newStep) };
  }
  return { yMax, segments };
};

const SIDEBAR_W = 64;

const DashboardTab = ({ stats: initialStats, users: initialUsers, products: initialProducts, refreshing, onRefresh, C }) => {
  // ✅ Fix: useRef so today doesn't recreate on every render
  const today             = useRef(new Date()).current;
  const currentMonthIndex = today.getMonth();
  const isWeb             = Platform.OS === 'web';

  const [liveStats,    setLiveStats]    = useState(initialStats);
  const [liveUsers,    setLiveUsers]    = useState(initialUsers);
  const [liveProducts, setLiveProducts] = useState(initialProducts);

  const [contentWidth, setContentWidth] = useState(
    Dimensions.get('window').width - SIDEBAR_W - 24
  );

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(currentMonthIndex);
  const [lineLoading,        setLineLoading]         = useState(false);

  // ── Cache: stores fetched data per month index (0–11) ────────────────────
  const lineCache = useRef({});
  const [lineChartData, setLineChartData] = useState(null);

  const [selectedYear,  setSelectedYear]  = useState(CURRENT_YEAR);
  const [barChartStats, setBarChartStats] = useState(null);
  const [barLoading,    setBarLoading]    = useState(false);

  // ── DummyJSON state ───────────────────────────────────────────────────────
  const [dummyByMonth, setDummyByMonth] = useState(Array(12).fill(0));
  const [dummyLoading, setDummyLoading] = useState(false);
  const [dummyTotal,   setDummyTotal]   = useState(0);

  useEffect(() => { if (initialStats)    setLiveStats(initialStats);       }, [initialStats]);
  useEffect(() => { if (initialUsers)    setLiveUsers(initialUsers);       }, [initialUsers]);
  useEffect(() => { if (initialProducts) setLiveProducts(initialProducts); }, [initialProducts]);

  const fetchLiveStats = useCallback(async () => {
    try {
      const [dashRes, usersRes, prodsRes] = await Promise.all([
        apiClient.get('/admin/dashboard', {
          params: { month: today.getMonth() + 1, year: today.getFullYear() },
        }),
        apiClient.get('/admin/users'),
        apiClient.get('/admin/products'),
      ]);
      setLiveStats(dashRes.data);
      const u = usersRes.data;
      setLiveUsers(u?.data || u?.users || (Array.isArray(u) ? u : []));
      const p = prodsRes.data;
      setLiveProducts(p?.data || p?.products || (Array.isArray(p) ? p : []));
    } catch (err) {
      console.error('fetchLiveStats error:', err);
    }
  }, []);

  useEffect(() => {
    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 10000);
    return () => clearInterval(interval);
  }, [fetchLiveStats]);

  // ── Fetch line chart — with cache ─────────────────────────────────────────
  const fetchLineData = useCallback(async (monthIndex) => {
    const isFuture = monthIndex > currentMonthIndex;

    if (isFuture) {
      setLineChartData({ counts: [], labels: [] });
      return;
    }

    if (lineCache.current[monthIndex]) {
      setLineChartData(lineCache.current[monthIndex]);
      return;
    }

    setLineLoading(true);
    try {
      const res = await apiClient.get('/admin/dashboard', {
        params: { month: monthIndex + 1, year: today.getFullYear() },
      });
      const counts = res.data?.activity_counts || [];
      const labels = res.data?.activity_labels || [];
      lineCache.current[monthIndex] = { counts, labels };
      setLineChartData({ counts, labels });
    } catch (err) {
      console.error('fetchLineData error:', err);
      const fallback = { counts: DUMMY_ACTIVITY_COUNTS, labels: DUMMY_ACTIVITY_LABELS };
      lineCache.current[monthIndex] = fallback;
      setLineChartData(fallback);
    } finally {
      setLineLoading(false);
    }
  }, [currentMonthIndex]);

  // ✅ Fix: fetchLineData added to deps
  useEffect(() => {
    fetchLineData(selectedMonthIndex);
  }, [selectedMonthIndex, fetchLineData]);

  const fetchBarData = useCallback(async (year) => {
    setBarLoading(true);
    try {
      const res = await apiClient.get('/admin/dashboard/platform-stats', {
        params: { year },
      });
      const rows = res.data?.platform_stats || [];
      if (rows.length === 0) {
        setBarChartStats({
  platform_stats: ALL_MONTHS.map((month) => ({
    month,
    shopee: 0,  // ← ZERO na lang
    lazada: 0,  // ← ZERO na lang
  })),
});
      } else {
        setBarChartStats(res.data);
      }
    } catch (err) {
      console.error('fetchBarData error:', err);
      setBarChartStats({
        platform_stats: ALL_MONTHS.map((month, i) => ({
          month,
          shopee: [5, 8, 12, 15, 10, 7, 9, 14, 11, 6, 8, 13][i],
          lazada: [3, 6,  9, 11,  8, 5, 7, 10,  8, 4, 6, 10][i],
        })),
      });
    } finally {
      setBarLoading(false);
    }
  }, []);

  // ✅ Fix: fetchBarData added to deps
  useEffect(() => { fetchBarData(selectedYear); }, [selectedYear, fetchBarData]);

  // ── Fetch DummyJSON ───────────────────────────────────────────────────────
  useEffect(() => {
    setDummyLoading(true);
    fetch('https://dummyjson.com/products?limit=194&skip=0')
      .then(r => r.json())
      .then(json => {
        const products = json.products || [];
        setDummyTotal(products.length);
        const counts = Array(12).fill(0);
        products.forEach((p) => {
          const monthIndex = (p.id - 1) % 12;
          counts[monthIndex] += 1;
        });
        setDummyByMonth(counts);
      })
      .catch((err) => {
        console.error('fetchDummyJSON error:', err);
        setDummyByMonth([18, 16, 17, 15, 16, 17, 16, 15, 17, 16, 15, 16]);
        setDummyTotal(194);
      })
      .finally(() => setDummyLoading(false));
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const stats        = liveStats;
  const recentUsers  = liveUsers.slice(0, 5);
  const invalidCount = liveProducts.filter(p => !p.is_valid).length;
  const activeUsers  = liveUsers.filter(u => u.is_active !== false).length;

  const isFutureMonth  = selectedMonthIndex > currentMonthIndex;
  const rawLoginCounts = isFutureMonth
  ? []
  : (lineChartData?.counts?.length > 0
      ? lineChartData.counts
      : (initialStats?.activity_counts?.length > 0
          ? initialStats.activity_counts
          : []));  // ← EMPTY na lang
const rawLoginLabels = isFutureMonth
  ? []
  : (lineChartData?.labels?.length > 0
      ? lineChartData.labels
      : (initialStats?.activity_labels?.length > 0
          ? initialStats.activity_labels
          : []));  // ← EMPTY na lang

  const lineRawMax = Math.max(...(rawLoginCounts.length ? rawLoginCounts : [0]));
  const { segments: lineSegments } = getYAxisConfig(lineRawMax);

  const lineData = {
    labels: rawLoginLabels.length ? rawLoginLabels : ['—'],
    datasets: [{
      data:        rawLoginCounts.length ? rawLoginCounts : [0],
      color:       () => isFutureMonth ? C.textMuted : C.primary,
      strokeWidth: 3,
    }],
  };

 const platformRows = (barChartStats?.platform_stats?.length > 0)
  ? barChartStats.platform_stats
  : ALL_MONTHS.map((month) => ({
      month,
      shopee: 0,
      lazada: 0,
    }));

  const shopeeByMonth = ALL_MONTHS.map(m => {
    const row = platformRows.find(r => r.month === m);
    return row ? (row.shopee ?? 0) : 0;
  });
  const lazadaByMonth = ALL_MONTHS.map(m => {
    const row = platformRows.find(r => r.month === m);
    return row ? (row.lazada ?? 0) : 0;
  });

  const shopeeRawMax = Math.max(...shopeeByMonth, 0);
  const lazadaRawMax = Math.max(...lazadaByMonth, 0);
  const dummyRawMax  = Math.max(...dummyByMonth, 0);
  const { segments: shopeeSegments } = getYAxisConfig(shopeeRawMax);
  const { segments: lazadaSegments } = getYAxisConfig(lazadaRawMax);
  const { segments: dummySegments  } = getYAxisConfig(dummyRawMax);

  const chartWidth = contentWidth - 16;

  // ── Chart configs ─────────────────────────────────────────────────────────
  const lineChartConfig = {
    backgroundColor:         C.card,
    backgroundGradientFrom:  C.card,
    backgroundGradientTo:    C.card,
    decimalPlaces:           0,
    color:                   () => isFutureMonth ? C.textMuted : C.primary,
    labelColor:              () => C.textMuted,
    propsForDots:            { r: '3', strokeWidth: '2', stroke: C.card },
    propsForBackgroundLines: { strokeDasharray: '', stroke: C.divider, strokeWidth: 0.5 },
    propsForLabels:          { fontSize: rawLoginLabels.length > 15 ? 7 : 9 },
  };

  // Shopee — official orange #EE4D2D
  const shopeeChartConfig = {
    backgroundColor:           C.card,
    backgroundGradientFrom:    C.card,
    backgroundGradientTo:      C.card,
    fillShadowGradient:        '#EE4D2D',
    fillShadowGradientOpacity: 1,
    decimalPlaces:             0,
    color:                     () => '#EE4D2D',
    labelColor:                () => C.textMuted,
    barPercentage:             0.55,
    propsForBackgroundLines:   { strokeWidth: 0.5, stroke: C.divider },
    propsForLabels:            { fontSize: 7 },
  };

  // Lazada — dark navy blue #0F146D
  const lazadaChartConfig = {
    backgroundColor:           C.card,
    backgroundGradientFrom:    C.card,
    backgroundGradientTo:      C.card,
    fillShadowGradient:        '#0F146D',
    fillShadowGradientOpacity: 1,
    decimalPlaces:             0,
    color:                     () => '#0F146D',
    labelColor:                () => C.textMuted,
    barPercentage:             0.55,
    propsForBackgroundLines:   { strokeWidth: 0.5, stroke: C.divider },
    propsForLabels:            { fontSize: 7 },
  };

  // ✅ Fix: consistent indentation with other chart configs
  // DummyJSON — green #16a34a
  const dummyChartConfig = {
    backgroundColor:           C.card,
    backgroundGradientFrom:    C.card,
    backgroundGradientTo:      C.card,
    fillShadowGradient:        '#16a34a',
    fillShadowGradientOpacity: 1,
    decimalPlaces:             0,
    color:                     () => '#16a34a',
    labelColor:                () => C.textMuted,
    barPercentage:             0.55,
    propsForBackgroundLines:   { strokeWidth: 0.5, stroke: C.divider },
    propsForLabels:            { fontSize: 7 },
  };

  const todayLabel         = today.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
  const selectedMonthLabel = `${ALL_MONTHS[selectedMonthIndex]} ${today.getFullYear()}`;

  const statItems = [
    { icon: 'people',        label: 'Total Users',        value: stats?.total_users           ?? liveUsers.length    ?? 0, color: C.primary, sub: 'Registered accounts'  },
    { icon: 'person-circle', label: 'Active Users',       value: stats?.active_users          ?? activeUsers          ?? 0, color: C.success, sub: 'Not deactivated'       },
    { icon: 'cube',          label: 'Products Monitored', value: stats?.total_products        ?? liveProducts.length  ?? 0, color: '#0ea5e9', sub: 'Across all watchlists' },
    { icon: 'notifications', label: 'Notifications Sent', value: stats?.total_notifications   ?? 0,                         color: C.warning, sub: 'All time'              },
    { icon: 'alert-circle',  label: 'Invalid Products',   value: stats?.invalid_products      ?? invalidCount         ?? 0, color: C.danger,  sub: 'Needs attention'       },
    { icon: 'bookmark',      label: 'Watchlist Items',    value: stats?.total_watchlist_items ?? 0,                         color: C.accent,  sub: 'Items being tracked'   },
  ];

  const outerStyle  = isWeb
    ? { height: Dimensions.get('window').height - 106, backgroundColor: C.background }
    : { flex: 1, backgroundColor: C.background };
  const scrollStyle = isWeb ? { height: '100%', overflowY: 'auto' } : undefined;

  return (
    <View
      style={outerStyle}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContentWidth(w - 24);
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ padding: 12, paddingBottom: 200 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        scrollEventThrottle={16}
        style={scrollStyle}
      >

        {/* ── 1. Stat Cards ── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start', marginBottom: 10 }}>
          {statItems.map((item, index) => (
            <View
              key={index}
              style={{
                flexGrow: 1,
                flexBasis: isWeb ? '30%' : '45%',
                minWidth: 200,
                maxWidth: isWeb ? '32.5%' : '100%',
                backgroundColor: C.card,
                borderRadius: 15,
                marginBottom: 4,
                minHeight: 100,
                padding: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 4,
                borderWidth: 1,
                borderColor: C.cardBorder,
              }}
            >
              <StatCard C={C} icon={item.icon} label={item.label} value={item.value} color={item.color} sub={item.sub} />
            </View>
          ))}
        </View>

        {/* ── 2. LINE CHART ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 }}>
          <SectionTitle C={C} title="User Login Activity" count="Per Day" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted }}>{todayLabel}</Text>
        </View>

        <View style={{ paddingHorizontal: 4, marginBottom: 8 }}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: C.primary + '15', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 12 }}>{selectedMonthLabel}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4, gap: 8, paddingBottom: 10 }}
          style={{ marginBottom: 8 }}
        >
          {ALL_MONTHS.map((month, index) => {
            const isSelected = selectedMonthIndex === index;
            const isFuture   = index > currentMonthIndex;
            const isCached   = !!lineCache.current[index];
            return (
              <TouchableOpacity
                key={month}
                onPress={() => setSelectedMonthIndex(index)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: isSelected ? C.primary : C.card,
                  borderWidth: 1,
                  borderColor: isSelected ? C.primary : isCached ? C.success : C.cardBorder,
                  opacity: isFuture ? 0.4 : 1,
                }}
              >
                <Text style={{ color: isSelected ? '#fff' : C.text, fontSize: 12, fontWeight: '700' }}>
                  {month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{
          backgroundColor: C.card, borderRadius: 25,
          paddingVertical: 16, paddingHorizontal: 8,
          borderWidth: 1, borderColor: C.cardBorder, marginBottom: 16,
          overflow: 'hidden',
        }}>
          <Text style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', marginBottom: 4 }}>
            {isFutureMonth
              ? `No data yet for ${selectedMonthLabel}`
              : `No. of users logged in — ${selectedMonthLabel}`}
          </Text>
          {lineLoading ? (
            <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : (
            <LineChart
              data={lineData}
              width={chartWidth}
              height={220}
              chartConfig={lineChartConfig}
              fromZero
              yAxisInterval={1}
              segments={lineSegments}
              formatYLabel={(val) => {
                // ✅ Fix: isNaN guard prevents blank labels
                const n = parseInt(val);
                if (isNaN(n)) return '';
                return n % (lineSegments > 3 ? 5 : 1) === 0 ? String(n) : '';
              }}
              formatXLabel={(val) => {
                if (rawLoginLabels.length > 15) {
                  const num = parseInt(val);
                  return (num === 1 || num % 5 === 0) ? String(num) : '';
                }
                return val;
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center' }}
            />
          )}
        </View>

        {/* ── 3. BAR CHARTS — Shopee & Lazada ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 }}>
          <SectionTitle C={C} title="Platform Product Links Added" count="Shopee vs Lazada" />
          <View style={{ backgroundColor: C.primary + '15', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 12 }}>{selectedYear}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4, gap: 8, paddingBottom: 10 }}
          style={{ marginBottom: 8 }}
        >
          {YEAR_OPTIONS.map((year) => {
            const isSelected = selectedYear === year;
            return (
              <TouchableOpacity
                key={year}
                onPress={() => setSelectedYear(year)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: isSelected ? C.primary : C.card,
                  borderWidth: 1,
                  borderColor: isSelected ? C.primary : C.cardBorder,
                }}
              >
                <Text style={{ color: isSelected ? '#fff' : C.text, fontSize: 12, fontWeight: '700' }}>
                  {year}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{
          backgroundColor: C.card, borderRadius: 25,
          paddingVertical: 16, paddingHorizontal: 8,
          borderWidth: 1, borderColor: C.cardBorder, marginBottom: 16,
          overflow: 'hidden',
        }}>
          <Text style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', marginBottom: 8 }}>
            No. of product links added per platform — {selectedYear}
          </Text>

          {barLoading ? (
            <View style={{ height: 300, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, marginBottom: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#EE4D2D' }} />
                <Text style={{ fontSize: 11, color: '#EE4D2D', fontWeight: '700' }}>Shopee</Text>
              </View>
              {/* ✅ Fix: ALL_MONTHS instead of SHORT_MONTHS */}
              <BarChart
                data={{ labels: ALL_MONTHS, datasets: [{ data: shopeeByMonth }] }}
                width={chartWidth}
                height={160}
                fromZero
                showBarTops={false}
                withInnerLines={true}
                chartConfig={shopeeChartConfig}
                segments={shopeeSegments}
                yAxisSuffix=""
                style={{ borderRadius: 12, alignSelf: 'center' }}
              />

              <View style={{ height: 1, backgroundColor: C.divider, marginHorizontal: 16, marginVertical: 10 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, marginBottom: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#0F146D' }} />
                <Text style={{ fontSize: 11, color: '#0F146D', fontWeight: '700' }}>Lazada</Text>
              </View>
              {/* ✅ Fix: ALL_MONTHS instead of SHORT_MONTHS */}
              <BarChart
                data={{ labels: ALL_MONTHS, datasets: [{ data: lazadaByMonth }] }}
                width={chartWidth}
                height={160}
                fromZero
                showBarTops={false}
                withInnerLines={true}
                chartConfig={lazadaChartConfig}
                segments={lazadaSegments}
                yAxisSuffix=""
                style={{ borderRadius: 12, alignSelf: 'center' }}
              />
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 15, paddingTop: 10, paddingBottom: 4, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#EE4D2D' }} />
              <Text style={{ fontSize: 10, color: C.textMuted }}>Shopee</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#0F146D' }} />
              <Text style={{ fontSize: 10, color: C.textMuted }}>Lazada</Text>
            </View>
          </View>
        </View>

        {/* ── 4. BAR CHART — DummyJSON Products ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 }}>
          <SectionTitle C={C} title="DummyJSON Products" count="Per Month" />
          <View style={{ backgroundColor: '#16a34a20', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
            <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 12 }}>{dummyTotal} total</Text>
          </View>
        </View>

        <View style={{
          backgroundColor: C.card, borderRadius: 25,
          paddingVertical: 16, paddingHorizontal: 8,
          borderWidth: 1, borderColor: C.cardBorder, marginBottom: 16,
          overflow: 'hidden',
        }}>
          <Text style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', marginBottom: 8 }}>
            No. of DummyJSON products distributed per month (dummyjson.com)
          </Text>

          {dummyLoading ? (
            <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color="#16a34a" />
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, marginBottom: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#16a34a' }} />
                <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '700' }}>DummyJSON</Text>
              </View>
              {/* ✅ Fix: ALL_MONTHS instead of SHORT_MONTHS */}
              <BarChart
                data={{ labels: ALL_MONTHS, datasets: [{ data: dummyByMonth }] }}
                width={chartWidth}
                height={160}
                fromZero
                showBarTops={false}
                withInnerLines={true}
                chartConfig={dummyChartConfig}
                segments={dummySegments}
                yAxisSuffix=""
                style={{ borderRadius: 12, alignSelf: 'center' }}
              />
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 15, paddingTop: 10, paddingBottom: 4, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#16a34a' }} />
              <Text style={{ fontSize: 10, color: C.textMuted }}>DummyJSON (dummyjson.com)</Text>
            </View>
          </View>
        </View>

        {/* ── 5. Recent Users ── */}
        <SectionTitle C={C} title="Recent Users" count={recentUsers.length} />
        <View style={{ backgroundColor: C.card, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.cardBorder }}>
          <THead C={C} cols={[
  { label: 'NAME',   flex: 2 },
  { label: 'EMAIL',  flex: 2.5 },
  { label: 'ROLE',   flex: 1, align: 'center' },   // ← add this
  { label: 'STATUS', flex: 1, align: 'center' },
  { label: 'ITEMS',  flex: 1, align: 'right' },
]} />
          {recentUsers.map((u, i) => (
            <View
              key={u.id}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 10, paddingHorizontal: 10,
                borderBottomWidth: 1, borderBottomColor: C.rowBorder,
                backgroundColor: i % 2 === 1 ? C.tableRowAlt : 'transparent',
              }}
            >
              <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary + '25', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: C.primary }}>
                    {u.name?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: C.text }} numberOfLines={1}>
                  {u.name}
                </Text>
              </View>
              <Text style={{ flex: 2.5, fontSize: 11, color: C.textMuted }} numberOfLines={1}>{u.email}</Text>
              {/* ROLE — add this */}
<View style={{ flex: 1, alignItems: 'center' }}>
  <Badge
    label={u.role ?? 'User'}
    color={u.role === 'admin' ? C.warning : C.primary}
    bg={u.role === 'admin' ? C.warning + '20' : C.primary + '20'}
  />
</View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Badge
                  label={u.is_active === false ? 'Inactive' : 'Active'}
                  color={u.is_active === false ? C.deactivated : C.success}
                  bg={u.is_active === false ? C.deactivated + '20' : C.success + '20'}
                />
              </View>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: C.primary, textAlign: 'right' }}>
                {u.watchlist_items_count ?? 0}
              </Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
};

export default DashboardTab;