// ============================================================
//  src/screens/ProductDetailScreen.js
//  FIXED: Shows product image (image_url) with fallback placeholder
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, StatusBar, Linking, Image,
  Platform, TextInput, Modal,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart }      from 'react-native-chart-kit';
import { Dimensions }     from 'react-native';

import {
  getPriceHistory, updateTargetPrice, updateNotifPreferences,
} from '../api/watchListApi';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Custom In-App Alert Modal ─────────────────────────────────────────────────
const AppAlert = ({ visible, title, message, type, onClose }) => {
  const isSuccess = type === 'success';
  const iconName  = isSuccess ? 'checkmark-circle' : 'close-circle';
  const iconColor = isSuccess ? Colors.success : Colors.danger;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={alertStyles.overlay}>
        <View style={alertStyles.card}>
          <View style={[alertStyles.iconBox, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={iconName} size={40} color={iconColor} />
          </View>
          <Text style={alertStyles.title}>{title}</Text>
          <Text style={alertStyles.message}>{message}</Text>
          <TouchableOpacity style={[alertStyles.btn, { backgroundColor: iconColor }]} onPress={onClose} activeOpacity={0.85}>
            <Text style={alertStyles.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const alertStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card:    { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, alignItems: 'center', width: '100%', maxWidth: 340, gap: 12, ...Shadow.lg },
  iconBox: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title:   { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text, textAlign: 'center' },
  message: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  btn:     { borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 40, marginTop: 4, width: '100%', alignItems: 'center' },
  btnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

// ── Toggle Switch ──────────────────────────────────────────────────────────────
const Toggle = ({ value, onToggle, disabled }) => (
  <TouchableOpacity
    onPress={onToggle}
    disabled={disabled}
    activeOpacity={0.8}
    style={[styles.toggle, { backgroundColor: value ? Colors.success : Colors.border }]}
  >
    <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
  </TouchableOpacity>
);

// ── Product Image Box ──────────────────────────────────────────────────────────
const ProductImageBox = ({ imageUrl, platform, size = 72 }) => {
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
  // Fallback: platform-colored icon
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

// ── Product Detail Screen ──────────────────────────────────────────────────────
const ProductDetailScreen = ({ route, navigation }) => {
  const { item } = route.params;
  const product  = item.product;

  const [priceHistory,   setPriceHistory]   = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [targetPrice,    setTargetPrice]    = useState(item.target_price?.toString() || '');
  const [savingTarget,   setSavingTarget]   = useState(false);
  const [savingPrefs,    setSavingPrefs]    = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle,   setAlertTitle]   = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType,    setAlertType]    = useState('success');
  const [alertOnClose, setAlertOnClose] = useState(null);

  const showAlert = (title, message, type = 'success', onClose = null) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertOnClose(() => onClose);
    setAlertVisible(true);
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertOnClose) alertOnClose();
  };

  const [prefs, setPrefs] = useState({
    notif_price_drop:   !!item.notif_price_drop,
    notif_stock:        !!item.notif_stock,
    notif_target_price: !!item.notif_target_price,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getPriceHistory(item.id);
        setPriceHistory(data.data || data || []);
      } catch {}
      finally { setHistoryLoading(false); }
    };
    load();
  }, []);

  const curr     = parseFloat(product?.current_price || 0);
  const prev     = parseFloat(product?.prev_price || 0);
  const hasDrop  = prev > 0 && curr < prev;
  const savings  = hasDrop ? (prev - curr) : 0;
  const inStock  = product?.stock_status === 'in_stock';
  const platform = product?.platform;
  const tp       = parseFloat(targetPrice) || 0;

  const progressPct = (tp > 0 && prev > tp)
    ? Math.min(100, Math.max(0, ((prev - curr) / (prev - tp)) * 100))
    : 0;
  const toGo = tp > 0 ? Math.max(0, curr - tp) : 0;

  const handleSaveTarget = async () => {
    const val = parseFloat(targetPrice);
    if (!targetPrice || isNaN(val) || val <= 0) {
      showAlert('Invalid Price', 'Please enter a valid target price.', 'error');
      return;
    }
    setSavingTarget(true);
    try {
      await updateTargetPrice(item.id, val);
      showAlert('Target Price Saved! ✅', `We'll alert you when the price drops to ₱${val.toLocaleString()} or below.`, 'success');
    } catch {
      showAlert('Error', 'Failed to update target price. Please try again.', 'error');
    } finally {
      setSavingTarget(false);
    }
  };

  const togglePref = async (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSavingPrefs(true);
    try {
      await updateNotifPreferences(item.id, updated);
    } catch {
      setPrefs(prefs);
      showAlert('Error', 'Failed to update notification preference.', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const buildChartData = () => {
    if (priceHistory.length === 0) return null;
    const history = priceHistory.slice(-7);
    const points  = history.length === 1 ? [history[0], history[0]] : history;
    return {
      labels:   points.map((_, i, arr) => i === 0 ? 'Start' : i === arr.length - 1 ? 'Now' : ''),
      datasets: [{ data: points.map(h => parseFloat(h.price) || 0) }],
    };
  };
  const chartData = buildChartData();

  // Platform badge color
  const platformBadgeBg = platform === 'shopee' ? Colors.shopee
                        : platform === 'lazada' ? Colors.lazada
                        : Colors.primary;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      <AppAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={handleAlertClose}
      />

      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Detail</Text>
          <TouchableOpacity style={styles.linkBtn} onPress={() => product?.url && Linking.openURL(product.url)}>
            <Ionicons name="open-outline" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Product Info Card */}
        <View style={styles.card}>
          <View style={styles.productRow}>
            {/* ── Product Image with fallback ── */}
            <ProductImageBox
              imageUrl={product?.image_url}
              platform={platform}
              size={72}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{product?.name}</Text>
              <View style={[styles.platformBadge, { backgroundColor: platformBadgeBg }]}>
                <Text style={styles.platformText}>
                  {platform === 'dummyjson' ? 'DummyJSON' : platform?.charAt(0).toUpperCase() + platform?.slice(1)}
                </Text>
              </View>
              <Text style={[styles.currentPrice, hasDrop && { color: Colors.success }]}>
                ₱{curr.toLocaleString()}
              </Text>
              {hasDrop && <Text style={styles.prevPrice}>was ₱{prev.toLocaleString()}</Text>}
              <View style={styles.productMeta}>
                <View style={[styles.stockChip, { backgroundColor: inStock ? Colors.successLight : Colors.dangerLight }]}>
                  <Ionicons name={inStock ? 'checkmark-circle' : 'close-circle'} size={11} color={inStock ? Colors.success : Colors.danger} />
                  <Text style={[styles.stockText, { color: inStock ? Colors.success : Colors.danger }]}>
                    {inStock ? 'In Stock' : 'Out of Stock'}
                  </Text>
                </View>
                {hasDrop && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>-₱{savings.toLocaleString()}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Price History Chart */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>PRICE HISTORY</Text>
          {historyLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
          ) : chartData ? (
            <>
              <LineChart
                data={chartData}
                width={SCREEN_WIDTH - Spacing.lg * 2 - 32}
                height={160}
                chartConfig={{
                  backgroundColor: Colors.white, backgroundGradientFrom: Colors.white,
                  backgroundGradientTo: Colors.white, decimalPlaces: 0,
                  color: (o = 1) => `rgba(15, 76, 129, ${o})`,
                  labelColor: () => Colors.textMuted,
                  propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.primary },
                  propsForLabels: { fontSize: 10 },
                }}
                bezier
                style={{ borderRadius: 12, marginLeft: -8 }}
                withShadow={false}
                withInnerLines={false}
                fromZero={false}
              />
              {priceHistory.length === 1 && (
                <View style={styles.chartHint}>
                  <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
                  <Text style={styles.chartHintText}>
                    Showing starting price. Chart will update after monitoring cycles.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noChart}>
              <Ionicons name="analytics-outline" size={32} color={Colors.border} />
              <Text style={styles.noChartText}>No price data yet. Check back after the first monitoring cycle.</Text>
            </View>
          )}
        </View>

        {/* Set Target Price */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="pricetag-outline" size={18} color={Colors.accent} />
            <Text style={styles.cardTitle}>Set Target Price</Text>
          </View>
          <Text style={styles.cardDesc}>Get alerted when price reaches your target</Text>
          <View style={styles.targetInputWrapper}>
            <Text style={styles.currencySymbol}>₱</Text>
            <TextInput
              style={styles.targetInput}
              placeholder="e.g. 11000"
              placeholderTextColor={Colors.textLight}
              value={targetPrice}
              onChangeText={setTargetPrice}
              keyboardType="numeric"
              returnKeyType="done"
            />
            {targetPrice.length > 0 && (
              <TouchableOpacity onPress={() => setTargetPrice('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
          {tp > 0 && (
            <Text style={styles.targetMeta}>
              Target: ₱{tp.toLocaleString()}  |  Current: ₱{curr.toLocaleString()}
            </Text>
          )}
          {tp > 0 && prev > tp && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.progressLabel}>
                {progressPct.toFixed(0)}% there — ₱{toGo.toLocaleString()} to go
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.saveTargetBtn, savingTarget && { opacity: 0.7 }]}
            onPress={handleSaveTarget}
            disabled={savingTarget}
            activeOpacity={0.85}
          >
            {savingTarget
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.saveTargetBtnText}>SAVE TARGET PRICE</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Alert Preferences */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>Alert Preferences</Text>
            {savingPrefs && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 'auto' }} />}
          </View>
          <Text style={styles.cardDesc}>
            {product?.name ? product.name.slice(0, 40) + (product.name.length > 40 ? '...' : '') : 'This product'}
          </Text>
          {[
            { key: 'notif_price_drop',   icon: 'trending-down-outline', label: 'Price Drop Alert',         sub: 'Notify when price decreases'         },
            { key: 'notif_target_price', icon: 'pricetag-outline',      label: 'Target Price Alert',       sub: 'Notify when target price is reached' },
            { key: 'notif_stock',        icon: 'cube-outline',          label: 'Stock Availability Alert', sub: 'Notify when item is back in stock'   },
          ].map((pref, idx, arr) => (
            <View key={pref.key} style={[styles.prefRow, idx < arr.length - 1 && styles.prefRowBorder]}>
              <View style={styles.prefIconWrapper}>
                <Ionicons name={pref.icon} size={18} color={Colors.primary} />
              </View>
              <View style={styles.prefInfo}>
                <Text style={styles.prefLabel}>{pref.label}</Text>
                <Text style={styles.prefSub}>{pref.sub}</Text>
              </View>
              <Toggle value={prefs[pref.key]} onToggle={() => togglePref(pref.key)} disabled={savingPrefs} />
            </View>
          ))}
        </View>

        {/* View on Platform */}
        <TouchableOpacity style={styles.viewBtn} onPress={() => product?.url && Linking.openURL(product.url)} activeOpacity={0.85}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.viewBtnGradient}>
            <Ionicons name="open-outline" size={18} color={Colors.white} />
            <Text style={styles.viewBtnText}>
              View on {platform === 'dummyjson' ? 'DummyJSON' : platform?.charAt(0).toUpperCase() + platform?.slice(1)}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('PriceHistory', { item })} activeOpacity={0.85}>
          <Ionicons name="bar-chart-outline" size={18} color={Colors.primary} />
          <Text style={styles.historyBtnText}>View Full Price History</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.bg },
  header:             { paddingTop: 50, paddingBottom: Spacing.md, paddingHorizontal: Spacing.lg },
  headerRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:            { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:        { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  linkBtn:            { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  content:            { padding: Spacing.lg, paddingBottom: 48, gap: Spacing.md },
  card:               { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.default },
  sectionLabel:       { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.md },
  cardTitleRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  cardTitle:          { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  cardDesc:           { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.md, lineHeight: 20 },
  productRow:         { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  imgBox:             { borderRadius: Radius.md, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  productInfo:        { flex: 1, gap: 4 },
  productName:        { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text, lineHeight: 18 },
  platformBadge:      { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  platformText:       { color: Colors.white, fontSize: 10, fontWeight: FontWeight.black },
  currentPrice:       { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.text },
  prevPrice:          { fontSize: FontSize.xs, color: Colors.textMuted, textDecorationLine: 'line-through' },
  productMeta:        { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  stockChip:          { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  stockText:          { fontSize: 10, fontWeight: FontWeight.bold },
  savingsBadge:       { backgroundColor: Colors.successLight, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  savingsText:        { fontSize: 10, color: Colors.success, fontWeight: FontWeight.black },
  noChart:            { alignItems: 'center', paddingVertical: Spacing.xl },
  chartHint:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.tagBg, borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.sm },
  chartHintText:      { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 16 },
  noChartText:        { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 18 },
  targetInputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, backgroundColor: Colors.inputBg, marginBottom: Spacing.sm },
  currencySymbol:     { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.textMuted, marginRight: Spacing.sm },
  targetInput:        { flex: 1, paddingVertical: 13, fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.accent },
  targetMeta:         { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm },
  progressContainer:  { marginBottom: Spacing.md },
  progressBar:        { height: 8, borderRadius: 4, backgroundColor: Colors.border, overflow: 'hidden', marginBottom: 4 },
  progressFill:       { height: '100%', borderRadius: 4, backgroundColor: Colors.success },
  progressLabel:      { fontSize: FontSize.xs, color: Colors.textMuted },
  saveTargetBtn:      { backgroundColor: Colors.primaryDark, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm },
  saveTargetBtnText:  { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  prefRow:            { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  prefRowBorder:      { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  prefIconWrapper:    { width: 38, height: 38, borderRadius: Radius.sm, backgroundColor: Colors.tagBg, justifyContent: 'center', alignItems: 'center' },
  prefInfo:           { flex: 1 },
  prefLabel:          { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.text },
  prefSub:            { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  toggle:             { width: 46, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  toggleThumb:        { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.white, ...Shadow.sm },
  toggleThumbOn:      { alignSelf: 'flex-end' },
  viewBtn:            { borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.default },
  viewBtnGradient:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  viewBtnText:        { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  historyBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: Radius.lg, paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.primary, ...Shadow.sm },
  historyBtnText:     { color: Colors.primary, fontSize: FontSize.base, fontWeight: FontWeight.bold },
});

export default ProductDetailScreen;