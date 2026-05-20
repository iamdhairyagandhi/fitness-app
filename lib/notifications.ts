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
    | 'mealReminder'
    | 'waterReminder'
    | 'weeklyReport'
    | 'achievements'
    | 'socialActivity';

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export type NotificationState = {
    preferences: NotificationPreferences;
    permissionStatus: string;
    scheduledIds: Partial<Record<NotificationPreferenceKey | 'lunchReminder' | 'dinnerReminder', string>>;
};

const STORAGE_KEY = '@bodypilot_notification_settings';
const CHANNEL_ID = 'bodypilot-reminders';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    workoutReminder: true,
    mealReminder: true,
    waterReminder: false,
    weeklyReport: true,
    achievements: true,
    socialActivity: false,
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
            permissionStatus: permissions?.status ?? 'unknown',
            scheduledIds: {},
        };
    }

    try {
        const parsed = JSON.parse(stored) as Partial<NotificationState>;
        return {
            preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed.preferences },
            permissionStatus: permissions?.status ?? parsed.permissionStatus ?? 'unknown',
            scheduledIds: parsed.scheduledIds ?? {},
        };
    } catch {
        return {
            preferences: DEFAULT_NOTIFICATION_PREFERENCES,
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

export async function scheduleBodyPilotNotifications(preferences: NotificationPreferences) {
    const current = await getNotificationState();
    await cancelIds(current.scheduledIds);

    const permissions = await requestNotificationPermissions();
    const scheduledIds: NotificationState['scheduledIds'] = {};
    if (!permissions.granted || !Notifications) {
        const nextState = { preferences, permissionStatus: permissions.status, scheduledIds };
        await saveNotificationState(nextState);
        return nextState;
    }

    if (preferences.workoutReminder) {
        scheduledIds.workoutReminder = await scheduleDaily(
            'workoutReminder',
            18,
            30,
            'Ready to train?',
            'Open BodyPilot and start today’s workout plan.',
            '/(tabs)/workout'
        );
    }

    if (preferences.mealReminder) {
        scheduledIds.mealReminder = await scheduleDaily(
            'mealReminder',
            8,
            30,
            'Log breakfast',
            'Keep your macros accurate with a quick breakfast log.',
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
            'Dinner wrap-up',
            'Finish today’s food log and see your macro picture.',
            '/(tabs)/nutrition'
        );
    }

    if (preferences.waterReminder) {
        scheduledIds.waterReminder = await Notifications.scheduleNotificationAsync({
            identifier: 'waterReminder',
            content: {
                title: 'Hydration check',
                body: 'Add a glass of water and keep the streak moving.',
                sound: true,
                data: { route: '/(tabs)/nutrition', kind: 'waterReminder' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 3 * 60 * 60,
                repeats: true,
                channelId: CHANNEL_ID,
            },
        });
    }

    if (preferences.weeklyReport) {
        scheduledIds.weeklyReport = await scheduleWeekly(
            'weeklyReport',
            1,
            10,
            0,
            'Your weekly BodyPilot report is ready',
            'Review training, nutrition, weight, and recovery trends.',
            '/weekly-report'
        );
    }

    const nextState = { preferences, permissionStatus: permissions.status, scheduledIds };
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
