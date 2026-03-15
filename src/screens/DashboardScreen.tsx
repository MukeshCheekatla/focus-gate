/**
 * DashboardScreen.tsx -- Main dashboard showing today's screen time.
 *
 * Sprint 1 changes:
 *  - Permission gate: if PACKAGE_USAGE_STATS not granted, shows a prominent
 *    yellow banner with a direct "Grant Access" button that opens the OS
 *    Usage Access Settings screen (not just navigates to the in-app Settings).
 *  - Live data: pulls fresh usage on every focus event via refreshTodayUsage().
 *  - Loading state: spinner shown on initial load (empty + refreshing).
 *  - Error state: falls back to cached data with an inline notice.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONT } from '../components/theme';
import {
  refreshTodayUsage,
  getCachedUsage,
  formatMinutes,
  hasUsagePermission,
  requestUsagePermission,
} from '../modules/usageStats';
import { getRules } from '../store/rules';
import { isConfigured } from '../api/nextdns';
import { AppUsageStat, AppRule } from '../types';
import AppIcon from '../components/AppIcon';

// --- Sub-components ---

interface UsageBarProps {
  minutes: number;
  limit:   number;
  max:     number;
}

/** Proportional usage bar that turns yellow near the limit and red over it. */
function UsageBar({ minutes, limit, max }: UsageBarProps): React.ReactElement {
  const pct      = Math.min(1, minutes / Math.max(max, 1));
  const overLim  = limit > 0 && minutes >= limit;
  const nearLim  = limit > 0 && minutes >= limit * 0.8;
  const barColor = overLim ? COLORS.red : nearLim ? COLORS.yellow : COLORS.accent;
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { flex: pct, backgroundColor: barColor }]} />
      <View style={{ flex: 1 - pct }} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    flexDirection: 'row',
    marginHorizontal: SPACING.sm,
  },
  fill: { height: 6 },
});

interface StatCardProps {
  value: string;
  label: string;
  color: string;
}

function StatCard({ value, label, color }: StatCardProps): React.ReactElement {
  return (
    <View style={[cardStyles.card, { borderColor: color }]}>
      <Text style={cardStyles.value}>{value}</Text>
      <Text style={cardStyles.label}>{label}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.xs,
    alignItems: 'center',
    borderWidth: 1,
  },
  value: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.text },
  label: {
    fontSize: FONT.xs,
    color: COLORS.muted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// --- Main screen ---

export default function DashboardScreen(): React.ReactElement {
  const navigation = useNavigation<any>();

  const [usage, setUsage]             = useState<AppUsageStat[]>([]);
  const [rules, setRules]             = useState<AppRule[]>([]);
  const [refreshing, setRefreshing]   = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasPerm, setHasPerm]         = useState(true);
  const [configured, setConfigured]   = useState(true);
  const [loadError, setLoadError]     = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    setLoadError(false);

    try {
      const [perm, cfg] = await Promise.all([
        hasUsagePermission(),
        Promise.resolve(isConfigured()),
      ]);
      setHasPerm(perm);
      setConfigured(cfg);

      let stats: AppUsageStat[];
      if (perm) {
        stats = await refreshTodayUsage().catch(() => {
          setLoadError(true);
          return getCachedUsage();
        });
      } else {
        stats = getCachedUsage();
      }

      const sorted = [...stats]
        .sort((a, b) => b.totalMinutes - a.totalMinutes)
        .slice(0, 10);

      setUsage(sorted);
      setRules(getRules());
    } catch {
      setLoadError(true);
      setUsage(getCachedUsage().slice(0, 10));
    } finally {
      setRefreshing(false);
      setInitialLoad(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalMinutes = usage.reduce((sum, u) => sum + u.totalMinutes, 0);
  const blockedCount = rules.filter((r) => r.blockedToday).length;
  const limitedCount = rules.filter((r) => r.mode === 'limit').length;
  const maxMinutes   = usage[0]?.totalMinutes ?? 1;

  const getLimitForApp = (pkg: string): number => {
    const rule = rules.find((r) => r.packageName === pkg);
    return rule?.mode === 'limit' ? rule.dailyLimitMinutes : 0;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: SPACING.xl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={load}
          tintColor={COLORS.accent}
        />
      }
    >
      {!configured && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Connect NextDNS to enable blocking"
        >
          <Text style={styles.bannerText}>Connect NextDNS to enable blocking -&gt;</Text>
        </TouchableOpacity>
      )}

      {!hasPerm && (
        <TouchableOpacity
          style={[styles.banner, styles.permissionBanner]}
          onPress={requestUsagePermission}
          accessibilityRole="button"
          accessibilityLabel="Grant Usage Access permission"
        >
          <Text style={styles.permissionTitle}>Usage Access Required</Text>
          <Text style={styles.permissionBody}>
            FocusGate needs the Usage Access permission to track screen time and
            enforce daily limits. Tap to open Settings and grant access.
          </Text>
          <View style={styles.permissionCTA}>
            <Text style={styles.permissionCTAText}>Grant Access -&gt;</Text>
          </View>
        </TouchableOpacity>
      )}

      {loadError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not refresh usage data. Showing cached results.
          </Text>
        </View>
      )}

      <View style={styles.cards}>
        <StatCard value={formatMinutes(totalMinutes)} label="Screen Time" color={COLORS.cardBlue}  />
        <StatCard value={String(blockedCount)}        label="Blocked"     color={COLORS.cardRed}   />
        <StatCard value={String(limitedCount)}        label="Limited"     color={COLORS.cardGreen} />
      </View>

      <Text style={styles.sectionTitle}>Top Apps Today</Text>

      {initialLoad && refreshing ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: SPACING.xl }} />
      ) : usage.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {hasPerm ? 'No usage data yet.' : 'Permission required to show usage.'}
          </Text>
          <Text style={styles.emptyHint}>
            {hasPerm
              ? 'Use your phone for a while, then pull to refresh.'
              : 'Tap the banner above to grant Usage Access.'}
          </Text>
        </View>
      ) : (
        usage.map((item) => {
          const limit     = getLimitForApp(item.packageName);
          const rule      = rules.find((r) => r.packageName === item.packageName);
          const isBlocked = rule?.blockedToday ?? false;

          return (
            <View key={item.packageName} style={styles.appRow}>
              <AppIcon appName={item.appName} size={36} />
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <View style={styles.appRowHeader}>
                  <Text style={styles.appName} numberOfLines={1}>
                    {item.appName}
                    {isBlocked ? (
                      <Text style={{ color: COLORS.red }}> blocked</Text>
                    ) : null}
                  </Text>
                  <Text style={styles.appTime}>
                    {formatMinutes(item.totalMinutes)}
                    {limit > 0 ? ` / ${formatMinutes(limit)}` : ''}
                  </Text>
                </View>
                <UsageBar
                  minutes={item.totalMinutes}
                  limit={limit}
                  max={maxMinutes}
                />
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: SPACING.md,
  },
  banner: {
    backgroundColor: COLORS.accentDim,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  bannerText: {
    color: COLORS.accent,
    fontWeight: '600',
    fontSize: FONT.sm,
    textAlign: 'center',
  },
  permissionBanner: {
    backgroundColor: COLORS.yellowDim,
    borderColor: COLORS.yellow,
  },
  permissionTitle: {
    color: COLORS.yellow,
    fontWeight: '700',
    fontSize: FONT.md,
    marginBottom: SPACING.xs,
  },
  permissionBody: {
    color: COLORS.yellow,
    fontSize: FONT.sm,
    lineHeight: 20,
    opacity: 0.85,
  },
  permissionCTA: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-end',
  },
  permissionCTAText: {
    color: COLORS.yellow,
    fontWeight: '700',
    fontSize: FONT.sm,
  },
  errorBanner: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorText: {
    color: COLORS.muted,
    fontSize: FONT.xs,
    textAlign: 'center',
  },
  cards: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    letterSpacing: 0.3,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  appName: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: FONT.sm,
    flex: 1,
    marginRight: SPACING.xs,
  },
  appTime: {
    color: COLORS.muted,
    fontSize: FONT.xs,
  },
  empty: {
    alignItems: 'center',
    marginTop: SPACING.xl * 2,
  },
  emptyText: {
    color: COLORS.subtext,
    fontSize: FONT.md,
    fontWeight: '600',
  },
  emptyHint: {
    color: COLORS.muted,
    fontSize: FONT.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
