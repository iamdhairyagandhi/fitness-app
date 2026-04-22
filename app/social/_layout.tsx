import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import React from 'react';

export default function SocialLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
            }}
        />
    );
}
