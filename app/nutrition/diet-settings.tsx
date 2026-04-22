import { Button, Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { DIET_TEMPLATES, useMealPlanStore } from '@/stores/mealPlanStore';
import type { DietPhase, DietTemplate } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { toast } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PHASES: { value: DietPhase; label: string; icon: string; desc: string }[] = [
    { value: 'bulk', label: 'Bulk', icon: '📈', desc: '+10-20% calories, muscle gain focus' },
    { value: 'cut', label: 'Cut', icon: '📉', desc: '-20-25% calories, fat loss focus' },
    { value: 'maintain', label: 'Maintain', icon: '⚖️', desc: 'Maintenance calories' },
    { value: 'recomp', label: 'Recomp', icon: '🔄', desc: 'Maintenance cals, high protein' },
    { value: 'reverse_diet', label: 'Reverse', icon: '🔁', desc: 'Gradually increase from deficit' },
];

const FASTING_PROTOCOLS = [
    { label: '16:8', fast: 16, eat: 8, desc: 'Most popular, eat noon-8pm' },
    { label: '18:6', fast: 18, eat: 6, desc: 'Eat 1pm-7pm' },
    { label: '20:4', fast: 20, eat: 4, desc: 'Warrior diet, eat 4pm-8pm' },
    { label: 'OMAD', fast: 23, eat: 1, desc: 'One meal a day' },
];

export default function DietSettingsScreen() {
    const insets = useSafeAreaInsets();
    const { dietProfile, setDietProfile, setDietTemplate, setDietPhase, toggleMacroCycling } = useMealPlanStore();
    const [showAllergies, setShowAllergies] = useState(false);

    const COMMON_ALLERGIES = ['Dairy', 'Gluten', 'Nuts', 'Soy', 'Eggs', 'Shellfish', 'Fish', 'Sesame'];

    const toggleAllergy = (allergy: string) => {
        const current = dietProfile.allergies;
        const updated = current.includes(allergy)
            ? current.filter((a) => a !== allergy)
            : [...current, allergy];
        setDietProfile({ allergies: updated });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Diet Settings</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Diet Template */}
                <Text style={styles.sectionTitle}>Diet Template</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
                    {(Object.keys(DIET_TEMPLATES) as DietTemplate[]).map((key) => {
                        const t = DIET_TEMPLATES[key];
                        const isActive = dietProfile.template === key;
                        return (
                            <TouchableOpacity
                                key={key}
                                style={[styles.templateCard, isActive && styles.templateCardActive]}
                                onPress={() => setDietTemplate(key)}
                            >
                                <Text style={[styles.templateName, isActive && styles.templateNameActive]}>{t.name}</Text>
                                <Text style={styles.templateDesc}>{t.description}</Text>
                                <View style={styles.templateMacros}>
                                    <Text style={[styles.macroPill, { color: Colors.protein }]}>P {Math.round(t.protein_pct * 100)}%</Text>
                                    <Text style={[styles.macroPill, { color: Colors.carbs }]}>C {Math.round(t.carbs_pct * 100)}%</Text>
                                    <Text style={[styles.macroPill, { color: Colors.fat }]}>F {Math.round(t.fat_pct * 100)}%</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Diet Phase */}
                <Text style={styles.sectionTitle}>Current Phase</Text>
                <View style={styles.phaseGrid}>
                    {PHASES.map((p) => (
                        <TouchableOpacity
                            key={p.value}
                            style={[styles.phaseCard, dietProfile.phase === p.value && styles.phaseCardActive]}
                            onPress={() => setDietPhase(p.value)}
                        >
                            <Text style={styles.phaseIcon}>{p.icon}</Text>
                            <Text style={[styles.phaseLabel, dietProfile.phase === p.value && styles.phaseLabelActive]}>{p.label}</Text>
                            <Text style={styles.phaseDesc}>{p.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Macro Cycling */}
                <Card style={styles.optionCard}>
                    <View style={styles.optionRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.optionTitle}>Macro Cycling</Text>
                            <Text style={styles.optionDesc}>Auto-vary carbs/cals by day</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.toggle, dietProfile.macro_cycle_enabled && styles.toggleActive]}
                            onPress={() => toggleMacroCycling(!dietProfile.macro_cycle_enabled)}
                        >
                            <View style={[styles.toggleDot, dietProfile.macro_cycle_enabled && styles.toggleDotActive]} />
                        </TouchableOpacity>
                    </View>
                </Card>

                {/* Intermittent Fasting */}
                <Text style={styles.sectionTitle}>Intermittent Fasting</Text>
                <View style={styles.fastingGrid}>
                    {FASTING_PROTOCOLS.map((p) => {
                        const isActive = dietProfile.fasting_enabled &&
                            dietProfile.fasting_window_start === `${20 + 24 - p.fast}:00`;
                        return (
                            <TouchableOpacity
                                key={p.label}
                                style={[styles.fastingCard, isActive && styles.fastingCardActive]}
                                onPress={() => {
                                    setDietProfile({
                                        fasting_enabled: true,
                                        fasting_window_start: `${String(24 - p.eat).padStart(2, '0')}:00`,
                                        fasting_window_end: '12:00',
                                    });
                                }}
                            >
                                <Text style={[styles.fastingLabel, isActive && styles.fastingLabelActive]}>{p.label}</Text>
                                <Text style={styles.fastingDesc}>{p.desc}</Text>
                            </TouchableOpacity>
                        );
                    })}
                    <TouchableOpacity
                        style={[styles.fastingCard, !dietProfile.fasting_enabled && styles.fastingCardActive]}
                        onPress={() => setDietProfile({ fasting_enabled: false, fasting_window_start: null, fasting_window_end: null })}
                    >
                        <Text style={[styles.fastingLabel, !dietProfile.fasting_enabled && styles.fastingLabelActive]}>Off</Text>
                        <Text style={styles.fastingDesc}>No fasting</Text>
                    </TouchableOpacity>
                </View>

                {/* Allergies */}
                <Text style={styles.sectionTitle}>Allergies & Intolerances</Text>
                <View style={styles.allergyGrid}>
                    {COMMON_ALLERGIES.map((a) => {
                        const isActive = dietProfile.allergies.includes(a);
                        return (
                            <TouchableOpacity
                                key={a}
                                style={[styles.allergyChip, isActive && styles.allergyChipActive]}
                                onPress={() => toggleAllergy(a)}
                            >
                                <Text style={[styles.allergyText, isActive && styles.allergyTextActive]}>
                                    {isActive ? '⚠️ ' : ''}{a}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Button
                    title="Save Diet Settings"
                    onPress={() => { toast.success('Saved', 'Diet preferences updated!'); router.back(); }}
                    size="lg"
                    style={{ marginTop: Spacing.xxl }}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.xxl, marginBottom: Spacing.md },

    templateScroll: { marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg },
    templateCard: { width: 160, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginRight: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
    templateCardActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceLight },
    templateName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: 4 },
    templateNameActive: { color: Colors.primary },
    templateDesc: { color: Colors.textTertiary, fontSize: FontSize.xs, marginBottom: Spacing.sm },
    templateMacros: { flexDirection: 'row', gap: Spacing.xs },
    macroPill: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

    phaseGrid: { gap: Spacing.sm },
    phaseCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
    phaseCardActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceLight },
    phaseIcon: { fontSize: 20, marginBottom: 4 },
    phaseLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
    phaseLabelActive: { color: Colors.primary },
    phaseDesc: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },

    optionCard: { marginTop: Spacing.md },
    optionRow: { flexDirection: 'row', alignItems: 'center' },
    optionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
    optionDesc: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 2 },
    toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 3 },
    toggleActive: { backgroundColor: Colors.primary },
    toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.text },
    toggleDotActive: { alignSelf: 'flex-end' },

    fastingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    fastingCard: { width: '48%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border },
    fastingCardActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceLight },
    fastingLabel: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    fastingLabelActive: { color: Colors.primary },
    fastingDesc: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },

    allergyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    allergyChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
    allergyChipActive: { borderColor: Colors.error, backgroundColor: 'rgba(225, 112, 85, 0.15)' },
    allergyText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    allergyTextActive: { color: Colors.error },
});
