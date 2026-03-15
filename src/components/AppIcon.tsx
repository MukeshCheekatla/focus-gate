import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { COLORS } from './theme';

const EMOJI_MAP: Record<string, string> = {
  instagram: '📷',
  youtube: '▶️',
  twitter: '🐦',
  reddit: '👽',
  tiktok: '🎵',
  facebook: '👥',
  snapchat: '👻',
  whatsapp: '💬',
  linkedin: '💼',
  pinterest: '📌',
  netflix: '🎬',
  twitch: '🎮',
  discord: '🎧',
  telegram: '✈️',
  spotify: '🎸',
};

interface AppIconProps {
  appName: string;
  size?: number;
  style?: ViewStyle;
}

const AppIcon: React.FC<AppIconProps> = ({ appName, size = 36, style }) => {
  const key = appName.toLowerCase();
  const emoji = EMOJI_MAP[key] ?? '📱';
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLORS.cardBlue,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: size * 0.55 }}>{emoji}</Text>
    </View>
  );
};

export default AppIcon;
