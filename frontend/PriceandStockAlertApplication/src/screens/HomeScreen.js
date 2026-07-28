// ============================================================
//  src/screens/HomeScreen.js
//  FIXED: Correct file structure, filter/sort overlap resolved
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, ActivityIndicator,
  StatusBar, Alert, Platform, Modal, ScrollView, Image
} from 'react-native';
import { Ionicons }       from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect }  from '@react-navigation/native';

import { getWatchlist, removeFromWatchlist, updateWatchlistItem } from '../api/watchListApi';
import { useAuth }        from '../context/AuthContext';
import { isOnline, saveCache, loadCache, KEYS } from '../utils/offline-cache';
import OfflineBanner      from '../components/OfflineBanner';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

// ── Category Constants ─────────────────────────────────────────────────────────
export const CATEGORIES = [
  { key: 'uncategorized', label: 'Uncategorized', icon: 'help-circle-outline'  },
  { key: 'food',          label: 'Food',           icon: 'fast-food-outline'    },
  { key: 'shoes',         label: 'Shoes',          icon: 'footsteps-outline'    },
  { key: 'shirts',        label: 'Shirts',         icon: 'shirt-outline'        },
  { key: 'pants',         label: 'Pants',          icon: 'body-outline'         },
  { key: 'furniture',     label: 'Furniture',      icon: 'bed-outline'          },
  { key: 'electronics',   label: 'Electronics',    icon: 'phone-portrait-outline'},
  { key: 'beauty',        label: 'Beauty',         icon: 'sparkles-outline'     },
  { key: 'sports',        label: 'Sports',         icon: 'basketball-outline'   },
  { key: 'toys',          label: 'Toys',           icon: 'game-controller-outline'},
  { key: 'books',         label: 'Books',          icon: 'book-outline'         },
  { key: 'home',          label: 'Home & Living',  icon: 'home-outline'         },
  { key: 'bags',          label: 'Bags',           icon: 'bag-outline'          },
  { key: 'health',        label: 'Health',         icon: 'medkit-outline'       },
  { key: 'other',         label: 'Other',          icon: 'ellipsis-horizontal-outline' },
];

const getCategoryMeta = (key) =>
  CATEGORIES.find(c => c.key === key) || CATEGORIES[0];

// ── Filter / Sort Constants ────────────────────────────────────────────────────
const PLATFORM_FILTERS = [
  { key: 'all',       label: 'All',       icon: 'apps-outline',       color: Colors.primary },
  { key: 'shopee',    label: 'Shopee',    icon: 'storefront-outline', color: Colors.shopee  },
  { key: 'lazada',    label: 'Lazada',    icon: 'cart-outline',       color: Colors.lazada  },
  { key: 'dummyjson', label: 'DummyJSON', icon: 'flash-outline',      color: Colors.primary },
];

const SORT_OPTIONS = [
  { key: 'default',    label: 'Default',           icon: 'list-outline'          },
  { key: 'name_asc',   label: 'Name (A → Z)',       icon: 'text-outline'          },
  { key: 'name_desc',  label: 'Name (Z → A)',       icon: 'text-outline'          },
  { key: 'price_asc',  label: 'Price (Low → High)', icon: 'trending-up-outline'   },
  { key: 'price_desc', label: 'Price (High → Low)', icon: 'trending-down-outline' },
  { key: 'drop',       label: 'Price Drop First',   icon: 'pricetag-outline'      },
];

// ── Sort Modal ─────────────────────────────────────────────────────────────────
const SortModal = ({ visible, currentSort, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <TouchableOpacity style={sortModalStyles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={sortModalStyles.card}>
        <View style={sortModalStyles.handle} />
        <View style={sortModalStyles.header}>
          <Text style={sortModalStyles.title}>Sort Products</Text>
          <TouchableOpacity onPress={onClose} style={sortModalStyles.closeBtn}>
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        {SORT_OPTIONS.map(opt => {
          const active = currentSort === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[sortModalStyles.option, active && sortModalStyles.optionActive]}
              onPress={() => { onSelect(opt.key); onClose(); }}
              activeOpacity={0.75}
            >
              <View style={[sortModalStyles.optionIcon, active && sortModalStyles.optionIconActive]}>
                <Ionicons name={opt.icon} size={16} color={active ? Colors.primary : Colors.textMuted} />
              </View>
              <Text style={[sortModalStyles.optionText, active && sortModalStyles.optionTextActive]}>
                {opt.label}
              </Text>
              {active && (
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </TouchableOpacity>
  </Modal>
);

const sortModalStyles = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  card:             { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingBottom: 40, gap: 2 },
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

// ── Category Picker Modal ──────────────────────────────────────────────────────
const CategoryPickerModal = ({ visible, currentCategory, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <TouchableOpacity style={sortModalStyles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={[sortModalStyles.card, { maxHeight: '80%' }]}>
        <View style={sortModalStyles.handle} />
        <View style={sortModalStyles.header}>
          <Text style={sortModalStyles.title}>Select Category</Text>
          <TouchableOpacity onPress={onClose} style={sortModalStyles.closeBtn}>
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {CATEGORIES.map(cat => {
            const active = currentCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[sortModalStyles.option, active && sortModalStyles.optionActive]}
                onPress={() => { onSelect(cat.key); onClose(); }}
                activeOpacity={0.75}
              >
                <View style={[sortModalStyles.optionIcon, active && sortModalStyles.optionIconActive]}>
                  <Ionicons name={cat.icon} size={16} color={active ? Colors.primary : Colors.textMuted} />
                </View>
                <Text style={[sortModalStyles.optionText, active && sortModalStyles.optionTextActive]}>
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

// ── Remove Confirm Modal ───────────────────────────────────────────────────────
const RemoveModal = ({ visible, productName, onConfirm, onCancel }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
    <View style={modalStyles.overlay}>
      <View style={modalStyles.card}>
        <Text style={modalStyles.title}>Remove Product?</Text>
        <Text style={modalStyles.message}>
          This will permanently remove{'\n'}
          <Text style={modalStyles.productName}>{productName}</Text>
          {'\n'}from your watchlist.
        </Text>
        <View style={modalStyles.btnRow}>
          <TouchableOpacity style={modalStyles.cancelBtn} onPress={onCancel}>
            <Text style={modalStyles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modalStyles.removeBtn} onPress={onConfirm}>
            <Text style={modalStyles.removeText}>REMOVE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ── Success Alert Modal ────────────────────────────────────────────────────────
const SuccessModal = ({ visible, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={modalStyles.overlay}>
      <View style={modalStyles.card}>
        <View style={successStyles.iconBox}>
          <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
        </View>
        <Text style={modalStyles.title}>Updated!</Text>
        <Text style={modalStyles.message}>Product has been updated successfully.</Text>
        <TouchableOpacity style={successStyles.okBtn} onPress={onClose}>
          <Text style={successStyles.okText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const successStyles = StyleSheet.create({
  iconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.success + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  okBtn:   { borderRadius: Radius.lg, paddingVertical: 14, width: '100%', alignItems: 'center', marginTop: 4, backgroundColor: Colors.success },
  okText:  { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

// ── Edit Modal (with Category Picker) ─────────────────────────────────────────
const EditModal = ({ visible, item, onSave, onCancel, saving }) => {
  const [name,            setName]            = useState('');
  const [url,             setUrl]             = useState('');
  const [targetPrice,     setTargetPrice]     = useState('');
  const [category,        setCategory]        = useState('uncategorized');
  const [showCatPicker,   setShowCatPicker]   = useState(false);
  const [errors,          setErrors]          = useState({});

  React.useEffect(() => {
    if (item) {
      setName(item.product?.name || '');
      setUrl(item.product?.url || '');
      setTargetPrice(item.target_price ? String(item.target_price) : '');
      setCategory(item.category || 'uncategorized');
      setErrors({});
    }
  }, [item]);

  const validate = () => {
    const e = {};
    if (!name.trim())  e.name = 'Product name is required.';
    if (!url.trim())   e.url  = 'Product URL is required.';
    else if (!url.trim().startsWith('http')) e.url = 'URL must start with https://';
    if (targetPrice && isNaN(parseFloat(targetPrice))) e.targetPrice = 'Enter a valid price.';
    if (targetPrice && parseFloat(targetPrice) <= 0)   e.targetPrice = 'Price must be greater than 0.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name:         name.trim(),
      url:          url.trim(),
      target_price: targetPrice ? parseFloat(targetPrice) : null,
      category,
    });
  };

  const catMeta = getCategoryMeta(category);

  return (
    <>
      <CategoryPickerModal
        visible={showCatPicker}
        currentCategory={category}
        onSelect={setCategory}
        onClose={() => setShowCatPicker(false)}
      />

      <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
        <View style={editStyles.overlay}>
          <View style={editStyles.card}>
            <View style={editStyles.header}>
              <Text style={editStyles.title}>Edit Product</Text>
              <TouchableOpacity onPress={onCancel} style={editStyles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Product Name */}
              <View style={editStyles.fieldGroup}>
                <Text style={editStyles.fieldLabel}>PRODUCT NAME</Text>
                <View style={[editStyles.inputWrapper, errors.name && editStyles.inputError]}>
                  <Ionicons name="cube-outline" size={16} color={Colors.textLight} style={editStyles.inputIcon} />
                  <TextInput
                    style={editStyles.input}
                    value={name}
                    onChangeText={(t) => { setName(t); setErrors(e => ({ ...e, name: null })); }}
                    placeholder="Enter product name"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="words"
                  />
                </View>
                {errors.name && <Text style={editStyles.errorText}>{errors.name}</Text>}
              </View>

              {/* Product URL */}
              <View style={editStyles.fieldGroup}>
                <Text style={editStyles.fieldLabel}>PRODUCT URL</Text>
                <View style={[editStyles.inputWrapper, errors.url && editStyles.inputError]}>
                  <Ionicons name="link-outline" size={16} color={Colors.textLight} style={editStyles.inputIcon} />
                  <TextInput
                    style={editStyles.input}
                    value={url}
                    onChangeText={(t) => { setUrl(t); setErrors(e => ({ ...e, url: null })); }}
                    placeholder="https://shopee.ph/..."
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>
                {errors.url && <Text style={editStyles.errorText}>{errors.url}</Text>}
                <Text style={editStyles.hintText}>
                  <Ionicons name="information-circle-outline" size={11} color={Colors.textLight} /> Shopee and Lazada links only
                </Text>
              </View>

              {/* Category Picker */}
              <View style={editStyles.fieldGroup}>
                <Text style={editStyles.fieldLabel}>CATEGORY</Text>
                <TouchableOpacity
                  style={editStyles.inputWrapper}
                  onPress={() => setShowCatPicker(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={catMeta.icon} size={16} color={Colors.primary} style={editStyles.inputIcon} />
                  <Text style={[editStyles.input, { paddingVertical: 13, color: Colors.text }]}>
                    {catMeta.label}
                  </Text>
                  <Ionicons name="chevron-down-outline" size={16} color={Colors.textLight} />
                </TouchableOpacity>
              </View>

              {/* Target Price */}
              <View style={editStyles.fieldGroup}>
                <Text style={editStyles.fieldLabel}>TARGET PRICE (OPTIONAL)</Text>
                <View style={[editStyles.inputWrapper, errors.targetPrice && editStyles.inputError]}>
                  <Text style={editStyles.pesoSign}>₱</Text>
                  <TextInput
                    style={editStyles.input}
                    value={targetPrice}
                    onChangeText={(t) => { setTargetPrice(t); setErrors(e => ({ ...e, targetPrice: null })); }}
                    placeholder="0.00"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.targetPrice && <Text style={editStyles.errorText}>{errors.targetPrice}</Text>}
                <Text style={editStyles.hintText}>
                  <Ionicons name="information-circle-outline" size={11} color={Colors.textLight} /> You'll be notified when price drops to this amount
                </Text>
              </View>

            </ScrollView>
            <View style={editStyles.btnRow}>
              <TouchableOpacity style={editStyles.cancelBtn} onPress={onCancel} disabled={saving}>
                <Text style={editStyles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[editStyles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={editStyles.saveText}>SAVE</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
    padding: 32, zIndex: 9999,
    ...(Platform.OS === 'web' ? { position: 'fixed' } : {}),
  },
  card:        { backgroundColor: Colors.white, borderRadius: 16, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center', gap: 12 },
  title:       { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text },
  message:     { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  productName: { fontWeight: FontWeight.bold, color: Colors.text },
  btnRow:      { flexDirection: 'row', gap: 12, width: '100%', marginTop: 4 },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: Colors.border, alignItems: 'center' },
  cancelText:  { fontSize: FontSize.sm, fontWeight: FontWeight.black, color: Colors.textMuted, letterSpacing: 0.5 },
  removeBtn:   { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: Colors.danger, alignItems: 'center' },
  removeText:  { fontSize: FontSize.sm, fontWeight: FontWeight.black, color: Colors.white, letterSpacing: 0.5 },
});

const editStyles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
    padding: 24, zIndex: 9999,
    ...(Platform.OS === 'web' ? { position: 'fixed' } : {}),
  },
  card:         { backgroundColor: Colors.white, borderRadius: 24, padding: Spacing.xxl, width: '100%', maxWidth: 400, maxHeight: '85%' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  title:        { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  fieldGroup:   { marginBottom: Spacing.lg },
  fieldLabel:   { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.sm },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md },
  inputError:   { borderColor: Colors.danger },
  inputIcon:    { marginRight: Spacing.sm },
  pesoSign:     { fontSize: FontSize.base, color: Colors.textLight, marginRight: 4 },
  input:        { flex: 1, paddingVertical: 13, fontSize: FontSize.base, color: Colors.text },
  errorText:    { fontSize: FontSize.xs, color: Colors.danger, marginTop: 4 },
  hintText:     { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 4 },
  btnRow:       { flexDirection: 'row', gap: 12, marginTop: Spacing.lg },
  cancelBtn:    { flex: 1, paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: Colors.border, alignItems: 'center' },
  cancelText:   { fontSize: FontSize.sm, fontWeight: FontWeight.black, color: Colors.textMuted, letterSpacing: 0.5 },
  saveBtn:      { flex: 1, paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: Colors.primary, alignItems: 'center' },
  saveText:     { fontSize: FontSize.sm, fontWeight: FontWeight.black, color: Colors.white, letterSpacing: 0.5 },
});

// ── Product Image Box ──────────────────────────────────────────────────────────
const ProductImageBox = ({ imageUrl, platform }) => {
  if (imageUrl) {
    return (
      <View style={[styles.imgBox, { overflow: 'hidden' }]}>
        <Image source={{ uri: imageUrl }} style={styles.imgThumb} resizeMode="cover" />
      </View>
    );
  }
  if (platform === 'shopee' || platform === 'lazada') {
    const bgColor = platform === 'shopee' ? Colors.shopee + '15' : Colors.lazada + '15';
    const icColor = platform === 'shopee' ? Colors.shopee       : Colors.lazada;
    return (
      <View style={[styles.imgBox, { backgroundColor: bgColor }]}>
        <Ionicons name="storefront-outline" size={22} color={icColor} />
      </View>
    );
  }
  return (
    <View style={styles.imgBox}>
      <Ionicons name="image-outline" size={24} color={Colors.border} />
      <Text style={styles.imgLabel}>IMG</Text>
    </View>
  );
};

// ── Platform Badge ─────────────────────────────────────────────────────────────
const PlatformBadge = ({ platform }) => (
  <View style={[styles.platformBadge, {
    backgroundColor:
      platform === 'shopee' ? Colors.shopee :
      platform === 'lazada' ? Colors.lazada :
      Colors.primary,
  }]}>
    <Text style={styles.platformBadgeText}>
      {platform?.charAt(0).toUpperCase() + platform?.slice(1)}
    </Text>
  </View>
);

// ── Stock Badge ────────────────────────────────────────────────────────────────
const StockBadge = ({ status }) => {
  const inStock = status === 'in_stock';
  return (
    <View style={[styles.stockBadge, { backgroundColor: inStock ? Colors.successLight : Colors.dangerLight }]}>
      <Ionicons name={inStock ? 'checkmark-circle' : 'close-circle'} size={12} color={inStock ? Colors.success : Colors.danger} />
      <Text style={[styles.stockBadgeText, { color: inStock ? Colors.success : Colors.danger }]}>
        {inStock ? 'In Stock' : 'Out of Stock'}
      </Text>
    </View>
  );
};

// ── Category Badge ─────────────────────────────────────────────────────────────
const CategoryBadge = ({ category }) => {
  const meta = getCategoryMeta(category);
  if (!category || category === 'uncategorized') return null;
  return (
    <View style={styles.categoryBadge}>
      <Ionicons name={meta.icon} size={10} color={Colors.accent} />
      <Text style={styles.categoryBadgeText}>{meta.label}</Text>
    </View>
  );
};

// ── Product Card ───────────────────────────────────────────────────────────────
const ProductCard = ({ item, onPress, onDelete, onEdit }) => {
  const curr      = parseFloat(item.product?.current_price || 0);
  const prev      = parseFloat(item.product?.prev_price || 0);
  const hasDrop   = prev > 0 && curr < prev;
  const dropPct   = hasDrop ? (((prev - curr) / prev) * 100).toFixed(1) : null;
  const leftColor = hasDrop ? Colors.success : (item.product?.stock_status !== 'in_stock' ? Colors.danger : Colors.border);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: leftColor, borderLeftWidth: 3 }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <ProductImageBox imageUrl={item.product?.image_url} platform={item.product?.platform} />

      <View style={styles.cardInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.product?.name || 'Unknown Product'}</Text>
        <View style={styles.badgeRow}>
          <PlatformBadge platform={item.product?.platform} />
          <StockBadge status={item.product?.stock_status} />
          <CategoryBadge category={item.category} />
        </View>
        <View style={styles.priceRow}>
          <Text style={[styles.currentPrice, hasDrop && { color: Colors.success }]}>
            ₱{curr.toLocaleString()}
          </Text>
          {hasDrop && (
            <>
              <Text style={styles.prevPrice}>was ₱{prev.toLocaleString()}</Text>
              <View style={styles.dropBadge}>
                <Text style={styles.dropText}>-{dropPct}%</Text>
              </View>
            </>
          )}
        </View>
        {item.target_price && (
          <View style={styles.targetRow}>
            <Ionicons name="pricetag-outline" size={11} color={Colors.primary} />
            <Text style={styles.targetText}>Target: ₱{parseFloat(item.target_price).toLocaleString()}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionBtns}>
        <TouchableOpacity onPress={onEdit} style={styles.editBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="pencil" size={16} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash" size={16} color={Colors.textLight} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ── Home Screen ────────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
  const { user }                       = useAuth();
  const [watchlist,    setWatchlist]   = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [refreshing,   setRefreshing]  = useState(false);
  const [search,       setSearch]      = useState('');
  const [offline,      setOffline]     = useState(false);

  const [activePlatform,  setActivePlatform]  = useState('all');
  const [activeCategory,  setActiveCategory]  = useState('all');
  const [activeSort,      setActiveSort]      = useState('default');
  const [showSortModal,   setShowSortModal]   = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [editTarget,   setEditTarget]   = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [showSuccess,  setShowSuccess]  = useState(false);

  const processedList = useMemo(() => {
    let list = [...watchlist];
    if (search.trim()) {
      list = list.filter(item =>
        item.product?.name?.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (activePlatform !== 'all') {
      list = list.filter(item =>
        item.product?.platform?.toLowerCase() === activePlatform,
      );
    }
    if (activeCategory !== 'all') {
      list = list.filter(item =>
        (item.category || 'uncategorized') === activeCategory,
      );
    }
    switch (activeSort) {
      case 'name_asc':
        list.sort((a, b) => (a.product?.name || '').localeCompare(b.product?.name || ''));
        break;
      case 'name_desc':
        list.sort((a, b) => (b.product?.name || '').localeCompare(a.product?.name || ''));
        break;
      case 'price_asc':
        list.sort((a, b) => parseFloat(a.product?.current_price || 0) - parseFloat(b.product?.current_price || 0));
        break;
      case 'price_desc':
        list.sort((a, b) => parseFloat(b.product?.current_price || 0) - parseFloat(a.product?.current_price || 0));
        break;
      case 'drop':
        list.sort((a, b) => {
          const dropA = parseFloat(a.product?.prev_price || 0) - parseFloat(a.product?.current_price || 0);
          const dropB = parseFloat(b.product?.prev_price || 0) - parseFloat(b.product?.current_price || 0);
          return dropB - dropA;
        });
        break;
      default:
        break;
    }
    return list;
  }, [watchlist, search, activePlatform, activeCategory, activeSort]);

  const platformCounts = useMemo(() => {
    const counts = { all: watchlist.length };
    watchlist.forEach(item => {
      const p = item.product?.platform?.toLowerCase();
      if (p) counts[p] = (counts[p] || 0) + 1;
    });
    return counts;
  }, [watchlist]);

  const categoryCounts = useMemo(() => {
    const counts = { all: watchlist.length };
    watchlist.forEach(item => {
      const c = item.category || 'uncategorized';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [watchlist]);

  const totalSaved = watchlist.reduce((sum, item) => {
    const prev = parseFloat(item.product?.prev_price || 0);
    const curr = parseFloat(item.product?.current_price || 0);
    return curr < prev ? sum + (prev - curr) : sum;
  }, 0);

  const fetchWatchlist = async () => {
    const online = await isOnline();
    setOffline(!online);
    if (online) {
      try {
        const data = await getWatchlist();
        const list = data.data || data || [];
        setWatchlist(list);
        await saveCache(KEYS.WATCHLIST, list);
      } catch {
        const cached = await loadCache(KEYS.WATCHLIST);
        if (cached) { setWatchlist(cached); setOffline(true); }
        else setWatchlist([]);
      }
    } else {
      const cached = await loadCache(KEYS.WATCHLIST);
      setWatchlist(cached || []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchWatchlist(); }, []));
  const handleRefresh = () => { setRefreshing(true); fetchWatchlist(); };

  const handleDeletePress = (item) => {
    if (offline) {
      if (Platform.OS === 'web') window.alert('Offline\n\nYou cannot remove products while offline.');
      else Alert.alert('Offline', 'You cannot remove products while offline.');
      return;
    }
    setRemoveTarget(item);
  };

  const handleDeleteConfirm = async () => {
    if (!removeTarget) return;
    const item = removeTarget;
    setRemoveTarget(null);
    try {
      await removeFromWatchlist(item.id);
      const updated = watchlist.filter(w => w.id !== item.id);
      setWatchlist(updated);
      await saveCache(KEYS.WATCHLIST, updated);
    } catch {
      if (Platform.OS === 'web') window.alert('Error\n\nFailed to remove product.');
      else Alert.alert('Error', 'Failed to remove product.');
    }
  };

  const handleEditPress = (item) => {
    if (offline) {
      if (Platform.OS === 'web') window.alert('Offline\n\nYou cannot edit products while offline.');
      else Alert.alert('Offline', 'You cannot edit products while offline.');
      return;
    }
    setEditTarget(item);
  };

  const handleEditSave = async (data) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const response = await updateWatchlistItem(editTarget.id, data);
      const updated = watchlist.map(w => w.id === editTarget.id ? response.data : w);
      setWatchlist(updated);
      await saveCache(KEYS.WATCHLIST, updated);
      setEditTarget(null);
      setShowSuccess(true);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update product. Please try again.';
      if (Platform.OS === 'web') window.alert(`Error\n\n${msg}`);
      else Alert.alert('Update Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = () => {
    if (offline) {
      if (Platform.OS === 'web') window.alert('You are Offline\n\nAdding products requires an internet connection.');
      else Alert.alert('You are Offline', 'Adding products requires an internet connection.');
      return;
    }
    navigation.navigate('AddProduct');
  };

  const handleClearFilters = () => {
    setActivePlatform('all');
    setActiveCategory('all');
    setActiveSort('default');
    setSearch('');
  };

  const isFiltered      = activePlatform !== 'all' || activeCategory !== 'all' || activeSort !== 'default' || search.trim().length > 0;
  const isSortActive    = activeSort !== 'default';
  const activeSortLabel = SORT_OPTIONS.find(o => o.key === activeSort)?.label || 'Sort';

  const visibleCategories = useMemo(() => {
    const used = new Set(watchlist.map(item => item.category || 'uncategorized'));
    return [{ key: 'all', label: 'All', icon: 'apps-outline' }, ...CATEGORIES.filter(c => used.has(c.key))];
  }, [watchlist]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      <SortModal
        visible={showSortModal}
        currentSort={activeSort}
        onSelect={setActiveSort}
        onClose={() => setShowSortModal(false)}
      />
      <RemoveModal
        visible={!!removeTarget}
        productName={removeTarget?.product?.name?.slice(0, 50) || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setRemoveTarget(null)}
      />
      <SuccessModal visible={showSuccess} onClose={() => setShowSuccess(false)} />
      <EditModal
        visible={!!editTarget}
        item={editTarget}
        onSave={handleEditSave}
        onCancel={() => setEditTarget(null)}
        saving={saving}
      />

      {/* ── Header ── */}
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Watchlist</Text>
          <TouchableOpacity
            style={[styles.addBtn, offline && { opacity: 0.4 }]}
            onPress={handleAddProduct}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <OfflineBanner />

      {/* ── Search + Sort row ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={Colors.textLight}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.sortBtn, isSortActive && styles.sortBtnActive]}
            onPress={() => setShowSortModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="swap-vertical-outline"
              size={20}
              color={isSortActive ? Colors.white : Colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Filter block: wraps both chip rows so they stack on web ── */}
      <View style={styles.filterBlock}>

        {/* ── Platform Filter Chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {PLATFORM_FILTERS.map(filter => {
            const isActive = activePlatform === filter.key;
            const count    = platformCounts[filter.key] ?? 0;
            if (filter.key !== 'all' && count === 0) return null;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: filter.color, borderColor: filter.color },
                ]}
                onPress={() => setActivePlatform(filter.key)}
                activeOpacity={0.75}
              >
                <Ionicons name={filter.icon} size={15} color={isActive ? Colors.white : filter.color} />
                <Text style={[styles.filterChipText, isActive && { color: Colors.white }]}>
                  {filter.label}
                </Text>
                <View style={[
                  styles.filterCountBadge,
                  { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : filter.color + '18' },
                ]}>
                  <Text style={[styles.filterCountText, { color: isActive ? Colors.white : filter.color }]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {isSortActive && (
            <TouchableOpacity
              style={styles.activeSortPill}
              onPress={() => setActiveSort('default')}
              activeOpacity={0.8}
            >
              <Ionicons name="funnel" size={13} color={Colors.accent} />
              <Text style={styles.activeSortPillText} numberOfLines={1}>{activeSortLabel}</Text>
              <Ionicons name="close-circle" size={15} color={Colors.accent} />
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ── Category Filter Chips ── */}
        {visibleCategories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterRow, { paddingTop: 2, paddingBottom: 8 }]}
          >
            {visibleCategories.map(cat => {
              const isActive = activeCategory === cat.key;
              const count    = cat.key === 'all' ? watchlist.length : (categoryCounts[cat.key] ?? 0);
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.filterChip,
                    styles.categoryChip,
                    isActive && styles.categoryChipActive,
                  ]}
                  onPress={() => setActiveCategory(cat.key)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={cat.icon} size={14} color={isActive ? Colors.white : Colors.accent} />
                  <Text style={[styles.filterChipText, styles.categoryChipText, isActive && { color: Colors.white }]}>
                    {cat.label}
                  </Text>
                  <View style={[
                    styles.filterCountBadge,
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : Colors.accent + '18' },
                  ]}>
                    <Text style={[styles.filterCountText, { color: isActive ? Colors.white : Colors.accent }]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

      </View>
      {/* ── End filter block ── */}

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <>
          {isFiltered && (
            <View style={styles.resultRow}>
              <Text style={styles.resultText}>
                {processedList.length} result{processedList.length !== 1 ? 's' : ''}
                {activePlatform !== 'all'
                  ? ` · ${PLATFORM_FILTERS.find(f => f.key === activePlatform)?.label}`
                  : ''}
                {activeCategory !== 'all'
                  ? ` · ${getCategoryMeta(activeCategory).label}`
                  : ''}
              </Text>
              <TouchableOpacity onPress={handleClearFilters}>
                <Text style={styles.clearFiltersText}>Clear all</Text>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={processedList}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
            renderItem={({ item }) => (
              <ProductCard
                item={item}
                onPress={() => {
                  if (offline) { Alert.alert('Offline', 'Product details require internet.'); return; }
                  navigation.navigate('ProductDetail', { item });
                }}
                onDelete={() => handleDeletePress(item)}
                onEdit={() => handleEditPress(item)}
              />
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons
                  name={
                    offline                  ? 'cloud-offline-outline' :
                    activeCategory !== 'all' ? 'grid-outline'          :
                    activePlatform !== 'all' || search ? 'search-outline' :
                    'bookmark-outline'
                  }
                  size={64}
                  color={Colors.border}
                />
                <Text style={styles.emptyTitle}>
                  {offline
                    ? 'No cached data'
                    : activeCategory !== 'all'
                    ? `No ${getCategoryMeta(activeCategory).label} products`
                    : activePlatform !== 'all'
                    ? `No ${PLATFORM_FILTERS.find(f => f.key === activePlatform)?.label} products`
                    : search
                    ? 'No results found'
                    : 'Your watchlist is empty'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {offline
                    ? 'Connect to the internet to load your watchlist.'
                    : activeCategory !== 'all'
                    ? `You haven't added any ${getCategoryMeta(activeCategory).label} products yet.`
                    : activePlatform !== 'all'
                    ? `You haven't added any ${PLATFORM_FILTERS.find(f => f.key === activePlatform)?.label} products yet.`
                    : search
                    ? 'Try a different search keyword.'
                    : 'Tap Add to start tracking products from Shopee or Lazada.'}
                </Text>
                {!search && !offline && activePlatform === 'all' && activeCategory === 'all' && (
                  <TouchableOpacity style={styles.emptyBtn} onPress={handleAddProduct}>
                    <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
                    <Text style={styles.emptyBtnText}>Add Product</Text>
                  </TouchableOpacity>
                )}
                {activeCategory !== 'all' && (
                  <TouchableOpacity
                    style={[styles.emptyBtn, { backgroundColor: Colors.border, marginTop: Spacing.lg }]}
                    onPress={() => setActiveCategory('all')}
                  >
                    <Text style={[styles.emptyBtnText, { color: Colors.textMuted }]}>Show All Categories</Text>
                  </TouchableOpacity>
                )}
                {activePlatform !== 'all' && (
                  <TouchableOpacity
                    style={[styles.emptyBtn, { backgroundColor: Colors.border, marginTop: Spacing.lg }]}
                    onPress={() => setActivePlatform('all')}
                  >
                    <Text style={[styles.emptyBtnText, { color: Colors.textMuted }]}>Show All Platforms</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />

          {watchlist.length > 0 && (
            <View style={styles.footer}>
              <Ionicons name="leaf-outline" size={14} color={Colors.success} />
              <Text style={styles.footerText}>
                Total Savings: <Text style={styles.footerSavings}>₱{totalSaved.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</Text>
                {'  '}|{'  '}
                <Text style={styles.footerCount}>{watchlist.length} Item{watchlist.length !== 1 ? 's' : ''} Tracked</Text>
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.bg },
  header:            { paddingTop: 52, paddingBottom: Spacing.md, paddingHorizontal: Spacing.lg },
  headerRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:       { color: Colors.white, fontSize: FontSize.xl, fontWeight: FontWeight.black },
  addBtn:            { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.success, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.lg, minWidth: 80, justifyContent: 'center' },
  addBtnText:        { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // Search + Sort
  searchWrapper:     { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  searchRow:         { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  searchBar:         { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, gap: Spacing.sm, height: 46, ...Shadow.sm },
  searchInput:       { flex: 1, paddingVertical: 11, fontSize: FontSize.sm, color: Colors.text },
  sortBtn:           { width: 46, height: 46, borderRadius: Radius.lg, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.primary + '50', ...Shadow.sm },
  sortBtnActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },

  // Filter block — key fix: forces vertical stacking on web
  filterBlock:       { flexDirection: 'column' },

  // Filter rows
  filterRow:         {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  filterChip:        {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  filterChipText:    {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
  },
  filterCountBadge:  {
    borderRadius: Radius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterCountText:   {
    fontSize: 11,
    fontWeight: FontWeight.black,
  },
  activeSortPill:    {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent + '12',
    borderWidth: 1.5,
    borderColor: Colors.accent + '40',
    maxWidth: 200,
  },
  activeSortPillText:{ fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.accent, flex: 1 },

  // Category chips (second row)
  categoryChip:      { borderColor: Colors.accent + '50' },
  categoryChipText:  { color: Colors.accent },
  categoryChipActive:{ backgroundColor: Colors.accent, borderColor: Colors.accent },

  // Category badge inside card
  categoryBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: Colors.accent + '15' },
  categoryBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.accent },

  // Result count row
  resultRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  resultText:        { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semiBold },
  clearFiltersText:  { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },

  // Product List
  listContent:       { paddingHorizontal: Spacing.lg, paddingBottom: 80, gap: Spacing.sm },
  card:              { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md, alignItems: 'flex-start' },
  imgBox:            { width: 56, height: 56, borderRadius: Radius.md, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  imgThumb:          { width: 56, height: 56, borderRadius: Radius.md },
  imgLabel:          { fontSize: 9, color: Colors.textLight, marginTop: 2 },
  cardInfo:          { flex: 1, gap: 4 },
  productName:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text, lineHeight: 18 },
  badgeRow:          { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  platformBadge:     { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  platformBadgeText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.black },
  stockBadge:        { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  stockBadgeText:    { fontSize: 10, fontWeight: FontWeight.bold },
  priceRow:          { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  currentPrice:      { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text },
  prevPrice:         { fontSize: FontSize.xs, color: Colors.textMuted, textDecorationLine: 'line-through' },
  dropBadge:         { backgroundColor: Colors.successLight, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 1 },
  dropText:          { fontSize: 10, color: Colors.success, fontWeight: FontWeight.black },
  targetRow:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  targetText:        { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semiBold },
  actionBtns:        { flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  editBtn:           { padding: 4 },
  deleteBtn:         { padding: 4 },

  // Empty State
  emptyState:        { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xxxl },
  emptyTitle:        { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginTop: Spacing.lg },
  emptySubtitle:     { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
  emptyBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xl, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 12, paddingHorizontal: Spacing.xxl },
  emptyBtnText:      { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.bold },

  // Footer
  footer:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.successLight, paddingVertical: 10, paddingHorizontal: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.success + '30' },
  footerText:        { fontSize: FontSize.xs, color: Colors.text },
  footerSavings:     { fontWeight: FontWeight.black, color: Colors.success },
  footerCount:       { fontWeight: FontWeight.semiBold, color: Colors.textMuted },
});

export default HomeScreen;