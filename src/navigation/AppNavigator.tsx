import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { COLORS } from '../components/theme';
import DashboardScreen from '../screens/DashboardScreen';
import AppsScreen from '../screens/AppsScreen';
import FocusScreen from '../screens/FocusScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.text,
          tabBarStyle: {
            backgroundColor: COLORS.card,
            borderTopColor: COLORS.border,
          },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.muted,
          headerTitleStyle: { color: COLORS.text },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ tabBarLabel: 'Dashboard', tabBarIcon: () => null, title: '📊 Dashboard' }}
        />
        <Tab.Screen
          name="Apps"
          component={AppsScreen}
          options={{ tabBarLabel: 'Apps', tabBarIcon: () => null, title: '📱 Apps' }}
        />
        <Tab.Screen
          name="Focus"
          component={FocusScreen}
          options={{ tabBarLabel: 'Focus', tabBarIcon: () => null, title: '🎯 Focus' }}
        />
        <Tab.Screen
          name="Schedule"
          component={ScheduleScreen}
          options={{ tabBarLabel: 'Schedule', tabBarIcon: () => null, title: '🕐 Schedule' }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarLabel: 'Settings', tabBarIcon: () => null, title: '⚙️ Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
