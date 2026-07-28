// src/navigation/AppNavigator.js
// FIX: Removed initialRouteName prop from Root.Navigator.
//      It was crashing because 'AdminAuth' is only rendered when
//      unauthenticated, so React Navigation couldn't find it when
//      the user is already logged in.
//      The URL-based linking config + redirectToAdminIfNeeded()
//      already handles routing to /admin on localhost — no need
//      for initialRouteName at all.

import React, { useEffect } from 'react';
import {
  View, ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { NavigationContainer }  from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth }              from '../context/AuthContext';
import AuthStack                from './AuthStack';
import AdminAuthStack           from './AdminAuthStack';
import AdminMainStack           from './AdminMainStack';
import MainTabs                 from './MainTabs';
import SharedWatchlistScreen    from '../screens/SharedWatchlistScreen';
import ForgotPasswordScreen     from '../screens/ForgotPasswordScreen';
import { Colors }               from '../constants/theme';

const Root = createStackNavigator();

// ── Detect if we are running on localhost (admin-only machine) ────────────────
const isLocalhost = () => {
  if (Platform.OS !== 'web') return false;
  try {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
};

// ── Redirect to /admin if on localhost and path is '/' or empty ───────────────
const redirectToAdminIfNeeded = () => {
  if (Platform.OS !== 'web') return;
  try {
    const path = window.location.pathname;
    if (isLocalhost() && (path === '/' || path === '')) {
      window.history.replaceState({}, '', '/admin');
    }
  } catch {}
};

const linking = {
  prefixes: [
    'https://web.priceandstockalert.online',
    'http://web.priceandstockalert.online',
    'priceandstockalert://',
  ],
  config: {
    screens: {
      SharedWatchlist: 'share/:token',
      ForgotPassword:  'forgot-password',
      Auth: {
        path: 'login',
        screens: {},
      },
      ...(Platform.OS === 'web'
        ? {
            AdminAuth: {
              path: 'admin',
              screens: {},
            },
            AdminMain: {
              path: 'admin/panel',
              screens: {},
            },
          }
        : {}),
      Main: {
        screens: {},
      },
    },
  },
};

// ── Check if URL has ?logout=1 param (web only) ───────────────────────────────
const shouldForceLogout = () => {
  if (Platform.OS !== 'web') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('logout') === '1';
  } catch {
    return false;
  }
};

// ── Remove ?logout=1 from URL without page reload ─────────────────────────────
const cleanLogoutParam = () => {
  if (Platform.OS !== 'web') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('logout');
    window.history.replaceState({}, '', url.toString());
  } catch {}
};

// ─────────────────────────────────────────────────────────────────────────────
// AppNavigator
// ─────────────────────────────────────────────────────────────────────────────
const AppNavigator = () => {
  const { isAuthenticated, isLoading, user, unreadCount, logout } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // Redirect localhost:8081 → localhost:8081/admin automatically
    redirectToAdminIfNeeded();
    // Force logout if ?logout=1 is in the URL
    if (shouldForceLogout()) {
      cleanLogoutParam();
      logout();
    }
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isAdmin = isAuthenticated && user?.role === 'admin';

  return (
    <NavigationContainer linking={linking}>
      {/*
        FIX: NO initialRouteName here.
        - The linking config maps /admin → AdminAuth and /login → Auth
        - redirectToAdminIfNeeded() rewrites the URL to /admin on localhost
        - React Navigation reads the URL and picks the correct screen
        - Adding initialRouteName caused a crash because 'AdminAuth' only
          exists in the unauthenticated branch, so it's not always available
      */}
      <Root.Navigator screenOptions={{ headerShown: false }}>

        {isAuthenticated ? (
          isAdmin ? (
            // ── Admin logged in → Admin Panel ─────────────────────────────
            <Root.Screen name="AdminMain" component={AdminMainStack} />
          ) : (
            // ── User logged in → Main App ─────────────────────────────────
            <Root.Screen name="Main">
              {() => <MainTabs unreadCount={unreadCount} />}
            </Root.Screen>
          )
        ) : (
          // ── Not authenticated → show correct login screen ─────────────────
          // The linking config + redirectToAdminIfNeeded() ensures:
          //   localhost:8081       → /admin → AdminAuth ✅
          //   localhost:8081/admin → /admin → AdminAuth ✅
          //   web.priceandstockalert.online/login/Login → Auth ✅
          <>
            <Root.Screen name="Auth"      component={AuthStack}      />
            {Platform.OS === 'web' && (
              <Root.Screen name="AdminAuth" component={AdminAuthStack} />
            )}
          </>
        )}

        <Root.Screen name="SharedWatchlist" component={SharedWatchlistScreen} />
        <Root.Screen name="ForgotPassword"  component={ForgotPasswordScreen}  />

      </Root.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
});

export default AppNavigator;