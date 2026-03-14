import axios from 'axios';
import { storage } from '../store/storage';
import { NextDNSConfig, DenylistEntry } from '../types';
import { getDomains } from '../engine/domainMap';

const BASE_URL = 'https://api.nextdns.io';
const CONFIG_KEY = 'nextdns_config';

export function saveConfig(config: NextDNSConfig): void {
  storage.set(CONFIG_KEY, JSON.stringify(config));
}

export function getConfig(): NextDNSConfig | null {
  const raw = storage.getString(CONFIG_KEY);
  return raw ? (JSON.parse(raw) as NextDNSConfig) : null;
}

export function isConfigured(): boolean {
  const cfg = getConfig();
  return !!(cfg?.apiKey && cfg?.profileId);
}

function getHeaders(): Record<string, string> {
  const cfg = getConfig();
  if (!cfg) throw new Error('NextDNS not configured');
  return { 'X-Api-Key': cfg.apiKey, 'Content-Type': 'application/json' };
}

function profileUrl(path: string): string {
  const cfg = getConfig();
  if (!cfg) throw new Error('NextDNS not configured');
  return `${BASE_URL}/profiles/${cfg.profileId}${path}`;
}

export async function getDenylist(): Promise<DenylistEntry[]> {
  const res = await axios.get(profileUrl('/denylist'), { headers: getHeaders() });
  return res.data?.data ?? [];
}

export async function blockDomain(domain: string): Promise<void> {
  await axios.post(
    profileUrl('/denylist'),
    { id: domain, active: true },
    { headers: getHeaders() }
  );
}

export async function unblockDomain(domain: string): Promise<void> {
  await axios.delete(profileUrl(`/denylist/${domain}`), { headers: getHeaders() });
}

export async function blockApp(appName: string): Promise<void> {
  const domains = getDomains(appName);
  await Promise.all(domains.map((d) => blockDomain(d)));
}

export async function unblockApp(appName: string): Promise<void> {
  const domains = getDomains(appName);
  await Promise.all(domains.map((d) => unblockDomain(d).catch(() => {})));
}

export async function blockApps(appNames: string[]): Promise<void> {
  await Promise.all(appNames.map((a) => blockApp(a)));
}

export async function unblockApps(appNames: string[]): Promise<void> {
  await Promise.all(appNames.map((a) => unblockApp(a)));
}

export async function testConnection(): Promise<boolean> {
  try {
    await axios.get(profileUrl('/info'), { headers: getHeaders() });
    return true;
  } catch {
    return false;
  }
}
