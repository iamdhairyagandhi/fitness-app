import { Button, Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { formatDuration } from '@/lib/utils';
import {
    calculateHRZones,
    estimateVO2MaxCooper,
    estimateVO2MaxFromRun,
    getCurrentHRZone,
} from '@/lib/workoutIntelligence';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CardioMode = 'free' | 'distance' | 'time';

interface LocationPoint {
    latitude: number;
    longitude: number;
    altitude: number | null;
    speed: number | null;
    timestamp: number;
}

function haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
): number {
    const R = 6371e3;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CardioScreen() {
    const insets = useSafeAreaInsets();
    const [mode, setMode] = useState<CardioMode>('free');
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [distance, setDistance] = useState(0);
    const [currentSpeed, setCurrentSpeed] = useState(0);
    const [avgPace, setAvgPace] = useState('--:--');
    const [route, setRoute] = useState<LocationPoint[]>([]);
    const [gpsAvailable, setGpsAvailable] = useState(false);
    const [currentHR, setCurrentHR] = useState<number | null>(null);
    const [userAge, setUserAge] = useState('30');
    const [restingHR, setRestingHR] = useState('60');
    const [targetDistanceKm, setTargetDistanceKm] = useState('5');
    const [targetTimeMinutes, setTargetTimeMinutes] = useState('30');

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const locationSubRef = useRef<{ remove: () => void } | null>(null);
    const routeRef = useRef<LocationPoint[]>([]);

    // Timer
    useEffect(() => {
        if (isRunning && !isPaused) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds((s) => s + 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, isPaused]);

    // GPS - lazy load expo-location
    const startGPS = useCallback(async () => {
        if (Platform.OS === 'web') {
            // Use browser geolocation API on web
            if ('geolocation' in navigator) {
                setGpsAvailable(true);
                const watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        const point: LocationPoint = {
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            altitude: pos.coords.altitude,
                            speed: pos.coords.speed,
                            timestamp: pos.timestamp,
                        };
                        handleNewLocation(point);
                    },
                    () => setGpsAvailable(false),
                    { enableHighAccuracy: true },
                );
                locationSubRef.current = {
                    remove: () => navigator.geolocation.clearWatch(watchId),
                };
            }
            return;
        }

        try {
            const Location = await import('expo-location' as string) as any;
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location access is needed for GPS tracking.');
                return;
            }
            setGpsAvailable(true);
            const sub = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    distanceInterval: 5,
                    timeInterval: 2000,
                },
                (loc: any) => {
                    const point: LocationPoint = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        altitude: loc.coords.altitude,
                        speed: loc.coords.speed,
                        timestamp: loc.timestamp,
                    };
                    handleNewLocation(point);
                },
            );
            locationSubRef.current = sub;
        } catch {
            setGpsAvailable(false);
        }
    }, []);

    const handleNewLocation = (point: LocationPoint) => {
        const prev = routeRef.current;
        if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const d = haversineDistance(last.latitude, last.longitude, point.latitude, point.longitude);
            if (d > 2) {
                setDistance((curr) => curr + d);
            }
        }
        routeRef.current = [...prev, point];
        setRoute([...routeRef.current]);

        if (point.speed !== null && point.speed >= 0) {
            setCurrentSpeed(point.speed * 3.6);
        }
    };

    // Pace calc
    useEffect(() => {
        if (distance > 0 && elapsedSeconds > 0) {
            const paceSecsPerKm = elapsedSeconds / (distance / 1000);
            const pMin = Math.floor(paceSecsPerKm / 60);
            const pSec = Math.round(paceSecsPerKm % 60);
            setAvgPace(`${pMin}:${pSec.toString().padStart(2, '0')}`);
        }
    }, [distance, elapsedSeconds]);

    // Auto-stop for distance/time mode
    useEffect(() => {
        if (!isRunning || isPaused) return;
        if (mode === 'distance') {
            const target = parseFloat(targetDistanceKm) * 1000;
            if (target > 0 && distance >= target) {
                handleStop();
            }
        }
        if (mode === 'time') {
            const target = parseInt(targetTimeMinutes) * 60;
            if (target > 0 && elapsedSeconds >= target) {
                handleStop();
            }
        }
    }, [distance, elapsedSeconds, isRunning, isPaused, mode]);

    const handleStart = async () => {
        setIsRunning(true);
        setIsPaused(false);
        setElapsedSeconds(0);
        setDistance(0);
        setRoute([]);
        routeRef.current = [];
        await startGPS();
    };

    const handlePause = () => setIsPaused(!isPaused);

    const handleStop = () => {
        setIsRunning(false);
        setIsPaused(false);
        if (locationSubRef.current) {
            locationSubRef.current.remove();
            locationSubRef.current = null;
        }
    };

    // HR Zones
    const age = parseInt(userAge) || 30;
    const rhr = parseInt(restingHR) || 60;
    const hrZones = calculateHRZones(age, rhr);
    const currentZone = currentHR ? getCurrentHRZone(currentHR, hrZones) : null;

    // VO2 Max (after a complete run)
    const distKm = distance / 1000;
    const vo2FromCooper =
        !isRunning && elapsedSeconds >= 720 ? estimateVO2MaxCooper(distance) : null;
    const vo2FromRun =
        !isRunning && distKm >= 1.5 && elapsedSeconds > 0
            ? estimateVO2MaxFromRun(distance, elapsedSeconds)
            : null;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Cardio</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Mode selector */}
                {!isRunning && (
                    <View style={styles.modeRow}>
                        {(['free', 'distance', 'time'] as CardioMode[]).map((m) => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                                onPress={() => setMode(m)}
                            >
                                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                                    {m === 'free' ? 'Free Run' : m === 'distance' ? 'Distance Goal' : 'Time Goal'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Target inputs */}
                {!isRunning && mode === 'distance' && (
                    <Card style={styles.targetCard}>
                        <Text style={styles.targetLabel}>Target Distance (km)</Text>
                        <TextInput
                            style={styles.targetInput}
                            value={targetDistanceKm}
                            onChangeText={setTargetDistanceKm}
                            keyboardType="numeric"
                            placeholder="5"
                            placeholderTextColor={Colors.textTertiary}
                        />
                    </Card>
                )}
                {!isRunning && mode === 'time' && (
                    <Card style={styles.targetCard}>
                        <Text style={styles.targetLabel}>Target Time (minutes)</Text>
                        <TextInput
                            style={styles.targetInput}
                            value={targetTimeMinutes}
                            onChangeText={setTargetTimeMinutes}
                            keyboardType="numeric"
                            placeholder="30"
                            placeholderTextColor={Colors.textTertiary}
                        />
                    </Card>
                )}

                {/* Stats Dashboard */}
                <View style={styles.statsGrid}>
                    <Card style={styles.statCard}>
                        <Ionicons name="time" size={24} color={Colors.primary} />
                        <Text style={styles.statValue}>{formatDuration(elapsedSeconds)}</Text>
                        <Text style={styles.statLabel}>Duration</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <Ionicons name="navigate" size={24} color={Colors.accent} />
                        <Text style={styles.statValue}>{(distance / 1000).toFixed(2)}</Text>
                        <Text style={styles.statLabel}>km</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <Ionicons name="speedometer" size={24} color={Colors.warning} />
                        <Text style={styles.statValue}>{avgPace}</Text>
                        <Text style={styles.statLabel}>min/km</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <Ionicons name="flash" size={24} color={Colors.success} />
                        <Text style={styles.statValue}>{currentSpeed.toFixed(1)}</Text>
                        <Text style={styles.statLabel}>km/h</Text>
                    </Card>
                </View>

                {/* GPS Status */}
                <View style={styles.gpsRow}>
                    <Ionicons
                        name={gpsAvailable ? 'locate' : 'locate-outline'}
                        size={16}
                        color={gpsAvailable ? Colors.success : Colors.textTertiary}
                    />
                    <Text style={[styles.gpsText, gpsAvailable && { color: Colors.success }]}>
                        GPS {gpsAvailable ? 'Active' : 'Inactive'}
                    </Text>
                    <Text style={styles.gpsPoints}>{route.length} points</Text>
                </View>

                {/* Heart Rate Zone */}
                <Card style={styles.hrCard}>
                    <Text style={styles.sectionTitle}>Heart Rate Zones</Text>
                    <View style={styles.ageRow}>
                        <Text style={styles.ageLabel}>Age:</Text>
                        <TextInput
                            style={styles.ageInput}
                            value={userAge}
                            onChangeText={setUserAge}
                            keyboardType="numeric"
                        />
                        <Text style={styles.ageLabel}>Rest HR:</Text>
                        <TextInput
                            style={styles.ageInput}
                            value={restingHR}
                            onChangeText={setRestingHR}
                            keyboardType="numeric"
                            placeholder="60"
                            placeholderTextColor={Colors.textTertiary}
                        />
                        <Text style={styles.ageLabel}>HR:</Text>
                        <TextInput
                            style={styles.ageInput}
                            value={currentHR?.toString() || ''}
                            onChangeText={(t) => setCurrentHR(parseInt(t) || null)}
                            keyboardType="numeric"
                            placeholder="BPM"
                            placeholderTextColor={Colors.textTertiary}
                        />
                    </View>
                    {hrZones.zones.map((z) => {
                        const isActive = currentZone?.name === z.name;
                        return (
                            <View
                                key={z.name}
                                style={[styles.zoneRow, isActive && styles.zoneRowActive]}
                            >
                                <View style={[styles.zoneDot, { backgroundColor: z.color }]} />
                                <Text style={[styles.zoneName, isActive && styles.zoneNameActive]}>
                                    {z.name}
                                </Text>
                                <Text style={styles.zoneRange}>
                                    {z.minBPM}–{z.maxBPM} bpm
                                </Text>
                            </View>
                        );
                    })}
                </Card>

                {/* VO2 Max Results (after stop) */}
                {!isRunning && (vo2FromCooper !== null || vo2FromRun !== null) && (
                    <Card style={styles.vo2Card}>
                        <Text style={styles.sectionTitle}>VO₂ Max Estimate</Text>
                        {vo2FromRun !== null && (
                            <View style={styles.vo2Row}>
                                <Text style={styles.vo2Value}>{vo2FromRun.value.toFixed(1)}</Text>
                                <View>
                                    <Text style={styles.vo2Label}>ml/kg/min</Text>
                                    <Text style={styles.vo2Level}>{vo2FromRun.fitnessLevel}</Text>
                                </View>
                            </View>
                        )}
                        {vo2FromCooper !== null && (
                            <View style={styles.vo2Row}>
                                <Text style={styles.vo2Value}>{vo2FromCooper.value.toFixed(1)}</Text>
                                <View>
                                    <Text style={styles.vo2Label}>Cooper Test</Text>
                                    <Text style={styles.vo2Level}>{vo2FromCooper.fitnessLevel}</Text>
                                </View>
                            </View>
                        )}
                    </Card>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Controls */}
            <View style={[styles.controlBar, { paddingBottom: insets.bottom + Spacing.md }]}>
                {!isRunning ? (
                    <Button title="Start Run" onPress={handleStart} />
                ) : (
                    <View style={styles.controlRow}>
                        <TouchableOpacity
                            style={[styles.controlBtn, styles.pauseBtn]}
                            onPress={handlePause}
                        >
                            <Ionicons
                                name={isPaused ? 'play' : 'pause'}
                                size={28}
                                color="#fff"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.controlBtn, styles.stopBtn]}
                            onPress={handleStop}
                        >
                            <Ionicons name="stop" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
    content: { flex: 1, paddingHorizontal: Spacing.md },
    modeRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md },
    modeBtn: {
        flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface, alignItems: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },
    modeBtnActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
    modeBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
    modeBtnTextActive: { color: Colors.primary },
    targetCard: { marginBottom: Spacing.md },
    targetLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
    targetInput: {
        fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text,
        borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: Spacing.xs,
    },
    statsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md,
    },
    statCard: {
        flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.xs,
    },
    statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text },
    statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
    gpsRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md,
        paddingHorizontal: Spacing.xs,
    },
    gpsText: { fontSize: FontSize.xs, color: Colors.textTertiary },
    gpsPoints: { fontSize: FontSize.xs, color: Colors.textTertiary, marginLeft: 'auto' },
    hrCard: { marginBottom: Spacing.md },
    sectionTitle: {
        fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm,
    },
    ageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    ageLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
    ageInput: {
        width: 60, fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text,
        borderBottomWidth: 1, borderBottomColor: Colors.border, textAlign: 'center',
        paddingVertical: 2,
    },
    zoneRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: 2,
    },
    zoneRowActive: { backgroundColor: Colors.primary + '15' },
    zoneDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.sm },
    zoneName: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
    zoneNameActive: { color: Colors.text, fontWeight: FontWeight.semibold },
    zoneRange: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
    vo2Card: { marginBottom: Spacing.md },
    vo2Row: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    vo2Value: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.primary },
    vo2Label: { fontSize: FontSize.sm, color: Colors.textSecondary },
    vo2Level: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.success },
    controlBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
        backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    controlRow: {
        flexDirection: 'row', gap: Spacing.md, justifyContent: 'center',
    },
    controlBtn: {
        width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    },
    pauseBtn: { backgroundColor: Colors.warning },
    stopBtn: { backgroundColor: Colors.error },
});
