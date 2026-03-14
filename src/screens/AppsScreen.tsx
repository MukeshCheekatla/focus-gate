import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../components/theme';
import { getRules, updateRule } from '../store/rules';
import { AppRule, RuleMode } from '../types';
import * as nextDNS from '../api/nextdns';

export default function AppsScreen() {
  const [rules, setRules] = useState<AppRule[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AppRule | null>(null);
  const [limitInput, setLimitInput] = useState('');

  const load = useCallback(() => setRules(getRules()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setMode = async (rule: AppRule, mode: RuleMode) => {
    const updated = { ...rule, mode };
    if (mode === 'block') {
      await nextDNS.blockApp(rule.appName).catch(() => {});
      updated.blockedToday = true;
    } else if (mode === 'allow') {
      await nextDNS.unblockApp(rule.appName).catch(() => {});
      updated.blockedToday = false;
    } else {
      // limit — open modal
      setSelectedRule(rule);
      setLimitInput(String(rule.dailyLimitMinutes || 60));
      setModalVisible(true);
      return;
    }
    updateRule(updated);
    load();
  };

  const saveLimit = async () => {
    if (!selectedRule) return;
    const mins = parseInt(limitInput, 10);
    if (isNaN(mins) || mins <= 0) { Alert.alert('Invalid', 'Enter a positive number of minutes'); return; }
    const updated = { ...selectedRule, mode: 'limit' as RuleMode, dailyLimitMinutes: mins };
    updateRule(updated);
    setModalVisible(false);
    load();
  };

  const modeColor = (m: RuleMode) => m === 'block' ? COLORS.red : m === 'limit' ? COLORS.yellow : COLORS.green;

  return (
    <View style={styles.container}>
      <FlatList
        data={rules}
        keyExtractor={(r) => r.packageName}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.appName}>{item.appName}</Text>
              <Text style={styles.pkg}>{item.packageName}</Text>
            </View>
            <View style={styles.modes}>
              {(['allow', 'limit', 'block'] as RuleMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.modeBtn,
                    item.mode === m && { backgroundColor: modeColor(m) },
                  ]}
                  onPress={() => setMode(item, m)}
                >
                  <Text style={[styles.modeTxt, item.mode === m && { color: '#000' }]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      />
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Daily Limit for {selectedRule?.appName}</Text>
            <TextInput
              style={styles.input}
              value={limitInput}
              onChangeText={setLimitInput}
              keyboardType="number-pad"
              placeholder="Minutes"
              placeholderTextColor={COLORS.muted}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: COLORS.accent }]} onPress={saveLimit}>
                <Text style={[styles.btnTxt, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  appName: { color: COLORS.text, fontWeight: 'bold', fontSize: 14 },
  pkg: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  modes: { flexDirection: 'row', gap: 4 },
  modeBtn: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  modeTxt: { color: COLORS.muted, fontSize: 11 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, width: '80%' },
  modalTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 16, marginBottom: 12 },
  input: {
    backgroundColor: COLORS.bg, color: COLORS.text,
    borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, fontSize: 16,
  },
  btn: {
    padding: 10, borderRadius: 8, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center',
  },
  btnTxt: { color: COLORS.text, fontWeight: 'bold' },
});
