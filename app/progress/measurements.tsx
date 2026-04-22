import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { Button } from '@/components/ui';
import { useProgressStore } from '@/stores/progressStore';
import { generateId } from '@/lib/utils';
import type { BodyMeasurement } from '@/types';

const MEASUREMENT_FIELDS: { key: keyof BodyMeasurement; label: string; icon: string }[] = [
    { key: 'chest_cm', label: 'Chest', icon: '💪' },
    { key: 'shoulders_cm', label: 'Shoulders', icon: '🔝' },
    { key: 'waist_cm', label: 'Waist', icon: '📏' },
    { key: 'hips_cm', label: 'Hips', icon: '🍑' },
    { key: 'left_arm_cm', label: 'Left Arm', icon: '💪' },
    { key: 'right_arm_cm', label: 'Right Arm', icon: '💪' },
    { key: 'left_thigh_cm', label: 'Left Thigh', icon: '🦵' },
    { key: 'right_thigh_cm', label: 'Right Thigh', icon: '🦵' },
    { key: 'left_calf_cm', label: 'Left Calf', icon: '🦶' },
    { key: 'right_calf_cm', label: 'Right Calf', icon: '🦶' },
    { key: 'neck_cm', label: 'Neck', icon: '🧣' },
];

export default function MeasurementsScreen() {
    const insets = useSafeAreaInsets();
    const { addMeasurement, measurements } = useProgressStore();
    const lastMeasurement = measurements[0];

    const [values, setValues] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        MEASUREMENT_FIELDS.forEach((f) => {
            const lastVal = lastMeasurement?.[f.key];
            init[f.key] = lastVal != null ? String(lastVal) : '';
        });
        return init;
    });

    const handleSave = () => {
        const hasAnyValue = Object.values(values).some((v) => v.trim() !== '');
        if (!hasAnyValue) {
            Alert.alert('No Data', 'Enter at least one measurement');
            return;
        }

        const measurement: BodyMeasurement = {
            id: generateId(),
            user_id: '',
            logged_at: new Date().toISOString(),
            chest_cm: values.chest_cm ? parseFloat(values.chest_cm) : null,
            waist_cm: values.waist_cm ? parseFloat(values.waist_cm) : null,
            hips_cm: values.hips_cm ? parseFloat(values.hips_cm) : null,
            left_arm_cm: values.left_arm_cm ? parseFloat(values.left_arm_cm) : null,
            right_arm_cm: values.right_arm_cm ? parseFloat(values.right_arm_cm) : null,
            left_thigh_cm: values.left_thigh_cm ? parseFloat(values.left_thigh_cm) : null,
            right_thigh_cm: values.right_thigh_cm ? parseFloat(values.right_thigh_cm) : null,
            left_calf_cm: values.left_calf_cm ? parseFloat(values.left_calf_cm) : null,
            right_calf_cm: values.right_calf_cm ? parseFloat(values.right_calf_cm) : null,
            neck_cm: values.neck_cm ? parseFloat(values.neck_cm) : null,
            shoulders_cm: values.shoulders_cm ? parseFloat(values.shoulders_cm) : null,
        };

        addMeasurement(measurement);
        Alert.alert('Saved!', 'Measurements recorded', [
            { text: 'OK', onPress: () => router.back() },
        ]);
    };

    const getDelta = (key: string, currentVal: string): string | null => {
        if (!lastMeasurement || !currentVal) return null;
        const last = lastMeasurement[key as keyof BodyMeasurement] as number | null;
        if (last == null) return null;
        const current = parseFloat(currentVal);
        if (isNaN(current)) return null;
        const diff = current - last;
        if (diff === 0) return null;
        return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
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
                <Text style={styles.title}>Body Measurements</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.subtitle}>
                    Measure in centimeters. Leave blank to skip a measurement.
                </Text>

                {lastMeasurement && (
                    <View style={styles.lastDateRow}>
                        <Ionicons name="time-outline" size={14} color={Colors.textTertiary} />
                        <Text style={styles.lastDateText}>
                            Last logged: {new Date(lastMeasurement.logged_at).toLocaleDateString()}
                        </Text>
                    </View>
                )}

                {MEASUREMENT_FIELDS.map((field) => {
                    const delta = getDelta(field.key, values[field.key]);
                    return (
                        <View key={field.key} style={styles.fieldRow}>
                            <Text style={styles.fieldIcon}>{field.icon}</Text>
                            <Text style={styles.fieldLabel}>{field.label}</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.fieldInput}
                                    value={values[field.key]}
                                    onChangeText={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                                    keyboardType="decimal-pad"
                                    placeholder="—"
                                    placeholderTextColor={Colors.textTertiary}
                                />
                                <Text style={styles.unitText}>cm</Text>
                            </View>
                            {delta && (
                                <Text style={[
                                    styles.deltaText,
                                    { color: delta.startsWith('+') ? Colors.error : Colors.success },
                                ]}>
                                    {delta}
                                </Text>
                            )}
                        </View>
                    );
                })}

                <Button title="Save Measurements" onPress={handleSave} size="lg" style={{ marginTop: Spacing.xxl }} />
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
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    subtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.lg },
    lastDateRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    lastDateText: { color: Colors.textTertiary, fontSize: FontSize.xs },
    fieldRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    fieldIcon: { fontSize: 18, width: 24, textAlign: 'center' },
    fieldLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium, flex: 1 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    fieldInput: {
        width: 70, backgroundColor: Colors.surface, borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold,
        textAlign: 'center', borderWidth: 1, borderColor: Colors.border,
    },
    unitText: { color: Colors.textTertiary, fontSize: FontSize.sm },
    deltaText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 40, textAlign: 'right' },
});
