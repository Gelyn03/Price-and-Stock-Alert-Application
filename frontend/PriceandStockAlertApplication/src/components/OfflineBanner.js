// ============================================================
//  src/components/OfflineBanner.js
//  Offline Status Banner
//  Price and Stock Alert Application
// ============================================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { Colors, FontSize, FontWeight, Spacing } from '../constants/theme';

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(false);
  const slideAnim = new Animated.Value(-50);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected || state.isInternetReachable === false;
      setIsOffline(offline);
      Animated.timing(slideAnim, {
        toValue: offline ? 0 : -50,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <Ionicons name="cloud-offline-outline" size={16} color={Colors.white} />
      <Text style={styles.text}>You are offline — showing cached data</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#64748B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    gap: 6,
  },
  text: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
  },
});

export default OfflineBanner;