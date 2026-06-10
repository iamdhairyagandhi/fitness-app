import AsyncStorage from '@/lib/storage';
import { router } from 'expo-router';
import type * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';

let Notifications: typeof ExpoNotifications | null = null;

try {
    Notifications = require('expo-notifications');
} catch (error) {
    console.warn('[notifications] expo-notifications native module unavailable:', error);
}

export type NotificationPreferenceKey =
    | 'workoutReminder'
    | 'recoveryReminder'
    | 'mealReminder'
    | 'waterReminder'
    | 'weeklyReport'
    | 'achievements'
    | 'socialActivity';

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export type NotificationTimingSettings = {
    workoutHour: number;
    workoutMinute: number;
    recoveryHour: number;
    recoveryMinute: number;
    weeklyWeekday: number;
    weeklyHour: number;
    weeklyMinute: number;
    quietStartHour: number;
    quietEndHour: number;
};

export type NotificationState = {
    preferences: NotificationPreferences;
    timing: NotificationTimingSettings;
    permissionStatus: string;
    scheduledIds: Partial<Record<
        NotificationPreferenceKey
        | 'breakfastReminder'
        | 'lunchReminder'
        | 'dinnerReminder'
        | 'waterMorning'
        | 'waterAfternoon'
        | 'waterEvening',
        string
    >>;
};

const STORAGE_KEY = '@bodypilot_notification_settings';
const CHANNEL_ID = 'bodypilot-reminders';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    workoutReminder: true,
    recoveryReminder: true,
    mealReminder: false,
    waterReminder: false,
    weeklyReport: true,
    achievements: true,
    socialActivity: false,
};

export const DEFAULT_NOTIFICATION_TIMING: NotificationTimingSettings = {
    workoutHour: 18,
    workoutMinute: 30,
    recoveryHour: 8,
    recoveryMinute: 0,
    weeklyWeekday: 1,
    weeklyHour: 10,
    weeklyMinute: 0,
    quietStartHour: 21,
    quietEndHour: 8,
};

Notifications?.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

async function ensureAndroidChannel() {
    if (!Notifications) return;
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'BodyPilot reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 180, 120, 180],
        lightColor: '#A7FF00',
        sound: 'default',
    });
}

export async function getNotificationState(): Promise<NotificationState> {
    const permissions = await Notifications?.getPermissionsAsync().catch(() => null);
    const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
    if (!stored) {
        return {
            preferences: DEFAULT_NOTIFICATION_PREFERENCES,
            timing: DEFAULT_NOTIFICATION_TIMING,
            permissionStatus: permissions?.status ?? 'unknown',
            scheduledIds: {},
        };
    }

    try {
        const parsed = JSON.parse(stored) as Partial<NotificationState>;
        return {
            preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed.preferences },
            timing: { ...DEFAULT_NOTIFICATION_TIMING, ...parsed.timing },
            permissionStatus: permissions?.status ?? parsed.permissionStatus ?? 'unknown',
            scheduledIds: parsed.scheduledIds ?? {},
        };
    } catch {
        return {
            preferences: DEFAULT_NOTIFICATION_PREFERENCES,
            timing: DEFAULT_NOTIFICATION_TIMING,
            permissionStatus: permissions?.status ?? 'unknown',
            scheduledIds: {},
        };
    }
}

export async function saveNotificationState(state: NotificationState) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function requestNotificationPermissions() {
    if (!Notifications) {
        return { granted: false, status: 'native-unavailable' };
    }
    await ensureAndroidChannel();
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return existing;

    return Notifications.requestPermissionsAsync({
        ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
        },
    });
}

async function cancelIds(scheduledIds: NotificationState['scheduledIds']) {
    if (!Notifications) return;
    await Promise.all(
        Object.values(scheduledIds)
            .filter(Boolean)
            .map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined))
    );
}

async function scheduleDaily(
    identifier: string,
    hour: number,
    minute: number,
    title: string,
    body: string,
    route: string
) {
    if (!Notifications) throw new Error('Notifications native module is unavailable. Rebuild the iOS app to enable reminders.');
    return Notifications.scheduleNotificationAsync({
        identifier,
        content: {
            title,
            body,
            sound: true,
            data: { route, kind: identifier },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
            channelId: CHANNEL_ID,
        },
    });
}

async function scheduleWeekly(
    identifier: string,
    weekday: number,
    hour: number,
    minute: number,
    title: string,
    body: string,
    route: string
) {
    if (!Notifications) throw new Error('Notifications native module is unavailable. Rebuild the iOS app to enable reminders.');
    return Notifications.scheduleNotificationAsync({
        identifier,
        content: {
            title,
            body,
            sound: true,
            data: { route, kind: identifier },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour,
            minute,
            channelId: CHANNEL_ID,
        },
    });
}

function isQuietHour(hour: number, timing: NotificationTimingSettings) {
    const { quietStartHour, quietEndHour } = timing;
    if (quietStartHour === quietEndHour) return false;
    if (quietStartHour < quietEndHour) return hour >= quietStartHour && hour < quietEndHour;
    return hour >= quietStartHour || hour < quietEndHour;
}

function quietSafeTime(hour: number, minute: number, timing: NotificationTimingSettings) {
    if (!isQuietHour(hour, timing)) return { hour, minute };
    return { hour: timing.quietEndHour, minute: 0 };
}

export async function scheduleBodyPilotNotifications(
    preferences: NotificationPreferences,
    timingOverride?: Partial<NotificationTimingSettings>,
) {
    const current = await getNotificationState();
    await cancelIds(current.scheduledIds);
    const timing = { ...current.timing, ...timingOverride };

    const permissions = await requestNotificationPermissions();
    const scheduledIds: NotificationState['scheduledIds'] = {};
    if (!permissions.granted || !Notifications) {
        const nextState = { preferences, timing, permissionStatus: permissions.status, scheduledIds };
        await saveNotificationState(nextState);
        return nextState;
    }

    if (preferences.workoutReminder) {
        const workoutTime = quietSafeTime(timing.workoutHour, timing.workoutMinute, timing);
        scheduledIds.workoutReminder = await scheduleDaily(
            'workoutReminder',
            workoutTime.hour,
            workoutTime.minute,
            'Ready to train?',
            'Open BodyPilot when you are ready and start today’s workout plan.',
            '/(tabs)/workout'
        );
    }

    if (preferences.recoveryReminder) {
        const recoveryTime = quietSafeTime(timing.recoveryHour, timing.recoveryMinute, timing);
        scheduledIds.recoveryReminder = await scheduleDaily(
            'recoveryReminder',
            recoveryTime.hour,
            recoveryTime.minute,
            'Recovery check-in',
            'Log sleep, soreness, stress, and energy so today’s plan can adapt.',
            '/recovery'
        );
    }

    if (preferences.mealReminder) {
        scheduledIds.breakfastReminder = await scheduleDaily(
            'breakfastReminder',
            8,
            30,
            'Breakfast check-in',
            'Log breakfast if you want today’s macros to stay accurate.',
            '/(tabs)/nutrition'
        );
        scheduledIds.lunchReminder = await scheduleDaily(
            'lunchReminder',
            13,
            0,
            'Lunch check-in',
            'Log lunch or scan a meal in BodyPilot.',
            '/(tabs)/nutrition'
        );
        scheduledIds.dinnerReminder = await scheduleDaily(
            'dinnerReminder',
            19,
            30,
            'Close your food log',
            'Add dinner or ask Orbit to clean up anything you missed.',
            '/(tabs)/nutrition'
        );
    }

    if (preferences.waterReminder) {
        scheduledIds.waterMorning = await scheduleDaily(
            'waterMorning',
            10,
            30,
            'Hydration check',
            'Add a glass of water if you have been running dry.',
            '/(tabs)/nutrition'
        );
        scheduledIds.waterAfternoon = await scheduleDaily(
            'waterAfternoon',
            14,
            30,
            'Water nudge',
            'Quick water log now keeps the day from getting away from you.',
            '/(tabs)/nutrition'
        );
        scheduledIds.waterEvening = await scheduleDaily(
            'waterEvening',
            17,
            30,
            'Last hydration check',
            'Top off before evening so reminders stay out of your quiet hours.',
            '/(tabs)/nutrition'
        );
    }

    if (preferences.weeklyReport) {
        scheduledIds.weeklyReport = await scheduleWeekly(
            'weeklyReport',
            timing.weeklyWeekday,
            timing.weeklyHour,
            timing.weeklyMinute,
            'Your weekly BodyPilot report is ready',
            'Review training, nutrition, weight, and recovery trends.',
            '/weekly-report'
        );
    }

    const nextState = { preferences, timing, permissionStatus: permissions.status, scheduledIds };
    await saveNotificationState(nextState);
    return nextState;
}

export async function sendTestNotification() {
    await requestNotificationPermissions();
    if (!Notifications) {
        throw new Error('Notifications native module is unavailable. Rebuild the iOS app to enable reminders.');
    }
    return Notifications.scheduleNotificationAsync({
        content: {
            title: 'BodyPilot notifications are on',
            body: 'This is a local test notification.',
            sound: true,
            data: { route: '/settings', kind: 'test' },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 2,
            channelId: CHANNEL_ID,
        },
    });
}

export async function clearBodyPilotNotifications() {
    const current = await getNotificationState();
    await cancelIds(current.scheduledIds);
    const nextState = { ...current, scheduledIds: {} };
    await saveNotificationState(nextState);
    return nextState;
}

export function addNotificationRoutingListener() {
    if (!Notifications) {
        return { remove: () => { } };
    }
    return Notifications.addNotificationResponseReceivedListener((response) => {
        const route = response.notification.request.content.data?.route;
        if (typeof route === 'string') {
            router.push(route as any);
        }
    });
}
