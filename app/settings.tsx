import { Card, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { ThemeScheme, useTheme } from '@/contexts/ThemeContext';
import { buildMeasurementsExport, buildWorkoutExport, exportData } from '@/lib/export';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    NotificationPreferenceKey,
    NotificationPreferences,
    clearBodyPilotNotifications,
    getNotificationState,
    scheduleBodyPilotNotifications,
    sendTestNotification,
} from '@/lib/notifications';
import { useAuthStore } from '@/stores/authStore';
import { useProgressStore } from '@/stores/progressStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type UnitSystem = 'metric' | 'imperial';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { user, updateUser } = useAuthStore();
    const { mode: theme, scheme, schemes, setMode: setTheme, setScheme, colors } = useTheme();
    const recentWorkouts = useWorkoutStore((s) => s.recentWorkouts);
    const weightEntries = useProgressStore((s) => s.weightEntries);

    const [units, setUnits] = useState<UnitSystem>(user?.unit_system || 'metric');
    const [restTimer, setRestTimer] = useState(user?.preferred_rest_seconds || 90);
    const [notifications, setNotifications] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
    const [notificationStatus, setNotificationStatus] = useState<string>('unknown');
    const [notificationBusy, setNotificationBusy] = useState(false);

    const syncNotifications = async (next: NotificationPreferences) => {
        setNotificationBusy(true);
        try {
            const state = await scheduleBodyPilotNotifications(next);
            setNotifications(state.preferences);
            setNotificationStatus(state.permissionStatus);
            if (state.permissionStatus === 'granted') {
                toast.success('Notifications updated', 'BodyPilot reminders are scheduled.');
            } else if (state.permissionStatus === 'native-unavailable') {
                toast.info('Rebuild needed', 'Notifications are installed in JS. Rebuild the iOS app to enable native reminders.');
            } else {
                toast.info('Permission needed', 'Enable notifications in iOS Settings to receive reminders.');
            }
        } catch (error) {
            console.warn('Notification sync failed:', error);
            toast.error('Notification Error', 'Could not update notification reminders.');
        } finally {
            setNotificationBusy(false);
        }
    };

    const toggleNotif = (key: NotificationPreferenceKey) => {
        const next = { ...notifications, [key]: !notifications[key] };
        setNotifications(next);
        syncNotifications(next);
    };

    useEffect(() => {
        setUnits(user?.unit_system || 'metric');
        setRestTimer(user?.preferred_rest_seconds || 90);
    }, [user?.preferred_rest_seconds, user?.unit_system]);

    useEffect(() => {
        getNotificationState()
            .then((state) => {
                setNotifications(state.preferences);
                setNotificationStatus(state.permissionStatus);
            })
            .catch(() => { });
    }, []);

    const handleSave = () => {
        updateUser({
            unit_system: units,
            preferred_rest_seconds: restTimer,
        });
        toast.success('Saved', 'Your settings have been updated.');
        router.back();
    };

    const Toggle = ({ value, onPress }: { value: boolean; onPress: () => void }) => (
        <TouchableOpacity
            style={[styles.toggle, { backgroundColor: colors.surfaceLight }, value && styles.toggleActive, value && { backgroundColor: colors.primary }]}
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
            <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>{icon} {label}</Text>
            <View style={styles.optionRow}>
                {options.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[styles.optionChip, { backgroundColor: colors.surface, borderColor: colors.border }, value === opt.value && styles.optionChipActive, value === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => onSelect(opt.value)}
                    >
                        <Text style={[styles.optionChipText, { color: colors.textSecondary }, value === opt.value && styles.optionChipTextActive, value === opt.value && { color: colors.textInverse }]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
                <TouchableOpacity onPress={handleSave}>
                    <Text style={[styles.saveBtn, { color: colors.primary }]}>Save</Text>
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

                <View style={styles.optionSection}>
                    <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>🌈 Color Scheme</Text>
                    <View style={styles.schemeGrid}>
                        {schemes.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.schemeCard, { backgroundColor: colors.surface, borderColor: colors.border }, scheme === item.id && styles.schemeCardActive, scheme === item.id && { borderColor: colors.primary }]}
                                onPress={() => setScheme(item.id as ThemeScheme)}
                                activeOpacity={0.82}
                            >
                                <View style={styles.schemeSwatches}>
                                    <View style={[styles.schemeSwatch, { backgroundColor: item.colors.background, borderColor: item.colors.border }]} />
                                    <View style={[styles.schemeSwatch, { backgroundColor: item.colors.surface }]} />
                                    <View style={[styles.schemeSwatch, { backgroundColor: item.colors.primary }]} />
                                </View>
                                <Text style={[styles.schemeName, scheme === item.id && styles.schemeNameActive]}>
                                    {item.name}
                                </Text>
                                <Text style={styles.schemeDescription} numberOfLines={2}>
                                    {item.description}
                                </Text>
                                <Text style={styles.schemeTone}>{item.tone}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Rest Timer Default */}
                <View style={styles.optionSection}>
                    <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>⏱️ Default Rest Timer</Text>
                    <View style={styles.restTimerRow}>
                        <TouchableOpacity style={[styles.restBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setRestTimer(Math.max(15, restTimer - 15))}>
                            <Ionicons name="remove" size={20} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.restValue, { color: colors.text }]}>{restTimer}s</Text>
                        <TouchableOpacity style={[styles.restBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setRestTimer(Math.min(300, restTimer + 15))}>
                            <Ionicons name="add" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Notifications */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
                <Card>
                    <View style={styles.notificationHeader}>
                        <View>
                            <Text style={[styles.notificationTitle, { color: colors.text }]}>Local reminders</Text>
                            <Text style={[styles.notificationSubtitle, { color: colors.textTertiary }]}>
                                Status: {notificationStatus}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.testButton, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '12' }]}
                            disabled={notificationBusy}
                            onPress={async () => {
                                setNotificationBusy(true);
                                try {
                                    await sendTestNotification();
                                    const state = await getNotificationState();
                                    setNotificationStatus(state.permissionStatus);
                                    toast.success('Test scheduled', 'A notification should arrive in a couple seconds.');
                                } catch (error) {
                                    console.warn('Test notification failed:', error);
                                    toast.error('Notification Error', 'Could not schedule a test notification.');
                                } finally {
                                    setNotificationBusy(false);
                                }
                            }}
                        >
                            <Text style={[styles.testButtonText, { color: colors.primary }]}>Test</Text>
                        </TouchableOpacity>
                    </View>
                    {[
                        { key: 'workoutReminder' as const, label: 'Workout Reminders', icon: '🏋️' },
                        { key: 'mealReminder' as const, label: 'Meal Logging Reminders', icon: '🍽️' },
                        { key: 'waterReminder' as const, label: 'Water Reminders', icon: '💧' },
                        { key: 'weeklyReport' as const, label: 'Weekly Report', icon: '📊' },
                        { key: 'achievements' as const, label: 'Achievement Alerts', icon: '🏆' },
                        { key: 'socialActivity' as const, label: 'Social Activity', icon: '👥' },
                    ].map((item, idx) => (
                        <View key={item.key} style={[styles.notifRow, idx > 0 && styles.notifRowBorder, idx > 0 && { borderTopColor: colors.border }]}>
                            <Text style={[styles.notifLabel, { color: colors.text }]}>{item.icon} {item.label}</Text>
                            <Toggle value={notifications[item.key]} onPress={() => toggleNotif(item.key)} />
                        </View>
                    ))}
                    <TouchableOpacity
                        style={[styles.clearNotificationsButton, { borderTopColor: colors.border }]}
                        disabled={notificationBusy}
                        onPress={async () => {
                            setNotificationBusy(true);
                            try {
                                const state = await clearBodyPilotNotifications();
                                setNotificationStatus(state.permissionStatus);
                                toast.success('Cleared', 'All scheduled reminders were cancelled.');
                            } catch (error) {
                                console.warn('Clear notifications failed:', error);
                                toast.error('Notification Error', 'Could not clear scheduled reminders.');
                            } finally {
                                setNotificationBusy(false);
                            }
                        }}
                    >
                        <Text style={[styles.clearNotificationsText, { color: colors.textSecondary }]}>Clear scheduled reminders</Text>
                    </TouchableOpacity>
                </Card>

                {/* Quick Links */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Settings</Text>
                <Card padding={0}>
                    {[
                        { icon: 'nutrition-outline' as const, label: 'Diet Plan Settings', route: '/nutrition/diet-settings' },
                        { icon: 'body-outline' as const, label: 'Body Measurements', route: '/progress/measurements' },
                        { icon: 'fitness-outline' as const, label: 'Fitness Goals', route: '/progress/create-goal' },
                        { icon: 'medical-outline' as const, label: 'Supplement Stack', route: '/recovery/supplements' },
                    ].map((item, idx) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[styles.linkRow, idx > 0 && styles.linkRowBorder, idx > 0 && { borderTopColor: colors.border }]}
                            onPress={() => router.push(item.route as any)}
                        >
                            <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                            <Text style={[styles.linkLabel, { color: colors.text }]}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                        </TouchableOpacity>
                    ))}
                </Card>

                {/* Data & Privacy */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Data & Privacy</Text>
                <Card padding={0}>
                    {[
                        {
                            icon: 'download-outline' as const, label: 'Export My Data', action: async () => {
                                const today = new Date().toISOString().split('T')[0];
                                const workouts = buildWorkoutExport(recentWorkouts);
                                const measurements = buildMeasurementsExport(weightEntries);
                                const allData = [...workouts.map((w) => ({ type: 'workout', ...w })), ...measurements.map((m) => ({ type: 'measurement', ...m }))];
                                if (allData.length === 0) { toast.info('No Data', 'No data to export yet.'); return; }
                                const ok = await exportData({ format: 'csv', filename: `bodypilot-export-${today}`, data: allData });
                                if (ok) toast.success('Exported!', 'Your data has been exported.');
                                else toast.error('Export Failed', 'Could not export data.');
                            }
                        },
                        { icon: 'trash-outline' as const, label: 'Clear All Data', action: () => toast.confirm({ title: 'Warning', message: 'This will delete all your local data.', confirmLabel: 'Delete', destructive: true, onConfirm: () => { } }) },
                        { icon: 'document-text-outline' as const, label: 'Privacy Policy', action: () => { } },
                        { icon: 'shield-checkmark-outline' as const, label: 'Terms of Service', action: () => { } },
                    ].map((item, idx) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[styles.linkRow, idx > 0 && styles.linkRowBorder, idx > 0 && { borderTopColor: colors.border }]}
                            onPress={item.action}
                        >
                            <Ionicons name={item.icon} size={20} color={item.label.includes('Clear') ? colors.error : colors.textSecondary} />
                            <Text style={[styles.linkLabel, { color: colors.text }, item.label.includes('Clear') && { color: colors.error }]}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                        </TouchableOpacity>
                    ))}
                </Card>

                <Text style={[styles.version, { color: colors.textTertiary }]}>BodyPilot v6.0.0 (Phase A)</Text>
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

    schemeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    schemeCard: {
        width: '48%',
        minHeight: 132,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.border,
        padding: Spacing.md,
    },
    schemeCardActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.surfaceLight,
    },
    schemeSwatches: {
        flexDirection: 'row',
        marginBottom: Spacing.md,
    },
    schemeSwatch: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        marginRight: -5,
    },
    schemeName: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        marginBottom: 3,
    },
    schemeNameActive: {
        color: Colors.primary,
    },
    schemeDescription: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        lineHeight: 16,
        minHeight: 32,
    },
    schemeTone: {
        color: Colors.textTertiary,
        fontSize: FontSize.xxs,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
        marginTop: Spacing.sm,
    },

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
    notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Spacing.md },
    notificationTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    notificationSubtitle: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2, textTransform: 'capitalize' },
    testButton: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    testButtonText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    clearNotificationsButton: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, marginTop: Spacing.xs },
    clearNotificationsText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, textAlign: 'center' },

    linkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.md },
    linkRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
    linkLabel: { color: Colors.text, fontSize: FontSize.md, flex: 1 },

    version: { color: Colors.textTertiary, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.xxl, marginBottom: Spacing.lg },
});
