/**
 * ruleEngine.ts -- 60-second interval engine that enforces app rules.
 *
 * Sprint 1 change: getAppMinutesToday() now calls the real native
 * UsageStatsModule instead of reading only from the MMKV cache.
 * The cache is still used for synchronous reads; live data is fetched
 * per-rule when the engine needs the freshest count for a limit check.
 *
 * Flow:
 *   startRuleEngine() -> runs immediately + every 60s
 *     runChecks()       -> evaluate each rule against live usage
 *     checkSchedules()  -> enforce time-window blocks
 */

import { getRules, updateRule } from '../store/rules';
import { getSchedules } from '../store/schedules';
import { getCachedUsage, getAppMinutesToday, refreshTodayUsage } from '../modules/usageStats';
import * as nextDNS from '../api/nextdns';
import { AppRule } from '../types';

let engineInterval: ReturnType<typeof setInterval> | null = null;

// --- Lifecycle ---

/**
 * Start the rule engine. Idempotent -- calling twice has no effect.
 * Runs an immediate evaluation cycle then repeats every 60 seconds.
 */
export function startRuleEngine(): void {
  if (engineInterval) return;
  // Refresh usage data on start so the first runChecks() has live data
  refreshTodayUsage().catch(() => {});
  runChecks();
  checkSchedules();
  engineInterval = setInterval(() => {
    // Refresh usage cache before evaluating rules
    refreshTodayUsage()
      .then(() => runChecks())
      .catch(() => runChecks()); // still run checks even if refresh fails
    checkSchedules();
  }, 60 * 1000);
}

/**
 * Stop the rule engine and clear the interval.
 */
export function stopRuleEngine(): void {
  if (engineInterval) {
    clearInterval(engineInterval);
    engineInterval = null;
  }
}

// --- Rule evaluation ---

/**
 * Evaluate every rule against current usage data and enforce blocks via NextDNS.
 *
 * Uses the MMKV cache for the initial read (synchronous), then falls back to
 * a live getAppMinutesToday() call for limit rules where precision matters.
 */
export async function runChecks(): Promise<void> {
  if (!nextDNS.isConfigured()) return;

  const rules      = getRules();
  const usageStats = getCachedUsage();

  for (const rule of rules) {
    // Start with cached usage for this rule's package
    const cached      = usageStats.find((u) => u.packageName === rule.packageName);
    let   usedMinutes = cached?.totalMinutes ?? 0;

    // For limit rules, fetch live data to avoid acting on stale cache
    if (rule.mode === 'limit' && rule.dailyLimitMinutes > 0) {
      usedMinutes = await getAppMinutesToday(rule.packageName).catch(() => usedMinutes);
    }

    const updated: AppRule = { ...rule, usedMinutesToday: usedMinutes };

    if (rule.mode === 'block') {
      // Always-block: ensure domain is blocked
      if (!rule.blockedToday) {
        await nextDNS.blockApp(rule.appName).catch(() => {});
        updated.blockedToday = true;
      }
    } else if (rule.mode === 'limit') {
      if (rule.dailyLimitMinutes > 0) {
        if (usedMinutes >= rule.dailyLimitMinutes && !rule.blockedToday) {
          // Limit exceeded -- block now
          await nextDNS.blockApp(rule.appName).catch(() => {});
          updated.blockedToday = true;
        } else if (usedMinutes < rule.dailyLimitMinutes && rule.blockedToday) {
          // Usage fell below limit (e.g. after daily reset) -- unblock
          await nextDNS.unblockApp(rule.appName).catch(() => {});
          updated.blockedToday = false;
        }
      }
    } else if (rule.mode === 'allow') {
      // Ensure any previously blocked domain is unblocked
      if (rule.blockedToday) {
        await nextDNS.unblockApp(rule.appName).catch(() => {});
        updated.blockedToday = false;
      }
    }

    updateRule(updated);
  }
}

// --- Schedule enforcement ---

/**
 * Check all schedules and block/unblock apps based on time windows.
 */
export async function checkSchedules(): Promise<void> {
  if (!nextDNS.isConfigured()) return;

  const schedules      = getSchedules();
  const now            = new Date();
  const currentDay     = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const schedule of schedules) {
    if (!schedule.active) continue;
    if (!schedule.days.includes(currentDay)) continue;

    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH,   endM  ] = schedule.endTime.split(':').map(Number);
    const startMinutes     = startH * 60 + startM;
    const endMinutes       = endH   * 60 + endM;

    const inWindow = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    if (inWindow) {
      await nextDNS.blockApps(schedule.appNames).catch(() => {});
    } else {
      await nextDNS.unblockApps(schedule.appNames).catch(() => {});
    }
  }
}

// --- Daily reset ---

/**
 * Reset all limit-blocked rules at midnight.
 * Called by BootReceiver and/or a daily alarm.
 */
export async function resetDailyBlocks(): Promise<void> {
  if (!nextDNS.isConfigured()) return;

  const rules      = getRules();
  const limitRules = rules.filter((r) => r.mode === 'limit' && r.blockedToday);

  for (const rule of limitRules) {
    await nextDNS.unblockApp(rule.appName).catch(() => {});
    updateRule({ ...rule, blockedToday: false, usedMinutesToday: 0 });
  }
}
