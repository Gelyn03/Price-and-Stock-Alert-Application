// src/navigation/AdminAuthStack.js
// Web-only admin authentication stack.
// Only rendered when Platform.OS === 'web' and the user is not yet authenticated.
//
// You can point AdminLoginScreen to a separate screen with an admin-specific UI,
// or reuse LoginScreen and pass an isAdmin prop — whichever fits your backend.

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminLoginScreen          from '../screens/admin/AdminLoginScreen'; // create this if it doesn't exist
// If you don't have a separate AdminLoginScreen yet, swap the import above for:
// import LoginScreen from '../screens/LoginScreen';
// and pass   initialParams={{ isAdmin: true }}   on the Screen below.

const Stack = createStackNavigator();

const AdminAuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen
      name="AdminLogin"
      component={AdminLoginScreen}
      // If reusing the regular LoginScreen:
      // initialParams={{ isAdmin: true }}
    />
  </Stack.Navigator>
);

export default AdminAuthStack;