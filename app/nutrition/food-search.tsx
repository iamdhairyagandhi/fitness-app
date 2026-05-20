import { Button, toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { searchFoodsCombined } from '@/lib/foodApi';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { FoodItem, MealType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Built-in food database for offline fallback
const OFFLINE_FOODS: FoodItem[] = [
    { id: 'f1', name: 'Chicken Breast (grilled)', brand: null, barcode: null, serving_size_g: 100, serving_unit: 'g', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0, sugar_g: 0, sodium_mg: 74, is_custom: false, user_id: null, image_url: null },
    { id: 'f2', name: 'White Rice (cooked)', brand: null, barcode: null, serving_size_g: 100, serving_unit: 'g', calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, fiber_g: 0.4, sugar_g: 0, sodium_mg: 1, is_custom: false, user_id: null, image_url: null },
    { id: 'f3', name: 'Brown Rice (cooked)', brand: null, barcode: null, serving_size_g: 100, serving_unit: 'g', calories: 112, protein_g: 2.6, carbs_g: 24, fat_g: 0.9, fiber_g: 1.8, sugar_g: 0.4, sodium_mg: 1, is_custom: false, user_id: null, image_url: null },
    { id: 'f4', name: 'Whole Egg', brand: null, barcode: null, serving_size_g: 50, serving_unit: 'egg', calories: 72, protein_g: 6.3, carbs_g: 0.4, fat_g: 4.8, fiber_g: 0, sugar_g: 0.2, sodium_mg: 71, is_custom: false, user_id: null, image_url: null },
    { id: 'f5', name: 'Egg Whites', brand: null, barcode: null, serving_size_g: 100, serving_unit: 'g', calories: 52, protein_g: 11, carbs_g: 0.7, fat_g: 0.2, fiber_g: 0, sugar_g: 0.7, sodium_mg: 166, is_custom: false, user_id: null, image_url: null },
    { id: 'f6', name: 'Oats (dry)', brand: null, barcode: null, serving_size_g: 40, serving_unit: 'g', calories: 152, protein_g: 5.3, carbs_g: 27, fat_g: 2.7, fiber_g: 4, sugar_g: 0.4, sodium_mg: 2, is_custom: false, user_id: null, image_url: null },
    { id: 'f7', name: 'Greek Yogurt (plain, nonfat)', brand: null, barcode: null, serving_size_g: 170, serving_unit: 'g', calories: 100, protein_g: 17, carbs_g: 6, fat_g: 0.7, fiber_g: 0, sugar_g: 6, sodium_mg: 61, is_custom: false, user_id: null, image_url: null },
    { id: 'f8', name: 'Banana', brand: null, barcode: null, serving_size_g: 118, serving_unit: 'medium', calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4, fiber_g: 3.1, sugar_g: 14, sodium_mg: 1, is_custom: false, user_id: null, image_url: null },
    { id: 'f9', name: 'Apple', brand: null, barcode: null, serving_size_g: 182, serving_unit: 'medium', calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3, fiber_g: 4.4, sugar_g: 19, sodium_mg: 2, is_custom: false, user_id: null, image_url: null },
    { id: 'f10', name: 'Sweet Potato (baked)', brand: null, barcode: null, serving_size_g: 100, serving_unit: 'g', calories: 90, protein_g: 2, carbs_g: 21, fat_g: 0.1, fiber_g: 3.3, sugar_g: 6.5, sodium_mg: 36, is_custom: false, user_id: null, image_url: null },
    { id: 'f11', name: 'Broccoli (steamed)', brand: null, barcode: null, serving_size_g: 100, serving_unit: 'g', calories: 35, protein_g: 2.4, carbs_g: 7.2, fat_g: 0.4, fiber_g: 3.3, sugar_g: 1.4, sodium_mg: 41, is_custom: false, user_id: null, image_url: null },
    { id: 'f12', name: 'Salmon (baked)', brand: null, barcode: null, serving_size_g: 100, serving_unit: 'g', calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13, fiber_g: 0, sugar_g: 0, sodium_mg: 59, is_custom: false, user_id: null, image_url: null },
    { id: 'f13', name: 'Ground Beef (90% lean)', brand: null, barcode: null, serving_size_g: 100, serving_unit: 'g', calories: 176, protein_g: 20, carbs_g: 0, fat_g: 10, fiber_g: 0, sugar_g: 0, sodium_mg: 66, is_custom: false, user_id: null, image_url: null },
    { id: 'f14', name: 'Tuna (canned in water)', brand: null, barcode: null, serving_size_g: 100, serving_unit: 'g', calories: 116, protein_g: 26, carbs_g: 0, fat_g: 0.8, fiber_g: 0, sugar_g: 0, sodium_mg: 338, is_custom: false, user_id: null, image_url: null },
    { id: 'f15', name: 'Whey Protein Shake', brand: null, barcode: null, serving_size_g: 31, serving_unit: 'scoop', calories: 120, protein_g: 24, carbs_g: 3, fat_g: 1.5, fiber_g: 0, sugar_g: 1, sodium_mg: 130, is_custom: false, user_id: null, image_url: null },
    { id: 'f16', name: 'Peanut Butter', brand: null, barcode: null, serving_size_g: 32, serving_unit: 'tbsp', calories: 188, protein_g: 8, carbs_g: 6, fat_g: 16, fiber_g: 2, sugar_g: 3, sodium_mg: 136, is_custom: false, user_id: null, image_url: null },
    { id: 'f17', name: 'Almonds', brand: null, barcode: null, serving_size_g: 28, serving_unit: 'oz', calories: 164, protein_g: 6, carbs_g: 6, fat_g: 14, fiber_g: 3.5, sugar_g: 1.2, sodium_mg: 0, is_custom: false, user_id: null, image_url: null },
    { id: 'f18', name: 'Avocado', brand: null, barcode: null, serving_size_g: 68, serving_unit: 'half', calories: 114, protein_g: 1.3, carbs_g: 6, fat_g: 10, fiber_g: 5, sugar_g: 0.2, sodium_mg: 5, is_custom: false, user_id: null, image_url: null },
    { id: 'f19', name: 'Olive Oil', brand: null, barcode: null, serving_size_g: 14, serving_unit: 'tbsp', calories: 119, protein_g: 0, carbs_g: 0, fat_g: 14, fiber_g: 0, sugar_g: 0, sodium_mg: 0, is_custom: false, user_id: null, image_url: null },
    { id: 'f20', name: 'Whole Wheat Bread', brand: null, barcode: null, serving_size_g: 28, serving_unit: 'slice', calories: 69, protein_g: 3.6, carbs_g: 12, fat_g: 1.1, fiber_g: 1.9, sugar_g: 1.4, sodium_mg: 132, is_custom: false, user_id: null, image_url: null },
    { id: 'f21', name: 'Milk (whole)', brand: null, barcode: null, serving_size_g: 244, serving_unit: 'cup', calories: 149, protein_g: 8, carbs_g: 12, fat_g: 8, fiber_g: 0, sugar_g: 12, sodium_mg: 105, is_custom: false, user_id: null, image_url: null },
    { id: 'f22', name: 'Milk (skim)', brand: null, barcode: null, serving_size_g: 244, serving_unit: 'cup', calories: 83, protein_g: 8, carbs_g: 12, fat_g: 0.2, fiber_g: 0, sugar_g: 12, sodium_mg: 103, is_custom: false, user_id: null, image_url: null },
    { id: 'f23', name: 'Cottage Cheese (low fat)', brand: null, barcode: null, serving_size_g: 113, serving_unit: 'half cup', calories: 92, protein_g: 12, carbs_g: 5, fat_g: 2.6, fiber_g: 0, sugar_g: 4, sodium_mg: 348, is_custom: false, user_id: null, image_url: null },
    { id: 'f24', name: 'Turkey Breast (sliced)', brand: null, barcode: null, serving_size_g: 100, serving_unit: 'g', calories: 104, protein_g: 18, carbs_g: 4, fat_g: 1.5, fiber_g: 0, sugar_g: 3, sodium_mg: 960, is_custom: false, user_id: null, image_url: null },
    { id: 'f25', name: 'Pasta (cooked)', brand: null, barcode: null, serving_size_g: 140, serving_unit: 'cup', calories: 220, protein_g: 8, carbs_g: 43, fat_g: 1.3, fiber_g: 2.5, sugar_g: 0.8, sodium_mg: 1, is_custom: false, user_id: null, image_url: null },
    { id: 'f26', name: 'Potato (baked)', brand: null, barcode: null, serving_size_g: 173, serving_unit: 'medium', calories: 161, protein_g: 4.3, carbs_g: 37, fat_g: 0.2, fiber_g: 3.8, sugar_g: 1.8, sodium_mg: 17, is_custom: false, user_id: null, image_url: null },
    { id: 'f27', name: 'Cheddar Cheese', brand: null, barcode: null, serving_size_g: 28, serving_unit: 'oz', calories: 113, protein_g: 7, carbs_g: 0.4, fat_g: 9.3, fiber_g: 0, sugar_g: 0.1, sodium_mg: 174, is_custom: false, user_id: null, image_url: null },
    { id: 'f28', name: 'Spinach (raw)', brand: null, barcode: null, serving_size_g: 30, serving_unit: 'cup', calories: 7, protein_g: 0.9, carbs_g: 1.1, fat_g: 0.1, fiber_g: 0.7, sugar_g: 0.1, sodium_mg: 24, is_custom: false, user_id: null, image_url: null },
    { id: 'f29', name: 'Blueberries', brand: null, barcode: null, serving_size_g: 148, serving_unit: 'cup', calories: 84, protein_g: 1.1, carbs_g: 21, fat_g: 0.5, fiber_g: 3.6, sugar_g: 15, sodium_mg: 1, is_custom: false, user_id: null, image_url: null },
    { id: 'f30', name: 'Dark Chocolate (70%)', brand: null, barcode: null, serving_size_g: 28, serving_unit: 'oz', calories: 170, protein_g: 2.2, carbs_g: 13, fat_g: 12, fiber_g: 3.1, sugar_g: 7, sodium_mg: 6, is_custom: false, user_id: null, image_url: null },
];

export default function FoodSearchScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ meal?: string }>();
    const mealType = (params.meal as MealType) || 'snack';

    const { logFood } = useNutritionStore();
    const [query, setQuery] = useState('');
    const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
    const [servings, setServings] = useState('1');
    const [apiResults, setApiResults] = useState<FoodItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced API search
    useEffect(() => {
        if (query.length < 2) {
            setApiResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                const results = await searchFoodsCombined(query);
                setApiResults(results);
            } catch {
                setApiResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    // Show API results when available, fallback to offline
    const offlineFiltered = query.length > 0
        ? OFFLINE_FOODS.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
        : OFFLINE_FOODS;
    const displayResults = apiResults.length > 0 ? apiResults : offlineFiltered;

    const handleLog = () => {
        if (!selectedFood) return;
        const s = parseFloat(servings);
        if (isNaN(s) || s <= 0) {
            toast.error('Invalid servings', 'Enter a valid number of servings');
            return;
        }
        logFood(selectedFood, s, mealType);
        toast.success('Logged!', `${selectedFood.name} added to ${mealType}`);
        router.back();
    };

    const renderFoodItem = useCallback(({ item }: { item: FoodItem }) => (
        <TouchableOpacity
            style={[
                styles.foodCard,
                selectedFood?.id === item.id && styles.foodRowSelected,
            ]}
            onPress={() => {
                setSelectedFood(item);
                setServings('1');
            }}
            activeOpacity={0.7}
        >
            <View style={styles.foodImageWrap}>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.foodImage} resizeMode="cover" />
                ) : (
                    <Ionicons name="restaurant-outline" size={24} color={Colors.primary} />
                )}
            </View>
            <View style={styles.foodInfo}>
                <View style={styles.foodTitleRow}>
                    <Text style={styles.foodName} numberOfLines={2}>{item.name}</Text>
                </View>
                <Text style={styles.foodMeta} numberOfLines={1}>
                    {item.brand ? `${item.brand} • ` : ''}
                    {item.serving_size_g}{item.serving_unit === 'g' ? 'g' : ` ${item.serving_unit}`} serving
                </Text>
                <View style={styles.foodMacroBar}>
                    <View style={[styles.foodMacroSegment, { flex: Math.max(item.protein_g * 4, 1), backgroundColor: Colors.protein }]} />
                    <View style={[styles.foodMacroSegment, { flex: Math.max(item.carbs_g * 4, 1), backgroundColor: Colors.carbs }]} />
                    <View style={[styles.foodMacroSegment, { flex: Math.max(item.fat_g * 9, 1), backgroundColor: Colors.fat }]} />
                </View>
                <View style={styles.foodMacroRow}>
                    <Text style={styles.foodCaloriesStrong}>{item.calories} kcal</Text>
                    <Text style={[styles.macroText, { color: Colors.protein }]}>P {item.protein_g}g</Text>
                    <Text style={[styles.macroText, { color: Colors.carbs }]}>C {item.carbs_g}g</Text>
                    <Text style={[styles.macroText, { color: Colors.fat }]}>F {item.fat_g}g</Text>
                </View>
            </View>
            <Ionicons name="add-circle" size={24} color={Colors.primary} />
        </TouchableOpacity>
    ), [selectedFood]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>
                    Add to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </Text>
                <TouchableOpacity onPress={() => router.push('/nutrition/create-food')}>
                    <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Quick actions */}
            <View style={styles.quickRow}>
                <TouchableOpacity
                    style={styles.quickBtn}
                    onPress={() => router.push('/nutrition/barcode-scanner')}
                >
                    <Ionicons name="barcode-outline" size={18} color={Colors.primary} />
                    <Text style={styles.quickBtnText}>Scan Barcode</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.quickBtn}
                    onPress={() => router.push('/nutrition/ai-scanner')}
                >
                    <Ionicons name="camera-outline" size={18} color={Colors.primary} />
                    <Text style={styles.quickBtnText}>AI Photo Scan</Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.textTertiary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search foods..."
                    placeholderTextColor={Colors.textTertiary}
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')}>
                        <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Results */}
            <FlatList
                data={displayResults}
                keyExtractor={(item) => item.id}
                renderItem={renderFoodItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={isSearching ? (
                    <View style={styles.searchingRow}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.searchingText}>Searching online...</Text>
                    </View>
                ) : apiResults.length > 0 ? (
                    <Text style={styles.sourceHint}>Showing matching foods</Text>
                ) : query.length >= 2 ? (
                    <Text style={styles.sourceHint}>Showing offline results</Text>
                ) : null}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="search-outline" size={40} color={Colors.textTertiary} />
                        <Text style={styles.emptyText}>No foods found</Text>
                        <TouchableOpacity onPress={() => router.push('/nutrition/create-food')}>
                            <Text style={styles.createLink}>Create custom food</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Selected food bottom sheet */}
            {selectedFood && (
                <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + Spacing.md }]}>
                    <View style={styles.sheetHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sheetFoodName}>{selectedFood.name}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedFood(null)}>
                            <Ionicons name="close" size={22} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.sheetMacroRow}>
                        <View style={styles.sheetMacro}>
                            <Text style={[styles.sheetMacroValue, { color: Colors.calories }]}>
                                {Math.round(selectedFood.calories * parseFloat(servings || '0'))}
                            </Text>
                            <Text style={styles.sheetMacroLabel}>kcal</Text>
                        </View>
                        <View style={styles.sheetMacro}>
                            <Text style={[styles.sheetMacroValue, { color: Colors.protein }]}>
                                {(selectedFood.protein_g * parseFloat(servings || '0')).toFixed(1)}
                            </Text>
                            <Text style={styles.sheetMacroLabel}>Protein</Text>
                        </View>
                        <View style={styles.sheetMacro}>
                            <Text style={[styles.sheetMacroValue, { color: Colors.carbs }]}>
                                {(selectedFood.carbs_g * parseFloat(servings || '0')).toFixed(1)}
                            </Text>
                            <Text style={styles.sheetMacroLabel}>Carbs</Text>
                        </View>
                        <View style={styles.sheetMacro}>
                            <Text style={[styles.sheetMacroValue, { color: Colors.fat }]}>
                                {(selectedFood.fat_g * parseFloat(servings || '0')).toFixed(1)}
                            </Text>
                            <Text style={styles.sheetMacroLabel}>Fat</Text>
                        </View>
                    </View>

                    <View style={styles.servingsRow}>
                        <Text style={styles.servingsLabel}>Servings</Text>
                        <View style={styles.servingsControl}>
                            <TouchableOpacity
                                style={styles.servingsBtn}
                                onPress={() => setServings(String(Math.max(0.5, parseFloat(servings || '1') - 0.5)))}
                            >
                                <Ionicons name="remove" size={18} color={Colors.text} />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.servingsInput}
                                value={servings}
                                onChangeText={setServings}
                                keyboardType="decimal-pad"
                                textAlign="center"
                            />
                            <TouchableOpacity
                                style={styles.servingsBtn}
                                onPress={() => setServings(String(parseFloat(servings || '1') + 0.5))}
                            >
                                <Ionicons name="add" size={18} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.servingsUnit}>
                            × {selectedFood.serving_size_g}{selectedFood.serving_unit === 'g' ? 'g' : ` ${selectedFood.serving_unit}`}
                        </Text>
                    </View>

                    <Button title="Log Food" onPress={handleLog} size="lg" />
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
    quickRow: {
        flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md,
    },
    quickBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    },
    quickBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        marginHorizontal: Spacing.lg, backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md,
        borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
    },
    searchInput: {
        flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: Spacing.md,
    },
    list: { paddingHorizontal: Spacing.lg, paddingBottom: 220 },
    foodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    foodRowSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '18',
    },
    foodImageWrap: {
        width: 68,
        height: 68,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceElevated,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    foodImage: {
        width: '100%',
        height: '100%',
    },
    foodInfo: { flex: 1 },
    foodTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    foodName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1 },
    foodMeta: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 2 },
    foodMacroBar: {
        flexDirection: 'row',
        height: 5,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        marginTop: Spacing.sm,
        backgroundColor: Colors.border,
    },
    foodMacroSegment: {
        height: '100%',
    },
    foodMacroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
    foodCaloriesStrong: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
    macroText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
    emptyState: { alignItems: 'center', paddingTop: Spacing.huge, gap: Spacing.md },
    emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
    createLink: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
    searchingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
    searchingText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    sourceHint: { color: Colors.textTertiary, fontSize: FontSize.xs, paddingVertical: Spacing.sm },

    // Bottom sheet
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl, paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg, borderTopWidth: 1, borderColor: Colors.border,
    },
    sheetHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md,
    },
    sheetFoodName: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    sheetMacroRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
    sheetMacro: { alignItems: 'center' },
    sheetMacroValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    sheetMacroLabel: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
    servingsRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg,
    },
    servingsLabel: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
    servingsControl: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    servingsBtn: {
        width: 32, height: 32, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceElevated,
        alignItems: 'center', justifyContent: 'center',
    },
    servingsInput: {
        width: 50, height: 36, backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.sm, color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold,
    },
    servingsUnit: { color: Colors.textTertiary, fontSize: FontSize.sm },
});
