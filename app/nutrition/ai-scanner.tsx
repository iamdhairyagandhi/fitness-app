import { Button, toast } from '@/components/ui';
import { OPENAI_API_KEY } from '@/constants/config';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { analyzeFoodPhoto } from '@/lib/openai';
import { generateId } from '@/lib/utils';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { FoodItem, MealType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Demo fallback when no API key
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

function parseAIResponse(response: string): FoodItem[] {
    try {
        // Try to extract JSON array from the response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) return [];

        return parsed.map((item: any) => ({
            id: generateId(),
            name: item.name || 'Unknown Food',
            brand: 'AI Detected',
            barcode: null,
            serving_size_g: item.serving_size_g || item.serving_grams || 100,
            serving_unit: item.serving_unit || 'g',
            calories: Math.round(item.calories || 0),
            protein_g: Math.round((item.protein_g || item.protein || 0) * 10) / 10,
            carbs_g: Math.round((item.carbs_g || item.carbs || 0) * 10) / 10,
            fat_g: Math.round((item.fat_g || item.fat || 0) * 10) / 10,
            fiber_g: Math.round((item.fiber_g || item.fiber || 0) * 10) / 10,
            sugar_g: Math.round((item.sugar_g || item.sugar || 0) * 10) / 10,
            sodium_mg: Math.round(item.sodium_mg || 0),
            is_custom: false,
            user_id: null,
            image_url: null,
        }));
    } catch {
        return [];
    }
}

export default function AIScannerScreen() {
    const insets = useSafeAreaInsets();
    const { logFood } = useNutritionStore();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<FoodItem[]>([]);
    const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');

    const pickImage = async (useCamera: boolean) => {
        try {
            const options: ImagePicker.ImagePickerOptions = {
                mediaTypes: ['images'],
                quality: 0.7,
                base64: true,
                allowsEditing: true,
                aspect: [4, 3],
            };

            let result;
            if (useCamera) {
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (!perm.granted) {
                    toast.warning('Permission', 'Camera permission is required');
                    return;
                }
                result = await ImagePicker.launchCameraAsync(options);
            } else {
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!perm.granted) {
                    toast.warning('Permission', 'Gallery permission is required');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync(options);
            }

            if (result.canceled || !result.assets?.[0]) return;

            const asset = result.assets[0];
            setImageUri(asset.uri);
            setIsAnalyzing(true);
            setResults([]);

            if (OPENAI_API_KEY && asset.base64) {
                // Real AI analysis
                try {
                    const aiResponse = await analyzeFoodPhoto(asset.base64);
                    const parsed = parseAIResponse(aiResponse);
                    if (parsed.length > 0) {
                        setResults(parsed);
                    } else {
                        toast.warning('AI Result', 'Could not identify foods clearly. Try a clearer photo.');
                        setResults(DEMO_RESULTS);
                    }
                } catch (err) {
                    console.warn('AI analysis failed:', err);
                    toast.error('AI Error', 'Analysis failed. Showing demo results.');
                    setResults(DEMO_RESULTS);
                }
            } else {
                // Demo mode
                await new Promise((r) => setTimeout(r, 1500));
                setResults(DEMO_RESULTS);
            }
            setIsAnalyzing(false);
        } catch (err) {
            console.warn('Image pick error:', err);
            setIsAnalyzing(false);
            toast.error('Error', 'Failed to capture image');
        }
    };

    const handleLogFood = (food: FoodItem) => {
        logFood(food, 1, selectedMeal);
        toast.success('Logged!', `${food.name} added to ${selectedMeal}`);
        router.back();
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
                            {OPENAI_API_KEY
                                ? 'AI will identify the food and estimate nutrition values'
                                : 'Demo mode — set EXPO_PUBLIC_OPENAI_API_KEY for real analysis'}
                        </Text>
                    </View>

                    <View style={styles.captureButtons}>
                        <TouchableOpacity style={styles.captureBtn} onPress={() => pickImage(true)}>
                            <Ionicons name="camera" size={28} color={Colors.text} />
                            <Text style={styles.captureBtnText}>Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.captureBtn} onPress={() => pickImage(false)}>
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
                <ScrollView style={styles.resultsArea} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
                    {imageUri && imageUri !== 'demo' && (
                        <Image source={{ uri: imageUri }} style={styles.capturedImage} resizeMode="cover" />
                    )}
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
                </ScrollView>
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
    capturedImage: {
        width: '100%', height: 200, borderRadius: BorderRadius.lg,
        marginBottom: Spacing.lg, backgroundColor: Colors.surface,
    },
    analyzing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingTop: Spacing.huge },
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
