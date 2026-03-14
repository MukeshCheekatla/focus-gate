import { AppDomainMap } from '../types';

export const DOMAIN_MAP: AppDomainMap[] = [
  {
    appName: 'Instagram',
    packageName: 'com.instagram.android',
    domains: ['instagram.com', 'cdninstagram.com', 'i.instagram.com'],
  },
  {
    appName: 'YouTube',
    packageName: 'com.google.android.youtube',
    domains: ['youtube.com', 'youtu.be', 'googlevideo.com', 'ytimg.com'],
  },
  {
    appName: 'Twitter',
    packageName: 'com.twitter.android',
    domains: ['twitter.com', 'x.com', 't.co', 'twimg.com'],
  },
  {
    appName: 'Reddit',
    packageName: 'com.reddit.frontpage',
    domains: ['reddit.com', 'redd.it', 'redditmedia.com', 'redditstatic.com'],
  },
  {
    appName: 'TikTok',
    packageName: 'com.zhiliaoapp.musically',
    domains: ['tiktok.com', 'tiktokcdn.com', 'musical.ly'],
  },
  {
    appName: 'Facebook',
    packageName: 'com.facebook.katana',
    domains: ['facebook.com', 'fb.com', 'fbcdn.net', 'facebook.net'],
  },
  {
    appName: 'Snapchat',
    packageName: 'com.snapchat.android',
    domains: ['snapchat.com', 'sc-cdn.net', 'snap.com'],
  },
  {
    appName: 'WhatsApp',
    packageName: 'com.whatsapp',
    domains: ['whatsapp.com', 'whatsapp.net'],
  },
  {
    appName: 'LinkedIn',
    packageName: 'com.linkedin.android',
    domains: ['linkedin.com', 'licdn.com'],
  },
  {
    appName: 'Pinterest',
    packageName: 'com.pinterest',
    domains: ['pinterest.com', 'pinimg.com'],
  },
  {
    appName: 'Netflix',
    packageName: 'com.netflix.mediaclient',
    domains: ['netflix.com', 'nflximg.net', 'nflxso.net', 'nflxvideo.net'],
  },
  {
    appName: 'Twitch',
    packageName: 'tv.twitch.android.app',
    domains: ['twitch.tv', 'twitchsvc.net', 'jtvnw.net'],
  },
  {
    appName: 'Discord',
    packageName: 'com.discord',
    domains: ['discord.com', 'discord.gg', 'discordapp.com', 'discordapp.net'],
  },
  {
    appName: 'Telegram',
    packageName: 'org.telegram.messenger',
    domains: ['telegram.org', 't.me'],
  },
  {
    appName: 'Spotify',
    packageName: 'com.spotify.music',
    domains: ['spotify.com', 'scdn.co', 'spotifycdn.com'],
  },
];

export function getDomains(appName: string): string[] {
  const entry = DOMAIN_MAP.find(
    (e) => e.appName.toLowerCase() === appName.toLowerCase()
  );
  return entry?.domains ?? [];
}

export function getByPackage(packageName: string): AppDomainMap | undefined {
  return DOMAIN_MAP.find((e) => e.packageName === packageName);
}

export function getAllAppNames(): string[] {
  return DOMAIN_MAP.map((e) => e.appName);
}

export function addCustomMapping(entry: AppDomainMap): void {
  const idx = DOMAIN_MAP.findIndex((e) => e.packageName === entry.packageName);
  if (idx >= 0) DOMAIN_MAP[idx] = entry;
  else DOMAIN_MAP.push(entry);
}
