// src/screens/SharedWatchlistScreen.js
// FIXED:
//   - VisitAppButton on web opens login in a NEW tab so the shared
//     watchlist page is not hijacked by the authenticated user's session
//   - Mobile: deep link to login screen

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar, Platform,
  ActivityIndicator, TouchableOpacity, TextInput, Linking,
  Dimensions, Image,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios              from 'axios';
import Config             from '../constants/config';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

// ── Visit App Button ───────────────────────────────────────────────────────────
const VisitAppButton = () => {
  const handlePress = () => {
  if (Platform.OS === 'web') {
    // Append ?logout=1 param — ang AppNavigator/AuthContext ang mag-hahandle
    // ng forced logout bago ipakita ang login screen
    window.open('https://web.priceandstockalert.online/login?logout=1', '_blank');
  } else {
    Linking.openURL('priceandstockalert://login').catch(() => {
      Linking.openURL('https://web.priceandstockalert.online');
    });
  }
};

  return (
    <TouchableOpacity style={styles.visitAppBtn} onPress={handlePress} activeOpacity={0.85}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.visitAppBtnGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Ionicons name="phone-portrait-outline" size={16} color={Colors.white} />
        <Text style={styles.visitAppBtnText}>Track Prices on the App</Text>
        <Ionicons name="arrow-forward" size={14} color={Colors.white} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const PlatformBadge = ({ platform }) => (
  <View style={[styles.platformBadge, {
    backgroundColor: platform === 'shopee' ? Colors.shopee
                   : platform === 'lazada' ? Colors.lazada
                   : Colors.primary,
  }]}>
    <Text style={styles.platformBadgeText}>
      {platform === 'dummyjson' ? 'DummyJSON' : platform?.charAt(0).toUpperCase() + platform?.slice(1)}
    </Text>
  </View>
);

const StockBadge = ({ status }) => {
  const inStock = status === 'in_stock';
  return (
    <View style={[styles.stockBadge, { backgroundColor: inStock ? Colors.successLight : Colors.dangerLight }]}>
      <Ionicons name={inStock ? 'checkmark-circle' : 'close-circle'} size={11} color={inStock ? Colors.success : Colors.danger} />
      <Text style={[styles.stockText, { color: inStock ? Colors.success : Colors.danger }]}>
        {inStock ? 'In Stock' : 'Out of Stock'}
      </Text>
    </View>
  );
};

const ProductImageBox = ({ imageUrl, platform }) => {
  if (imageUrl) {
    return (
      <View style={[styles.imgBox, { overflow: 'hidden' }]}>
        <Image source={{ uri: imageUrl }} style={styles.imgThumb} resizeMode="cover" />
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
    <View style={[styles.imgBox, { backgroundColor: bgColor }]}>
      <Ionicons name="storefront-outline" size={22} color={icColor} />
    </View>
  );
};

const ProductCard = ({ item }) => {
  const curr      = parseFloat(item.product?.current_price || 0);
  const prev      = parseFloat(item.product?.prev_price    || 0);
  const hasDrop   = prev > 0 && curr < prev;
  const dropPct   = hasDrop ? (((prev - curr) / prev) * 100).toFixed(1) : null;
  const savings   = hasDrop ? (prev - curr) : 0;
  const leftColor = hasDrop ? Colors.success : item.product?.stock_status !== 'in_stock' ? Colors.danger : Colors.border;

  return (
    <View style={[styles.card, { borderLeftColor: leftColor, borderLeftWidth: 3 }]}>
      <ProductImageBox imageUrl={item.product?.image_url} platform={item.product?.platform} />
      <View style={styles.cardInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.product?.name || 'Unknown Product'}</Text>
        <View style={styles.badgeRow}>
          <PlatformBadge platform={item.product?.platform} />
          <StockBadge    status={item.product?.stock_status} />
        </View>
        <View style={styles.priceRow}>
          <Text style={[styles.currentPrice, hasDrop && { color: Colors.success }]}>
            ₱{curr.toLocaleString()}
          </Text>
          {hasDrop && (
            <>
              <Text style={styles.prevPrice}>₱{prev.toLocaleString()}</Text>
              <View style={styles.dropBadge}>
                <Ionicons name="trending-down" size={10} color={Colors.success} />
                <Text style={styles.dropText}>-{dropPct}%</Text>
              </View>
            </>
          )}
        </View>
        {hasDrop && <Text style={styles.savingsText}>Save ₱{savings.toLocaleString()}</Text>}
      </View>
      <Ionicons name="lock-closed-outline" size={14} color={Colors.textLight} />
    </View>
  );
};

const SharedWatchlistScreen = ({ route, navigation }) => {
  const token = route?.params?.token;
  const isWeb = Platform.OS === 'web';

  const [items,   setItems]   = useState([]);
  const [owner,   setOwner]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    if (!token) { setError('Invalid or missing share link.'); setLoading(false); return; }
    (async () => {
      try {
        const res  = await axios.get(`${Config.PUBLIC_API_BASE_URL}/watchlist/share/${token}`);
        const body = res.data;
        const watchlistItems = body?.data || body?.items || body?.watchlist || (Array.isArray(body) ? body : []);
        const ownerValue     = typeof body?.owner === 'string' ? { name: body.owner } : body?.owner || body?.user || null;
        setItems(watchlistItems);
        setOwner(ownerValue);
      } catch {
        setError('This share link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filteredItems = items.filter(item => item.product?.name?.toLowerCase().includes(search.toLowerCase()));
  const totalSavings  = items.reduce((sum, item) => {
    const curr = parseFloat(item.product?.current_price || 0);
    const prev = parseFloat(item.product?.prev_price    || 0);
    return prev > curr ? sum + (prev - curr) : sum;
  }, 0);

  const outerStyle  = isWeb ? { height: Dimensions.get('window').height, backgroundColor: Colors.bg } : { flex: 1, backgroundColor: Colors.bg };
  const scrollStyle = isWeb ? { height: '100%', overflowY: 'auto' } : undefined;

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Loading watchlist…</Text>
    </View>
  );

  if (error) return (
    <View style={styles.centered}>
      <View style={styles.errorIcon}><Ionicons name="link-outline" size={40} color={Colors.danger} /></View>
      <Text style={styles.errorTitle}>Link Unavailable</Text>
      <Text style={styles.errorSub}>{error}</Text>
      {navigation?.canGoBack() && (
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      )}
      <VisitAppButton />
    </View>
  );

  return (
    <View style={outerStyle}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 60 }}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        style={scrollStyle}
      >
        <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
          <Text style={styles.appName}>Price and Stock Alert Application</Text>
          <Text style={styles.headerTitle}>Shared Watchlist</Text>
          {owner && (
            <View style={styles.ownerRow}>
              <Ionicons name="person-circle-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.ownerText}>Shared by {typeof owner === 'string' ? owner : owner?.name}</Text>
            </View>
          )}
          <View style={styles.readOnlyBadge}>
            <Ionicons name="lock-closed-outline" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={styles.readOnlyText}>Read-only · View only</Text>
          </View>
        </LinearGradient>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>About Sharing</Text>
            <Text style={styles.infoSub}>You can only VIEW this watchlist. You cannot edit it or receive its alerts.</Text>
          </View>
        </View>

        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={Colors.textLight}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {search ? `${filteredItems.length} of ${items.length}` : items.length} item{items.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {filteredItems.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name={search ? 'search-outline' : 'bookmark-outline'} size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>{search ? 'No results found' : 'This watchlist is empty'}</Text>
            <Text style={styles.emptySub}>{search ? 'Try a different keyword.' : 'No products added yet.'}</Text>
            {!search && <VisitAppButton />}
          </View>
        ) : (
          <View style={styles.list}>
            {filteredItems.map((item, i) => <ProductCard key={String(item.id ?? i)} item={item} />)}
          </View>
        )}

        {items.length > 0 && (
          <View style={styles.footerCta}>
            <Text style={styles.footerCtaTitle}>Want to track prices too?</Text>
            <Text style={styles.footerCtaSub}>Get notified when prices drop or items go out of stock.</Text>
            <VisitAppButton />
          </View>
        )}

        {items.length > 0 && (
          <View style={styles.savingsSummary}>
            <Ionicons name="leaf-outline" size={14} color={Colors.success} />
            <Text style={styles.footerText}>
              Total Savings:{' '}
              <Text style={styles.footerSavings}>
                ₱{totalSavings.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
              </Text>
              {'  '}|{'  '}
              <Text style={styles.footerCount}>{items.length} Items Tracked</Text>
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  centered:            { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg, padding: Spacing.xl, gap: Spacing.md },
  loadingText:         { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm },
  header:              { paddingTop: 52, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.lg, alignItems: 'center' },
  appName:             { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.xs, marginBottom: 6 },
  headerTitle:         { color: Colors.white, fontSize: FontSize.xl, fontWeight: FontWeight.black, marginBottom: 4 },
  ownerRow:            { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  ownerText:           { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
  readOnlyBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  readOnlyText:        { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  infoBanner:          { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.primary + '10', borderLeftWidth: 3, borderLeftColor: Colors.primary, padding: Spacing.md, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: Radius.md },
  infoTitle:           { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary, marginBottom: 2 },
  infoSub:             { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },
  searchWrapper:       { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  searchBar:           { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, gap: Spacing.sm, ...Shadow.sm },
  searchInput:         { flex: 1, paddingVertical: 10, fontSize: FontSize.sm, color: Colors.text },
  countRow:            { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xs },
  countText:           { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.textMuted, letterSpacing: 0.5 },
  list:                { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  card:                { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.md, gap: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  imgBox:              { width: 56, height: 56, borderRadius: Radius.md, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  imgThumb:            { width: 56, height: 56, borderRadius: Radius.md },
  cardInfo:            { flex: 1, gap: 3 },
  productName:         { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text, lineHeight: 18 },
  badgeRow:            { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  platformBadge:       { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  platformBadgeText:   { color: Colors.white, fontSize: 10, fontWeight: FontWeight.black },
  stockBadge:          { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  stockText:           { fontSize: 10, fontWeight: FontWeight.bold },
  priceRow:            { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  currentPrice:        { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text },
  prevPrice:           { fontSize: FontSize.xs, color: Colors.textMuted, textDecorationLine: 'line-through' },
  dropBadge:           { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.successLight, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  dropText:            { fontSize: 10, color: Colors.success, fontWeight: FontWeight.black },
  savingsText:         { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semiBold },
  errorIcon:           { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.dangerLight, justifyContent: 'center', alignItems: 'center' },
  errorTitle:          { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.text },
  errorSub:            { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  backBtn:             { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingHorizontal: 24, paddingVertical: 12, marginTop: Spacing.sm },
  backBtnText:         { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  empty:               { alignItems: 'center', paddingTop: 60, gap: Spacing.md, paddingHorizontal: Spacing.lg },
  emptyTitle:          { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textMuted },
  emptySub:            { fontSize: FontSize.sm, color: Colors.textLight },
  visitAppBtn:         { borderRadius: Radius.lg, overflow: 'hidden', marginTop: Spacing.sm, width: '100%' },
  visitAppBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: Spacing.lg },
  visitAppBtnText:     { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold, flex: 1, textAlign: 'center' },
  footerCta:           { backgroundColor: Colors.primary + '08', borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.md, marginHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '20', gap: Spacing.sm },
  footerCtaTitle:      { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  footerCtaSub:        { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  savingsSummary:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.successLight, paddingVertical: 12, paddingHorizontal: Spacing.lg, marginTop: Spacing.md, marginHorizontal: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.success + '30' },
  footerText:          { fontSize: FontSize.xs, color: Colors.text },
  footerSavings:       { fontWeight: FontWeight.black, color: Colors.success },
  footerCount:         { fontWeight: FontWeight.semiBold, color: Colors.textMuted },
});

export default SharedWatchlistScreen;