import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, Switch, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../components/theme';
import { getSchedules, addSchedule, deleteSchedule, toggleSchedule } from '../store/schedules';
import { ScheduleRule } from '../types';
import { DOMAIN_MAP } from '../engine/domainMap';

const ALL_APPS = DOMAIN_MAP.map((e) => e.appName);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function newId() { return Date.now().toString(); }

export default function ScheduleScreen() {
  const [schedules, setSchedules] = useState<ScheduleRule[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('Focus Block');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const load = useCallback(() => setSchedules(getSchedules()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveSchedule = () => {
    if (selectedApps.length === 0) { Alert.alert('No apps selected'); return; }
    const rule: ScheduleRule = {
      id: newId(), name, appNames: selectedApps,
      startTime, endTime, days: selectedDays, active: true,
    };
    addSchedule(rule);
    setModalVisible(false);
    load();
  };

  const toggleApp = (app: string) =>
    setSelectedApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );

  const toggleDay = (d: number) =>
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addTxt}>+ Add Schedule</Text>
      </TouchableOpacity>

      <FlatList
        data={schedules}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.scheduleName}>{item.name}</Text>
              <Text style={styles.scheduleInfo}>
                {item.days.map((d) => DAYS[d]).join(', ')}  {item.startTime}–{item.endTime}
              </Text>
              <Text style={styles.scheduleApps}>{item.appNames.join(', ')}</Text>
            </View>
            <View style={styles.actions}>
              <Switch
                value={item.active}
                onValueChange={(v) => { toggleSchedule(item.id, v); load(); }}
                trackColor={{ false: COLORS.border, true: COLORS.accent }}
                thumbColor={item.active ? '#fff' : COLORS.muted}
              />
              <TouchableOpacity onPress={() => { deleteSchedule(item.id); load(); }}>
                <Text style={styles.deleteBtn}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No schedules yet. Tap + to add one.</Text>}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Schedule</Text>

            <Text style={styles.label}>Days</Text>
            <View style={styles.daysRow}>
              {DAYS.map((d, i) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayBtn, selectedDays.includes(i) && styles.dayBtnActive]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[styles.dayTxt, selectedDays.includes(i) && { color: '#fff' }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Time: {startTime} – {endTime}</Text>

            <Text style={styles.label}>Apps</Text>
            <View style={styles.appsGrid}>
              {ALL_APPS.map((app) => (
                <TouchableOpacity
                  key={app}
                  style={[styles.appChip, selectedApps.includes(app) && styles.appChipActive]}
                  onPress={() => toggleApp(app)}
                >
                  <Text style={[styles.appChipTxt, selectedApps.includes(app) && { color: '#fff' }]}>{app}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: COLORS.accent }]} onPress={saveSchedule}>
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
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  addBtn: {
    backgroundColor: COLORS.accent, borderRadius: 10, padding: 12,
    alignItems: 'center', marginBottom: 16,
  },
  addTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  scheduleName: { color: COLORS.text, fontWeight: 'bold', fontSize: 15 },
  scheduleInfo: { color: COLORS.accent, fontSize: 12, marginTop: 2 },
  scheduleApps: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  actions: { alignItems: 'center', gap: 8 },
  deleteBtn: { fontSize: 18, marginTop: 4 },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '85%',
  },
  modalTitle: { color: COLORS.text, fontWeight: 'bold', fontSize: 18, marginBottom: 12 },
  label: { color: COLORS.muted, fontSize: 12, marginBottom: 6, marginTop: 8 },
  daysRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  dayBtn: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  dayBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dayTxt: { color: COLORS.muted, fontSize: 12 },
  appsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  appChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  appChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  appChipTxt: { color: COLORS.muted, fontSize: 12 },
  btn: {
    padding: 12, borderRadius: 8, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center',
  },
  btnTxt: { color: COLORS.text, fontWeight: 'bold' },
});
