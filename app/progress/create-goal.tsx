import { Button } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { generateId } from '@/lib/utils';
import { useProgressStore } from '@/stores/progressStore';
import type { GoalType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { toast } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GOAL_TYPES: { value: GoalType; label: string; icon: string; defaultUnit: string }[] = [
    { value: 'weight', label: 'Target Weight', icon: '⚖️', defaultUnit: 'kg' },
    { value: 'strength', label: 'Strength Goal', icon: '🏋️', defaultUnit: 'kg' },
    { value: 'body_fat', label: 'Body Fat %', icon: '📉', defaultUnit: '%' },
    { value: 'workout_count', label: 'Workout Count', icon: '💪', defaultUnit: 'workouts' },
    { value: 'streak', label: 'Streak Goal', icon: '🔥', defaultUnit: 'days' },
    { value: 'measurement', label: 'Measurement', icon: '📏', defaultUnit: 'cm' },
    { value: 'nutrition', label: 'Nutrition Goal', icon: '🥗', defaultUnit: 'days' },
    { value: 'custom', label: 'Custom Goal', icon: '🎯', defaultUnit: '' },
];

export default function CreateGoalScreen() {
    const insets = useSafeAreaInsets();
    const { addGoal } = useProgressStore();

    const [goalType, setGoalType] = useState<GoalType>('weight');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [unit, setUnit] = useState('kg');
    const [targetDate, setTargetDate] = useState('');

    const selectedType = GOAL_TYPES.find((t) => t.value === goalType)!;

    const handleTypeChange = (type: GoalType) => {
        setGoalType(type);
        const typeInfo = GOAL_TYPES.find((t) => t.value === type)!;
        setUnit(typeInfo.defaultUnit);
    };

    const handleSave = () => {
        if (!title.trim()) {
            toast.error('Missing Title', 'Enter a goal title');
            return;
        }
        if (!targetValue) {
            toast.error('Missing Target', 'Enter your target value');
            return;
        }

        addGoal({
            id: generateId(),
            user_id: '',
            title: title.trim(),
            description: description.trim() || null,
            goal_type: goalType,
            target_value: parseFloat(targetValue),
            current_value: parseFloat(currentValue) || 0,
            unit,
            start_date: new Date().toISOString(),
            target_date: targetDate ? new Date(targetDate).toISOString() : null,
            completed_at: null,
            status: 'active',
        });

        toast.success('Goal Created!', `"${title}" has been added to your goals.`);
        router.back();
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Goal</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Goal type picker */}
                <Text style={styles.sectionLabel}>Goal Type</Text>
                <View style={styles.typeGrid}>
                    {GOAL_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type.value}
                            style={[styles.typeCard, goalType === type.value && styles.typeCardActive]}
                            onPress={() => handleTypeChange(type.value)}
                        >
                            <Text style={styles.typeIcon}>{type.icon}</Text>
                            <Text style={[styles.typeLabel, goalType === type.value && styles.typeLabelActive]}>
                                {type.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Title */}
                <Text style={styles.sectionLabel}>Goal Title *</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder={`e.g. Reach ${selectedType.value === 'weight' ? '75kg' : '100kg bench press'}`}
                    placeholderTextColor={Colors.textTertiary}
                />

                {/* Description */}
                <Text style={styles.sectionLabel}>Description (optional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Why is this goal important to you?"
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    numberOfLines={3}
                />

                {/* Values */}
                <View style={styles.valueRow}>
                    <View style={styles.valueField}>
                        <Text style={styles.sectionLabel}>Current Value</Text>
                        <View style={styles.valueInputRow}>
                            <TextInput
                                style={[styles.input, styles.valueInput]}
                                value={currentValue}
                                onChangeText={setCurrentValue}
                                placeholder="0"
                                placeholderTextColor={Colors.textTertiary}
                                keyboardType="decimal-pad"
                            />
                            <Text style={styles.unitText}>{unit}</Text>
                        </View>
                    </View>
                    <View style={styles.arrowContainer}>
                        <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.valueField}>
                        <Text style={styles.sectionLabel}>Target Value *</Text>
                        <View style={styles.valueInputRow}>
                            <TextInput
                                style={[styles.input, styles.valueInput]}
                                value={targetValue}
                                onChangeText={setTargetValue}
                                placeholder="0"
                                placeholderTextColor={Colors.textTertiary}
                                keyboardType="decimal-pad"
                            />
                            <Text style={styles.unitText}>{unit}</Text>
                        </View>
                    </View>
                </View>

                {/* Target date */}
                <Text style={styles.sectionLabel}>Target Date (optional)</Text>
                <TextInput
                    style={styles.input}
                    value={targetDate}
                    onChangeText={setTargetDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textTertiary}
                />

                <Button title="Create Goal" onPress={handleSave} size="lg" style={{ marginTop: Spacing.xxl }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    },
    headerTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    sectionLabel: {
        color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium,
        marginBottom: Spacing.sm, marginTop: Spacing.lg,
    },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    typeCard: {
        width: '23%', alignItems: 'center', gap: Spacing.xs,
        paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    },
    typeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceLight },
    typeIcon: { fontSize: 22 },
    typeLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, textAlign: 'center' },
    typeLabelActive: { color: Colors.primary },
    input: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
        color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
    valueField: { flex: 1 },
    valueInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    valueInput: { flex: 1 },
    unitText: { color: Colors.textTertiary, fontSize: FontSize.md },
    arrowContainer: { paddingBottom: Spacing.md },
});
