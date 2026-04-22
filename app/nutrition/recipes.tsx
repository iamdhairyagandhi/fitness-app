import { Card } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import type { Recipe } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'High-Protein', 'Low-Carb', 'Vegan', 'Quick'];

export default function RecipesScreen() {
    const insets = useSafeAreaInsets();
    const { recipes, toggleFavorite, favoriteRecipes } = useMealPlanStore();
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    const filtered = recipes.filter((r) => {
        if (showFavoritesOnly && !favoriteRecipes.includes(r.id)) return false;
        if (selectedCategory === 'All') return true;
        const tag = selectedCategory.toLowerCase().replace('-', '_');
        return r.tags.some((t) => t.toLowerCase().includes(tag)) ||
            r.diet_tags.some((t) => t.toLowerCase().includes(tag));
    });

    const renderRecipe = useCallback(({ item }: { item: Recipe }) => (
        <Card style={styles.recipeCard}>
            <View style={styles.recipeImagePlaceholder}>
                <Text style={styles.recipeEmoji}>
                    {item.tags.includes('breakfast') ? '🥣' :
                        item.tags.includes('lunch') ? '🥗' :
                            item.tags.includes('dinner') ? '🍽️' : '🥙'}
                </Text>
                <View style={styles.difficultyBadge}>
                    <Text style={styles.difficultyText}>{item.difficulty}</Text>
                </View>
            </View>

            <View style={styles.recipeInfo}>
                <View style={styles.recipeHeader}>
                    <Text style={styles.recipeName} numberOfLines={1}>{item.name}</Text>
                    <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
                        <Ionicons
                            name={item.is_favorited ? 'heart' : 'heart-outline'}
                            size={22}
                            color={item.is_favorited ? Colors.accent : Colors.textTertiary}
                        />
                    </TouchableOpacity>
                </View>

                <Text style={styles.recipeDesc} numberOfLines={1}>{item.description}</Text>

                <View style={styles.recipeMetaRow}>
                    <View style={styles.recipeMeta}>
                        <Ionicons name="time-outline" size={14} color={Colors.textTertiary} />
                        <Text style={styles.recipeMetaText}>{item.prep_time_min + item.cook_time_min}m</Text>
                    </View>
                    <View style={styles.recipeMeta}>
                        <Ionicons name="flame-outline" size={14} color={Colors.calories} />
                        <Text style={styles.recipeMetaText}>{item.calories_per_serving} kcal</Text>
                    </View>
                    <View style={styles.recipeMeta}>
                        <Text style={[styles.recipeMetaText, { color: Colors.protein }]}>P {item.protein_per_serving}g</Text>
                    </View>
                </View>

                <View style={styles.macroBar}>
                    <View style={[styles.macroSegment, { flex: item.protein_per_serving * 4, backgroundColor: Colors.protein }]} />
                    <View style={[styles.macroSegment, { flex: item.carbs_per_serving * 4, backgroundColor: Colors.carbs }]} />
                    <View style={[styles.macroSegment, { flex: item.fat_per_serving * 9, backgroundColor: Colors.fat }]} />
                </View>

                <View style={styles.tagRow}>
                    {item.tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </Card>
    ), [toggleFavorite]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Recipes</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                    <TouchableOpacity onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}>
                        <Ionicons
                            name={showFavoritesOnly ? 'heart' : 'heart-outline'}
                            size={24}
                            color={showFavoritesOnly ? Colors.accent : Colors.text}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/nutrition/create-recipe')}>
                        <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories} contentContainerStyle={styles.categoriesContent}>
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                        onPress={() => setSelectedCategory(cat)}
                    >
                        <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={renderRecipe}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No recipes found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

    categories: { maxHeight: 44, marginBottom: Spacing.md },
    categoriesContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
    catChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
    catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    catText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    catTextActive: { color: Colors.text },

    list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    recipeCard: { marginBottom: Spacing.md },
    recipeImagePlaceholder: { height: 100, backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
    recipeEmoji: { fontSize: 40 },
    difficultyBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.surface, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
    difficultyText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.medium },

    recipeInfo: {},
    recipeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    recipeName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1 },
    recipeDesc: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 2, marginBottom: Spacing.sm },

    recipeMetaRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.sm },
    recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    recipeMetaText: { color: Colors.textSecondary, fontSize: FontSize.xs },

    macroBar: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: Spacing.sm },
    macroSegment: { height: '100%' },

    tagRow: { flexDirection: 'row', gap: Spacing.xs },
    tag: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
    tagText: { color: Colors.textTertiary, fontSize: FontSize.xs },

    empty: { alignItems: 'center', paddingTop: Spacing.huge },
    emptyText: { color: Colors.textTertiary, fontSize: FontSize.md },
});
