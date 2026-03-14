import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { startRuleEngine } from './src/engine/ruleEngine';
import { hasUsagePermission, requestUsagePermission, refreshTodayUsage } from './src/modules/usageStats';

export default function App() {
  useEffect(() => {
    async function init() {
      const hasPerm = await hasUsagePermission();
      if (!hasPerm) {
        Alert.alert(
          'Permission Required',
          'FocusGate needs Usage Access to track app screen time. Please grant it in the next screen.',
          [{ text: 'OK', onPress: requestUsagePermission }]
        );
      } else {
        await refreshTodayUsage();
      }
      startRuleEngine();
    }
    init();
  }, []);
  return <AppNavigator />;
}
