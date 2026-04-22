import { Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type UnitSystem = 'metric' | 'imperial';
type ThemeMode = 'dark' | 'light' | 'system';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { user, setUser } = useAuthStore();

    const [units, setUnits] = useState<UnitSystem>('metric');
    const [theme, setTheme] = useState<ThemeMode>('dark');
    const [restTimer, setRestTimer] = useState(user?.preferred_rest_seconds || 90);
    const [notifications, setNotifications] = useState({
        workoutReminder: true,
        mealReminder: true,
        waterReminder: false,
        weeklyReport: true,
        achievements: true,
        socialActivity: false,
    });

    const toggleNotif = (key: keyof typeof notifications) => {
        setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        setUser({ preferred_rest_seconds: restTimer } as any);
        Alert.alert('Saved', 'Your settings have been updated.');
        router.back();
    };

    const Toggle = ({ value, onPress }: { value: boolean; onPress: () => void }) => (
        <TouchableOpacity
            style={[styles.toggle, value && styles.toggleActive]}
            onPress={onPress}
        >
            <View style={[styles.toggleDot, value && styles.toggleDotActive]} />
        </TouchableOpacity>
    );

    const OptionRow = ({ icon, label, value, options, onSelect }: {
        icon: string; label: string; value: string;
        options: { label: string; value: string }[];
        onSelect: (v: any) => void;
    }) => (
        <View style={styles.optionSection}>
            <Text style={styles.optionLabel}>{icon} {label}</Text>
            <View style={styles.optionRow}>
                {options.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[styles.optionChip, value === opt.value && styles.optionChipActive]}
                        onPress={() => onSelect(opt.value)}
                    >
                        <Text style={[styles.optionChipText, value === opt.value && styles.optionChipTextActive]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <TouchableOpacity onPress={handleSave}>
                    <Text style={styles.saveBtn}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Units */}
                <OptionRow
                    icon="⚖️"
                    label="Units"
                    value={units}
                    options={[{ label: 'Metric (kg/cm)', value: 'metric' }, { label: 'Imperial (lb/ft)', value: 'imperial' }]}
                    onSelect={setUnits}
                />

                {/* Theme */}
                <OptionRow
                    icon="🎨"
                    label="Theme"
                    value={theme}
                    options={[{ label: 'Dark', value: 'dark' }, { label: 'Light', value: 'light' }, { label: 'System', value: 'system' }]}
                    onSelect={setTheme}
                />

                {/* Rest Timer Default */}
                <View style={styles.optionSection}>
                    <Text style={styles.optionLabel}>⏱️ Default Rest Timer</Text>
                    <View style={styles.restTimerRow}>
                        <TouchableOpacity style={styles.restBtn} onPress={() => setRestTimer(Math.max(15, restTimer - 15))}>
                            <Ionicons name="remove" size={20} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.restValue}>{restTimer}s</Text>
                        <TouchableOpacity style={styles.restBtn} onPress={() => setRestTimer(Math.min(300, restTimer + 15))}>
                            <Ionicons name="add" size={20} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Notifications */}
                <Text style={styles.sectionTitle}>Notifications</Text>
                <Card>
                    {[
                        { key: 'workoutReminder' as const, label: 'Workout Reminders', icon: '🏋️' },
                        { key: 'mealReminder' as const, label: 'Meal Logging Reminders', icon: '🍽️' },
                        { key: 'waterReminder' as const, label: 'Water Reminders', icon: '💧' },
                        { key: 'weeklyReport' as const, label: 'Weekly Report', icon: '📊' },
                        { key: 'achievements' as const, label: 'Achievement Alerts', icon: '🏆' },
                        { key: 'socialActivity' as const, label: 'Social Activity', icon: '👥' },
                    ].map((item, idx) => (
                        <View key={item.key} style={[styles.notifRow, idx > 0 && styles.notifRowBorder]}>
                            <Text style={styles.notifLabel}>{item.icon} {item.label}</Text>
                            <Toggle value={notifications[item.key]} onPress={() => toggleNotif(item.key)} />
                        </View>
                    ))}
                </Card>

                {/* Quick Links */}
                <Text style={styles.sectionTitle}>Quick Settings</Text>
                <Card padding={0}>
                    {[
                        { icon: 'nutrition-outline' as const, label: 'Diet Plan Settings', route: '/nutrition/diet-settings' },
                        { icon: 'body-outline' as const, label: 'Body Measurements', route: '/progress/measurements' },
                        { icon: 'fitness-outline' as const, label: 'Fitness Goals', route: '/progress/create-goal' },
                        { icon: 'medical-outline' as const, label: 'Supplement Stack', route: '/recovery/supplements' },
                    ].map((item, idx) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[styles.linkRow, idx > 0 && styles.linkRowBorder]}
                            onPress={() => router.push(item.route as any)}
                        >
                            <Ionicons name={item.icon} size={20} color={Colors.textSecondary} />
                            <Text style={styles.linkLabel}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                        </TouchableOpacity>
                    ))}
                </Card>

                {/* Data & Privacy */}
                <Text style={styles.sectionTitle}>Data & Privacy</Text>
                <Card padding={0}>
                    {[
                        { icon: 'download-outline' as const, label: 'Export My Data', action: () => Alert.alert('Export', 'Your data export will be ready shortly.') },
                        { icon: 'trash-outline' as const, label: 'Clear All Data', action: () => Alert.alert('Warning', 'This will delete all your local data.', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive' }]) },
                        { icon: 'document-text-outline' as const, label: 'Privacy Policy', action: () => { } },
                        { icon: 'shield-checkmark-outline' as const, label: 'Terms of Service', action: () => { } },
                    ].map((item, idx) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[styles.linkRow, idx > 0 && styles.linkRowBorder]}
                            onPress={item.action}
                        >
                            <Ionicons name={item.icon} size={20} color={item.label.includes('Clear') ? Colors.error : Colors.textSecondary} />
                            <Text style={[styles.linkLabel, item.label.includes('Clear') && { color: Colors.error }]}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                        </TouchableOpacity>
                    ))}
                </Card>

                <Text style={styles.version}>FitFusion v5.0.0 (Phase 5)</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    saveBtn: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.xxl, marginBottom: Spacing.md },

    optionSection: { marginTop: Spacing.xl },
    optionLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
    optionRow: { flexDirection: 'row', gap: Spacing.sm },
    optionChip: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
    optionChipActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceLight },
    optionChipText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    optionChipTextActive: { color: Colors.primary },

    restTimerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
    restBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
    restValue: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, minWidth: 60, textAlign: 'center' },

    toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 3 },
    toggleActive: { backgroundColor: Colors.primary },
    toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.text },
    toggleDotActive: { alignSelf: 'flex-end' },

    notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
    notifRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
    notifLabel: { color: Colors.text, fontSize: FontSize.sm },

    linkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.md },
    linkRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
    linkLabel: { color: Colors.text, fontSize: FontSize.md, flex: 1 },

    version: { color: Colors.textTertiary, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.xxl, marginBottom: Spacing.lg },
});
