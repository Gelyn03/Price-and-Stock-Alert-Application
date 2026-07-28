// ============================================================
//  src/navigation/MainTabs.js
//  UPDATED:
//    - useSafeAreaInsets → tab labels never hidden behind home indicator
//    - Responsive label font size (no clipping on any screen size)
//    - Added PrivacyPolicyScreen to ProfileStack
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets }        from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator }     from '@react-navigation/stack';
import { Ionicons }                 from '@expo/vector-icons';

import DashboardScreen               from '../screens/DashboardScreen';
import HomeScreen                    from '../screens/HomeScreen';
import AddProductScreen              from '../screens/AddProductScreen';
import ProductDetailScreen           from '../screens/ProductDetailScreen';
import NotificationsScreen           from '../screens/NotificationsScreen';
import NotificationDetailScreen      from '../screens/NotificationDetailScreen';
import ProfileScreen                 from '../screens/ProfileScreen';
import EditProfileScreen             from '../screens/EditProfileScreen';
import AdminPanelScreen              from '../screens/admin/AdminPanelScreen';
import NotificationPreferencesScreen from '../screens/NotificationPreferencesScreen';
import ShareWatchlistScreen          from '../screens/ShareWatchlistScreen';
import PriceHistoryScreen            from '../screens/PriceHistoryScreen';
import PrivacyPolicyScreen           from '../screens/PrivacyPolicyScreen';

import { useAuth }                      from '../context/AuthContext';
import { Colors, FontSize, FontWeight } from '../constants/theme';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Badge ──────────────────────────────────────────────────────────────────────
const Badge = ({ count }) => {
  if (!count || count < 1) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

// ── Stacks ─────────────────────────────────────────────────────────────────────
const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardMain" component={DashboardScreen} />
  </Stack.Navigator>
);

const WatchlistStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home"          component={HomeScreen}          />
    <Stack.Screen name="AddProduct"    component={AddProductScreen}    />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    <Stack.Screen name="PriceHistory"  component={PriceHistoryScreen}  />
  </Stack.Navigator>
);

const NotificationsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="NotificationsList"  component={NotificationsScreen}      />
    <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain"             component={ProfileScreen}                />
    <Stack.Screen name="EditProfile"             component={EditProfileScreen}            />
    <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen}/>
    <Stack.Screen name="ShareWatchlist"          component={ShareWatchlistScreen}         />
    <Stack.Screen name="AdminPanel"              component={AdminPanelScreen}             />
    <Stack.Screen name="PrivacyPolicy"           component={PrivacyPolicyScreen}          />
  </Stack.Navigator>
);

// ── UserTabs ───────────────────────────────────────────────────────────────────
const UserTabs = ({ unreadCount = 0 }) => {
  const { width } = useWindowDimensions();
  const insets    = useSafeAreaInsets();

  // Smaller font + icon on narrow screens so labels never clip
  const isNarrow  = width < 380;
  const labelSize = isNarrow ? 9 : 10;
  const iconSize  = isNarrow ? 20 : 22;

  // bottomInset = safe area bottom (home indicator on iOS, gesture bar on Android).
  // Total tab bar height = fixed content area (54) + safe area below it.
  // This guarantees icons + labels always sit ABOVE the system UI.
  const bottomInset  = insets.bottom ?? 0;
  const tabBarHeight = 54 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,

        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor:  Colors.border,
          borderTopWidth:  1,
          // Dynamic height accounts for device-specific safe area
          height:          tabBarHeight,
          // paddingBottom lifts content above the home indicator / gesture bar
          paddingBottom:   bottomInset > 0 ? bottomInset : 8,
          paddingTop:      6,
          // Prevent any overflow clipping (important for mobile Chrome on web)
          overflow:        'hidden',
        },

        tabBarLabelStyle: {
          fontSize:      labelSize,
          fontWeight:    FontWeight.semiBold,
          // flexShrink lets the label compress instead of clipping
          flexShrink:    1,
          marginTop:     0,
          marginBottom:  0,
          letterSpacing: Platform.OS === 'web' ? 0 : undefined,
        },

        tabBarItemStyle: {
          // Equal space for all 4 tabs, no horizontal padding so labels have max room
          flex:              1,
          alignItems:        'center',
          justifyContent:    'center',
          paddingHorizontal: 0,
        },

        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if      (route.name === 'Dashboard')     iconName = focused ? 'home'          : 'home-outline';
          else if (route.name === 'Watchlist')     iconName = focused ? 'bookmark'      : 'bookmark-outline';
          else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'Profile')       iconName = focused ? 'person'        : 'person-outline';
          return (
            <View>
              <Ionicons name={iconName} size={iconSize} color={color} />
              {route.name === 'Notifications' && <Badge count={unreadCount} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard"     component={DashboardStack}     options={{ tabBarLabel: 'Home'      }} />
      <Tab.Screen name="Watchlist"     component={WatchlistStack}     options={{ tabBarLabel: 'Watchlist' }} />
      <Tab.Screen name="Notifications" component={NotificationsStack} options={{ tabBarLabel: 'Alerts'    }} />
      <Tab.Screen name="Profile"       component={ProfileStack}       options={{ tabBarLabel: 'Profile'   }} />
    </Tab.Navigator>
  );
};

// ── Admin Stack ────────────────────────────────────────────────────────────────
const AdminStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
  </Stack.Navigator>
);

// ── MainTabs (root export) ─────────────────────────────────────────────────────
const MainTabs = ({ unreadCount = 0 }) => {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';
  return isAdmin ? <AdminStack /> : <UserTabs unreadCount={unreadCount} />;
};

const styles = StyleSheet.create({
  badge:     { position: 'absolute', top: -4, right: -8, backgroundColor: Colors.danger, borderRadius: 9999, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.white, paddingHorizontal: 2 },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold },
});

export default MainTabs;