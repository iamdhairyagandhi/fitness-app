import { Button, toast } from '@/components/ui';
import { AI_PROXY_ENABLED } from '@/constants/config';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { imageOnlyPickerOptions, requestCameraAccess, requestPhotoLibraryAccess } from '@/lib/imagePickerPermissions';
import { analyzeFoodPhoto } from '@/lib/openai';
import { generateId } from '@/lib/utils';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { FoodItem, MealType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
            is_custom: true,
            user_id: null,
            image_url: null,
        }));
    } catch {
        return [];
    }
}

export default function AIScannerScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const params = useLocalSearchParams<{ meal?: string }>();
    const { logFood } = useNutritionStore();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<FoodItem[]>([]);
    const [selectedMeal, setSelectedMeal] = useState<MealType>(() => {
        const meal = params.meal;
        return meal === 'breakfast' || meal === 'lunch' || meal === 'dinner' || meal === 'snack'
            ? meal
            : 'lunch';
    });

    const analyzeCapturedMeal = async (base64Image: string | null, context: string) => {
        setIsAnalyzing(true);
        setResults([]);

        try {
            if (AI_PROXY_ENABLED && base64Image) {
                const aiResponse = await analyzeFoodPhoto(base64Image, context);
                const parsed = parseAIResponse(aiResponse);
                if (parsed.length > 0) {
                    setResults(parsed);
                } else {
                    toast.warning('AI Result', 'Could not identify foods clearly. Try a clearer photo or add more context.');
                }
            } else {
                toast.warning(
                    'Analysis unavailable',
                    AI_PROXY_ENABLED
                        ? 'Image data was unavailable. Retake the photo and try again.'
                        : 'Live AI scanning is unavailable. Use manual food search for this meal.',
                );
            }
        } catch (err) {
            console.warn('[AIScanner] AI analysis failed:', err);
            toast.error('AI Error', 'Analysis failed. Try again or use manual food search.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const pickImage = async (useCamera: boolean) => {
        const source = useCamera ? 'camera' : 'gallery';

        try {
            const options: ImagePicker.ImagePickerOptions = {
                ...imageOnlyPickerOptions,
                quality: 0.7,
                base64: true,
                allowsEditing: true,
                aspect: [4, 3],
            };

            let result;
            if (useCamera) {
                const permitted = await requestCameraAccess();
                if (!permitted) return;
                result = await ImagePicker.launchCameraAsync(options);
            } else {
                const permitted = await requestPhotoLibraryAccess();
                if (!permitted) return;
                result = await ImagePicker.launchImageLibraryAsync(options);
            }

            if (result.canceled || !result.assets?.[0]) return;

            const asset = result.assets[0];
            setImageUri(asset.uri);
            setImageBase64(asset.base64 || null);
            await analyzeCapturedMeal(asset.base64 || null, description);
        } catch (err) {
            console.warn('[AIScanner] Image pick failed:', { source, error: err });
            setIsAnalyzing(false);
            toast.error(
                'Image Error',
                source === 'camera'
                    ? 'Could not take a photo. Check camera access and try again.'
                    : 'Could not choose that photo. Check photo access or try another image.',
            );
        }
    };

    const handleLogFood = (food: FoodItem) => {
        logFood(food, 1, selectedMeal, {
            notes: description,
            photoUri: imageUri && imageUri !== 'demo' ? imageUri : null,
        });
        toast.success('Logged!', `${food.name} added to ${selectedMeal}`);
        router.back();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>AI Food Scanner</Text>
                <View style={{ width: 24 }} />
            </View>

            {!imageUri ? (
                /* Camera / Upload Area */
                <View style={styles.captureArea}>
                    <View style={[styles.cameraPlaceholder, { backgroundColor: colors.surface }]}>
                        <Ionicons name="restaurant-outline" size={60} color={colors.primary} />
                        <Text style={[styles.captureTitle, { color: colors.text }]}>Snap your meal</Text>
                        <Text style={[styles.captureSubtext, { color: colors.textTertiary }]}>
                            {AI_PROXY_ENABLED
                                ? 'AI will identify the food and estimate nutrition values'
                                : 'Live AI scanning is unavailable. Use manual food search instead.'}
                        </Text>
                    </View>

                    <View style={styles.captureButtons}>
                        <TouchableOpacity style={[styles.captureBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]} onPress={() => pickImage(true)}>
                            <Ionicons name="camera" size={28} color={colors.text} />
                            <Text style={[styles.captureBtnText, { color: colors.text }]}>Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.captureBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]} onPress={() => pickImage(false)}>
                            <Ionicons name="images" size={28} color={colors.text} />
                            <Text style={[styles.captureBtnText, { color: colors.text }]}>Gallery</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.contextBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.contextLabel, { color: colors.text }]}>Optional context</Text>
                        <TextInput
                            style={[styles.contextInput, { color: colors.text, backgroundColor: colors.surfaceLight }]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Example: half eaten, homemade burrito bowl, extra rice, no dressing..."
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            maxLength={220}
                            textAlignVertical="top"
                        />
                        <Text style={[styles.contextHint, { color: colors.textTertiary }]}>Helps AI estimate portions and hidden ingredients more accurately.</Text>
                    </View>

                    {!AI_PROXY_ENABLED && (
                        <Button title="Search Manually" variant="outline" onPress={() => router.replace('/nutrition/food-search')} />
                    )}
                </View>
            ) : (
                /* Results Area */
                <ScrollView style={styles.resultsArea} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
                    {imageUri && imageUri !== 'demo' && (
                        <Image source={{ uri: imageUri }} style={styles.capturedImage} resizeMode="cover" />
                    )}
                    <View style={[styles.contextBoxCompact, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.contextHeader}>
                            <Text style={[styles.contextLabel, { color: colors.text }]}>Meal context</Text>
                            <Text style={[styles.contextCount, { color: colors.textTertiary }]}>{description.length}/220</Text>
                        </View>
                        <TextInput
                            style={[styles.contextInput, { color: colors.text, backgroundColor: colors.surfaceLight }]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Add details like portion size, sauces, or what is not visible..."
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            maxLength={220}
                            textAlignVertical="top"
                            editable={!isAnalyzing}
                        />
                        <TouchableOpacity
                            style={[styles.reanalyzeButton, { backgroundColor: colors.primary + '18' }, isAnalyzing && styles.reanalyzeButtonDisabled]}
                            onPress={() => analyzeCapturedMeal(imageBase64, description)}
                            disabled={isAnalyzing}
                        >
                            <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                            <Text style={[styles.reanalyzeText, { color: colors.primary }]}>Re-analyze with context</Text>
                        </TouchableOpacity>
                    </View>
                    {isAnalyzing ? (
                        <View style={styles.analyzing}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.analyzingText, { color: colors.text }]}>Analyzing your meal...</Text>
                            <Text style={[styles.analyzingSubtext, { color: colors.textTertiary }]}>
                                AI is identifying foods and estimating nutrition
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Meal type selector */}
                            <View style={styles.mealSelector}>
                                <Text style={[styles.mealLabel, { color: colors.textSecondary }]}>Log to:</Text>
                                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((m) => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[
                                            styles.mealChip,
                                            {
                                                backgroundColor: selectedMeal === m ? colors.primary + '18' : colors.surface,
                                                borderColor: selectedMeal === m ? colors.primary : colors.border,
                                            },
                                        ]}
                                        onPress={() => setSelectedMeal(m)}
                                    >
                                        <Text style={[styles.mealChipText, { color: selectedMeal === m ? colors.primary : colors.textSecondary }]}>
                                            {m.charAt(0).toUpperCase() + m.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.resultsTitle, { color: colors.text }]}>
                                <Ionicons name="sparkles" size={18} color={colors.primary} /> AI detected {results.length} items
                            </Text>

                            {results.map((food) => (
                                <View key={food.id} style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <View style={styles.resultInfo}>
                                        <Text style={[styles.resultName, { color: colors.text }]}>{food.name}</Text>
                                        <Text style={[styles.resultServing, { color: colors.textTertiary }]}>
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
                                        <Ionicons name="add-circle" size={32} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            <View style={styles.retryRow}>
                                <Button
                                    title="Scan Again"
                                    variant="outline"
                                    onPress={() => { setImageUri(null); setImageBase64(null); setResults([]); }}
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
    contextBox: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    contextBoxCompact: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    contextHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    contextLabel: {
        color: Colors.text,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        marginBottom: Spacing.sm,
    },
    contextCount: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
    },
    contextInput: {
        minHeight: 76,
        color: Colors.text,
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        fontSize: FontSize.sm,
        lineHeight: 20,
    },
    contextHint: {
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: Spacing.sm,
    },
    reanalyzeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Spacing.xs,
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary + '18',
    },
    reanalyzeButtonDisabled: {
        opacity: 0.55,
    },
    reanalyzeText: {
        color: Colors.primary,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
    },

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
