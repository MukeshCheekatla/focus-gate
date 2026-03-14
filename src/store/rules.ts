import { AppRule } from '../types';
import { storage } from './storage';
import { DOMAIN_MAP } from '../engine/domainMap';

const RULES_KEY = 'app_rules';

export function getRules(): AppRule[] {
  const raw = storage.getString(RULES_KEY);
  if (raw) return JSON.parse(raw) as AppRule[];
  const defaults: AppRule[] = DOMAIN_MAP.map((entry) => ({
    appName: entry.appName,
    packageName: entry.packageName,
    mode: 'allow',
    dailyLimitMinutes: 0,
    blockedToday: false,
    usedMinutesToday: 0,
  }));
  saveRules(defaults);
  return defaults;
}

export function saveRules(rules: AppRule[]): void {
  storage.set(RULES_KEY, JSON.stringify(rules));
}

export function updateRule(updated: AppRule): void {
  const rules = getRules();
  const idx = rules.findIndex((r) => r.packageName === updated.packageName);
  if (idx >= 0) rules[idx] = updated;
  else rules.push(updated);
  saveRules(rules);
}
