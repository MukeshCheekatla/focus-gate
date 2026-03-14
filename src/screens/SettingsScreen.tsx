import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../components/theme';
import { saveConfig, getConfig, testConnection } from '../api/nextdns';
import { hasUsagePermission, requestUsagePermission } from '../modules/usageStats';
import { resetDailyBlocks } from '../engine/ruleEngine';
import { storage } from '../store/storage';

const AUTO_RESET_KEY = 'auto_reset_enabled';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [profileId, setProfileId] = useState('');
  const [hasPerm, setHasPerm] = useState(false);
  const [autoReset, setAutoReset] = useState(false);
  const [testing, setTesting] = useState(false);

  useFocusEffect(useCallback(() => {
    const cfg = getConfig();
    if (cfg) { setApiKey(cfg.apiKey); setProfileId(cfg.profileId); }
    hasUsagePermission().then(setHasPerm);
    setAutoReset(storage.getBoolean(AUTO_RESET_KEY) ?? false);
  }, []));

  const saveSettings = () => {
    if (!apiKey.trim() || !profileId.trim()) {
      Alert.alert('Missing Fields', 'Both API key and Profile ID are required.');
      return;
    }
    saveConfig({ apiKey: apiKey.trim(), profileId: profileId.trim() });
    Alert.alert('Saved', 'NextDNS configuration saved.');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    const ok = await testConnection();
    setTesting(false);
    Alert.alert(ok ? '✅ Connected' : '❌ Failed', ok ? 'NextDNS API is reachable.' : 'Check your API key and Profile ID.');
  };

  const handleGrantPerm = async () => {
    await requestUsagePermission();
    setTimeout(() => hasUsagePermission().then(setHasPerm), 2000);
  };

  const toggleAutoReset = (val: boolean) => {
    setAutoReset(val);
    storage.set(AUTO_RESET_KEY, val);
  };

  const handleResetBlocks = async () => {
    Alert.alert('Reset Daily Blocks', 'This will unblock all limit-mode apps now.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => { await resetDailyBlocks(); Alert.alert('Done', 'Daily blocks reset.'); } },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>NextDNS Configuration</Text>
      <Text style={styles.label}>API Key</Text>
      <TextInput
        style={styles.input}
        value={apiKey}
        onChangeText={setApiKey}
        placeholder="Your NextDNS API key"
        placeholderTextColor={COLORS.muted}
        secureTextEntry
        autoCapitalize="none"
      />
      <Text style={styles.label}>Profile ID</Text>
      <TextInput
        style={styles.input}
        value={profileId}
        onChangeText={setProfileId}
        placeholder="e.g. abc123"
        placeholderTextColor={COLORS.muted}
        autoCapitalize="none"
      />
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={saveSettings}>
          <Text style={styles.btnTxt}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { flex: 1, borderColor: COLORS.accent }]} onPress={handleTestConnection} disabled={testing}>
          <Text style={[styles.btnTxt, { color: COLORS.accent }]}>{testing ? 'Testing…' : 'Test Connection'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Usage Stats Permission</Text>
      <View style={styles.permRow}>
        <Text style={[styles.label, { flex: 1, marginBottom: 0 }]}>
          Status: {hasPerm ? '✅ Granted' : '❌ Not Granted'}
        </Text>
        {!hasPerm && (
          <TouchableOpacity style={[styles.btn, { borderColor: COLORS.yellow }]} onPress={handleGrantPerm}>
            <Text style={[styles.btnTxt, { color: COLORS.yellow }]}>Grant</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Automation</Text>
      <View style={styles.permRow}>
        <Text style={[styles.label, { flex: 1, marginBottom: 0 }]}>Auto-reset limits at midnight</Text>
        <Switch
          value={autoReset}
          onValueChange={toggleAutoReset}
          trackColor={{ false: COLORS.border, true: COLORS.accent }}
          thumbColor={autoReset ? '#fff' : COLORS.muted}
        />
      </View>

      <TouchableOpacity style={[styles.btn, styles.resetBtn]} onPress={handleResetBlocks}>
        <Text style={[styles.btnTxt, { color: COLORS.red }]}>Reset All Daily Blocks Now</Text>
      </TouchableOpacity>

      <Text style={styles.version}>FocusGate v0.0.1</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  sectionTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, marginTop: 20, marginBottom: 10 },
  label: { color: COLORS.muted, fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card, color: COLORS.text,
    borderRadius: 10, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, fontSize: 14,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  permRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  btn: {
    padding: 12, borderRadius: 8, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', marginBottom: 8,
  },
  btnTxt: { color: COLORS.text, fontWeight: '600' },
  resetBtn: { borderColor: COLORS.red, marginTop: 8 },
  version: { color: COLORS.muted, textAlign: 'center', marginTop: 32, marginBottom: 20, fontSize: 12 },
});
