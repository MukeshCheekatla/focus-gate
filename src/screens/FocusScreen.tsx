import React, { useState, useCallback } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../components/theme';
import { storage } from '../store/storage';
import * as nextDNS from '../api/nextdns';
import { FocusPreset } from '../types';

const DEFAULT_PRESETS: FocusPreset[] = [
  { id: 'deep_work',      name: 'Deep Work',       icon: '🎯', appNames: ['YouTube','Instagram','Twitter','Reddit','TikTok','Facebook','Twitch','Discord'], active: false },
  { id: 'no_social',     name: 'No Social',        icon: '🔕', appNames: ['Instagram','Twitter','Facebook','Snapchat','LinkedIn','Pinterest','TikTok'], active: false },
  { id: 'no_entertain',  name: 'No Entertainment', icon: '📵', appNames: ['YouTube','Netflix','Twitch','Spotify','TikTok'], active: false },
  { id: 'night_mode',    name: 'Night Mode',       icon: '🌙', appNames: ['YouTube','Instagram','Twitter','Reddit','TikTok','Facebook','Snapchat','Netflix','Twitch','Discord'], active: false },
];

const PRESETS_KEY = 'focus_presets';

function loadPresets(): FocusPreset[] {
  const raw = storage.getString(PRESETS_KEY);
  return raw ? JSON.parse(raw) : DEFAULT_PRESETS;
}
function savePresets(p: FocusPreset[]) { storage.set(PRESETS_KEY, JSON.stringify(p)); }

export default function FocusScreen() {
  const [presets, setPresets] = useState<FocusPreset[]>(loadPresets());

  useFocusEffect(useCallback(() => { setPresets(loadPresets()); }, []));

  const toggle = async (id: string, val: boolean) => {
    if (!nextDNS.isConfigured()) {
      Alert.alert('Not Configured', 'Set up NextDNS in Settings first.');
      return;
    }
    const updated = presets.map((p) => p.id === id ? { ...p, active: val } : p);
    const preset = updated.find((p) => p.id === id)!;
    if (val) await nextDNS.blockApps(preset.appNames).catch(() => {});
    else     await nextDNS.unblockApps(preset.appNames).catch(() => {});
    savePresets(updated);
    setPresets(updated);
  };

  const disableAll = async () => {
    const updated = presets.map((p) => ({ ...p, active: false }));
    await Promise.all(presets.filter((p) => p.active).map((p) => nextDNS.unblockApps(p.appNames).catch(() => {})));
    savePresets(updated);
    setPresets(updated);
  };

  const anyActive = presets.some((p) => p.active);

  return (
    <View style={styles.container}>
      {presets.map((preset) => (
        <View key={preset.id} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.presetName}>{preset.icon}  {preset.name}</Text>
            <Text style={styles.presetApps}>{preset.appNames.join(', ')}</Text>
          </View>
          <Switch
            value={preset.active}
            onValueChange={(v) => toggle(preset.id, v)}
            trackColor={{ false: COLORS.border, true: COLORS.accent }}
            thumbColor={preset.active ? '#fff' : COLORS.muted}
          />
        </View>
      ))}
      {anyActive && (
        <TouchableOpacity style={styles.disableBtn} onPress={disableAll}>
          <Text style={styles.disableTxt}>Disable All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  presetName: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  presetApps: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  disableBtn: {
    marginTop: 8, backgroundColor: COLORS.red, borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  disableTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
