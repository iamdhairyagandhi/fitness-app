import { Colors, FontSize, FontWeight } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textTertiary,
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarItemStyle: styles.tabBarItem,
                tabBarIconStyle: styles.tabBarIcon,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="workout"
                options={{
                    title: 'Workout',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="barbell" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="nutrition"
                options={{
                    title: 'Nutrition',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="nutrition" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="progress"
                options={{
                    title: 'Progress',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="trending-up" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="social"
                options={{
                    title: 'Social',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: Colors.surface,
        borderTopColor: Colors.border,
        borderTopWidth: 0.5,
        height: Platform.OS === 'ios' ? 88 : 68,
        paddingTop: 6,
        paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        elevation: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    tabBarLabel: {
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.medium,
        letterSpacing: 0.3,
        marginTop: 2,
    },
    tabBarItem: {
        gap: 2,
    },
    tabBarIcon: {
        marginBottom: -2,
    },
});
