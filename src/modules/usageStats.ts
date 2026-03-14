import { NativeModules } from 'react-native';
import { storage } from '../store/storage';
import { AppUsageStat } from '../types';

const { UsageStats } = NativeModules;
const USAGE_CACHE_KEY = 'usage_cache_today';

export async function hasUsagePermission(): Promise<boolean> {
  return UsageStats.hasPermission();
}

export async function requestUsagePermission(): Promise<void> {
  return UsageStats.requestPermission();
}

export async function refreshTodayUsage(): Promise<AppUsageStat[]> {
  const raw: Array<{ packageName: string; appName: string; totalMinutes: number; lastUsed: number }> =
    await UsageStats.getTodayUsage();
  const stats: AppUsageStat[] = raw.map((r) => ({
    packageName: r.packageName,
    appName: r.appName,
    totalMinutes: r.totalMinutes,
    lastUsed: r.lastUsed,
  }));
  storage.set(USAGE_CACHE_KEY, JSON.stringify(stats));
  return stats;
}

export function getCachedUsage(): AppUsageStat[] {
  const raw = storage.getString(USAGE_CACHE_KEY);
  return raw ? (JSON.parse(raw) as AppUsageStat[]) : [];
}

export async function getAppMinutesToday(packageName: string): Promise<number> {
  return UsageStats.getAppUsage(packageName);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
