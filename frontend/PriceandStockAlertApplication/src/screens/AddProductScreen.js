// ============================================================
//  src/screens/AddProductScreen.js
//  UPDATED: Added Category picker field
// ============================================================

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, StatusBar, Image,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { addToWatchlist }  from '../api/watchListApi';
import {
  Colors, FontSize, FontWeight, Spacing, Radius, Shadow,
} from '../constants/theme';

// ── Re-use the CATEGORIES constant from HomeScreen (or define here) ───────────
export const CATEGORIES = [
  { key: 'uncategorized', label: 'Uncategorized', icon: 'help-circle-outline'       },
  { key: 'food',          label: 'Food',           icon: 'fast-food-outline'         },
  { key: 'shoes',         label: 'Shoes',          icon: 'footsteps-outline'         },
  { key: 'shirts',        label: 'Shirts',         icon: 'shirt-outline'             },
  { key: 'pants',         label: 'Pants',          icon: 'body-outline'              },
  { key: 'furniture',     label: 'Furniture',      icon: 'bed-outline'               },
  { key: 'electronics',   label: 'Electronics',    icon: 'phone-portrait-outline'    },
  { key: 'beauty',        label: 'Beauty',         icon: 'sparkles-outline'          },
  { key: 'sports',        label: 'Sports',         icon: 'basketball-outline'        },
  { key: 'toys',          label: 'Toys',           icon: 'game-controller-outline'   },
  { key: 'books',         label: 'Books',          icon: 'book-outline'              },
  { key: 'home',          label: 'Home & Living',  icon: 'home-outline'              },
  { key: 'bags',          label: 'Bags',           icon: 'bag-outline'               },
  { key: 'health',        label: 'Health',         icon: 'medkit-outline'            },
  { key: 'other',         label: 'Other',          icon: 'ellipsis-horizontal-outline'},
];

const getCategoryMeta = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[0];

// ── Category Picker Modal ─────────────────────────────────────────────────────
const CategoryPickerModal = ({ visible, currentCategory, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={pickerStyles.card}>
        <View style={pickerStyles.handle} />
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>Select Category</Text>
          <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn}>
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {CATEGORIES.map(cat => {
            const active = currentCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[pickerStyles.option, active && pickerStyles.optionActive]}
                onPress={() => { onSelect(cat.key); onClose(); }}
                activeOpacity={0.75}
              >
                <View style={[pickerStyles.optionIcon, active && pickerStyles.optionIconActive]}>
                  <Ionicons name={cat.icon} size={16} color={active ? Colors.primary : Colors.textMuted} />
                </View>
                <Text style={[pickerStyles.optionText, active && pickerStyles.optionTextActive]}>
                  {cat.label}
                </Text>
                {active && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

const pickerStyles = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  card:             { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingBottom: 40, maxHeight: '80%' },
  handle:           { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title:            { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text },
  closeBtn:         { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  option:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: Radius.md },
  optionActive:     { backgroundColor: Colors.primary + '10' },
  optionIcon:       { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  optionIconActive: { backgroundColor: Colors.primary + '15' },
  optionText:       { fontSize: FontSize.base, color: Colors.textMuted, fontWeight: FontWeight.semiBold, flex: 1 },
  optionTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },
});

// ── In-App Alert Modal ────────────────────────────────────────────────────────
const AppAlert = ({ visible, title, message, type, onClose }) => {
  const isSuccess = type === 'success';
  const iconColor = isSuccess ? Colors.success : Colors.danger;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={alertStyles.overlay}>
        <View style={alertStyles.card}>
          <View style={[alertStyles.iconBox, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={isSuccess ? 'checkmark-circle' : 'close-circle'} size={40} color={iconColor} />
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

// ── URL Detectors ─────────────────────────────────────────────────────────────
const SHOPEE_PATTERNS  = ['shopee.ph', 'shp.ee', 's.shopee.ph'];
const LAZADA_PATTERNS  = ['lazada.com.ph', 's.lazada.com.ph', 'm.lazada.com.ph'];
const DUMMYJSON_REGEX  = /dummyjson\.com\/products\/(\d+)/i;

const detectPlatform = (url) => {
  if (!url) return null;
  const lower = url.toLowerCase().trim();
  if (DUMMYJSON_REGEX.test(lower))                   return 'DummyJSON';
  if (SHOPEE_PATTERNS.some(p => lower.includes(p)))  return 'Shopee';
  if (LAZADA_PATTERNS.some(p => lower.includes(p)))  return 'Lazada';
  return null;
};

const extractDummyId = (url) => {
  const match = url.match(DUMMYJSON_REGEX);
  return match ? match[1] : null;
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════════
const AddProductScreen = ({ navigation }) => {
  const [url,           setUrl]           = useState('');
  const [productName,   setProductName]   = useState('');
  const [currentPrice,  setCurrentPrice]  = useState('');
  const [targetPrice,   setTargetPrice]   = useState('');
  const [stockInfo,     setStockInfo]     = useState('');
  const [productImage,  setProductImage]  = useState(null);
  const [category,      setCategory]      = useState('uncategorized');
  const [loading,       setLoading]       = useState(false);
  const [fetching,      setFetching]      = useState(false);
  const [autoFilled,    setAutoFilled]    = useState(false);
  const [showEditMode,  setShowEditMode]  = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  const [urlError,   setUrlError]   = useState('');
  const [nameError,  setNameError]  = useState('');
  const [priceError, setPriceError] = useState('');

  const [alertVisible,    setAlertVisible]    = useState(false);
  const [alertTitle,      setAlertTitle]      = useState('');
  const [alertMessage,    setAlertMessage]    = useState('');
  const [alertType,       setAlertType]       = useState('success');
  const [navigateOnClose, setNavigateOnClose] = useState(false);

  const fetchTimer       = useRef(null);
  const detectedPlatform = detectPlatform(url);
  const isDummy          = detectedPlatform === 'DummyJSON';
  const catMeta          = getCategoryMeta(category);

  // ── Alert helpers ─────────────────────────────────────────────────────────────
  const showAppAlert = (title, message, type = 'error', shouldNavigate = false) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setNavigateOnClose(shouldNavigate);
    setAlertVisible(true);
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (navigateOnClose) {
      setTimeout(() => navigation.goBack(), Platform.OS === 'web' ? 300 : 0);
    }
  };

  // ── DummyJSON auto-fill ───────────────────────────────────────────────────────
  const fetchDummyProduct = async (productUrl) => {
    const id = extractDummyId(productUrl);
    if (!id) return;
    setFetching(true);
    setAutoFilled(false);
    setShowEditMode(false);
    try {
      const res  = await fetch(`https://dummyjson.com/products/${id}`);
      const data = await res.json();
      if (data && data.title) {
        setProductName(data.title ?? '');
        setCurrentPrice(data.price ? String(data.price) : '');
        setStockInfo(data.stock !== undefined ? String(data.stock) : '');
        setProductImage(data.thumbnail ?? null);
        setAutoFilled(true);
        setNameError('');
        setPriceError('');
        setUrlError('');
      } else {
        setUrlError('Product not found. Try a valid DummyJSON product ID (1–100).');
      }
    } catch {
      setUrlError('Failed to fetch product data. Check your connection.');
    } finally {
      setFetching(false);
    }
  };

  // ── URL change handler ────────────────────────────────────────────────────────
  const handleUrlChange = (text) => {
    setUrl(text);
    setUrlError('');
    setAutoFilled(false);
    setShowEditMode(false);
    setProductName('');
    setCurrentPrice('');
    setStockInfo('');
    setProductImage(null);

    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    const platform = detectPlatform(text);
    if (platform === 'DummyJSON' && text.trim().length > 0) {
      fetchTimer.current = setTimeout(() => fetchDummyProduct(text.trim()), 600);
    }
  };

  const handleClearUrl = () => {
    setUrl('');
    setUrlError('');
    setAutoFilled(false);
    setShowEditMode(false);
    setProductName('');
    setCurrentPrice('');
    setStockInfo('');
    setProductImage(null);
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    let valid = true;
    if (!url.trim()) {
      setUrlError('Please paste a product URL.'); valid = false;
    } else if (!detectedPlatform) {
      setUrlError('Only Shopee, Lazada, and DummyJSON product links are supported.'); valid = false;
    } else { setUrlError(''); }

    if (!productName.trim()) {
      setNameError('Please enter the product name.'); valid = false;
    } else { setNameError(''); }

    if (!currentPrice) {
      setPriceError('Please enter the current price.'); valid = false;
    } else {
      const val = parseFloat(currentPrice.toString().replace(/[^\d.]/g, ''));
      if (isNaN(val) || val <= 0) { setPriceError('Please enter a valid price.'); valid = false; }
      else setPriceError('');
    }
    return valid;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!validate()) return;
    const finalPrice = parseFloat(currentPrice.toString().replace(/[^\d.]/g, ''));
    const tp         = targetPrice ? parseFloat(targetPrice.toString().replace(/[^\d.]/g, '')) : null;

    setLoading(true);
    try {
      // category is passed along with the other fields
      await addToWatchlist(url.trim(), tp, productName.trim(), finalPrice, category);
      showAppAlert(
        'Added to Watchlist! ✅',
        `"${productName.trim()}" has been added to your watchlist.`,
        'success',
        true,
      );
    } catch (error) {
      const status  = error?.response?.status;
      const message = error?.response?.data?.message;
      if (status === 409)      showAppAlert('Already Added',  message || 'This product is already in your watchlist.', 'error');
      else if (status === 422) showAppAlert('Invalid Link',   message || 'Please check the product URL and try again.', 'error');
      else                     showAppAlert('Error',          message || 'Failed to add product. Please try again.',    'error');
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* Category Picker — rendered outside ScrollView so it overlays correctly */}
      <CategoryPickerModal
        visible={showCatPicker}
        currentCategory={category}
        onSelect={setCategory}
        onClose={() => setShowCatPicker(false)}
      />

      <AppAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={handleAlertClose}
      />

      {/* Header */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add to Watchlist</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Supported Platforms ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>SUPPORTED PLATFORMS</Text>
          <View style={styles.platformRow}>
            {[
              { name: 'Shopee',    color: Colors.shopee,  icon: 'storefront-outline', domain: 'shopee.ph / shp.ee'       },
              { name: 'Lazada',    color: Colors.lazada,  icon: 'cart-outline',       domain: 'lazada.com.ph'             },
              { name: 'DummyJSON', color: Colors.primary, icon: 'flash-outline',      domain: 'dummyjson.com/products/ID' },
            ].map(p => (
              <View key={p.name} style={[styles.platformCard, detectedPlatform === p.name && { borderColor: p.color, borderWidth: 2 }]}>
                <Ionicons name={p.icon} size={22} color={p.color} />
                <Text style={[styles.platformName, { color: p.color }]}>{p.name}</Text>
                <Text style={styles.platformDomain}>{p.domain}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Product URL ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>PRODUCT URL <Text style={styles.required}>*</Text></Text>

          {detectedPlatform && !fetching && (
            <View style={[styles.detectedChip, {
              backgroundColor:
                detectedPlatform === 'Shopee'    ? Colors.shopee  + '15' :
                detectedPlatform === 'DummyJSON' ? Colors.primary + '15' :
                Colors.lazada + '15',
            }]}>
              <Ionicons name="checkmark-circle" size={16} color={
                detectedPlatform === 'Shopee'    ? Colors.shopee  :
                detectedPlatform === 'DummyJSON' ? Colors.primary :
                Colors.lazada
              } />
              <Text style={[styles.detectedChipText, {
                color:
                  detectedPlatform === 'Shopee'    ? Colors.shopee  :
                  detectedPlatform === 'DummyJSON' ? Colors.primary :
                  Colors.lazada,
              }]}>
                {detectedPlatform} detected ✓
                {isDummy && autoFilled ? ' — Auto-filled!' : ''}
              </Text>
            </View>
          )}

          {fetching && (
            <View style={styles.fetchingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.fetchingText}>Fetching product data from DummyJSON...</Text>
            </View>
          )}

          <View style={[styles.urlInputWrapper, urlError && styles.inputError, detectedPlatform && !urlError && styles.inputSuccess]}>
            <Ionicons name="link-outline" size={18} color={Colors.textLight} style={styles.urlIcon} />
            <TextInput
              style={styles.urlInput}
              placeholder={'Paste Shopee, Lazada, or DummyJSON link...\n\nDummyJSON example:\nhttps://dummyjson.com/products/1'}
              placeholderTextColor={Colors.textLight}
              value={url}
              onChangeText={handleUrlChange}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            {url.length > 0 && (
              <TouchableOpacity onPress={handleClearUrl} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={20} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          {urlError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
              <Text style={styles.errorText}>{urlError}</Text>
            </View>
          ) : null}

          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
            <Text style={styles.hintText}>
              <Text style={{ fontWeight: FontWeight.bold }}>Shopee/Lazada:</Text> tap Share → Copy Link.{'  '}
              <Text style={{ fontWeight: FontWeight.bold }}>DummyJSON:</Text> paste link like{' '}
              <Text style={{ fontWeight: FontWeight.bold }}>dummyjson.com/products/1</Text> — auto-fills instantly!
            </Text>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            DUMMYJSON AUTO-FILLED CARD
        ════════════════════════════════════════════════════════════════════ */}
        {isDummy && autoFilled && (
          <View style={styles.autoFilledCard}>
            <View style={styles.autoFilledHeader}>
              <View style={styles.autoFilledBadge}>
                <Ionicons name="flash" size={12} color={Colors.white} />
                <Text style={styles.autoFilledBadgeText}>AUTO-FILLED FROM DUMMYJSON</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditMode(v => !v)} style={styles.editToggleBtn}>
                <Ionicons name={showEditMode ? 'eye-off-outline' : 'pencil-outline'} size={14} color={Colors.primary} />
                <Text style={styles.editToggleText}>{showEditMode ? 'Hide fields' : 'Edit details'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.autoFilledProductRow}>
              {productImage && (
                <Image source={{ uri: productImage }} style={styles.autoFilledImage} resizeMode="cover" />
              )}
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.autoFilledName} numberOfLines={2}>{productName}</Text>
                <View style={styles.autoFilledPriceRow}>
                  <Text style={styles.autoFilledPriceLabel}>Price</Text>
                  <Text style={styles.autoFilledPrice}>
                    ₱{parseFloat(currentPrice || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                {stockInfo ? (
                  <View style={[styles.autoFilledStockRow, {
                    backgroundColor: parseInt(stockInfo) > 0 ? Colors.success + '12' : Colors.danger + '12',
                  }]}>
                    <View style={[styles.stockDot, {
                      backgroundColor: parseInt(stockInfo) > 0 ? Colors.success : Colors.danger,
                    }]} />
                    <Text style={[styles.autoFilledStockText, {
                      color: parseInt(stockInfo) > 0 ? Colors.success : Colors.danger,
                    }]}>
                      {parseInt(stockInfo) > 0 ? `${stockInfo} units in stock` : 'Out of stock'}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {showEditMode && (
              <View style={styles.editFieldsWrapper}>
                <View style={styles.editFieldsDivider}>
                  <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
                  <Text style={styles.editFieldsDividerText}>EDIT DETAILS</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
                </View>
                <View style={styles.editFieldGroup}>
                  <Text style={styles.editFieldLabel}>PRODUCT NAME</Text>
                  <View style={[styles.editInputWrapper, nameError && styles.inputError]}>
                    <Ionicons name="pricetag-outline" size={16} color={Colors.textLight} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.editInput}
                      value={productName}
                      onChangeText={(t) => { setProductName(t); setNameError(''); }}
                      autoCapitalize="words"
                      autoCorrect={false}
                      maxLength={200}
                    />
                  </View>
                  {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                </View>
                <View style={styles.editFieldGroup}>
                  <Text style={styles.editFieldLabel}>CURRENT PRICE</Text>
                  <View style={[styles.editInputWrapper, priceError && styles.inputError]}>
                    <Text style={styles.pesoSign}>₱</Text>
                    <TextInput
                      style={styles.editInput}
                      value={currentPrice}
                      onChangeText={(t) => { setCurrentPrice(t); setPriceError(''); }}
                      keyboardType="numeric"
                    />
                  </View>
                  {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            SHOPEE / LAZADA — manual fields
        ════════════════════════════════════════════════════════════════════ */}
        {!isDummy && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>PRODUCT NAME <Text style={styles.required}>*</Text></Text>
              <Text style={styles.sectionDesc}>Type the name of the product so you can easily identify it in your watchlist.</Text>
              <View style={[styles.nameInputWrapper, nameError && styles.inputError]}>
                <Ionicons name="pricetag-outline" size={18} color={Colors.textLight} style={styles.urlIcon} />
                <TextInput
                  style={styles.nameInput}
                  placeholder="e.g. Maybelline Superstay Teddy Tint"
                  placeholderTextColor={Colors.textLight}
                  value={productName}
                  onChangeText={(t) => { setProductName(t); setNameError(''); }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={200}
                />
                {productName.length > 0 && (
                  <TouchableOpacity onPress={() => { setProductName(''); setNameError(''); }}>
                    <Ionicons name="close-circle" size={20} color={Colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
              {nameError ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
                  <Text style={styles.errorText}>{nameError}</Text>
                </View>
              ) : null}
              <Text style={styles.charCount}>{productName.length}/200</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>CURRENT PRICE <Text style={styles.required}>*</Text></Text>
              <Text style={styles.sectionDesc}>Enter the current price of the product as shown on Shopee or Lazada.</Text>
              <View style={[styles.targetInputWrapper, priceError && styles.inputError]}>
                <Text style={styles.currencySymbol}>₱</Text>
                <TextInput
                  style={styles.targetInput}
                  placeholder="e.g. 1299.00"
                  placeholderTextColor={Colors.textLight}
                  value={currentPrice}
                  onChangeText={(t) => { setCurrentPrice(t); setPriceError(''); }}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
                {currentPrice.length > 0 && (
                  <TouchableOpacity onPress={() => setCurrentPrice('')}>
                    <Ionicons name="close-circle" size={18} color={Colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
              {priceError ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
                  <Text style={styles.errorText}>{priceError}</Text>
                </View>
              ) : null}
              <View style={[styles.hintBox, { marginTop: Spacing.sm }]}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
                <Text style={styles.hintText}>The system will automatically track price changes every 5 minutes.</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Category Picker ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>CATEGORY <Text style={styles.optional}>(Optional)</Text></Text>
          <Text style={styles.sectionDesc}>Tag this product so you can filter your watchlist by category.</Text>
          <TouchableOpacity
            style={styles.categorySelector}
            onPress={() => setShowCatPicker(true)}
            activeOpacity={0.8}
          >
            <View style={styles.categorySelectorLeft}>
              <View style={styles.categorySelectorIcon}>
                <Ionicons name={catMeta.icon} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.categorySelectorText}>{catMeta.label}</Text>
            </View>
            <Ionicons name="chevron-down-outline" size={18} color={Colors.textLight} />
          </TouchableOpacity>

          {/* Quick category chips for the most common ones */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.md }} contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.slice(0, 8).map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.quickChip,
                  category === cat.key && styles.quickChipActive,
                ]}
                onPress={() => setCategory(cat.key)}
                activeOpacity={0.75}
              >
                <Ionicons name={cat.icon} size={12} color={category === cat.key ? Colors.white : Colors.primary} />
                <Text style={[styles.quickChipText, category === cat.key && { color: Colors.white }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.quickChip, { borderColor: Colors.border }]}
              onPress={() => setShowCatPicker(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="ellipsis-horizontal" size={12} color={Colors.textMuted} />
              <Text style={[styles.quickChipText, { color: Colors.textMuted }]}>More</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── Target Price ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>TARGET PRICE <Text style={styles.optional}>(Optional)</Text></Text>
          <Text style={styles.sectionDesc}>Set a price goal. We'll alert you when the product drops to or below this price.</Text>
          <View style={styles.targetInputWrapper}>
            <Text style={styles.currencySymbol}>₱</Text>
            <TextInput
              style={styles.targetInput}
              placeholder="e.g. 999"
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
        </View>

        {/* ── Add Button ── */}
        <TouchableOpacity
          style={[styles.addBtn, (loading || fetching) && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={loading || fetching}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[Colors.accent, Colors.accentLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtnGradient}>
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <>
                  <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
                  <Text style={styles.addBtnText}>Add to Watchlist</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.75} disabled={loading}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { paddingTop: 50, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
  headerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:      { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  content:      { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.md },
  card:         { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.default },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.sm },
  sectionDesc:  { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 20, marginBottom: Spacing.md },
  required:     { color: Colors.danger },
  optional:     { color: Colors.textLight, fontWeight: FontWeight.normal },

  platformRow:   { flexDirection: 'row', gap: Spacing.sm },
  platformCard:  { flex: 1, backgroundColor: Colors.bg, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  platformName:  { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  platformDomain:{ fontSize: 9, color: Colors.textLight, textAlign: 'center' },

  detectedChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.sm },
  detectedChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  fetchingRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  fetchingText:     { fontSize: FontSize.sm, color: Colors.primary },
  urlInputWrapper:  { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.inputBg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 80 },
  inputError:       { borderColor: Colors.danger },
  inputSuccess:     { borderColor: Colors.success },
  urlIcon:          { marginRight: Spacing.sm, marginTop: 4 },
  urlInput:         { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 20, paddingTop: 2 },
  clearBtn:         { padding: 2, marginTop: 2 },
  errorRow:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  errorText:        { fontSize: FontSize.xs, color: Colors.danger, flex: 1 },
  hintBox:          { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.tagBg, borderRadius: Radius.sm, padding: Spacing.md, marginTop: Spacing.md },
  hintText:         { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 18 },

  // Category selector
  categorySelector:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.inputBg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 14 },
  categorySelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  categorySelectorIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.primary + '12', justifyContent: 'center', alignItems: 'center' },
  categorySelectorText: { fontSize: FontSize.base, fontWeight: FontWeight.semiBold, color: Colors.text },
  quickChip:            { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primary + '40' },
  quickChipText:        { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary },
  quickChipActive:      { backgroundColor: Colors.primary, borderColor: Colors.primary },

  autoFilledCard:        { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.primary + '40', ...Shadow.default, gap: Spacing.md },
  autoFilledHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  autoFilledBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  autoFilledBadgeText:   { color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  editToggleBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary + '40', backgroundColor: Colors.primary + '08' },
  editToggleText:        { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semiBold },
  autoFilledProductRow:  { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  autoFilledImage:       { width: 80, height: 80, borderRadius: Radius.md, backgroundColor: Colors.border },
  autoFilledName:        { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, lineHeight: 20 },
  autoFilledPriceRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  autoFilledPriceLabel:  { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semiBold },
  autoFilledPrice:       { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.accent },
  autoFilledStockRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  stockDot:              { width: 7, height: 7, borderRadius: 4 },
  autoFilledStockText:   { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  editFieldsWrapper:     { gap: Spacing.md, marginTop: Spacing.sm },
  editFieldsDivider:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editFieldsDividerText: { fontSize: 9, color: Colors.textLight, fontWeight: FontWeight.bold, letterSpacing: 0.8 },
  editFieldGroup:        { gap: Spacing.sm },
  editFieldLabel:        { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.8 },
  editInputWrapper:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md },
  editInput:             { flex: 1, paddingVertical: 12, fontSize: FontSize.base, color: Colors.text },
  pesoSign:              { fontSize: FontSize.base, color: Colors.textMuted, marginRight: 4 },

  nameInputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.inputBg, paddingHorizontal: Spacing.md, minHeight: 50 },
  nameInput:        { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 12 },
  charCount:        { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'right', marginTop: 4 },

  targetInputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.inputBg, paddingHorizontal: Spacing.md },
  currencySymbol:     { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.textMuted, marginRight: Spacing.sm },
  targetInput:        { flex: 1, paddingVertical: 14, fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.accent },

  addBtn:         { borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.accent },
  addBtnDisabled: { opacity: 0.7 },
  addBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  addBtnText:     { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  cancelBtn:      { backgroundColor: Colors.bg, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: 14, alignItems: 'center', marginBottom: Spacing.sm },
  cancelText:     { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: FontWeight.semiBold },
});

export default AddProductScreen;  