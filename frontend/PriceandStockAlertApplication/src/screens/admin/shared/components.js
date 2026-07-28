// shared/components.js
import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { SIDEBAR_W } from './constants';

const { width: SW } = Dimensions.get('window');

export const Badge = ({ label, color, bg }) => (
  <View style={{ borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: bg }}>
    <Text style={{ fontSize: 9, fontWeight: '800', color }}>{label}</Text>
  </View>
);

export const SectionTitle = ({ title, count, C }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 12 }}>
    <Text style={{ fontSize: 13, fontWeight: '800', color: C.text }}>{title}</Text>
    {count != null && (
      <View style={{ backgroundColor: C.primary + '20', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
        <Text style={{ fontSize: 10, color: C.primary, fontWeight: '700' }}>{count}</Text>
      </View>
    )}
  </View>
);

// ── StatCard ────────────────────────────────────────────────────────────────
// FIXED: Removed hardcoded width `(SW - SIDEBAR_W - 32) / 2 - 4`.
// That pixel calculation broke on zoom and wide screens because SW is captured
// once at startup and never updates. Now the card is `width: '100%'` so it
// fills whatever parent wrapper controls the column layout — making it fully
// responsive to zoom, window resize, and any screen size.
export const StatCard = ({ icon, label, value, color, sub, C }) => {
  const { Ionicons } = require('@expo/vector-icons');
  return (
    <View style={{
      width: '100%',          // fills the parent column — no hardcoded pixels
      backgroundColor: C.card,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: C.cardBorder,
      borderLeftWidth: 3,
      borderLeftColor: color,
      minHeight: 90,          // prevents card from collapsing when value is short
    }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        flexWrap: 'nowrap',   // keep icon and number on the same row always
      }}>
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: color + '18',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,      // icon box never shrinks even on small cards
        }}>
          <Ionicons name={icon} size={16} color={color} />
        </View>

        {/* Value — uses flexShrink:0 so the number is never clipped or hidden */}
        <Text
          style={{
            fontSize: 22,
            fontWeight: '900',
            color,
            flexShrink: 0,
            marginLeft: 8,
          }}
          numberOfLines={1}
        >
          {value ?? '—'}
        </Text>
      </View>

      {/* Label and sub-text — allowed to wrap freely */}
      <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '600', flexWrap: 'wrap' }}>
        {label}
      </Text>
      {sub ? (
        <Text style={{ color: C.textLight, fontSize: 10, marginTop: 2, flexWrap: 'wrap' }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
};

export const THead = ({ cols, C }) => (
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: C.tableHead,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  }}>
    {cols.map(({ label, flex, align }, i) => (
      <Text
        key={i}
        style={{
          flex,
          fontSize: 9,
          fontWeight: '800',
          color: C.textLight,
          letterSpacing: 0.8,
          textAlign: align || 'left',
        }}
      >
        {label}
      </Text>
    ))}
  </View>
);

// Modal style factory — used across multiple modals
export const MS = (C) => ({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card:      { backgroundColor: C.card, borderRadius: 14, width: '100%', maxWidth: 380, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden' },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title:     { color: C.text, fontSize: 14, fontWeight: '800' },
  sub:       { color: C.textMuted, fontSize: 11, marginTop: 2 },
  closeBtn:  { width: 30, height: 30, borderRadius: 15, backgroundColor: C.inputBg, justifyContent: 'center', alignItems: 'center' },
  footerBtn: { margin: 16, backgroundColor: C.inputBg, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
});