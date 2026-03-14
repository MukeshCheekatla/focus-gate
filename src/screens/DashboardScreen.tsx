import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  FlatList, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../components/theme';
import { refreshTodayUsage, getCachedUsage, formatMinutes } from '../modules/usageStats';
import { getRules } from '../store/rules';
import { AppUsageStat } from '../types';

export default function DashboardScreen() {
  const [usage, setUsage] = useState<AppUsageStat[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [limitedCount, setLimitedCount] = useState(0);

  const load = useCallback(async () => {
    setRefreshing(true);
    const stats = await refreshTodayUsage().catch(() => getCachedUsage());
    const sorted = [...stats].sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, 10);
    setUsage(sorted);
    setTotalMinutes(stats.reduce((sum, s) => sum + s.totalMinutes, 0));
    const rules = getRules();
    setBlockedCount(rules.filter((r) => r.blockedToday).length);
    setLimitedCount(rules.filter((r) => r.mode === 'limit').length);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const maxMinutes = usage[0]?.totalMinutes ?? 1;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={COLORS.accent} />}
    >
      <View style={styles.cards}>
        <View style={[styles.card, { borderColor: COLORS.cardBlue }]}>
          <Text style={styles.cardValue}>{formatMinutes(totalMinutes)}</Text>
          <Text style={styles.cardLabel}>Screen Time</Text>
        </View>
        <View style={[styles.card, { borderColor: COLORS.cardRed }]}>
          <Text style={styles.cardValue}>{blockedCount}</Text>
          <Text style={styles.cardLabel}>Blocked</Text>
        </View>
        <View style={[styles.card, { borderColor: COLORS.cardGreen }]}>
          <Text style={styles.cardValue}>{limitedCount}</Text>
          <Text style={styles.cardLabel}>Limited</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Top Apps Today</Text>
      {refreshing && usage.length === 0 ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }} />
      ) : (
        usage.map((item) => (
          <View key={item.packageName} style={styles.appRow}>
            <Text style={styles.appName}>{item.appName}</Text>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  { width: `${Math.round((item.totalMinutes / maxMinutes) * 100)}%`, backgroundColor: COLORS.accent },
                ]}
              />
            </View>
            <Text style={styles.appTime}>{formatMinutes(item.totalMinutes)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  cards: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  card: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12,
    padding: 12, marginHorizontal: 4, alignItems: 'center', borderWidth: 1,
  },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  cardLabel: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  appRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  appName: { width: 100, color: COLORS.text, fontSize: 13 },
  barContainer: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, marginHorizontal: 8 },
  bar: { height: 8, borderRadius: 4 },
  appTime: { width: 48, color: COLORS.muted, fontSize: 12, textAlign: 'right' },
});
