/**
 * FitFusion Nutrition Intelligence Engine — Phase C
 *
 * #18 Natural Language Food Parsing
 * #19 Receipt/Menu Parsing
 * #20 Adaptive Calorie Targets
 * #21 Metabolic Adaptation Detection
 * #22 Gut Health Score
 * #24 IIFYM Suggestions
 * #25 Recipe Macro Adjuster
 */

import type {
    AdaptiveCalorieData,
    FitnessGoal,
    FoodLogEntry,
    GutHealthScore,
    IIFYMBudget,
    IIFYMSuggestion,
    MetabolicAdaptation,
    NLPFoodParseResult,
    ReceiptScanResult,
    Recipe,
    RecipeAdjustment,
    WeightLog
} from '@/types';
import { chatCompletion } from './openai';

// ══════════════════════════════════════════════════════════════
// #20 — Adaptive Calorie Targets
// ══════════════════════════════════════════════════════════════

export function calculateAdaptiveCalories(
    weightLogs: WeightLog[],
    nutritionHistory: { date: string; calories: number }[],
    currentTarget: number,
    goal: FitnessGoal | string,
): AdaptiveCalorieData {
    if (weightLogs.length < 7 || nutritionHistory.length < 7) {
        return {
            currentTDEE: currentTarget,
            adjustedCalories: currentTarget,
            adjustment: 0,
            weeklyWeightTrend: 0,
            expectedWeeklyChange: 0,
            tdeeConfidence: Math.min(weightLogs.length * 5, 30),
            reason: 'Need at least 7 days of weight and nutrition data for adaptive adjustments.',
        };
    }

    // Sort chronologically
    const sortedW = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    const sortedN = [...nutritionHistory].sort((a, b) => a.date.localeCompare(b.date));

    // Weekly averages for the last 2 weeks
    const recentWeights = sortedW.slice(-14);
    const firstWeekW = recentWeights.slice(0, 7);
    const secondWeekW = recentWeights.slice(-7);

    const avgFirst = firstWeekW.reduce((s, w) => s + w.weight_kg, 0) / firstWeekW.length;
    const avgSecond = secondWeekW.reduce((s, w) => s + w.weight_kg, 0) / secondWeekW.length;
    const weeklyWeightTrend = Math.round((avgSecond - avgFirst) * 100) / 100;

    // Average intake over last 14 days
    const recentCals = sortedN.slice(-14);
    const avgCalories = Math.round(recentCals.reduce((s, n) => s + n.calories, 0) / recentCals.length);

    // Estimate TDEE from weight change + intake
    // 1 kg body weight ≈ 7700 kcal
    const dailyWeightChange = weeklyWeightTrend / 7;
    const dailyCalorieSurplus = dailyWeightChange * 7700;
    const estimatedTDEE = Math.round(avgCalories - dailyCalorieSurplus);

    // Calculate confidence based on data points and consistency
    const weightVariance = calculateVariance(recentWeights.map((w) => w.weight_kg));
    const calVariance = calculateVariance(recentCals.map((c) => c.calories));
    const baseConfidence = Math.min(sortedW.length * 3, 60);
    const consistencyBonus = weightVariance < 1 && calVariance < 40000 ? 30 : 10;
    const confidence = Math.min(baseConfidence + consistencyBonus, 95);

    // Goal-based expected weekly change
    let expectedWeeklyChange = 0;
    let goalDeficit = 0;
    if (goal === 'lose_fat') {
        expectedWeeklyChange = -0.5;
        goalDeficit = -550; // ~0.5 kg/wk
    } else if (goal === 'build_muscle') {
        expectedWeeklyChange = 0.25;
        goalDeficit = 275; // ~0.25 kg/wk surplus
    } else if (goal === 'recomp') {
        expectedWeeklyChange = 0;
        goalDeficit = 0;
    }

    const adjustedCalories = Math.round(estimatedTDEE + goalDeficit);
    const adjustment = adjustedCalories - currentTarget;

    let reason = '';
    if (Math.abs(adjustment) < 50) {
        reason = 'Your current target is well-aligned with your actual expenditure. Keep it up!';
    } else if (adjustment > 0) {
        reason = `Based on your weight trend (${weeklyWeightTrend > 0 ? '+' : ''}${weeklyWeightTrend} kg/wk) and intake, your TDEE appears higher than expected. Consider increasing calories by ${adjustment} kcal.`;
    } else {
        reason = `Your weight is not trending as expected for your ${goal.replace('_', ' ')} goal. Reducing by ${Math.abs(adjustment)} kcal should help align with your target of ${expectedWeeklyChange} kg/wk.`;
    }

    return {
        currentTDEE: estimatedTDEE,
        adjustedCalories,
        adjustment,
        weeklyWeightTrend,
        expectedWeeklyChange,
        tdeeConfidence: confidence,
        reason,
    };
}

function calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

// ══════════════════════════════════════════════════════════════
// #21 — Metabolic Adaptation Detection
// ══════════════════════════════════════════════════════════════

export function detectMetabolicAdaptation(
    weightLogs: WeightLog[],
    nutritionHistory: { date: string; calories: number }[],
    calorieTarget: number,
    goal: FitnessGoal | string,
): MetabolicAdaptation {
    const defaultResult: MetabolicAdaptation = {
        detected: false,
        severity: 'none',
        stallWeeks: 0,
        expectedLoss: 0,
        actualLoss: 0,
        avgDeficit: 0,
        recommendation: 'continue',
        recommendationText: 'Your progress looks on track. Keep going!',
    };

    if (goal !== 'lose_fat' || weightLogs.length < 14) {
        return defaultResult;
    }

    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    const avgCals = nutritionHistory.length > 0
        ? nutritionHistory.reduce((s, n) => s + n.calories, 0) / nutritionHistory.length
        : calorieTarget;

    // Compare weekly averages to detect stalls
    const weeks: number[] = [];
    for (let i = 0; i < sorted.length - 6; i += 7) {
        const weekSlice = sorted.slice(i, i + 7);
        const avg = weekSlice.reduce((s, w) => s + w.weight_kg, 0) / weekSlice.length;
        weeks.push(avg);
    }

    // Count consecutive stall weeks (< 0.1 kg change)
    let stallWeeks = 0;
    for (let i = weeks.length - 1; i > 0; i--) {
        const change = weeks[i - 1] - weeks[i];
        if (Math.abs(change) < 0.1) {
            stallWeeks++;
        } else {
            break;
        }
    }

    if (stallWeeks < 2) return defaultResult;

    // Calculate expected vs actual loss
    const estimatedDeficit = calorieTarget - avgCals;
    const avgDeficit = Math.round(Math.abs(estimatedDeficit));
    const expectedWeeklyLoss = (avgDeficit * 7) / 7700; // kg/week
    const expectedLoss = Math.round(expectedWeeklyLoss * stallWeeks * 10) / 10;

    const firstWeekAvg = weeks[Math.max(0, weeks.length - stallWeeks - 1)] || weeks[0];
    const lastWeekAvg = weeks[weeks.length - 1];
    const actualLoss = Math.round((firstWeekAvg - lastWeekAvg) * 10) / 10;

    // Determine severity
    let severity: MetabolicAdaptation['severity'] = 'none';
    let recommendation: MetabolicAdaptation['recommendation'] = 'continue';
    let recommendationText = '';

    if (stallWeeks >= 4) {
        severity = 'severe';
        recommendation = 'reverse_diet';
        recommendationText = 'Consider a reverse diet: gradually increase calories by 100 kcal/week over 4-6 weeks to restore metabolic rate, then resume deficit.';
    } else if (stallWeeks >= 3) {
        severity = 'moderate';
        recommendation = 'diet_break';
        recommendationText = 'Take a 1-2 week diet break at maintenance calories. This can reset hormonal signals and break the plateau.';
    } else {
        severity = 'mild';
        recommendation = 'refeed';
        recommendationText = 'Add 1-2 refeed days per week with higher carbs at maintenance calories. This can boost leptin and thyroid output.';
    }

    return {
        detected: true,
        severity,
        stallWeeks,
        expectedLoss,
        actualLoss,
        avgDeficit,
        recommendation,
        recommendationText,
    };
}

// ══════════════════════════════════════════════════════════════
// #22 — Gut Health Score
// ══════════════════════════════════════════════════════════════

const FIBER_KEYWORDS = [
    'oats', 'broccoli', 'spinach', 'kale', 'beans', 'lentils', 'peas',
    'apple', 'banana', 'berries', 'blueberries', 'raspberries', 'avocado',
    'sweet potato', 'whole wheat', 'brown rice', 'quinoa', 'chia',
    'flax', 'almonds', 'artichoke', 'asparagus', 'brussels sprouts',
    'cauliflower', 'carrot', 'celery', 'pear', 'orange', 'chickpeas',
    'kidney beans', 'black beans', 'edamame', 'barley', 'bran',
];

const FERMENTED_KEYWORDS = [
    'yogurt', 'kefir', 'kimchi', 'sauerkraut', 'kombucha', 'miso',
    'tempeh', 'natto', 'pickle', 'pickled', 'fermented', 'sourdough',
    'cottage cheese',
];

const PREBIOTIC_KEYWORDS = [
    'garlic', 'onion', 'leek', 'asparagus', 'banana', 'chicory',
    'artichoke', 'dandelion', 'oats', 'apple', 'flax', 'cocoa',
    'jicama', 'wheat bran', 'seaweed',
];

export function calculateGutHealthScore(foodLogs: FoodLogEntry[]): GutHealthScore {
    const foodNames = foodLogs.map((f) => f.food_item.name.toLowerCase());

    const uniqueFiberSources = [...new Set(
        FIBER_KEYWORDS.filter((kw) => foodNames.some((n) => n.includes(kw)))
    )];

    const fermentedFoods = [...new Set(
        FERMENTED_KEYWORDS.filter((kw) => foodNames.some((n) => n.includes(kw)))
    )];

    const prebioticFoods = [...new Set(
        PREBIOTIC_KEYWORDS.filter((kw) => foodNames.some((n) => n.includes(kw)))
    )];

    // Fiber diversity: score out of 100 (10+ sources = max)
    const fiberDiversity = Math.min(Math.round((uniqueFiberSources.length / 10) * 100), 100);

    // Fermented foods: score out of 100 (3+ sources = max)
    const fermentedFoodScore = Math.min(Math.round((fermentedFoods.length / 3) * 100), 100);

    // Prebiotics: score out of 100 (5+ sources = max)
    const prebioticScore = Math.min(Math.round((prebioticFoods.length / 5) * 100), 100);

    // Overall weighted score
    const overall = Math.round(fiberDiversity * 0.5 + fermentedFoodScore * 0.3 + prebioticScore * 0.2);

    // Suggestions
    const suggestions: string[] = [];
    if (uniqueFiberSources.length < 5) {
        suggestions.push('Aim for 5+ different fiber sources daily — try adding beans, oats, or berries.');
    }
    if (fermentedFoods.length === 0) {
        suggestions.push('Include fermented foods like yogurt, kimchi, or kefir for beneficial probiotics.');
    }
    if (prebioticFoods.length === 0) {
        suggestions.push('Add prebiotic foods (garlic, onion, banana) to feed your gut bacteria.');
    }
    if (overall >= 70 && suggestions.length === 0) {
        suggestions.push('Great gut health! Keep up the diverse, fiber-rich diet.');
    }

    return {
        overall,
        fiberDiversity,
        fermentedFoodScore,
        prebioticScore,
        uniqueFiberSources,
        fermentedFoods,
        prebioticFoods,
        suggestions,
    };
}

// ══════════════════════════════════════════════════════════════
// #18 — Natural Language Food Parsing
// ══════════════════════════════════════════════════════════════

export async function parseNaturalLanguageFood(text: string): Promise<NLPFoodParseResult> {
    try {
        const response = await chatCompletion(
            [
                {
                    role: 'system',
                    content: `You are a nutrition parser. Given a natural language food description, extract food items with estimated nutrition values. Return ONLY a JSON array with objects containing: name (string), quantity (number), unit (string like "g","oz","cup","piece"), calories (number), protein_g (number), carbs_g (number), fat_g (number), fiber_g (number), confidence (number 0-1). Be accurate with portion sizes and macros. Use standard USDA nutritional data.`,
                },
                {
                    role: 'user',
                    content: text,
                },
            ],
            { maxTokens: 600, temperature: 0.2 }
        );

        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return { items: [], rawText: text };
        }

        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) {
            return { items: [], rawText: text };
        }

        const items = parsed.map((item: any) => ({
            name: String(item.name || 'Unknown'),
            quantity: Number(item.quantity) || 1,
            unit: String(item.unit || 'serving'),
            calories: Math.round(Number(item.calories) || 0),
            protein_g: Math.round((Number(item.protein_g) || 0) * 10) / 10,
            carbs_g: Math.round((Number(item.carbs_g) || 0) * 10) / 10,
            fat_g: Math.round((Number(item.fat_g) || 0) * 10) / 10,
            fiber_g: Math.round((Number(item.fiber_g) || 0) * 10) / 10,
            confidence: Math.min(Math.max(Number(item.confidence) || 0.5, 0), 1),
        }));

        return { items, rawText: text };
    } catch {
        return { items: [], rawText: text };
    }
}

// Demo fallback for offline / no API key
export function parseNaturalLanguageFoodDemo(text: string): NLPFoodParseResult {
    const lower = text.toLowerCase();
    const items: NLPFoodParseResult['items'] = [];

    const patterns: { keywords: string[]; data: NLPFoodParseResult['items'][0] }[] = [
        { keywords: ['chicken breast', 'grilled chicken'], data: { name: 'Grilled Chicken Breast', quantity: 150, unit: 'g', calories: 248, protein_g: 46, carbs_g: 0, fat_g: 5.4, fiber_g: 0, confidence: 0.9 } },
        { keywords: ['rice', 'white rice'], data: { name: 'White Rice (cooked)', quantity: 200, unit: 'g', calories: 260, protein_g: 5.4, carbs_g: 56, fat_g: 0.6, fiber_g: 0.8, confidence: 0.85 } },
        { keywords: ['brown rice'], data: { name: 'Brown Rice (cooked)', quantity: 200, unit: 'g', calories: 224, protein_g: 5.2, carbs_g: 48, fat_g: 1.8, fiber_g: 3.6, confidence: 0.85 } },
        { keywords: ['egg', 'eggs'], data: { name: 'Whole Egg', quantity: 2, unit: 'piece', calories: 144, protein_g: 12.6, carbs_g: 0.8, fat_g: 9.6, fiber_g: 0, confidence: 0.95 } },
        { keywords: ['banana'], data: { name: 'Banana', quantity: 1, unit: 'medium', calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4, fiber_g: 3.1, confidence: 0.95 } },
        { keywords: ['oatmeal', 'oats'], data: { name: 'Oatmeal', quantity: 40, unit: 'g', calories: 152, protein_g: 5.3, carbs_g: 27, fat_g: 2.7, fiber_g: 4, confidence: 0.9 } },
        { keywords: ['protein shake', 'whey'], data: { name: 'Whey Protein Shake', quantity: 1, unit: 'scoop', calories: 120, protein_g: 24, carbs_g: 3, fat_g: 1.5, fiber_g: 0, confidence: 0.9 } },
        { keywords: ['salmon'], data: { name: 'Salmon Fillet', quantity: 150, unit: 'g', calories: 312, protein_g: 30, carbs_g: 0, fat_g: 19.5, fiber_g: 0, confidence: 0.85 } },
        { keywords: ['avocado'], data: { name: 'Avocado', quantity: 0.5, unit: 'piece', calories: 114, protein_g: 1.3, carbs_g: 6, fat_g: 10, fiber_g: 5, confidence: 0.9 } },
        { keywords: ['broccoli'], data: { name: 'Broccoli (steamed)', quantity: 100, unit: 'g', calories: 35, protein_g: 2.4, carbs_g: 7.2, fat_g: 0.4, fiber_g: 3.3, confidence: 0.9 } },
        { keywords: ['yogurt', 'greek yogurt'], data: { name: 'Greek Yogurt', quantity: 170, unit: 'g', calories: 100, protein_g: 17, carbs_g: 6, fat_g: 0.7, fiber_g: 0, confidence: 0.85 } },
        { keywords: ['peanut butter'], data: { name: 'Peanut Butter', quantity: 32, unit: 'g', calories: 188, protein_g: 8, carbs_g: 6, fat_g: 16, fiber_g: 2, confidence: 0.9 } },
        { keywords: ['toast', 'bread'], data: { name: 'Whole Wheat Bread', quantity: 1, unit: 'slice', calories: 69, protein_g: 3.6, carbs_g: 12, fat_g: 1.1, fiber_g: 1.9, confidence: 0.8 } },
        { keywords: ['coffee'], data: { name: 'Black Coffee', quantity: 240, unit: 'ml', calories: 2, protein_g: 0.3, carbs_g: 0, fat_g: 0, fiber_g: 0, confidence: 0.95 } },
        { keywords: ['milk'], data: { name: 'Whole Milk', quantity: 244, unit: 'ml', calories: 149, protein_g: 8, carbs_g: 12, fat_g: 8, fiber_g: 0, confidence: 0.85 } },
        { keywords: ['apple'], data: { name: 'Apple', quantity: 1, unit: 'medium', calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3, fiber_g: 4.4, confidence: 0.95 } },
        { keywords: ['steak', 'beef'], data: { name: 'Steak (sirloin)', quantity: 200, unit: 'g', calories: 352, protein_g: 40, carbs_g: 0, fat_g: 20, fiber_g: 0, confidence: 0.8 } },
        { keywords: ['pasta', 'spaghetti'], data: { name: 'Pasta (cooked)', quantity: 200, unit: 'g', calories: 314, protein_g: 11.4, carbs_g: 61.4, fat_g: 1.9, fiber_g: 3.6, confidence: 0.85 } },
    ];

    for (const p of patterns) {
        if (p.keywords.some((kw) => lower.includes(kw))) {
            items.push({ ...p.data });
        }
    }

    if (items.length === 0) {
        items.push({
            name: text.trim(),
            quantity: 1,
            unit: 'serving',
            calories: 200,
            protein_g: 10,
            carbs_g: 25,
            fat_g: 8,
            fiber_g: 2,
            confidence: 0.3,
        });
    }

    return { items, rawText: text };
}

// ══════════════════════════════════════════════════════════════
// #19 — Receipt / Menu Parsing
// ══════════════════════════════════════════════════════════════

export async function parseReceiptImage(base64Image: string): Promise<ReceiptScanResult> {
    try {
        const response = await chatCompletion(
            [
                {
                    role: 'system',
                    content: `You are a receipt/menu nutrition parser. Analyze the image of a receipt or restaurant menu. Return ONLY a JSON object with: storeName (string|null), totalPrice (number|null), items (array of objects with: name, quantity, calories, protein_g, carbs_g, fat_g, price). Estimate nutrition based on typical serving sizes. Be accurate.`,
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Parse this receipt/menu and estimate nutrition for each item.' },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
                    ] as any,
                },
            ],
            { maxTokens: 800, temperature: 0.2 }
        );

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { items: [], storeName: null, totalPrice: null };
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return {
            storeName: parsed.storeName || null,
            totalPrice: parsed.totalPrice || null,
            items: (parsed.items || []).map((item: any) => ({
                name: String(item.name || 'Unknown'),
                quantity: Number(item.quantity) || 1,
                calories: Math.round(Number(item.calories) || 0),
                protein_g: Math.round((Number(item.protein_g) || 0) * 10) / 10,
                carbs_g: Math.round((Number(item.carbs_g) || 0) * 10) / 10,
                fat_g: Math.round((Number(item.fat_g) || 0) * 10) / 10,
                price: item.price != null ? Number(item.price) : null,
            })),
        };
    } catch {
        return { items: [], storeName: null, totalPrice: null };
    }
}

export function parseReceiptDemo(): ReceiptScanResult {
    return {
        storeName: 'Healthy Eats Deli',
        totalPrice: 24.50,
        items: [
            { name: 'Grilled Chicken Wrap', quantity: 1, calories: 420, protein_g: 35, carbs_g: 38, fat_g: 14, price: 8.99 },
            { name: 'Greek Salad (side)', quantity: 1, calories: 150, protein_g: 5, carbs_g: 10, fat_g: 10, price: 4.50 },
            { name: 'Protein Smoothie', quantity: 1, calories: 280, protein_g: 28, carbs_g: 32, fat_g: 5, price: 6.99 },
            { name: 'Mixed Nuts (small)', quantity: 1, calories: 210, protein_g: 7, carbs_g: 8, fat_g: 18, price: 4.02 },
        ],
    };
}

// ══════════════════════════════════════════════════════════════
// #24 — IIFYM Suggestions
// ══════════════════════════════════════════════════════════════

const IIFYM_FOOD_DB: { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; tags: string[] }[] = [
    { name: 'Greek Yogurt (170g)', calories: 100, protein_g: 17, carbs_g: 6, fat_g: 0.7, tags: ['protein', 'snack'] },
    { name: 'Chicken Breast (100g)', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, tags: ['protein', 'meal'] },
    { name: 'Whey Protein Shake', calories: 120, protein_g: 24, carbs_g: 3, fat_g: 1.5, tags: ['protein', 'quick'] },
    { name: 'Banana', calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4, tags: ['carbs', 'snack', 'quick'] },
    { name: 'Rice (200g cooked)', calories: 260, protein_g: 5.4, carbs_g: 56, fat_g: 0.6, tags: ['carbs', 'meal'] },
    { name: 'Oats (40g dry)', calories: 152, protein_g: 5.3, carbs_g: 27, fat_g: 2.7, tags: ['carbs', 'breakfast'] },
    { name: 'Sweet Potato (medium)', calories: 103, protein_g: 2.3, carbs_g: 24, fat_g: 0.1, tags: ['carbs', 'meal'] },
    { name: 'Peanut Butter (2 tbsp)', calories: 188, protein_g: 8, carbs_g: 6, fat_g: 16, tags: ['fat', 'snack'] },
    { name: 'Almonds (28g)', calories: 164, protein_g: 6, carbs_g: 6, fat_g: 14, tags: ['fat', 'snack'] },
    { name: 'Avocado (half)', calories: 114, protein_g: 1.3, carbs_g: 6, fat_g: 10, tags: ['fat', 'meal'] },
    { name: 'Cottage Cheese (113g)', calories: 92, protein_g: 12, carbs_g: 5, fat_g: 2.6, tags: ['protein', 'snack'] },
    { name: 'Tuna Can (100g)', calories: 116, protein_g: 26, carbs_g: 0, fat_g: 0.8, tags: ['protein', 'quick'] },
    { name: 'Whole Wheat Bread (2 slices)', calories: 138, protein_g: 7.2, carbs_g: 24, fat_g: 2.2, tags: ['carbs', 'quick'] },
    { name: 'Eggs (2 whole)', calories: 144, protein_g: 12.6, carbs_g: 0.8, fat_g: 9.6, tags: ['protein', 'fat', 'quick'] },
    { name: 'Salmon (100g)', calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13, tags: ['protein', 'fat', 'meal'] },
    { name: 'Apple + PB (1 tbsp)', calories: 189, protein_g: 4.5, carbs_g: 28, fat_g: 8, tags: ['snack', 'balanced'] },
    { name: 'Protein Bar', calories: 220, protein_g: 20, carbs_g: 24, fat_g: 8, tags: ['protein', 'snack', 'quick'] },
    { name: 'Dark Chocolate (28g)', calories: 170, protein_g: 2.2, carbs_g: 13, fat_g: 12, tags: ['fat', 'treat'] },
    { name: 'Blueberries (1 cup)', calories: 84, protein_g: 1.1, carbs_g: 21, fat_g: 0.5, tags: ['carbs', 'snack'] },
    { name: 'Edamame (100g)', calories: 121, protein_g: 11, carbs_g: 9, fat_g: 5, tags: ['protein', 'snack'] },
];

export function calculateIIFYMBudget(
    consumed: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
    target: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
): IIFYMBudget {
    const remaining = {
        calories: Math.max(target.calories - consumed.calories, 0),
        protein_g: Math.max(target.protein_g - consumed.protein_g, 0),
        carbs_g: Math.max(target.carbs_g - consumed.carbs_g, 0),
        fat_g: Math.max(target.fat_g - consumed.fat_g, 0),
    };

    // Determine primary need
    const proteinPct = consumed.protein_g / (target.protein_g || 1);
    const carbsPct = consumed.carbs_g / (target.carbs_g || 1);
    const fatPct = consumed.fat_g / (target.fat_g || 1);

    const suggestions: IIFYMSuggestion[] = [];

    for (const food of IIFYM_FOOD_DB) {
        if (food.calories > remaining.calories + 50) continue;

        let score = 0;
        let reason = '';

        // Score based on what's most needed
        if (proteinPct < carbsPct && proteinPct < fatPct && food.protein_g >= 10) {
            score = food.protein_g / food.calories * 100;
            reason = `High protein (${food.protein_g}g) to fill your ${Math.round(remaining.protein_g)}g protein gap`;
        } else if (carbsPct < proteinPct && carbsPct < fatPct && food.carbs_g >= 10) {
            score = food.carbs_g / food.calories * 100;
            reason = `Good carb source (${food.carbs_g}g) for your ${Math.round(remaining.carbs_g)}g carbs gap`;
        } else if (fatPct < proteinPct && fatPct < carbsPct && food.fat_g >= 5) {
            score = food.fat_g / food.calories * 100;
            reason = `Healthy fats (${food.fat_g}g) for your ${Math.round(remaining.fat_g)}g fat gap`;
        } else if (food.calories <= remaining.calories) {
            score = 1;
            reason = `Fits your remaining ${remaining.calories} kcal budget`;
        }

        if (score > 0) {
            suggestions.push({
                name: food.name,
                servings: 1,
                calories: food.calories,
                protein_g: food.protein_g,
                carbs_g: food.carbs_g,
                fat_g: food.fat_g,
                reason,
            });
        }
    }

    // Sort by relevance and take top 6
    suggestions.sort((a, b) => {
        const aMatch = matchScore(a, remaining);
        const bMatch = matchScore(b, remaining);
        return bMatch - aMatch;
    });

    return {
        remaining,
        consumed,
        target,
        suggestions: suggestions.slice(0, 6),
    };
}

function matchScore(
    s: IIFYMSuggestion,
    remaining: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
): number {
    const calFit = remaining.calories > 0 ? Math.min(s.calories / remaining.calories, 1) : 0;
    const proFit = remaining.protein_g > 0 ? Math.min(s.protein_g / remaining.protein_g, 1) : 0;
    const carFit = remaining.carbs_g > 0 ? Math.min(s.carbs_g / remaining.carbs_g, 1) : 0;
    const fatFit = remaining.fat_g > 0 ? Math.min(s.fat_g / remaining.fat_g, 1) : 0;
    return proFit * 0.4 + carFit * 0.2 + fatFit * 0.2 + calFit * 0.2;
}

// ══════════════════════════════════════════════════════════════
// #25 — Recipe Macro Adjuster
// ══════════════════════════════════════════════════════════════

export function adjustRecipeMacros(
    recipe: Recipe,
    targetMacros: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
): RecipeAdjustment {
    const currentCals = recipe.calories_per_serving;
    const currentPro = recipe.protein_per_serving;
    const currentCarbs = recipe.carbs_per_serving;
    const currentFat = recipe.fat_per_serving;

    // Calculate scale factors for each macro
    const calScale = currentCals > 0 ? targetMacros.calories / currentCals : 1;
    const proScale = currentPro > 0 ? targetMacros.protein_g / currentPro : 1;
    const carbScale = currentCarbs > 0 ? targetMacros.carbs_g / currentCarbs : 1;
    const fatScale = currentFat > 0 ? targetMacros.fat_g / currentFat : 1;

    // Use a balanced approach — primarily scale by calories, nudge toward macro targets
    const primaryScale = calScale;

    const adjustedIngredients = recipe.ingredients.map((ing) => {
        // Categorize ingredient by dominant macro
        const totalMacro = ing.protein_g + ing.carbs_g + ing.fat_g;
        const isProteinDominant = totalMacro > 0 && ing.protein_g / totalMacro > 0.5;
        const isCarbDominant = totalMacro > 0 && ing.carbs_g / totalMacro > 0.5;
        const isFatDominant = totalMacro > 0 && ing.fat_g / totalMacro > 0.5;

        let scale = primaryScale;
        if (isProteinDominant) scale = (primaryScale + proScale) / 2;
        else if (isCarbDominant) scale = (primaryScale + carbScale) / 2;
        else if (isFatDominant) scale = (primaryScale + fatScale) / 2;

        const adjustedAmount = Math.round(ing.amount * scale * 10) / 10;

        let swapSuggestion: string | null = null;
        // Suggest swaps for significant macro shifts
        if (proScale > 1.3 && !isProteinDominant && ing.protein_g < 5) {
            swapSuggestion = 'Consider adding a protein source or using a high-protein alternative';
        }
        if (fatScale < 0.7 && isFatDominant) {
            swapSuggestion = 'Try a lower-fat alternative (e.g., light version or cooking spray)';
        }
        if (carbScale < 0.7 && isCarbDominant) {
            swapSuggestion = 'Try a lower-carb alternative (e.g., cauliflower rice instead of rice)';
        }

        return {
            name: ing.name,
            originalAmount: ing.amount,
            adjustedAmount,
            unit: ing.unit,
            swapSuggestion,
        };
    });

    // Calculate resulting macros from adjusted amounts
    let adjCals = 0, adjPro = 0, adjCarbs = 0, adjFat = 0;
    for (let i = 0; i < recipe.ingredients.length; i++) {
        const ing = recipe.ingredients[i];
        const ratio = adjustedIngredients[i].adjustedAmount / (ing.amount || 1);
        adjCals += ing.calories * ratio;
        adjPro += ing.protein_g * ratio;
        adjCarbs += ing.carbs_g * ratio;
        adjFat += ing.fat_g * ratio;
    }

    // For recipes whose ingredient macros don't add up to per-serving macros
    // (common with simple recipes), use the simple scale
    if (adjCals === 0) {
        adjCals = Math.round(currentCals * primaryScale);
        adjPro = Math.round(currentPro * proScale * 10) / 10;
        adjCarbs = Math.round(currentCarbs * carbScale * 10) / 10;
        adjFat = Math.round(currentFat * fatScale * 10) / 10;
    } else {
        adjCals = Math.round(adjCals / recipe.servings);
        adjPro = Math.round(adjPro / recipe.servings * 10) / 10;
        adjCarbs = Math.round(adjCarbs / recipe.servings * 10) / 10;
        adjFat = Math.round(adjFat / recipe.servings * 10) / 10;
    }

    const notes: string[] = [];
    const calDiff = Math.abs(adjCals - targetMacros.calories);
    if (calDiff > 50) {
        notes.push(`Adjusted calories (${adjCals}) are ${calDiff} kcal off target — fine-tune portion size.`);
    }
    if (Math.abs(adjPro - targetMacros.protein_g) > 5) {
        notes.push(`Protein is ${adjPro}g vs target ${targetMacros.protein_g}g — add/reduce protein source.`);
    }

    return {
        originalRecipe: recipe,
        targetMacros,
        adjustedIngredients,
        adjustedMacros: {
            calories: adjCals,
            protein_g: adjPro,
            carbs_g: adjCarbs,
            fat_g: adjFat,
        },
        notes,
    };
}
