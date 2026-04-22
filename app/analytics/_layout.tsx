import { Colors } from '@/constants/theme';
import { Stack } from 'expo-router';

export default function AnalyticsLayout() {
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
