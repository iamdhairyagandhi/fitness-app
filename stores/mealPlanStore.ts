import { saveDietProfile, saveFastingSession } from '@/lib/db';
import { generateId } from '@/lib/utils';
import type {
    DietPhase,
    DietProfile,
    DietTemplate,
    FastingSession,
    GroceryItem,
    GroceryList,
    MealPlan,
    Recipe
} from '@/types';
import { create } from 'zustand';

// ── Built-in recipe database ──────────────────────────────────

const BUILT_IN_RECIPES: Recipe[] = [
    {
        id: 'r1', name: 'Protein Overnight Oats', description: 'High-protein breakfast prep', image_url: null,
        prep_time_min: 5, cook_time_min: 0, servings: 1, calories_per_serving: 420, protein_per_serving: 35,
        carbs_per_serving: 48, fat_per_serving: 10,
        ingredients: [
            { food_item_id: null, name: 'Oats', amount: 50, unit: 'g', calories: 190, protein_g: 6.5, carbs_g: 34, fat_g: 3.5 },
            { food_item_id: null, name: 'Whey Protein', amount: 30, unit: 'g', calories: 120, protein_g: 24, carbs_g: 3, fat_g: 1.5 },
            { food_item_id: null, name: 'Greek Yogurt', amount: 100, unit: 'g', calories: 60, protein_g: 10, carbs_g: 4, fat_g: 0.5 },
            { food_item_id: null, name: 'Blueberries', amount: 50, unit: 'g', calories: 28, protein_g: 0.4, carbs_g: 7, fat_g: 0.2 },
            { food_item_id: null, name: 'Chia Seeds', amount: 10, unit: 'g', calories: 49, protein_g: 1.7, carbs_g: 4, fat_g: 3 },
        ],
        instructions: ['Combine oats, protein powder, and yogurt in a jar', 'Add milk to cover, stir well', 'Top with blueberries and chia seeds', 'Refrigerate overnight (8+ hours)'],
        tags: ['meal-prep', 'high-protein', 'breakfast'], diet_tags: ['standard', 'iifym'], cuisine: 'American',
        difficulty: 'easy', is_favorited: false, rating: 4.7, source: 'built_in',
    },
    {
        id: 'r2', name: 'Chicken Stir Fry', description: 'Quick high-protein dinner', image_url: null,
        prep_time_min: 10, cook_time_min: 15, servings: 2, calories_per_serving: 380, protein_per_serving: 38,
        carbs_per_serving: 20, fat_per_serving: 14,
        ingredients: [
            { food_item_id: null, name: 'Chicken Breast', amount: 300, unit: 'g', calories: 495, protein_g: 93, carbs_g: 0, fat_g: 10.8 },
            { food_item_id: null, name: 'Broccoli', amount: 150, unit: 'g', calories: 52, protein_g: 3.6, carbs_g: 10, fat_g: 0.6 },
            { food_item_id: null, name: 'Bell Pepper', amount: 100, unit: 'g', calories: 31, protein_g: 1, carbs_g: 6, fat_g: 0.3 },
            { food_item_id: null, name: 'Soy Sauce', amount: 20, unit: 'ml', calories: 12, protein_g: 1.8, carbs_g: 1, fat_g: 0 },
            { food_item_id: null, name: 'Olive Oil', amount: 15, unit: 'ml', calories: 120, protein_g: 0, carbs_g: 0, fat_g: 14 },
            { food_item_id: null, name: 'Garlic', amount: 5, unit: 'g', calories: 7, protein_g: 0.3, carbs_g: 1.5, fat_g: 0 },
        ],
        instructions: ['Slice chicken into strips, season with salt & pepper', 'Heat oil in wok on high heat', 'Cook chicken 5-6 min until golden', 'Add vegetables, stir fry 4-5 min', 'Add soy sauce and garlic, toss 1 min', 'Serve immediately'],
        tags: ['quick', 'high-protein', 'dinner'], diet_tags: ['standard', 'paleo', 'iifym'], cuisine: 'Asian',
        difficulty: 'easy', is_favorited: false, rating: 4.5, source: 'built_in',
    },
    {
        id: 'r3', name: 'Greek Protein Bowl', description: 'Mediterranean-style macro-friendly bowl', image_url: null,
        prep_time_min: 15, cook_time_min: 0, servings: 1, calories_per_serving: 480, protein_per_serving: 42,
        carbs_per_serving: 35, fat_per_serving: 18,
        ingredients: [
            { food_item_id: null, name: 'Grilled Chicken', amount: 150, unit: 'g', calories: 248, protein_g: 46, carbs_g: 0, fat_g: 5.4 },
            { food_item_id: null, name: 'Cucumber', amount: 80, unit: 'g', calories: 12, protein_g: 0.5, carbs_g: 3, fat_g: 0.1 },
            { food_item_id: null, name: 'Tomato', amount: 80, unit: 'g', calories: 14, protein_g: 0.7, carbs_g: 3, fat_g: 0.2 },
            { food_item_id: null, name: 'Feta Cheese', amount: 30, unit: 'g', calories: 79, protein_g: 4.3, carbs_g: 1.2, fat_g: 6.4 },
            { food_item_id: null, name: 'Hummus', amount: 40, unit: 'g', calories: 66, protein_g: 3, carbs_g: 6, fat_g: 4 },
            { food_item_id: null, name: 'Quinoa (cooked)', amount: 100, unit: 'g', calories: 120, protein_g: 4.4, carbs_g: 21, fat_g: 1.9 },
        ],
        instructions: ['Cook quinoa according to package directions, let cool', 'Dice cucumber, tomato, and crumble feta', 'Arrange quinoa in bowl, top with chicken', 'Add veggies and feta around the bowl', 'Dollop hummus on top, drizzle olive oil'],
        tags: ['meal-prep', 'high-protein', 'lunch'], diet_tags: ['standard', 'mediterranean', 'iifym'], cuisine: 'Mediterranean',
        difficulty: 'easy', is_favorited: false, rating: 4.8, source: 'built_in',
    },
    {
        id: 'r4', name: 'Salmon with Sweet Potato', description: 'Omega-3 rich power meal', image_url: null,
        prep_time_min: 10, cook_time_min: 25, servings: 1, calories_per_serving: 520, protein_per_serving: 36,
        carbs_per_serving: 42, fat_per_serving: 20,
        ingredients: [
            { food_item_id: null, name: 'Salmon Fillet', amount: 150, unit: 'g', calories: 312, protein_g: 30, carbs_g: 0, fat_g: 20 },
            { food_item_id: null, name: 'Sweet Potato', amount: 200, unit: 'g', calories: 180, protein_g: 4, carbs_g: 42, fat_g: 0.2 },
            { food_item_id: null, name: 'Asparagus', amount: 100, unit: 'g', calories: 20, protein_g: 2.2, carbs_g: 3.9, fat_g: 0.1 },
            { food_item_id: null, name: 'Lemon juice', amount: 15, unit: 'ml', calories: 4, protein_g: 0.1, carbs_g: 1.3, fat_g: 0 },
        ],
        instructions: ['Preheat oven to 400°F/200°C', 'Cube sweet potato, toss with olive oil, roast 15 min', 'Season salmon with lemon, salt, pepper', 'Add salmon and asparagus to pan, roast 12 min', 'Serve together with a lemon wedge'],
        tags: ['omega-3', 'dinner', 'whole-food'], diet_tags: ['standard', 'paleo', 'mediterranean'], cuisine: 'American',
        difficulty: 'medium', is_favorited: false, rating: 4.6, source: 'built_in',
    },
    {
        id: 'r5', name: 'Vegan Lentil Curry', description: 'Plant-powered protein-rich curry', image_url: null,
        prep_time_min: 10, cook_time_min: 30, servings: 3, calories_per_serving: 350, protein_per_serving: 18,
        carbs_per_serving: 50, fat_per_serving: 8,
        ingredients: [
            { food_item_id: null, name: 'Red Lentils', amount: 200, unit: 'g', calories: 680, protein_g: 47, carbs_g: 116, fat_g: 2 },
            { food_item_id: null, name: 'Coconut Milk', amount: 200, unit: 'ml', calories: 380, protein_g: 4, carbs_g: 6, fat_g: 40 },
            { food_item_id: null, name: 'Tomatoes (canned)', amount: 200, unit: 'g', calories: 36, protein_g: 1.6, carbs_g: 8, fat_g: 0.2 },
            { food_item_id: null, name: 'Onion', amount: 100, unit: 'g', calories: 40, protein_g: 1.1, carbs_g: 9.3, fat_g: 0.1 },
            { food_item_id: null, name: 'Curry Powder', amount: 10, unit: 'g', calories: 31, protein_g: 1.3, carbs_g: 5.8, fat_g: 1.4 },
            { food_item_id: null, name: 'Spinach', amount: 60, unit: 'g', calories: 14, protein_g: 1.7, carbs_g: 2.2, fat_g: 0.2 },
        ],
        instructions: ['Dice onion, sauté in pot until soft', 'Add curry powder, cook 1 min', 'Add lentils, tomatoes, coconut milk, and water', 'Simmer 25 min until lentils are tender', 'Stir in spinach until wilted', 'Serve over rice or with naan'],
        tags: ['vegan', 'meal-prep', 'high-fiber'], diet_tags: ['vegan', 'vegetarian', 'standard'], cuisine: 'Indian',
        difficulty: 'easy', is_favorited: false, rating: 4.4, source: 'built_in',
    },
    {
        id: 'r6', name: 'Egg White Veggie Omelette', description: 'Low-cal high-protein breakfast', image_url: null,
        prep_time_min: 5, cook_time_min: 8, servings: 1, calories_per_serving: 220, protein_per_serving: 28,
        carbs_per_serving: 8, fat_per_serving: 8,
        ingredients: [
            { food_item_id: null, name: 'Egg Whites', amount: 200, unit: 'g', calories: 104, protein_g: 22, carbs_g: 1.4, fat_g: 0.4 },
            { food_item_id: null, name: 'Spinach', amount: 40, unit: 'g', calories: 9, protein_g: 1.2, carbs_g: 1.4, fat_g: 0.2 },
            { food_item_id: null, name: 'Mushrooms', amount: 50, unit: 'g', calories: 11, protein_g: 1.5, carbs_g: 1.6, fat_g: 0.2 },
            { food_item_id: null, name: 'Feta Cheese', amount: 20, unit: 'g', calories: 53, protein_g: 2.8, carbs_g: 0.8, fat_g: 4.3 },
            { food_item_id: null, name: 'Olive Oil Spray', amount: 3, unit: 'g', calories: 24, protein_g: 0, carbs_g: 0, fat_g: 2.7 },
        ],
        instructions: ['Spray pan with olive oil, heat medium', 'Sauté mushrooms 3 min, add spinach until wilted', 'Pour egg whites over veggies', 'Cook 3-4 min until edges set', 'Add feta, fold omelette in half', 'Cook 1 more min, serve'],
        tags: ['low-cal', 'high-protein', 'breakfast'], diet_tags: ['standard', 'keto', 'iifym'], cuisine: 'American',
        difficulty: 'easy', is_favorited: false, rating: 4.3, source: 'built_in',
    },
    {
        id: 'r7', name: 'Turkey Taco Lettuce Wraps', description: 'Low-carb taco alternative', image_url: null,
        prep_time_min: 10, cook_time_min: 12, servings: 2, calories_per_serving: 310, protein_per_serving: 32,
        carbs_per_serving: 12, fat_per_serving: 14,
        ingredients: [
            { food_item_id: null, name: 'Ground Turkey (93% lean)', amount: 250, unit: 'g', calories: 400, protein_g: 55, carbs_g: 0, fat_g: 18 },
            { food_item_id: null, name: 'Taco Seasoning', amount: 15, unit: 'g', calories: 30, protein_g: 1, carbs_g: 6, fat_g: 0.5 },
            { food_item_id: null, name: 'Butter Lettuce', amount: 100, unit: 'g', calories: 13, protein_g: 1.4, carbs_g: 2.2, fat_g: 0.2 },
            { food_item_id: null, name: 'Avocado', amount: 50, unit: 'g', calories: 80, protein_g: 1, carbs_g: 4.3, fat_g: 7.4 },
            { food_item_id: null, name: 'Salsa', amount: 60, unit: 'g', calories: 18, protein_g: 0.5, carbs_g: 4, fat_g: 0.1 },
            { food_item_id: null, name: 'Cheddar Cheese', amount: 20, unit: 'g', calories: 80, protein_g: 5, carbs_g: 0.3, fat_g: 6.6 },
        ],
        instructions: ['Brown ground turkey in skillet 6-7 min', 'Add taco seasoning and a splash of water, simmer 3 min', 'Separate lettuce into cups', 'Spoon turkey into lettuce cups', 'Top with avocado, salsa, and cheese'],
        tags: ['low-carb', 'high-protein', 'dinner'], diet_tags: ['standard', 'keto', 'paleo'], cuisine: 'Mexican',
        difficulty: 'easy', is_favorited: false, rating: 4.5, source: 'built_in',
    },
    {
        id: 'r8', name: 'Banana Protein Pancakes', description: '3-ingredient protein pancakes', image_url: null,
        prep_time_min: 5, cook_time_min: 10, servings: 1, calories_per_serving: 340, protein_per_serving: 30,
        carbs_per_serving: 38, fat_per_serving: 8,
        ingredients: [
            { food_item_id: null, name: 'Banana', amount: 100, unit: 'g', calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3 },
            { food_item_id: null, name: 'Eggs', amount: 100, unit: 'g', calories: 143, protein_g: 12.6, carbs_g: 0.7, fat_g: 9.5 },
            { food_item_id: null, name: 'Whey Protein', amount: 25, unit: 'g', calories: 100, protein_g: 20, carbs_g: 2.5, fat_g: 1.2 },
        ],
        instructions: ['Mash banana in bowl', 'Beat eggs and protein powder into banana', 'Heat non-stick pan over medium heat', 'Pour small circles (~3" each)', 'Cook 2 min per side until golden', 'Top with berries or sugar-free syrup'],
        tags: ['breakfast', 'high-protein', 'quick'], diet_tags: ['standard', 'iifym'], cuisine: 'American',
        difficulty: 'easy', is_favorited: false, rating: 4.6, source: 'built_in',
    },
];

// ── Diet templates with macro ratios ─────────────────────────

interface DietTemplateConfig {
    name: string;
    description: string;
    protein_pct: number;
    carbs_pct: number;
    fat_pct: number;
    excluded_tags: string[];
}

export const DIET_TEMPLATES: Record<DietTemplate, DietTemplateConfig> = {
    standard: { name: 'Standard', description: 'Balanced macros for general fitness', protein_pct: 0.30, carbs_pct: 0.40, fat_pct: 0.30, excluded_tags: [] },
    keto: { name: 'Keto', description: 'Very low carb, high fat', protein_pct: 0.25, carbs_pct: 0.05, fat_pct: 0.70, excluded_tags: ['grains', 'sugar', 'legumes'] },
    paleo: { name: 'Paleo', description: 'Whole foods, no grains or dairy', protein_pct: 0.30, carbs_pct: 0.30, fat_pct: 0.40, excluded_tags: ['grains', 'dairy', 'legumes', 'processed'] },
    vegan: { name: 'Vegan', description: 'Plant-based only', protein_pct: 0.20, carbs_pct: 0.50, fat_pct: 0.30, excluded_tags: ['meat', 'dairy', 'eggs', 'honey'] },
    vegetarian: { name: 'Vegetarian', description: 'No meat, eggs & dairy OK', protein_pct: 0.25, carbs_pct: 0.45, fat_pct: 0.30, excluded_tags: ['meat', 'fish'] },
    mediterranean: { name: 'Mediterranean', description: 'Heart-healthy Mediterranean diet', protein_pct: 0.20, carbs_pct: 0.45, fat_pct: 0.35, excluded_tags: [] },
    carnivore: { name: 'Carnivore', description: 'Animal products only', protein_pct: 0.35, carbs_pct: 0.00, fat_pct: 0.65, excluded_tags: ['vegetables', 'fruits', 'grains'] },
    whole30: { name: 'Whole30', description: '30-day elimination diet', protein_pct: 0.30, carbs_pct: 0.30, fat_pct: 0.40, excluded_tags: ['grains', 'dairy', 'sugar', 'legumes', 'alcohol'] },
    dash: { name: 'DASH', description: 'Heart-healthy, low sodium', protein_pct: 0.18, carbs_pct: 0.55, fat_pct: 0.27, excluded_tags: [] },
    iifym: { name: 'IIFYM', description: 'If It Fits Your Macros - flexible', protein_pct: 0.30, carbs_pct: 0.40, fat_pct: 0.30, excluded_tags: [] },
    intermittent_fasting: { name: 'Intermittent Fasting', description: '16:8 or 20:4 fasting window', protein_pct: 0.30, carbs_pct: 0.40, fat_pct: 0.30, excluded_tags: [] },
    custom: { name: 'Custom', description: 'Set your own macro ratios', protein_pct: 0.30, carbs_pct: 0.40, fat_pct: 0.30, excluded_tags: [] },
};

// ── Store ────────────────────────────────────────────────────

interface MealPlanState {
    // Diet profile
    dietProfile: DietProfile;

    // Recipes
    recipes: Recipe[];
    favoriteRecipes: string[];

    // Meal plans
    activeMealPlan: MealPlan | null;
    mealPlans: MealPlan[];

    // Grocery
    groceryList: GroceryList | null;

    // Fasting
    activeFast: FastingSession | null;
    fastHistory: FastingSession[];

    // Actions - Diet
    setDietProfile: (profile: Partial<DietProfile>) => void;
    setDietTemplate: (template: DietTemplate) => void;
    setDietPhase: (phase: DietPhase) => void;
    toggleMacroCycling: (enabled: boolean) => void;

    // Actions - Recipes
    toggleFavorite: (recipeId: string) => void;
    addCustomRecipe: (recipe: Recipe) => void;

    // Actions - Meal Plans
    setActiveMealPlan: (plan: MealPlan) => void;
    addMealPlan: (plan: MealPlan) => void;

    // Actions - Grocery
    setGroceryList: (list: GroceryList) => void;
    toggleGroceryItem: (index: number) => void;
    generateGroceryList: () => void;

    // Actions - Fasting
    startFast: (targetHours: number) => void;
    endFast: () => void;
}

const defaultDietProfile: DietProfile = {
    template: 'standard',
    phase: 'maintain',
    phase_start_date: new Date().toISOString(),
    phase_target_date: null,
    macro_cycle_enabled: false,
    macro_cycle_pattern: ['moderate', 'moderate', 'moderate', 'moderate', 'moderate', 'moderate', 'moderate'],
    fasting_enabled: false,
    fasting_window_start: null,
    fasting_window_end: null,
    allergies: [],
    intolerances: [],
    excluded_foods: [],
    preferred_cuisines: [],
};

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
    dietProfile: defaultDietProfile,
    recipes: BUILT_IN_RECIPES,
    favoriteRecipes: [],
    activeMealPlan: null,
    mealPlans: [],
    groceryList: null,
    activeFast: null,
    fastHistory: [],

    setDietProfile: (profile) => {
        const updated = { ...get().dietProfile, ...profile };
        set({ dietProfile: updated });
        saveDietProfile(updated).catch(() => { });
    },

    setDietTemplate: (template) => {
        const config = DIET_TEMPLATES[template];
        const updated = { ...get().dietProfile, template };
        set({ dietProfile: updated });
        saveDietProfile(updated).catch(() => { });
    },

    setDietPhase: (phase) => {
        const updated = { ...get().dietProfile, phase, phase_start_date: new Date().toISOString() };
        set({ dietProfile: updated });
        saveDietProfile(updated).catch(() => { });
    },

    toggleMacroCycling: (enabled) => {
        const updated = { ...get().dietProfile, macro_cycle_enabled: enabled };
        set({ dietProfile: updated });
        saveDietProfile(updated).catch(() => { });
    },

    toggleFavorite: (recipeId) => {
        const { favoriteRecipes, recipes } = get();
        const isFav = favoriteRecipes.includes(recipeId);
        set({
            favoriteRecipes: isFav
                ? favoriteRecipes.filter((id) => id !== recipeId)
                : [...favoriteRecipes, recipeId],
            recipes: recipes.map((r) =>
                r.id === recipeId ? { ...r, is_favorited: !r.is_favorited } : r
            ),
        });
    },

    addCustomRecipe: (recipe) => set({ recipes: [recipe, ...get().recipes] }),

    setActiveMealPlan: (plan) => set({ activeMealPlan: plan }),
    addMealPlan: (plan) => set({ mealPlans: [plan, ...get().mealPlans] }),

    setGroceryList: (list) => set({ groceryList: list }),

    toggleGroceryItem: (index) => {
        const { groceryList } = get();
        if (!groceryList) return;
        const items = [...groceryList.items];
        items[index] = { ...items[index], checked: !items[index].checked };
        set({ groceryList: { ...groceryList, items } });
    },

    generateGroceryList: () => {
        const { activeMealPlan } = get();
        if (!activeMealPlan) return;

        const ingredientMap: Record<string, GroceryItem> = {};
        for (const day of activeMealPlan.days) {
            const allMeals = [
                ...day.meals.breakfast,
                ...day.meals.lunch,
                ...day.meals.dinner,
                ...day.meals.snack,
            ];
            for (const meal of allMeals) {
                const key = meal.name.toLowerCase();
                if (ingredientMap[key]) {
                    ingredientMap[key].amount += meal.servings;
                } else {
                    ingredientMap[key] = {
                        name: meal.name,
                        amount: meal.servings,
                        unit: 'serving',
                        category: 'general',
                        checked: false,
                        estimated_cost: null,
                    };
                }
            }
        }

        set({
            groceryList: {
                id: generateId(),
                meal_plan_id: activeMealPlan.id,
                items: Object.values(ingredientMap),
                created_at: new Date().toISOString(),
            },
        });
    },

    startFast: (targetHours) => {
        const now = new Date();
        const target = new Date(now.getTime() + targetHours * 60 * 60 * 1000);
        const session: FastingSession = {
            id: generateId(),
            user_id: '',
            started_at: now.toISOString(),
            target_end_at: target.toISOString(),
            actual_end_at: null,
            fasting_hours: targetHours,
            status: 'active',
            notes: null,
        };
        set({ activeFast: session });
        saveFastingSession(session).catch(() => { });
    },

    endFast: () => {
        const { activeFast, fastHistory } = get();
        if (!activeFast) return;
        const ended: FastingSession = {
            ...activeFast,
            actual_end_at: new Date().toISOString(),
            status: 'completed',
        };
        set({
            activeFast: null,
            fastHistory: [ended, ...fastHistory],
        });
        saveFastingSession(ended).catch(() => { });
    },
}));
