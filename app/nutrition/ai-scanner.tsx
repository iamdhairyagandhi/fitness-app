import { Button } from '@/components/ui';
import { OPENAI_API_KEY } from '@/constants/config';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { generateId } from '@/lib/utils';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { FoodItem, MealType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Simulated AI food recognition results for demo
const DEMO_RESULTS: FoodItem[] = [
    {
        id: generateId(), name: 'Grilled Chicken Salad', brand: 'AI Detected', barcode: null,
        serving_size_g: 300, serving_unit: 'plate', calories: 350, protein_g: 35,
        carbs_g: 15, fat_g: 16, fiber_g: 4, sugar_g: 5, sodium_mg: 500,
        is_custom: false, user_id: null, image_url: null,
    },
    {
        id: generateId(), name: 'Rice Bowl with Vegetables', brand: 'AI Detected', barcode: null,
        serving_size_g: 350, serving_unit: 'bowl', calories: 420, protein_g: 12,
        carbs_g: 68, fat_g: 10, fiber_g: 5, sugar_g: 3, sodium_mg: 600,
        is_custom: false, user_id: null, image_url: null,
    },
];

export default function AIScannerScreen() {
    const insets = useSafeAreaInsets();
    const { logFood } = useNutritionStore();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<FoodItem[]>([]);
    const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');

    const handleTakePhoto = async () => {
        // In production: use expo-image-picker
        // For MVP: simulate with demo data
        simulateAIScan();
    };

    const handlePickImage = async () => {
        simulateAIScan();
    };

    const simulateAIScan = () => {
        setIsAnalyzing(true);
        setImageUri('demo');
        // Simulate API call delay
        setTimeout(() => {
            setResults(DEMO_RESULTS);
            setIsAnalyzing(false);
        }, 2000);
    };

    const handleLogFood = (food: FoodItem) => {
        logFood(food, 1, selectedMeal);
        Alert.alert(
            'Logged!',
            `${food.name} added to ${selectedMeal}`,
            [{ text: 'OK', onPress: () => router.back() }]
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>AI Food Scanner</Text>
                <View style={{ width: 24 }} />
            </View>

            {!imageUri ? (
                /* Camera / Upload Area */
                <View style={styles.captureArea}>
                    <View style={styles.cameraPlaceholder}>
                        <Ionicons name="restaurant-outline" size={60} color={Colors.primary} />
                        <Text style={styles.captureTitle}>Snap your meal</Text>
                        <Text style={styles.captureSubtext}>
                            AI will identify the food and estimate nutrition values
                        </Text>
                    </View>

                    <View style={styles.captureButtons}>
                        <TouchableOpacity style={styles.captureBtn} onPress={handleTakePhoto}>
                            <Ionicons name="camera" size={28} color={Colors.text} />
                            <Text style={styles.captureBtnText}>Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.captureBtn} onPress={handlePickImage}>
                            <Ionicons name="images" size={28} color={Colors.text} />
                            <Text style={styles.captureBtnText}>Gallery</Text>
                        </TouchableOpacity>
                    </View>

                    {!OPENAI_API_KEY && (
                        <View style={styles.apiWarning}>
                            <Ionicons name="information-circle" size={18} color={Colors.warning} />
                            <Text style={styles.apiWarningText}>
                                Set EXPO_PUBLIC_OPENAI_API_KEY in .env for live AI scanning.
                                Demo mode is active.
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                /* Results Area */
                <View style={styles.resultsArea}>
                    {isAnalyzing ? (
                        <View style={styles.analyzing}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                            <Text style={styles.analyzingText}>Analyzing your meal...</Text>
                            <Text style={styles.analyzingSubtext}>
                                AI is identifying foods and estimating nutrition
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Meal type selector */}
                            <View style={styles.mealSelector}>
                                <Text style={styles.mealLabel}>Log to:</Text>
                                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((m) => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.mealChip, selectedMeal === m && styles.mealChipActive]}
                                        onPress={() => setSelectedMeal(m)}
                                    >
                                        <Text style={[styles.mealChipText, selectedMeal === m && styles.mealChipTextActive]}>
                                            {m.charAt(0).toUpperCase() + m.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.resultsTitle}>
                                <Ionicons name="sparkles" size={18} color={Colors.primary} /> AI detected {results.length} items
                            </Text>

                            {results.map((food) => (
                                <View key={food.id} style={styles.resultCard}>
                                    <View style={styles.resultInfo}>
                                        <Text style={styles.resultName}>{food.name}</Text>
                                        <Text style={styles.resultServing}>
                                            {food.serving_size_g}{food.serving_unit === 'g' ? 'g' : ` ${food.serving_unit}`}
                                        </Text>
                                        <View style={styles.resultMacros}>
                                            <Text style={[styles.resultMacro, { color: Colors.calories }]}>{food.calories} kcal</Text>
                                            <Text style={[styles.resultMacro, { color: Colors.protein }]}>P {food.protein_g}g</Text>
                                            <Text style={[styles.resultMacro, { color: Colors.carbs }]}>C {food.carbs_g}g</Text>
                                            <Text style={[styles.resultMacro, { color: Colors.fat }]}>F {food.fat_g}g</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.logBtn}
                                        onPress={() => handleLogFood(food)}
                                    >
                                        <Ionicons name="add-circle" size={32} color={Colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            <View style={styles.retryRow}>
                                <Button
                                    title="Scan Again"
                                    variant="outline"
                                    onPress={() => { setImageUri(null); setResults([]); }}
                                    style={{ flex: 1 }}
                                />
                                <Button
                                    title="Search Manually"
                                    variant="ghost"
                                    onPress={() => router.replace('/nutrition/food-search')}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        </>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

    // Capture
    captureArea: { flex: 1, paddingHorizontal: Spacing.lg },
    cameraPlaceholder: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
        margin: Spacing.md, gap: Spacing.md,
    },
    captureTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    captureSubtext: { color: Colors.textTertiary, fontSize: FontSize.sm, textAlign: 'center', paddingHorizontal: Spacing.xxl },
    captureButtons: {
        flexDirection: 'row', gap: Spacing.lg, paddingVertical: Spacing.xl,
    },
    captureBtn: {
        flex: 1, alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
    },
    captureBtnText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
    apiWarning: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.lg,
    },
    apiWarningText: { color: Colors.textTertiary, fontSize: FontSize.xs, flex: 1 },

    // Results
    resultsArea: { flex: 1, paddingHorizontal: Spacing.lg },
    analyzing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
    analyzingText: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
    analyzingSubtext: { color: Colors.textTertiary, fontSize: FontSize.sm },

    mealSelector: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: 'wrap',
    },
    mealLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    mealChip: {
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.border,
    },
    mealChipActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceLight },
    mealChipText: { color: Colors.textSecondary, fontSize: FontSize.xs },
    mealChipTextActive: { color: Colors.primary },

    resultsTitle: {
        color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.md,
    },
    resultCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
        borderWidth: 1, borderColor: Colors.border,
    },
    resultInfo: { flex: 1 },
    resultName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
    resultServing: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 2 },
    resultMacros: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
    resultMacro: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
    logBtn: { paddingLeft: Spacing.md },
    retryRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
});
