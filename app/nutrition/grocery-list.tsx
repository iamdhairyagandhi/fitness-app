import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui';
import { useMealPlanStore } from '@/stores/mealPlanStore';

export default function GroceryListScreen() {
    const insets = useSafeAreaInsets();
    const { groceryList, toggleGroceryItem, generateGroceryList, activeMealPlan } = useMealPlanStore();

    const CATEGORIES = ['general', 'produce', 'protein', 'dairy', 'grains', 'pantry', 'frozen', 'other'];

    const grouped = groceryList?.items.reduce((acc, item, index) => {
        const cat = item.category || 'general';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push({ ...item, _index: index });
        return acc;
    }, {} as Record<string, (typeof groceryList.items[0] & { _index: number })[]>) || {};

    const totalItems = groceryList?.items.length || 0;
    const checkedItems = groceryList?.items.filter((i) => i.checked).length || 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Grocery List</Text>
                <TouchableOpacity onPress={generateGroceryList}>
                    <Ionicons name="refresh" size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>

            {groceryList && groceryList.items.length > 0 ? (
                <>
                    {/* Progress */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{checkedItems}/{totalItems} items</Text>
                    </View>

                    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                        {CATEGORIES.filter((cat) => grouped[cat]?.length).map((cat) => (
                            <View key={cat}>
                                <Text style={styles.categoryTitle}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
                                {grouped[cat].map((item) => (
                                    <TouchableOpacity
                                        key={item._index}
                                        style={styles.groceryItem}
                                        onPress={() => toggleGroceryItem(item._index)}
                                    >
                                        <Ionicons
                                            name={item.checked ? 'checkbox' : 'square-outline'}
                                            size={22}
                                            color={item.checked ? Colors.success : Colors.textTertiary}
                                        />
                                        <Text style={[styles.groceryName, item.checked && styles.groceryNameChecked]}>
                                            {item.name}
                                        </Text>
                                        <Text style={styles.groceryAmount}>
                                            {item.amount} {item.unit}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))}
                    </ScrollView>
                </>
            ) : (
                <View style={styles.empty}>
                    <Ionicons name="cart-outline" size={64} color={Colors.textTertiary} />
                    <Text style={styles.emptyTitle}>No Grocery List</Text>
                    <Text style={styles.emptySubtext}>
                        {activeMealPlan
                            ? 'Tap refresh to generate from your meal plan'
                            : 'Create a meal plan first to generate a grocery list'}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

    progressContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
    progressBar: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: Colors.success, borderRadius: 3 },
    progressText: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'right', marginTop: 4 },

    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    categoryTitle: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.xl, marginBottom: Spacing.sm },

    groceryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
    groceryName: { flex: 1, color: Colors.text, fontSize: FontSize.md },
    groceryNameChecked: { color: Colors.textTertiary, textDecorationLine: 'line-through' },
    groceryAmount: { color: Colors.textSecondary, fontSize: FontSize.sm },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl },
    emptyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.lg },
    emptySubtext: { color: Colors.textTertiary, fontSize: FontSize.md, textAlign: 'center', marginTop: Spacing.sm },
});
