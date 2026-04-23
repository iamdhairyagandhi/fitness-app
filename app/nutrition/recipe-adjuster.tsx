/**
 * Recipe Macro Adjuster — Phase C #25
 *
 * Set target macros → AI adjusts ingredient amounts & suggests swaps
 */

import { Button, Card, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { adjustRecipeMacros } from '@/lib/nutritionIntelligence';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import type { Recipe, RecipeAdjustment } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RecipeAdjusterScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ recipeId?: string }>();
    const { recipes } = useMealPlanStore();

    const [selectedRecipeId, setSelectedRecipeId] = useState<string>(params.recipeId || '');
    const [showRecipePicker, setShowRecipePicker] = useState(!params.recipeId);

    // Target macros input
    const [targetCals, setTargetCals] = useState('');
    const [targetPro, setTargetPro] = useState('');
    const [targetCarbs, setTargetCarbs] = useState('');
    const [targetFat, setTargetFat] = useState('');

    const [adjustment, setAdjustment] = useState<RecipeAdjustment | null>(null);

    const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) || null;

    // Pre-fill targets when recipe selected
    const handleSelectRecipe = (recipe: Recipe) => {
        setSelectedRecipeId(recipe.id);
        setTargetCals(String(recipe.calories_per_serving));
        setTargetPro(String(recipe.protein_per_serving));
        setTargetCarbs(String(recipe.carbs_per_serving));
        setTargetFat(String(recipe.fat_per_serving));
        setShowRecipePicker(false);
        setAdjustment(null);
    };

    const handleAdjust = () => {
        if (!selectedRecipe) { toast.error('Select', 'Please select a recipe first'); return; }

        const cals = parseFloat(targetCals);
        const pro = parseFloat(targetPro);
        const carbs = parseFloat(targetCarbs);
        const fat = parseFloat(targetFat);

        if (isNaN(cals) || isNaN(pro) || isNaN(carbs) || isNaN(fat)) {
            toast.error('Invalid', 'Please enter valid macro targets');
            return;
        }

        const result = adjustRecipeMacros(selectedRecipe, {
            calories: cals,
            protein_g: pro,
            carbs_g: carbs,
            fat_g: fat,
        });
        setAdjustment(result);
    };

    // Quick presets
    const presets = useMemo(() => {
        if (!selectedRecipe) return [];
        const base = selectedRecipe.calories_per_serving;
        return [
            { label: 'High Protein', cals: base, pro: Math.round(selectedRecipe.protein_per_serving * 1.5), carbs: selectedRecipe.carbs_per_serving, fat: Math.round(selectedRecipe.fat_per_serving * 0.8) },
            { label: 'Lower Cal', cals: Math.round(base * 0.75), pro: selectedRecipe.protein_per_serving, carbs: Math.round(selectedRecipe.carbs_per_serving * 0.7), fat: Math.round(selectedRecipe.fat_per_serving * 0.7) },
            { label: 'Bulking', cals: Math.round(base * 1.3), pro: Math.round(selectedRecipe.protein_per_serving * 1.2), carbs: Math.round(selectedRecipe.carbs_per_serving * 1.4), fat: Math.round(selectedRecipe.fat_per_serving * 1.2) },
        ];
    }, [selectedRecipe]);

    const applyPreset = (preset: typeof presets[0]) => {
        setTargetCals(String(preset.cals));
        setTargetPro(String(preset.pro));
        setTargetCarbs(String(preset.carbs));
        setTargetFat(String(preset.fat));
        setAdjustment(null);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Macro Adjuster</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Recipe Picker */}
                {showRecipePicker ? (
                    <View>
                        <Text style={styles.sectionTitle}>Select a Recipe</Text>
                        {recipes.map((r) => (
                            <TouchableOpacity key={r.id} style={styles.recipeOption} onPress={() => handleSelectRecipe(r)}>
                                <View style={styles.recipeOptionInfo}>
                                    <Text style={styles.recipeOptionName}>{r.name}</Text>
                                    <Text style={styles.recipeOptionMacros}>
                                        {r.calories_per_serving} kcal • P {r.protein_per_serving}g • C {r.carbs_per_serving}g • F {r.fat_per_serving}g
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : selectedRecipe ? (
                    <>
                        {/* Selected Recipe */}
                        <Card style={styles.selectedCard}>
                            <View style={styles.selectedHeader}>
                                <View>
                                    <Text style={styles.selectedName}>{selectedRecipe.name}</Text>
                                    <Text style={styles.selectedDesc}>{selectedRecipe.description}</Text>
                                </View>
                                <TouchableOpacity onPress={() => { setShowRecipePicker(true); setAdjustment(null); }}>
                                    <Text style={styles.changeBtn}>Change</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.currentMacros}>
                                <Text style={styles.currentLabel}>Current per serving:</Text>
                                <View style={styles.macroRow}>
                                    <Text style={[styles.macroText, { color: Colors.calories }]}>{selectedRecipe.calories_per_serving} kcal</Text>
                                    <Text style={[styles.macroText, { color: Colors.protein }]}>P {selectedRecipe.protein_per_serving}g</Text>
                                    <Text style={[styles.macroText, { color: Colors.carbs }]}>C {selectedRecipe.carbs_per_serving}g</Text>
                                    <Text style={[styles.macroText, { color: Colors.fat }]}>F {selectedRecipe.fat_per_serving}g</Text>
                                </View>
                            </View>
                        </Card>

                        {/* Target Macros Input */}
                        <Text style={styles.sectionTitle}>Set Target Macros (per serving)</Text>

                        {/* Presets */}
                        <View style={styles.presetRow}>
                            {presets.map((p) => (
                                <TouchableOpacity key={p.label} style={styles.presetChip} onPress={() => applyPreset(p)}>
                                    <Text style={styles.presetText}>{p.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputCol}>
                                <Text style={[styles.inputLabel, { color: Colors.calories }]}>Calories</Text>
                                <TextInput
                                    style={styles.input}
                                    value={targetCals}
                                    onChangeText={(v) => { setTargetCals(v); setAdjustment(null); }}
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.textTertiary}
                                    placeholder="kcal"
                                />
                            </View>
                            <View style={styles.inputCol}>
                                <Text style={[styles.inputLabel, { color: Colors.protein }]}>Protein</Text>
                                <TextInput
                                    style={styles.input}
                                    value={targetPro}
                                    onChangeText={(v) => { setTargetPro(v); setAdjustment(null); }}
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.textTertiary}
                                    placeholder="g"
                                />
                            </View>
                            <View style={styles.inputCol}>
                                <Text style={[styles.inputLabel, { color: Colors.carbs }]}>Carbs</Text>
                                <TextInput
                                    style={styles.input}
                                    value={targetCarbs}
                                    onChangeText={(v) => { setTargetCarbs(v); setAdjustment(null); }}
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.textTertiary}
                                    placeholder="g"
                                />
                            </View>
                            <View style={styles.inputCol}>
                                <Text style={[styles.inputLabel, { color: Colors.fat }]}>Fat</Text>
                                <TextInput
                                    style={styles.input}
                                    value={targetFat}
                                    onChangeText={(v) => { setTargetFat(v); setAdjustment(null); }}
                                    keyboardType="numeric"
                                    placeholderTextColor={Colors.textTertiary}
                                    placeholder="g"
                                />
                            </View>
                        </View>

                        <Button
                            title="Adjust Recipe"
                            onPress={handleAdjust}
                            style={{ marginTop: Spacing.md }}
                        />

                        {/* Adjustment Results */}
                        {adjustment && (
                            <View style={styles.resultSection}>
                                <Text style={styles.sectionTitle}>Adjusted Recipe</Text>

                                {/* Macro Comparison */}
                                <Card style={styles.comparisonCard}>
                                    <View style={styles.compRow}>
                                        <Text style={styles.compHeader} />
                                        <Text style={styles.compColHeader}>Original</Text>
                                        <Text style={styles.compColHeader}>Target</Text>
                                        <Text style={styles.compColHeader}>Adjusted</Text>
                                    </View>
                                    <CompRow label="Calories" orig={selectedRecipe.calories_per_serving} target={adjustment.targetMacros.calories} adjusted={adjustment.adjustedMacros.calories} color={Colors.calories} />
                                    <CompRow label="Protein" orig={selectedRecipe.protein_per_serving} target={adjustment.targetMacros.protein_g} adjusted={adjustment.adjustedMacros.protein_g} color={Colors.protein} unit="g" />
                                    <CompRow label="Carbs" orig={selectedRecipe.carbs_per_serving} target={adjustment.targetMacros.carbs_g} adjusted={adjustment.adjustedMacros.carbs_g} color={Colors.carbs} unit="g" />
                                    <CompRow label="Fat" orig={selectedRecipe.fat_per_serving} target={adjustment.targetMacros.fat_g} adjusted={adjustment.adjustedMacros.fat_g} color={Colors.fat} unit="g" />
                                </Card>

                                {/* Adjusted Ingredients */}
                                <Text style={styles.sectionTitle}>Ingredient Adjustments</Text>
                                {adjustment.adjustedIngredients.map((ing, i) => {
                                    const changed = ing.adjustedAmount !== ing.originalAmount;
                                    return (
                                        <View key={i} style={styles.ingredientRow}>
                                            <View style={styles.ingredientInfo}>
                                                <Text style={styles.ingredientName}>{ing.name}</Text>
                                                <Text style={[styles.ingredientAmount, changed && { color: Colors.primary }]}>
                                                    {ing.originalAmount}{ing.unit}
                                                    {changed && ` → ${ing.adjustedAmount}${ing.unit}`}
                                                </Text>
                                            </View>
                                            {ing.swapSuggestion && (
                                                <View style={styles.swapBadge}>
                                                    <Ionicons name="swap-horizontal" size={12} color={Colors.secondary} />
                                                    <Text style={styles.swapText}>{ing.swapSuggestion}</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}

                                {/* Notes */}
                                {adjustment.notes.length > 0 && (
                                    <View style={styles.notesCard}>
                                        <Ionicons name="information-circle" size={18} color={Colors.primary} />
                                        <View style={{ flex: 1 }}>
                                            {adjustment.notes.map((note, i) => (
                                                <Text key={i} style={styles.noteText}>{note}</Text>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </>
                ) : null}
            </ScrollView>
        </View>
    );
}

function CompRow({ label, orig, target, adjusted, color, unit = '' }: {
    label: string; orig: number; target: number; adjusted: number; color: string; unit?: string;
}) {
    return (
        <View style={styles.compRow}>
            <Text style={[styles.compLabel, { color }]}>{label}</Text>
            <Text style={styles.compValue}>{orig}{unit}</Text>
            <Text style={styles.compValue}>{target}{unit}</Text>
            <Text style={[styles.compValue, { color, fontWeight: FontWeight.bold }]}>{adjusted}{unit}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    },
    title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },

    sectionTitle: {
        color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold,
        marginBottom: Spacing.md, marginTop: Spacing.md,
    },

    // Recipe picker
    recipeOption: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.sm,
        borderWidth: 1, borderColor: Colors.border,
    },
    recipeOptionInfo: { flex: 1 },
    recipeOptionName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
    recipeOptionMacros: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },

    // Selected recipe
    selectedCard: { marginBottom: Spacing.md },
    selectedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    selectedName: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    selectedDesc: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 2 },
    changeBtn: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    currentMacros: { marginTop: Spacing.md },
    currentLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginBottom: 4 },
    macroRow: { flexDirection: 'row', gap: Spacing.lg },
    macroText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },

    // Presets
    presetRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    presetChip: {
        backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md, paddingVertical: 6,
    },
    presetText: { color: Colors.textSecondary, fontSize: FontSize.xs },

    // Input
    inputRow: { flexDirection: 'row', gap: Spacing.sm },
    inputCol: { flex: 1 },
    inputLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginBottom: 4 },
    input: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.sm,
        borderWidth: 1, borderColor: Colors.border, color: Colors.text,
        fontSize: FontSize.md, padding: Spacing.sm, textAlign: 'center',
    },

    // Results
    resultSection: { marginTop: Spacing.lg },
    comparisonCard: { marginBottom: Spacing.md },
    compRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
        borderBottomWidth: 1, borderBottomColor: Colors.border + '30',
    },
    compHeader: { flex: 1 },
    compColHeader: { flex: 1, color: Colors.textTertiary, fontSize: FontSize.xs, textAlign: 'center' },
    compLabel: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    compValue: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },

    // Ingredients
    ingredientRow: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.sm,
        padding: Spacing.md, marginBottom: Spacing.sm,
        borderWidth: 1, borderColor: Colors.border,
    },
    ingredientInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ingredientName: { color: Colors.text, fontSize: FontSize.md },
    ingredientAmount: { color: Colors.textSecondary, fontSize: FontSize.sm },
    swapBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
        backgroundColor: Colors.secondary + '15', borderRadius: BorderRadius.xs,
        paddingHorizontal: Spacing.sm, paddingVertical: 3,
    },
    swapText: { color: Colors.secondary, fontSize: FontSize.xxs, flex: 1 },

    // Notes
    notesCard: {
        flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.primary + '10',
        borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.md,
    },
    noteText: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: 4 },
});
