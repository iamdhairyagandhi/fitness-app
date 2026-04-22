import { Button } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { generateId } from '@/lib/utils';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { FoodItem } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
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

export default function CreateFoodScreen() {
    const insets = useSafeAreaInsets();
    const { setRecentFoods, recentFoods } = useNutritionStore();

    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [servingSize, setServingSize] = useState('100');
    const [servingUnit, setServingUnit] = useState('g');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');
    const [fiber, setFiber] = useState('');

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('Missing Name', 'Enter a food name');
            return;
        }
        if (!calories) {
            Alert.alert('Missing Calories', 'Enter calorie amount');
            return;
        }

        const food: FoodItem = {
            id: generateId(),
            name: name.trim(),
            brand: brand.trim() || null,
            barcode: null,
            serving_size_g: parseFloat(servingSize) || 100,
            serving_unit: servingUnit,
            calories: parseFloat(calories) || 0,
            protein_g: parseFloat(protein) || 0,
            carbs_g: parseFloat(carbs) || 0,
            fat_g: parseFloat(fat) || 0,
            fiber_g: parseFloat(fiber) || 0,
            sugar_g: null,
            sodium_mg: null,
            is_custom: true,
            user_id: null,
            image_url: null,
        };

        setRecentFoods([food, ...recentFoods]);
        Alert.alert('Saved!', `${food.name} added to your foods`, [
            { text: 'OK', onPress: () => router.back() },
        ]);
    };

    const renderField = (label: string, value: string, setter: (v: string) => void, placeholder: string, numeric = false) => (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                style={styles.fieldInput}
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                placeholderTextColor={Colors.textTertiary}
                keyboardType={numeric ? 'decimal-pad' : 'default'}
            />
        </View>
    );

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
                <Text style={styles.title}>Create Custom Food</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {renderField('Food Name *', name, setName, 'e.g. Homemade Granola')}
                {renderField('Brand (optional)', brand, setBrand, 'e.g. My Kitchen')}

                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Serving Size</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={servingSize}
                            onChangeText={setServingSize}
                            keyboardType="decimal-pad"
                            placeholderTextColor={Colors.textTertiary}
                        />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Unit</Text>
                        <View style={styles.unitRow}>
                            {['g', 'ml', 'oz', 'cup', 'piece'].map((u) => (
                                <TouchableOpacity
                                    key={u}
                                    style={[styles.unitChip, servingUnit === u && styles.unitChipActive]}
                                    onPress={() => setServingUnit(u)}
                                >
                                    <Text style={[styles.unitChipText, servingUnit === u && styles.unitChipTextActive]}>
                                        {u}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Nutrition per serving</Text>

                <View style={styles.macroGrid}>
                    <View style={[styles.macroField, { borderColor: Colors.calories }]}>
                        <Text style={[styles.macroLabel, { color: Colors.calories }]}>Calories *</Text>
                        <TextInput
                            style={styles.macroInput}
                            value={calories}
                            onChangeText={setCalories}
                            placeholder="0"
                            placeholderTextColor={Colors.textTertiary}
                            keyboardType="decimal-pad"
                        />
                        <Text style={styles.macroUnit}>kcal</Text>
                    </View>
                    <View style={[styles.macroField, { borderColor: Colors.protein }]}>
                        <Text style={[styles.macroLabel, { color: Colors.protein }]}>Protein</Text>
                        <TextInput
                            style={styles.macroInput}
                            value={protein}
                            onChangeText={setProtein}
                            placeholder="0"
                            placeholderTextColor={Colors.textTertiary}
                            keyboardType="decimal-pad"
                        />
                        <Text style={styles.macroUnit}>g</Text>
                    </View>
                    <View style={[styles.macroField, { borderColor: Colors.carbs }]}>
                        <Text style={[styles.macroLabel, { color: Colors.carbs }]}>Carbs</Text>
                        <TextInput
                            style={styles.macroInput}
                            value={carbs}
                            onChangeText={setCarbs}
                            placeholder="0"
                            placeholderTextColor={Colors.textTertiary}
                            keyboardType="decimal-pad"
                        />
                        <Text style={styles.macroUnit}>g</Text>
                    </View>
                    <View style={[styles.macroField, { borderColor: Colors.fat }]}>
                        <Text style={[styles.macroLabel, { color: Colors.fat }]}>Fat</Text>
                        <TextInput
                            style={styles.macroInput}
                            value={fat}
                            onChangeText={setFat}
                            placeholder="0"
                            placeholderTextColor={Colors.textTertiary}
                            keyboardType="decimal-pad"
                        />
                        <Text style={styles.macroUnit}>g</Text>
                    </View>
                </View>

                {renderField('Fiber (optional)', fiber, setFiber, '0', true)}

                <Button title="Save Custom Food" onPress={handleSave} size="lg" style={{ marginTop: Spacing.lg }} />
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
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    field: { marginBottom: Spacing.lg },
    fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
    fieldInput: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md, color: Colors.text, fontSize: FontSize.md,
        borderWidth: 1, borderColor: Colors.border,
    },
    row: { flexDirection: 'row', gap: Spacing.md },
    unitRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
    unitChip: {
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm, backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.border,
    },
    unitChipActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceLight },
    unitChipText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    unitChipTextActive: { color: Colors.primary },
    sectionTitle: {
        color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold,
        marginBottom: Spacing.md, marginTop: Spacing.sm,
    },
    macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg },
    macroField: {
        width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, borderWidth: 1.5, alignItems: 'center',
    },
    macroLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
    macroInput: {
        color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center',
        width: '100%', paddingVertical: Spacing.xs,
    },
    macroUnit: { color: Colors.textTertiary, fontSize: FontSize.xs },
});
