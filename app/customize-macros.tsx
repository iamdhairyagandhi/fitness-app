import { Button, Card, Input, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomizeMacrosScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { user, updateUser } = useAuthStore();
    const [calorieTarget, setCalorieTarget] = useState(String(user?.daily_calorie_target || 2200));
    const [proteinTarget, setProteinTarget] = useState(String(user?.protein_target_g || 165));
    const [carbsTarget, setCarbsTarget] = useState(String(user?.carbs_target_g || 220));
    const [fatTarget, setFatTarget] = useState(String(user?.fat_target_g || 73));
    const [waterTarget, setWaterTarget] = useState(String(user?.water_goal_ml || 2500));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setCalorieTarget(String(user?.daily_calorie_target || 2200));
        setProteinTarget(String(user?.protein_target_g || 165));
        setCarbsTarget(String(user?.carbs_target_g || 220));
        setFatTarget(String(user?.fat_target_g || 73));
        setWaterTarget(String(user?.water_goal_ml || 2500));
    }, [user?.carbs_target_g, user?.daily_calorie_target, user?.fat_target_g, user?.protein_target_g, user?.water_goal_ml]);

    const macroCalories = useMemo(() => {
        return Math.round((Number(proteinTarget) || 0) * 4 + (Number(carbsTarget) || 0) * 4 + (Number(fatTarget) || 0) * 9);
    }, [carbsTarget, fatTarget, proteinTarget]);

    const saveTargets = () => {
        const updates = {
            daily_calorie_target: Math.round(Number(calorieTarget)),
            protein_target_g: Math.round(Number(proteinTarget)),
            carbs_target_g: Math.round(Number(carbsTarget)),
            fat_target_g: Math.round(Number(fatTarget)),
            water_goal_ml: Math.round(Number(waterTarget)),
        };

        if (Object.values(updates).some((value) => !Number.isFinite(value) || value <= 0)) {
            toast.error('Check targets', 'Calories, macros, and water must be positive numbers.');
            return;
        }

        setSaving(true);
        updateUser(updates);
        setSaving(false);
        toast.success('Macros saved', 'Your custom targets were updated.');
        router.back();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.headerButton, { backgroundColor: colors.surface }]}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Customize Macros</Text>
                <TouchableOpacity onPress={saveTargets} disabled={saving}>
                    <Text style={[styles.saveText, { color: colors.primary }, saving && { opacity: 0.5 }]}>Save</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Card style={{ ...styles.heroCard, backgroundColor: colors.surface, borderColor: colors.border }}>
                        <View style={[styles.heroIcon, { backgroundColor: colors.primary + '18' }]}>
                            <Ionicons name="options-outline" size={24} color={colors.primary} />
                        </View>
                        <Text style={[styles.heroTitle, { color: colors.text }]}>Daily nutrition targets</Text>
                        <Text style={[styles.heroText, { color: colors.textSecondary }]}>
                            These values drive your home dashboard, nutrition rings, AI meal plans, IIFYM suggestions, and coaching context.
                        </Text>
                    </Card>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Energy Target</Text>
                    <Card>
                        <Input
                            label="Calories"
                            placeholder="2200"
                            value={calorieTarget}
                            onChangeText={(text) => setCalorieTarget(text.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            maxLength={5}
                            leftIcon={<Ionicons name="flame-outline" size={20} color={colors.textTertiary} />}
                        />
                    </Card>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Macro Targets</Text>
                    <Card>
                        <View style={styles.inputRow}>
                            <View style={styles.inputHalf}>
                                <Input
                                    label="Protein (g)"
                                    placeholder="165"
                                    value={proteinTarget}
                                    onChangeText={(text) => setProteinTarget(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    maxLength={4}
                                />
                            </View>
                            <View style={styles.inputHalf}>
                                <Input
                                    label="Carbs (g)"
                                    placeholder="220"
                                    value={carbsTarget}
                                    onChangeText={(text) => setCarbsTarget(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    maxLength={4}
                                />
                            </View>
                        </View>
                        <Input
                            label="Fat (g)"
                            placeholder="73"
                            value={fatTarget}
                            onChangeText={(text) => setFatTarget(text.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            maxLength={4}
                        />
                        <View style={[styles.mathCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Text style={[styles.mathTitle, { color: colors.text }]}>Macro calorie check</Text>
                            <Text style={[styles.mathText, { color: colors.textSecondary }]}>
                                Protein and carbs use 4 kcal per gram. Fat uses 9 kcal per gram. Your macros equal about {macroCalories} kcal.
                            </Text>
                        </View>
                    </Card>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Hydration</Text>
                    <Card>
                        <Input
                            label="Water (ml)"
                            placeholder="2500"
                            value={waterTarget}
                            onChangeText={(text) => setWaterTarget(text.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            maxLength={5}
                            leftIcon={<Ionicons name="water-outline" size={20} color={colors.textTertiary} />}
                        />
                    </Card>

                    <Button title="Save Macro Targets" onPress={saveTargets} loading={saving} size="lg" />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    saveText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    heroCard: {
        borderWidth: 1,
        marginTop: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    heroIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    heroTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.heavy },
    heroText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginTop: Spacing.sm },
    sectionTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    inputRow: { flexDirection: 'row', gap: Spacing.md },
    inputHalf: { flex: 1 },
    mathCard: {
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    mathTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    mathText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 19, marginTop: 4 },
});
