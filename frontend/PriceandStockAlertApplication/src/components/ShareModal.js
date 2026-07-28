// src/components/ShareModal.js

import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { Ionicons }  from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors, FontSize, FontWeight, Spacing, Radius, Shadow } from '../constants/theme';

const ShareModal = ({ visible, link, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback — do nothing
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          <View style={styles.iconBox}>
            <Ionicons name="share-social" size={36} color={Colors.accent} />
          </View>

          <Text style={styles.title}>Watchlist Share Link</Text>
          <Text style={styles.sub}>
            Share this link so others can view your watchlist:
          </Text>

          {/* Link display */}
          <View style={styles.linkBox}>
            <Ionicons name="link-outline" size={14} color={Colors.primary} />
            <Text style={styles.linkText} numberOfLines={3} selectable>
              {link}
            </Text>
          </View>

          {/* Copy Link Button */}
          <TouchableOpacity
            style={[styles.copyBtn, copied && styles.copyBtnDone]}
            onPress={handleCopy}
            activeOpacity={0.8}
          >
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={16}
              color={copied ? Colors.white : Colors.primary}
            />
            <Text style={[styles.copyBtnText, copied && styles.copyBtnTextDone]}>
              {copied ? 'Copied to Clipboard!' : 'Copy Link'}
            </Text>
          </TouchableOpacity>

          {/* Done button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card:            { backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.xxl, alignItems: 'center', width: '100%', maxWidth: 340, gap: 12, ...Shadow.lg },
  iconBox:         { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.accent + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title:           { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.text, textAlign: 'center' },
  sub:             { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  linkBox:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primary + '08', borderRadius: Radius.md, padding: Spacing.md, width: '100%', borderWidth: 1, borderColor: Colors.primary + '30' },
  linkText:        { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 18 },
  copyBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 12, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.white },
  copyBtnDone:     { backgroundColor: Colors.success, borderColor: Colors.success },
  copyBtnText:     { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  copyBtnTextDone: { color: Colors.white },
  doneBtn:         { backgroundColor: Colors.accent, borderRadius: Radius.lg, paddingVertical: 14, width: '100%', alignItems: 'center' },
  doneBtnText:     { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.bold },
});

export default ShareModal;