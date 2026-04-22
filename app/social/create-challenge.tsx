import { Button, Input } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { createChallenge } from '@/lib/socialDb';
import { useSocialStore } from '@/stores/socialStore';
import type { ChallengeType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const CHALLENGE_TYPES: { key: ChallengeType; label: string; icon: string; defaultUnit: string }[] = [
    { key: 'workout_count', label: 'Workout Count', icon: 'barbell', defaultUnit: 'workouts' },
    { key: 'total_volume', label: 'Total Volume', icon: 'trending-up', defaultUnit: 'kg' },
    { key: 'streak', label: 'Streak', icon: 'flame', defaultUnit: 'days' },
    { key: 'calories_burned', label: 'Calories Burned', icon: 'flash', defaultUnit: 'kcal' },
    { key: 'custom', label: 'Custom', icon: 'flag', defaultUnit: '' },
];

export default function CreateChallengeScreen() {
    const { loadChallenges } = useSocialStore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<ChallengeType>('workout_count');
    const [targetValue, setTargetValue] = useState('');
    const [unit, setUnit] = useState('workouts');
    const [durationDays, setDurationDays] = useState('7');
    const [rewardXp, setRewardXp] = useState('100');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!title.trim() || !targetValue.trim()) {
            Alert.alert('Error', 'Title and target value are required');
            return;
        }

        setLoading(true);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (parseInt(durationDays) || 7));

        const result = await createChallenge({
            title: title.trim(),
            description: description.trim() || undefined,
            challenge_type: type,
            target_value: parseFloat(targetValue) || 0,
            unit,
            end_date: endDate.toISOString().split('T')[0],
            reward_xp: parseInt(rewardXp) || 100,
        });

        setLoading(false);
        if (result) {
            await loadChallenges();
            router.back();
        } else {
            Alert.alert('Error', 'Failed to create challenge');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create Challenge</Text>
                    <View style={{ width: 40 }} />
                </View>

                <Input
                    label="Challenge Title"
                    placeholder="e.g., 30 Workouts in 30 Days"
                    value={title}
                    onChangeText={setTitle}
                />

                <Input
                    label="Description (optional)"
                    placeholder="Describe the challenge..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                />

                {/* Type selector */}
                <Text style={styles.label}>Challenge Type</Text>
                <View style={styles.typeGrid}>
                    {CHALLENGE_TYPES.map((ct) => (
                        <TouchableOpacity
                            key={ct.key}
                            style={[styles.typeCard, type === ct.key && styles.typeCardActive]}
                            onPress={() => {
                                setType(ct.key);
                                setUnit(ct.defaultUnit);
                            }}
                        >
                            <Ionicons
                                name={ct.icon as any}
                                size={20}
                                color={type === ct.key ? Colors.primary : Colors.textTertiary}
                            />
                            <Text style={[styles.typeText, type === ct.key && styles.typeTextActive]}>
                                {ct.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Input
                            label="Target"
                            placeholder="e.g., 30"
                            value={targetValue}
                            onChangeText={setTargetValue}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Input
                            label="Unit"
                            placeholder="e.g., workouts"
                            value={unit}
                            onChangeText={setUnit}
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Input
                            label="Duration (days)"
                            placeholder="7"
                            value={durationDays}
                            onChangeText={setDurationDays}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Input
                            label="Reward XP"
                            placeholder="100"
                            value={rewardXp}
                            onChangeText={setRewardXp}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <View style={styles.buttonWrap}>
                    <Button
                        title="Create Challenge"
                        onPress={handleCreate}
                        loading={loading}
                        size="lg"
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        marginBottom: Spacing.xl,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: Colors.text,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
    },
    label: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        marginBottom: Spacing.sm,
        marginTop: Spacing.md,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    typeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    typeCardActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '10',
    },
    typeText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
    },
    typeTextActive: {
        color: Colors.primary,
        fontWeight: FontWeight.semibold,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    halfInput: {
        flex: 1,
    },
    buttonWrap: {
        marginTop: Spacing.xl,
    },
});
