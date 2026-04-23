/**
 * Natural Language Food Logging — Phase C #18
 *
 * Type or speak a food description → AI parses items → review → log
 */

import { Button, toast } from '@/components/ui';
import { OPENAI_API_KEY } from '@/constants/config';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import {
    parseNaturalLanguageFood,
    parseNaturalLanguageFoodDemo,
} from '@/lib/nutritionIntelligence';
import { generateId } from '@/lib/utils';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { MealType, NLPFoodParseResult } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MEAL_OPTIONS: { label: string; value: MealType; icon: string }[] = [
    { label: 'Breakfast', value: 'breakfast', icon: '🌅' },
    { label: 'Lunch', value: 'lunch', icon: '☀️' },
    { label: 'Dinner', value: 'dinner', icon: '🌙' },
    { label: 'Snack', value: 'snack', icon: '🍿' },
];

const QUICK_EXAMPLES = [
    '2 eggs with toast and coffee',
    'Chicken breast with rice and broccoli',
    'Protein shake with a banana',
    'Greek yogurt with berries and oats',
    'Salmon with sweet potato',
];

export default function NLPFoodLogScreen() {
    const insets = useSafeAreaInsets();
    const { logFood } = useNutritionStore();

    const [text, setText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [result, setResult] = useState<NLPFoodParseResult | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

    const handleParse = async () => {
        if (!text.trim()) return;

        setIsParsing(true);
        setResult(null);

        try {
            let parsed: NLPFoodParseResult;
            if (OPENAI_API_KEY) {
                parsed = await parseNaturalLanguageFood(text.trim());
            } else {
                parsed = parseNaturalLanguageFoodDemo(text.trim());
            }
            setResult(parsed);
            // Select all items by default
            setSelectedItems(new Set(parsed.items.map((_, i) => i)));
        } catch {
            toast.error('Error', 'Failed to parse food description');
        } finally {
            setIsParsing(false);
        }
    };

    const toggleItem = (index: number) => {
        setSelectedItems((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const handleLogSelected = () => {
        if (!result) return;

        let count = 0;
        for (const idx of selectedItems) {
            const item = result.items[idx];
            if (!item) continue;

            logFood(
                {
                    id: generateId(),
                    name: item.name,
                    brand: 'AI Parsed',
                    barcode: null,
                    serving_size_g: item.quantity,
                    serving_unit: item.unit,
                    calories: item.calories,
                    protein_g: item.protein_g,
                    carbs_g: item.carbs_g,
                    fat_g: item.fat_g,
                    fiber_g: item.fiber_g,
                    sugar_g: null,
                    sodium_mg: null,
                    is_custom: false,
                    user_id: null,
                    image_url: null,
                },
                1,
                selectedMeal,
            );
            count++;
        }

        if (count > 0) {
            toast.success('Logged!', `${count} item${count > 1 ? 's' : ''} added to ${selectedMeal}`);
            router.back();
        }
    };

    const totalSelected = result
        ? result.items.filter((_, i) => selectedItems.has(i))
        : [];
    const totalCals = totalSelected.reduce((s, f) => s + f.calories, 0);
    const totalPro = totalSelected.reduce((s, f) => s + f.protein_g, 0);

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
                <Text style={styles.title}>Quick Log</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Input */}
                <Text style={styles.subtitle}>Describe what you ate</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.textInput}
                        value={text}
                        onChangeText={setText}
                        placeholder="e.g., 2 eggs with toast and coffee"
                        placeholderTextColor={Colors.textTertiary}
                        multiline
                        maxLength={500}
                    />
                </View>

                {/* Quick Examples */}
                {!result && (
                    <View style={styles.examplesSection}>
                        <Text style={styles.examplesLabel}>Try these:</Text>
                        <View style={styles.examplesWrap}>
                            {QUICK_EXAMPLES.map((ex) => (
                                <TouchableOpacity
                                    key={ex}
                                    style={styles.exampleChip}
                                    onPress={() => setText(ex)}
                                >
                                    <Text style={styles.exampleText}>{ex}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Parse Button */}
                <Button
                    title={isParsing ? 'Analyzing...' : 'Analyze Food'}
                    onPress={handleParse}
                    disabled={!text.trim() || isParsing}
                    style={{ marginTop: Spacing.md }}
                />

                {isParsing && (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={Colors.primary} />
                        <Text style={styles.loadingText}>Parsing your food description...</Text>
                    </View>
                )}

                {/* Results */}
                {result && result.items.length > 0 && (
                    <View style={styles.resultSection}>
                        <Text style={styles.resultTitle}>
                            Found {result.items.length} item{result.items.length > 1 ? 's' : ''}
                        </Text>

                        {/* Meal Selector */}
                        <View style={styles.mealRow}>
                            {MEAL_OPTIONS.map((m) => (
                                <TouchableOpacity
                                    key={m.value}
                                    style={[styles.mealChip, selectedMeal === m.value && styles.mealChipActive]}
                                    onPress={() => setSelectedMeal(m.value)}
                                >
                                    <Text style={styles.mealIcon}>{m.icon}</Text>
                                    <Text style={[styles.mealLabel, selectedMeal === m.value && styles.mealLabelActive]}>
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Food Items */}
                        {result.items.map((item, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.foodCard, selectedItems.has(i) && styles.foodCardSelected]}
                                onPress={() => toggleItem(i)}
                            >
                                <View style={styles.foodCardLeft}>
                                    <Ionicons
                                        name={selectedItems.has(i) ? 'checkbox' : 'square-outline'}
                                        size={22}
                                        color={selectedItems.has(i) ? Colors.primary : Colors.textTertiary}
                                    />
                                    <View style={styles.foodInfo}>
                                        <Text style={styles.foodName}>{item.name}</Text>
                                        <Text style={styles.foodServing}>
                                            {item.quantity} {item.unit}
                                        </Text>
                                        <View style={styles.macroRow}>
                                            <Text style={[styles.macroText, { color: Colors.calories }]}>{item.calories} kcal</Text>
                                            <Text style={[styles.macroText, { color: Colors.protein }]}>P {item.protein_g}g</Text>
                                            <Text style={[styles.macroText, { color: Colors.carbs }]}>C {item.carbs_g}g</Text>
                                            <Text style={[styles.macroText, { color: Colors.fat }]}>F {item.fat_g}g</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.confidenceBadge}>
                                    <Text style={styles.confidenceText}>
                                        {Math.round(item.confidence * 100)}%
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}

                        {/* Summary */}
                        <View style={styles.summaryBar}>
                            <Text style={styles.summaryText}>
                                {selectedItems.size} selected — {totalCals} kcal — {Math.round(totalPro)}g protein
                            </Text>
                        </View>

                        <Button
                            title={`Log ${selectedItems.size} Item${selectedItems.size !== 1 ? 's' : ''}`}
                            onPress={handleLogSelected}
                            disabled={selectedItems.size === 0}
                            style={{ marginTop: Spacing.md }}
                        />
                    </View>
                )}

                {result && result.items.length === 0 && (
                    <View style={styles.emptyResult}>
                        <Ionicons name="alert-circle-outline" size={40} color={Colors.textTertiary} />
                        <Text style={styles.emptyText}>
                            Couldn't parse any food items. Try being more specific.
                        </Text>
                    </View>
                )}
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
    title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    subtitle: { color: Colors.textSecondary, fontSize: FontSize.md, marginBottom: Spacing.sm },
    inputRow: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
    },
    textInput: {
        color: Colors.text, fontSize: FontSize.md, minHeight: 60,
        textAlignVertical: 'top',
    },
    examplesSection: { marginTop: Spacing.lg },
    examplesLabel: { color: Colors.textTertiary, fontSize: FontSize.sm, marginBottom: Spacing.sm },
    examplesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    exampleChip: {
        backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    },
    exampleText: { color: Colors.textSecondary, fontSize: FontSize.xs },
    loadingRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        marginTop: Spacing.lg, justifyContent: 'center',
    },
    loadingText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    resultSection: { marginTop: Spacing.xl },
    resultTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginBottom: Spacing.md },
    mealRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    mealChip: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm,
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    },
    mealChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
    mealIcon: { fontSize: 14 },
    mealLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
    mealLabelActive: { color: Colors.primary },
    foodCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.sm,
        borderWidth: 1, borderColor: Colors.border,
    },
    foodCardSelected: { borderColor: Colors.primary + '50' },
    foodCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
    foodInfo: { flex: 1 },
    foodName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
    foodServing: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 2 },
    macroRow: { flexDirection: 'row', gap: Spacing.md, marginTop: 4 },
    macroText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
    confidenceBadge: {
        backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.full,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    confidenceText: { color: Colors.textTertiary, fontSize: FontSize.xxs },
    summaryBar: {
        backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.sm,
        padding: Spacing.md, marginTop: Spacing.sm, alignItems: 'center',
    },
    summaryText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    emptyResult: { alignItems: 'center', marginTop: Spacing.xxl, gap: Spacing.md },
    emptyText: { color: Colors.textTertiary, fontSize: FontSize.md, textAlign: 'center' },
});
