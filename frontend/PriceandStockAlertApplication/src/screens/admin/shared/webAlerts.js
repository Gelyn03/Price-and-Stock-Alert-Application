// shared/webAlerts.js
import { Alert, Platform } from 'react-native';

// Module-level references — set by AdminPanelScreen on mount
export let _showAlert   = null;
export let _showConfirm = null;

export const setAlertHandler   = (fn) => { _showAlert   = fn; };
export const setConfirmHandler = (fn) => { _showConfirm = fn; };
export const clearHandlers     = ()   => { _showAlert = null; _showConfirm = null; };

export const webAlert = (title, message) => {
  if (_showAlert) _showAlert(title, message);
  else if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

export const webConfirm = (title, message, onConfirm, confirmText = 'Confirm') => {
  if (_showConfirm) _showConfirm(title, message, onConfirm, confirmText);
  else if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${message}`)) onConfirm(); }
  else Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
};