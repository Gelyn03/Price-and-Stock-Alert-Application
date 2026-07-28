// src/navigation/AdminMainStack.js
// Stack navigator shown AFTER an admin successfully logs in.
// Wraps AdminPanelScreen (and any future admin screens like detail pages).
// Only rendered on web (admin panel is web-only).

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminPanelScreen          from '../screens/admin/AdminPanelScreen';

const Stack = createStackNavigator();

const AdminMainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen
      name="AdminPanel"
      component={AdminPanelScreen}
    />
    {/* Add more admin screens here in the future, e.g.: */}
    {/* <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} /> */}
  </Stack.Navigator>
);

export default AdminMainStack;