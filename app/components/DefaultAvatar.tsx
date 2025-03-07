import React from 'react';
import { View } from 'react-native';
import { User } from 'lucide-react-native';

interface DefaultAvatarProps {
  size?: number;
  color?: string;
}

export function DefaultAvatar({ size = 40, color = '#64748b' }: DefaultAvatarProps) {
  return (
    <View 
      style={{ 
        width: size, 
        height: size, 
        borderRadius: size / 2,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <User size={size * 0.6} color={color} />
    </View>
  );
} 