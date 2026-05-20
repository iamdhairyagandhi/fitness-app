import { Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { displayWeightFromKg, getWeightUnit, inputWeightToKg } from '@/lib/utils';
import { calculateStrengthLevels } from '@/lib/workoutIntelligence';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LEVEL_COLORS: Record<string, string> = {
    Beginner: '#9CA3AF',
    Novice: '#60A5FA',
    Intermediate: '#34D399',
    Advanced: Colors.primary,
    Elite: '#EF4444',
};

export default function StrengthStandardsScreen() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const weightUnit = getWeightUnit(user?.unit_system);
    const [bodyweight, setBodyweight] = useState(displayWeightFromKg(user?.weight_kg || 75, user?.unit_system).toString());
    const [gender, setGender] = useState<'male' | 'female'>(user?.gender === 'female' ? 'female' : 'male');
    const personalRecords = useWorkoutStore((s) => s.personalRecords);

    const bw = inputWeightToKg(parseFloat(bodyweight) || 75, user?.unit_system);
    const levels = useMemo(() => calculateStrengthLevels(personalRecords, bw, gender), [personalRecords, bw, gender]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Strength Standards</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Input controls */}
                <Card style={styles.inputCard}>
                    <View style={styles.inputRow}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Bodyweight ({weightUnit})</Text>
                            <TextInput
                                style={styles.input}
                                value={bodyweight}
                                onChangeText={setBodyweight}
                                keyboardType="numeric"
                                placeholderTextColor={Colors.textTertiary}
                            />
                        </View>
                        <View style={styles.genderToggle}>
                            <TouchableOpacity
                                style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                                onPress={() => setGender('male')}
                            >
                                <Ionicons
                                    name="male"
                                    size={18}
                                    color={gender === 'male' ? '#fff' : Colors.textSecondary}
                                />
                                <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                                    Male
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                                onPress={() => setGender('female')}
                            >
                                <Ionicons
                                    name="female"
                                    size={18}
                                    color={gender === 'female' ? '#fff' : Colors.textSecondary}
                                />
                                <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                                    Female
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Card>

                {/* Level Legend */}
                <View style={styles.legendRow}>
                    {Object.entries(LEVEL_COLORS).map(([name, color]) => (
                        <View key={name} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: color }]} />
                            <Text style={styles.legendText}>{name}</Text>
                        </View>
                    ))}
                </View>

                {/* Exercise cards */}
                {levels.map((item) => {
                    const color = LEVEL_COLORS[item.level.charAt(0).toUpperCase() + item.level.slice(1)] || Colors.textTertiary;
                    return (
                        <Card key={item.exercise} style={styles.exerciseCard}>
                            <Text style={styles.exerciseName}>{item.exercise}</Text>
                            <View style={styles.levelsRow}>
                                <View style={styles.levelCol}>
                                    <Text style={[styles.levelWeight, { color }]}>
                                        {displayWeightFromKg(item.estimated1RM, user?.unit_system, 0).toFixed(0)}
                                    </Text>
                                    <Text style={styles.levelKg}>{weightUnit} e1RM</Text>
                                </View>
                                <View style={styles.levelCol}>
                                    <Text style={[styles.levelWeight, { color }]}>
                                        {item.bodyweightRatio.toFixed(2)}x
                                    </Text>
                                    <Text style={styles.levelKg}>BW ratio</Text>
                                </View>
                                <View style={styles.levelCol}>
                                    <View style={[styles.levelIndicator, { backgroundColor: color }]} />
                                    <Text style={[styles.levelName, { color }]}>{item.level}</Text>
                                </View>
                            </View>
                            <Text style={styles.bwRatio}>
                                Next: {item.nextLevel} at {displayWeightFromKg(item.nextLevelWeight, user?.unit_system).toFixed(1)} {weightUnit}
                            </Text>
                        </Card>
                    );
                })}

                <View style={{ height: 40 }} />
            </ScrollView>
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
    inputCard: { marginBottom: Spacing.md },
    inputRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-end' },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
    input: {
        fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text,
        borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: Spacing.xs,
    },
    genderToggle: { flexDirection: 'row', gap: 4 },
    genderBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm, backgroundColor: Colors.surface,
    },
    genderBtnActive: { backgroundColor: Colors.primary },
    genderText: { fontSize: FontSize.sm, color: Colors.textSecondary },
    genderTextActive: { color: '#fff', fontWeight: FontWeight.semibold },
    legendRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
        marginBottom: Spacing.md, paddingHorizontal: Spacing.xs,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: FontSize.xs, color: Colors.textSecondary },
    exerciseCard: { marginBottom: Spacing.md },
    exerciseName: {
        fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm,
    },
    levelsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    levelCol: { alignItems: 'center', flex: 1 },
    levelWeight: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    levelKg: { fontSize: FontSize.xs, color: Colors.textTertiary },
    levelIndicator: { width: '80%', height: 4, borderRadius: 2, marginVertical: 6 },
    levelName: { fontSize: FontSize.xs, color: Colors.textSecondary },
    bwRatioRow: {
        flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs,
    },
    bwRatio: {
        flex: 1, textAlign: 'center', fontSize: FontSize.xs, color: Colors.textTertiary,
    },
});
