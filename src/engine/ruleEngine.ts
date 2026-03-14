import { getRules, updateRule } from '../store/rules';
import { getSchedules } from '../store/schedules';
import { getCachedUsage } from '../modules/usageStats';
import * as nextDNS from '../api/nextdns';
import { AppRule } from '../types';

let engineInterval: ReturnType<typeof setInterval> | null = null;

export function startRuleEngine(): void {
  if (engineInterval) return;
  runChecks();
  engineInterval = setInterval(() => {
    runChecks();
    checkSchedules();
  }, 60 * 1000);
}

export function stopRuleEngine(): void {
  if (engineInterval) {
    clearInterval(engineInterval);
    engineInterval = null;
  }
}

export async function runChecks(): Promise<void> {
  if (!nextDNS.isConfigured()) return;
  const rules = getRules();
  const usageStats = getCachedUsage();

  for (const rule of rules) {
    const stat = usageStats.find((u) => u.packageName === rule.packageName);
    const usedMinutes = stat?.totalMinutes ?? 0;
    const updated: AppRule = { ...rule, usedMinutesToday: usedMinutes };

    if (rule.mode === 'block') {
      if (!rule.blockedToday) {
        await nextDNS.blockApp(rule.appName).catch(() => {});
        updated.blockedToday = true;
      }
    } else if (rule.mode === 'limit') {
      if (usedMinutes >= rule.dailyLimitMinutes && !rule.blockedToday) {
        await nextDNS.blockApp(rule.appName).catch(() => {});
        updated.blockedToday = true;
      } else if (usedMinutes < rule.dailyLimitMinutes && rule.blockedToday) {
        await nextDNS.unblockApp(rule.appName).catch(() => {});
        updated.blockedToday = false;
      }
    } else if (rule.mode === 'allow') {
      if (rule.blockedToday) {
        await nextDNS.unblockApp(rule.appName).catch(() => {});
        updated.blockedToday = false;
      }
    }

    updateRule(updated);
  }
}

export async function checkSchedules(): Promise<void> {
  if (!nextDNS.isConfigured()) return;
  const schedules = getSchedules();
  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const schedule of schedules) {
    if (!schedule.active) continue;
    if (!schedule.days.includes(currentDay)) continue;

    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const inWindow = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    if (inWindow) {
      await nextDNS.blockApps(schedule.appNames).catch(() => {});
    } else {
      await nextDNS.unblockApps(schedule.appNames).catch(() => {});
    }
  }
}

export async function resetDailyBlocks(): Promise<void> {
  if (!nextDNS.isConfigured()) return;
  const rules = getRules();
  const limitRules = rules.filter((r) => r.mode === 'limit' && r.blockedToday);
  for (const rule of limitRules) {
    await nextDNS.unblockApp(rule.appName).catch(() => {});
    updateRule({ ...rule, blockedToday: false, usedMinutesToday: 0 });
  }
}
