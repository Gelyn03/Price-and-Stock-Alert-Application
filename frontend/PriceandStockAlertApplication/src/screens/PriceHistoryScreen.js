// ============================================================
//  src/screens/PriceHistoryScreen.js
//  Price History — aligned to SRS Fig 18 & 19
//  Price and Stock Alert Application
//
//  ✅ Price Trend chart (Last 7 Records)
//  ✅ Current Price, Previous Price, Total Savings
//  ✅ Full price history table
//  ✅ Highest / Lowest price summary
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart }      from 'react-native-chart-kit';

import { getPriceHistory } from '../api/watchListApi';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
};

const PriceHistoryScreen = ({ route, navigation }) => {
  const { item } = route.params;
  const product  = item?.product;

  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getPriceHistory(item.id)
      .then(data => setHistory(data.data || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const curr    = parseFloat(product?.current_price || 0);
  const prev    = parseFloat(product?.prev_price    || 0);
  const hasDrop = prev > 0 && curr < prev;
  const savings = hasDrop ? prev - curr : 0;

  // Last 7 records for chart
  const last7   = history.slice(-7);
  const prices  = last7.map(h => parseFloat(h.price) || 0);
  const labels  = last7.map((h, i, a) => {
    if (i === 0)           return formatDate(h.recorded_at);
    if (i === a.length -1) return 'Today';
    if (i === Math.floor(a.length / 2)) return formatDate(h.recorded_at);
    return '';
  });

  // Duplicate single point so chart renders
const chartPrices = prices.length === 1 ? [prices[0], prices[0]] : prices;
const chartLabels = labels.length === 1 ? ['Start', 'Now'] : labels;
const chartData = chartPrices.length >= 1
    ? { labels: chartLabels, datasets: [{ data: chartPrices }] }
    : null;

  // Stats
  const allPrices = history.map(h => parseFloat(h.price) || 0).filter(p => p > 0);
  const highest   = allPrices.length ? Math.max(...allPrices) : 0;
  const lowest    = allPrices.length ? Math.min(...allPrices) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* Header */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Price History — {product?.name?.split(' ').slice(0, 3).join(' ')}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading price history…</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* Chart Card */}
          <View style={styles.card}>
            <Text style={styles.chartTitle}>
              Price Trend (Last {Math.min(7, history.length)} Records)
            </Text>

            {chartData ? (
              <>
                <LineChart
                  data={chartData}
                  width={SCREEN_WIDTH - Spacing.lg * 4}
                  height={180}
                  chartConfig={{
                    backgroundColor:        Colors.white,
                    backgroundGradientFrom: Colors.white,
                    backgroundGradientTo:   Colors.white,
                    decimalPlaces:          0,
                    color:                  (o = 1) => `rgba(15, 76, 129, ${o})`,
                    labelColor:             () => Colors.textMuted,
                    propsForDots: { r: '5', strokeWidth: '2', stroke: Colors.primary },
                  }}
                  bezier
                  style={{ borderRadius: 12, marginTop: Spacing.sm }}
                  withShadow={false}
                  withInnerLines={false}
                  fromZero={false}
                />

                {/* Summary */}
                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Current Price:</Text>
                    <Text style={[styles.summaryValue, { color: Colors.success }]}>
                      ₱{curr.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Previous Price:</Text>
                    <Text style={[styles.summaryValue, styles.prevPrice]}>
                      ₱{prev.toLocaleString()}
                    </Text>
                  </View>
                  {savings > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Total Savings:</Text>
                      <Text style={[styles.summaryValue, { color: Colors.success, fontWeight: FontWeight.black }]}>
                        ₱{savings.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.noChart}>
                <Ionicons name="analytics-outline" size={40} color={Colors.border} />
                <Text style={styles.noChartTitle}>No price data yet</Text>
                <Text style={styles.noChartSub}>
                  Price history will appear here after a few monitoring cycles.
                </Text>
              </View>
            )}
          </View>

          {/* Stats Row */}
          {allPrices.length > 0 && (
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderTopColor: Colors.success }]}>
                <Text style={styles.statLabel}>Lowest Price</Text>
                <Text style={[styles.statValue, { color: Colors.success }]}>
                  ₱{lowest.toLocaleString()}
                </Text>
                <Ionicons name="trending-down" size={18} color={Colors.success} />
              </View>
              <View style={[styles.statCard, { borderTopColor: Colors.danger }]}>
                <Text style={styles.statLabel}>Highest Price</Text>
                <Text style={[styles.statValue, { color: Colors.danger }]}>
                  ₱{highest.toLocaleString()}
                </Text>
                <Ionicons name="trending-up" size={18} color={Colors.danger} />
              </View>
              <View style={[styles.statCard, { borderTopColor: Colors.primary }]}>
                <Text style={styles.statLabel}>Records</Text>
                <Text style={[styles.statValue, { color: Colors.primary }]}>
                  {history.length}
                </Text>
                <Ionicons name="time-outline" size={18} color={Colors.primary} />
              </View>
            </View>
          )}

          {/* Full History Table */}
          {history.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.tableTitle}>Full Price History</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>DATE</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>PRICE</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>CHANGE</Text>
              </View>
              {[...history].reverse().map((record, idx, arr) => {
                const recordPrice = parseFloat(record.price) || 0;
                const nextRecord  = arr[idx + 1];
                const nextPrice   = nextRecord ? parseFloat(nextRecord.price) || 0 : 0;
                const change      = nextPrice > 0 ? recordPrice - nextPrice : 0;
                const isDown      = change < 0;
                const isUp        = change > 0;

                return (
                  <View
                    key={idx}
                    style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}
                  >
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {formatDate(record.recorded_at)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: FontWeight.bold }]}>
                      ₱{recordPrice.toLocaleString()}
                    </Text>
                    <View style={[styles.tableCellChange, { flex: 1, justifyContent: 'flex-end' }]}>
                      {change !== 0 && (
                        <>
                          <Ionicons
                            name={isDown ? 'trending-down' : 'trending-up'}
                            size={12}
                            color={isDown ? Colors.success : Colors.danger}
                          />
                          <Text style={[
                            styles.changeText,
                            { color: isDown ? Colors.success : Colors.danger }
                          ]}>
                            {isDown ? '-' : '+'}₱{Math.abs(change).toLocaleString()}
                          </Text>
                        </>
                      )}
                      {idx === arr.length - 1 && (
                        <Text style={styles.firstRecord}>—</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loadingText:    { fontSize: FontSize.sm, color: Colors.textMuted },
  header:         { paddingTop: 50, paddingBottom: Spacing.md, paddingHorizontal: Spacing.lg },
  headerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:        { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:    { flex: 1, color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.bold, textAlign: 'center', marginHorizontal: Spacing.sm },
  content:        { padding: Spacing.lg, paddingBottom: 48, gap: Spacing.md },
  card:           { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.default },
  chartTitle:     { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 4 },
  summaryBox:     { marginTop: Spacing.lg, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: Spacing.md },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel:   { fontSize: FontSize.sm, color: Colors.textMuted },
  summaryValue:   { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  prevPrice:      { textDecorationLine: 'line-through', color: Colors.danger },
  noChart:        { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  noChartTitle:   { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textMuted },
  noChartSub:     { fontSize: FontSize.sm, color: Colors.textLight, textAlign: 'center', lineHeight: 20 },
  statsRow:       { flexDirection: 'row', gap: Spacing.sm },
  statCard:       { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.md, alignItems: 'center', gap: 4, ...Shadow.sm, borderTopWidth: 3 },
  statLabel:      { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
  statValue:      { fontSize: FontSize.lg, fontWeight: FontWeight.black },
  tableTitle:     { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.md },
  tableHeader:    { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: Colors.border, marginBottom: 4 },
  tableHeaderText:{ fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.5 },
  tableRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  tableRowAlt:    { backgroundColor: Colors.bg },
  tableCell:      { fontSize: FontSize.sm, color: Colors.text },
  tableCellChange:{ flexDirection: 'row', alignItems: 'center', gap: 3 },
  changeText:     { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  firstRecord:    { fontSize: FontSize.xs, color: Colors.textLight },
});

export default PriceHistoryScreen;