// ============================================================
//  src/screens/NotificationDetailScreen.js
//  FIXED: Shows product image_url with platform-color fallback
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Platform, Linking, Alert,
  ActivityIndicator, Image,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart }      from 'react-native-chart-kit';
import { Dimensions }     from 'react-native';

import { markAsRead }      from '../api/notificationsApi';
import { getPriceHistory } from '../api/watchListApi';
import apiClient           from '../api/client';
import { useAuth }         from '../context/AuthContext';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

const webAlert = (title, msg) => {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
};

const openUrl = (url) => {
  if (!url) return;
  if (Platform.OS === 'web') window.open(url, '_blank');
  else Linking.openURL(url).catch(() => webAlert('Error', 'Could not open link.'));
};

// ── Type config ────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  price_drop: {
    headerColors: [Colors.successDark || '#1a6b3c', Colors.success || '#27ae60'],
    headerBorder: Colors.success,
    icon: '📉', iconIon: 'trending-down', iconColor: Colors.success,
    title: 'Price Drop Alert', subtitle: 'Price decreased on a product you are watching',
    badgeColor: Colors.success, badgeBg: Colors.successLight,
    trendColor: (o = 1) => `rgba(39, 174, 96, ${o})`,
  },
  price_increase: {
    headerColors: ['#7a2020', Colors.danger || '#e74c3c'],
    headerBorder: Colors.danger,
    icon: '📈', iconIon: 'trending-up', iconColor: Colors.danger,
    title: 'Price Increase Alert', subtitle: 'Price increased on a product you are watching',
    badgeColor: Colors.danger, badgeBg: Colors.dangerLight,
    trendColor: (o = 1) => `rgba(231, 76, 60, ${o})`,
  },
  stock_available: {
    headerColors: [Colors.primaryDark || '#0f4c81', Colors.primary || '#2980b9'],
    headerBorder: Colors.primary,
    icon: '✅', iconIon: 'checkmark-circle', iconColor: Colors.primary,
    title: 'Back in Stock!', subtitle: 'A product you are watching is now available',
    badgeColor: Colors.primary, badgeBg: Colors.primary + '18',
    trendColor: (o = 1) => `rgba(41, 128, 185, ${o})`,
  },
  out_of_stock: {
    headerColors: ['#7a2020', Colors.danger || '#e74c3c'],
    headerBorder: Colors.danger,
    icon: '❌', iconIon: 'close-circle', iconColor: Colors.danger,
    title: 'Out of Stock Alert', subtitle: 'A product you are watching is now unavailable',
    badgeColor: Colors.danger, badgeBg: Colors.dangerLight,
    trendColor: (o = 1) => `rgba(231, 76, 60, ${o})`,
  },
};

// ── Reusable Product Image Box ─────────────────────────────────────────────────
const ProductImageBox = ({ imageUrl, platform, size = 64 }) => {
  if (imageUrl) {
    return (
      <View style={[styles.imgBox, { width: size, height: size, overflow: 'hidden' }]}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius: Radius.md }}
          resizeMode="cover"
        />
      </View>
    );
  }
  const bgColor = platform === 'shopee' ? Colors.shopee + '15'
                : platform === 'lazada' ? Colors.lazada + '15'
                : Colors.bg;
  const icColor = platform === 'shopee' ? Colors.shopee
                : platform === 'lazada' ? Colors.lazada
                : Colors.border;
  return (
    <View style={[styles.imgBox, { width: size, height: size, backgroundColor: bgColor }]}>
      <Ionicons name="storefront-outline" size={size * 0.38} color={icColor} />
    </View>
  );
};

// ── Notification Detail Screen ─────────────────────────────────────────────────
const NotificationDetailScreen = ({ route, navigation }) => {
  const { notification } = route.params;
  const { setUnreadCount } = useAuth();

  const type    = notification?.type || 'price_drop';
  const cfg     = TYPE_CONFIG[type] || TYPE_CONFIG.price_drop;
  const product = notification?.product || {};

  const [priceHistory,   setPriceHistory]   = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const curr     = parseFloat(product?.current_price || 0);
  const prev     = parseFloat(product?.prev_price    || 0);
  const diff     = curr - prev;
  const pct      = prev > 0 ? ((Math.abs(diff) / prev) * 100).toFixed(1) : null;
  const inStock  = product?.stock_status === 'in_stock';
  const platform = product?.platform;
  const platformColor = platform === 'shopee' ? (Colors.shopee || '#f05922')
                      : platform === 'lazada' ? (Colors.lazada || '#0f3460')
                      : Colors.primary;

  useEffect(() => {
    if (notification?.id && !notification?.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
      markAsRead(notification.id).catch(() => {});
    }
    const fetchHistory = async () => {
      try {
        let itemId = notification?.watchlist_item_id;
        if (!itemId && notification?.product_id) {
          const watchlist = await apiClient.get('/watchlist');
          const items     = watchlist.data?.data || watchlist.data || [];
          const found     = items.find(i =>
            i.product_id === notification.product_id ||
            i.product?.id === notification.product_id
          );
          if (found) itemId = found.id;
        }
        if (itemId) {
          const data = await getPriceHistory(itemId);
          setPriceHistory(data.data || data || []);
        }
      } catch {}
      finally { setHistoryLoading(false); }
    };
    fetchHistory();
  }, []);

  const buildChartData = () => {
    if (priceHistory.length === 0) return null;
    const last7  = priceHistory.slice(-7);
    const points = last7.length === 1 ? [last7[0], last7[0]] : last7;
    return {
      labels:   points.map((_, i, a) => i === 0 ? 'Start' : i === a.length - 1 ? 'Now' : ''),
      datasets: [{ data: points.map(h => parseFloat(h.price) || 0) }],
    };
  };
  const chartData = buildChartData();

  const renderPushCard = () => (
    <View style={styles.pushCard}>
      <View style={styles.pushHeader}>
        <Ionicons name="notifications" size={14} color={Colors.text} />
        <Text style={styles.pushApp}>Price and Stock Alert App</Text>
        <Text style={styles.pushTime}>{notification?.time_ago || 'Just now'}</Text>
      </View>
      <Text style={styles.pushTitle} numberOfLines={1}>{cfg.icon} {notification?.title || cfg.title}</Text>
      <Text style={[styles.pushMsg, { color: cfg.headerBorder }]} numberOfLines={2}>
        {notification?.message || ''}
      </Text>
    </View>
  );

  const renderProductCard = () => (
    <View style={styles.productCard}>
      <View style={styles.productRow}>
        {/* ── Product Image with fallback ── */}
        <ProductImageBox
          imageUrl={product?.image_url}
          platform={platform}
          size={64}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{product?.name || 'Product'}</Text>
          <View style={[styles.platformBadge, { backgroundColor: platformColor }]}>
            <Text style={styles.platformText}>
              {platform === 'dummyjson' ? 'DummyJSON' : platform?.charAt(0).toUpperCase() + platform?.slice(1)}
            </Text>
          </View>
          <Text style={[styles.currentPrice, { color: cfg.badgeColor }]}>
            ₱{curr.toLocaleString()}
          </Text>
          {prev > 0 && <Text style={styles.prevPrice}>was ₱{prev.toLocaleString()}</Text>}
          {type === 'price_drop' && pct && (
            <View style={[styles.diffBadge, { backgroundColor: cfg.badgeBg }]}>
              <Text style={[styles.diffText, { color: cfg.badgeColor }]}>You save ₱{Math.abs(diff).toLocaleString()}!</Text>
            </View>
          )}
          {type === 'price_increase' && pct && (
            <View style={[styles.diffBadge, { backgroundColor: cfg.badgeBg }]}>
              <Text style={[styles.diffText, { color: cfg.badgeColor }]}>+₱{Math.abs(diff).toLocaleString()} increase</Text>
            </View>
          )}
          {type === 'stock_available' && (
            <View style={[styles.diffBadge, { backgroundColor: Colors.primary + '18' }]}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.primary} />
              <Text style={[styles.diffText, { color: Colors.primary }]}>NOW IN STOCK</Text>
            </View>
          )}
          {type === 'out_of_stock' && (
            <View style={[styles.diffBadge, { backgroundColor: Colors.dangerLight }]}>
              <Ionicons name="close-circle" size={12} color={Colors.danger} />
              <Text style={[styles.diffText, { color: Colors.danger }]}>OUT OF STOCK</Text>
            </View>
          )}
          <Text style={styles.detectedTime}>
            {inStock ? '✓ In Stock' : '✗ Out of Stock'} • Detected {notification?.time_ago || 'recently'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderTrendChart = () => (
    <View style={styles.chartCard}>
      <View style={styles.chartTitleRow}>
        <Ionicons name="analytics-outline" size={16} color={cfg.badgeColor} />
        <Text style={styles.chartTitle}>Price Trend</Text>
      </View>
      {historyLoading ? (
        <ActivityIndicator color={cfg.badgeColor} style={{ marginVertical: 20 }} />
      ) : chartData ? (
        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - Spacing.lg * 4}
          height={130}
          chartConfig={{
            backgroundColor: Colors.white, backgroundGradientFrom: Colors.white,
            backgroundGradientTo: Colors.white, decimalPlaces: 0,
            color: cfg.trendColor, labelColor: () => Colors.textMuted,
            propsForDots: { r: '4', strokeWidth: '2', stroke: cfg.badgeColor },
          }}
          bezier style={{ borderRadius: 10 }}
          withShadow={false} withInnerLines={false}
        />
      ) : (
        <Text style={styles.noChart}>Not enough price data yet.</Text>
      )}
    </View>
  );

  const renderStockHistory = () => (
    <View style={styles.stockHistoryCard}>
      <View style={styles.chartTitleRow}>
        <Ionicons name="time-outline" size={16} color={cfg.badgeColor} />
        <Text style={styles.chartTitle}>Stock History</Text>
      </View>
      {notification?.stock_history?.map((entry, i) => (
        <View key={i} style={styles.stockRow}>
          <Text style={styles.stockDate}>{entry.date}</Text>
          <View style={[styles.stockStatusBadge, { backgroundColor: entry.status === 'available' ? Colors.successLight : Colors.dangerLight }]}>
            <Ionicons name={entry.status === 'available' ? 'checkmark-circle' : 'close-circle'} size={12} color={entry.status === 'available' ? Colors.success : Colors.danger} />
            <Text style={[styles.stockStatusText, { color: entry.status === 'available' ? Colors.success : Colors.danger }]}>
              {entry.status === 'available' ? 'Available' : 'Out of Stock'}
            </Text>
          </View>
        </View>
      )) || <Text style={styles.noChart}>No stock history available.</Text>}
    </View>
  );

  const renderStockAlertCard = () => (
    <View style={[styles.infoCard, { borderLeftColor: Colors.danger }]}>
      <View style={styles.chartTitleRow}>
        <Ionicons name="notifications" size={16} color={Colors.danger} />
        <Text style={[styles.chartTitle, { color: Colors.danger }]}>Stock Alert is Active</Text>
      </View>
      <Text style={styles.infoText}>You will be notified automatically{'\n'}when this item becomes available again.</Text>
    </View>
  );

  const renderTipCard = () => (
    <View style={[styles.infoCard, { borderLeftColor: Colors.accent, backgroundColor: Colors.accent + '08' }]}>
      <Text style={[styles.infoText, { color: Colors.accent }]}>💡 Tip: Set a target price to get alerted{'\n'}when price drops back down.</Text>
    </View>
  );

  const renderHurryCard = () => (
    <View style={[styles.infoCard, { borderLeftColor: Colors.warning, backgroundColor: Colors.warning + '15' }]}>
      <Text style={[styles.infoText, { color: Colors.warning || '#f39c12' }]}>⚡ Hurry! Stock may be limited — buy now!</Text>
    </View>
  );

  const renderWeWillAlertCard = () => (
    <View style={[styles.infoCard, { borderLeftColor: Colors.primary, backgroundColor: Colors.primary + '08' }]}>
      <Text style={[styles.infoText, { color: Colors.primary }]}>💙 We will alert you when it's back in stock!</Text>
    </View>
  );

  const navigateToProductDetail = async () => {
    try {
      const watchlist = await apiClient.get('/watchlist');
      const items     = watchlist.data?.data || watchlist.data || [];
      const found     = items.find(i => i.product_id === notification?.product_id || i.product?.id === notification?.product_id);
      if (found) navigation.navigate('Watchlist', { screen: 'ProductDetail', params: { item: found } });
    } catch {}
  };

  const renderActions = () => {
    if (type === 'price_drop') return (
      <View style={styles.actionCol}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: platformColor }]} onPress={() => openUrl(product?.url)} activeOpacity={0.85}>
          <Ionicons name="cart-outline" size={18} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Buy Now on {platform === 'dummyjson' ? 'DummyJSON' : platform?.charAt(0).toUpperCase() + platform?.slice(1)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={navigateToProductDetail} activeOpacity={0.85}>
          <Ionicons name="bar-chart-outline" size={18} color={Colors.text} />
          <Text style={styles.secondaryBtnText}>View History</Text>
        </TouchableOpacity>
      </View>
    );
    if (type === 'price_increase') return (
      <View style={styles.actionCol}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: platformColor }]} onPress={navigateToProductDetail} activeOpacity={0.85}>
          <Ionicons name="pricetag-outline" size={18} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Set Target Price</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={navigateToProductDetail} activeOpacity={0.85}>
          <Ionicons name="bar-chart-outline" size={18} color={Colors.text} />
          <Text style={styles.secondaryBtnText}>View History</Text>
        </TouchableOpacity>
      </View>
    );
    if (type === 'stock_available') return (
      <View style={styles.actionCol}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: platformColor }]} onPress={() => openUrl(product?.url)} activeOpacity={0.85}>
          <Ionicons name="cart-outline" size={18} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Buy Now on {platform === 'dummyjson' ? 'DummyJSON' : platform?.charAt(0).toUpperCase() + platform?.slice(1)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Watchlist')} activeOpacity={0.85}>
          <Ionicons name="bookmark-outline" size={18} color={Colors.text} />
          <Text style={styles.secondaryBtnText}>View Watchlist</Text>
        </TouchableOpacity>
      </View>
    );
    if (type === 'out_of_stock') return (
      <View style={styles.actionCol}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: Colors.danger }]} onPress={() => {}} activeOpacity={0.85}>
          <Ionicons name="notifications-outline" size={18} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Keep Stock Alert ON</Text>
        </TouchableOpacity>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.halfBtn} onPress={() => navigation.navigate('Watchlist')} activeOpacity={0.85}>
            <Ionicons name="bookmark-outline" size={16} color={Colors.text} />
            <Text style={styles.halfBtnText}>View Watchlist</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.halfBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="arrow-back-outline" size={16} color={Colors.text} />
            <Text style={styles.halfBtnText}>Back to Alerts</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={cfg.headerColors} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerIcon}>{cfg.icon}</Text>
            <Text style={styles.headerTitle}>{cfg.title}</Text>
            <Text style={styles.headerSub}>{cfg.subtitle}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {renderPushCard()}
        {renderProductCard()}
        {(type === 'price_drop' || type === 'price_increase') && renderTrendChart()}
        {(type === 'stock_available' || type === 'out_of_stock') && renderStockHistory()}
        {type === 'price_increase'  && renderTipCard()}
        {type === 'stock_available' && renderHurryCard()}
        {type === 'out_of_stock'    && renderStockAlertCard()}
        {type === 'out_of_stock'    && renderWeWillAlertCard()}
        {renderActions()}
        {type !== 'out_of_stock' && (
          <TouchableOpacity style={styles.backToAlertsBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="arrow-back-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.backToAlertsText}>Back to Notifications</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg },
  header:           { paddingTop: 50, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  headerRow:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  backBtn:          { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  headerCenter:     { flex: 1, alignItems: 'center', gap: 4 },
  headerIcon:       { fontSize: 28 },
  headerTitle:      { color: Colors.white, fontSize: FontSize.xl, fontWeight: FontWeight.black, textAlign: 'center' },
  headerSub:        { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.xs, textAlign: 'center' },
  content:          { padding: Spacing.lg, paddingBottom: 48, gap: Spacing.md },
  pushCard:         { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  pushHeader:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  pushApp:          { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.text },
  pushTime:         { fontSize: FontSize.xs, color: Colors.textLight },
  pushTitle:        { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 2 },
  pushMsg:          { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, lineHeight: 16 },
  productCard:      { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.default },
  productRow:       { flexDirection: 'row', gap: Spacing.md },
  imgBox:           { borderRadius: Radius.md, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  productInfo:      { flex: 1, gap: 4 },
  productName:      { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text, lineHeight: 18 },
  platformBadge:    { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  platformText:     { color: Colors.white, fontSize: 10, fontWeight: FontWeight.black },
  currentPrice:     { fontSize: FontSize.xl, fontWeight: FontWeight.black },
  prevPrice:        { fontSize: FontSize.xs, color: Colors.textMuted, textDecorationLine: 'line-through' },
  diffBadge:        { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  diffText:         { fontSize: 11, fontWeight: FontWeight.black },
  detectedTime:     { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  chartCard:        { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.sm },
  chartTitleRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  chartTitle:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  noChart:          { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.lg },
  stockHistoryCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.sm },
  stockRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  stockDate:        { fontSize: FontSize.sm, color: Colors.text },
  stockStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  stockStatusText:  { fontSize: 11, fontWeight: FontWeight.bold },
  infoCard:         { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.md, borderLeftWidth: 3, ...Shadow.sm },
  infoText:         { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 20 },
  actionCol:        { gap: Spacing.sm },
  actionRow:        { flexDirection: 'row', gap: Spacing.sm },
  primaryBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.lg, paddingVertical: 15, ...Shadow.default },
  primaryBtnText:   { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  secondaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  secondaryBtnText: { color: Colors.text, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  halfBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: 13, borderWidth: 1, borderColor: Colors.border },
  halfBtnText:      { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  backToAlertsBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: 13, borderWidth: 1, borderColor: Colors.border },
  backToAlertsText: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.semiBold },
});

export default NotificationDetailScreen;