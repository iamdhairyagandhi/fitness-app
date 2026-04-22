import { Button } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { generateId } from '@/lib/utils';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import type { Recipe, RecipeIngredient } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { toast } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DIFFICULTY_OPTIONS: Recipe['difficulty'][] = ['easy', 'medium', 'hard'];
const TAG_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'High-Protein', 'Low-Carb', 'Quick', 'Meal Prep'];

export default function CreateRecipeScreen() {
    const insets = useSafeAreaInsets();
    const { addCustomRecipe } = useMealPlanStore();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [servings, setServings] = useState('2');
    const [prepTime, setPrepTime] = useState('10');
    const [cookTime, setCookTime] = useState('20');
    const [difficulty, setDifficulty] = useState<Recipe['difficulty']>('easy');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [ingredients, setIngredients] = useState<{ name: string; amount: string; unit: string }[]>([
        { name: '', amount: '', unit: 'g' },
    ]);
    const [instructions, setInstructions] = useState<string[]>(['']);

    // Per-serving macros (user enters manually)
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const addIngredient = () => {
        setIngredients([...ingredients, { name: '', amount: '', unit: 'g' }]);
    };

    const removeIngredient = (idx: number) => {
        setIngredients(ingredients.filter((_, i) => i !== idx));
    };

    const updateIngredient = (idx: number, field: string, value: string) => {
        const updated = [...ingredients];
        updated[idx] = { ...updated[idx], [field]: value };
        setIngredients(updated);
    };

    const addInstruction = () => setInstructions([...instructions, '']);
    const removeInstruction = (idx: number) => setInstructions(instructions.filter((_, i) => i !== idx));
    const updateInstruction = (idx: number, value: string) => {
        const updated = [...instructions];
        updated[idx] = value;
        setInstructions(updated);
    };

    const handleSave = () => {
        if (!name.trim()) {
            toast.error('Required', 'Please enter a recipe name.');
            return;
        }
        if (!calories || !protein || !carbs || !fat) {
            toast.error('Required', 'Please enter macros per serving.');
            return;
        }

        const calNum = parseFloat(calories);
        const protNum = parseFloat(protein);
        const carbNum = parseFloat(carbs);
        const fatNum = parseFloat(fat);

        const recipeIngredients: RecipeIngredient[] = ingredients
            .filter((i) => i.name.trim())
            .map((i) => ({
                food_item_id: null,
                name: i.name.trim(),
                amount: parseFloat(i.amount) || 0,
                unit: i.unit,
                calories: 0,
                protein_g: 0,
                carbs_g: 0,
                fat_g: 0,
            }));

        const recipe: Recipe = {
            id: generateId(),
            name: name.trim(),
            description: description.trim(),
            image_url: null,
            prep_time_min: parseInt(prepTime) || 0,
            cook_time_min: parseInt(cookTime) || 0,
            servings: parseInt(servings) || 1,
            calories_per_serving: calNum,
            protein_per_serving: protNum,
            carbs_per_serving: carbNum,
            fat_per_serving: fatNum,
            ingredients: recipeIngredients,
            instructions: instructions.filter((i) => i.trim()),
            tags: selectedTags,
            diet_tags: [],
            cuisine: 'Custom',
            difficulty,
            is_favorited: false,
            rating: null,
            source: 'custom',
        };

        addCustomRecipe(recipe);
        toast.success('Saved!', `${recipe.name} has been added to your recipes.`);
        router.back();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Create Recipe</Text>
                <TouchableOpacity onPress={handleSave}>
                    <Text style={styles.saveBtn}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Name & Description */}
                <Text style={styles.label}>Recipe Name *</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., Protein Pancakes"
                    placeholderTextColor={Colors.textTertiary}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Brief description..."
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                />

                {/* Time & Servings */}
                <View style={styles.row3}>
                    <View style={styles.col3}>
                        <Text style={styles.label}>Prep (min)</Text>
                        <TextInput style={styles.input} value={prepTime} onChangeText={setPrepTime} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
                    </View>
                    <View style={styles.col3}>
                        <Text style={styles.label}>Cook (min)</Text>
                        <TextInput style={styles.input} value={cookTime} onChangeText={setCookTime} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
                    </View>
                    <View style={styles.col3}>
                        <Text style={styles.label}>Servings</Text>
                        <TextInput style={styles.input} value={servings} onChangeText={setServings} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
                    </View>
                </View>

                {/* Difficulty */}
                <Text style={styles.label}>Difficulty</Text>
                <View style={styles.chipRow}>
                    {DIFFICULTY_OPTIONS.map((d) => (
                        <TouchableOpacity
                            key={d}
                            style={[styles.chip, difficulty === d && styles.chipActive]}
                            onPress={() => setDifficulty(d)}
                        >
                            <Text style={[styles.chipText, difficulty === d && styles.chipTextActive]}>
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tags */}
                <Text style={styles.label}>Tags</Text>
                <View style={styles.chipRow}>
                    {TAG_OPTIONS.map((tag) => (
                        <TouchableOpacity
                            key={tag}
                            style={[styles.chip, selectedTags.includes(tag) && styles.chipActive]}
                            onPress={() => toggleTag(tag)}
                        >
                            <Text style={[styles.chipText, selectedTags.includes(tag) && styles.chipTextActive]}>
                                {tag}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Macros per serving */}
                <Text style={styles.sectionTitle}>Macros Per Serving *</Text>
                <View style={styles.macroRow}>
                    <View style={styles.macroCol}>
                        <Text style={[styles.macroLabel, { color: Colors.calories }]}>Calories</Text>
                        <TextInput style={styles.macroInput} value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textTertiary} />
                    </View>
                    <View style={styles.macroCol}>
                        <Text style={[styles.macroLabel, { color: Colors.protein }]}>Protein</Text>
                        <TextInput style={styles.macroInput} value={protein} onChangeText={setProtein} keyboardType="numeric" placeholder="0g" placeholderTextColor={Colors.textTertiary} />
                    </View>
                    <View style={styles.macroCol}>
                        <Text style={[styles.macroLabel, { color: Colors.carbs }]}>Carbs</Text>
                        <TextInput style={styles.macroInput} value={carbs} onChangeText={setCarbs} keyboardType="numeric" placeholder="0g" placeholderTextColor={Colors.textTertiary} />
                    </View>
                    <View style={styles.macroCol}>
                        <Text style={[styles.macroLabel, { color: Colors.fat }]}>Fat</Text>
                        <TextInput style={styles.macroInput} value={fat} onChangeText={setFat} keyboardType="numeric" placeholder="0g" placeholderTextColor={Colors.textTertiary} />
                    </View>
                </View>

                {/* Ingredients */}
                <Text style={styles.sectionTitle}>Ingredients</Text>
                {ingredients.map((ing, idx) => (
                    <View key={idx} style={styles.ingredientRow}>
                        <TextInput
                            style={[styles.input, { flex: 2 }]}
                            value={ing.name}
                            onChangeText={(v) => updateIngredient(idx, 'name', v)}
                            placeholder="Ingredient name"
                            placeholderTextColor={Colors.textTertiary}
                        />
                        <TextInput
                            style={[styles.input, { flex: 0.7, marginLeft: 8 }]}
                            value={ing.amount}
                            onChangeText={(v) => updateIngredient(idx, 'amount', v)}
                            placeholder="Amt"
                            placeholderTextColor={Colors.textTertiary}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={[styles.input, { flex: 0.5, marginLeft: 8 }]}
                            value={ing.unit}
                            onChangeText={(v) => updateIngredient(idx, 'unit', v)}
                            placeholder="g"
                            placeholderTextColor={Colors.textTertiary}
                        />
                        {ingredients.length > 1 && (
                            <TouchableOpacity onPress={() => removeIngredient(idx)} style={styles.removeBtn}>
                                <Ionicons name="close-circle" size={20} color={Colors.accent} />
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
                <TouchableOpacity onPress={addIngredient} style={styles.addBtn}>
                    <Ionicons name="add-circle" size={20} color={Colors.primary} />
                    <Text style={styles.addBtnText}>Add Ingredient</Text>
                </TouchableOpacity>

                {/* Instructions */}
                <Text style={styles.sectionTitle}>Instructions</Text>
                {instructions.map((inst, idx) => (
                    <View key={idx} style={styles.instructionRow}>
                        <Text style={styles.stepNum}>{idx + 1}.</Text>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            value={inst}
                            onChangeText={(v) => updateInstruction(idx, v)}
                            placeholder={`Step ${idx + 1}...`}
                            placeholderTextColor={Colors.textTertiary}
                        />
                        {instructions.length > 1 && (
                            <TouchableOpacity onPress={() => removeInstruction(idx)} style={styles.removeBtn}>
                                <Ionicons name="close-circle" size={20} color={Colors.accent} />
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
                <TouchableOpacity onPress={addInstruction} style={styles.addBtn}>
                    <Ionicons name="add-circle" size={20} color={Colors.primary} />
                    <Text style={styles.addBtnText}>Add Step</Text>
                </TouchableOpacity>

                {/* Save Button */}
                <Button
                    title="Save Recipe"
                    onPress={handleSave}
                    variant="primary"
                    style={{ marginTop: Spacing.xxl, marginBottom: Spacing.xxl }}
                />
            </ScrollView>
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
    saveBtn: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },

    label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginTop: Spacing.md, marginBottom: Spacing.xs },
    sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.xxl, marginBottom: Spacing.md },
    input: {
        backgroundColor: Colors.surface, color: Colors.text, borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md,
        borderWidth: 1, borderColor: Colors.surfaceLight,
    },

    row3: { flexDirection: 'row', gap: Spacing.md },
    col3: { flex: 1 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.surfaceLight,
    },
    chipActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
    chipText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    chipTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },

    macroRow: { flexDirection: 'row', gap: Spacing.sm },
    macroCol: { flex: 1, alignItems: 'center' },
    macroLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginBottom: 4 },
    macroInput: {
        backgroundColor: Colors.surface, color: Colors.text, borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, fontSize: FontSize.md,
        borderWidth: 1, borderColor: Colors.surfaceLight, textAlign: 'center', width: '100%',
    },

    ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    instructionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
    stepNum: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold, width: 24 },
    removeBtn: { marginLeft: 8, padding: 4 },

    addBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm },
    addBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
