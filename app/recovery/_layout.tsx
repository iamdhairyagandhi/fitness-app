import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function RecoveryLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
                animation: 'slide_from_right',
            }}
        />
    );
}
