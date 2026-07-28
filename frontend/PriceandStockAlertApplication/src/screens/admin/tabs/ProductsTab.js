// tabs/ProductsTab.js
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  RefreshControl, Platform, Dimensions, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THead, Badge } from '../shared/components';
import { webAlert, webConfirm } from '../shared/webAlerts';
import ValidateUrlModal from '../modals/ValidateUrlModal';
import apiClient from '../../../api/client';
import { toPhDateTime } from '../../../utils/formatTime';

const SORT_OPTIONS = [
  { key: 'name',     label: 'Product Name', asc: 'A→Z',        desc: 'Z→A'           },
  { key: 'price',    label: 'Price',        asc: 'Low→High',   desc: 'High→Low'      },
  { key: 'platform', label: 'Platform',     asc: 'A→Z',        desc: 'Z→A'           },
  { key: 'status',   label: 'Status',       asc: 'Valid first', desc: 'Invalid first' },
];

const PAGE_SIZE = 20;

// ── Summary Card ──────────────────────────────────────────────────────────────
const SummaryCard = ({ icon, label, value, color, C }) => (
  <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', gap: 4, minWidth: 70 }}>
    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: color + '20', justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={icon} size={15} color={color} />
    </View>
    <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>{value}</Text>
    <Text style={{ fontSize: 9, color: C.textMuted, textAlign: 'center', fontWeight: '600' }}>{label}</Text>
  </View>
);

// ── Product Detail Modal ──────────────────────────────────────────────────────
const DetailModal = ({ visible, product, onClose, C }) => {
  if (!product) return null;
  const isShopee = product.platform?.toLowerCase() === 'shopee';
  const isValid  = product.is_valid !== false;
  const color    = isShopee ? '#EE4D2D' : '#0F146D';

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 }}>
    <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 24, gap: 16, maxHeight: '85%', width: '100%', maxWidth: 480 }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: color + '20', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="cube-outline" size={20} color={color} />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: C.text }}>Product Details</Text>
                <Badge label={product.platform?.toUpperCase()} color={color} bg={color + '20'} />
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ gap: 12 }}>

              {/* Product name */}
              <View style={{ backgroundColor: C.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.cardBorder }}>
                <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '700', marginBottom: 4 }}>PRODUCT NAME</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 20 }}>{product.name}</Text>
              </View>

              {/* Price + Status row */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: C.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '700', marginBottom: 4 }}>CURRENT PRICE</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: C.primary }}>
                    ₱{parseFloat(product.current_price || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: isValid ? C.success + '10' : C.danger + '10', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: isValid ? C.success + '30' : C.danger + '30', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '700', marginBottom: 4 }}>STATUS</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isValid ? C.success : C.danger }} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isValid ? C.success : C.danger }}>
                      {isValid ? 'Valid' : 'Invalid'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Target price if available */}
              {product.target_price && (
                <View style={{ backgroundColor: C.accent + '10', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.accent + '30', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="flag-outline" size={16} color={C.accent} />
                    <Text style={{ fontSize: 12, color: C.textMuted }}>Target Price</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: C.accent }}>
                    ₱{parseFloat(product.target_price).toLocaleString()}
                  </Text>
                </View>
              )}

              {/* Stock status */}
              {product.stock_status && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: C.textMuted, width: 90 }}>Stock Status</Text>
                  <Badge
                    label={product.stock_status?.replace(/_/g, ' ').toUpperCase()}
                    color={product.stock_status === 'in_stock' ? C.success : C.danger}
                    bg={product.stock_status === 'in_stock' ? C.success + '20' : C.danger + '20'}
                  />
                </View>
              )}

              {/* Added date */}
              {product.created_at && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: C.textMuted, width: 90 }}>Added</Text>
                  <Text style={{ fontSize: 12, color: C.text }}>{product.created_at?.slice(0, 10)}</Text>
                </View>
              )}

              {/* Last checked */}
              {product.last_checked_at && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: C.textMuted, width: 90 }}>Last Checked</Text>
                  <Text style={{ fontSize: 12, color: C.text }}>{toPhDateTime(product.last_checked_at)}</Text>
                </View>
              )}

              {/* Product URL */}
              {product.url && (
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '700' }}>PRODUCT URL</Text>
                  <View style={{ backgroundColor: C.background, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: C.cardBorder }}>
                    <Text style={{ fontSize: 10, color: C.primary }} numberOfLines={3}>{product.url}</Text>
                  </View>
                </View>
              )}

            </View>
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={{ backgroundColor: C.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ProductsTab = ({ products, setProducts, refreshing, onRefresh, onDelete, C }) => {
  const [search,         setSearch]         = useState('');
  const [filter,         setFilter]         = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sortKey,        setSortKey]        = useState('name');
  const [sortDir,        setSortDir]        = useState('asc');
  const [showSortMenu,   setShowSortMenu]   = useState(false);
  const [page,           setPage]           = useState(1);

  // Price range filter
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  // Validate modal
  const [validateProduct, setValidateProduct] = useState(null);
  const [validateModal,   setValidateModal]   = useState(false);

  // Detail modal
  const [detailProduct, setDetailProduct] = useState(null);

  // Bulk select
  const [bulkMode,    setBulkMode]    = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summaryStats = useMemo(() => ({
    total:   products.length,
    valid:   products.filter(p => p.is_valid !== false).length,
    invalid: products.filter(p => p.is_valid === false).length,
    shopee:  products.filter(p => p.platform?.toLowerCase() === 'shopee').length,
    lazada:  products.filter(p => p.platform?.toLowerCase() === 'lazada').length,
  }), [products]);

  // ── Filtered + sorted products ────────────────────────────────────────────
  const filtered = useMemo(() => {
    return [...products]
      .filter(p => {
        const matchS = p.name?.toLowerCase().includes(search.toLowerCase());
        const matchF =
          filter === 'all'     ? true :
          filter === 'valid'   ? p.is_valid !== false :
                                 p.is_valid === false;
        const itemPlatform = p.platform ? String(p.platform).toLowerCase() : '';
        const matchP = platformFilter === 'all' ? true : itemPlatform === platformFilter.toLowerCase();

        // Price range filter
        const price = parseFloat(p.current_price || 0);
        const matchMin = minPrice === '' || price >= parseFloat(minPrice);
        const matchMax = maxPrice === '' || price <= parseFloat(maxPrice);

        return matchS && matchF && matchP && matchMin && matchMax;
      })
      .sort((a, b) => {
        let valA, valB;
        if (sortKey === 'name')     { valA = a.name?.toLowerCase() ?? '';      valB = b.name?.toLowerCase() ?? '';      }
        if (sortKey === 'price')    { valA = parseFloat(a.current_price || 0); valB = parseFloat(b.current_price || 0); }
        if (sortKey === 'platform') { valA = a.platform?.toLowerCase() ?? '';  valB = b.platform?.toLowerCase() ?? '';  }
        if (sortKey === 'status')   { valA = a.is_valid === false ? 1 : 0;     valB = b.is_valid === false ? 1 : 0;     }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ?  1 : -1;
        return 0;
      });
  }, [products, search, filter, platformFilter, sortKey, sortDir, minPrice, maxPrice]);

  const paginated  = filtered.slice(0, page * PAGE_SIZE);
  const hasMore    = paginated.length < filtered.length;
  const invalidCount = summaryStats.invalid;

  // ── Bulk helpers ──────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll    = () => setSelectedIds(new Set(paginated.map(p => p.id)));
  const clearBulk    = () => { setSelectedIds(new Set()); setBulkMode(false); };

  const bulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      if (action === 'delete') {
        webConfirm('Delete Selected', `Delete ${ids.length} product${ids.length !== 1 ? 's' : ''}? This cannot be undone.`, async () => {
          await apiClient.delete('/admin/products/bulk', { data: { ids } });
          setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
          clearBulk();
        }, 'Delete');
      } else if (action === 'flag') {
        await apiClient.post('/admin/products/bulk-flag', { ids });
        setProducts(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, is_valid: false } : p));
        clearBulk();
      } else if (action === 'restore') {
        await apiClient.post('/admin/products/bulk-restore', { ids });
        setProducts(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, is_valid: true } : p));
        clearBulk();
      }
    } catch {
      webAlert('Error', `Failed to ${action} products.`);
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Single actions ────────────────────────────────────────────────────────
  const handleFlag = (p) => webConfirm('Flag as Invalid', `Flag "${p.name}" as invalid?`, async () => {
    try {
      await apiClient.patch(`/admin/products/${p.id}/flag`);
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_valid: false } : x));
    } catch { webAlert('Error', 'Failed to flag.'); }
  }, 'Flag Invalid');

  const handleRestore = (p) => webConfirm('Restore Product', `Restore "${p.name}"?`, async () => {
    try {
      await apiClient.patch(`/admin/products/${p.id}/restore`);
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_valid: true } : x));
    } catch { webAlert('Error', 'Failed to restore.'); }
  }, 'Restore');

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Platform', 'Price', 'Status', 'Stock Status', 'Added'];
    const rows = filtered.map(p => [
      p.id,
      (p.name || '').replace(/,/g, ' '),
      p.platform || '',
      parseFloat(p.current_price || 0).toFixed(2),
      p.is_valid !== false ? 'Valid' : 'Invalid',
      p.stock_status || '',
      p.created_at?.slice(0, 10) || '',
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const activeSortOption = SORT_OPTIONS.find(o => o.key === sortKey);
  const sortLabel = `${activeSortOption?.label} ${sortDir === 'asc' ? '↑' : '↓'}`;
  const isPriceActive = minPrice !== '' || maxPrice !== '';

  const isWeb     = Platform.OS === 'web';
  const winHeight = Dimensions.get('window').height;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ── Detail Modal ── */}
      <DetailModal
        visible={!!detailProduct}
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        C={C}
      />

      {/* ── Summary Cards ── */}
      <View style={{ flexDirection: 'row', gap: 8, padding: 10, paddingBottom: 0 }}>
        <SummaryCard icon="cube-outline"          label="Total"   value={summaryStats.total}   color={C.primary}  C={C} />
        <SummaryCard icon="checkmark-circle-outline" label="Valid" value={summaryStats.valid}  color={C.success}  C={C} />
        <SummaryCard icon="close-circle-outline"  label="Invalid" value={summaryStats.invalid} color={C.danger}   C={C} />
        <SummaryCard icon="storefront-outline"    label="Shopee"  value={summaryStats.shopee}  color="#EE4D2D"    C={C} />
        <SummaryCard icon="bag-outline"           label="Lazada"  value={summaryStats.lazada}  color="#0F146D"    C={C} />
      </View>

      {/* ── Filters Section ── */}
      <View style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: C.divider, gap: 10 }}>

        {/* Row 1: Search + Valid/Invalid pills */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 8, paddingHorizontal: 10, gap: 6, height: 34, borderWidth: 1, borderColor: C.cardBorder }}>
            <Ionicons name="search-outline" size={14} color={C.textLight} />
            <TextInput
              style={{ flex: 1, fontSize: 12, color: C.text, paddingVertical: 0, outlineStyle: 'none' }}
              placeholder="Search products..."
              placeholderTextColor={C.textLight}
              value={search}
              onChangeText={t => { setSearch(t); setPage(1); }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(''); setPage(1); }}>
                <Ionicons name="close-circle" size={15} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {['all', 'valid', 'invalid'].map(f => (
              <TouchableOpacity key={f} style={{ backgroundColor: filter === f ? C.primary : C.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: filter === f ? C.primary : C.cardBorder }} onPress={() => { setFilter(f); setPage(1); }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: filter === f ? C.white : C.textMuted }}>{f.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Row 2: Platform + Sort + Price filter + Export + Bulk */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {['all', 'shopee', 'lazada'].map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => { setPlatformFilter(p); setPage(1); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: platformFilter === p ? (p === 'shopee' ? '#EE4D2D' : p === 'lazada' ? '#0F146D' : C.primary) : C.cardBorder, backgroundColor: platformFilter === p ? (p === 'shopee' ? '#EE4D2D15' : p === 'lazada' ? '#0F146D15' : C.primary + '15') : 'transparent' }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p === 'shopee' ? '#EE4D2D' : p === 'lazada' ? '#0F146D' : C.textLight }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: platformFilter === p ? C.text : C.textLight }}>{p.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}

          {/* Sort */}
          <View style={{ position: 'relative' }}>
            <TouchableOpacity onPress={() => { setShowSortMenu(v => !v); setShowPriceFilter(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: showSortMenu ? C.primary + '20' : C.card, borderWidth: 1, borderColor: showSortMenu ? C.primary : C.cardBorder }}>
              <Ionicons name="swap-vertical-outline" size={13} color={showSortMenu ? C.primary : C.textMuted} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: showSortMenu ? C.primary : C.textMuted }}>{sortLabel}</Text>
              <Ionicons name={showSortMenu ? 'chevron-up-outline' : 'chevron-down-outline'} size={11} color={showSortMenu ? C.primary : C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Price filter */}
          <TouchableOpacity onPress={() => { setShowPriceFilter(v => !v); setShowSortMenu(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: isPriceActive ? C.accent + '20' : C.card, borderWidth: 1, borderColor: isPriceActive ? C.accent : C.cardBorder }}>
            <Ionicons name="pricetag-outline" size={13} color={isPriceActive ? C.accent : C.textMuted} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: isPriceActive ? C.accent : C.textMuted }}>Price</Text>
          </TouchableOpacity>

          {/* Export CSV */}
          <TouchableOpacity onPress={exportCSV} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder }}>
            <Ionicons name="download-outline" size={13} color={C.textMuted} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted }}>CSV</Text>
          </TouchableOpacity>

          {/* Bulk select toggle */}
          <TouchableOpacity onPress={() => { setBulkMode(v => !v); setSelectedIds(new Set()); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: bulkMode ? C.primary + '20' : C.card, borderWidth: 1, borderColor: bulkMode ? C.primary : C.cardBorder }}>
            <Ionicons name="checkbox-outline" size={13} color={bulkMode ? C.primary : C.textMuted} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: bulkMode ? C.primary : C.textMuted }}>Select</Text>
          </TouchableOpacity>
        </View>

        {/* Sort dropdown */}
        {showSortMenu && (
          <View style={{ backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder, padding: 6, gap: 2 }}>
            <Text style={{ fontSize: 10, color: C.textLight, fontWeight: '700', paddingHorizontal: 8, paddingBottom: 4 }}>SORT BY</Text>
            {SORT_OPTIONS.map(opt => (
              <View key={opt.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: sortKey === opt.key ? C.primary + '12' : 'transparent' }}>
                <Text style={{ fontSize: 12, fontWeight: sortKey === opt.key ? '700' : '400', color: sortKey === opt.key ? C.primary : C.text }}>{opt.label}</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {['asc', 'desc'].map(dir => (
                    <TouchableOpacity key={dir} onPress={() => { setSortKey(opt.key); setSortDir(dir); setShowSortMenu(false); }} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: sortKey === opt.key && sortDir === dir ? C.primary : C.cardBorder }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: sortKey === opt.key && sortDir === dir ? '#fff' : C.textMuted }}>{dir === 'asc' ? opt.asc : opt.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Price range inputs */}
        {showPriceFilter && (
          <View style={{ backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder, padding: 12, gap: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>Filter by Price Range</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, fontWeight: '600' }}>MIN PRICE (₱)</Text>
                <TextInput value={minPrice} onChangeText={t => { setMinPrice(t); setPage(1); }} placeholder="0" placeholderTextColor={C.textLight} keyboardType="numeric" style={{ backgroundColor: C.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: C.text, borderWidth: 1, borderColor: C.cardBorder }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, fontWeight: '600' }}>MAX PRICE (₱)</Text>
                <TextInput value={maxPrice} onChangeText={t => { setMaxPrice(t); setPage(1); }} placeholder="No limit" placeholderTextColor={C.textLight} keyboardType="numeric" style={{ backgroundColor: C.background, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: C.text, borderWidth: 1, borderColor: C.cardBorder }} />
              </View>
            </View>
            {isPriceActive && (
              <TouchableOpacity onPress={() => { setMinPrice(''); setMaxPrice(''); setPage(1); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}>
                <Ionicons name="close-circle-outline" size={14} color={C.danger} />
                <Text style={{ fontSize: 11, color: C.danger, fontWeight: '600' }}>Clear price filter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── Invalid warning banner ── */}
      {invalidCount > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.danger + '15', padding: 10, borderLeftWidth: 3, borderLeftColor: C.danger }}>
          <Ionicons name="alert-circle" size={14} color={C.danger} />
          <Text style={{ fontSize: 11, color: C.danger, flex: 1, fontWeight: '600' }}>{invalidCount} Invalid Product{invalidCount > 1 ? 's' : ''} paused</Text>
          <TouchableOpacity onPress={() => { setFilter('invalid'); setPage(1); }}>
            <Text style={{ fontSize: 11, color: C.danger, fontWeight: '700', textDecorationLine: 'underline' }}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bulk action bar ── */}
      {bulkMode && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primary + '10', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.primary + '30' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={selectAll}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>Select All ({paginated.length})</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11, color: C.textMuted }}>{selectedIds.size} selected</Text>
          </View>
          {selectedIds.size > 0 && (
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {bulkLoading
                ? <ActivityIndicator size="small" color={C.primary} />
                : <>
                    <TouchableOpacity onPress={() => bulkAction('restore')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: C.success, borderRadius: 7 }}>
                      <Ionicons name="refresh-outline" size={12} color="#fff" />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Restore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => bulkAction('flag')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: C.warning, borderRadius: 7 }}>
                      <Ionicons name="flag-outline" size={12} color="#fff" />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Flag</Text>
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
      <View style={{ ...(isWeb ? { height: winHeight - 106 - 160, margin: 10 } : { flex: 1, margin: 10 }), backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden' }}>
        <THead C={C} cols={[
          ...(bulkMode ? [{ label: '', flex: 0.5 }] : []),
          { label: 'PRODUCT',  flex: 3   },
          { label: 'PLATFORM', flex: 1.5, align: 'center' },
          { label: 'PRICE',    flex: 1.5, align: 'center' },
          { label: 'STATUS',   flex: 1.5, align: 'center' },
          { label: 'ACTIONS',  flex: 2.5, align: 'center' },
        ]} />

        <FlatList
          data={paginated}
          keyExtractor={item => String(item.id)}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          nestedScrollEnabled={true}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          renderItem={({ item, index }) => {
            const isShopee   = item.platform?.toLowerCase() === 'shopee';
            const isValid    = item.is_valid !== false;
            const isSelected = selectedIds.has(item.id);
            return (
              <TouchableOpacity
                activeOpacity={bulkMode ? 0.7 : 1}
                onPress={() => { if (bulkMode) toggleSelect(item.id); }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.rowBorder, backgroundColor: isSelected ? C.primary + '10' : index % 2 === 1 ? C.tableRowAlt : 'transparent', opacity: isValid ? 1 : 0.75 }}
              >
                {/* Checkbox */}
                {bulkMode && (
                  <View style={{ flex: 0.5, alignItems: 'center' }}>
                    <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: isSelected ? C.primary : C.cardBorder, backgroundColor: isSelected ? C.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                      {isSelected && <Ionicons name="checkmark" size={11} color="#fff" />}
                    </View>
                  </View>
                )}

                {/* Product name */}
                <TouchableOpacity style={{ flex: 3 }} onPress={() => { if (!bulkMode) setDetailProduct(item); }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }} numberOfLines={1}>{item.name}</Text>
                  <Text style={{ fontSize: 9, color: C.textLight, marginTop: 1 }}>Tap to view details</Text>
                </TouchableOpacity>

                {/* Platform */}
                <View style={{ flex: 1.5, alignItems: 'center' }}>
                  <Badge label={item.platform?.toUpperCase()} color={isShopee ? '#EE4D2D' : '#0F146D'} bg={isShopee ? '#EE4D2D20' : '#0F146D20'} />
                </View>

                {/* Price */}
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: C.primary, textAlign: 'center' }}>
                  ₱{parseFloat(item.current_price || 0).toLocaleString()}
                </Text>

                {/* Status */}
                <View style={{ flex: 1.5, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: isValid ? C.success + '20' : C.danger + '20' }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isValid ? C.success : C.danger }} />
                    <Text style={{ fontSize: 9, fontWeight: '800', color: isValid ? C.success : C.danger }}>{isValid ? 'Valid' : 'Invalid'}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {/* View details */}
                  <TouchableOpacity onPress={() => setDetailProduct(item)} style={{ width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: C.primary + '18' }}>
                    <Ionicons name="eye-outline" size={13} color={C.primary} />
                  </TouchableOpacity>
                  {/* Validate URL */}
                  <TouchableOpacity onPress={() => { setValidateProduct(item); setValidateModal(true); }} style={{ width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: C.accent + '18' }}>
                    <Ionicons name="link-outline" size={13} color={C.accent} />
                  </TouchableOpacity>
                  {/* Flag / Restore */}
                  {isValid
                    ? <TouchableOpacity onPress={() => handleFlag(item)} style={{ width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: C.danger + '18' }}>
                        <Ionicons name="flag-outline" size={13} color={C.danger} />
                      </TouchableOpacity>
                    : <TouchableOpacity onPress={() => handleRestore(item)} style={{ width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: C.success + '18' }}>
                        <Ionicons name="refresh-outline" size={13} color={C.success} />
                      </TouchableOpacity>
                  }
                  {/* Delete */}
                  <TouchableOpacity onPress={() => onDelete(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.danger + '18', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Ionicons name="trash-outline" size={13} color={C.danger} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: C.danger }}>Del</Text>
                  </TouchableOpacity>
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
                  <Text style={{ fontSize: 11, color: C.textLight }}>— All {filtered.length} products loaded —</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40, gap: 10 }}>
              <Ionicons name="cube-outline" size={36} color={C.textLight} />
              <Text style={{ color: C.textLight, fontSize: 13 }}>No products found</Text>
            </View>
          }
        />
      </View>

      <ValidateUrlModal
        visible={validateModal}
        product={validateProduct}
        onClose={() => { setValidateModal(false); setValidateProduct(null); }}
        onValidated={(p) => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_valid: true } : x))}
        C={C}
      />
    </View>
  );
};

export default ProductsTab;